package com.hedefyks.tutor;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class TutorModelRouterRulesTest {
    private final ObjectMapper json = new ObjectMapper();

    private JsonNode content(String subject, String difficulty) throws Exception {
        return json.readTree("""
                {"question":{"subjectId":"%s"},"classification":{"difficulty":"%s"},
                 "reading":{"text":"25 halıdan rastgele 2 tanesi seçiliyor; olasılık %%1."},
                 "misconceptions":[{"id":"m1","mistake":"İadeli sanmak","cause":"x","fix":"Kombinasyon kullan."}]}
                """.formatted(subject, difficulty));
    }

    private JsonNode step() throws Exception {
        return json.readTree("{\"id\":\"s1\",\"text\":\"C(25, 2) = 25·24/2 = 300 ikili.\",\"why\":\"Sıra önemsiz.\"}");
    }

    @Test
    void zor_sayisal_icerik_dogrudan_guclu_modele_rutin_icerik_once_ekonomik_modele_gider() throws Exception {
        assertThat(TutorModelRouter.route(content("matematik", "ILERI"))).containsExactly(TutorModelRouter.Tier.STRONG);
        assertThat(TutorModelRouter.route(content("fizik", "ZOR"))).containsExactly(TutorModelRouter.Tier.STRONG);
        assertThat(TutorModelRouter.route(content("matematik", "ORTA")))
                .containsExactly(TutorModelRouter.Tier.ECONOMIC, TutorModelRouter.Tier.STRONG);
        assertThat(TutorModelRouter.route(content("tarih", "ZOR")))
                .containsExactly(TutorModelRouter.Tier.ECONOMIC, TutorModelRouter.Tier.STRONG);
    }

    @Test
    void model_ciktisi_izinli_etiket_sinirli_sayi_ve_sik_kurallarina_uyar() throws Exception {
        JsonNode content = content("matematik", "ORTA");
        List<String> labels = TutorModelRouter.allowedLabels(content);
        assertThat(labels).contains("CORRECT", "MISCONCEPTION:m1", "UNSURE");
        var ok = json.readTree("{\"label\":\"CORRECT\",\"confidence\":0.9,\"feedback\":\"Evet, 2'ye bölmek sıranın önemsizliğinden gelir.\"}");
        assertThat(TutorModelRouter.validate(ok, labels, content, step())).isEmpty();
        var newNumber = json.readTree("{\"label\":\"CORRECT\",\"confidence\":0.9,\"feedback\":\"Sonuç %77 olur.\"}");
        assertThat(TutorModelRouter.validate(newNumber, labels, content, step())).hasValueSatisfying(r -> assertThat(r).contains("77"));
        var letter = json.readTree("{\"label\":\"PARTIAL\",\"confidence\":0.8,\"feedback\":\"Cevap A olmalı.\"}");
        assertThat(TutorModelRouter.validate(letter, labels, content, step())).isPresent();
        var unknown = json.readTree("{\"label\":\"MISCONCEPTION:m9\",\"confidence\":0.8,\"feedback\":\"\"}");
        assertThat(TutorModelRouter.validate(unknown, labels, content, step())).isPresent();
        var badConfidence = json.readTree("{\"label\":\"CORRECT\",\"confidence\":3,\"feedback\":\"\"}");
        assertThat(TutorModelRouter.validate(badConfidence, labels, content, step())).isPresent();
    }

    @Test
    void onbellek_anahtari_bosluk_ve_buyuk_harf_farkini_yok_sayar_icerik_surumunu_ayirir() {
        String a = TutorModelRouter.cacheKey(7, "s1", "Sıra  ÖNEMLİ değil", "m");
        assertThat(TutorModelRouter.cacheKey(7, "s1", "sıra önemli değil", "m")).isEqualTo(a);
        assertThat(TutorModelRouter.cacheKey(8, "s1", "sıra önemli değil", "m")).isNotEqualTo(a);
        assertThat(TutorModelRouter.cacheKey(7, "s1", "sıra önemli değil", "başka-model")).isNotEqualTo(a);
        // Türkçe I/İ/ı/i yazım farkı aynı açıklamayı farklı anahtara bölmemeli.
        assertThat(TutorModelRouter.cacheKey(7, "s1", "SIRA ÖNEMSİZ", "m"))
                .isEqualTo(TutorModelRouter.cacheKey(7, "s1", "sıra önemsiz", "m"));
        assertThat(TutorModelRouter.cacheKey(7, "s1", "SIRA ONEMSIZ", "m"))
                .isEqualTo(TutorModelRouter.cacheKey(7, "s1", "sira onemsiz", "m"));
    }

    @Test
    void sablon_geri_bildirim_yanilginin_duzeltmesini_kullanir() throws Exception {
        assertThat(TutorModelRouter.template("MISCONCEPTION:m1", content("matematik", "ORTA"), step())).isEqualTo("Kombinasyon kullan.");
        assertThat(TutorModelRouter.template("CORRECT", content("matematik", "ORTA"), step())).contains("Sıra önemsiz.");
    }
}
