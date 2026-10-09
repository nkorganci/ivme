package com.hedefyks.study;

import com.hedefyks.common.ApiException;
import com.hedefyks.question.QuestionAvailabilityService;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionSelectionMode;
import com.hedefyks.study.StudySessionDtos.CreateRequest;
import com.hedefyks.study.StudySessionDtos.Session;
import com.hedefyks.study.StudySessionDtos.SessionQuestion;
import com.hedefyks.study.StudySessionDtos.QuestionStatus;
import com.hedefyks.study.StudySessionDtos.AnswerResult;
import com.hedefyks.study.StudySessionDtos.Result;
import com.hedefyks.study.StudySessionDtos.HistoryItem;
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

    public StudySessionService(JdbcClient jdbc, QuestionAvailabilityService availability) {
        this.jdbc = jdbc;
        this.availability = availability;
    }

    @Transactional
    public Session create(Long userId, CreateRequest req) {
        Optional<Long> previous = byRequest(userId, req.clientRequestId());
        if (previous.isPresent()) return get(userId, previous.get());

        QuestionFilter filter = availability.effectiveFilter(
                new QuestionFilter(req.bank(), req.examType(), req.subject(), req.topic()), req.topicPdfId());
        QuestionSelectionMode selection = req.selectionMode() == null ? QuestionSelectionMode.MIXED : req.selectionMode();
        var counts = availability.count(userId, filter, req.topicPdfId());
        long candidates = switch (selection) {
            case NEW -> counts.remaining();
            case REPEAT -> counts.solved();
            case WRONG -> counts.everWrong();
            case MIXED -> counts.total();
        };
        if (candidates < req.questionCount()) {
            throw ApiException.badRequest("Bu seçimde yalnızca " + candidates + " soru var. Soru sayısını azalt veya seçimi değiştir.");
        }
        List<Long> ids = availability.randomIds(userId, filter, selection, req.questionCount(), req.topicPdfId());
        if (ids.size() != req.questionCount()) throw ApiException.conflict("Soru havuzu değişti. Yeniden dene.");

        Integer seconds = req.durationMinutes() == null ? null : req.durationMinutes() * 60;
        Optional<Long> inserted = jdbc.sql("""
                INSERT INTO study_sessions (user_id, mode, selection_mode, client_request_id,
                                            filter_bank, filter_exam_type, filter_subject, filter_topic, time_limit_seconds)
                VALUES (:userId, 'PRACTICE', :selection, :requestId,
                        :bank, :examType, :subject, :topic, :seconds)
                ON CONFLICT (user_id, client_request_id) DO NOTHING RETURNING id
                """).param("userId", userId).param("requestId", req.clientRequestId())
                .param("selection", selection.name())
                .param("bank", filter.bank() == null ? null : filter.bank().name())
                .param("examType", filter.examType() == null ? null : filter.examType().name())
                .param("subject", filter.subject()).param("topic", filter.topic()).param("seconds", seconds)
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
                       s.time_limit_seconds, (SELECT count(*) FROM session_questions sq
                         WHERE sq.session_id = s.id) AS question_count
                FROM study_sessions s WHERE s.user_id = :userId AND s.mode = 'PRACTICE'
                ORDER BY s.started_at DESC, s.id DESC LIMIT :size OFFSET :offset
                """).param("userId", userId).param("size", safeSize)
                .param("offset", (long) safePage * safeSize)
                .query((rs, row) -> new HistoryItem(rs.getLong("id"), rs.getTimestamp("started_at").toInstant(),
                        rs.getTimestamp("ended_at") == null ? null : rs.getTimestamp("ended_at").toInstant(),
                        rs.getString("status"), QuestionSelectionMode.valueOf(rs.getString("selection_mode")),
                        (Integer) rs.getObject("time_limit_seconds"), rs.getInt("question_count"))).list();
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
    public Session finish(Long userId, Long sessionId) {
        // AttemptService de kullanıcı satırını kilitler: bitirme ve cevap kaydı sıralı işlenir.
        jdbc.sql("SELECT id FROM users WHERE id = :userId FOR UPDATE")
                .param("userId", userId).query(Long.class).optional()
                .orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        closeExpired(userId);
        int updated = jdbc.sql("""
                UPDATE study_sessions SET status = 'COMPLETED', ended_at = clock_timestamp()
                WHERE id = :sessionId AND user_id = :userId AND mode = 'PRACTICE'
                  AND status = 'IN_PROGRESS' AND time_limit_seconds IS NOT NULL
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
