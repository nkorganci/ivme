package com.hedefyks.progress;

import com.hedefyks.common.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoalService {
    public enum Metric { UNIQUE_QUESTIONS, ATTEMPTS, TESTS, EXAMS }
    public record Create(ProgressService.Period period, Metric metric, String subject,
                         Integer targetCount, String zone) {}
    public record Edit(Integer targetCount, String subject) {}
    public record Goal(Long id, String period, String metric, String subject, int targetCount,
                       LocalDate startsOn, LocalDate endsOn, String zone, String status,
                       Instant createdAt, Instant updatedAt, Instant stoppedAt) {}

    private static final String COLUMNS = "id, period, metric, subject, target_count, starts_on, ends_on, "
            + "zone_id, status, created_at, updated_at, stopped_at";
    private final JdbcTemplate jdbc;

    public GoalService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true)
    public List<Goal> list(Long userId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM goals WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
                (rs, n) -> row(rs), userId);
    }

    @Transactional(readOnly = true)
    public Goal get(Long userId, Long id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM goals WHERE id = ? AND user_id = ?",
                (rs, n) -> row(rs), id, userId).stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Hedef bulunamadı."));
    }

    @Transactional
    public Goal create(Long userId, Create input) {
        if (input == null || input.metric() == null) throw ApiException.badRequest("Hedef ölçütü gerekli.");
        int target = target(input.targetCount());
        String subject = subject(input.subject());
        GoalPeriod dates = GoalPeriod.containing(input.period(), input.zone(), Instant.now());
        Long id = jdbc.queryForObject("""
                INSERT INTO goals(user_id, period, metric, subject, target_count, starts_on, ends_on, zone_id)
                VALUES (?,?,?,?,?,?,?,?) RETURNING id
                """, Long.class, userId, dates.period(), input.metric().name(), subject, target,
                dates.startsOn(), dates.endsOn(), dates.zoneId());
        return get(userId, id);
    }

    @Transactional
    public Goal edit(Long userId, Long id, Edit input) {
        if (input == null) throw ApiException.badRequest("Hedef bilgisi gerekli.");
        int target = target(input.targetCount());
        String subject = subject(input.subject());
        int updated = jdbc.update("""
                UPDATE goals SET target_count = ?, subject = ?, updated_at = now()
                WHERE id = ? AND user_id = ? AND status = 'ACTIVE' AND ends_on >=
                  (now() AT TIME ZONE zone_id)::date
                """, target, subject, id, userId);
        if (updated == 0) {
            get(userId, id);
            throw ApiException.conflict("Biten veya durdurulan hedef düzenlenemez.");
        }
        return get(userId, id);
    }

    @Transactional
    public Goal stop(Long userId, Long id) {
        int updated = jdbc.update("""
                UPDATE goals SET status = 'ENDED', stopped_at = now(), updated_at = now()
                WHERE id = ? AND user_id = ? AND status = 'ACTIVE'
                """, id, userId);
        if (updated == 0) {
            Goal existing = get(userId, id);
            if (!existing.status().equals("ENDED")) throw ApiException.conflict("Hedef durdurulamadı.");
            return existing;
        }
        return get(userId, id);
    }

    private static int target(Integer value) {
        if (value == null || value < 1 || value > 10000) {
            throw ApiException.badRequest("Hedef sayısı 1 ile 10000 arasında olmalı.");
        }
        return value;
    }

    private static String subject(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > 80) throw ApiException.badRequest("Ders adı en fazla 80 karakter olmalı.");
        return normalized;
    }

    private static Goal row(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Goal(rs.getLong("id"), rs.getString("period"), rs.getString("metric"),
                rs.getString("subject"), rs.getInt("target_count"), rs.getObject("starts_on", LocalDate.class),
                rs.getObject("ends_on", LocalDate.class), rs.getString("zone_id"), rs.getString("status"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant(),
                rs.getObject("stopped_at") == null ? null : rs.getObject("stopped_at", OffsetDateTime.class).toInstant());
    }
}
