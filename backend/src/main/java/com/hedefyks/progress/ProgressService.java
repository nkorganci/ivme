package com.hedefyks.progress;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Pratik ve teslim edilmiş sınavdan soru başına ilk olayı tek kez sayar. */
@Service
@Transactional(readOnly = true)
public class ProgressService {
    public enum Period { DAY, WEEK, MONTH }
    public record Breakdown(String kind, String subject, String label,
                            long correct, long wrong, long blank, long total) {}
    public record Summary(Period period, String zone, Instant startsAt, Instant endsAt,
                          long correct, long wrong, long blank, long total, double successPercent,
                          List<Breakdown> breakdown) {}
    public record TimelineDay(LocalDate date, long activeSeconds, long logins,
                              long closedSessions, long sessionSeconds) {}
    public record Timeline(Period period, String zone, List<TimelineDay> days) {}
    private static final class MutableDay {
        long active, logins, closed, session;
    }

    private static final String BREAKDOWN_SQL = """
            WITH events AS (
              SELECT question_id, created_at AS occurred_at, is_correct, 0 AS source_order, id AS source_id
              FROM question_attempts WHERE user_id = ? AND event_type = 'ANSWER'
              UNION ALL
              SELECT eq.question_id, e.submitted_at AS occurred_at, eq.is_correct, 1 AS source_order, eq.id AS source_id
              FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
              WHERE e.user_id = ? AND e.status = 'SUBMITTED' AND e.submitted_at IS NOT NULL
            ), ranked AS (
              SELECT *, row_number() OVER
                  (PARTITION BY question_id ORDER BY occurred_at, source_order, source_id) AS rn
              FROM events
            ), firsts AS (
              SELECT * FROM ranked WHERE rn = 1 AND occurred_at >= ? AND occurred_at < ?
            ), labeled AS (
              SELECT f.is_correct, q.subject, coalesce(q.topic, 'Konu belirtilmemiş') AS topic,
                     coalesce(CASE WHEN f.source_order = 0 THEN (
                       SELECT string_agg(DISTINCT s.node_name, ' + ' ORDER BY s.node_name)
                       FROM attempt_taxonomy_snapshot s
                       WHERE s.attempt_id = f.source_id AND s.node_kind = 'QUESTION_TYPE'
                     ) ELSE (
                       SELECT string_agg(DISTINCT n.name, ' + ' ORDER BY n.name)
                       FROM question_taxonomy qt JOIN taxonomy_nodes n ON n.id = qt.node_id
                       WHERE qt.question_id = f.question_id AND qt.approval_status = 'APPROVED'
                         AND qt.source IN ('HUMAN', 'AI_REVIEWED') AND n.kind = 'QUESTION_TYPE' AND n.active
                     ) END, 'Onaylı soru tipi yok') AS question_type
              FROM firsts f JOIN questions q ON q.id = f.question_id
            )
            SELECT d.kind, d.subject, d.label,
                   count(*) FILTER (WHERE l.is_correct IS TRUE) AS correct,
                   count(*) FILTER (WHERE l.is_correct IS FALSE) AS wrong,
                   count(*) FILTER (WHERE l.is_correct IS NULL) AS blank,
                   count(*) AS total
            FROM labeled l CROSS JOIN LATERAL (VALUES
              ('SUBJECT', l.subject, l.subject),
              ('TOPIC', l.subject, l.topic),
              ('QUESTION_TYPE', l.subject, l.question_type)
            ) AS d(kind, subject, label)
            GROUP BY d.kind, d.subject, d.label
            ORDER BY d.kind, d.subject, d.label
            """;

    private final JdbcTemplate jdbc;

    public ProgressService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Summary summary(Long userId, Period period, String zoneName) {
        return summaryAt(userId, period, zoneName, Instant.now());
    }

    public Summary summaryAt(Long userId, Period period, String zoneName, Instant now) {
        GoalPeriod window = GoalPeriod.containing(period, zoneName, now);
        Instant from = window.startsAt();
        Instant until = window.endsAt();
        List<Breakdown> breakdown = jdbc.query(BREAKDOWN_SQL, (rs, row) -> new Breakdown(
                rs.getString("kind"), rs.getString("subject"), rs.getString("label"),
                rs.getLong("correct"), rs.getLong("wrong"), rs.getLong("blank"), rs.getLong("total")),
                userId, userId, OffsetDateTime.ofInstant(from, ZoneOffset.UTC),
                OffsetDateTime.ofInstant(until, ZoneOffset.UTC));
        long correct = breakdown.stream().filter(row -> row.kind().equals("SUBJECT"))
                .mapToLong(Breakdown::correct).sum();
        long wrong = breakdown.stream().filter(row -> row.kind().equals("SUBJECT"))
                .mapToLong(Breakdown::wrong).sum();
        long blank = breakdown.stream().filter(row -> row.kind().equals("SUBJECT"))
                .mapToLong(Breakdown::blank).sum();
        long total = correct + wrong + blank;
        double percent = total == 0 ? 0 : Math.round(correct * 1000.0 / total) / 10.0;
        return new Summary(period, window.zoneId(), from, until, correct, wrong, blank, total, percent,
                breakdown);
    }

    public Timeline timeline(Long userId, Period period, String zoneName) {
        return timelineAt(userId, period, zoneName, Instant.now());
    }

    public Timeline timelineAt(Long userId, Period period, String zoneName, Instant now) {
        Summary summary = summaryAt(userId, period, zoneName, now);
        ZoneId zone = ZoneId.of(summary.zone());
        Map<LocalDate, MutableDay> days = new LinkedHashMap<>();
        LocalDate date = summary.startsAt().atZone(zone).toLocalDate();
        LocalDate end = summary.endsAt().atZone(zone).toLocalDate();
        while (date.isBefore(end)) {
            days.put(date, new MutableDay());
            date = date.plusDays(1);
        }
        var from = OffsetDateTime.ofInstant(summary.startsAt(), ZoneOffset.UTC);
        var until = OffsetDateTime.ofInstant(summary.endsAt(), ZoneOffset.UTC);
        jdbc.query("""
                SELECT created_at, active_seconds FROM question_attempts
                WHERE user_id = ? AND created_at >= ? AND created_at < ?
                """, rs -> {
            LocalDate day = rs.getObject("created_at", OffsetDateTime.class).atZoneSameInstant(zone).toLocalDate();
            days.get(day).active += rs.getLong("active_seconds");
        }, userId, from, until);
        jdbc.query("""
                SELECT l.created_at, o.closed_at,
                       greatest(0, extract(epoch FROM o.closed_at - l.created_at)) AS seconds
                FROM activity_events l LEFT JOIN LATERAL (
                  SELECT min(created_at) AS closed_at FROM activity_events
                  WHERE user_id = l.user_id AND session_key = l.session_key
                    AND event_type = 'LOGOUT' AND created_at >= l.created_at
                ) o ON true
                WHERE l.user_id = ? AND l.event_type = 'LOGIN'
                  AND l.created_at >= ? AND l.created_at < ?
                """, rs -> {
            LocalDate day = rs.getObject("created_at", OffsetDateTime.class).atZoneSameInstant(zone).toLocalDate();
            MutableDay item = days.get(day);
            item.logins++;
            if (rs.getObject("closed_at") != null) {
                item.closed++;
                item.session += rs.getLong("seconds");
            }
        }, userId, from, until);
        List<TimelineDay> rows = new ArrayList<>();
        days.forEach((day, item) -> rows.add(new TimelineDay(day, item.active, item.logins,
                item.closed, item.session)));
        return new Timeline(period, summary.zone(), rows);
    }
}
