package com.hedefyks.question;

import com.hedefyks.topicpdf.TopicPdfService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Çalışma oturumu kurucusu ve soru listesi için gerçek kullanıcı kapsamı. */
@Service
@Transactional(readOnly = true)
public class QuestionAvailabilityService {
    public record Availability(long total, long solved, long remaining, long everWrong, long correct) {}

    private static final String MINE = """
            WITH answers AS (
              SELECT question_id, is_correct, created_at AS occurred_at, 0 AS source_order, id AS source_id FROM completed_practice_attempts
                WHERE user_id = :userId AND event_type = 'ANSWER'
              UNION ALL
              SELECT eq.question_id, eq.is_correct, e.submitted_at AS occurred_at, 1 AS source_order, eq.id AS source_id FROM exam_questions eq
                JOIN exams e ON e.id = eq.exam_id
                WHERE e.user_id = :userId AND e.status = 'SUBMITTED' AND eq.selected_answer IS NOT NULL
            ), mine AS (
              SELECT question_id, bool_or(is_correct = false) AS ever_wrong,
                     bool_or(is_correct = true) AS ever_correct,
                     (array_agg(is_correct ORDER BY occurred_at, source_order, source_id))[1] AS first_correct FROM answers
              GROUP BY question_id
            )
            """;

    private final JdbcClient jdbc;
    private final TopicPdfService topicPdfs;
    private final com.hedefyks.review.SharedQuestionLabels sharedLabels;

    public QuestionAvailabilityService(JdbcClient jdbc, TopicPdfService topicPdfs, com.hedefyks.review.SharedQuestionLabels sharedLabels) {
        this.jdbc = jdbc;
        this.topicPdfs = topicPdfs;
        this.sharedLabels=sharedLabels;
    }

    public Availability count(Long userId, QuestionFilter filter) {
        return count(userId, filter, null);
    }
    public String catalogFilter(QuestionFilter filter) {
        return catalogFilter(filter, List.of());
    }

    public String catalogFilter(QuestionFilter filter, List<QuestionHistorySelection> history) {
        return !filter.hasSharedSelection() && filter.source().isEmpty() && (history == null || history.isEmpty())?null:sharedLabels.write(Map.of("categoryIds",filter.categoryId(),"match",filter.categoryMatch(),"includeCandidates",filter.includeCandidates(),"questionTypeId",filter.questionTypeId()==null?"":filter.questionTypeId(),"teacherDifficulty",filter.teacherDifficulty()==null?"":filter.teacherDifficulty(),"sources",filter.source(),"history",history==null?List.of():history));
    }

    public Availability count(Long userId, QuestionFilter filter, Integer topicPdfId) {
        return count(userId, filter, topicPdfId, List.of());
    }

