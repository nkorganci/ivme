package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.learn.AnswerKeys;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;

/** TAS-04: her giriş noktasındaki cevap DB'ye yazılır, sunucuda puanlanır ve Konu takibinde tek sözleşmeyle sayılır. */
class TopicAnswerContractTest extends TestBase {
    private static final String RUN = "topic-answer-contract-test";
    private static final String CHOICE = "bolme-bolunebilme:c1";
    private static final String FILL = "bolme-bolunebilme:temel-paket";
    private static final String MATCH = "bolme-bolunebilme:e1";
    private static final String ORDER = "grafik-rutin-olmayan:r1";
    private static final String CATEGORIZE = "temel-kavramlar:k1";
    private static final String NOTE = "note:tyt-turkce:sozcukte-anlam";

    @Autowired AnswerKeys keys;

    @AfterEach void clearCatalog() {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.assignments WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?", RUN);
    }

    private ObjectNode attempt(String itemType, String itemId, String context, boolean claimed) {
        ObjectNode event = json.createObjectNode().put("id", UUID.randomUUID().toString()).put("at", Instant.now().toString())
                .put("kind", "attempt").put("itemType", itemType).put("itemId", itemId).put("conceptId", itemId.split(":")[0])
                .put("context", context).put("correct", claimed).put("confidence", 3).put("timeMs", 9000).put("hintUsed", false);
        return event;
    }

    private JsonNode save(MockHttpSession session, ObjectNode... events) throws Exception {
        var body = json.createObjectNode().put("subject", "matematik");
        body.putArray("events").addAll(List.of(events));
        return read(send(session, post("/api/konu-ogrenme/events"), body.toString())).get("events");
    }

    private String wrongLetter(String answer) {
        return "A".equals(answer) ? "B" : "A";
    }

    @Test
    void dersSorusuSunucuAnahtariylaPuanlanirVeYenidenDenemeAyniKaydiDondurur() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        AnswerKeys.LessonKey choice = keys.lessonItem(CHOICE);

        ObjectNode claimedRight = attempt("lesson_q", CHOICE, "quick_check", true).put("chosen", wrongLetter(choice.key().path("answer").asText()));
        claimedRight.put("scoring", "SERVER").putArray("categoryIds").add("sahte-konu");
        JsonNode saved = save(ayse, claimedRight).get(0);
        assertThat(saved.path("correct").asBoolean()).isFalse();
        assertThat(saved.path("clientCorrect").asBoolean()).isTrue();
        assertThat(saved.path("scoring").asText()).isEqualTo("SERVER");
        assertThat(saved.path("keyVersion").asText()).isEqualTo(choice.version());
        assertThat(saved.path("mode").asText()).isEqualTo("GUIDED");
        assertThat(saved.path("categoryIds").toString()).doesNotContain("sahte-konu")
                .contains(keys.conceptCategories("bolme-bolunebilme").getFirst());
        assertThat(jdbc.queryForObject("SELECT correct FROM learning_engine_events WHERE client_event_id=?::uuid", Boolean.class,
                claimedRight.path("id").asText())).isFalse();
        // Aynı olayın yeniden denemesi istemci beyanı farklı olsa da özgün kaydı döndürür.
        assertThat(save(ayse, claimedRight).get(0).path("seq").asLong()).isEqualTo(saved.path("seq").asLong());

        String fillAnswer = keys.lessonItem(FILL).key().path("answers").get(0).asText();
        assertThat(save(ayse, attempt("lesson_q", FILL, "quick_check", false).put("response", " " + fillAnswer + ",0 ")).get(0).path("correct").asBoolean()).isTrue();
        assertThat(save(ayse, attempt("lesson_q", FILL, "quick_check", true).put("response", "yanlış")).get(0).path("correct").asBoolean()).isFalse();

