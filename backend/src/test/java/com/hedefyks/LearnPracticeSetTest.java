package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.learn.AnswerKeys;
import com.hedefyks.question.Question;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.user.Role;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** TAS-05: Konuyu Öğrenelim'in konu testi, çıkmış soru ve tip alıştırması ortak PRATIK oturumu olarak kurulur. */
class LearnPracticeSetTest extends TestBase {
    private static final String RUN = "learn-practice-set-test";
    private static final String CONCEPT = "temel-kavramlar";
    private static final String PRACTICE = "/api/konu-ogrenme/practice-sets";

    @MockitoBean ImageStorage images;
    @Autowired AnswerKeys keys;
    private String topic;

    @BeforeEach void catalog() {
        topic = keys.conceptCategories(CONCEPT).getFirst();
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')", RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", RUN);
        // "twin-*" yolları aynı baytı döndürür: farklı kodla gelen aynı soru görseli.
        when(images.load(anyString())).thenAnswer(call -> {
            String path = call.getArgument(0);
            return new ByteArrayResource((path.startsWith("twin") ? "twin" : path).getBytes(StandardCharsets.UTF_8));
        });
    }

    @AfterEach void clearCatalog() {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.assignments WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM exam_archive_positions WHERE question_code LIKE '900_-tyt-matematik-%'");
    }

