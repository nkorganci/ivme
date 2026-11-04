package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

/** TAS-06: kişisel zorluk etiketi ve tekrar tercihi yalnız o öğrenciye aittir; otomatik seçimi etkiler, geçmişi değiştirmez. */
class QuestionPreferenceTest extends TestBase {
    private static final String PREF = "/api/question-preferences";

    private String path(Question q) { return PREF + "/questions/" + q.getId(); }

    private JsonNode change(MockHttpSession who, Question q, String body) throws Exception {
        return read(send(who, put(path(q)), body).andExpect(status().isOk()));
    }

    private JsonNode summary(MockHttpSession who) throws Exception {
        return read(send(who, get(PREF + "/summary"), null).andExpect(status().isOk()));
    }

    private int rows(String where, Object... args) {
        return jdbc.queryForObject("SELECT count(*) FROM feedback WHERE category='RATING' AND " + where, Integer.class, args);
    }

    private long session(MockHttpSession who, int count, String extra) throws Exception {
        String body = "{\"subject\":\"Türkçe\",\"questionCount\":" + count + ",\"clientRequestId\":\"" + UUID.randomUUID() + "\"" + extra + "}";
        return read(send(who, post("/api/study-sessions"), body).andExpect(status().isCreated())).path("id").asLong();
    }

    private List<String> codes(MockHttpSession who, long sessionId) throws Exception {
        return read(send(who, get("/api/study-sessions/" + sessionId), null)).path("questions").findValuesAsText("code");
    }

