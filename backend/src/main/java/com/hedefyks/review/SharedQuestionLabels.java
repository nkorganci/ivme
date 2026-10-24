package com.hedefyks.review;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.question.QuestionFilter;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** The same effective teacher decisions and controlled IDs as the library. */
@Service
public class SharedQuestionLabels {
    public static final int MAX_CATEGORY_SELECTION = 100;
    private final ContentReviewService reviews;
    private final ReviewCatalog vocabulary;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public SharedQuestionLabels(ContentReviewService reviews,ReviewCatalog vocabulary,JdbcTemplate jdbc,ObjectMapper json) {
        this.reviews=reviews;this.vocabulary=vocabulary;this.jdbc=jdbc;this.json=json;
    }
    public String selection(QuestionFilter filter) {
        if(!filter.hasSharedSelection() && jdbc.queryForObject("SELECT count(*) FROM learning_catalog.current_run",Integer.class)==0)return null;
        var known=new HashSet<String>();
        if(!filter.categoryId().isEmpty()) vocabulary.categories().forEach(c->known.add(c.get("id").toString()));
        if(filter.categoryId().size()>MAX_CATEGORY_SELECTION || !known.containsAll(filter.categoryId()) || !Set.of("ANY","ALL").contains(filter.categoryMatch()))
            throw ApiException.badRequest("Ortak konu filtresi geçersiz.");
        if(filter.questionTypeId()!=null && (!filter.questionTypeId().matches("taxonomy:[1-9][0-9]{0,17}") ||
            jdbc.queryForObject("SELECT count(*) FROM taxonomy_nodes WHERE id=? AND kind='QUESTION_TYPE' AND active",Integer.class,Long.parseLong(filter.questionTypeId().substring(9)))!=1))
            throw ApiException.badRequest("Soru tipi geçersiz.");
        if(filter.teacherDifficulty()!=null && !Set.of("KOLAY","ORTA","ZOR").contains(filter.teacherDifficulty()))throw ApiException.badRequest("Öğretmen zorluk etiketi geçersiz.");
        var categoryIds=filter.categoryId();
        boolean namedPhysicsTopic=false;
        if(categoryIds.isEmpty() && filter.topic()!=null) {
            categoryIds=vocabulary.categories().stream().filter(c->Boolean.TRUE.equals(c.get("canonicalTopic"))
                && (filter.subject()==null || vocabulary.subjectId(filter.subject()).equals(c.get("subjectId")))
                && filter.topic().equalsIgnoreCase(c.get("topic").toString())
                && (filter.examType()==null || filter.examType().name().equals(c.get("exam"))))
                .map(c->c.get("id").toString()).toList();
            namedPhysicsTopic=!categoryIds.isEmpty();
        }
        var groups=categoryIds.isEmpty()?List.<List<String>>of():vocabulary.categoryGroups(categoryIds);
        var request=new LinkedHashMap<String,Object>();request.put("categoryIds",groups.stream().flatMap(Collection::stream).distinct().toList());
        request.put("categoryGroups",groups);
        request.put("match",filter.categoryMatch());request.put("includeCandidates",filter.includeCandidates());
        request.put("bank",filter.bank()==null?"":filter.bank().name());
        request.put("exam",filter.examType()==null?"":filter.examType().name());
        request.put("sources",filter.source());
        request.put("subjectId",filter.subject()==null?"":vocabulary.subjectId(filter.subject()));
        request.put("questionTypeId",filter.questionTypeId()==null?"":filter.questionTypeId());
        request.put("teacherDifficulty",filter.teacherDifficulty()==null?"":filter.teacherDifficulty());
        request.put("legacyTopic",!namedPhysicsTopic && filter.categoryId().isEmpty() && filter.topic()!=null?filter.topic():"");
        request.put("overrides",reviews.studentOverrides());return write(request);
    }
    public Map<Long,String> snapshots(List<Long> ids) {
        if(ids.isEmpty())return Map.of();
        var overrides=new HashMap<String,Map<String,Object>>();
        reviews.studentOverrides().forEach(o->overrides.put(o.get("item_key").toString(),o));
        var result=new LinkedHashMap<Long,String>();
        String placeholders=String.join(",",Collections.nCopies(ids.size(),"?"));
        jdbc.query("SELECT q.id,i.run_key,i.item_key,i.data::text FROM questions q JOIN learning_catalog.current_items i ON i.item_key='question:'||q.code WHERE q.id IN ("+placeholders+") AND i.source_stamp=extract(epoch from q.updated_at)::text",rs->{
            var data=parse(rs.getString(4));var override=overrides.get(rs.getString(3));
            var snapshot=new LinkedHashMap<String,Object>();snapshot.put("catalogRunKey",rs.getString(2));
            snapshot.put("sourceVersion",data.get("sourceVersion"));snapshot.put("taxonomyVersion",data.get("taxonomyVersion"));
            snapshot.put("reviewStatus",override==null?"PENDING":override.get("status"));
            snapshot.put("labels",override==null?data.get("automaticLabels"):override.get("labels"));
            result.put(rs.getLong(1),write(snapshot));
        },ids.toArray());
        return result;
    }
    public List<Long> questionIds(QuestionFilter filter) {
        String request=selection(filter);
        return request==null?null:jdbc.queryForList("SELECT id FROM learning_catalog.question_ids_for_labels(?)",Long.class,request);
    }
    @SuppressWarnings("unchecked")
    public Map<Long,String> topicNames(Map<Long,String> snapshots) {
        if(snapshots.isEmpty())return Map.of();
        var definitions=new HashMap<String,Map<String,Object>>();
        vocabulary.categories().forEach(c->definitions.put(c.get("id").toString(),c));
        var result=new HashMap<Long,String>();
        snapshots.forEach((id,snapshot)->{
            var labels=(Map<String,Object>)parse(snapshot).getOrDefault("labels",Map.of());
            var names=new LinkedHashSet<String>();
            for(var a:(List<Map<String,Object>>)labels.getOrDefault("assignments",List.of())) {
                if("PREREQUISITE".equals(a.get("relation")))continue;
                var c=definitions.get(a.get("categoryId"));
                if(c==null)continue;
                var targets=(List<String>)c.getOrDefault("canonicalTopicIds",List.of(c.get("id").toString()));
                for(var target:targets) {
                    var unit=definitions.get(target);
                    if(unit!=null&&Boolean.TRUE.equals(unit.get("canonicalUnit")))names.add(unit.get("topic").toString());
                }
            }
            result.put(id,names.isEmpty()?"Ünite eşleşmesi bekliyor":String.join("; ",names));
        });
        return result;
    }

