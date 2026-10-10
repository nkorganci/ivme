package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.progress.RecommendationService;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class RecommendationTest extends TestBase {
    @Autowired RecommendationService recommendations;

    private long node(String kind, Long parent, String name) {
        return jdbc.queryForObject("""
                INSERT INTO taxonomy_nodes(kind,parent_id,code,name) VALUES (?,?,?,?) RETURNING id
                """, Long.class, kind, parent, UUID.randomUUID().toString(), name);
    }

    private void attempt(User user, Question question, long type, boolean correct, String at) {
        Long id = jdbc.queryForObject("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,
                                              selected_answer,correct_answer,is_correct,active_seconds,created_at)
                VALUES (?,?,?,'ANSWER',?,'A',?,45,?::timestamptz) RETURNING id
                """, Long.class, user.getId(), question.getId(), UUID.randomUUID(),
                correct ? "A" : "B", correct, at);
        jdbc.update("""
                INSERT INTO attempt_taxonomy_snapshot(attempt_id,node_id,node_kind,node_code,node_name,taxonomy_version)
                SELECT ?,id,'QUESTION_TYPE',code,name,'v1' FROM taxonomy_nodes WHERE id = ?
                """, id, type);
    }

    @Test
    void yetersiz_veri_tani_vermez_ve_onayli_ilk_deneme_zayifligi_aciklar() throws Exception {
        User ayse = user("ayse", Role.USER);
        User mehmet = user("mehmet", Role.USER);
        Instant now = Instant.parse("2026-10-09T12:00:00Z");
        assertThat(recommendations.forSubjectAt(ayse.getId(), "Türkçe", now).status())
                .isEqualTo("INSUFFICIENT_DATA");
        long[] types = new long[3];
        long[] skills = new long[3];
        for (int i = 0; i < 3; i++) {
            long subtopic = node("SUBTOPIC", null, "Alt konu " + i);
            skills[i] = node("SKILL", subtopic, "Beceri " + i);
            types[i] = node("QUESTION_TYPE", skills[i], "Soru tipi " + i);
        }
        jdbc.update("INSERT INTO taxonomy_prerequisites(node_id,prerequisite_id) VALUES (?,?)",
                skills[0], skills[1]);
        for (int group = 0; group < 3; group++) {
            for (int i = 0; i < 10; i++) {
                Question question = question("R-" + group + "-" + i, "Türkçe", "A");
                attempt(ayse, question, types[group], group == 0 ? i < 3 : i < 9,
                        "2026-10-08T12:00:00Z");
                if (group == 0 && i == 0) {
                    attempt(ayse, question, types[group], true, "2026-10-08T12:01:00Z");
                }
                if (group == 0 && i == 1) {
                    attempt(mehmet, question, types[group], false, "2026-10-08T12:00:00Z");
                }
            }
        }
        var result = recommendations.forSubjectAt(ayse.getId(), "Türkçe", now);
        assertThat(result.status()).isEqualTo("SUGGESTIONS");
        assertThat(result.labeledQuestions()).isEqualTo(30);
        assertThat(result.distinctTypes()).isEqualTo(3);
        assertThat(result.suggestions()).hasSize(1);
        var weak = result.suggestions().getFirst();
        assertThat(weak.questionType()).isEqualTo("Soru tipi 0");
        assertThat(weak.questions()).isEqualTo(10);
        assertThat(weak.correct()).isEqualTo(3);
        assertThat(weak.recentWeightedSuccess()).isEqualTo(30);
        assertThat(weak.prerequisite()).isEqualTo("Alt konu 1");
        assertThat(recommendations.forSubjectAt(mehmet.getId(), "Türkçe", now).status())
                .isEqualTo("INSUFFICIENT_DATA");
        send(login("ayse", "Sifre1234"), get("/api/recommendations?subject=Türkçe"), null)
                .andExpect(status().isOk());
        send(login("mehmet", "Sifre1234"), get("/api/recommendations?subject=Türkçe"), null)
                .andExpect(status().isOk());
    }

    @Test
    void sinavdaki_onayli_tip_dahil_olur_basari_yuksekse_oneri_uretilmez() {
        User ayse = user("ayse", Role.USER);
        Instant now = Instant.parse("2026-10-09T12:00:00Z");
        long[] types = new long[3];
        for (int i = 0; i < 3; i++) {
            long subtopic = node("SUBTOPIC", null, "Konu " + i);
            long skill = node("SKILL", subtopic, "Beceri " + i);
            types[i] = node("QUESTION_TYPE", skill, "Tip " + i);
        }
        for (int group = 0; group < 3; group++) {
            for (int i = 0; i < 10; i++) {
                Question q = question("HIGH-" + group + "-" + i, "Türkçe", "A");
                if (group == 0 && i == 0) {
                    jdbc.update("""
                            INSERT INTO question_taxonomy(question_id,node_id,source,approval_status,taxonomy_version)
                            VALUES (?,?,'HUMAN','APPROVED','v1')
                            """, q.getId(), types[group]);
                    Long examId = jdbc.queryForObject("""
                            INSERT INTO exams(user_id,title,subject,status,question_count,submitted_at)
                            VALUES (?,'Deneme','Türkçe','SUBMITTED',1,'2026-10-08T12:00:00Z') RETURNING id
                            """, Long.class, ayse.getId());
                    jdbc.update("""
                            INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,
                                                       selected_answer,correct_answer,is_correct)
                            VALUES (?,?,1,?,'Türkçe','A','A',true)
                            """, examId, q.getId(), q.getCode());
                } else {
                    attempt(ayse, q, types[group], true, "2026-10-08T12:00:00Z");
                }
            }
        }
        var result = recommendations.forSubjectAt(ayse.getId(), "Türkçe", now);
        assertThat(result.labeledQuestions()).isEqualTo(30);
        assertThat(result.status()).isEqualTo("NO_CLEAR_WEAKNESS");
        assertThat(result.suggestions()).isEmpty();
    }
}
