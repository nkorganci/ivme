package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class HintFlowTest extends TestBase {

    @Test
    void taslakGizliKalirVeSinavAciklamasiTeslimdenOnceSizmaz() throws Exception {
        Question q = question("H-1", "Türkçe", "B");
        user("ayse", Role.USER);
        user("ali", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession ali = login("ali", "Sifre1234");

        send(ayse, get("/api/questions/" + q.getId() + "/hint"), null)
                .andExpect(status().isNoContent());
        jdbc.update("""
                INSERT INTO taxonomy_nodes(kind, code, name)
                VALUES ('QUESTION_TYPE', 'tyt.turkce.tip.hint_flow_test', 'Test tipi')
                ON CONFLICT DO NOTHING
                """);
        Long node = jdbc.queryForObject("SELECT id FROM taxonomy_nodes WHERE code = 'tyt.turkce.tip.hint_flow_test'", Long.class);
        jdbc.update("""
                INSERT INTO question_taxonomy(question_id, node_id, source, approval_status, taxonomy_version)
                VALUES (?, ?, 'HUMAN', 'APPROVED', 'test-v1')
                """, q.getId(), node);
        jdbc.update("""
                INSERT INTO question_hints(question_id, image_sha256, taxonomy_version, question_type_code,
                    note_id, note_review_version, catalog_id, pdf_sha256, source_page,
                    pre_answer_hint, post_submission_explanation)
                VALUES (?, repeat('a',64), 'test-v1', 'tyt.turkce.tip.hint_flow_test',
                    'ogm-note:test', 1, 1099, repeat('b',64), 1,
                    'Kuralı düşün.', 'Bu kural kaynak sayfada açıklanır.')
                """, q.getId());
        send(ayse, get("/api/questions/" + q.getId() + "/hint"), null)
                .andExpect(status().isNoContent());
        jdbc.update("""
                UPDATE question_hints SET review_status = 'APPROVED', reviewer_id = 'editor-test',
                    reviewed_at = now(), answer_leak_checked = true WHERE question_id = ?
                """, q.getId());

        var hint = send(ayse, get("/api/questions/" + q.getId() + "/hint"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.text").value("Kuralı düşün."));
        assertThat(hint.andReturn().getResponse().getContentAsString())
                .doesNotContain("kaynak sayfada", "correctAnswer");
        send(ayse, get("/api/questions/" + q.getId() + "/explanation"), null)
                .andExpect(status().isNotFound());

        long examId = read(send(ayse, post("/api/exams"), "{\"questionCount\":1}"))
                .get("id").asLong();
        send(ayse, get("/api/questions/" + q.getId() + "/hint"), null)
                .andExpect(status().isNotFound());
        send(ayse, get("/api/exams/" + examId + "/questions/" + q.getId() + "/explanation"), null)
                .andExpect(status().isConflict());
        send(ali, get("/api/exams/" + examId + "/questions/" + q.getId() + "/explanation"), null)
                .andExpect(status().isNotFound());
        send(ayse, post("/api/exams/" + examId + "/submit"), null)
                .andExpect(status().isOk());
        send(ayse, get("/api/exams/" + examId + "/questions/" + q.getId() + "/explanation"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Bu kural kaynak sayfada açıklanır."))
                .andExpect(jsonPath("$.sourcePdfUrl").value("/konu-anlatimlari/1099#page=1"));
        jdbc.update("UPDATE question_taxonomy SET approval_status = 'PROPOSED' WHERE question_id = ?", q.getId());
        send(ayse, get("/api/exams/" + examId + "/questions/" + q.getId() + "/explanation"), null)
                .andExpect(status().isNoContent());
    }
}
