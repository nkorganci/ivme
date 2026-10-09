package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProgressAccessTest extends TestBase {

    @Test
    void ikiOgrenciPratikOturumuVeKaralamayiBirbirindenGoremez() throws Exception {
        var question = question("ACL-1", "Türkçe", "B");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        String create = "{\"questionCount\":1,\"durationMinutes\":10,\"clientRequestId\":\"" + UUID.randomUUID() + "\"}";
        JsonNode own = read(send(ayse, post("/api/study-sessions"), create).andExpect(status().isCreated()));
        long id = own.get("id").asLong();
        String practice = "/api/questions/" + question.getId() + "/practice";
        String event = "{\"clientEventId\":\"" + UUID.randomUUID()
                + "\",\"eventType\":\"ANSWER\",\"answer\":\"B\",\"sessionId\":" + id + "}";

        send(mehmet, get("/api/study-sessions/" + id), null).andExpect(status().isNotFound());
        send(mehmet, post("/api/study-sessions/" + id + "/finish"), null).andExpect(status().isNotFound());
        send(mehmet, get(practice + "?sessionId=" + id), null).andExpect(status().isNotFound());
        send(mehmet, post(practice), event).andExpect(status().isNotFound());
        assertThat(read(send(mehmet, get("/api/study-sessions"), null).andExpect(status().isOk()))
                .at("/totalElements").asInt()).isZero();

        send(ayse, post(practice), event).andExpect(status().isOk());
        send(mehmet, get(practice), null).andExpect(jsonPath("$.attempts.length()").value(0));
        send(ayse, get("/api/questions/availability"), null)
                .andExpect(jsonPath("$.solved").value(1));
        send(mehmet, get("/api/questions/availability"), null)
                .andExpect(jsonPath("$.solved").value(0));
        send(ayse, put("/api/questions/" + question.getId() + "/board"),
                "{\"version\":0,\"strokes\":[[[0.1,0.2]]]}" ).andExpect(status().isOk());
        send(mehmet, get("/api/questions/" + question.getId() + "/board"), null)
                .andExpect(jsonPath("$.strokes.length()").value(0));
        send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from question_attempts where session_id = ?", Integer.class, id))
                .isEqualTo(1);
    }

    @Test
    void yoneticiOperatorVeMisafirOgrenciIlerlemeApilerineGiremez() throws Exception {
        var question = question("ACL-2", "Matematik", "A");
        user("admin", Role.ADMIN);
        user("operator", Role.OPERATOR);
        var admin = login("admin", "Sifre1234");
        var operator = login("operator", "Sifre1234");
        String[] paths = {"/api/study-sessions", "/api/study-sessions/active", "/api/study-sessions/1",
                "/api/questions/availability", "/api/questions/" + question.getId() + "/practice",
                "/api/questions/" + question.getId() + "/board"};
        for (String path : paths) {
            send(admin, get(path), null).andExpect(status().isForbidden());
            send(operator, get(path), null).andExpect(status().isForbidden());
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        String create = "{\"questionCount\":1,\"clientRequestId\":\"" + UUID.randomUUID() + "\"}";
        send(admin, post("/api/study-sessions"), create).andExpect(status().isForbidden());
        send(operator, post("/api/study-sessions/1/finish"), null).andExpect(status().isForbidden());
        send(operator, put("/api/questions/" + question.getId() + "/board"),
                "{\"version\":0,\"strokes\":[]}").andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("select count(*) from study_sessions", Integer.class)).isZero();
    }
}
