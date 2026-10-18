package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.question.Question;
import com.hedefyks.tutor.TutorModelGateway;
import com.hedefyks.tutor.TutorProperties;
import com.hedefyks.user.Role;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Rutin açıklama ekonomik modelde, belirsiz/geçersiz çıktı güçlü modelde, son çare öğretmende çözülür. */
@TestPropertySource(properties = {"app.tutor.models.enabled=true",
        "app.tutor.models.economic.model=ekonomik-test", "app.tutor.models.strong.model=guclu-test"})
class TutorModelRoutingTest extends TestBase {
    @MockitoBean TutorModelGateway gateway;

    private MockHttpSession student;
    private long sessionId;

    @BeforeEach
    void session() throws Exception {
        jdbc.update("DELETE FROM tutor_model_cache");
        Question q = question("ROUTE-1", "Matematik", "A");
        ObjectNode content = (ObjectNode) json.readTree(Files.readString(Path.of("../ornek-veri/ogretim-pilotu/matematik/TYT-0780.json")));
        ((ObjectNode) content.path("question")).put("code", q.getCode());
        jdbc.update("""
                INSERT INTO tutor_contents(question_id, question_code, version_no, schema_version, content, content_sha256,
                    image_sha256, answer_key, subject_id, category_id, pattern_key, verification, confidence,
                    confidence_band, review_flag, status, generator, generation_tier, prompt_version)
                VALUES (?, ?, 1, 1, ?::jsonb, repeat('e', 64), repeat('d', 64), 'A', 'matematik', 'tyt.matematik.olasilik',
                    'matematik.olasilik.sirasiz-secim', '{"checks":[]}'::jsonb, 0.98, 'HIGH', false, 'AUTO_VERIFIED',
                    'test', 'STRONG', 'test')""", q.getId(), q.getCode(), content.toString());
        user("ayse", Role.USER);
        student = login("ayse", "Sifre1234");
        sessionId = read(send(student, post("/api/tutor/sessions"), "{\"code\":\"ROUTE-1\"}")).path("sessionId").asLong();
        send(student, post("/api/tutor/sessions/" + sessionId + "/actions"), "{\"type\":\"STEP\"}").andExpect(status().isOk());
    }

    private JsonNode explain(String text) throws Exception {
        JsonNode view = read(send(student, post("/api/tutor/sessions/" + sessionId + "/actions"),
                "{\"type\":\"FREE_TEXT\",\"stepId\":\"s1\",\"text\":\"" + text + "\"}").andExpect(status().isOk()));
        for (JsonNode card : view.path("cards")) {
            if ("STEP".equals(card.path("kind").asText())) return card.path("freeTexts").get(card.path("freeTexts").size() - 1);
        }
        throw new AssertionError("Adım kartı yok");
    }

    private static TutorProperties.Tier tier(String model) {
        return argThat(t -> t != null && model.equals(t.model()));
    }

    @Test
    void ekonomik_model_gecerli_siniflandirmayi_yapar_ve_ayni_aciklama_onbellekten_gelir() throws Exception {
        when(gateway.complete(tier("ekonomik-test"), anyString(), anyString(), any()))
                .thenReturn("{\"label\":\"CORRECT\",\"confidence\":0.92,\"feedback\":\"Evet; her ikili 2 kez sayılmasın diye bölüyoruz.\"}");
        JsonNode first = explain("Sira onemsiz oldugu icin ikiye boldum");
        assertThat(first.path("label").asText()).isEqualTo("CORRECT");
        assertThat(first.path("routedTo").asText()).isEqualTo("ECONOMIC");
        JsonNode second = explain("  sira ONEMSIZ  oldugu icin ikiye boldum ");
        assertThat(second.path("label").asText()).isEqualTo("CORRECT");
        verify(gateway, times(1)).complete(any(), anyString(), anyString(), any());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_model_calls WHERE cache_hit", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT hits FROM tutor_model_cache", Integer.class)).isEqualTo(1);
    }

    @Test
    void ekonomik_model_emin_degilse_guclu_modele_cikar() throws Exception {
        when(gateway.complete(tier("ekonomik-test"), anyString(), anyString(), any()))
                .thenReturn("{\"label\":\"UNSURE\",\"confidence\":0.3,\"feedback\":\"\"}");
        when(gateway.complete(tier("guclu-test"), anyString(), anyString(), any()))
                .thenReturn("{\"label\":\"MISCONCEPTION:m1\",\"confidence\":0.8,\"feedback\":\"\"}");
        JsonNode result = explain("Halilari geri koydugumuz icin");
        assertThat(result.path("routedTo").asText()).isEqualTo("STRONG");
        assertThat(result.path("label").asText()).isEqualTo("MISCONCEPTION:m1");
        assertThat(result.path("feedback").asText()).contains("kombinasyon");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_model_calls WHERE status = 'ESCALATED'", Integer.class)).isEqualTo(1);
    }

    @Test
    void yeni_sayi_ya_da_sik_ureten_cikti_reddedilir_son_care_ogretmendir() throws Exception {
        when(gateway.complete(tier("ekonomik-test"), anyString(), anyString(), any()))
                .thenReturn("{\"label\":\"CORRECT\",\"confidence\":0.9,\"feedback\":\"Sonuç %77 olur.\"}");
        when(gateway.complete(tier("guclu-test"), anyString(), anyString(), any()))
                .thenReturn("{\"label\":\"CORRECT\",\"confidence\":0.9,\"feedback\":\"Cevap A.\"}");
        JsonNode result = explain("Bilmiyorum ama denedim");
        assertThat(result.path("routedTo").asText()).isEqualTo("TEACHER");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_model_calls WHERE status = 'INVALID'", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_teacher_queue WHERE status = 'OPEN'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_model_cache", Integer.class)).isZero();
    }

    @Test
    void model_ulasilamazsa_ogrenci_beklemez_aciklama_ogretmene_iletilir() throws Exception {
        when(gateway.complete(any(), anyString(), anyString(), any())).thenThrow(new java.net.ConnectException("kapalı"));
        JsonNode result = explain("Ikililer sirasiz secilir");
        assertThat(result.path("routedTo").asText()).isEqualTo("TEACHER");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tutor_model_calls WHERE status = 'UNAVAILABLE'", Integer.class)).isEqualTo(2);
        verify(gateway, never()).complete(argThat(t -> t == null), anyString(), anyString(), any());
    }
}
