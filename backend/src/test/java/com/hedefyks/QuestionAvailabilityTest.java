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
    void submittedExamHistoryUsesStoredResultsAndExcludesBlanksAndOpenExams() throws Exception {
        var owner = user("exam_history", Role.USER);
        var session = login("exam_history", "Sifre1234");
        for (String subject : java.util.List.of("Correct", "Wrong", "Blank", "Open")) {
            var q = question("H-" + subject, subject, "A");
            var exam = read(send(session, post("/api/exams"), json.createObjectNode()
                    .put("subject", subject).put("questionCount", 1).toString()).andExpect(status().isCreated()));
            if (subject.equals("Open")) {
                jdbc.update("UPDATE exam_questions SET selected_answer='A',is_correct=true WHERE exam_id=?", exam.path("id").asLong());
                continue;
            }
            var answers = json.createObjectNode();
            if (!subject.equals("Blank")) answers.put(q.getId().toString(), subject.equals("Correct") ? "A" : "B");
            send(session, post("/api/exams/" + exam.path("id").asLong() + "/submit"),
                    json.createObjectNode().set("answers", answers).toString()).andExpect(status().isOk());
            q.setCorrectAnswer("B");
            questions.saveAndFlush(q);
        }
        for (String history : java.util.List.of("CORRECT", "WRONG")) {
            send(session, get("/api/questions/availability").param("history", history), null)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        }
        send(session, get("/api/questions/availability").param("history", "CORRECT", "WRONG"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2));
        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject("SELECT count(*) FROM exams WHERE user_id=? AND status='SUBMITTED'", Integer.class, owner.getId())).isEqualTo(3);
    }

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
                .andExpect(jsonPath("$.solved").value(0)).andExpect(jsonPath("$.remaining").value(2))
                .andExpect(jsonPath("$.correct").value(0));
        String path = "/api/questions/" + first.getId() + "/practice";
        send(ayse, post(path), event("ANSWER", "A")).andExpect(status().isOk());
        send(ayse, post(path), event("ANSWER", "B")).andExpect(status().isOk());
        send(ayse, get("/api/questions/availability?subject=Türkçe"), null)
                .andExpect(jsonPath("$.solved").value(1)).andExpect(jsonPath("$.remaining").value(1))
                .andExpect(jsonPath("$.everWrong").value(1)).andExpect(jsonPath("$.correct").value(0));
        send(ayse, get("/api/questions/availability").param("history", "CORRECT"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        send(ayse, get("/api/questions/availability?bank=CIKMIS&topic=Paragraf"), null)
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.solved").value(1));
        send(ayse, get("/api/questions/availability?bank=OGM"), null)
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.solved").value(0));
        JsonNode exam = read(send(ayse, post("/api/exams"),
                "{\"bank\":\"OGM\",\"questionCount\":1}").andExpect(status().isCreated()));
        Long examId = exam.get("id").asLong();
        send(ayse, get("/api/questions/availability?bank=OGM"), null)
                .andExpect(jsonPath("$.solved").value(0)).andExpect(jsonPath("$.correct").value(0));
        send(ayse, get("/api/questions/availability?bank=OGM&history=CORRECT"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        send(ayse, post("/api/exams/" + examId + "/submit"),
                "{\"answers\":{\"" + second.getId() + "\":\"A\"}}")
                .andExpect(status().isOk());
        send(ayse, get("/api/questions/availability?subject=Türkçe"), null)
                .andExpect(jsonPath("$.solved").value(2)).andExpect(jsonPath("$.remaining").value(0))
                .andExpect(jsonPath("$.everWrong").value(1)).andExpect(jsonPath("$.correct").value(1));
        send(ayse, get("/api/questions/availability").param("history", "CORRECT", "WRONG"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2));
        var repeated = read(send(ayse, post("/api/study-sessions"), json.createObjectNode()
                .put("bank", "OGM").put("questionCount", 1).put("clientRequestId", UUID.randomUUID().toString())
                .set("history", json.createArrayNode().add("CORRECT")).toString()).andExpect(status().isCreated()));
        org.assertj.core.api.Assertions.assertThat(repeated.at("/questions/0/questionId").asLong()).isEqualTo(second.getId());
        send(ayse, post("/api/questions/" + second.getId() + "/practice"), event("ANSWER", "B"))
                .andExpect(status().isOk());
        send(ayse, get("/api/questions/availability?bank=OGM&examType=TYT"), null)
                .andExpect(jsonPath("$.solved").value(1)).andExpect(jsonPath("$.correct").value(1))
                .andExpect(jsonPath("$.remaining").value(0));
        send(mehmet, get("/api/questions/availability"), null)
                .andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.solved").value(0))
                .andExpect(jsonPath("$.everWrong").value(0)).andExpect(jsonPath("$.correct").value(0));
        send(mehmet, get("/api/questions/availability").param("history", "CORRECT", "WRONG"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    private static String event(String type, String answer) {
        return "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"" + type
                + "\",\"answer\":\"" + answer + "\",\"activeSeconds\":1}";
    }
}