    public Availability count(Long userId, QuestionFilter filter, Integer topicPdfId,
                              List<QuestionHistorySelection> history) {
        StringBuilder sql = new StringBuilder(MINE).append("""
                SELECT count(*) AS total, count(m.question_id) AS solved,
                       count(*) - count(m.question_id) AS remaining,
                       count(*) FILTER (WHERE m.ever_wrong) AS ever_wrong,
                       count(*) FILTER (WHERE m.first_correct IS TRUE) AS correct
                FROM questions q LEFT JOIN mine m ON m.question_id = q.id
                WHERE q.active = true
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        addFilters(sql, params, effectiveFilter(filter, topicPdfId), topicPdfId);
        addHistoryFilter(sql, history);
        return jdbc.sql(sql.toString()).params(params).query((rs, n) -> new Availability(
                rs.getLong("total"), rs.getLong("solved"), rs.getLong("remaining"), rs.getLong("ever_wrong"), rs.getLong("correct"))).single();
    }

    public record SubjectCandidate(Long id, String subject) {}
    private record SubjectQuery(String sql, Map<String, Object> params) {}

    /** The effective catalogue pool and learner history are each read once, not once per quota. */
    private SubjectQuery subjectQuery(Long userId, QuestionBank bank, ExamType exam,
                                      QuestionSelectionMode mode, List<String> subjects) {
        var selection = sharedLabels.subjectSelection(bank, exam, subjects);
        Map<String, Object> params = new HashMap<>();
        params.put("subjects", selection.subjects());
        StringBuilder sql = new StringBuilder(mode == QuestionSelectionMode.MIXED ? "WITH " : MINE + ", ");
        sql.append("requested AS (SELECT * FROM jsonb_to_recordset(CAST(:subjects AS jsonb)) AS r(subject text,subject_id text)), ");
        if (selection.request() == null) {
            params.put("exam", exam.name());
            sql.append("pool AS (SELECT q.id,r.subject,r.subject_id FROM questions q JOIN requested r ON r.subject=q.subject WHERE q.active AND q.exam_type=:exam");
            if (bank != null) { sql.append(" AND q.bank=:bank"); params.put("bank", bank.name()); }
            sql.append(") ");
        } else {
            params.put("catalogSelection", selection.request());
            sql.append("""
                overrides AS (
                  SELECT o.* FROM jsonb_to_recordset(CAST(:catalogSelection AS jsonb)->'overrides')
                    AS o(item_key text,subject_ids text[])
                ), allowed AS MATERIALIZED (
                  SELECT id FROM learning_catalog.question_ids_for_labels(:catalogSelection)
                ), pool AS (
                  SELECT q.id,r.subject,r.subject_id FROM allowed a JOIN questions q ON q.id=a.id
                  JOIN learning_catalog.current_items i ON i.question_code=q.code AND i.kind='QUESTION'
                  LEFT JOIN overrides o USING(item_key)
                  JOIN requested r ON r.subject_id=ANY(coalesce(o.subject_ids,i.subject_ids))
                )
                """);
        }
        sql.append(", eligible AS (SELECT p.* FROM pool p");
        if (mode != QuestionSelectionMode.MIXED) {
            params.put("userId", userId);
            sql.append(" LEFT JOIN mine m ON m.question_id=p.id WHERE ").append(switch (mode) {
                case NEW -> "m.question_id IS NULL";
                case REPEAT -> "m.question_id IS NOT NULL";
                case WRONG -> "m.ever_wrong IS TRUE";
                default -> throw new IllegalArgumentException("Unexpected selection mode");
            });
        }
        sql.append(") ");
        return new SubjectQuery(sql.toString(), params);
    }

    public Map<String, Long> countBySubject(Long userId, QuestionBank bank, ExamType exam,
                                           QuestionSelectionMode mode, List<String> subjects) {
        var query = subjectQuery(userId, bank, exam, mode, subjects);
        Map<String, Long> result = new HashMap<>();
        jdbc.sql(query.sql() + "SELECT subject,count(DISTINCT id) AS total FROM eligible GROUP BY subject")
            .params(query.params()).query((rs, n) -> {
                result.put(rs.getString("subject"), rs.getLong("total")); return 0;
            }).list();
        return result;
    }

    /** At most total-exam-size candidates per subject, keeping the response and JVM memory bounded. */
    public List<SubjectCandidate> randomSubjectCandidates(Long userId, QuestionBank bank, ExamType exam,
            QuestionSelectionMode mode, List<String> subjects, int limit) {
        var query = subjectQuery(userId, bank, exam, mode, subjects);
        query.params().put("limit", limit);
        return jdbc.sql(query.sql() + """
            , ranked AS (SELECT id,subject,row_number() OVER (PARTITION BY subject ORDER BY random()) AS rank
                         FROM (SELECT DISTINCT id,subject FROM eligible) unique_questions)
            SELECT id,subject FROM ranked WHERE rank<=:limit ORDER BY subject,rank
            """).params(query.params()).query((rs,n) -> new SubjectCandidate(rs.getLong("id"),rs.getString("subject"))).list();
    }

    /** Archive gaps use the same published subject pool, preferring official questions. */
    public List<SubjectCandidate> archiveReplacementCandidates(ExamType exam, List<String> subjects, int limit) {
        var query = subjectQuery(null, null, exam, QuestionSelectionMode.MIXED, subjects);
        query.params().put("replacementExam", exam.name());
        query.params().put("limit", limit);
        return jdbc.sql(query.sql() + """
            , ranked AS (
              SELECT p.id,p.subject,row_number() OVER (PARTITION BY p.subject
                ORDER BY (q.bank='CIKMIS') DESC,q.exam_year DESC NULLS LAST,p.id) AS rank
              FROM (SELECT DISTINCT id,subject FROM eligible) p JOIN questions q ON q.id=p.id
              WHERE q.active AND q.exam_type=:replacementExam
            )
            SELECT id,subject FROM ranked WHERE rank<=:limit ORDER BY subject,rank
            """).params(query.params()).query((rs,n) -> new SubjectCandidate(rs.getLong("id"),rs.getString("subject"))).list();
    }

    public List<ExamTopicBalancer.Candidate> balancedSubjectCandidates(Long userId, QuestionBank bank, ExamType exam,
            QuestionSelectionMode mode, List<String> subjects, int limit) {
        return topicCandidates(userId, subjectQuery(userId, bank, exam, mode, subjects), exam, limit);
    }

    /** Practice keeps randomIds; all custom/branch exams use the same coverage policy. */
    public List<Long> balancedExamIds(Long userId, QuestionFilter filter, QuestionSelectionMode mode,
                                      int limit, Integer topicPdfId) {
        var effective = effectiveFilter(filter, topicPdfId);
        String catalogSelection = sharedLabels.selection(effective);
        var sql = new StringBuilder(MINE);
        if (catalogSelection != null) sql.append("""
            , exam_allowed AS MATERIALIZED (SELECT id FROM learning_catalog.question_ids_for_labels(:catalogSelection))
            """);
        sql.append("""
            , eligible AS (SELECT q.id,q.subject,NULL::text AS subject_id
              FROM questions q LEFT JOIN mine m ON m.question_id=q.id WHERE q.active
            """);
        Map<String,Object> params = new HashMap<>();
        params.put("userId", userId);
        addFilters(sql, params, effective, topicPdfId, catalogSelection, true);
        sql.append(switch (mode) {
            case NEW -> " AND m.question_id IS NULL";
            case REPEAT -> " AND m.question_id IS NOT NULL";
            case WRONG -> " AND m.ever_wrong IS TRUE";
            case MIXED -> "";
        }).append(") ");
        return ExamTopicBalancer.select(topicCandidates(userId, new SubjectQuery(sql.toString(), params),
                effective.examType(), limit), limit, java.util.Set.of());
    }

    private List<ExamTopicBalancer.Candidate> topicCandidates(Long userId, SubjectQuery query, ExamType exam, int limit) {
        var params = query.params();
        boolean catalog = params.containsKey("catalogSelection");
        params.put("topicUserId", userId);
        params.put("topicLimit", limit);
        params.put("topicExam", exam == null ? "" : exam.name());
        String sql = query.sql() + (catalog ? """
            , topic_overrides AS (
              SELECT o.* FROM jsonb_to_recordset(CAST(:catalogSelection AS jsonb)->'overrides')
                AS o(item_key text,labels jsonb,status text)
            ), labelled AS (
              SELECT DISTINCT p.id,p.subject,p.subject_id,
                CASE WHEN :topicExam='' THEN q.exam_type ELSE :topicExam END AS exam,
                coalesce(o.labels,i.data->'automaticLabels') AS labels,o.status AS review_status,0::bigint AS exam_id,true AS candidate
              FROM eligible p JOIN questions q ON q.id=p.id
              JOIN learning_catalog.current_items i ON i.question_code=q.code AND i.kind='QUESTION'
              LEFT JOIN topic_overrides o USING(item_key)
              UNION ALL
              SELECT eq.question_id,eq.subject,NULL::text,e.exam_type,
                coalesce(o.labels,i.data->'automaticLabels',eq.learning_label_snapshot->'labels'),o.status,e.id,false
              FROM exam_questions eq JOIN exams e ON e.id=eq.exam_id
              JOIN questions q ON q.id=eq.question_id
              LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code AND i.kind='QUESTION'
                AND i.source_stamp=extract(epoch from q.updated_at)::text
              LEFT JOIN topic_overrides o USING(item_key)
              WHERE e.user_id=:topicUserId AND e.status<>'CANCELLED'
            ), units AS MATERIALIZED (
              SELECT category_id,definition FROM learning_catalog.current_categories
            ), unit_map AS MATERIALIZED (
              SELECT source.category_id AS source_category,target.category_id,
                target.definition->>'exam' AS exam,target.definition->>'subjectId' AS subject_id
              FROM units source CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(
                source.definition->'canonicalTopicIds',jsonb_build_array(source.category_id))) canonical(id)
              JOIN units target ON target.category_id=canonical.id
              WHERE target.definition->>'canonicalUnit'='true'
            ), resolved AS (
              SELECT DISTINCT p.id,p.subject,p.exam_id,p.candidate,u.category_id
              FROM labelled p CROSS JOIN LATERAL jsonb_array_elements(p.labels->'assignments') a
              JOIN unit_map u ON u.source_category=a->>'categoryId'
              WHERE a->>'relation' IS DISTINCT FROM 'PREREQUISITE'
                AND (p.exam IS NULL OR p.exam='' OR u.exam=p.exam)
                AND (p.subject_id IS NULL OR u.subject_id=p.subject_id)
                AND (NOT p.candidate OR coalesce((CAST(:catalogSelection AS jsonb)->>'includeCandidates')::boolean,true)
                  OR p.review_status='APPROVE' OR a->>'scopeStatus'='CONFIRMED')
                AND (NOT p.candidate OR jsonb_array_length(CAST(:catalogSelection AS jsonb)->'categoryIds')=0
                  OR jsonb_exists(CAST(:catalogSelection AS jsonb)->'categoryIds',u.category_id))
            ), topics AS (
              SELECT DISTINCT p.id,p.subject,
                coalesce(u.category_id,'@unresolved:'||p.exam||':'||p.subject) AS topic,p.exam_id,p.candidate
              FROM labelled p LEFT JOIN resolved u USING(id,subject,exam_id,candidate)
            )
            """ : """
            , topics AS (
              SELECT DISTINCT p.id,p.subject,'@legacy:'||q.exam_type||':'||q.subject||':'||coalesce(q.topic,'') AS topic,
                0::bigint AS exam_id,true AS candidate
              FROM eligible p JOIN questions q ON q.id=p.id
              UNION ALL
              SELECT eq.question_id,eq.subject,'@legacy:'||q.exam_type||':'||q.subject||':'||coalesce(q.topic,''),e.id,false
              FROM exam_questions eq JOIN exams e ON e.id=eq.exam_id JOIN questions q ON q.id=eq.question_id
              WHERE e.user_id=:topicUserId AND e.status<>'CANCELLED'
            )
            """) + """
            , usage AS (SELECT topic,count(*) AS previous_count,max(exam_id) AS last_exam
              FROM topics WHERE NOT candidate GROUP BY topic), ranked AS (
              SELECT id,subject,topic,row_number() OVER (PARTITION BY subject,topic ORDER BY random()) AS rank
              FROM (SELECT DISTINCT id,subject,topic FROM topics WHERE candidate) unique_questions
            )
            SELECT r.id,r.subject,r.topic,coalesce(u.previous_count,0) AS previous_count,coalesce(u.last_exam,0) AS last_exam
            FROM ranked r LEFT JOIN usage u USING(topic) WHERE rank<=:topicLimit ORDER BY subject,topic,rank
            """;
        return jdbc.sql(sql).params(params).query((rs,n) -> new ExamTopicBalancer.Candidate(
                rs.getLong("id"),rs.getString("subject"),rs.getString("topic"),
                rs.getLong("previous_count"),rs.getLong("last_exam"))).list();
    }

    public List<Long> randomIds(Long userId, QuestionFilter filter, QuestionSelectionMode mode, int limit) {
        return randomIds(userId, filter, mode, limit, null);
    }

    public List<Long> randomIds(Long userId, QuestionFilter filter, QuestionSelectionMode mode,
                                int limit, Integer topicPdfId) {
        return randomIds(userId, filter, mode, limit, topicPdfId, List.of());
    }

    public List<Long> randomIds(Long userId, QuestionFilter filter, QuestionSelectionMode mode,
                                int limit, Integer topicPdfId, List<QuestionHistorySelection> history) {
        return selectRandomIds(userId, filter, mode, limit, topicPdfId, List.of(), history);
    }

    public List<Long> randomIdsExcluding(Long userId, QuestionFilter filter, QuestionSelectionMode mode,
                                        int limit, List<Long> excludedIds) {
        return selectRandomIds(userId, filter, mode, limit, null, excludedIds, List.of());
    }

    private List<Long> selectRandomIds(Long userId, QuestionFilter filter, QuestionSelectionMode mode,
                                 int limit, Integer topicPdfId, List<Long> excludedIds,
                                 List<QuestionHistorySelection> history) {
        StringBuilder sql = new StringBuilder(MINE).append("""
                SELECT q.id FROM questions q LEFT JOIN mine m ON m.question_id = q.id
                WHERE q.active = true
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        addFilters(sql, params, effectiveFilter(filter, topicPdfId), topicPdfId);
        addHistoryFilter(sql, history);
        if (!excludedIds.isEmpty()) {
            sql.append(" AND q.id NOT IN (:excludedIds)");
            params.put("excludedIds", excludedIds);
        }
        switch (mode) {
            case NEW -> sql.append(" AND m.question_id IS NULL");
            case REPEAT -> sql.append(" AND m.question_id IS NOT NULL");
            case WRONG -> sql.append(" AND m.ever_wrong = true");
            case MIXED -> { }
        }
        sql.append(" ORDER BY random() LIMIT :limit");
        params.put("limit", limit);
        return jdbc.sql(sql.toString()).params(params).query(Long.class).list();
    }

    private static void addHistoryFilter(StringBuilder sql, List<QuestionHistorySelection> history) {
        if (history == null || history.isEmpty()) return;
        boolean correct = history.contains(QuestionHistorySelection.CORRECT);
        boolean wrong = history.contains(QuestionHistorySelection.WRONG);
        if (correct && wrong) sql.append(" AND (m.ever_correct IS TRUE OR m.ever_wrong IS TRUE)");
        else if (correct) sql.append(" AND m.ever_correct IS TRUE");
        else if (wrong) sql.append(" AND m.ever_wrong IS TRUE");
    }

    public QuestionFilter effectiveFilter(QuestionFilter filter, Integer topicPdfId) {
        if (topicPdfId == null) return filter;
        topicPdfs.approvedQuestionCodes(topicPdfId);
        return new QuestionFilter(QuestionBank.OGM, ExamType.TYT, "Türkçe",
                topicPdfs.detail(topicPdfId).verifiedTopic(),filter.categoryId(),filter.categoryMatch(),filter.includeCandidates(),filter.questionTypeId(),filter.teacherDifficulty());
    }

    private void addFilters(StringBuilder sql, Map<String, Object> params,
                            QuestionFilter filter, Integer topicPdfId) {
        addFilters(sql, params, filter, topicPdfId, sharedLabels.selection(filter), false);
    }

    private void addFilters(StringBuilder sql, Map<String, Object> params,
                            QuestionFilter filter, Integer topicPdfId, String catalogSelection, boolean materializedPool) {
        if (filter.bank() != null) { sql.append(" AND q.bank = :bank"); params.put("bank", filter.bank().name()); }
        if(catalogSelection!=null){sql.append(materializedPool ? " AND q.id IN (SELECT id FROM exam_allowed)"
            : " AND q.id IN (SELECT id FROM learning_catalog.question_ids_for_labels(:catalogSelection))");params.put("catalogSelection",catalogSelection);}
        if (catalogSelection==null && !filter.source().isEmpty()) {
            sql.append(" AND (");
            for (int i=0; i<filter.source().size(); i++) {
                if (i>0) sql.append(" OR ");
                sql.append("(q.bank = :sourceBank").append(i).append(" AND q.exam_type = :sourceExam").append(i).append(")");
                params.put("sourceBank"+i,filter.source().get(i).bank().name());
                params.put("sourceExam"+i,filter.source().get(i).examType().name());
            }
            sql.append(")");
        }
        if (catalogSelection==null && filter.examType() != null) { sql.append(" AND q.exam_type = :examType"); params.put("examType", filter.examType().name()); }
        if (catalogSelection==null && filter.subject() != null) { sql.append(" AND q.subject = :subject"); params.put("subject", filter.subject()); }
        if (catalogSelection==null && topicPdfId == null && filter.topic() != null) {
            sql.append(" AND q.topic = :topic"); params.put("topic", filter.topic());
        }
        if (topicPdfId != null) {
            sql.append(" AND q.code IN (:approvedCodes)");
            params.put("approvedCodes", topicPdfs.approvedQuestionCodes(topicPdfId));
        }
    }
}
