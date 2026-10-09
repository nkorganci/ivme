package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class AttemptTaxonomyHelpfulnessTest extends TestBase {
    private String answer() {
        return "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\","
                + "\"answer\":\"A\",\"activeSeconds\":3}";
    }

    @Test
    void sadece_onayli_etiket_anlik_kaydedilir_eski_anlik_kayit_degismez() throws Exception {
        Question q = question("LABEL-1", "Türkçe", "A");
        jdbc.update("DELETE FROM taxonomy_nodes WHERE code IN ('st-unique', 'qt-unique')");
        user("ayse", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        Long approved = jdbc.queryForObject("INSERT INTO taxonomy_nodes(kind,code,name) "
                + "VALUES ('SUBTOPIC','st-unique','Eski alt konu') RETURNING id", Long.class);
        Long proposed = jdbc.queryForObject("INSERT INTO taxonomy_nodes(kind,code,name) "
                + "VALUES ('QUESTION_TYPE','qt-unique','Taslak tip') RETURNING id", Long.class);
        jdbc.update("INSERT INTO question_taxonomy(question_id,node_id,source,approval_status,taxonomy_version) "
                + "VALUES (?,?,'HUMAN','APPROVED','v1')", q.getId(), approved);
        jdbc.update("INSERT INTO question_taxonomy(question_id,node_id,source) VALUES (?,?,'RULE')", q.getId(), proposed);
        String detail = "/api/questions/" + q.getId();
        send(ayse, get(detail), null).andExpect(jsonPath("$.approvedLabels.length()").value(1))
                .andExpect(jsonPath("$.approvedLabels[0].name").value("Eski alt konu"));
        String path = detail + "/practice";
        JsonNode first = read(send(ayse, post(path), answer()).andExpect(status().isOk()));
        assertThat(first.at("/attempts/0/taxonomySnapshot/0/version").asText()).isEqualTo("v1");
        assertThat(first.at("/attempts/0/taxonomySnapshot").size()).isEqualTo(1);
        jdbc.update("UPDATE taxonomy_nodes SET name = 'Yeni alt konu' WHERE id = ?", approved);
        jdbc.update("UPDATE question_taxonomy SET taxonomy_version = 'v2' WHERE node_id = ?", approved);
        send(ayse, get(path), null).andExpect(jsonPath("$.attempts[0].taxonomySnapshot[0].name")
                .value("Eski alt konu"));
        send(ayse, get(detail), null).andExpect(jsonPath("$.approvedLabels[0].name").value("Yeni alt konu"));
    }

    @Test
    void fayda_oyu_cozum_sonrasi_kisi_basina_tektir_ve_diger_ogrenciden_ayridir() throws Exception {
        Question q = question("HELP-1", "Türkçe", "A");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        MockHttpSession ayse = login("ayse", "Sifre1234");
        MockHttpSession mehmet = login("mehmet", "Sifre1234");
        String path = "/api/questions/" + q.getId() + "/helpfulness";
        send(ayse, post(path), "{\"helpful\":true}").andExpect(status().isForbidden());
        send(ayse, post(path), "{\"helpful\":null}").andExpect(status().isBadRequest());
        send(mehmet, post("/api/questions/" + q.getId() + "/practice"), "{\"clientEventId\":\""
                + UUID.randomUUID() + "\",\"eventType\":\"SKIP\",\"activeSeconds\":0}")
                .andExpect(status().isOk());
        send(mehmet, post(path), "{\"helpful\":true}").andExpect(status().isForbidden());
        send(ayse, post("/api/questions/" + q.getId() + "/practice"), answer())
                .andExpect(status().isOk());
        send(ayse, post(path), "{\"helpful\":true}").andExpect(jsonPath("$.helpful").value(1))
                .andExpect(jsonPath("$.mine").value(true));
        send(ayse, post(path), "{\"helpful\":false}").andExpect(jsonPath("$.helpful").value(0))
                .andExpect(jsonPath("$.notHelpful").value(1));
        send(mehmet, get("/api/questions/" + q.getId()), null)
                .andExpect(jsonPath("$.helpfulness.mine").doesNotExist())
                .andExpect(jsonPath("$.helpfulness.notHelpful").value(1));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_helpfulness WHERE question_id = ?",
                Integer.class, q.getId())).isEqualTo(1);
    }
}