    @Test
    void kisiselZorlukEtiketiTekKayittaSaklanirTemizlenirVeBaskasiGormez() throws Exception {
        Question q = question("P-1", "Türkçe", "A");
        var ayse = user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession a = login("ayse", "Sifre1234");
        MockHttpSession m = login("mehmet", "Sifre1234");

        assertThat(change(a, q, "{\"difficulty\":\"ZOR\"}").path("difficulty").asText()).isEqualTo("ZOR");
        assertThat(change(a, q, "{\"difficulty\":\"ORTA\"}").path("difficulty").asText()).isEqualTo("ORTA");
        assertThat(rows("user_id=? AND question_id=?", ayse.getId(), q.getId())).isEqualTo(1);
        // Başka öğrenci kendi etiketini ayrı kaydeder; ilkini göremez ve değiştiremez.
        assertThat(read(send(m, get(path(q)), null)).path("difficulty").isNull()).isTrue();
        assertThat(read(send(m, get("/api/questions/code/P-1"), null)).path("myEvaluation").isNull()).isTrue();
        change(m, q, "{\"difficulty\":\"KOLAY\"}");
        assertThat(read(send(a, get("/api/questions/code/P-1"), null)).path("myEvaluation").path("difficultyVote").asText()).isEqualTo("ORTA");
        assertThat(rows("question_id=?", q.getId())).isEqualTo(2);

        // Yıldız puanı etiketten bağımsızdır: etiket silinince yıldız kalır, yıldız gönderilince etiket silinmez.
        send(a, post("/api/feedback"), "{\"category\":\"RATING\",\"questionId\":" + q.getId() + ",\"rating\":4}").andExpect(status().isCreated());
        assertThat(change(a, q, "{\"difficulty\":\"NONE\"}").path("difficulty").isNull()).isTrue();
        assertThat(rows("user_id=? AND question_id=? AND rating=4 AND difficulty_vote IS NULL", ayse.getId(), q.getId())).isEqualTo(1);
        change(a, q, "{\"difficulty\":\"ZOR\"}");
        send(a, post("/api/feedback"), "{\"category\":\"RATING\",\"questionId\":" + q.getId() + ",\"rating\":5}").andExpect(status().isCreated());
        assertThat(rows("user_id=? AND question_id=? AND rating=5 AND difficulty_vote='ZOR'", ayse.getId(), q.getId())).isEqualTo(1);
        assertThat(rows("user_id=? AND question_id=?", ayse.getId(), q.getId())).isEqualTo(1);

        // Yıldızsız etiket temizlenince boş değerlendirme satırı kalmaz.
        Question lone = question("P-2", "Türkçe", "B");
        change(a, lone, "{\"difficulty\":\"KOLAY\"}");
        change(a, lone, "{\"difficulty\":\"NONE\"}");
        assertThat(rows("question_id=?", lone.getId())).isZero();

        send(a, put(path(q)), "{\"difficulty\":\"ÇOK ZOR\"}").andExpect(status().isBadRequest());
        send(a, put(path(q)), "{\"repeat\":\"SIL\"}").andExpect(status().isBadRequest());
        send(a, put(path(q)), "{}").andExpect(status().isBadRequest());
        send(a, put(PREF + "/questions/999999"), "{\"difficulty\":\"ZOR\"}").andExpect(status().isNotFound());
        jdbc.update("UPDATE questions SET active=false WHERE id=?", lone.getId());
        send(a, put(path(lone)), "{\"difficulty\":\"ZOR\"}").andExpect(status().isNotFound());
        send(a, put(path(lone)), "{\"difficulty\":\"NONE\",\"repeat\":\"DEFAULT\"}").andExpect(status().isOk());
        mvc.perform(put(path(q)).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())
                .contentType("application/json").content("{\"difficulty\":\"ZOR\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void ayniAndaGelenIkiYazmaTekSatirBirakirHataVermez() throws Exception {
        Question q = question("P-3", "Türkçe", "A");
        var ayse = user("ayse", Role.USER);
        MockHttpSession first = login("ayse", "Sifre1234");
        MockHttpSession second = login("ayse", "Sifre1234");
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        String[] values = {"KOLAY", "ORTA", "ZOR", "ORTA", "ZOR", "KOLAY", "ZOR", "ORTA"};
        for (int i = 0; i < values.length; i++) {
            final int n = i;
            results.add(pool.submit(() -> {
                start.await();
                var who = n % 2 == 0 ? first : second;
                int a = send(who, put(path(q)), "{\"difficulty\":\"" + values[n] + "\",\"repeat\":\"" + (n % 2 == 0 ? "AGAIN" : "HIDE") + "\"}").andReturn().getResponse().getStatus();
                int b = send(who, post("/api/feedback"), "{\"category\":\"RATING\",\"questionId\":" + q.getId() + ",\"rating\":" + (1 + n % 5) + "}").andReturn().getResponse().getStatus();
                return a * 1000 + b;
            }));
        }
        start.countDown();
        for (Future<Integer> result : results) assertThat(result.get()).isEqualTo(200 * 1000 + 201);
        pool.shutdown();
        assertThat(rows("user_id=? AND question_id=?", ayse.getId(), q.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM student_question_preferences WHERE user_id=? AND question_id=?", Integer.class, ayse.getId(), q.getId())).isEqualTo(1);
    }

    @Test
    void tekrarTercihiYalnizOgrenciyeAitHavuzdanCikarirGecmisiDegistirmez() throws Exception {
        List<Question> all = new ArrayList<>();
        for (int i = 1; i <= 6; i++) all.add(question("H-" + i, "Türkçe", "A"));
        var ayse = user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession a = login("ayse", "Sifre1234");
        MockHttpSession m = login("mehmet", "Sifre1234");
        send(a, post("/api/questions/" + all.get(0).getId() + "/practice"),
                "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\"A\"}").andExpect(status().isOk());
        int attemptsBefore = jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class);

        change(a, all.get(0), "{\"repeat\":\"HIDE\"}");
        change(a, all.get(1), "{\"repeat\":\"HIDE\"}");
        change(a, all.get(2), "{\"repeat\":\"AGAIN\",\"difficulty\":\"ZOR\"}");
        assertThat(summary(a).path("hidden").asInt()).isEqualTo(2);
        assertThat(summary(a).path("again").asInt()).isEqualTo(1);
        assertThat(summary(a).path("hard").asInt()).isEqualTo(1);
        assertThat(summary(m).path("hidden").asInt()).isZero();
        assertThat(read(send(a, get("/api/questions/code/H-1"), null)).path("myRepeat").asText()).isEqualTo("HIDE");
        assertThat(read(send(m, get("/api/questions/code/H-1"), null)).path("myRepeat").asText()).isEqualTo("DEFAULT");

        // Pratik havuzu: gizlenen sorular sayıdan ve seçimden çıkar; başka öğrencinin havuzu aynı kalır.
        assertThat(read(send(a, get("/api/questions/availability").param("subject", "Türkçe").param("practice", "true"), null)).path("total").asInt()).isEqualTo(4);
        assertThat(read(send(a, get("/api/questions/availability").param("subject", "Türkçe"), null)).path("total").asInt()).isEqualTo(6);
        assertThat(read(send(m, get("/api/questions/availability").param("subject", "Türkçe").param("practice", "true"), null)).path("total").asInt()).isEqualTo(6);
        send(a, post("/api/study-sessions"), "{\"subject\":\"Türkçe\",\"questionCount\":5,\"clientRequestId\":\"" + UUID.randomUUID() + "\"}")
                .andExpect(status().isBadRequest());
        List<String> picked = codes(a, session(a, 4, ""));
        assertThat(picked).doesNotContain("H-1", "H-2").hasSize(4);
        assertThat(codes(m, session(m, 6, ""))).contains("H-1", "H-2");

        // Banka listesi ve gezinti de aynı öğrenci tercihini kullanır; sayfalama gizlilerden sonra yapılır.
        var bank = read(send(a, get("/api/questions").param("subject", "Türkçe").param("size", "2"), null));
        assertThat(bank.path("totalElements").asInt()).isEqualTo(4);
        assertThat(bank.path("content")).hasSize(2);
        assertThat(bank.path("content").get(0).path("code").asText()).isEqualTo("H-3");
        assertThat(read(send(m, get("/api/questions").param("subject", "Türkçe"), null)).path("totalElements").asInt()).isEqualTo(6);
        assertThat(read(send(a, get("/api/questions/" + all.get(0).getId() + "/neighbor").param("subject", "Türkçe"), null)).path("code").asText()).isEqualTo("H-3");

        // Kişisel süzgeçler: Gizlediklerim, Tekrar istediklerim, zorluk etiketi, işaretlemediklerim.
        assertThat(codes(a, session(a, 2, ",\"mark\":\"HIDE\""))).containsExactlyInAnyOrder("H-1", "H-2");
        assertThat(codes(a, session(a, 1, ",\"mark\":\"AGAIN\""))).containsExactly("H-3");
        assertThat(codes(a, session(a, 1, ",\"myDifficulty\":\"ZOR\""))).containsExactly("H-3");
        assertThat(codes(a, session(a, 3, ",\"mark\":\"UNMARKED\""))).containsExactlyInAnyOrder("H-4", "H-5", "H-6");
        assertThat(codes(a, session(a, 3, ",\"myDifficulty\":\"NONE\",\"mark\":\"UNMARKED\""))).containsExactlyInAnyOrder("H-4", "H-5", "H-6");
        send(a, post("/api/study-sessions"), "{\"subject\":\"Türkçe\",\"questionCount\":2,\"mark\":\"AGAIN\",\"clientRequestId\":\"" + UUID.randomUUID() + "\"}")
                .andExpect(status().isBadRequest());
        // Başka öğrencide aynı süzgeç kendi işaretlerine bakar: hiçbir soru işaretli değil.
        send(m, post("/api/study-sessions"), "{\"subject\":\"Türkçe\",\"questionCount\":1,\"mark\":\"HIDE\",\"clientRequestId\":\"" + UUID.randomUUID() + "\"}")
                .andExpect(status().isBadRequest());

        // Geçmiş ve sabit kayıtlar değişmez.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class)).isEqualTo(attemptsBefore);
        assertThat(ayse.getId()).isNotNull();

        // Motor görünümü yalnız kendi işaretlerini taşır.
        JsonNode mine = read(send(a, get("/api/konu-ogrenme?subject=matematik"), null)).path("questionPreferences");
        assertThat(mine.path("hidden")).hasSize(2);
        assertThat(mine.path("again")).hasSize(1);
        assertThat(mine.path("difficulty").path(String.valueOf(all.get(2).getId())).asText()).isEqualTo("ZOR");
        JsonNode theirs = read(send(m, get("/api/konu-ogrenme?subject=matematik"), null)).path("questionPreferences");
        assertThat(theirs.path("hidden")).isEmpty();
        assertThat(theirs.path("again")).isEmpty();
    }

    @Test
    void bekleyenTekrarIstegiOneAlinirCevaplaninCaBirakirIsaretKalir() throws Exception {
        List<Question> all = new ArrayList<>();
        for (int i = 1; i <= 8; i++) all.add(question("A-" + i, "Türkçe", "A"));
        user("ayse", Role.USER);
        MockHttpSession a = login("ayse", "Sifre1234");
        Question wanted = all.get(5);
        change(a, wanted, "{\"repeat\":\"AGAIN\"}");
        for (int i = 0; i < 6; i++) {
            long id = session(a, 1, "");
            assertThat(codes(a, id)).containsExactly("A-6");
            send(a, post("/api/study-sessions/" + id + "/cancel"), null).andExpect(status().isNoContent());
        }
        assertThat(read(send(a, get("/api/konu-ogrenme?subject=matematik"), null)).path("questionPreferences").path("again")).hasSize(1);
        send(a, post("/api/questions/" + wanted.getId() + "/practice"),
                "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\"A\"}").andExpect(status().isOk());
        assertThat(read(send(a, get("/api/konu-ogrenme?subject=matematik"), null)).path("questionPreferences").path("again")).isEmpty();
        assertThat(summary(a).path("again").asInt()).isEqualTo(1);
        assertThat(read(send(a, get(path(wanted)), null)).path("repeat").asText()).isEqualTo("AGAIN");
        // Yeniden işaretlemek sırayı yeniden kurar.
        change(a, wanted, "{\"repeat\":\"AGAIN\"}");
        assertThat(read(send(a, get("/api/konu-ogrenme?subject=matematik"), null)).path("questionPreferences").path("again")).hasSize(1);
    }

    @Test
    void sifirlamaYalnizKendiIsaretlerimiSilerGecmisiVeYildiziKorur() throws Exception {
        Question q1 = question("R-1", "Türkçe", "A"), q2 = question("R-2", "Türkçe", "A");
        var ayse = user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession a = login("ayse", "Sifre1234");
        MockHttpSession m = login("mehmet", "Sifre1234");
        for (MockHttpSession who : List.of(a, m)) {
            change(who, q1, "{\"repeat\":\"HIDE\",\"difficulty\":\"ZOR\"}");
            change(who, q2, "{\"repeat\":\"AGAIN\",\"difficulty\":\"KOLAY\"}");
        }
        send(a, post("/api/feedback"), "{\"category\":\"RATING\",\"questionId\":" + q2.getId() + ",\"rating\":3}").andExpect(status().isCreated());
        send(a, post("/api/questions/" + q1.getId() + "/practice"),
                "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\"A\"}").andExpect(status().isOk());
        int attempts = jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class);

        send(a, post(PREF + "/reset"), "{\"scope\":\"HEPSİ\"}").andExpect(status().isBadRequest());
        JsonNode afterRepeat = read(send(a, post(PREF + "/reset"), "{\"scope\":\"REPEAT\"}").andExpect(status().isOk()));
        assertThat(afterRepeat.path("hidden").asInt() + afterRepeat.path("again").asInt()).isZero();
        assertThat(afterRepeat.path("hard").asInt() + afterRepeat.path("easy").asInt()).isEqualTo(2);
        JsonNode afterDifficulty = read(send(a, post(PREF + "/reset"), "{\"scope\":\"DIFFICULTY\"}").andExpect(status().isOk()));
        assertThat(afterDifficulty.path("hard").asInt() + afterDifficulty.path("easy").asInt() + afterDifficulty.path("medium").asInt()).isZero();
        // Yıldız puanı satırı kalır, yıldızsız boş satır kalmaz; öğrencinin cevap geçmişi aynı.
        assertThat(rows("user_id=? AND rating=3", ayse.getId())).isEqualTo(1);
        assertThat(rows("user_id=?", ayse.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class)).isEqualTo(attempts);
        // Diğer öğrencinin işaretleri dokunulmadan kalır.
        assertThat(summary(m).path("hidden").asInt()).isEqualTo(1);
        assertThat(summary(m).path("again").asInt()).isEqualTo(1);
        assertThat(summary(m).path("hard").asInt()).isEqualTo(1);
        assertThat(summary(m).path("easy").asInt()).isEqualTo(1);
        change(m, q1, "{\"repeat\":\"DEFAULT\"}");
        assertThat(summary(m).path("hidden").asInt()).isZero();
        send(m, post(PREF + "/reset"), "{\"scope\":\"ALL\"}").andExpect(status().isOk());
        assertThat(rows("user_id=(SELECT id FROM users WHERE username='mehmet')")).isZero();
    }

    @Test
    void kisiselIsaretlerHesapDisaAktarimindaGelirHesapSilinceKalkarDenetimIziBirakir() throws Exception {
        Question q = question("D-1", "Türkçe", "A");
        var ayse = user("ayse", Role.USER);
        var other = user("mehmet", Role.USER);
        MockHttpSession a = login("ayse", "Sifre1234");
        MockHttpSession m = login("mehmet", "Sifre1234");
        change(a, q, "{\"repeat\":\"HIDE\",\"difficulty\":\"ORTA\"}");
        change(m, q, "{\"repeat\":\"AGAIN\"}");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_record_audit WHERE user_id=? AND record_type='student_question_preferences'", Integer.class, ayse.getId())).isEqualTo(1);

        JsonNode data = read(send(a, post("/api/account/export"), "{\"currentPassword\":\"Sifre1234\"}").andExpect(status().isOk()));
        assertThat(data.path("questionPreferences")).hasSize(1);
        assertThat(data.path("questionPreferences").get(0).path("question_code").asText()).isEqualTo("D-1");
        assertThat(data.path("questionPreferences").get(0).path("repeat_preference").asText()).isEqualTo("HIDE");
        assertThat(data.path("feedback").get(0).path("difficulty_vote").asText()).isEqualTo("ORTA");

        send(a, post("/api/account/delete"), "{\"currentPassword\":\"Sifre1234\",\"confirmation\":\"HESABIMI SIL\"}").andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM student_question_preferences WHERE user_id=?", Integer.class, ayse.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM student_question_preferences WHERE user_id=?", Integer.class, other.getId())).isEqualTo(1);
    }
}
