package com.hedefyks.study;

import com.hedefyks.common.ApiException;
import com.hedefyks.question.QuestionAvailabilityService;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionSelectionMode;
import com.hedefyks.study.StudySessionDtos.CreateRequest;
import com.hedefyks.study.StudySessionDtos.Session;
import com.hedefyks.study.StudySessionDtos.SessionQuestion;
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

        QuestionFilter filter = new QuestionFilter(req.bank(), req.examType(), req.subject(), req.topic());
        if (availability.count(userId, filter).total() < req.questionCount()) {
            throw ApiException.badRequest("Bu seçimde yeterli soru yok. Soru sayısını azalt veya filtreyi değiştir.");
        }
        List<Long> ids = availability.randomIds(userId, filter, QuestionSelectionMode.MIXED, req.questionCount());
        if (ids.size() != req.questionCount()) throw ApiException.conflict("Soru havuzu değişti. Yeniden dene.");

        Optional<Long> inserted = jdbc.sql("""
                INSERT INTO study_sessions (user_id, mode, selection_mode, client_request_id)
                VALUES (:userId, 'PRACTICE', 'MIXED', :requestId)
                ON CONFLICT (user_id, client_request_id) DO NOTHING RETURNING id
                """).param("userId", userId).param("requestId", req.clientRequestId())
                .query(Long.class).optional();
        if (inserted.isEmpty()) return get(userId, byRequest(userId, req.clientRequestId()).orElseThrow());

        long sessionId = inserted.get();
        for (int i = 0; i < ids.size(); i++) {
            jdbc.sql("INSERT INTO session_questions (session_id, question_id, position) VALUES (:sessionId, :questionId, :position)")
                    .param("sessionId", sessionId).param("questionId", ids.get(i)).param("position", i + 1).update();
        }
        return get(userId, sessionId);
    }

    @Transactional(readOnly = true)
    public Session get(Long userId, Long sessionId) {
        Header header = jdbc.sql("""
                SELECT id, started_at FROM study_sessions
                WHERE id = :sessionId AND user_id = :userId AND mode = 'PRACTICE'
                """).param("sessionId", sessionId).param("userId", userId)
                .query((rs, row) -> new Header(rs.getLong("id"), rs.getTimestamp("started_at").toInstant()))
                .optional().orElseThrow(() -> ApiException.notFound("Pratik oturumu bulunamadı."));
        List<SessionQuestion> questions = jdbc.sql("""
                SELECT sq.question_id, sq.position, q.code, q.bank, q.subject, q.topic
                FROM session_questions sq JOIN questions q ON q.id = sq.question_id
                WHERE sq.session_id = :sessionId ORDER BY sq.position
                """).param("sessionId", sessionId)
                .query((rs, row) -> new SessionQuestion(rs.getLong("question_id"), rs.getInt("position"),
                        rs.getString("code"), com.hedefyks.question.QuestionBank.valueOf(rs.getString("bank")),
                        rs.getString("subject"), rs.getString("topic"))).list();
        return new Session(header.id(), header.startedAt(), questions.size(), questions);
    }

    @Transactional(readOnly = true)
    public Optional<Session> latestActive(Long userId) {
        return jdbc.sql("""
                SELECT id FROM study_sessions WHERE user_id = :userId
                  AND mode = 'PRACTICE' AND status = 'IN_PROGRESS'
                ORDER BY started_at DESC, id DESC LIMIT 1
                """).param("userId", userId).query(Long.class).optional().map(id -> get(userId, id));
    }

    private Optional<Long> byRequest(Long userId, java.util.UUID requestId) {
        return jdbc.sql("""
                SELECT id FROM study_sessions
                WHERE user_id = :userId AND client_request_id = :requestId AND mode = 'PRACTICE'
                """).param("userId", userId).param("requestId", requestId).query(Long.class).optional();
    }

    private record Header(Long id, Instant startedAt) {}
}
