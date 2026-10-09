package com.hedefyks.progress;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Hedef dönemi başlangıcı dahil, bitişi hariç; durdurulan hedef durdurma anında donar. */
@Service
@Transactional(readOnly = true)
public class GoalProgressService {
    private final JdbcTemplate jdbc;

    public GoalProgressService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long count(Long userId, GoalService.Goal goal, Instant now) {
        ZoneId zone = ZoneId.of(goal.zone());
        Instant from = goal.startsOn().atStartOfDay(zone).toInstant();
        Instant until = goal.endsOn().plusDays(1).atStartOfDay(zone).toInstant();
        if (now.isBefore(until)) until = now;
        if (goal.stoppedAt() != null && goal.stoppedAt().isBefore(until)) until = goal.stoppedAt();
        if (!until.isAfter(from)) return 0;
        var start = OffsetDateTime.ofInstant(from, ZoneOffset.UTC);
        var end = OffsetDateTime.ofInstant(until, ZoneOffset.UTC);
        String subject = goal.subject();
        return switch (GoalService.Metric.valueOf(goal.metric())) {
            case UNIQUE_QUESTIONS -> jdbc.queryForObject("""
                    WITH events AS (
                      SELECT a.question_id, a.created_at AS occurred_at, q.subject, 0 AS source_order, a.id AS source_id
                      FROM question_attempts a JOIN questions q ON q.id = a.question_id
                      WHERE a.user_id = ? AND a.event_type = 'ANSWER'
                      UNION ALL
                      SELECT eq.question_id, e.submitted_at, eq.subject, 1, eq.id
                      FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
                      WHERE e.user_id = ? AND e.status = 'SUBMITTED' AND eq.selected_answer IS NOT NULL
                    ), firsts AS (
                      SELECT *, row_number() OVER
                        (PARTITION BY question_id ORDER BY occurred_at, source_order, source_id) AS rn
                      FROM events
                    )
                    SELECT count(*) FROM firsts
                    WHERE rn = 1 AND occurred_at >= ? AND occurred_at < ?
                      AND (?::text IS NULL OR subject = ?)
                    """, Long.class, userId, userId, start, end, subject, subject);
            case ATTEMPTS -> jdbc.queryForObject("""
                    SELECT (SELECT count(*) FROM question_attempts a JOIN questions q ON q.id = a.question_id
                            WHERE a.user_id = ? AND a.event_type = 'ANSWER'
                              AND a.created_at >= ? AND a.created_at < ?
                              AND (?::text IS NULL OR q.subject = ?))
                         + (SELECT count(*) FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
                            WHERE e.user_id = ? AND e.status = 'SUBMITTED' AND eq.selected_answer IS NOT NULL
                              AND e.submitted_at >= ? AND e.submitted_at < ?
                              AND (?::text IS NULL OR eq.subject = ?))
                    """, Long.class, userId, start, end, subject, subject,
                    userId, start, end, subject, subject);
            case TESTS -> jdbc.queryForObject("""
                    SELECT count(*) FROM study_sessions
                    WHERE user_id = ? AND mode = 'PRACTICE' AND time_limit_seconds IS NOT NULL
                      AND status = 'COMPLETED' AND ended_at >= ? AND ended_at < ?
                      AND (?::text IS NULL OR filter_subject = ?)
                    """, Long.class, userId, start, end, subject, subject);
            case EXAMS -> jdbc.queryForObject("""
                    SELECT count(*) FROM exams
                    WHERE user_id = ? AND status = 'SUBMITTED' AND submitted_at >= ? AND submitted_at < ?
                      AND (?::text IS NULL OR subject = ?)
                    """, Long.class, userId, start, end, subject, subject);
        };
    }
}
