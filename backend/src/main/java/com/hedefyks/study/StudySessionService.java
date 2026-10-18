package com.hedefyks.study;

import com.hedefyks.common.ApiException;
import com.hedefyks.question.QuestionAvailabilityService;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionSelectionMode;
import com.hedefyks.question.QuestionHistorySelection;
import com.hedefyks.study.StudySessionDtos.CreateRequest;
import com.hedefyks.study.StudySessionDtos.Session;
import com.hedefyks.study.StudySessionDtos.SessionQuestion;
import com.hedefyks.study.StudySessionDtos.QuestionStatus;
import com.hedefyks.study.StudySessionDtos.AnswerResult;
import com.hedefyks.study.StudySessionDtos.Result;
import com.hedefyks.study.StudySessionDtos.HistoryItem;
import com.hedefyks.study.StudySessionDtos.UnfinishedSummary;
import com.hedefyks.study.StudySessionDtos.UnfinishedItem;
import com.hedefyks.common.PageResponse;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudySessionService {
    private final JdbcClient jdbc;
    private final QuestionAvailabilityService availability;
    private final com.hedefyks.review.SharedQuestionLabels sharedLabels;

    public StudySessionService(JdbcClient jdbc, QuestionAvailabilityService availability,com.hedefyks.review.SharedQuestionLabels sharedLabels) {
        this.jdbc = jdbc;
        this.availability = availability;
        this.sharedLabels=sharedLabels;
    }

    @Transactional
    public Session create(Long userId, CreateRequest req) {
        Optional<Long> previous = byRequest(userId, req.clientRequestId());
        if (previous.isPresent()) return get(userId, previous.get());

        QuestionFilter filter = availability.effectiveFilter(
                new QuestionFilter(req.bank(), req.examType(), req.subject(), req.topic(),req.categoryId(),req.categoryMatch(),req.includeCandidates(),req.questionTypeId(),req.teacherDifficulty(),req.source()), req.topicPdfId());
        var history = req.history() == null ? List.<QuestionHistorySelection>of() : req.history().stream().distinct().toList();
        QuestionSelectionMode selection = !history.isEmpty() ? QuestionSelectionMode.REPEAT
                : req.selectionMode() == null ? QuestionSelectionMode.MIXED : req.selectionMode();
        var counts = availability.count(userId, filter, req.topicPdfId(), history);
        long candidates = switch (selection) {
            case NEW -> counts.remaining();
            case REPEAT -> counts.solved();
            case WRONG -> counts.everWrong();
            case MIXED -> counts.total();
        };
        if (candidates < req.questionCount()) {
            throw ApiException.badRequest("Bu seçimde yalnızca " + candidates + " soru var. Soru sayısını azalt veya seçimi değiştir.");
        }
        List<Long> ids = availability.randomIds(userId, filter, selection, req.questionCount(), req.topicPdfId(), history);
        if (ids.size() != req.questionCount()) throw ApiException.conflict("Soru havuzu değişti. Yeniden dene.");

        Integer seconds = req.durationMinutes() == null ? null : req.durationMinutes() * 60;
        Optional<Long> inserted = jdbc.sql("""
                INSERT INTO study_sessions (user_id, mode, selection_mode, client_request_id,
                                            filter_bank, filter_exam_type, filter_subject, filter_topic, time_limit_seconds,catalog_filter)
                VALUES (:userId, 'PRACTICE', :selection, :requestId,
                        :bank, :examType, :subject, :topic, :seconds,CAST(:catalogFilter AS jsonb))
                ON CONFLICT (user_id, client_request_id) DO NOTHING RETURNING id
                """).param("userId", userId).param("requestId", req.clientRequestId())
                .param("selection", selection.name())
                .param("bank", filter.bank() == null ? null : filter.bank().name())
                .param("examType", filter.examType() == null ? null : filter.examType().name())
                .param("subject", filter.subject()).param("topic", filter.topic()).param("seconds", seconds)
                .param("catalogFilter",availability.catalogFilter(filter, history))
                .query(Long.class).optional();
        if (inserted.isEmpty()) return get(userId, byRequest(userId, req.clientRequestId()).orElseThrow());

        long sessionId = inserted.get();
        for (int i = 0; i < ids.size(); i++) {
            jdbc.sql("INSERT INTO session_questions (session_id, question_id, position) VALUES (:sessionId, :questionId, :position)")
                    .param("sessionId", sessionId).param("questionId", ids.get(i)).param("position", i + 1).update();
        }
        return get(userId, sessionId);
    }

    @Transactional
    public Session get(Long userId, Long sessionId) {
        closeExpired(userId);
        Header header = jdbc.sql("""
                SELECT id, started_at, selection_mode, filter_bank, filter_exam_type,
                       filter_subject, filter_topic, time_limit_seconds,
                       started_at + time_limit_seconds * interval '1 second' AS deadline_at,
                       clock_timestamp() AS server_now, ended_at, status FROM study_sessions
                WHERE id = :sessionId AND user_id = :userId AND mode = 'PRACTICE'
                """).param("sessionId", sessionId).param("userId", userId)
                .query((rs, row) -> new Header(rs.getLong("id"), rs.getTimestamp("started_at").toInstant(),
                        QuestionSelectionMode.valueOf(rs.getString("selection_mode")),
                        rs.getString("filter_bank") == null ? null : QuestionBank.valueOf(rs.getString("filter_bank")),
                        rs.getString("filter_exam_type") == null ? null : ExamType.valueOf(rs.getString("filter_exam_type")),
                        rs.getString("filter_subject"), rs.getString("filter_topic"),
                        (Integer) rs.getObject("time_limit_seconds"),
                        rs.getTimestamp("deadline_at") == null ? null : rs.getTimestamp("deadline_at").toInstant(),
                        rs.getTimestamp("server_now").toInstant(),
                        rs.getTimestamp("ended_at") == null ? null : rs.getTimestamp("ended_at").toInstant(),
                        rs.getString("status")))
                .optional().orElseThrow(() -> ApiException.notFound("Pratik oturumu bulunamadı."));
        List<SessionQuestion> questions = jdbc.sql("""
                WITH rounds AS (
                  SELECT question_id, practice_round,
                         bool_or(event_type <> 'ANSWER' OR is_correct = true) AS completed,
                         CASE WHEN count(*) FILTER (WHERE event_type = 'ANSWER') = 0 THEN NULL
                              ELSE bool_or(is_correct = true) FILTER (WHERE event_type = 'ANSWER') END AS correct
                  FROM question_attempts WHERE session_id = :sessionId AND user_id = :userId
                  GROUP BY question_id, practice_round
                ), progress AS (
                  SELECT question_id,
                         (array_agg(completed ORDER BY practice_round DESC))[1] AS completed,
                         (array_agg(correct ORDER BY practice_round))[1] AS first_correct,
                         (array_agg(correct ORDER BY practice_round DESC))[1] AS last_correct
                  FROM rounds GROUP BY question_id
                )
                SELECT sq.question_id, sq.position, q.code, q.bank, q.subject, q.topic,
                       p.first_correct, p.last_correct,
                       CASE WHEN p.question_id IS NULL THEN 'NOT_STARTED'
                            WHEN p.completed THEN 'COMPLETED' ELSE 'IN_PROGRESS' END AS progress_status
                FROM session_questions sq JOIN questions q ON q.id = sq.question_id
                LEFT JOIN progress p ON p.question_id = sq.question_id
                WHERE sq.session_id = :sessionId ORDER BY sq.position
                """).param("sessionId", sessionId)
                .param("userId", userId)
                .query((rs, row) -> new SessionQuestion(rs.getLong("question_id"), rs.getInt("position"),
                        rs.getString("code"), com.hedefyks.question.QuestionBank.valueOf(rs.getString("bank")),
                        rs.getString("subject"), rs.getString("topic"),
                        QuestionStatus.valueOf(rs.getString("progress_status")),
                        "COMPLETED".equals(header.status()) ? resultOf((Boolean) rs.getObject("first_correct")) : null,
                        "COMPLETED".equals(header.status()) ? resultOf((Boolean) rs.getObject("last_correct")) : null)).list();
        var topics=sharedLabels.topicNames(sharedLabels.snapshots(questions.stream().map(SessionQuestion::questionId).toList()));
        questions=questions.stream().map(q->new SessionQuestion(q.questionId(),q.position(),q.code(),q.bank(),q.subject(),
            topics.getOrDefault(q.questionId(),q.topic()),q.status(),q.firstResult(),q.lastResult())).toList();
        Result result = null;
        if ("COMPLETED".equals(header.status())) {
            result = new Result((int) questions.stream().filter(q -> q.lastResult() == AnswerResult.CORRECT).count(),
                    (int) questions.stream().filter(q -> q.lastResult() == AnswerResult.WRONG).count(),
                    (int) questions.stream().filter(q -> q.lastResult() == AnswerResult.BLANK).count(),
                    (int) questions.stream().filter(q -> q.firstResult() == AnswerResult.CORRECT).count(),
                    (int) questions.stream().filter(q -> q.firstResult() == AnswerResult.WRONG).count(),
                    (int) questions.stream().filter(q -> q.firstResult() == AnswerResult.BLANK).count());
        }
        return new Session(header.id(), header.startedAt(), header.selectionMode(), header.bank(),
                header.examType(), header.subject(), header.topic(), questions.size(), header.timeLimitSeconds(),
                header.deadlineAt(), header.serverNow(), header.endedAt(), header.status(), result, questions);
    }

    @Transactional
    public Optional<Session> latestActive(Long userId) {
        closeExpired(userId);
        return jdbc.sql("""
                SELECT id FROM study_sessions WHERE user_id = :userId
                  AND mode = 'PRACTICE' AND status = 'IN_PROGRESS'
                ORDER BY started_at DESC, id DESC LIMIT 1
                """).param("userId", userId).query(Long.class).optional().map(id -> get(userId, id));
    }

    @Transactional
    public UnfinishedSummary unfinishedSummary(Long userId) {
        closeExpired(userId);
        return jdbc.sql("""
                SELECT id, count(*) OVER () AS unfinished_count FROM study_sessions
                WHERE user_id = :userId AND mode = 'PRACTICE' AND status = 'IN_PROGRESS'
                ORDER BY started_at DESC, id DESC LIMIT 1
                """).param("userId", userId)
                .query((rs, row) -> new UnfinishedSummary(rs.getLong("unfinished_count"), rs.getLong("id")))
                .optional().orElse(new UnfinishedSummary(0, null));
    }

    @Transactional
    public List<UnfinishedItem> unfinished(Long userId) {
        closeExpired(userId);
        return jdbc.sql("""
                WITH open_practices AS (
                  SELECT * FROM study_sessions
                  WHERE user_id = :userId AND mode = 'PRACTICE' AND status = 'IN_PROGRESS'
                ), rounds AS (
                  SELECT a.session_id, a.question_id, a.practice_round,
                         bool_or(a.event_type <> 'ANSWER' OR a.is_correct = true) AS completed,
                         bool_or(a.event_type = 'ANSWER') AS answered
                  FROM question_attempts a JOIN open_practices s ON s.id = a.session_id
                  WHERE a.user_id = :userId
                  GROUP BY a.session_id, a.question_id, a.practice_round
                ), progress AS (
                  SELECT session_id, question_id, bool_or(answered) AS answered,
                         (array_agg(completed ORDER BY practice_round DESC))[1] AS completed
                  FROM rounds GROUP BY session_id, question_id
                ), unfinished AS (
                  SELECT s.id, 'PRACTICE' AS kind,
                         concat_ws(' · ', s.filter_exam_type, coalesce(s.filter_subject,
                           CASE WHEN count(DISTINCT q.subject) = 1 THEN min(q.subject) ELSE 'Karma' END),
                           s.filter_topic) || ' pratiği' AS title,
                         s.started_at, count(sq.question_id)::int AS question_count,
                         count(*) FILTER (WHERE p.answered)::int AS solved_count,
                         (array_agg(q.code ORDER BY sq.position) FILTER (WHERE NOT coalesce(p.completed, false)))[1] AS resume_code,
                         (array_agg(q.bank ORDER BY sq.position) FILTER (WHERE NOT coalesce(p.completed, false)))[1] AS resume_bank
                  FROM open_practices s
                  JOIN session_questions sq ON sq.session_id = s.id
                  JOIN questions q ON q.id = sq.question_id
                  LEFT JOIN progress p ON p.session_id = s.id AND p.question_id = sq.question_id
                  GROUP BY s.id, s.started_at, s.filter_exam_type, s.filter_subject, s.filter_topic
                  UNION ALL
                  SELECT e.id, 'EXAM', e.title, e.started_at, count(eq.id)::int,
                         count(eq.selected_answer)::int, NULL, NULL
                  FROM exams e JOIN exam_questions eq ON eq.exam_id = e.id
                  WHERE e.user_id = :userId AND e.status = 'IN_PROGRESS'
                  GROUP BY e.id, e.title, e.started_at
                )
                SELECT * FROM unfinished ORDER BY started_at DESC, id DESC, kind
                """).param("userId", userId)
                .query((rs, row) -> new UnfinishedItem(rs.getLong("id"), rs.getString("kind"),
                        rs.getString("title"), rs.getTimestamp("started_at").toInstant(),
                        rs.getInt("question_count"), rs.getInt("solved_count"),
                        rs.getString("resume_code"), rs.getString("resume_bank"))).list();
    }

    @Transactional
    public PageResponse<HistoryItem> history(Long userId, int page, int size) {
        closeExpired(userId);
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        long total = jdbc.sql("""
                SELECT count(*) FROM study_sessions
                WHERE user_id = :userId AND mode = 'PRACTICE'
                """).param("userId", userId).query(Long.class).single();
        List<HistoryItem> items = jdbc.sql("""
                SELECT s.id, s.started_at, s.ended_at, s.status, s.selection_mode,
                       s.time_limit_seconds, s.filter_subject, s.filter_topic, totals.*
                FROM (SELECT * FROM study_sessions WHERE user_id = :userId AND mode = 'PRACTICE'
                      ORDER BY started_at DESC, id DESC LIMIT :size OFFSET :offset) s
                LEFT JOIN LATERAL (
                  WITH rounds AS (
                    SELECT question_id, practice_round,
                           CASE WHEN count(*) FILTER (WHERE event_type = 'ANSWER') = 0 THEN NULL
                                ELSE bool_or(is_correct = true) FILTER (WHERE event_type = 'ANSWER') END AS correct
                    FROM question_attempts WHERE session_id = s.id AND user_id = :userId
                    GROUP BY question_id, practice_round
                  ), progress AS (
                    SELECT question_id,
                           (array_agg(correct ORDER BY practice_round))[1] AS first_correct,
                           (array_agg(correct ORDER BY practice_round DESC))[1] AS last_correct
                    FROM rounds GROUP BY question_id
                  )
                  SELECT count(*) AS question_count,
                         count(*) FILTER (WHERE p.last_correct IS TRUE) AS correct_count,
                         count(*) FILTER (WHERE p.last_correct IS FALSE) AS wrong_count,
                         count(*) FILTER (WHERE p.last_correct IS NULL) AS blank_count,
                         count(*) FILTER (WHERE p.first_correct IS TRUE) AS first_correct_count,
                         count(*) FILTER (WHERE p.first_correct IS FALSE) AS first_wrong_count,
                         count(*) FILTER (WHERE p.first_correct IS NULL) AS first_blank_count
                  FROM session_questions sq LEFT JOIN progress p ON p.question_id = sq.question_id
                  WHERE sq.session_id = s.id
                ) totals ON true
                ORDER BY s.started_at DESC, s.id DESC
                """).param("userId", userId).param("size", safeSize)
                .param("offset", (long) safePage * safeSize)
                .query((rs, row) -> new HistoryItem(rs.getLong("id"), rs.getTimestamp("started_at").toInstant(),
                        rs.getTimestamp("ended_at") == null ? null : rs.getTimestamp("ended_at").toInstant(),
                        rs.getString("status"), QuestionSelectionMode.valueOf(rs.getString("selection_mode")),
                        (Integer) rs.getObject("time_limit_seconds"), rs.getInt("question_count"),
                        rs.getString("filter_subject"), rs.getString("filter_topic"),
                        "COMPLETED".equals(rs.getString("status")) ? new Result(
                                rs.getInt("correct_count"), rs.getInt("wrong_count"), rs.getInt("blank_count"),
                                rs.getInt("first_correct_count"), rs.getInt("first_wrong_count"), rs.getInt("first_blank_count")) : null)).list();
        return new PageResponse<>(items, safePage, safeSize, total,
                (int) Math.ceil((double) total / safeSize));
    }

    @Transactional
    public void requireQuestion(Long userId, Long sessionId, Long questionId, boolean requireOpen) {
        String sql = """
                SELECT EXISTS (SELECT 1 FROM study_sessions s
                  JOIN session_questions sq ON sq.session_id = s.id
                  WHERE s.id = :sessionId AND s.user_id = :userId AND s.mode = 'PRACTICE'
                    AND sq.question_id = :questionId
                """ + ")";
        boolean allowed = jdbc.sql(sql).param("sessionId", sessionId).param("userId", userId)
                .param("questionId", questionId).query(Boolean.class).single();
        if (!allowed) throw ApiException.notFound("Bu soru pratik oturumunda bulunamadı.");
        if (requireOpen) {
            closeExpired(userId);
            boolean open = jdbc.sql("""
                    SELECT status = 'IN_PROGRESS' AND
                      (time_limit_seconds IS NULL OR clock_timestamp() < started_at + time_limit_seconds * interval '1 second')
                    FROM study_sessions WHERE id = :sessionId AND user_id = :userId
                    """).param("sessionId", sessionId).param("userId", userId).query(Boolean.class).single();
            if (!open) throw ApiException.conflict("Pratik oturumu sona erdi. Sonuç ekranına dön.");
        }
    }

    @Transactional
    public void cancel(Long userId, Long sessionId) {
        // Use the same lock as answer recording and finishing so cancellation cannot race either.
        jdbc.sql("SELECT id FROM users WHERE id = :userId FOR UPDATE")
                .param("userId", userId).query(Long.class).optional()
                .orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        closeExpired(userId);
        String status = jdbc.sql("""
                SELECT status FROM study_sessions
                WHERE id = :sessionId AND user_id = :userId AND mode = 'PRACTICE'
                """).param("sessionId", sessionId).param("userId", userId).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Pratik oturumu bulunamadı."));
        if ("ABANDONED".equals(status)) return;
        if (!"IN_PROGRESS".equals(status)) throw ApiException.conflict("Tamamlanmış pratik iptal edilemez.");
        jdbc.sql("""
                UPDATE study_sessions SET status = 'ABANDONED', ended_at = clock_timestamp()
                WHERE id = :sessionId AND user_id = :userId
                """).param("sessionId", sessionId).param("userId", userId).update();
    }

    @Transactional
    public Session finish(Long userId, Long sessionId) {
        // AttemptService de kullanıcı satırını kilitler: bitirme ve cevap kaydı sıralı işlenir.
        jdbc.sql("SELECT id FROM users WHERE id = :userId FOR UPDATE")
                .param("userId", userId).query(Long.class).optional()
                .orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        closeExpired(userId);
        int updated = jdbc.sql("""
                UPDATE study_sessions SET status = 'COMPLETED', ended_at = clock_timestamp()
                WHERE id = :sessionId AND user_id = :userId AND mode = 'PRACTICE'
                  AND status = 'IN_PROGRESS'
                """).param("sessionId", sessionId).param("userId", userId).update();
        if (updated == 0) {
            Session existing = get(userId, sessionId);
            if (!"COMPLETED".equals(existing.status())) throw ApiException.conflict("Pratik oturumu kapatılamadı.");
            return existing;
        }
        return get(userId, sessionId);
    }

    private void closeExpired(Long userId) {
        jdbc.sql("""
                UPDATE study_sessions SET status = 'COMPLETED',
                    ended_at = started_at + time_limit_seconds * interval '1 second'
                WHERE user_id = :userId AND mode = 'PRACTICE' AND status = 'IN_PROGRESS'
                  AND time_limit_seconds IS NOT NULL
                  AND clock_timestamp() >= started_at + time_limit_seconds * interval '1 second'
                """).param("userId", userId).update();
    }

    private static AnswerResult resultOf(Boolean correct) {
        return correct == null ? AnswerResult.BLANK : correct ? AnswerResult.CORRECT : AnswerResult.WRONG;
    }

    private Optional<Long> byRequest(Long userId, java.util.UUID requestId) {
        return jdbc.sql("""
                SELECT id FROM study_sessions
                WHERE user_id = :userId AND client_request_id = :requestId AND mode = 'PRACTICE'
                """).param("userId", userId).param("requestId", requestId).query(Long.class).optional();
    }

    private record Header(Long id, Instant startedAt, QuestionSelectionMode selectionMode,
                          QuestionBank bank, ExamType examType, String subject, String topic,
                          Integer timeLimitSeconds, Instant deadlineAt, Instant serverNow,
                          Instant endedAt, String status) {}
}
