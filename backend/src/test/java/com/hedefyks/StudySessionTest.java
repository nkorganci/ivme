package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.Role;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StudySessionTest extends TestBase {

    @Test
    void oturumTekilSiraylaKaydedilirTekrarlanirVeYalnizSahibiAcabilir() throws Exception {
        question("P-1", "Türkçe", "B");
        question("P-2", "Türkçe", "A");
        question("P-3", "Matematik", "C");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        UUID key = UUID.randomUUID();
        String body = request(key, "Türkçe", 2);

        mvc.perform(get("/api/study-sessions/active").session(ayse)).andExpect(status().isNoContent());
        JsonNode created = read(send(ayse, post("/api/study-sessions"), body).andExpect(status().isCreated()));
        long id = created.get("id").asLong();
        assertThat(created.get("questionCount").asInt()).isEqualTo(2);
        assertThat(created.toString()).doesNotContain("correctAnswer");
        Set<Long> ids = new HashSet<>();
        for (JsonNode item : created.get("questions")) ids.add(item.get("questionId").asLong());
        assertThat(ids).hasSize(2);
        assertThat(created.at("/questions/0/position").asInt()).isEqualTo(1);
        assertThat(created.at("/questions/1/position").asInt()).isEqualTo(2);

        JsonNode again = read(send(ayse, post("/api/study-sessions"), body).andExpect(status().isCreated()));
        assertThat(again).isEqualTo(created);
        assertThat(jdbc.queryForObject("select count(*) from study_sessions", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from session_questions", Integer.class)).isEqualTo(2);
        mvc.perform(get("/api/study-sessions/" + id).session(ayse)).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].questionId").value(created.at("/questions/0/questionId").asLong()));
        mvc.perform(get("/api/study-sessions/active").session(ayse)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/api/study-sessions/" + id).session(mehmet)).andExpect(status().isNotFound());
        mvc.perform(get("/api/study-sessions/active").session(mehmet)).andExpect(status().isNoContent());
    }

    @Test
    void azSoruVeGecersizSayiOturumOlusturmaz() throws Exception {
        question("P-1", "Türkçe", "B");
        user("ayse", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Matematik", 1))
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 2))
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 0))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.alanlar.questionCount").exists());
        assertThat(jdbc.queryForObject("select count(*) from study_sessions", Integer.class)).isZero();
    }

    @Test
    void denemeYalnizOturumSorusunaBaglanirVeDurumSonTuraGoreKalir() throws Exception {
        var one = question("P-1", "Türkçe", "B");
        var two = question("P-2", "Türkçe", "A");
        var outside = question("P-3", "Matematik", "C");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");

        // Daha önce bağımsız çözülen soru yeni oturumun yanıtını açığa çıkarmaz.
        send(ayse, post("/api/questions/" + one.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "B", null)).andExpect(status().isOk());
        JsonNode created = read(send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 2))
                .andExpect(status().isCreated()));
        long id = created.get("id").asLong();
        assertThat(created.at("/questions/0/status").asText()).isEqualTo("NOT_STARTED");
        send(ayse, get("/api/questions/" + one.getId() + "/practice?sessionId=" + id), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.attempts.length()").value(0))
                .andExpect(jsonPath("$.correctAnswer").doesNotExist());

        String onePath = "/api/questions/" + one.getId() + "/practice";
        send(ayse, post("/api/questions/" + outside.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "A", id)).andExpect(status().isNotFound());
        send(mehmet, post(onePath), event(UUID.randomUUID(), "ANSWER", "A", id))
                .andExpect(status().isNotFound());
        UUID wrongId = UUID.randomUUID();
        send(ayse, post(onePath), event(wrongId, "ANSWER", "A", id)).andExpect(status().isOk());
        send(ayse, post(onePath), event(wrongId, "ANSWER", "A", id)).andExpect(status().isOk());
        send(ayse, post(onePath), event(wrongId, "ANSWER", "A", null)).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from question_attempts where session_id = ?", Integer.class, id))
                .isEqualTo(1);
        JsonNode progress = read(send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk()));
        assertThat(progress.get("questions").findValuesAsText("status"))
                .containsExactlyInAnyOrder("IN_PROGRESS", "NOT_STARTED");
        send(ayse, post(onePath), event(UUID.randomUUID(), "ANSWER", "B", null)).andExpect(status().isOk());
        JsonNode afterIndependent = read(send(ayse, get("/api/study-sessions/" + id), null)
                .andExpect(status().isOk()));
        assertThat(afterIndependent.get("questions").findValuesAsText("status"))
                .containsExactlyInAnyOrder("IN_PROGRESS", "NOT_STARTED");
        send(ayse, post(onePath), event(UUID.randomUUID(), "REVEAL", null, id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + two.getId() + "/practice"),
                event(UUID.randomUUID(), "SKIP", null, id)).andExpect(status().isOk());
        JsonNode done = read(send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk()));
        assertThat(done.get("questions").findValuesAsText("status")).containsExactlyInAnyOrder("COMPLETED", "COMPLETED");
        send(ayse, get(onePath), null).andExpect(jsonPath("$.attempts.length()").value(1));
        send(mehmet, get(onePath + "?sessionId=" + id), null).andExpect(status().isNotFound());
    }

    private static String event(UUID key, String type, String answer, Long sessionId) {
        return "{\"clientEventId\":\"" + key + "\",\"eventType\":\"" + type + "\",\"answer\":"
                + (answer == null ? "null" : "\"" + answer + "\"") + ",\"sessionId\":" + sessionId + "}";
    }

    private static String request(UUID key, String subject, int count) {
        return "{\"subject\":\"" + subject + "\",\"questionCount\":" + count
                + ",\"clientRequestId\":\"" + key + "\"}";
    }
}
