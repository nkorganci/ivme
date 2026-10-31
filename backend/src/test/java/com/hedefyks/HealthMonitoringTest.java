package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.common.RecordWriteMetrics;
import com.hedefyks.user.Role;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class HealthMonitoringTest extends TestBase {
    @Autowired RecordWriteMetrics writeMetrics;
    @Autowired MeterRegistry registry;

    @Test
    void probes_are_public_but_metrics_require_admin() throws Exception {
        mvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
        mvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
        mvc.perform(get("/actuator/health")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
        user("yonetici", Role.ADMIN);
        user("ayse", Role.USER);
        mvc.perform(get("/actuator/metrics").session(login("ayse", "Sifre1234")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/actuator/metrics").session(login("yonetici", "Sifre1234")))
                .andExpect(status().isOk());
    }

    @Test
    void writes_measure_success_and_failure_without_database_write() {
        writeMetrics.measure("learn_events", () -> "ok");
        try {
            writeMetrics.measure("learn_events", () -> { throw new IllegalStateException("failure"); });
        } catch (IllegalStateException expected) {
            // An uncommitted write is a failure, regardless of its exception type.
        }
        assertThat(registry.get("ivme.record.write").tag("operation", "learn_events")
                .tag("result", "success").timer().count()).isGreaterThanOrEqualTo(1);
        assertThat(registry.get("ivme.record.write").tag("operation", "learn_events")
                .tag("result", "success").timer().takeSnapshot().percentileValues()).isNotEmpty();
        assertThat(registry.get("ivme.record.write").tag("operation", "learn_events")
                .tag("result", "failure").timer().count()).isGreaterThanOrEqualTo(1);
    }
}
