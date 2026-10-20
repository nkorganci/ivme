package com.hedefyks.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.TestBase;
import com.hedefyks.config.ActivityRetention;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.CannotCreateTransactionException;

class ServiceErrorMetricsTest extends TestBase {
    @Autowired GlobalExceptionHandler handler;
    @Autowired ServiceErrorMetrics metrics;
    @Autowired ActivityRetention retention;

    @Test
    void veritabaniBaglantiHatasiOkumaVeYazmadaDogruMesajDondurur() {
        var failure = new CannotCreateTransactionException("connection refused");
        var read = new MockHttpServletRequest("GET", "/api/exams");
        var write = new MockHttpServletRequest("POST", "/api/feedback");
        assertThat(handler.database(failure, read).getBody().hata())
                .isEqualTo("Veritabanından kayıt okunamadı.");
        assertThat(handler.database(failure, write).getBody().hata())
                .isEqualTo("Veritabanına kayıt yapılamadı.");
    }

    @Test
    void yalniz_beklenmeyen_hata_anonim_kaydedilir_ve_eski_kayit_silinir() throws Exception {
        Instant before = Instant.now().minusSeconds(60);
        var response = handler.other(new IllegalStateException("internal secret"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().hata()).doesNotContain("internal secret");
        assertThat(metrics.count(before, Instant.now().plusSeconds(60))).isEqualTo(1);
        assertThat(handler.api(ApiException.badRequest("Geçersiz veri")).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(metrics.count(before, Instant.now().plusSeconds(60))).isEqualTo(1);
        List<String> columns = new ArrayList<>();
        jdbc.query("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'service_error_events' ORDER BY column_name
                """, rs -> { columns.add(rs.getString(1)); });
        assertThat(columns).containsExactly("category", "id", "occurred_at");
        jdbc.update("""
                INSERT INTO service_error_events(category,occurred_at)
                VALUES ('UNEXPECTED_API', now() - interval '91 days')
                """);
        retention.removeExpiredEvents();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM service_error_events", Long.class)).isEqualTo(1);
    }
}
