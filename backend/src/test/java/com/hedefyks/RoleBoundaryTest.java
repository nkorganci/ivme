package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.Role;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class RoleBoundaryTest extends TestBase {
    @Test
    void yonetici_operator_ve_ogrenci_api_sinirlari_capraz_reddedilir() throws Exception {
        user("yonetici", Role.ADMIN);
        user("operator", Role.OPERATOR);
        user("ogrenci", Role.USER);
        MockHttpSession admin = login("yonetici", "Sifre1234");
        MockHttpSession operator = login("operator", "Sifre1234");
        MockHttpSession student = login("ogrenci", "Sifre1234");

        JsonNode stats = read(send(admin, get("/api/admin/stats?period=WEEK"), null)
                .andExpect(status().isOk()));
        List<String> rootFields = new ArrayList<>();
        stats.fieldNames().forEachRemaining(rootFields::add);
        assertThat(rootFields).containsExactlyInAnyOrder(
                "userCount", "submittedExamCount", "usage");
        List<String> usageFields = new ArrayList<>();
        stats.get("usage").fieldNames().forEachRemaining(usageFields::add);
        assertThat(usageFields).containsExactlyInAnyOrder(
                "period", "zone", "startsAt", "endsAt", "activeUsers",
                "studySessions", "examsStarted", "answersSubmitted");
        assertThat(stats.get("userCount").isNull()).isTrue();
        assertThat(stats.get("usage").get("activeUsers").isNull()).isTrue();
        for (MockHttpSession session : new MockHttpSession[]{operator, student}) {
            send(session, get("/api/admin/stats"), null).andExpect(status().isForbidden());
        }

        send(operator, get("/api/operator/questions"), null).andExpect(status().isOk());
        for (MockHttpSession session : new MockHttpSession[]{admin, student}) {
            send(session, get("/api/operator/questions"), null).andExpect(status().isForbidden());
        }

        Set<String> studentPaths = Set.of(
                "/api/goals", "/api/recommendations?subject=Türkçe",
                "/api/progress/first-attempts?period=DAY&zone=Europe/Istanbul",
                "/api/questions/filters");
        for (String path : studentPaths) {
            send(student, get(path), null).andExpect(status().isOk());
            send(admin, get(path), null).andExpect(status().isForbidden());
            send(operator, get(path), null).andExpect(status().isForbidden());
        }
        send(admin, get("/api/admin/feedback"), null).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/stats")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/operator/questions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/goals")).andExpect(status().isUnauthorized());
    }
}
