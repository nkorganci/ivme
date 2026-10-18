package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class MathTutoringFlowTest extends TestBase {
    @Override protected boolean catalogFixtureRequired() { return true; }
    private static final String TRACKED_LESSON = """
            {"date":"2026-10-15","start":"09:00","end":"10:00","topic":"Fonksiyonlar",
             "homework":"Test 1","status":"COMPLETED","note":"Kontrol",
             "learning":{"examType":"AYT","branch":"MATHEMATICS","subtopic":"Bileşke",
               "goal":"Bileşke çözümü","beforeTest":{"correct":3,"wrong":5,"blank":2},
               "afterTest":{"correct":8,"wrong":1,"blank":1},
               "assignment":{"given":20,"correct":10,"wrong":5,"blank":5,
                 "assignedDate":"2026-10-15","dueDate":"2026-10-18","source":"Kitap / Test 1"},
               "errorTypes":["CALCULATION","TIME"],"mastery":"PRACTICING","reviewDate":"2026-10-22",
               "reviewTest":{"correct":9,"wrong":1,"blank":0},"reviewDone":false,"nextStep":"Ters fonksiyon",
               "teacherEvaluation":"Konu kavrandı.\\nİşlem hataları için tekrar önerildi."}}
            """;

    @Test
    void sharedTopicBindingPreservesOriginalNotesAndRejectsAnotherBranch() throws Exception {
        user("ayse",Role.USER);
        var session=login("ayse","Sifre1234");
        var input=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(TRACKED_LESSON);
        var learning=(com.fasterxml.jackson.databind.node.ObjectNode)input.path("learning");
        learning.put("categoryId","ayt.matematik.fonksiyonlar");
        var saved=read(send(session,post("/api/math-tutoring"),input.toString()).andExpect(status().isOk()));
        assertThat(saved.path("topic").asText()).isEqualTo("Fonksiyonlar");
        assertThat(saved.path("learning")).isEqualTo(learning);
        learning.put("categoryId","tyt.matematik.sayi-basamaklari");
        send(session,patch("/api/math-tutoring/"+saved.path("id").asLong()),input.toString()).andExpect(status().isBadRequest());
        learning.put("categoryId","unknown.topic");
        send(session,patch("/api/math-tutoring/"+saved.path("id").asLong()),input.toString()).andExpect(status().isBadRequest());
        assertThat(read(send(session,get("/api/math-tutoring"),null)).get(0)).isEqualTo(saved);
    }

    @Test
    void bulkSavePersistsEveryFieldAndTeacherEvaluationInDatabase() throws Exception {
        user("ayse", Role.USER);
        var session = login("ayse", "Sifre1234");
        var created = read(send(session, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        long id = created.path("id").asLong();
        var input = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(TRACKED_LESSON);
        input.put("date", "2026-10-16").put("start", "11:00").put("end", "12:30")
                .put("topic", "Polinomlar").put("homework", "Test 5").put("note", "Yeni not").put("status", "PLANNED");
        var batch = json.createArrayNode();
        batch.addObject().put("id", id).set("lesson", input);
        batch.addObject().putNull("id").set("lesson", json.readTree(TRACKED_LESSON));
        var result = read(send(session, post("/api/math-tutoring/bulk"), batch.toString()).andExpect(status().isOk()));
        assertThat(result.size()).isEqualTo(2);
        var stored = read(send(session, get("/api/math-tutoring"), null));
        assertThat(stored.size()).isEqualTo(2);
        assertThat(stored.get(0)).isEqualTo(result.get(1));
        assertThat(stored.get(1)).isEqualTo(result.get(0));
        for (String field : new String[] { "date", "topic", "homework", "note", "status", "learning" })
            assertThat(result.get(0).path(field)).isEqualTo(input.path(field));
        assertThat(result.get(0).path("start").asText()).startsWith("11:00");
        assertThat(result.get(0).path("end").asText()).startsWith("12:30");
        assertThat(jdbc.queryForObject("SELECT learning->>'teacherEvaluation' FROM math_tutoring_lessons WHERE id = ?",
                String.class, id)).isEqualTo(input.path("learning").path("teacherEvaluation").asText());
    }

    @Test
    void bulkFailureLeavesEveryLessonUnchanged() throws Exception {
        user("ayse", Role.USER);
        user("fatma", Role.USER);
        var session = login("ayse", "Sifre1234");
        var other = login("fatma", "Sifre1234");
        var created = read(send(session, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        var foreign = read(send(other, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        var changed = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(TRACKED_LESSON);
        changed.put("note", "Kaydedilmemeli");
        var batch = json.createArrayNode();
        batch.addObject().put("id", created.path("id").asLong()).set("lesson", changed);
        batch.addObject().put("id", foreign.path("id").asLong()).set("lesson", changed);
        send(session, post("/api/math-tutoring/bulk"), batch.toString()).andExpect(status().isNotFound());
        assertThat(read(send(session, get("/api/math-tutoring"), null)).get(0)).isEqualTo(created);
        assertThat(read(send(other, get("/api/math-tutoring"), null)).get(0)).isEqualTo(foreign);

        var invalid = json.readTree(TRACKED_LESSON.replace("\"given\":20", "\"given\":1"));
        batch.remove(1);
        batch.addObject().putNull("id").set("lesson", invalid);
        send(session, post("/api/math-tutoring/bulk"), batch.toString()).andExpect(status().isBadRequest());
        assertThat(read(send(session, get("/api/math-tutoring"), null)).get(0)).isEqualTo(created);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM math_tutoring_lessons", Integer.class)).isEqualTo(2);
    }

    @Test
    void databaseFailureRollsBackEarlierWritesInSameBulkSave() throws Exception {
        user("ayse", Role.USER);
        var session = login("ayse", "Sifre1234");
        var created = read(send(session, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        jdbc.execute("""
                CREATE FUNCTION math_bulk_test_reject() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  IF NEW.topic = 'REJECT_TEST' THEN RAISE EXCEPTION 'Deliberate test failure'; END IF;
                  RETURN NEW;
                END $$
                """);
        try {
            jdbc.execute("CREATE TRIGGER math_bulk_test_reject BEFORE INSERT ON math_tutoring_lessons FOR EACH ROW EXECUTE FUNCTION math_bulk_test_reject()");
            var changed = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(TRACKED_LESSON);
            changed.put("note", "Geri alınmalı");
            var rejected = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(TRACKED_LESSON);
            rejected.put("topic", "REJECT_TEST");
            var batch = json.createArrayNode();
            batch.addObject().put("id", created.path("id").asLong()).set("lesson", changed);
            batch.addObject().putNull("id").set("lesson", rejected);
            send(session, post("/api/math-tutoring/bulk"), batch.toString()).andExpect(status().isInternalServerError());
            assertThat(read(send(session, get("/api/math-tutoring"), null)).get(0)).isEqualTo(created);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM math_tutoring_lessons", Integer.class)).isEqualTo(1);
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS math_bulk_test_reject ON math_tutoring_lessons");
            jdbc.execute("DROP FUNCTION math_bulk_test_reject()");
        }
    }

    @Test
    void persistsLearningAndPreservesItForOlderClients() throws Exception {
        user("ayse", Role.USER);
        var session = login("ayse", "Sifre1234");
        var created = read(send(session, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        long id = created.path("id").asLong();
        assertThat(created.path("learning")).isEqualTo(json.readTree(TRACKED_LESSON).path("learning"));
        var stored = read(send(session, get("/api/math-tutoring"), null)).get(0);
        assertThat(stored.path("learning")).isEqualTo(created.path("learning"));

        var updated = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(TRACKED_LESSON);
        updated.remove("learning");
        updated.put("note", "Eski istemci");
        var saved = read(send(session, patch("/api/math-tutoring/" + id), updated.toString()).andExpect(status().isOk()));
        assertThat(saved.path("note").asText()).isEqualTo("Eski istemci");
        assertThat(saved.path("learning")).isEqualTo(created.path("learning"));

        updated.set("learning", created.path("learning").deepCopy());
        ((com.fasterxml.jackson.databind.node.ObjectNode) updated.path("learning")).put("reviewDone", true);
        var reviewed = read(send(session, patch("/api/math-tutoring/" + id), updated.toString()).andExpect(status().isOk()));
        assertThat(reviewed.path("learning").path("reviewDone").asBoolean()).isTrue();
    }

    @Test
    void rejectsInvalidLearningWithoutChangingSavedLesson() throws Exception {
        user("ayse", Role.USER);
        var session = login("ayse", "Sifre1234");
        var created = read(send(session, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        for (String invalid : new String[] {
                TRACKED_LESSON.replace("\"correct\":3", "\"correct\":-1"),
                TRACKED_LESSON.replace("\"correct\":3,", ""),
                TRACKED_LESSON.replace("\"given\":20", "\"given\":10"),
                TRACKED_LESSON.replace("2026-10-18", "2026-10-14"),
                TRACKED_LESSON.replace("PRACTICING", "INVALID"),
                TRACKED_LESSON.replace("CALCULATION", "INVALID") }) {
            send(session, patch("/api/math-tutoring/" + created.path("id").asLong()), invalid).andExpect(status().isBadRequest());
        }
        assertThat(read(send(session, get("/api/math-tutoring"), null)).get(0)).isEqualTo(created);
    }

    @Test
    void learningRemainsPrivateToLessonOwner() throws Exception {
        user("ayse", Role.USER);
        user("fatma", Role.USER);
        var owner = login("ayse", "Sifre1234");
        var other = login("fatma", "Sifre1234");
        var created = read(send(owner, post("/api/math-tutoring"), TRACKED_LESSON).andExpect(status().isOk()));
        assertThat(read(send(other, get("/api/math-tutoring"), null)).isEmpty()).isTrue();
        send(other, patch("/api/math-tutoring/" + created.path("id").asLong()), TRACKED_LESSON).andExpect(status().isNotFound());
        assertThat(read(send(owner, get("/api/math-tutoring"), null)).get(0)).isEqualTo(created);
    }

    @Test
    void createsAndSavesEditedLesson() throws Exception {
        user("ayse", Role.USER);
        var session = login("ayse", "Sifre1234");
        var created = read(send(session, post("/api/math-tutoring"), """
                {"date":"2026-10-12","start":"09:00","end":"10:00",
                 "topic":"İlk konu","homework":"","status":"PLANNED","note":""}
                """).andExpect(status().isOk()));
        long id = created.get("id").asLong();

        var saved = read(send(session, patch("/api/math-tutoring/" + id), """
                {"date":"2026-10-13","start":"10:30","end":"12:00",
                 "topic":"Yeni konu","homework":"Ödev","status":"COMPLETED","note":"Tekrar"}
                """).andExpect(status().isOk()));
        assertThat(saved.get("topic").asText()).isEqualTo("Yeni konu");
        assertThat(saved.get("status").asText()).isEqualTo("COMPLETED");

        var stored = read(send(session, get("/api/math-tutoring"), null)).get(0);
        assertThat(stored.get("id").asLong()).isEqualTo(id);
        assertThat(stored.get("date").asText()).isEqualTo("2026-10-13");
        assertThat(stored.get("start").asText()).startsWith("10:30");
        assertThat(stored.get("end").asText()).startsWith("12:00");
        assertThat(stored.get("topic").asText()).isEqualTo("Yeni konu");
        assertThat(stored.get("homework").asText()).isEqualTo("Ödev");
        assertThat(stored.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(stored.get("note").asText()).isEqualTo("Tekrar");
    }
}
