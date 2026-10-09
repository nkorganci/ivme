package com.hedefyks.question;

import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Çalışma oturumu kurucusu ve soru listesi için gerçek kullanıcı kapsamı. */
@Service
@Transactional(readOnly = true)
public class QuestionAvailabilityService {
    public record Availability(long total, long solved, long remaining, long everWrong) {}

    private final JdbcClient jdbc;

    public QuestionAvailabilityService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Availability count(Long userId, QuestionFilter filter) {
        StringBuilder sql = new StringBuilder("""
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
                SELECT count(*) AS total, count(m.question_id) AS solved,
                       count(*) - count(m.question_id) AS remaining,
                       count(*) FILTER (WHERE m.ever_wrong) AS ever_wrong
                FROM questions q LEFT JOIN mine m ON m.question_id = q.id
                WHERE q.active = true
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        if (filter.bank() != null) { sql.append(" AND q.bank = :bank"); params.put("bank", filter.bank().name()); }
        if (filter.examType() != null) { sql.append(" AND q.exam_type = :examType"); params.put("examType", filter.examType().name()); }
        if (filter.subject() != null) { sql.append(" AND q.subject = :subject"); params.put("subject", filter.subject()); }
        if (filter.topic() != null) { sql.append(" AND q.topic = :topic"); params.put("topic", filter.topic()); }
        return jdbc.sql(sql.toString()).params(params).query((rs, n) -> new Availability(
                rs.getLong("total"), rs.getLong("solved"), rs.getLong("remaining"), rs.getLong("ever_wrong"))).single();
    }
}
