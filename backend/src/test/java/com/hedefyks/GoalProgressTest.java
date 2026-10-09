package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.progress.GoalService;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class GoalProgressTest extends TestBase {
    @Autowired GoalService goals;

    private long goal(User user, String metric, String subject) {
        return jdbc.queryForObject("""
                INSERT INTO goals(user_id,period,metric,subject,target_count,starts_on,ends_on,zone_id,created_at)
                VALUES (?,'DAY',?,?,3,'2026-03-08','2026-03-08','America/New_York',
                        '2026-03-08T05:00:00Z') RETURNING id
                """, Long.class, user.getId(), metric, subject);
    }

    private void answer(User user, Question question, String at) {
        jdbc.update("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,
                                              selected_answer,correct_answer,is_correct,created_at)
                VALUES (?,?,?,'ANSWER','A','A',true,?::timestamptz)
                """, user.getId(), question.getId(), UUID.randomUUID(), at);
    }

    @Test
    void tekil_ilk_soru_tekrar_ve_oturumlar_cift_sayilmaz_yerel_gun_siniri_korunur() {
        User ayse = user("ayse", Role.USER);
        User mehmet = user("mehmet", Role.USER);
        Question previous = question("PREVIOUS", "Türkçe", "A");
        Question current = question("CURRENT", "Türkçe", "A");
        Question examQuestion = question("EXAM-QUESTION", "Türkçe", "A");
        Question outside = question("OUTSIDE", "Türkçe", "A");
        answer(ayse, previous, "2026-03-08T04:59:00Z");
        answer(ayse, previous, "2026-03-08T06:00:00Z");
        answer(ayse, current, "2026-03-08T07:00:00Z");
        answer(ayse, current, "2026-03-08T08:00:00Z");
        answer(ayse, outside, "2026-03-09T04:00:00Z"); // NY'de ertesi gece yarısı
        answer(mehmet, current, "2026-03-08T09:00:00Z");
        Long examId = jdbc.queryForObject("""
                INSERT INTO exams(user_id,title,subject,status,question_count,started_at,submitted_at)
                VALUES (?,'Deneme','Türkçe','SUBMITTED',1,'2026-03-08T06:00:00Z',
                        '2026-03-08T10:00:00Z') RETURNING id
                """, Long.class, ayse.getId());
        jdbc.update("""
                INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,
                                           selected_answer,correct_answer,is_correct)
                VALUES (?,?,1,?,'Türkçe','A','A',true)
                """, examId, examQuestion.getId(), examQuestion.getCode());
        jdbc.update("""
                INSERT INTO study_sessions(user_id,mode,selection_mode,status,time_limit_seconds,
                                           filter_subject,started_at,ended_at)
                VALUES (?,'PRACTICE','MIXED','COMPLETED',600,'Türkçe',
                        '2026-03-08T06:00:00Z','2026-03-08T11:00:00Z')
                """, ayse.getId());

        Instant now = Instant.parse("2026-03-09T05:00:00Z");
        var unique = goals.getAt(ayse.getId(), goal(ayse, "UNIQUE_QUESTIONS", "Türkçe"), now);
        assertThat(unique.progressCount()).isEqualTo(2);
        assertThat(unique.remainingCount()).isEqualTo(1);
        assertThat(goals.getAt(ayse.getId(), goal(ayse, "ATTEMPTS", "Türkçe"), now).progressCount())
                .isEqualTo(4);
        assertThat(goals.getAt(ayse.getId(), goal(ayse, "TESTS", "Türkçe"), now).progressCount())
                .isEqualTo(1);
        assertThat(goals.getAt(ayse.getId(), goal(ayse, "EXAMS", "Türkçe"), now).progressCount())
                .isEqualTo(1);
        assertThat(goals.getAt(ayse.getId(), goal(ayse, "ATTEMPTS", "Matematik"), now).progressCount())
                .isZero();
        assertThat(goals.getAt(mehmet.getId(), goal(mehmet, "UNIQUE_QUESTIONS", null), now).progressCount())
                .isEqualTo(1);
    }

    @Test
    void durdurma_aninda_ilerleme_donar_ve_yaz_saati_gunu_23_saattir() {
        User ayse = user("ayse", Role.USER);
        Question first = question("FIRST", "Matematik", "A");
        Question later = question("LATER", "Matematik", "A");
        answer(ayse, first, "2026-03-08T06:00:00Z");
        answer(ayse, later, "2026-03-08T08:00:00Z");
        long id = goal(ayse, "UNIQUE_QUESTIONS", null);
        assertThat(goals.getAt(ayse.getId(), id, Instant.parse("2026-03-08T07:00:00Z"))
                .progressCount()).isEqualTo(1);
        jdbc.update("UPDATE goals SET status = 'ENDED', stopped_at = '2026-03-08T07:30:00Z' WHERE id = ?", id);
        assertThat(goals.getAt(ayse.getId(), id, Instant.parse("2026-03-09T05:00:00Z"))
                .progressCount()).isEqualTo(1);
    }
}
