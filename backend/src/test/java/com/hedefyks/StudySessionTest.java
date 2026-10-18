package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.Role;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StudySessionTest extends TestBase {

    @Test
    void yarimKalanListeOturumdakiTekilYanitlariSayarVeDevamSorusuIleDenemeleriGetirir() throws Exception {
        for (int i = 1; i <= 4; i++) question("Y-" + i, "Türkçe", "A");
        var owner = user("ayse", Role.USER);
        var other = user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        String path = "/api/study-sessions/unfinished";
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        send(ayse, get(path), null).andExpect(jsonPath("$.length()").value(0));
        JsonNode practice = selected(ayse, "MIXED", 4, "Türkçe");
        long id = practice.path("id").asLong();
        JsonNode qs = practice.path("questions");
        // Repeated answers count once; a wrong answer is still an answered question.
        for (String answer : new String[]{"B", "A"})
            send(ayse, post("/api/questions/" + qs.get(0).path("questionId").asLong() + "/practice"),
                    event(UUID.randomUUID(), "ANSWER", answer, id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + qs.get(1).path("questionId").asLong() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "B", id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + qs.get(2).path("questionId").asLong() + "/practice"),
                event(UUID.randomUUID(), "REVEAL", null, id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + qs.get(3).path("questionId").asLong() + "/practice"),
                event(UUID.randomUUID(), "SKIP", null, id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + qs.get(3).path("questionId").asLong() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "A", null)).andExpect(status().isOk());

        long exam = jdbc.queryForObject("INSERT INTO exams(user_id,title,question_count) VALUES (?,'TYT denemesi',4) RETURNING id", Long.class, owner.getId());
        for (int i = 0; i < 4; i++) jdbc.update("""
                INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,selected_answer)
                VALUES (?,?,?,?,?,?)
                """, exam, qs.get(i).path("questionId").asLong(), i + 1, qs.get(i).path("code").asText(), "Türkçe", i < 2 ? "B" : null);
        jdbc.update("INSERT INTO exams(user_id,title,question_count,status) VALUES (?,'Biten',4,'SUBMITTED')", owner.getId());
        long otherPractice = selected(mehmet, "MIXED", 1, "Türkçe").path("id").asLong();
        jdbc.update("INSERT INTO exams(user_id,title,question_count) VALUES (?,'Başkasının denemesi',4)", other.getId());

        send(ayse, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].kind").value("EXAM"))
                .andExpect(jsonPath("$[0].id").value(exam))
                .andExpect(jsonPath("$[0].title").value("TYT denemesi"))
                .andExpect(jsonPath("$[0].questionCount").value(4))
                .andExpect(jsonPath("$[0].solvedCount").value(2))
                .andExpect(jsonPath("$[1].id").value(id))
                .andExpect(jsonPath("$[1].title").value("TYT · Türkçe · Konu pratiği"))
                .andExpect(jsonPath("$[1].questionCount").value(4))
                .andExpect(jsonPath("$[1].solvedCount").value(2))
                .andExpect(jsonPath("$[1].resumeQuestionCode").value(qs.get(1).path("code").asText()))
                .andExpect(jsonPath("$[1].resumeQuestionBank").value("CIKMIS"));
        send(mehmet, get(path), null).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(otherPractice));
        send(ayse, post("/api/study-sessions/" + id + "/finish"), null).andExpect(status().isOk());
        jdbc.update("UPDATE exams SET status='SUBMITTED' WHERE id=?", exam);
        send(ayse, get(path), null).andExpect(jsonPath("$.length()").value(0));

        long expired = selected(ayse, "MIXED", 1, "Türkçe").path("id").asLong();
        jdbc.update("UPDATE study_sessions SET time_limit_seconds=60,started_at=now()-interval '2 minutes' WHERE id=?", expired);
        send(ayse, get(path), null).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void bitmemisPratikOzetiYalnizOgrencininAcikVeSuresiDolmamisOturumlariniSayar() throws Exception {
        question("U-1", "Türkçe", "B");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        String path = "/api/study-sessions/unfinished-summary";

        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        send(ayse, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.latestSessionId").doesNotExist());
        long first = selected(ayse, "MIXED", 1, "Türkçe").get("id").asLong();
        send(ayse, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.latestSessionId").value(first));
        long second = selected(ayse, "MIXED", 1, "Türkçe").get("id").asLong();
        long completed = selected(ayse, "MIXED", 1, "Türkçe").get("id").asLong();
        send(ayse, post("/api/study-sessions/" + completed + "/finish"), null).andExpect(status().isOk());
        String timed = request(UUID.randomUUID(), "Türkçe", 1)
                .replace("\"clientRequestId\"", "\"durationMinutes\":1,\"clientRequestId\"");
        long expired = read(send(ayse, post("/api/study-sessions"), timed)
                .andExpect(status().isCreated())).get("id").asLong();
        jdbc.update("update study_sessions set started_at = now() - interval '2 minutes' where id = ?", expired);
        long other = selected(mehmet, "MIXED", 1, "Türkçe").get("id").asLong();

        send(ayse, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2)).andExpect(jsonPath("$.latestSessionId").value(second))
                .andExpect(jsonPath("$.questions").doesNotExist());
        send(mehmet, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.latestSessionId").value(other));
        assertThat(jdbc.queryForObject("select status from study_sessions where id = ?", String.class, expired))
                .isEqualTo("COMPLETED");
        send(ayse, post("/api/study-sessions/" + second + "/finish"), null).andExpect(status().isOk());
        send(ayse, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.latestSessionId").value(first));
        send(ayse, post("/api/study-sessions/" + first + "/finish"), null).andExpect(status().isOk());
        send(ayse, get(path), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0)).andExpect(jsonPath("$.latestSessionId").doesNotExist());
    }

    @Test
    void oturumTekilSiraylaKaydedilirTekrarlanirVeYalnizSahibiAcabilir() throws Exception {
        question("P-1", "Türkçe", "B");
        question("P-2", "Türkçe", "A");
        question("P-3", "Matematik", "C");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        UUID key = UUID.randomUUID();
        String body = request(key, "Türkçe", 2);

        mvc.perform(get("/api/study-sessions/active").session(ayse)).andExpect(status().isNoContent());
        JsonNode created = read(send(ayse, post("/api/study-sessions"), body).andExpect(status().isCreated()));
        long id = created.get("id").asLong();
        assertThat(created.get("questionCount").asInt()).isEqualTo(2);
        assertThat(created.toString()).doesNotContain("correctAnswer");
        Set<Long> ids = new HashSet<>();
        for (JsonNode item : created.get("questions")) ids.add(item.get("questionId").asLong());
        assertThat(ids).hasSize(2);
        assertThat(created.at("/questions/0/position").asInt()).isEqualTo(1);
        assertThat(created.at("/questions/1/position").asInt()).isEqualTo(2);

        JsonNode again = read(send(ayse, post("/api/study-sessions"), body).andExpect(status().isCreated()));
        assertSameSession(again, created);
        assertThat(jdbc.queryForObject("select count(*) from study_sessions", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from session_questions", Integer.class)).isEqualTo(2);
        mvc.perform(get("/api/study-sessions/" + id).session(ayse)).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].questionId").value(created.at("/questions/0/questionId").asLong()));
        mvc.perform(get("/api/study-sessions/active").session(ayse)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/api/study-sessions/" + id).session(mehmet)).andExpect(status().isNotFound());
        mvc.perform(get("/api/study-sessions/active").session(mehmet)).andExpect(status().isNoContent());
    }

    @Test
    void azSoruVeGecersizSayiOturumOlusturmaz() throws Exception {
        question("P-1", "Türkçe", "B");
        user("ayse", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Matematik", 1))
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 2))
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 0))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.alanlar.questionCount").exists());
        assertThat(jdbc.queryForObject("select count(*) from study_sessions", Integer.class)).isZero();
    }

    @Test
    void denemeYalnizOturumSorusunaBaglanirVeDurumSonTuraGoreKalir() throws Exception {
        var one = question("P-1", "Türkçe", "B");
        var two = question("P-2", "Türkçe", "A");
        var outside = question("P-3", "Matematik", "C");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");

        // Daha önce bağımsız çözülen soru yeni oturumun yanıtını açığa çıkarmaz.
        send(ayse, post("/api/questions/" + one.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "B", null)).andExpect(status().isOk());
        JsonNode created = read(send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 2))
                .andExpect(status().isCreated()));
        long id = created.get("id").asLong();
        assertThat(created.at("/questions/0/status").asText()).isEqualTo("NOT_STARTED");
        send(ayse, get("/api/questions/" + one.getId() + "/practice?sessionId=" + id), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.attempts.length()").value(0))
                .andExpect(jsonPath("$.correctAnswer").doesNotExist());

        String onePath = "/api/questions/" + one.getId() + "/practice";
        send(ayse, post("/api/questions/" + outside.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "A", id)).andExpect(status().isNotFound());
        send(mehmet, post(onePath), event(UUID.randomUUID(), "ANSWER", "A", id))
                .andExpect(status().isNotFound());
        UUID wrongId = UUID.randomUUID();
        send(ayse, post(onePath), event(wrongId, "ANSWER", "A", id)).andExpect(status().isOk());
        send(ayse, post(onePath), event(wrongId, "ANSWER", "A", id)).andExpect(status().isOk());
        send(ayse, post(onePath), event(wrongId, "ANSWER", "A", null)).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from question_attempts where session_id = ?", Integer.class, id))
                .isEqualTo(1);
        JsonNode progress = read(send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk()));
        assertThat(progress.get("questions").findValuesAsText("status"))
                .containsExactlyInAnyOrder("IN_PROGRESS", "NOT_STARTED");
        send(ayse, post(onePath), event(UUID.randomUUID(), "ANSWER", "B", null)).andExpect(status().isOk());
        JsonNode afterIndependent = read(send(ayse, get("/api/study-sessions/" + id), null)
                .andExpect(status().isOk()));
        assertThat(afterIndependent.get("questions").findValuesAsText("status"))
                .containsExactlyInAnyOrder("IN_PROGRESS", "NOT_STARTED");
        send(ayse, post(onePath), event(UUID.randomUUID(), "REVEAL", null, id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + two.getId() + "/practice"),
                event(UUID.randomUUID(), "SKIP", null, id)).andExpect(status().isOk());
        JsonNode done = read(send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk()));
        assertThat(done.get("questions").findValuesAsText("status")).containsExactlyInAnyOrder("COMPLETED", "COMPLETED");
        send(ayse, get(onePath), null).andExpect(jsonPath("$.attempts.length()").value(1));
        send(mehmet, get(onePath + "?sessionId=" + id), null).andExpect(status().isNotFound());
    }

    @Test
    void dortSecimModuAyniAdayTaniminiKullanirVeFiltreSaklanir() throws Exception {
        var wrong = question("P-1", "Türkçe", "B");
        var correct = question("P-2", "Türkçe", "A");
        var fresh = question("P-3", "Türkçe", "C");
        question("P-4", "Matematik", "D");
        user("ayse", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        send(ayse, post("/api/questions/" + wrong.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "A", null)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + correct.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "A", null)).andExpect(status().isOk());

        JsonNode newSession = selected(ayse, "NEW", 1, "Türkçe");
        assertThat(newSession.at("/questions/0/questionId").asLong()).isEqualTo(fresh.getId());
        assertThat(newSession.at("/selectionMode").asText()).isEqualTo("NEW");
        assertThat(newSession.at("/subject").asText()).isEqualTo("Türkçe");
        assertThat(newSession.at("/topic").asText()).isEqualTo("Konu");
        assertThat(newSession.at("/bank").asText()).isEqualTo("CIKMIS");
        assertThat(newSession.at("/examType").asText()).isEqualTo("TYT");
        JsonNode reloaded = read(send(ayse, get("/api/study-sessions/" + newSession.get("id").asLong()), null)
                .andExpect(status().isOk()));
        assertSameSession(reloaded, newSession);

        JsonNode wrongSession = selected(ayse, "WRONG", 1, "Türkçe");
        assertThat(wrongSession.at("/questions/0/questionId").asLong()).isEqualTo(wrong.getId());
        JsonNode repeat = selected(ayse, "REPEAT", 2, "Türkçe");
        assertThat(repeat.get("questions").findValuesAsText("questionId")).hasSize(2);
        assertThat(repeat.get("questions").toString()).doesNotContain("P-3", "P-4");
        JsonNode mixed = selected(ayse, "MIXED", 3, "Türkçe");
        assertThat(mixed.get("questionCount").asInt()).isEqualTo(3);

        send(ayse, post("/api/study-sessions"), selectedRequest("NEW", 2, "Türkçe"))
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/study-sessions"), selectedRequest("WRONG", 2, "Türkçe"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sureliPratikSunucuSaatindeBiterVeSonucDenemeAninaSabitlenir() throws Exception {
        var one = question("T-1", "Türkçe", "B");
        var two = question("T-2", "Türkçe", "A");
        question("T-3", "Türkçe", "C");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        String body = request(UUID.randomUUID(), "Türkçe", 3).replace("\"clientRequestId\"", "\"durationMinutes\":1,\"clientRequestId\"");
        JsonNode created = read(send(ayse, post("/api/study-sessions"), body).andExpect(status().isCreated()));
        long id = created.get("id").asLong();
        assertThat(created.get("timeLimitSeconds").asInt()).isEqualTo(60);
        assertThat(created.get("deadlineAt").asText()).isNotBlank();
        send(ayse, post("/api/questions/" + one.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "D", id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + one.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "B", id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + two.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "D", id)).andExpect(status().isOk());
        send(mehmet, post("/api/study-sessions/" + id + "/finish"), null).andExpect(status().isNotFound());
        jdbc.update("update study_sessions set started_at = now() - interval '2 minutes' where id = ?", id);
        JsonNode finished = read(send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk()));
        assertThat(finished.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(finished.at("/result/correct").asInt()).isEqualTo(1);
        assertThat(finished.at("/result/wrong").asInt()).isEqualTo(1);
        assertThat(finished.at("/result/blank").asInt()).isEqualTo(1);
        assertThat(finished.at("/result/firstCorrect").asInt()).isEqualTo(1);
        send(ayse, post("/api/questions/" + one.getId() + "/practice"),
                event(UUID.randomUUID(), "ANSWER", "B", id)).andExpect(status().isConflict());
        JsonNode again = read(send(ayse, post("/api/study-sessions/" + id + "/finish"), null)
                .andExpect(status().isOk()));
        assertThat(again.get("endedAt")).isEqualTo(finished.get("endedAt"));
        jdbc.update("update questions set correct_answer = 'A' where id = ?", one.getId());
        JsonNode afterCorrection = read(send(ayse, get("/api/study-sessions/" + id), null).andExpect(status().isOk()));
        assertThat(afterCorrection.get("result")).isEqualTo(finished.get("result"));
        JsonNode history = read(send(ayse, get("/api/study-sessions"), null).andExpect(status().isOk()));
        assertThat(history.at("/content/0/result")).isEqualTo(finished.get("result"));
        mvc.perform(get("/api/study-sessions/active").session(ayse)).andExpect(status().isNoContent());
    }

    @Test
    void erkenBitirmeTekrariVeGecersizSure() throws Exception {
        question("T-1", "Türkçe", "B");
        user("ayse", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        for (int minutes : new int[] {0, 241}) {
            String invalid = request(UUID.randomUUID(), "Türkçe", 1)
                    .replace("\"clientRequestId\"", "\"durationMinutes\":" + minutes + ",\"clientRequestId\"");
            send(ayse, post("/api/study-sessions"), invalid).andExpect(status().isBadRequest());
        }
        String body = request(UUID.randomUUID(), "Türkçe", 1)
                .replace("\"clientRequestId\"", "\"durationMinutes\":5,\"clientRequestId\"");
        long id = read(send(ayse, post("/api/study-sessions"), body).andExpect(status().isCreated()))
                .get("id").asLong();
        JsonNode finished = read(send(ayse, post("/api/study-sessions/" + id + "/finish"), null)
                .andExpect(status().isOk()));
        assertThat(finished.at("/result/blank").asInt()).isEqualTo(1);
        assertThat(read(send(ayse, post("/api/study-sessions/" + id + "/finish"), null)
                .andExpect(status().isOk())).get("endedAt")).isEqualTo(finished.get("endedAt"));

        long untimedId = read(send(ayse, post("/api/study-sessions"),
                request(UUID.randomUUID(), "Türkçe", 1)).andExpect(status().isCreated()))
                .get("id").asLong();
        JsonNode untimed = read(send(ayse, post("/api/study-sessions/" + untimedId + "/finish"), null)
                .andExpect(status().isOk()));
        assertThat(untimed.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(untimed.at("/result/blank").asInt()).isEqualTo(1);
    }

    @Test
    void pratikGecmisiSahibeOzelSiraliVeSuresiDolanOturumuKapatir() throws Exception {
        question("H-1", "Türkçe", "B");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        long old = read(send(ayse, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 1))
                .andExpect(status().isCreated())).get("id").asLong();
        String timed = request(UUID.randomUUID(), "Türkçe", 1)
                .replace("\"clientRequestId\"", "\"durationMinutes\":1,\"clientRequestId\"");
        long expired = read(send(ayse, post("/api/study-sessions"), timed)
                .andExpect(status().isCreated())).get("id").asLong();
        jdbc.update("update study_sessions set started_at = now() - interval '5 minutes' where id = ?", old);
        jdbc.update("update study_sessions set started_at = now() - interval '2 minutes' where id = ?", expired);
        read(send(mehmet, post("/api/study-sessions"), request(UUID.randomUUID(), "Türkçe", 1))
                .andExpect(status().isCreated()));
        JsonNode history = read(send(ayse, get("/api/study-sessions?page=0&size=1"), null)
                .andExpect(status().isOk()));
        assertThat(history.at("/totalElements").asInt()).isEqualTo(2);
        assertThat(history.at("/totalPages").asInt()).isEqualTo(2);
        assertThat(history.at("/content/0/id").asLong()).isEqualTo(expired);
        assertThat(history.at("/content/0/status").asText()).isEqualTo("COMPLETED");
        assertThat(history.at("/content/0/questionCount").asInt()).isEqualTo(1);
        assertThat(history.at("/content/0/subject").asText()).isEqualTo("Türkçe");
        assertThat(history.at("/content/0/result/blank").asInt()).isEqualTo(1);
        JsonNode next = read(send(ayse, get("/api/study-sessions?page=1&size=1"), null)
                .andExpect(status().isOk()));
        assertThat(next.at("/content/0/id").asLong()).isEqualTo(old);
        assertThat(next.at("/content/0/status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(next.at("/content/0/result").isNull()).isTrue();
        assertThat(read(send(mehmet, get("/api/study-sessions"), null)
                .andExpect(status().isOk())).at("/totalElements").asInt()).isEqualTo(1);
        send(mehmet, get("/api/study-sessions/" + old), null).andExpect(status().isNotFound());
    }

    @Test
    void gecmisIlkVeSonTuruAyirirAtlananVeYanitlanmayanSoruyuBosSayar() throws Exception {
        var one = question("H-1", "Türkçe", "B");
        var two = question("H-2", "Türkçe", "A");
        question("H-3", "Türkçe", "C");
        user("ayse", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        long id = selected(ayse, "MIXED", 3, "Türkçe").get("id").asLong();
        String path = "/api/questions/" + one.getId() + "/practice";
        send(ayse, post(path), event(UUID.randomUUID(), "ANSWER", "A", id)).andExpect(status().isOk());
        send(ayse, post(path), event(UUID.randomUUID(), "REVEAL", null, id)).andExpect(status().isOk());
        send(ayse, post(path), event(UUID.randomUUID(), "ANSWER", "B", id)).andExpect(status().isOk());
        send(ayse, post("/api/questions/" + two.getId() + "/practice"), event(UUID.randomUUID(), "SKIP", null, id))
                .andExpect(status().isOk());
        assertThat(read(send(ayse, get("/api/study-sessions"), null).andExpect(status().isOk()))
                .at("/content/0/result").isNull()).isTrue();
        JsonNode finished = read(send(ayse, post("/api/study-sessions/" + id + "/finish"), null)
                .andExpect(status().isOk()));
        JsonNode item = read(send(ayse, get("/api/study-sessions"), null).andExpect(status().isOk()))
                .at("/content/0");
        assertThat(item.get("result")).isEqualTo(finished.get("result"));
        assertThat(item.at("/result/correct").asInt()).isEqualTo(1);
        assertThat(item.at("/result/wrong").asInt()).isZero();
        assertThat(item.at("/result/blank").asInt()).isEqualTo(2);
        assertThat(item.at("/result/firstCorrect").asInt()).isZero();
        assertThat(item.at("/result/firstWrong").asInt()).isEqualTo(1);
        assertThat(item.at("/result/firstBlank").asInt()).isEqualTo(2);
        assertThat(item.path("topic").asText()).isEqualTo("Konu");
    }

    private JsonNode selected(org.springframework.mock.web.MockHttpSession session, String mode, int count,
                              String subject) throws Exception {
        return read(send(session, post("/api/study-sessions"), selectedRequest(mode, count, subject))
                .andExpect(status().isCreated()));
    }

    private static void assertSameSession(JsonNode actual, JsonNode expected) {
        var a = actual.deepCopy();
        var b = expected.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) a).remove("serverNow");
        ((com.fasterxml.jackson.databind.node.ObjectNode) b).remove("serverNow");
        assertThat(a).isEqualTo(b);
    }

    private static String selectedRequest(String mode, int count, String subject) {
        return "{\"bank\":\"CIKMIS\",\"examType\":\"TYT\",\"topic\":\"Konu\",\"subject\":\"" + subject
                + "\",\"questionCount\":" + count + ",\"selectionMode\":\"" + mode
                + "\",\"clientRequestId\":\"" + UUID.randomUUID() + "\"}";
    }

    private static String event(UUID key, String type, String answer, Long sessionId) {
        return "{\"clientEventId\":\"" + key + "\",\"eventType\":\"" + type + "\",\"answer\":"
                + (answer == null ? "null" : "\"" + answer + "\"") + ",\"sessionId\":" + sessionId + "}";
    }

    private static String request(UUID key, String subject, int count) {
        return "{\"subject\":\"" + subject + "\",\"questionCount\":" + count
                + ",\"clientRequestId\":\"" + key + "\"}";
    }
}
