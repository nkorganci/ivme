package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AccountDataTest extends TestBase {
    @Test
    void studentExportsOnlyOwnDataThenDeletesItWithoutTouchingSharedQuestionsOrAnotherStudent() throws Exception {
        Question question = question("DATA-Q", "Türkçe", "A");
        User owner = user("ownerdata", Role.USER);
        User other = user("otherdata", Role.USER);
        var ownerSession = login("ownerdata", "Sifre1234");
        long examId = jdbc.queryForObject("INSERT INTO exams(user_id,title,question_count) "
                + "VALUES (?, 'Kendi sınavım', 1) RETURNING id", Long.class, owner.getId());
        jdbc.update("INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject) "
                + "VALUES (?,?,?,?,?)", examId, question.getId(), 1, question.getCode(), "Türkçe");
        long studyId = jdbc.queryForObject("INSERT INTO study_sessions(user_id,mode,selection_mode) "
                + "VALUES (?,'PRACTICE','MIXED') RETURNING id", Long.class, owner.getId());
        jdbc.update("INSERT INTO session_questions(session_id,question_id,position) VALUES (?,?,1)", studyId,
                question.getId());
        jdbc.update("INSERT INTO question_attempts(user_id,question_id,session_id,client_event_id,event_type,"
                + "selected_answer,correct_answer,is_correct) VALUES (?,?,?,?,'ANSWER','A','A',true)",
                owner.getId(), question.getId(), studyId, UUID.randomUUID());
        jdbc.update("INSERT INTO question_boards(user_id,question_id,strokes_json) VALUES (?,?,?)",
                owner.getId(), question.getId(), "[]");
        jdbc.update("INSERT INTO feedback(user_id,question_id,category,message) VALUES (?,?,'QUESTION_ISSUE',?)",
                owner.getId(), question.getId(), "Kendi notum");
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type) VALUES (?,?,'ACTIVE')",
                owner.getId(), UUID.randomUUID());
        jdbc.update("INSERT INTO curriculum_topic_progress(user_id,topic_id) VALUES (?,?)",
                owner.getId(), "tyt.matematik.sayi-basamaklari");
        long lessonId = jdbc.queryForObject("""
                INSERT INTO math_tutoring_lessons(user_id,lesson_date,start_time,end_time,topic,homework,status,note)
                VALUES (?,'2026-10-15','09:00','10:00','Fonksiyonlar','Test 1','PLANNED','Kendi ders notum') RETURNING id
                """, Long.class, owner.getId());
        jdbc.update("INSERT INTO math_tutoring_files(lesson_id,original_name,content_type,content) VALUES (?,?,?,?)",
                lessonId, "odev.txt", "text/plain", "Kendi dosyam".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        jdbc.update("INSERT INTO feedback(user_id,question_id,category,message) VALUES (?,?,'QUESTION_ISSUE',?)",
                other.getId(), question.getId(), "Başka kullanıcı notu");

        send(ownerSession, post("/api/account/export"), "{\"currentPassword\":\"yanlış\"}")
                .andExpect(status().isBadRequest());
        String raw = send(ownerSession, post("/api/account/export"),
                "{\"currentPassword\":\"Sifre1234\"}").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode data = json.readTree(raw);
        assertThat(raw).contains("Kendi notum").doesNotContain("Başka kullanıcı notu", "passwordHash", "password_hash");
        assertThat(data.get("exams").size()).isEqualTo(1);
        assertThat(data.get("examQuestions").size()).isEqualTo(1);
        assertThat(data.get("studySessions").size()).isEqualTo(1);
        assertThat(data.get("sessionQuestions").size()).isEqualTo(1);
        assertThat(data.get("questionAttempts").size()).isEqualTo(1);
        assertThat(data.get("questionBoards").size()).isEqualTo(1);
        // login() records LOGIN automatically; the explicit ACTIVE event is exported too.
        assertThat(data.get("activityEvents").size()).isEqualTo(2);
        assertThat(data.get("curriculumTopicProgress").size()).isEqualTo(1);
        assertThat(data.path("mathTutoringLessons").get(0).path("note").asText()).isEqualTo("Kendi ders notum");
        assertThat(data.path("mathTutoringFiles").get(0).path("original_name").asText()).isEqualTo("odev.txt");

        send(ownerSession, post("/api/account/delete"),
                "{\"currentPassword\":\"Sifre1234\",\"confirmation\":\"yanlış\"}")
                .andExpect(status().isBadRequest());
        send(ownerSession, post("/api/account/delete"),
                "{\"currentPassword\":\"yanlış\",\"confirmation\":\"HESABIMI SIL\"}")
                .andExpect(status().isBadRequest());
        send(ownerSession, post("/api/account/delete"),
                "{\"currentPassword\":\"Sifre1234\",\"confirmation\":\"HESABIMI SIL\"}")
                .andExpect(status().isNoContent());
        send(ownerSession, get("/api/auth/me"), null).andExpect(status().isUnauthorized());
        assertThat(users.findById(owner.getId())).isEmpty();
        assertThat(users.findById(other.getId())).isPresent();
        assertThat(questions.findById(question.getId())).isPresent();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM math_tutoring_files WHERE lesson_id = ?",
                Long.class, lessonId)).isZero();
        for (String table : new String[]{"exams", "study_sessions", "question_attempts", "question_boards",
                "feedback", "activity_events", "curriculum_topic_progress", "math_tutoring_lessons"}) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE user_id = ?",
                    Long.class, owner.getId())).isZero();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM feedback WHERE user_id = ?", Long.class,
                other.getId())).isEqualTo(1);
    }

    @Test
    void privilegedAccountsCannotUseStudentDataEndpoints() throws Exception {
        user("datamanager", Role.ADMIN);
        var manager = login("datamanager", "Sifre1234");
        send(manager, post("/api/account/export"), "{\"currentPassword\":\"Sifre1234\"}")
                .andExpect(status().isForbidden());
    }
}
