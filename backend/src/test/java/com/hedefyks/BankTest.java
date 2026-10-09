package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.QuestionImportService;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.user.Role;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;

class BankTest extends TestBase {

    private static final String IMG = "TYT/turkce/TYT-0001.webp";

    @Autowired QuestionImportService importer;

    private Question ogm(String code, String subject, boolean withSolution) {
        Question q = question(code, subject, "B");
        q.setBank(QuestionBank.OGM);
        q.setSource("OGM Soru Bankası · 10. sınıf");
        q.setSolutionImage(withSolution ? IMG : null);
        return questions.save(q);
    }

    @Test
    void koleksiyonlar_ayri_listelenir_ve_filtrelenir() throws Exception {
        question("C-1", "Matematik", "A");
        ogm("O-1", "Fizik", false);
        ogm("O-2", "Fizik", false);
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");

        JsonNode ogmFilters = read(send(session, get("/api/questions/filters?bank=OGM"), null).andExpect(status().isOk()));
        assertThat(ogmFilters).hasSize(1);
        assertThat(ogmFilters.get(0).get("subject").asText()).isEqualTo("Fizik");
        assertThat(ogmFilters.get(0).get("count").asInt()).isEqualTo(2);
        assertThat(read(send(session, get("/api/questions/filters?bank=CIKMIS"), null))).hasSize(1);
        assertThat(read(send(session, get("/api/questions/filters"), null))).hasSize(2);       // bank yoksa hepsi

        send(session, get("/api/questions?bank=OGM"), null).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].bank").value("OGM"))
                .andExpect(jsonPath("$.content[0].source").value("OGM Soru Bankası · 10. sınıf"));
        send(session, get("/api/questions?bank=CIKMIS"), null).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void cozum_gorseli_yalnizca_olan_sorularda_sunulur() throws Exception {
        Question with = ogm("O-1", "Fizik", true);
        Question without = ogm("O-2", "Fizik", false);
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");

        send(session, get("/api/questions/" + with.getId()), null).andExpect(jsonPath("$.hasSolutionImage").value(true))
                .andExpect(jsonPath("$.bank").value("OGM"));
        send(session, get("/api/questions/" + without.getId()), null).andExpect(jsonPath("$.hasSolutionImage").value(false));
        send(session, get("/api/questions/" + with.getId() + "/solution-image"), null).andExpect(status().isNotFound());
        send(session, post("/api/questions/" + with.getId() + "/practice"),
                "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"REVEAL\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.correctAnswer").value("B"));
        send(session, get("/api/questions/" + with.getId() + "/solution-image"), null).andExpect(status().isOk());
        send(session, get("/api/questions/" + without.getId() + "/solution-image"), null).andExpect(status().isNotFound());
    }

    @Test
    void komsu_soru_ayni_koleksiyonda_kalir() throws Exception {
        Question c1 = question("C-1", "Matematik", "A");
        ogm("O-1", "Matematik", false);
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        send(session, get("/api/questions/" + c1.getId() + "/neighbor?direction=next&bank=CIKMIS"), null)
                .andExpect(status().isNoContent());                       // sıradaki soru başka koleksiyonda
        send(session, get("/api/questions/" + c1.getId() + "/neighbor?direction=next"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("O-1"));
    }

    @Test
    void sinav_secilen_koleksiyondan_kurulur() throws Exception {
        question("C-1", "Matematik", "A");
        ogm("O-1", "Matematik", false);
        ogm("O-2", "Matematik", false);
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");

        JsonNode exam = read(send(session, post("/api/exams"), "{\"bank\":\"OGM\",\"questionCount\":10}").andExpect(status().isCreated()));
        assertThat(exam.get("questionCount").asInt()).isEqualTo(2);
        assertThat(exam.get("title").asText()).endsWith("Soru Bankası");
        for (JsonNode qn : exam.get("questions")) {
            assertThat(qn.get("code").asText()).startsWith("O-");
        }
        JsonNode all = read(send(session, post("/api/exams"), "{\"questionCount\":10}").andExpect(status().isCreated()));
        assertThat(all.get("questionCount").asInt()).isEqualTo(3);
    }

    @Test
    void iceaktarici_bank_ve_cozum_gorseli_sutunlarini_isler() {
        String csv = "code,exam_type,subject,image,correct_answer,bank,solution_image,source\n"
                + "X-1,TYT,Fizik," + IMG + ",C,OGM," + IMG + ",OGM Soru Bankası\n"
                + "X-2,TYT,Fizik," + IMG + ",D,,,\n";
        var r = importer.run(csv.getBytes(StandardCharsets.UTF_8), "s.csv", ImportMode.INSERT_ONLY, false);
        assertThat(r.errorCount()).isZero();
        assertThat(r.inserted()).isEqualTo(2);
        Question x1 = questions.findByCode("X-1").orElseThrow();
        assertThat(x1.getBank()).isEqualTo(QuestionBank.OGM);
        assertThat(x1.getSolutionImage()).isEqualTo(IMG);
        assertThat(questions.findByCode("X-2").orElseThrow().getBank()).isEqualTo(QuestionBank.CIKMIS);   // varsayılan

        var bad = importer.run("code,exam_type,subject,image,correct_answer,bank\nX-3,TYT,Fizik,a.webp,A,YOK\n".getBytes(StandardCharsets.UTF_8),
                "s.csv", ImportMode.INSERT_ONLY, true);
        assertThat(bad.errors()).anyMatch(e -> "bank".equals(e.field()));
    }
}
