package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class AttemptTest extends TestBase {

    private String event(UUID id, String type, String answer, int seconds) {
        return "{\"clientEventId\":\"" + id + "\",\"eventType\":\"" + type
                + "\",\"answer\":" + (answer == null ? "null" : "\"" + answer + "\"")
                + ",\"activeSeconds\":" + seconds + "}";
    }

    @Test
    void yanlislar_gizli_tekrar_ve_gosterme_kayitli_sahibe_ozeldir() throws Exception {
        Question q = question("P-1", "Türkçe", "C");
        q.setSolutionImage("TYT/turkce/TYT-0001.webp");
        questions.saveAndFlush(q);
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession mehmet = login("mehmet", "Sifre1234");
        String path = "/api/questions/" + q.getId() + "/practice";

        send(ayse, get(path), null).andExpect(jsonPath("$.attempts.length()").value(0))
                .andExpect(jsonPath("$.correctAnswer").doesNotExist());
        UUID first = UUID.randomUUID();
        JsonNode wrong = read(send(ayse, post(path), event(first, "ANSWER", "A", 14))
                .andExpect(status().isOk()).andExpect(jsonPath("$.remainingAttempts").value(1)));
        assertThat(wrong.get("attempts").get(0).get("activeSeconds").asInt()).isEqualTo(14);
        assertThat(wrong.get("correctAnswer").isNull()).isTrue();
        send(ayse, post(path), event(first, "ANSWER", "A", 14)).andExpect(jsonPath("$.attempts.length()").value(1));
        send(ayse, post(path), event(first, "ANSWER", "B", 14)).andExpect(status().isConflict());
        send(ayse, post(path), event(UUID.randomUUID(), "ANSWER", "B", 9))
                .andExpect(jsonPath("$.remainingAttempts").value(0)).andExpect(jsonPath("$.canReveal").value(true));
        send(ayse, post(path), event(UUID.randomUUID(), "ANSWER", "D", 1)).andExpect(status().isConflict());
        send(mehmet, get(path), null).andExpect(jsonPath("$.attempts.length()").value(0))
                .andExpect(jsonPath("$.correctAnswer").doesNotExist());
        send(mehmet, get("/api/questions/" + q.getId() + "/solution-image"), null)
                .andExpect(status().isNotFound());
        send(ayse, post("/api/questions/" + q.getId() + "/check"), "{\"answer\":\"A\"}")
                .andExpect(status().isNotFound());
        send(ayse, post(path), event(UUID.randomUUID(), "REVEAL", null, 2))
                .andExpect(jsonPath("$.correctAnswer").value("C"))
                .andExpect(jsonPath("$.roundComplete").value(true));
        send(ayse, get("/api/questions/" + q.getId() + "/solution-image"), null)
                .andExpect(status().isOk());
        send(mehmet, get("/api/questions/" + q.getId() + "/solution-image"), null)
                .andExpect(status().isNotFound());

        q.setCorrectAnswer("D");
        questions.saveAndFlush(q);
        send(ayse, get(path), null).andExpect(jsonPath("$.correctAnswer").value("C"));
        send(ayse, post(path), event(UUID.randomUUID(), "ANSWER", "D", 5))
                .andExpect(jsonPath("$.round").value(2))
                .andExpect(jsonPath("$.correctAnswer").value("D"))
                .andExpect(jsonPath("$.attempts.length()").value(1));
    }

    @Test
    void cevap_gosterme_ve_atlama_sik_ve_sure_dogrulamasi() throws Exception {
        Question q = question("P-2", "Matematik", "A");
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        String path = "/api/questions/" + q.getId() + "/practice";
        send(session, post(path), event(UUID.randomUUID(), "ANSWER", "Z", 1)).andExpect(status().isBadRequest());
        send(session, post(path), event(UUID.randomUUID(), "REVEAL", "A", 1)).andExpect(status().isBadRequest());
        send(session, post(path), event(UUID.randomUUID(), "SKIP", null, 21601)).andExpect(status().isBadRequest());
        send(session, post(path), event(UUID.randomUUID(), "SKIP", null, 4))
                .andExpect(jsonPath("$.roundComplete").value(true))
                .andExpect(jsonPath("$.correctAnswer").doesNotExist());
        send(session, post(path), event(UUID.randomUUID(), "REVEAL", null, 0)).andExpect(status().isConflict());
        send(session, post(path), event(UUID.randomUUID(), "ANSWER", "A", 3))
                .andExpect(jsonPath("$.round").value(2)).andExpect(jsonPath("$.correctAnswer").value("A"));
    }
}
