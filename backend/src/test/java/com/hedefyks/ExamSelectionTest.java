package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ExamSelectionTest extends TestBase {
    @Test
    void yeni_onceki_yanlis_ve_karisik_havuzlari_tekil_ve_sahibe_ozeldir() throws Exception {
        Question one = question("S-1", "Türkçe", "B");
        Question two = question("S-2", "Türkçe", "A");
        Question three = question("S-3", "Türkçe", "A");
        Question four = question("S-4", "Türkçe", "A");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        send(ayse, post("/api/questions/" + one.getId() + "/practice"), answer("A")).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + two.getId() + "/practice"), answer("A")).andExpect(status().isOk());

        send(ayse, post("/api/exams"), request("NEW", 3)).andExpect(status().isBadRequest());
        JsonNode fresh = read(send(ayse, post("/api/exams"), request("NEW", 2)).andExpect(status().isCreated()));
        assertThat(ids(fresh)).containsExactlyInAnyOrder(three.getId(), four.getId());
        assertThat(fresh.get("selectionMode").asText()).isEqualTo("NEW");
        assertThat(jdbc.queryForObject("select selection_mode from exams where id = ?", String.class,
                fresh.get("id").asLong())).isEqualTo("NEW");

        JsonNode repeat = read(send(ayse, post("/api/exams"), request("REPEAT", 2)).andExpect(status().isCreated()));
        assertThat(ids(repeat)).containsExactlyInAnyOrder(one.getId(), two.getId());
        JsonNode wrong = read(send(ayse, post("/api/exams"), request("WRONG", 1)).andExpect(status().isCreated()));
        assertThat(ids(wrong)).containsExactly(one.getId());
        JsonNode mixed = read(send(ayse, post("/api/exams"), request("MIXED", 4)).andExpect(status().isCreated()));
        assertThat(ids(mixed)).containsExactlyInAnyOrder(one.getId(), two.getId(), three.getId(), four.getId());
        send(mehmet, post("/api/exams"), request("REPEAT", 1)).andExpect(status().isBadRequest());
        JsonNode mehmetNew = read(send(mehmet, post("/api/exams"), request("NEW", 4)).andExpect(status().isCreated()));
        assertThat(new HashSet<>(ids(mehmetNew))).hasSize(4);
    }

    private static String answer(String choice) {
        return "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\""
                + choice + "\"}";
    }

    private static String request(String mode, int count) {
        return "{\"subject\":\"Türkçe\",\"questionCount\":" + count + ",\"selectionMode\":\"" + mode + "\"}";
    }

    private static Set<Long> ids(JsonNode exam) {
        Set<Long> result = new HashSet<>();
        exam.get("questions").forEach(q -> result.add(q.get("questionId").asLong()));
        return result;
    }
}
