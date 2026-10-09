package com.hedefyks.question;

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
    public record Availability(long total, long solved, long remaining, long everWrong) {}

    private static final String MINE = """
            WITH answers AS (
              SELECT question_id, is_correct FROM question_attempts
                WHERE user_id = :userId AND event_type = 'ANSWER'
              UNION ALL
              SELECT eq.question_id, eq.is_correct FROM exam_questions eq
                JOIN exams e ON e.id = eq.exam_id
                WHERE e.user_id = :userId AND e.status = 'SUBMITTED' AND eq.selected_answer IS NOT NULL
            ), mine AS (
              SELECT question_id, bool_or(is_correct = false) AS ever_wrong FROM answers
              GROUP BY question_id
            )
            """;

    private final JdbcClient jdbc;

    public QuestionAvailabilityService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Availability count(Long userId, QuestionFilter filter) {
        StringBuilder sql = new StringBuilder(MINE).append("""
                SELECT count(*) AS total, count(m.question_id) AS solved,
                       count(*) - count(m.question_id) AS remaining,
                       count(*) FILTER (WHERE m.ever_wrong) AS ever_wrong
                FROM questions q LEFT JOIN mine m ON m.question_id = q.id
                WHERE q.active = true
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        addFilters(sql, params, filter);
        return jdbc.sql(sql.toString()).params(params).query((rs, n) -> new Availability(
                rs.getLong("total"), rs.getLong("solved"), rs.getLong("remaining"), rs.getLong("ever_wrong"))).single();
    }

    public List<Long> randomIds(Long userId, QuestionFilter filter, QuestionSelectionMode mode, int limit) {
        StringBuilder sql = new StringBuilder(MINE).append("""
                SELECT q.id FROM questions q LEFT JOIN mine m ON m.question_id = q.id
                WHERE q.active = true
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        addFilters(sql, params, filter);
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

    private static void addFilters(StringBuilder sql, Map<String, Object> params, QuestionFilter filter) {
        if (filter.bank() != null) { sql.append(" AND q.bank = :bank"); params.put("bank", filter.bank().name()); }
        if (filter.examType() != null) { sql.append(" AND q.exam_type = :examType"); params.put("examType", filter.examType().name()); }
        if (filter.subject() != null) { sql.append(" AND q.subject = :subject"); params.put("subject", filter.subject()); }
        if (filter.topic() != null) { sql.append(" AND q.topic = :topic"); params.put("topic", filter.topic()); }
    }
}
