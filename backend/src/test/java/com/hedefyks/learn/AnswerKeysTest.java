package com.hedefyks.learn;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.InputStream;
import org.junit.jupiter.api.Test;

/** Boşluk puanlaması ön yüzdeki scoring.js ile aynı örneklerde aynı sonucu verir (testler/cevap-anahtari.test.mjs). */
class AnswerKeysTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void boslukPuanlamasiOnYuzleAyni() throws Exception {
        JsonNode cases;
        try (InputStream in = getClass().getResourceAsStream("/learn/fill-cases.json")) { cases = mapper.readTree(in); }
        assertThat(cases.size()).isGreaterThan(10);
        for (JsonNode item : cases) {
            ObjectNode key = mapper.createObjectNode().put("type", "fill").put("tolerance", item.path("tolerance").asDouble());
            key.set("answers", item.path("answers"));
            ObjectNode payload = mapper.createObjectNode().put("response", item.path("text").asText());
            assertThat(AnswerKeys.score(new AnswerKeys.LessonKey("x:y", "x", "fill", "v", key), payload))
                    .as(item.toString()).isEqualTo(item.path("expected").asBoolean());
        }
    }

    @Test
    void depodakiAnahtarYuklenirVeDersKonulariniTasir() throws Exception {
        AnswerKeys keys = new AnswerKeys(mapper);
        assertThat(keys.lessonItem("bolme-bolunebilme:c1").type()).isEqualTo("choice");
        assertThat(keys.conceptCategories("bolme-bolunebilme")).isNotEmpty().allMatch(id -> id.startsWith("excel."));
        assertThat(keys.notePractice("note:tyt-turkce:sozcukte-anlam").choices()).isEqualTo(4);
        ObjectNode chosen = mapper.createObjectNode().put("chosen", " b ");
        assertThat(AnswerKeys.score(keys.lessonItem("bolme-bolunebilme:c1"), chosen))
                .isEqualTo("B".equals(keys.lessonItem("bolme-bolunebilme:c1").key().path("answer").asText()));
        assertThat(AnswerKeys.score(keys.lessonItem("bolme-bolunebilme:c1"), mapper.createObjectNode())).isNull();
    }
}
