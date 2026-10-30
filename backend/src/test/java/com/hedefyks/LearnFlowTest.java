package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class LearnFlowTest extends TestBase {

    private static String lesson(UUID id, String action) {
        return "{\"id\":\"" + id + "\",\"at\":\"" + Instant.now() + "\",\"kind\":\"lesson\",\"action\":\"" + action
                + "\",\"conceptId\":\"uslu-ifadeler\",\"sectionId\":\"s1\"}";
    }

    private static String bank(UUID id, long questionId, String chosen) {
        return "{\"subject\":\"matematik\",\"event\":{\"id\":\"" + id + "\",\"at\":\"" + Instant.now() + "\",\"kind\":\"attempt\","
                + "\"itemType\":\"bank\",\"itemId\":\"M-1\",\"questionId\":" + questionId + ",\"conceptId\":\"uslu-ifadeler\","
                + "\"archetypeId\":\"kurallar\",\"difficulty\":2,\"context\":\"mastery\",\"chosen\":\"" + chosen
                + "\",\"confidence\":3,\"timeMs\":42000,\"hintUsed\":false,\"correct\":true}}";
    }

    @Test
    void ayarlar_surumle_korunur_ve_olaylar_yalniz_eklenir() throws Exception {
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession mehmet = login("mehmet", "Sifre1234");

        send(ayse, get("/api/konu-ogrenme"), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.profile").doesNotExist()).andExpect(jsonPath("$.events.length()").value(0));
        send(ayse, put("/api/konu-ogrenme/profile"), "{\"subject\":\"matematik\",\"settings\":{\"dailyMinutes\":120}}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(1));
        send(ayse, put("/api/konu-ogrenme/profile"), "{\"subject\":\"matematik\",\"settings\":{\"dailyMinutes\":90}}")
                .andExpect(status().isConflict());
        send(ayse, put("/api/konu-ogrenme/profile"), "{\"subject\":\"matematik\",\"settings\":{\"dailyMinutes\":90},\"revision\":1}")
                .andExpect(jsonPath("$.revision").value(2)).andExpect(jsonPath("$.settings.dailyMinutes").value(90));
        send(ayse, put("/api/konu-ogrenme/profile"), "{\"subject\":\"fizik\",\"settings\":{}}").andExpect(status().isBadRequest());

        UUID open = UUID.randomUUID();
        String body = "{\"subject\":\"matematik\",\"events\":[" + lesson(open, "open") + "," + lesson(UUID.randomUUID(), "section") + "]}";
        send(ayse, post("/api/konu-ogrenme/events"), body).andExpect(status().isOk()).andExpect(jsonPath("$.events.length()").value(2));
        send(ayse, post("/api/konu-ogrenme/events"), "{\"events\":[" + lesson(open, "open") + "]}").andExpect(status().isOk());
        JsonNode state = read(send(ayse, get("/api/konu-ogrenme"), null));
        assertThat(state.get("events")).hasSize(2);
        assertThat(state.get("events").get(0).get("seq").asLong()).isPositive();
        assertThat(state.get("profile").get("settings").get("dailyMinutes").asInt()).isEqualTo(90);
        send(mehmet, get("/api/konu-ogrenme"), null).andExpect(jsonPath("$.events.length()").value(0));

        send(ayse, post("/api/konu-ogrenme/events"), "{\"events\":[{\"id\":\"" + UUID.randomUUID() + "\",\"at\":\"" + Instant.now()
                + "\",\"kind\":\"hack\"}]}").andExpect(status().isBadRequest());
        send(ayse, post("/api/konu-ogrenme/events"), "{\"events\":[{\"id\":\"" + UUID.randomUUID() + "\",\"at\":\"" + Instant.now()
                + "\",\"kind\":\"attempt\",\"itemType\":\"lesson_q\",\"itemId\":\"uslu:c1\",\"conceptId\":\"uslu-ifadeler\",\"context\":\"quick_check\"}]}")
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/konu-ogrenme/events"), "{\"events\":[{\"id\":\"" + UUID.randomUUID() + "\",\"at\":\"" + Instant.now()
                + "\",\"kind\":\"attempt\",\"itemType\":\"bank\",\"itemId\":\"M-1\",\"conceptId\":\"uslu-ifadeler\",\"context\":\"review\",\"correct\":true}]}")
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/konu-ogrenme/events"), "{\"events\":[{\"id\":\"" + UUID.randomUUID() + "\",\"at\":\"2099-01-01T00:00:00Z\",\"kind\":\"plan\"}]}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void banka_cevabi_sunucuda_puanlanir_ve_bagimsiz_pratige_yazilir() throws Exception {
        Question q = question("M-1", "Matematik", "C");
        q.setSolutionImage("TYT/turkce/TYT-0001.webp");
        questions.saveAndFlush(q);
        Question turkish = question("T-1", "Türkçe", "A");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession mehmet = login("mehmet", "Sifre1234");

        UUID first = UUID.randomUUID();
        JsonNode wrong = read(send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(first, q.getId(), "a")).andExpect(status().isOk()));
        assertThat(wrong.get("correct").asBoolean()).isFalse();
        assertThat(wrong.get("correctAnswer").asText()).isEqualTo("C");
        assertThat(wrong.get("hasSolution").asBoolean()).isTrue();
        assertThat(wrong.get("event").get("chosen").asText()).isEqualTo("A");
        assertThat(wrong.get("event").get("correct").asBoolean()).isFalse();
        send(ayse, get("/api/questions/" + q.getId() + "/practice"), null)
                .andExpect(jsonPath("$.roundComplete").value(true)).andExpect(jsonPath("$.correctAnswer").value("C"));
        send(ayse, get("/api/questions/" + q.getId() + "/solution-image"), null).andExpect(status().isOk());
        send(mehmet, get("/api/questions/" + q.getId() + "/solution-image"), null).andExpect(status().isNotFound());
        Integer practiceRows = jdbc.queryForObject("SELECT count(*) FROM question_attempts WHERE question_id = ?", Integer.class, q.getId());

        send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(first, q.getId(), "a")).andExpect(jsonPath("$.correct").value(false));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts WHERE question_id = ?", Integer.class, q.getId())).isEqualTo(practiceRows);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_engine_events WHERE question_id = ?", Integer.class, q.getId())).isEqualTo(1);

        JsonNode right = read(send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(UUID.randomUUID(), q.getId(), "C")));
        assertThat(right.get("correct").asBoolean()).isTrue();
        send(ayse, get("/api/questions/" + q.getId() + "/practice"), null).andExpect(jsonPath("$.round").value(2));

        send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(UUID.randomUUID(), turkish.getId(), "A")).andExpect(status().isBadRequest());
        send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(UUID.randomUUID(), q.getId(), "F")).andExpect(status().isBadRequest());
        send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(UUID.randomUUID(), 999999, "A")).andExpect(status().isNotFound());
        send(mehmet, get("/api/konu-ogrenme"), null).andExpect(jsonPath("$.events.length()").value(0));
        send(ayse, get("/api/konu-ogrenme"), null).andExpect(jsonPath("$.events.length()").value(2))
                .andExpect(jsonPath("$.events[0].correctAnswer").value("C"));

        send(ayse, post("/api/account/export"), "{\"currentPassword\":\"Sifre1234\"}")
                .andExpect(jsonPath("$.formatVersion").value(6))
                .andExpect(jsonPath("$.learningEngineEvents.length()").value(2));
    }
}