        ObjectNode match = attempt("lesson_q", MATCH, "quick_check", false);
        match.set("response", keys.lessonItem(MATCH).key().path("rights"));
        assertThat(save(ayse, match).get(0).path("correct").asBoolean()).isTrue();
        JsonNode unscored = save(ayse, attempt("lesson_q", MATCH, "quick_check", true)).get(0);
        assertThat(unscored.path("scoring").asText()).isEqualTo("CLIENT");
        assertThat(unscored.has("keyVersion")).isFalse();

        ObjectNode order = attempt("lesson_q", ORDER, "quick_check", true);
        var reversed = order.putArray("response");
        JsonNode items = keys.lessonItem(ORDER).key().path("items");
        for (int i = items.size() - 1; i >= 0; i--) reversed.add(items.get(i));
        assertThat(save(ayse, order).get(0).path("correct").asBoolean()).isFalse();

        ObjectNode categorize = attempt("lesson_q", CATEGORIZE, "practice", false);
        categorize.set("response", keys.lessonItem(CATEGORIZE).key().path("groups"));
        JsonNode sorted = save(ayse, categorize).get(0);
        assertThat(sorted.path("correct").asBoolean()).isTrue();
        assertThat(sorted.path("mode").asText()).isEqualTo("INDEPENDENT");

