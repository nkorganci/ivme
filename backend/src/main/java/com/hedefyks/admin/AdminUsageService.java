package com.hedefyks.admin;

import com.hedefyks.progress.GoalPeriod;
import com.hedefyks.progress.ProgressService;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Yönetici için yalnız toplu dönem sayıları. */
@Service
@Transactional(readOnly = true)
public class AdminUsageService {
    public record Usage(ProgressService.Period period, String zone, Instant startsAt, Instant endsAt,
                        long activeUsers, long studySessions, long examsStarted, long answersSubmitted) {}

    private final JdbcTemplate jdbc;

    public AdminUsageService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Usage usage(ProgressService.Period period, String zone) {
        return usageAt(period, zone, Instant.now());
    }

    public Usage usageAt(ProgressService.Period period, String zone, Instant now) {
        GoalPeriod window = GoalPeriod.containing(period, zone, now);
        var start = OffsetDateTime.ofInstant(window.startsAt(), ZoneOffset.UTC);
        var end = OffsetDateTime.ofInstant(window.endsAt(), ZoneOffset.UTC);
        long active = jdbc.queryForObject("""
                SELECT count(DISTINCT activity.user_id) FROM (
                  SELECT user_id FROM question_attempts WHERE event_type = 'ANSWER'
                    AND created_at >= ? AND created_at < ?
                  UNION ALL
                  SELECT user_id FROM study_sessions WHERE started_at >= ? AND started_at < ?
                  UNION ALL
                  SELECT user_id FROM exams WHERE started_at >= ? AND started_at < ?
                ) activity JOIN users u ON u.id = activity.user_id AND u.role = 'USER'
                """, Long.class, start, end, start, end, start, end);
        long sessions = jdbc.queryForObject("""
                SELECT count(*) FROM study_sessions WHERE started_at >= ? AND started_at < ?
                """, Long.class, start, end);
        long exams = jdbc.queryForObject("""
                SELECT count(*) FROM exams WHERE started_at >= ? AND started_at < ?
                """, Long.class, start, end);
        long answers = jdbc.queryForObject("""
                SELECT (SELECT count(*) FROM question_attempts
                        WHERE event_type = 'ANSWER' AND created_at >= ? AND created_at < ?)
                     + (SELECT count(*) FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
                        WHERE e.status = 'SUBMITTED' AND eq.selected_answer IS NOT NULL
                          AND e.submitted_at >= ? AND e.submitted_at < ?)
                """, Long.class, start, end, start, end);
        return new Usage(period, window.zoneId(), window.startsAt(), window.endsAt(),
                active, sessions, exams, answers);
    }
}
