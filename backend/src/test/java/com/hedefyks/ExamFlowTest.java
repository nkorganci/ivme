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
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class ExamFlowTest extends TestBase {

    @Test
    void sinavSonucuDogruSaklanirVeSonradanDegisenCevapGecmisiEtkilemez() throws Exception {
        Question q1 = question("T-1", "Matematik", "A");
        Question q2 = question("T-2", "Matematik", "B");
        Question q3 = question("T-3", "Matematik", "C");
        user("ayse", Role.USER);
        user("operator", Role.OPERATOR);
        MockHttpSession session = login("ayse", "Sifre1234");

        JsonNode exam = read(send(session, post("/api/exams"),
                "{\"examType\":\"TYT\",\"subject\":\"Matematik\",\"questionCount\":10,\"timeLimitMinutes\":35}")
                .andExpect(status().isCreated()));
        long examId = exam.get("id").asLong();
        assertThat(exam.get("title").asText()).isEqualTo("TYT Matematik");
        assertThat(exam.get("questionCount").asInt()).isEqualTo(3);               // 10 istendi, 3 soru var
        assertThat(exam.get("remainingSeconds").asLong()).isBetween(2000L, 2100L);
        assertThat(exam.toString()).doesNotContain("correct");                    // sınav sırasında cevap sızmaz

        // q1 doğru (A), q2 yanlış (D), q3 boş
        send(session, put("/api/exams/" + examId + "/answers"), "{\"questionId\":" + q1.getId() + ",\"answer\":\"A\"}")
                .andExpect(status().isNoContent());
        JsonNode result = read(send(session, post("/api/exams/" + examId + "/submit"),
                "{\"answers\":{\"" + q2.getId() + "\":\"D\"}}").andExpect(status().isOk()));

        assertThat(result.get("correctCount").asInt()).isEqualTo(1);
        assertThat(result.get("wrongCount").asInt()).isEqualTo(1);
        assertThat(result.get("blankCount").asInt()).isEqualTo(1);
        assertThat(result.get("percent").decimalValue()).isEqualByComparingTo("33.33");
        assertThat(result.get("net").decimalValue()).isEqualByComparingTo("0.75");   // 1 - 1/4

        // Operatör q2'nin doğru cevabını D yapar: geçmiş sonuç DEĞİŞMEMELİ
        MockHttpSession operator = login("operator", "Sifre1234");
        send(operator, put("/api/operator/questions/" + q2.getId()),
                "{\"examType\":\"TYT\",\"subject\":\"Matematik\",\"topic\":\"Konu\",\"image\":\"TYT/turkce/TYT-0001.webp\","
                        + "\"correctAnswer\":\"D\",\"choiceCount\":5,\"active\":true}").andExpect(status().isOk());

        JsonNode again = read(send(session, get("/api/exams/" + examId + "/result"), null).andExpect(status().isOk()));
        assertThat(again.get("correctCount").asInt()).isEqualTo(1);
        assertThat(again.get("wrongCount").asInt()).isEqualTo(1);
        for (JsonNode row : again.get("questions")) {
            if (row.get("questionId").asLong() == q2.getId()) {
                assertThat(row.get("correctAnswer").asText()).isEqualTo("B");        // gönderim anındaki cevap
                assertThat(row.get("status").asText()).isEqualTo("WRONG");
            }
        }

        // İkinci gönderim aynı sonucu döner; gönderilmiş sınava cevap yazılamaz
        JsonNode second = read(send(session, post("/api/exams/" + examId + "/submit"), null).andExpect(status().isOk()));
        assertThat(second.get("percent").decimalValue()).isEqualByComparingTo("33.33");
        send(session, put("/api/exams/" + examId + "/answers"), "{\"questionId\":" + q3.getId() + ",\"answer\":\"C\"}")
                .andExpect(status().isConflict());

        // Geçmiş ve özet
        send(session, get("/api/exams"), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].correctCount").value(1));
        send(session, get("/api/exams/summary"), null).andExpect(jsonPath("$.examCount").value(1))
                .andExpect(jsonPath("$.activeExam").doesNotExist());
    }

    @Test
    void baskaKullaniciSinavaErisemez() throws Exception {
        question("T-1", "Matematik", "A");
        user("ayse", Role.USER);
        user("ali", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        long examId = read(send(ayse, post("/api/exams"), "{\"questionCount\":5}")).get("id").asLong();

        MockHttpSession ali = login("ali", "Sifre1234");
        send(ali, get("/api/exams/" + examId), null).andExpect(status().isNotFound());
        send(ali, post("/api/exams/" + examId + "/submit"), null).andExpect(status().isNotFound());
        send(ayse, get("/api/exams/summary"), null).andExpect(jsonPath("$.activeExam.id").value(examId));
    }

    @Test
    void uygunSoruYoksaHataVerir() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        send(session, post("/api/exams"), "{\"questionCount\":5}").andExpect(status().isBadRequest());
        send(session, post("/api/exams"), "{\"questionCount\":0}").andExpect(status().isBadRequest());
    }

    @Test
    void geriBildirimVeDegerlendirme() throws Exception {
        Question q = question("T-1", "Matematik", "A");
        user("ayse", Role.USER);
        user("yonetici", Role.ADMIN);
        user("operator", Role.OPERATOR);
        MockHttpSession session = login("ayse", "Sifre1234");

        send(session, post("/api/feedback"), "{\"category\":\"RATING\",\"questionId\":" + q.getId() + ",\"difficultyVote\":\"ZOR\",\"rating\":4}")
                .andExpect(status().isCreated());
        send(session, post("/api/feedback"), "{\"category\":\"RATING\",\"questionId\":" + q.getId() + ",\"difficultyVote\":\"ORTA\",\"rating\":2}")
                .andExpect(status().isCreated());                                    // güncelleme: tek kayıt kalır
        send(session, get("/api/questions/" + q.getId()), null)
                .andExpect(jsonPath("$.ratingCount").value(1)).andExpect(jsonPath("$.avgRating").value(2.0))
                .andExpect(jsonPath("$.difficultyVotes.ORTA").value(1)).andExpect(jsonPath("$.difficultyVotes.ZOR").value(0))
                .andExpect(jsonPath("$.myEvaluation.difficultyVote").value("ORTA"));

        send(session, post("/api/feedback"), "{\"category\":\"QUESTION_ISSUE\",\"questionId\":" + q.getId() + ",\"message\":\"yok\"}")
                .andExpect(status().isBadRequest());
        send(session, post("/api/feedback"), "{\"category\":\"QUESTION_ISSUE\",\"questionId\":" + q.getId() + ",\"message\":\"Cevap anahtarı yanlış\"}")
                .andExpect(status().isCreated());

        MockHttpSession admin = login("yonetici", "Sifre1234");
        send(admin, get("/api/admin/stats"), null).andExpect(jsonPath("$.userCount").value(1))
                .andExpect(jsonPath("$.reportedQuestionCount").doesNotExist());
        send(admin, get("/api/operator/feedback"), null).andExpect(status().isForbidden());
        MockHttpSession operator = login("operator", "Sifre1234");
        JsonNode list = read(send(operator, get("/api/operator/feedback?category=QUESTION_ISSUE&resolved=false"), null).andExpect(status().isOk()));
        long feedbackId = list.get("content").get(0).get("id").asLong();
        send(operator, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/operator/feedback/" + feedbackId), "{\"resolved\":true}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.resolved").value(true));
        send(operator, get("/api/operator/feedback?category=QUESTION_ISSUE&resolved=false"), null)
                .andExpect(jsonPath("$.totalElements").value(0));
    }
}