    public record SubjectSelection(String request, String subjects) {}

    /** One current catalogue/override read for all exam quotas. */
    public SubjectSelection subjectSelection(com.hedefyks.question.QuestionBank bank,
            com.hedefyks.question.ExamType exam, List<String> subjects) {
        String request = selection(new QuestionFilter(bank, exam, null, null));
        return new SubjectSelection(request, write(subjects.stream().distinct().flatMap(subject -> {
            // Official test quotas group these controlled branches under one test.
            var ids = switch (subject) {
                case "Matematik" -> List.of("matematik", "geometri");
                case "Felsefe Grubu" -> List.of("felsefe", "psikoloji", "sosyoloji", "mantik");
                default -> List.of(vocabulary.subjectId(subject));
            };
            return ids.stream().map(id -> Map.of("subject", subject, "subject_id", id));
        }).toList()));
    }

    /** Reuse exactly the active, source-bound question selection for every facet. */
    private static final String SELECTED_LABELS = """
        WITH request AS (SELECT ?::jsonb AS value), overrides AS (
          SELECT o.* FROM request r CROSS JOIN LATERAL jsonb_to_recordset(coalesce(r.value->'overrides','[]'))
            AS o(item_key text,labels jsonb,status text,subject_ids text[],exam_ids text[])
        ), allowed AS MATERIALIZED (
          SELECT id FROM learning_catalog.question_ids_for_labels((SELECT value::text FROM request))
        ), selected AS (
          SELECT q.id,q.topic,q.subject AS source_subject,q.bank AS source_bank,
            %s
            coalesce(o.subject_ids,i.subject_ids) AS subjects,coalesce(o.exam_ids,i.exam_ids) AS exams
          FROM allowed JOIN questions q ON q.id=allowed.id
          JOIN learning_catalog.current_items i ON i.question_code=q.code AND i.kind='QUESTION'
          LEFT JOIN overrides o USING(item_key)
        )
        """;

    private static String selectedLabels(boolean includeLabels) {
        return SELECTED_LABELS.formatted(includeLabels
            ? "coalesce(o.labels,i.data->'automaticLabels') AS labels,o.status AS review_status," : "");
    }

    public List<com.hedefyks.question.QuestionDtos.FilterRow> filterRows(com.hedefyks.question.QuestionBank bank) {
        return filterRows(bank,List.of());
    }

