package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.progress.ProgressService;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;

class ProgressPeriodTest extends TestBase {
    @Autowired ProgressService progress;

    private void attempt(User user, Question q, String at, String answer, String right, Boolean correct) {
        jdbc.update("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,
                                              correct_answer,is_correct,created_at)
                VALUES (?,?,?,'ANSWER',?,?,?,?::timestamptz)
                """, user.getId(), q.getId(), UUID.randomUUID(), answer, right, correct, at);
    }

    @Test
    void ilk_olay_once_siralanir_sonra_yerel_doneme_suzulur() throws Exception {
        User ayse = user("ayse", Role.USER);
        User mehmet = user("mehmet", Role.USER);
        Question before = question("BEFORE", "Türkçe", "A");
        Question today = question("TODAY", "Türkçe", "A");
        Question blank = question("BLANK", "Türkçe", "B");
        attempt(ayse, before, "2026-03-08T04:59:00Z", "A", "A", true); // New York: 7 Mart
        jdbc.update("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,correct_answer,
                                              created_at)
                VALUES (?,?,?,'SKIP','A','2026-03-08T04:58:00Z'::timestamptz)
                """, ayse.getId(), today.getId(), UUID.randomUUID());
        attempt(ayse, today, "2026-03-08T05:01:00Z", "B", "A", false);
        attempt(ayse, today, "2026-03-08T07:00:00Z", "A", "A", true); // tekrar sayılmaz
        attempt(mehmet, blank, "2026-03-08T08:00:00Z", "B", "B", true);
        Long examId = jdbc.queryForObject("""
                INSERT INTO exams(user_id,title,status,question_count,started_at,submitted_at)
                VALUES (?,'Deneme','SUBMITTED',2,'2026-03-08T06:00:00Z','2026-03-08T08:00:00Z') RETURNING id
                """, Long.class, ayse.getId());
        jdbc.update("""
                INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,is_correct)
                VALUES (?,?,?,?,?,NULL)
                """, examId, blank.getId(), 1, blank.getCode(), blank.getSubject());
        jdbc.update("""
                INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,is_correct)
                VALUES (?,?,?,?,?,TRUE)
                """, examId, today.getId(), 2, today.getCode(), today.getSubject());

        Instant now = Instant.parse("2026-03-08T16:00:00Z");
        var day = progress.summaryAt(ayse.getId(), ProgressService.Period.DAY, "America/New_York", now);
        assertThat(day.startsAt()).isEqualTo(Instant.parse("2026-03-08T05:00:00Z"));
        assertThat(day.endsAt()).isEqualTo(Instant.parse("2026-03-09T04:00:00Z")); // 23 saatlik DST günü
        assertThat(day.correct()).isZero();
        assertThat(day.wrong()).isEqualTo(1);
        assertThat(day.blank()).isEqualTo(1);
        assertThat(day.total()).isEqualTo(2);
        for (String kind : new String[]{"SUBJECT", "TOPIC", "QUESTION_TYPE"}) {
            assertThat(day.breakdown().stream().filter(row -> row.kind().equals(kind))
                    .mapToLong(ProgressService.Breakdown::total).sum()).isEqualTo(day.total());
        }
        assertThat(day.breakdown().stream().filter(row -> row.kind().equals("QUESTION_TYPE"))
                .map(ProgressService.Breakdown::label)).containsExactly("Onaylı soru tipi yok");
        assertThat(progress.summaryAt(ayse.getId(), ProgressService.Period.WEEK, "America/New_York", now).correct())
                .isEqualTo(1);
        assertThat(progress.summaryAt(ayse.getId(), ProgressService.Period.MONTH, "America/New_York", now).total())
                .isEqualTo(3);
        assertThat(progress.summaryAt(mehmet.getId(), ProgressService.Period.DAY, "America/New_York", now).total())
                .isEqualTo(1);

        MockHttpSession session = login("ayse", "Sifre1234");
        send(session, get("/api/progress/first-attempts?period=DAY&zone=Invalid/Zone"), null)
                .andExpect(status().isBadRequest());
        send(session, get("/api/progress/first-attempts?period=DAY&zone=America/New_York"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.period").value("DAY"));
    }

    @Test
    void soru_tipi_ilk_pratik_olayinin_onayli_anlik_etiketinden_gelir() {
        User ayse = user("ayse", Role.USER);
        Question q = question("TYPE", "Türkçe", "A");
        String nodeCode = "PARAGRAF_" + UUID.randomUUID();
        Long nodeId = jdbc.queryForObject("""
                INSERT INTO taxonomy_nodes(kind,code,name) VALUES ('QUESTION_TYPE',?,'Paragraf') RETURNING id
                """, Long.class, nodeCode);
        jdbc.update("""
                INSERT INTO question_taxonomy(question_id,node_id,source,approval_status,taxonomy_version)
                VALUES (?,?,'HUMAN','APPROVED','v1')
                """, q.getId(), nodeId);
        attempt(ayse, q, "2026-10-09T12:00:00Z", "A", "A", true);
        Long attemptId = jdbc.queryForObject("SELECT id FROM question_attempts WHERE user_id = ?", Long.class, ayse.getId());
        jdbc.update("""
                INSERT INTO attempt_taxonomy_snapshot(attempt_id,node_id,node_kind,node_code,node_name,taxonomy_version)
                VALUES (?,?,'QUESTION_TYPE',?,'Paragraf','v1')
                """, attemptId, nodeId, nodeCode);
        jdbc.update("UPDATE taxonomy_nodes SET name = 'Sonradan değişen ad' WHERE id = ?", nodeId);
        var result = progress.summaryAt(ayse.getId(), ProgressService.Period.DAY, "Europe/Istanbul",
                Instant.parse("2026-10-09T14:00:00Z"));
        assertThat(result.breakdown().stream().filter(row -> row.kind().equals("QUESTION_TYPE"))
                .map(ProgressService.Breakdown::label)).containsExactly("Paragraf");
    }
}
