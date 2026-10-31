package com.hedefyks.learn;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * TAS-04 sunucu cevap anahtarı (`scripts/cevap-anahtari.mjs` üretir). Ders içi soru ve not alıştırması
 * sonucu istemcinin `correct` beyanından değil bu anahtardan hesaplanır. Puanlama ön yüzdeki
 * `Blocks.jsx` / `items.jsx` kurallarının aynısıdır.
 */
@Component
public class AnswerKeys {
    public record LessonKey(String id, String conceptId, String type, String version, JsonNode key) {}
    public record NoteKey(String itemKey, int answer, int choices, String version) {}

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final Pattern FRACTION = Pattern.compile("^(-?\\d+(?:\\.\\d+)?)/(-?\\d+(?:\\.\\d+)?)$");
    private static final Pattern DECIMAL = Pattern.compile("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$");
    private static final Set<String> GUIDED_CONTEXTS = Set.of("quick_check", "misconception", "reteach");

    private final Map<String, LessonKey> lessonItems = new HashMap<>();
    private final Map<String, List<String>> conceptCategories = new HashMap<>();
    private final Map<String, NoteKey> notes = new HashMap<>();

    public AnswerKeys(ObjectMapper mapper) throws IOException {
        JsonNode root;
        try (InputStream in = new ClassPathResource("learn/answer-keys.json").getInputStream()) { root = mapper.readTree(in); }
        for (Iterator<Map.Entry<String, JsonNode>> it = root.path("lessonItems").fields(); it.hasNext(); ) {
            var entry = it.next();
            JsonNode value = entry.getValue();
            lessonItems.put(entry.getKey(), new LessonKey(entry.getKey(), value.path("conceptId").asText(), value.path("type").asText(),
                    value.path("version").asText(), value));
        }
        for (Iterator<Map.Entry<String, JsonNode>> it = root.path("concepts").fields(); it.hasNext(); ) {
            var entry = it.next();
            List<String> ids = new ArrayList<>();
            entry.getValue().path("categoryIds").forEach(id -> ids.add(id.asText()));
            conceptCategories.put(entry.getKey(), List.copyOf(ids));
        }
        for (Iterator<Map.Entry<String, JsonNode>> it = root.path("notePractice").fields(); it.hasNext(); ) {
            var entry = it.next();
            JsonNode value = entry.getValue();
            notes.put(entry.getKey(), new NoteKey(entry.getKey(), value.path("answer").asInt(), value.path("choices").asInt(), value.path("version").asText()));
        }
    }

    public LessonKey lessonItem(String id) { return lessonItems.get(id); }
    public NoteKey notePractice(String itemKey) { return notes.get(itemKey); }
    /** Dersin `.ders` başlığındaki `kategori:` kimlikleri; bilinmeyen ders için boş. */
    public List<String> conceptCategories(String conceptId) { return conceptCategories.getOrDefault(conceptId, List.of()); }
    public Map<String, List<String>> allConceptCategories() { return Map.copyOf(conceptCategories); }

    /** Rehberli: ders içi kontrol, yanılgı/yeniden öğretim bağlamı veya ipucu açılmış. Kart öz değerlendirmesi tekrardır. */
    public static String mode(String itemType, JsonNode payload) {
        if ("flashcard".equals(itemType)) return "REVIEW";
        if (payload.path("hintUsed").asBoolean(false) || GUIDED_CONTEXTS.contains(payload.path("context").asText(""))) return "GUIDED";
        return "INDEPENDENT";
    }

    /** Sunucu sonucu; cevap gövdesi bu öğe türü için yetersizse null (puan doğrulanamaz). */
    public static Boolean score(LessonKey item, JsonNode payload) {
        JsonNode key = item.key();
        JsonNode response = payload.get("response");
        switch (item.type()) {
            case "choice": {
                String chosen = payload.path("chosen").isTextual() ? payload.get("chosen").asText().trim().toUpperCase(Locale.ROOT) : "";
                if (chosen.isEmpty()) return null;
                return chosen.equals(key.path("answer").asText());
            }
            case "fill": {
                JsonNode text = response != null && response.isTextual() ? response : payload.get("chosen");
                if (text == null || !text.isTextual()) return null;
                return fill(key, text.asText());
            }
            case "match": {
                if (response == null || !response.isArray() || response.size() != key.path("rights").size()) return null;
                for (int i = 0; i < response.size(); i++) if (!key.path("rights").get(i).asText().equals(response.get(i).asText(null))) return false;
                return true;
            }
            case "order": {
                if (response == null || !response.isArray() || response.size() != key.path("items").size()) return null;
                for (int i = 0; i < response.size(); i++) if (!key.path("items").get(i).asText().equals(response.get(i).asText(null))) return false;
                return true;
            }
            case "categorize": {
                if (response == null || !response.isObject()) return null;
                for (Iterator<Map.Entry<String, JsonNode>> it = key.path("groups").fields(); it.hasNext(); ) {
                    var entry = it.next();
                    if (!entry.getValue().asText().equals(response.path(entry.getKey()).asText(null))) return false;
                }
                return true;
            }
            default: return null;
        }
    }

    private static boolean fill(JsonNode key, String text) {
        double numeric = number(text);
        double tolerance = Math.max(key.path("tolerance").asDouble(1e-9), 1e-9);
        for (JsonNode answer : key.path("answers")) {
            double expected = number(answer.asText());
            boolean match = Double.isFinite(expected) && Double.isFinite(numeric)
                    ? Math.abs(expected - numeric) <= tolerance
                    : answer.asText().trim().toLowerCase(TR).equals(text.trim().toLowerCase(TR));
            if (match) return true;
        }
        return false;
    }

    /** Blocks.jsx `parseAnswer` ile aynı: boşluklar atılır, ilk virgül nokta, ilk “−” eksi olur; a/b kesri kabul edilir. */
    static double number(String text) {
        String value = text.trim().replaceAll("\\s+", "").replaceFirst(",", ".").replaceFirst("−", "-");
        Matcher fraction = FRACTION.matcher(value);
        if (fraction.matches()) return Double.parseDouble(fraction.group(1)) / Double.parseDouble(fraction.group(2));
        if (value.isEmpty() || !DECIMAL.matcher(value).matches()) return Double.NaN;
        return Double.parseDouble(value);
    }
}