    public List<com.hedefyks.question.QuestionDtos.FilterRow> filterRows(com.hedefyks.question.QuestionBank bank,
            List<com.hedefyks.question.QuestionSource> source) {
        String request=selection(new QuestionFilter(bank,null,null,null,List.of(),"ANY",true,null,null,source));
        if(request==null)return null;
        // Resolve all shared unit definitions once, keeping counts distinct by question.
        String selected=SELECTED_LABELS.formatted("coalesce(o.labels,i.data->'automaticLabels') AS labels,");
        return jdbc.query(selected+"""
            , names AS (
              SELECT definition->>'subjectId' AS id,min(definition->>'subject') AS name
              FROM learning_catalog.current_categories GROUP BY definition->>'subjectId'
            ), physics_topic_definitions AS MATERIALIZED (
              SELECT category_id,definition->>'exam' AS exam,definition->>'subjectId' AS subject_id,definition->>'topic' AS topic
              FROM learning_catalog.current_categories WHERE definition->>'canonicalTopic'='true'
            ), physics_topic_names AS MATERIALIZED (
              SELECT DISTINCT s.id,c.exam,c.subject_id,c.topic
              FROM selected s CROSS JOIN LATERAL jsonb_array_elements(s.labels->'assignments') a
              JOIN physics_topic_definitions c ON c.category_id=a->>'categoryId'
              WHERE s.labels IS NOT NULL
            ), expanded AS (
              SELECT DISTINCT s.id,e.exam,coalesce(n.name,s.source_subject) AS subject,
                coalesce(t.topic,'') AS topic
              FROM selected s CROSS JOIN LATERAL unnest(s.exams) e(exam)
              CROSS JOIN LATERAL unnest(s.subjects) b(subject_id) LEFT JOIN names n ON n.id=b.subject_id
              LEFT JOIN physics_topic_names t ON b.subject_id=t.subject_id AND t.id=s.id AND t.exam=e.exam
              CROSS JOIN request r
              WHERE e.exam IN ('TYT','AYT')
                AND (jsonb_array_length(r.value->'sources')=0 OR jsonb_exists(r.value->'sources',s.source_bank||'_'||e.exam))
            ), exam_counts AS (
              SELECT exam,count(DISTINCT id) AS total FROM expanded GROUP BY exam
            ), subject_counts AS (
              SELECT exam,subject,count(DISTINCT id) AS total FROM expanded GROUP BY exam,subject
            ), subject_totals AS (
              SELECT subject,count(DISTINCT id) AS total FROM expanded GROUP BY subject
            ), topic_totals AS (
              SELECT subject,topic,count(DISTINCT id) AS total FROM expanded GROUP BY subject,topic
            )
            SELECT e.exam,e.subject,nullif(e.topic,'') AS topic,count(DISTINCT e.id) AS count,
              (SELECT count(*) FROM selected) AS total_count,ec.total AS exam_count,sc.total AS subject_count,
              st.total AS subject_total_count,tt.total AS topic_total_count
            FROM expanded e JOIN exam_counts ec ON ec.exam=e.exam
              JOIN subject_counts sc ON sc.exam=e.exam AND sc.subject=e.subject
              JOIN subject_totals st ON st.subject=e.subject
              JOIN topic_totals tt ON tt.subject=e.subject AND tt.topic=e.topic
            GROUP BY e.exam,e.subject,e.topic,ec.total,sc.total,st.total,tt.total
            """,(rs,n)->new com.hedefyks.question.QuestionDtos.FilterRow(
                com.hedefyks.question.ExamType.valueOf(rs.getString("exam")),rs.getString("subject"),rs.getString("topic"),rs.getLong("count"),
                rs.getLong("total_count"),rs.getLong("exam_count"),rs.getLong("subject_count"),
                rs.getLong("subject_total_count"),rs.getLong("topic_total_count")),request);
    }

    /** Counts belong to the selected bank/exam/lesson, not to PDF/video-only categories. */
    public Map<String,Long> categoryCounts(QuestionFilter filter) {
        var unscoped=new QuestionFilter(filter.bank(),filter.examType(),filter.subject(),null,List.of(),"ANY",
            filter.includeCandidates(),filter.questionTypeId(),filter.teacherDifficulty(),filter.source());
        String request=selection(unscoped);
        if(request==null)return Map.of();
        var result=new LinkedHashMap<String,Long>();
        jdbc.query(selectedLabels(true)+"""
            SELECT a->>'categoryId' AS category_id,count(DISTINCT s.id) AS total
            FROM selected s CROSS JOIN LATERAL jsonb_array_elements(s.labels->'assignments') a
              JOIN learning_catalog.current_categories c ON c.category_id=a->>'categoryId'
            CROSS JOIN request r
            WHERE coalesce((r.value->>'includeCandidates')::boolean,true)
              OR s.review_status='APPROVE' OR a->>'scopeStatus'='CONFIRMED'
            GROUP BY a->>'categoryId'
            """,rs->{result.put(rs.getString("category_id"),rs.getLong("total"));},request);
        return result;
    }
    public void snapshotAttempt(Long attemptId,Long questionId) {
        String snapshot=snapshots(List.of(questionId)).get(questionId);
        if(snapshot!=null)jdbc.update("UPDATE question_attempts SET learning_label_snapshot=?::jsonb WHERE id=? AND learning_label_snapshot IS NULL",snapshot,attemptId);
    }
    private Map<String,Object> parse(String text) {
        try{return json.readValue(text,new com.fasterxml.jackson.core.type.TypeReference<>(){});}catch(Exception e){throw new IllegalStateException(e);}
    }
    public String write(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);}}
}