        JsonNode unknown = save(ayse, attempt("lesson_q", "bolme-bolunebilme:olmayan", "practice", true).put("chosen", "A")).get(0);
        assertThat(unknown.path("scoring").asText()).isEqualTo("CLIENT");
        assertThat(save(ayse, attempt("lesson_q", CHOICE, "practice", false).put("chosen", choice.key().path("answer").asText()).put("hintUsed", true))
                .get(0).path("mode").asText()).isEqualTo("GUIDED");
    }

    private void catalogItem(String key, String kind, String questionCode, String... categoryIds) throws Exception {
        var assignments = java.util.Arrays.stream(categoryIds).map(id -> Map.of("categoryId", id, "relation", "PRIMARY")).toList();
        var data = new LinkedHashMap<String, Object>();
        data.put("key", key); data.put("kind", kind); data.put("exam", "TYT"); data.put("subjectId", "matematik"); data.put("subject", "Matematik");
        data.put("title", key); data.put("studentVisible", true); data.put("automaticLabels", Map.of("assignments", assignments));
        if (questionCode != null) {
            data.put("questionCode", questionCode); data.put("bank", "OGM");
            data.put("sourceUpdatedAt", jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE code=?", String.class, questionCode));
        }
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) "
                        + "VALUES (?,?,?,'TYT','matematik',true,?::jsonb,?::text[],ARRAY['matematik'],ARRAY['TYT'])",
                RUN, key, kind, json.writeValueAsString(data), "{" + String.join(",", categoryIds) + "}");
    }

    private static String bank(UUID id, long questionId, String chosen) {
        return "{\"subject\":\"matematik\",\"event\":{\"id\":\"" + id + "\",\"at\":\"" + Instant.now() + "\",\"kind\":\"attempt\","
                + "\"itemType\":\"bank\",\"itemId\":\"M-1\",\"questionId\":" + questionId + ",\"conceptId\":\"bolme-bolunebilme\","
                + "\"context\":\"mastery\",\"chosen\":\"" + chosen + "\",\"confidence\":3,\"timeMs\":42000,\"hintUsed\":false}}";
    }

    private static JsonNode row(JsonNode progress, String categoryId) {
        for (JsonNode row : progress.path("categories")) if (categoryId.equals(row.path("categoryId").asText())) return row;
        return com.fasterxml.jackson.databind.node.NullNode.getInstance();
    }

    @Test
    void konuTakibiHerGirisNoktasiniCiftSaymadanAyirir() throws Exception {
        String topic = keys.conceptCategories("bolme-bolunebilme").stream().filter(id -> id.startsWith("excel.tyt.")).findFirst().orElseThrow();
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')", RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", RUN);
        Question bankQuestion = question("M-1", "Matematik", "C");
        Question open = question("M-2", "Matematik", "D");
        catalogItem("question:M-1", "QUESTION", "M-1", topic);
        catalogItem("question:M-2", "QUESTION", "M-2", topic);
        catalogItem(NOTE, "NOTE", null, "turkce-not-konusu");
        var owner = user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession mehmet = login("mehmet", "Sifre1234");

        // 1) Konuyu Öğrenelim banka cevabı: yanlış, sonra doğru. question_attempts üzerinden bir kez sayılır.
        send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(UUID.randomUUID(), bankQuestion.getId(), "B")).andExpect(status().isOk());
        send(ayse, post("/api/konu-ogrenme/bank-answer"), bank(UUID.randomUUID(), bankQuestion.getId(), "C")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_engine_events WHERE item_type='bank'", Integer.class)).isEqualTo(2);

        // 2) Açık pratik: yeni soru "devam eden"; zaten sayılmış soru tekrar sayılmaz.
        long session = jdbc.queryForObject("INSERT INTO study_sessions(user_id,mode,selection_mode) VALUES (?,'PRACTICE','NEW') RETURNING id",
                Long.class, owner.getId());
        int position = 0;
        for (long questionId : List.of(open.getId(), bankQuestion.getId())) {
            jdbc.update("INSERT INTO session_questions(session_id,question_id,position) VALUES (?,?,?)", session, questionId, ++position);
            jdbc.update("INSERT INTO question_attempts(user_id,question_id,session_id,client_event_id,event_type,selected_answer,correct_answer,is_correct) "
                    + "VALUES (?,?,?,?,'ANSWER','A','D',false)", owner.getId(), questionId, session, UUID.randomUUID());
        }

        // 3) Ders sorusu: rehberli yanlış, sonra bağımsız doğru; sunucu öncesi eski kayıt doğrulanmamış kalır.
        String answer = keys.lessonItem(CHOICE).key().path("answer").asText();
        save(ayse, attempt("lesson_q", CHOICE, "quick_check", true).put("chosen", wrongLetter(answer)));
        save(ayse, attempt("lesson_q", CHOICE, "practice", true).put("chosen", answer));
        jdbc.update("INSERT INTO learning_engine_events(user_id,client_event_id,subject,kind,concept_id,item_type,correct,occurred_at,payload) "
                + "VALUES (?,?,'matematik','attempt','bolme-bolunebilme','lesson_q',true,now(),?::jsonb)", owner.getId(), UUID.randomUUID(),
                "{\"kind\":\"attempt\",\"itemType\":\"lesson_q\",\"itemId\":\"" + FILL + "\",\"context\":\"pretest\",\"correct\":true}");

        // 4) Kart: önce bilemedim, sonra bildim — tekrar etkinliği, doğru cevap değil.
        save(ayse, attempt("flashcard", "bolme-bolunebilme:k1", "review", false));
        save(ayse, attempt("flashcard", "bolme-bolunebilme:k1", "review", true));

        // 5) Not mini alıştırması: sunucuda puanlanır, cevap anındaki konu bağı saklanır.
        int noteAnswer = keys.notePractice(NOTE).answer();
        JsonNode note = read(send(ayse, post("/api/self-checks"), "{\"kind\":\"SOURCE_PRACTICE\",\"itemKey\":\"" + NOTE + "\",\"answers\":[" + noteAnswer + "]}"));
        assertThat(note.path("correct").asBoolean()).isTrue();
        assertThat(read(send(ayse, post("/api/self-checks"), "{\"kind\":\"SOURCE_PRACTICE\",\"itemKey\":\"" + NOTE + "\",\"answers\":["
                + ((noteAnswer + 1) % 4) + "],\"solutionSeen\":true}")).path("correct").asBoolean()).isFalse();
        assertThat(jdbc.queryForObject("SELECT category_snapshot::text FROM student_self_check_attempts ORDER BY id LIMIT 1", String.class))
                .isEqualTo("[\"turkce-not-konusu\"]");

        JsonNode current = read(send(ayse, get("/api/learning-resources/progress"), null));
        JsonNode summary = current.path("summary");
        assertThat(summary.path("total").asInt()).isEqualTo(1);
        assertThat(summary.path("wrong").asInt()).isEqualTo(1);
        assertThat(summary.path("answers").asInt()).isEqualTo(2);
        assertThat(summary.path("lastCorrect").asInt()).isEqualTo(1);
        assertThat(summary.path("repeatAttempts").asInt()).isEqualTo(1);
        assertThat(current.path("inProgress").asInt()).isEqualTo(1);

        JsonNode exercise = current.path("exercise");
        assertThat(exercise.path("items").asInt()).isEqualTo(3);
        assertThat(exercise.path("unverifiedAnswers").asInt()).isEqualTo(1);
        assertThat(exercise.path("guidedAnswers").asInt()).isEqualTo(2);
        JsonNode review = current.path("review");
        assertThat(review.path("cards").asInt()).isEqualTo(1);
        assertThat(review.path("reviews").asInt()).isEqualTo(2);
        assertThat(review.path("lastKnown").asInt()).isEqualTo(1);

        JsonNode math = row(current, topic);
        assertThat(math.path("total").asInt()).isEqualTo(1);
        assertThat(math.path("inProgress").asInt()).isEqualTo(1);
        JsonNode lesson = math.path("exercise");
        assertThat(lesson.path("items").asInt()).isEqualTo(2);
        assertThat(lesson.path("firstWrong").asInt()).isEqualTo(1);
        assertThat(lesson.path("lastCorrect").asInt()).isEqualTo(1);
        assertThat(lesson.path("independentItems").asInt()).isEqualTo(1);
        assertThat(lesson.path("independentCorrect").asInt()).isEqualTo(1);
        assertThat(lesson.path("unverifiedAnswers").asInt()).isEqualTo(1);
        assertThat(math.path("review").path("cards").asInt()).isEqualTo(1);
        JsonNode turkish = row(current, "turkce-not-konusu").path("exercise");
        assertThat(turkish.path("items").asInt()).isEqualTo(1);
        assertThat(turkish.path("firstCorrect").asInt()).isEqualTo(1);
        assertThat(turkish.path("lastWrong").asInt()).isEqualTo(1);
        assertThat(turkish.path("independentCorrect").asInt()).isEqualTo(1);

        // Tarihsel görünüm cevap anındaki konu bağını kullanır; eski kayda bugünün konusu yazılmaz.
        JsonNode historical = read(send(ayse, get("/api/learning-resources/progress").param("classification", "HISTORICAL"), null));
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,assignments}','[{\"categoryId\":\"baska-konu\",\"relation\":\"PRIMARY\"}]') "
                + "WHERE run_key=? AND item_key=?", RUN, NOTE);
        JsonNode moved = read(send(ayse, get("/api/learning-resources/progress"), null));
        assertThat(row(moved, "baska-konu").path("exercise").path("items").asInt()).isEqualTo(1);
        assertThat(row(moved, "turkce-not-konusu").isNull()).isTrue();
        assertThat(read(send(ayse, get("/api/learning-resources/progress").param("classification", "HISTORICAL"), null))).isEqualTo(historical);
        assertThat(row(historical, "turkce-not-konusu").path("exercise").path("items").asInt()).isEqualTo(1);
        assertThat(row(historical, topic).path("exercise").path("unverifiedAnswers").asInt()).isZero();

        JsonNode other = read(send(mehmet, get("/api/learning-resources/progress"), null));
        assertThat(other.path("summary").path("total").asInt()).isZero();
        assertThat(other.path("exercise").path("items").asInt()).isZero();
        assertThat(other.path("review").path("reviews").asInt()).isZero();
        assertThat(other.path("inProgress").asInt()).isZero();
    }
}
