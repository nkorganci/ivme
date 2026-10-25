package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

/** Öğretim döngüsü: kademeli açılım, sızıntı koruması, beceri kaydı, öğretmen kararı ve veri hakları. */
class TutorFlowTest extends TestBase {
    private static final Path FIXTURE = Path.of("../ornek-veri/ogretim-pilotu/matematik/TYT-0780.json");
    private Question q;
    private long contentId;

    @BeforeEach
    void publish() throws Exception {
        q = question("TUT-0780", "Matematik", "A");
        contentId = insertContent(q, "AUTO_VERIFIED");
    }

    private long insertContent(Question question, String state) throws Exception {
        ObjectNode content = (ObjectNode) json.readTree(Files.readString(FIXTURE));
        ((ObjectNode) content.path("question")).put("code", question.getCode());
        content.put("contentKey", "tutor:" + question.getCode());
        String verification = "{\"checks\":[{\"path\":\"solution.steps[0].check\",\"passed\":true}],\"issues\":[]}";
        Long id = jdbc.queryForObject("""
                INSERT INTO tutor_contents(question_id, question_code, version_no, schema_version, content, content_sha256,
                    image_sha256, answer_key, subject_id, category_id, pattern_key, verification, confidence,
                    confidence_band, review_flag, review_reasons, status, generator, generation_tier, prompt_version)
                VALUES (?, ?, coalesce((SELECT max(version_no) FROM tutor_contents WHERE question_id = ?), 0) + 1, 1,
                    ?::jsonb, md5(random()::text) || md5(random()::text), repeat('d', 64), 'A', 'matematik',
                    'tyt.matematik.olasilik', 'matematik.olasilik.sirasiz-secim', ?::jsonb, 0.98, 'HIGH', false,
                    '[]'::jsonb, ?, 'test', 'STRONG', 'test') RETURNING id""",
                Long.class, question.getId(), question.getCode(), question.getId(), content.toString(), verification, state);
        return id;
    }

    private JsonNode act(MockHttpSession session, long id, String body) throws Exception {
        return read(send(session, post("/api/tutor/sessions/" + id + "/actions"), body).andExpect(status().isOk()));
    }

    private static List<String> kinds(JsonNode view) {
        List<String> kinds = new ArrayList<>();
        view.path("cards").forEach(card -> kinds.add(card.path("kind").asText()));
        return kinds;
    }

    @Test
    void ogrenci_ipucunu_tek_tek_alir_cevap_ve_cozum_hak_edilmeden_gonderilmez() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");

