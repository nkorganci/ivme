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

    private static String request(UUID key, String subject, int count) {
        return "{\"subject\":\"" + subject + "\",\"questionCount\":" + count
                + ",\"clientRequestId\":\"" + key + "\"}";
    }
}