    private Question math(String code, String bank, Integer year, String image, String... categories) throws Exception {
        Question q = question(code, "Matematik", "C");
        jdbc.update("UPDATE questions SET bank=?, exam_year=?, image=? WHERE id=?", bank, year, image, q.getId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("key", "question:" + code); data.put("kind", "QUESTION"); data.put("exam", "TYT"); data.put("subjectId", "matematik");
        data.put("subject", "Matematik"); data.put("title", code); data.put("studentVisible", true); data.put("availability", "available");
        data.put("questionCode", code);
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) "
                        + "VALUES (?,?,'QUESTION','TYT','matematik',true,?::jsonb,?::text[],ARRAY['matematik'],ARRAY['TYT'])",
                RUN, "question:" + code, json.writeValueAsString(data), "{" + String.join(",", categories) + "}");
        return q;
    }

    private String body(UUID request, String kind, String archetype, Boolean resume, Question... items) {
        ObjectNode body = json.createObjectNode().put("clientRequestId", request.toString()).put("conceptId", CONCEPT).put("kind", kind)
                .put("title", "Konu testi · Temel kavramlar");
        if (archetype != null) body.put("archetypeId", archetype);
        if (resume != null) body.put("resume", resume);
        ArrayNode list = body.putArray("items");
        int n = 0;
        for (Question q : items) list.addObject().put("questionId", q.getId()).put("archetypeId", n++ % 2 == 0 ? "isaret" : "ardisik").put("difficulty", 2);
        return body.toString();
    }

    private static String answer(String answer, long session) {
        return "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\"" + answer + "\",\"sessionId\":" + session + "}";
    }

    @Test
    void setSunucudaDogrulanirSiraVeIcerikOzetiSaklanirAyniIstekAyniSetiDondurur() throws Exception {
        Question a = math("M-1", "OGM", null, "a.webp", topic), b = math("M-2", "OGM", null, "b.webp", topic), c = math("M-3", "OGM", null, "c.webp", topic);
        Question other = math("X-1", "OGM", null, "x.webp", "baska-konu");
        Question inactive = math("M-4", "OGM", null, "d.webp", topic);
        jdbc.update("UPDATE questions SET active=false WHERE id=?", inactive.getId());
        Question turkish = math("T-1", "OGM", null, "t.webp", topic);
        jdbc.update("UPDATE questions SET subject='Türkçe' WHERE id=?", turkish.getId());
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession mehmet = login("mehmet", "Sifre1234");

        UUID request = UUID.randomUUID();
        JsonNode created = read(send(ayse, post(PRACTICE), body(request, "TOPIC_TEST", null, null, c, a, b)).andExpect(status().isCreated()));
        JsonNode session = created.path("session");
        assertThat(created.path("resumed").asBoolean()).isFalse();
        assertThat(session.path("origin").path("kind").asText()).isEqualTo("TOPIC_TEST");
        assertThat(session.path("origin").path("conceptId").asText()).isEqualTo(CONCEPT);
        assertThat(session.path("origin").path("title").asText()).isEqualTo("Konu testi · Temel kavramlar");
        assertThat(session.path("questionCount").asInt()).isEqualTo(3);
        assertThat(session.path("questions").findValuesAsText("code")).containsExactly("M-3", "M-1", "M-2");
        assertThat(jdbc.queryForObject("SELECT origin||':'||learning_kind||':'||learning_concept_id FROM study_sessions WHERE id=?", String.class,
                session.path("id").asLong())).isEqualTo("KONU_OGRENME:TOPIC_TEST:" + CONCEPT);
        assertThat(jdbc.queryForList("SELECT length(content_sha256) FROM session_questions WHERE session_id=? ORDER BY position", Integer.class,
                session.path("id").asLong())).containsExactly(64, 64, 64);
        assertThat(jdbc.queryForList("SELECT learning_archetype FROM session_questions WHERE session_id=? ORDER BY position", String.class,
                session.path("id").asLong())).containsExactly("isaret", "ardisik", "isaret");

        // Ağ tekrarı: aynı istek kimliği aynı seti döndürür, ikinci oturum doğmaz.
        JsonNode again = read(send(ayse, post(PRACTICE), body(request, "TOPIC_TEST", null, null, a, b)).andExpect(status().isOk()));
        assertThat(again.path("session").path("id").asLong()).isEqualTo(session.path("id").asLong());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM study_sessions", Integer.class)).isEqualTo(1);
        send(ayse, post(PRACTICE), body(request, "PAST_EXAM", null, null, a)).andExpect(status().isConflict());

        // Başka hesap aynı kimlikle kendi setini kurar ve ayşe'nin oturumunu okuyamaz.
        JsonNode theirs = read(send(mehmet, post(PRACTICE), body(request, "TOPIC_TEST", null, null, a, b)).andExpect(status().isCreated()));
        assertThat(theirs.path("session").path("id").asLong()).isNotEqualTo(session.path("id").asLong());
        send(mehmet, get("/api/study-sessions/" + session.path("id").asLong()), null).andExpect(status().isNotFound());

        // Reddedilenler: başka konu, etkin olmayan, başka ders, yinelenen, boş ve bilinmeyen kavram.
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, a, other)).andExpect(status().isConflict());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, a, inactive)).andExpect(status().isConflict());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, a, turkish)).andExpect(status().isConflict());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, a, a)).andExpect(status().isBadRequest());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false)).andExpect(status().isBadRequest());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "ARCHETYPE", null, false, a)).andExpect(status().isBadRequest());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "SINAV", null, false, a)).andExpect(status().isBadRequest());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, a).replace(CONCEPT, "olmayan-konu")).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM study_sessions", Integer.class)).isEqualTo(2);
    }

    @Test
    void ayniGorselliSorularFarkliKodlaGelseBileBirSetteBulusmaz() throws Exception {
        Question first = math("3d-ayt-esit-agirlik-02-05", "OGM", null, "twin-a.webp", topic);
        Question second = math("3d-ayt-sayisal-01-05", "OGM", null, "twin-b.webp", topic);
        Question distinct = math("M-9", "OGM", null, "z.webp", topic);
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        String message = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, null, first, distinct, second))
                .andExpect(status().isConflict())).path("hata").asText();
        assertThat(message).contains("3d-ayt-esit-agirlik-02-05").contains("3d-ayt-sayisal-01-05");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM study_sessions", Integer.class)).isZero();
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, null, first, distinct)).andExpect(status().isCreated());
    }

    @Test
    void cikmisSetiYalnizDogrulanmisSinavKonumluCikmisSorulariKabulEder() throws Exception {
        Question past = math("9001-tyt-matematik-01", "CIKMIS", 9001, "p1.webp", topic);
        Question past2 = math("9002-tyt-matematik-02", "CIKMIS", 9002, "p2.webp", topic);
        Question unpositioned = math("9003-tyt-matematik-03", "CIKMIS", 9003, "p3.webp", topic);
        Question practice = math("M-1", "OGM", null, "a.webp", topic);
        for (Question q : List.of(past, past2)) jdbc.update("INSERT INTO exam_archive_positions(question_code,exam_year,exam_type,subject,booklet_position) VALUES (?,?,'TYT','Matematik',?)",
                q.getCode(), q.getCode().startsWith("9001") ? 9001 : 9002, q.getCode().endsWith("01") ? 1 : 2);
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "PAST_EXAM", null, null, past, past2)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.session.origin.kind").value("PAST_EXAM"));
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "PAST_EXAM", null, false, past, practice)).andExpect(status().isConflict());
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "PAST_EXAM", null, false, past, unpositioned)).andExpect(status().isConflict());
        // Konu testi çıkmış soru da içerebilir; çıkmış etiketi yalnız PAST_EXAM setine özgü doğrulamadır.
        send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, past, practice)).andExpect(status().isCreated());
    }

    @Test
    void acikSetDevamEderTamamlanmisSetYerineYenisiKurulurVeFarkliTipAyriSetOlur() throws Exception {
        Question a = math("M-1", "OGM", null, "a.webp", topic), b = math("M-2", "OGM", null, "b.webp", topic), c = math("M-3", "OGM", null, "c.webp", topic);
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        long first = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, null, a, b)).andExpect(status().isCreated())).path("session").path("id").asLong();

        JsonNode resumed = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, null, b, c)).andExpect(status().isOk()));
        assertThat(resumed.path("resumed").asBoolean()).isTrue();
        assertThat(resumed.path("session").path("id").asLong()).isEqualTo(first);
        assertThat(resumed.path("session").path("questions").findValuesAsText("code")).containsExactly("M-1", "M-2");

        long typed = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "ARCHETYPE", "isaret", null, a, c)).andExpect(status().isCreated())).path("session").path("id").asLong();
        long forced = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, false, a, c)).andExpect(status().isCreated())).path("session").path("id").asLong();
        assertThat(List.of(first, typed, forced)).doesNotHaveDuplicates();

        for (Question q : List.of(a, b)) send(ayse, post("/api/questions/" + q.getId() + "/practice"), answer("C", first)).andExpect(status().isOk());
        JsonNode renewed = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, true, a, b)).andExpect(status().isOk()));
        // En yeni açık set (forced) çözülmemiş: o devam eder, tamamen çözülmüş eski set (first) dokunulmaz.
        assertThat(renewed.path("session").path("id").asLong()).isEqualTo(forced);
        // Bütün soruları bitmiş set "devam" sayılmaz: tamamlanır ve yeni set kurulur.
        send(ayse, post("/api/study-sessions/" + forced + "/cancel"), null).andExpect(status().isNoContent());
        JsonNode fresh = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, true, a, b)).andExpect(status().isCreated()));
        assertThat(fresh.path("session").path("id").asLong()).isNotIn(first, forced);
        assertThat(jdbc.queryForObject("SELECT status FROM study_sessions WHERE id=?", String.class, first)).isEqualTo("COMPLETED");
    }

    @Test
    void ortakEkrandakiCevaplarDersMotoruOlayiOlarakOkunurIptalEdilenKatilmaz() throws Exception {
        Question a = math("M-1", "OGM", null, "a.webp", topic), b = math("M-2", "OGM", null, "b.webp", topic);
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        long id = read(send(ayse, post(PRACTICE), body(UUID.randomUUID(), "TOPIC_TEST", null, null, a, b)).andExpect(status().isCreated())).path("session").path("id").asLong();

        JsonNode idle = read(send(ayse, get("/api/konu-ogrenme?subject=matematik"), null).andExpect(status().isOk()));
        assertThat(idle.path("events")).isEmpty();
        assertThat(idle.path("practiceSets").get(0).path("answered").asInt()).isZero();
        assertThat(idle.path("practiceSets").get(0).path("total").asInt()).isEqualTo(2);

        send(ayse, post("/api/questions/" + a.getId() + "/practice"), answer("A", id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + a.getId() + "/practice"), answer("C", id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + b.getId() + "/practice"), answer("C", id)).andExpect(status().isOk());

        JsonNode state = read(send(ayse, get("/api/konu-ogrenme?subject=matematik"), null).andExpect(status().isOk()));
        JsonNode events = state.path("events");
        assertThat(events).hasSize(2); // her (soru, tur) için yalnız ilk cevap
        assertThat(events.get(0).path("itemId").asText()).isEqualTo("M-1");
        assertThat(events.get(0).path("correct").asBoolean()).isFalse();
        assertThat(events.get(0).path("chosen").asText()).isEqualTo("A");
        assertThat(events.get(0).path("context").asText()).isEqualTo("test");
        assertThat(events.get(0).path("setId").asText()).isEqualTo("ps-" + id);
        assertThat(events.get(0).path("conceptId").asText()).isEqualTo(CONCEPT);
        assertThat(events.get(0).path("shared").asBoolean()).isTrue();
        assertThat(events.get(0).path("archetypeId").asText()).isEqualTo("isaret");
        assertThat(events.get(1).path("correct").asBoolean()).isTrue();
        assertThat(events.get(0).path("id").asText()).isNotEqualTo(events.get(1).path("id").asText());
        assertThat(state.path("practiceSets").get(0).path("answered").asInt()).isEqualTo(2);
        assertThat(state.path("practiceSets").get(0).path("firstCorrect").asInt()).isEqualTo(1);
        // Ders motoru olay günlüğüne ikinci kez yazılmaz.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_engine_events", Integer.class)).isZero();
        // Aynı olay kimlikleri her okumada aynı.
        assertThat(read(send(ayse, get("/api/konu-ogrenme?subject=matematik"), null)).path("events").get(0).path("id").asText())
                .isEqualTo(events.get(0).path("id").asText());

        send(ayse, post("/api/study-sessions/" + id + "/cancel"), null).andExpect(status().isNoContent());
        JsonNode after = read(send(ayse, get("/api/konu-ogrenme?subject=matematik"), null));
        assertThat(after.path("events")).isEmpty();
        assertThat(after.path("practiceSets")).isEmpty();
    }
}
