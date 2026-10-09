package com.hedefyks;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class QuestionAvailabilityTest extends TestBase {
    @Test
    void toplam_cozulen_kalan_ve_yanlis_sahibe_ozel_sayilir() throws Exception {
        Question first = question("A-1", "Türkçe", "B");
        first.setTopic("Paragraf");
        questions.saveAndFlush(first);
        Question second = question("A-2", "Türkçe", "A");
        second.setTopic("Dil bilgisi");
        second.setBank(QuestionBank.OGM);
        questions.saveAndFlush(second);
        Question hidden = question("A-3", "Türkçe", "C");
        hidden.setActive(false);
        questions.saveAndFlush(hidden);
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");

        send(ayse, get("/api/questions/availability?subject=Türkçe"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.solved").value(0)).andExpect(jsonPath("$.remaining").value(2));
        String path = "/api/questions/" + first.getId() + "/practice";
        send(ayse, post(path), event("ANSWER", "A")).andExpect(status().isOk());
        send(ayse, post(path), event("ANSWER", "B")).andExpect(status().isOk());
        send(ayse, get("/api/questions/availability?subject=Türkçe"), null)
                .andExpect(jsonPath("$.solved").value(1)).andExpect(jsonPath("$.remaining").value(1))
                .andExpect(jsonPath("$.everWrong").value(1));
        send(ayse, get("/api/questions/availability?bank=CIKMIS&topic=Paragraf"), null)
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.solved").value(1));
        send(ayse, get("/api/questions/availability?bank=OGM"), null)
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.solved").value(0));
        JsonNode exam = read(send(ayse, post("/api/exams"),
                "{\"bank\":\"OGM\",\"questionCount\":1}").andExpect(status().isCreated()));
        Long examId = exam.get("id").asLong();
        send(ayse, post("/api/exams/" + examId + "/submit"),
                "{\"answers\":{\"" + second.getId() + "\":\"A\"}}")
                .andExpect(status().isOk());
        send(ayse, get("/api/questions/availability?subject=Türkçe"), null)
                .andExpect(jsonPath("$.solved").value(2)).andExpect(jsonPath("$.remaining").value(0))
                .andExpect(jsonPath("$.everWrong").value(1));
        send(mehmet, get("/api/questions/availability"), null)
                .andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.solved").value(0))
                .andExpect(jsonPath("$.everWrong").value(0));
    }

    private static String event(String type, String answer) {
        return "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"" + type
                + "\",\"answer\":\"" + answer + "\",\"activeSeconds\":1}";
    }
}