        var startResult = send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}").andExpect(status().isOk());
        String raw = startResult.andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(raw);
        long id = view.path("sessionId").asLong();
        assertThat(view.at("/nextStep/type").asText()).isEqualTo("PREVIEW");
        assertThat(raw).doesNotContain("answerKey", "231/300", "(d/25)", "68/95", "\"correct\":true", "%77");
        assertThat(view.at("/available/answer").asBoolean()).isTrue();
        assertThat(view.at("/available/hintsLeft").asInt()).isEqualTo(3);
        assertThat(view.path("prompts").get(0).path("options").get(0).has("correct")).isFalse();

        view = act(ayse, id, "{\"type\":\"PREVIEW\"}");
        assertThat(kinds(view)).containsExactly("PATTERN");
        // Kavrayış katmanı: benzetme, zihniyet ve radar çözümden önce; aha ve sağlama çözülmeden gönderilmez.
        assertThat(view.at("/cards/0/insight/analogy/title").asText()).isEqualTo("Torbadaki ikili biletler");
        assertThat(view.at("/cards/0/insight/radar").size()).isEqualTo(3);
        assertThat(view.at("/cards/0/insight/targetSeconds").asInt()).isEqualTo(60);
        assertThat(json.writeValueAsString(view)).doesNotContain("\"aha\"", "sanityCheck", "300 biletin 3'ü");
        assertThat(view.at("/nextStep/type").asText()).isEqualTo("STRATEGY");

        view = act(ayse, id, "{\"type\":\"STRATEGY\",\"optionId\":\"gruplari-say\"}");
        assertThat(view.at("/cards/1/correct").asBoolean()).isTrue();
        send(ayse, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"STRATEGY\",\"optionId\":\"kare-al\"}")
                .andExpect(status().isConflict());

        view = act(ayse, id, "{\"type\":\"HINT\"}");
        assertThat(view.at("/cards/2/kind").asText()).isEqualTo("HINT");
        assertThat(view.at("/cards/2/level").asInt()).isEqualTo(1);
        assertThat(view.at("/available/hintsLeft").asInt()).isEqualTo(2);
        String afterHint = json.writeValueAsString(view);
        assertThat(afterHint).doesNotContain("iki defolu halıdan oluşan ikililerin sayısını söyler", "C(d, 2) = d(d − 1)/2 olur");

        view = act(ayse, id, "{\"type\":\"ANSWER\",\"choice\":\"B\"}");
        assertThat(view.at("/cards/3/correct").asBoolean()).isFalse();
        assertThat(view.at("/cards/3/guidingQuestion").asText()).isNotBlank();
        assertThat(view.path("wrongChoices").toString()).contains("B");
        assertThat(json.writeValueAsString(view)).doesNotContain("\"FINAL\"", "231");
        send(ayse, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"ANSWER\",\"choice\":\"B\"}")
                .andExpect(status().isConflict());
        send(ayse, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"LEVEL\",\"level\":\"SEZGI\"}")
                .andExpect(status().isConflict());
        send(ayse, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"TWIN_ANSWER\",\"choice\":\"A\"}")
                .andExpect(status().isConflict());

        view = act(ayse, id, "{\"type\":\"ANSWER\",\"choice\":\"A\"}");
        assertThat(kinds(view)).contains("FINAL").doesNotContain("VISUAL", "TWIN");
        JsonNode finalCard = view.path("cards").get(kinds(view).indexOf("FINAL"));
        assertThat(finalCard.path("aha").asText()).startsWith("Aaa").contains("300 biletin 3'ü");
        assertThat(finalCard.path("sanityCheck").asText()).isNotBlank();
        assertThat(view.at("/nextStep/type").asText()).isEqualTo("EXPLAIN");
        JsonNode prompt = view.path("prompts").get(0);
        assertThat(prompt.path("kind").asText()).isEqualTo("EXPLAIN");
        assertThat(prompt.path("options").get(0).has("correct")).isFalse();
        assertThat(json.writeValueAsString(view.path("cards"))).doesNotContain("136/190", "\"answer\":");

        view = act(ayse, id, "{\"type\":\"EXPLAIN\",\"stepId\":\"s1\",\"optionId\":\"sira-onemsiz\"}");
        assertThat(view.at("/nextStep/type").asText()).isEqualTo("VISUAL");
        assertThat(kinds(view)).contains("VISUAL").doesNotContain("TWIN");
        view = act(ayse, id, "{\"type\":\"PREDICT\",\"optionId\":\"fazla\"}");
        assertThat(view.at("/nextStep/type").asText()).isEqualTo("TWIN");
        assertThat(kinds(view)).containsSubsequence("FINAL", "STEP", "VISUAL", "TWIN");
        view = act(ayse, id, "{\"type\":\"LEVEL\",\"level\":\"SEZGI\"}");
        assertThat(kinds(view)).contains("LEVEL");
        view = act(ayse, id, "{\"type\":\"TWIN_ANSWER\",\"choice\":\"A\"}");
        assertThat(kinds(view)).contains("TWIN_RESULT");
        assertThat(view.at("/nextStep/type").asText()).isEqualTo("DONE");

        view = act(ayse, id, "{\"type\":\"FINISH\"}");
        assertThat(view.path("status").asText()).isEqualTo("DONE");
        assertThat(view.at("/summary/outcome").asText()).isEqualTo("ASSISTED");
        assertThat(view.at("/summary/masteryAfter").asDouble()).isGreaterThan(view.at("/summary/masteryBefore").asDouble());
        assertThat(kinds(view)).contains("SUMMARY");
        send(ayse, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"HINT\"}").andExpect(status().isConflict());

        JsonNode skills = read(send(ayse, get("/api/tutor/skills"), null).andExpect(status().isOk()));
        assertThat(skills).hasSize(1);
        assertThat(skills.get(0).path("skillKey").asText()).isEqualTo("matematik.olasilik.sirasiz-secim");
        assertThat(skills.get(0).path("transferCorrect").asInt()).isEqualTo(1);
        assertThat(skills.get(0).path("nextReviewAt").asText()).isNotBlank();
        JsonNode catalog = read(send(ayse, get("/api/tutor/catalog"), null).andExpect(status().isOk()));
        assertThat(catalog.at("/items/0/code").asText()).isEqualTo("TUT-0780");
        assertThat(catalog.at("/items/0/mastery").asDouble()).isGreaterThan(0.2);
        assertThat(catalog.toString()).doesNotContain("answerKey", "solution");
    }

    @Test
    void cozumu_isteyen_ogrenci_cozum_gordu_sayilir_ve_cevap_kapanir() throws Exception {
        user("ali", Role.USER);
        MockHttpSession ali = login("ali", "Sifre1234");
        long id = read(send(ali, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}")).path("sessionId").asLong();
        JsonNode view = act(ali, id, "{\"type\":\"SOLUTION\"}");
        assertThat(kinds(view)).contains("STEP", "FINAL", "ALTERNATIVE");
        assertThat(view.at("/available/answer").asBoolean()).isFalse();
        send(ali, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"ANSWER\",\"choice\":\"A\"}")
                .andExpect(status().isConflict());
        view = act(ali, id, "{\"type\":\"FINISH\"}");
        assertThat(view.at("/summary/outcome").asText()).isEqualTo("SOLUTION_VIEWED");
        assertThat(view.at("/summary/masteryAfter").asDouble()).isLessThan(0.2);
    }

    @Test
    void ayni_soruda_acik_oturum_surdurulur_baska_ogrenci_erisemez() throws Exception {
        user("ayse", Role.USER);
        user("ali", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession ali = login("ali", "Sifre1234");
        long first = read(send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}")).path("sessionId").asLong();
        act(ayse, first, "{\"type\":\"HINT\"}");
        long again = read(send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}")).path("sessionId").asLong();
        assertThat(again).isEqualTo(first);
        send(ali, get("/api/tutor/sessions/" + first), null).andExpect(status().isNotFound());
        send(ali, post("/api/tutor/sessions/" + first + "/actions"), "{\"type\":\"HINT\"}").andExpect(status().isNotFound());
    }

    @Test
    void incelemedeki_icerik_ve_degisen_anahtar_ogrenciye_acilmaz_sinavda_kapali() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        jdbc.update("UPDATE tutor_contents SET status = 'NEEDS_REVIEW' WHERE id = ?", contentId);
        send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}").andExpect(status().isNotFound());
        assertThat(read(send(ayse, get("/api/tutor/catalog"), null)).path("items")).isEmpty();

        jdbc.update("UPDATE tutor_contents SET status = 'AUTO_VERIFIED' WHERE id = ?", contentId);
        jdbc.update("UPDATE questions SET correct_answer = 'B' WHERE id = ?", q.getId());
        send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}").andExpect(status().isConflict());
        jdbc.update("UPDATE questions SET correct_answer = 'A' WHERE id = ?", q.getId());

        send(ayse, post("/api/exams"), "{\"questionCount\":1}").andExpect(status().is2xxSuccessful());
        send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}").andExpect(status().isNotFound());
    }

    @Test
    void ogretmen_onaylar_reddeder_yeniden_uretim_ister_ve_kalibrasyonu_gorur() throws Exception {
        user("ogretmen", Role.OPERATOR);
        user("ayse", Role.USER);
        MockHttpSession teacher = login("ogretmen", "Sifre1234");
        MockHttpSession ayse = login("ayse", "Sifre1234");

        send(ayse, get("/api/operator/tutor/contents"), null).andExpect(status().isForbidden());
        send(teacher, get("/api/tutor/catalog"), null).andExpect(status().isForbidden());

        JsonNode rows = read(send(teacher, get("/api/operator/tutor/contents?subjectId=matematik"), null).andExpect(status().isOk()));
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).path("visibleToStudents").asBoolean()).isTrue();
        JsonNode detail = read(send(teacher, get("/api/operator/tutor/contents/TUT-0780"), null).andExpect(status().isOk()));
        assertThat(detail.at("/question/answerKey").asText()).isEqualTo("A");
        assertThat(detail.at("/versions/0/content/solution/steps").size()).isEqualTo(4);

        String leaky = "{\"decision\":\"APPROVE\",\"rubric\":{\"accuracy\":5,\"hints\":4,\"terminology\":5,\"teaching\":4,\"visual\":4,\"noLeak\":false},\"note\":\"\"}";
        send(teacher, post("/api/operator/tutor/versions/" + contentId + "/review"), leaky).andExpect(status().isBadRequest());
        String approve = "{\"decision\":\"APPROVE\",\"rubric\":{\"accuracy\":5,\"hints\":4,\"terminology\":5,\"teaching\":4,\"visual\":4,\"noLeak\":true},\"note\":\"Uygun.\"}";
        detail = read(send(teacher, post("/api/operator/tutor/versions/" + contentId + "/review"), approve).andExpect(status().isOk()));
        assertThat(detail.at("/versions/0/status").asText()).isEqualTo("APPROVED");
        assertThat(detail.at("/versions/0/reviews/0/rubric/accuracy").asInt()).isEqualTo(5);

        long second = insertContent(q, "AUTO_VERIFIED");
        JsonNode view = read(send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}"));
        assertThat(view.at("/content/id").asLong()).isEqualTo(contentId);
        assertThat(view.at("/content/status").asText()).isEqualTo("APPROVED");

        send(teacher, post("/api/operator/tutor/versions/" + second + "/review"),
                "{\"decision\":\"REQUEST_REGENERATION\",\"rubric\":{\"accuracy\":3,\"hints\":3,\"terminology\":4,\"teaching\":3,\"visual\":0,\"noLeak\":true},\"note\":\"x\"}")
                .andExpect(status().isBadRequest());
        detail = read(send(teacher, post("/api/operator/tutor/versions/" + second + "/review"),
                "{\"decision\":\"REQUEST_REGENERATION\",\"rubric\":{\"accuracy\":3,\"hints\":3,\"terminology\":4,\"teaching\":3,\"visual\":0,\"noLeak\":true},\"note\":\"İkinci ipucu çok açık veriyor.\"}")
                .andExpect(status().isOk()));
        assertThat(detail.at("/regeneration/0/status").asText()).isEqualTo("OPEN");
        assertThat(jdbc.queryForObject("SELECT status FROM tutor_contents WHERE id = ?", String.class, second)).isEqualTo("NEEDS_REVIEW");

        JsonNode calibration = read(send(teacher, get("/api/operator/tutor/calibration"), null).andExpect(status().isOk()));
        assertThat(calibration.at("/bands/0/band").asText()).isEqualTo("HIGH");
        assertThat(calibration.at("/bands/0/reviewed").asInt()).isEqualTo(2);
        assertThat(calibration.at("/bands/0/approved").asInt()).isEqualTo(1);
        assertThat(read(send(teacher, get("/api/operator/tutor/queue"), null)).path("regeneration")).hasSize(1);
    }

    @Test
    void model_kapaliyken_serbest_aciklama_ogretmene_gider_ve_ogretmen_etiketler() throws Exception {
        user("ayse", Role.USER);
        user("ogretmen", Role.OPERATOR);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession teacher = login("ogretmen", "Sifre1234");
        long id = read(send(ayse, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}")).path("sessionId").asLong();
        send(ayse, post("/api/tutor/sessions/" + id + "/actions"), "{\"type\":\"FREE_TEXT\",\"stepId\":\"s1\",\"text\":\"Sıra önemsiz\"}")
                .andExpect(status().isConflict());
        act(ayse, id, "{\"type\":\"STEP\"}");
        JsonNode view = act(ayse, id, "{\"type\":\"FREE_TEXT\",\"stepId\":\"s1\",\"text\":\"Aynı iki halı iki kez sayılmasın diye ikiye böldüm.\"}");
        JsonNode step = null;
        for (JsonNode card : view.path("cards")) if ("STEP".equals(card.path("kind").asText())) step = card;
        assertThat(step).isNotNull();
        assertThat(step.at("/freeTexts/0/routedTo").asText()).isEqualTo("TEACHER");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_model_calls WHERE tier = 'RULES' AND status = 'FALLBACK'", Integer.class)).isEqualTo(1);

        JsonNode queue = read(send(teacher, get("/api/operator/tutor/queue"), null).andExpect(status().isOk()));
        assertThat(queue.path("explanations")).hasSize(1);
        assertThat(queue.at("/explanations/0/stepText").asText()).contains("C(25, 2)");
        long itemId = queue.at("/explanations/0/id").asLong();
        send(teacher, post("/api/operator/tutor/queue/" + itemId), "{\"label\":\"GUZEL\"}").andExpect(status().isBadRequest());
        queue = read(send(teacher, post("/api/operator/tutor/queue/" + itemId), "{\"label\":\"CORRECT\",\"note\":\"Doğru gerekçe.\"}")
                .andExpect(status().isOk()));
        assertThat(queue.path("explanations")).isEmpty();
    }

    @Test
    void hesap_disa_aktarma_ve_silme_ogretim_verisini_kapsar() throws Exception {
        var ayse = user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        long id = read(send(session, post("/api/tutor/sessions"), "{\"code\":\"TUT-0780\"}")).path("sessionId").asLong();
        act(session, id, "{\"type\":\"SOLUTION\"}");
        act(session, id, "{\"type\":\"FINISH\"}");
        JsonNode export = read(send(session, post("/api/account/export"), "{\"currentPassword\":\"Sifre1234\"}").andExpect(status().isOk()));
        assertThat(export.path("tutorSessions")).hasSize(1);
        assertThat(export.path("tutorEvents").size()).isGreaterThanOrEqualTo(3);
        assertThat(export.path("tutorSkills")).hasSize(1);
        send(session, post("/api/account/delete"), "{\"currentPassword\":\"Sifre1234\",\"confirmation\":\"HESABIMI SIL\"}")
                .andExpect(status().is2xxSuccessful());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_sessions WHERE user_id = ?", Integer.class, ayse.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_skill_states WHERE user_id = ?", Integer.class, ayse.getId())).isZero();
    }
}
