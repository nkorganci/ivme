package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.admin.AdminUsageService;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AdminUsageTest extends TestBase {
    @Autowired AdminUsageService usage;

    @Test
    void yerel_donem_toplamlari_tekil_aktif_kullanici_ve_cevabi_ayri_sayar() throws Exception {
        User ayse = user("ayse", Role.USER);
        User mehmet = user("mehmet", Role.USER);
        user("yonetici", Role.ADMIN);
        Question q = question("USAGE", "Türkçe", "A");
        jdbc.update("""
                INSERT INTO study_sessions(user_id,mode,selection_mode,status,started_at)
                VALUES (?,'PRACTICE','MIXED','COMPLETED','2026-03-08T06:00:00Z')
                """, ayse.getId());
        jdbc.update("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,
                                              selected_answer,correct_answer,is_correct,created_at)
                VALUES (?,?,?,'ANSWER','A','A',true,'2026-03-08T07:00:00Z')
                """, mehmet.getId(), q.getId(), UUID.randomUUID());
        jdbc.update("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,
                                              selected_answer,correct_answer,is_correct,created_at)
                VALUES (?,?,?,'ANSWER','A','A',true,'2026-03-09T04:00:00Z')
                """, mehmet.getId(), q.getId(), UUID.randomUUID());
        Long examId = jdbc.queryForObject("""
                INSERT INTO exams(user_id,title,status,question_count,started_at,submitted_at)
                VALUES (?,'Deneme','SUBMITTED',1,'2026-03-07T23:00:00Z','2026-03-08T08:00:00Z')
                RETURNING id
                """, Long.class, ayse.getId());
        jdbc.update("""
                INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,
                                           selected_answer,correct_answer,is_correct)
                VALUES (?,?,1,?,'Türkçe','A','A',true)
                """, examId, q.getId(), q.getCode());

        var result = usage.usageAt(com.hedefyks.progress.ProgressService.Period.DAY,
                "America/New_York", Instant.parse("2026-03-08T16:00:00Z"));
        assertThat(result.startsAt()).isEqualTo(Instant.parse("2026-03-08T05:00:00Z"));
        assertThat(result.endsAt()).isEqualTo(Instant.parse("2026-03-09T04:00:00Z"));
        assertThat(result.activeUsers()).isEqualTo(2);
        assertThat(result.studySessions()).isEqualTo(1);
        assertThat(result.examsStarted()).isZero();
        assertThat(result.answersSubmitted()).isEqualTo(2);

        User[] extra = {user("ogrenci3", Role.USER), user("ogrenci4", Role.USER), user("ogrenci5", Role.USER)};
        for (User student : new User[]{ayse, mehmet, extra[0], extra[1], extra[2]}) {
            jdbc.update("""
                    INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,
                                                  selected_answer,correct_answer,is_correct)
                    VALUES (?,?,?,'ANSWER','A','A',true)
                    """, student.getId(), q.getId(), UUID.randomUUID());
        }
        var admin = login("yonetici", "Sifre1234");
        send(admin, get("/api/admin/stats"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userCount").value(5))
                .andExpect(jsonPath("$.submittedExamCount").isEmpty())
                .andExpect(jsonPath("$.usage.activeUsers").value(5))
                .andExpect(jsonPath("$.usage.answersSubmitted").value(5))
                .andExpect(jsonPath("$.usage.studySessions").isEmpty());
        send(login("ayse", "Sifre1234"), get("/api/admin/stats"), null)
                .andExpect(status().isForbidden());
    }
}
