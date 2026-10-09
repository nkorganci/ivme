package com.hedefyks.progress;

import com.hedefyks.common.ApiException;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Pratik ve teslim edilmiş sınavdan soru başına ilk olayı tek kez sayar. */
@Service
@Transactional(readOnly = true)
public class ProgressService {
    public enum Period { DAY, WEEK, MONTH }
    public record Summary(Period period, String zone, Instant startsAt, Instant endsAt,
                          long correct, long wrong, long blank, long total, double successPercent) {}

    private static final String FIRSTS_SQL = """
            WITH events AS (
              SELECT question_id, created_at AS occurred_at, is_correct, 0 AS source_order, id AS source_id
              FROM question_attempts WHERE user_id = ? AND event_type = 'ANSWER'
              UNION ALL
              SELECT eq.question_id, e.submitted_at AS occurred_at, eq.is_correct, 1 AS source_order, eq.id AS source_id
              FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
              WHERE e.user_id = ? AND e.status = 'SUBMITTED' AND e.submitted_at IS NOT NULL
            ), ranked AS (
              SELECT occurred_at, is_correct,
                     row_number() OVER (PARTITION BY question_id ORDER BY occurred_at, source_order, source_id) AS rn
              FROM events
            )
            SELECT count(*) FILTER (WHERE is_correct IS TRUE),
                   count(*) FILTER (WHERE is_correct IS FALSE),
                   count(*) FILTER (WHERE is_correct IS NULL)
            FROM ranked WHERE rn = 1 AND occurred_at >= ? AND occurred_at < ?
            """;

    private final JdbcTemplate jdbc;

    public ProgressService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Summary summary(Long userId, Period period, String zoneName) {
        return summaryAt(userId, period, zoneName, Instant.now());
    }

    public Summary summaryAt(Long userId, Period period, String zoneName, Instant now) {
        if (period == null) throw ApiException.badRequest("Dönem gerekli.");
        if (zoneName == null || zoneName.isBlank() || zoneName.length() > 64) {
            throw ApiException.badRequest("Geçerli bir saat dilimi seç.");
        }
        ZoneId zone;
        try { zone = ZoneId.of(zoneName); }
        catch (DateTimeException e) { throw ApiException.badRequest("Geçerli bir saat dilimi seç."); }
        LocalDate day = now.atZone(zone).toLocalDate();
        LocalDate start = switch (period) {
            case DAY -> day;
            case WEEK -> day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> day.withDayOfMonth(1);
        };
        LocalDate end = switch (period) {
            case DAY -> start.plusDays(1);
            case WEEK -> start.plusWeeks(1);
            case MONTH -> start.plusMonths(1);
        };
        Instant from = start.atStartOfDay(zone).toInstant();
        Instant until = end.atStartOfDay(zone).toInstant();
        long[] counts = jdbc.queryForObject(FIRSTS_SQL, (rs, row) -> new long[]{
                rs.getLong(1), rs.getLong(2), rs.getLong(3)}, userId, userId,
                OffsetDateTime.ofInstant(from, ZoneOffset.UTC), OffsetDateTime.ofInstant(until, ZoneOffset.UTC));
        long total = counts[0] + counts[1] + counts[2];
        double percent = total == 0 ? 0 : Math.round(counts[0] * 1000.0 / total) / 10.0;
        return new Summary(period, zone.getId(), from, until, counts[0], counts[1], counts[2], total, percent);
    }
}
