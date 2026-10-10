package com.hedefyks.common;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Beklenmeyen API hataları için anonim ve sınırlı süreli sayaç. */
@Service
public class ServiceErrorMetrics {
    private static final Logger log = LoggerFactory.getLogger(ServiceErrorMetrics.class);
    private final JdbcTemplate jdbc;

    public ServiceErrorMetrics(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void recordUnexpected() {
        try {
            jdbc.update("INSERT INTO service_error_events(category) VALUES ('UNEXPECTED_API')");
        } catch (DataAccessException e) {
            // Sayaç arızası asıl 500 yanıtını gizlememeli.
            log.warn("Anonim hizmet hata sayacı yazılamadı.");
        }
    }

    public long count(Instant from, Instant until) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM service_error_events
                WHERE occurred_at >= ? AND occurred_at < ? AND category = 'UNEXPECTED_API'
                """, Long.class, OffsetDateTime.ofInstant(from, ZoneOffset.UTC),
                OffsetDateTime.ofInstant(until, ZoneOffset.UTC));
    }
}
