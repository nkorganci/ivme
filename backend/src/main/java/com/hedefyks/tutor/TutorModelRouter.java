package com.hedefyks.tutor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Öğrencinin kendi cümlesiyle yazdığı açıklamayı sınıflandırır. Rutin iş ekonomik modele,
 * zor sayısal içerik ve belirsiz sonuçlar güçlü modele, o da emin değilse öğretmene gider.
 * Model yeni hesap üretemez: çıktı izinli etiketlerle sınırlıdır, sonucu ya da şıkkı anamaz ve
 * adımda olmayan sayı içeremez. Aynı içerik sürümü + adım + açıklama için önbellek kullanılır.
 */
@Service
public class TutorModelRouter {
    static final String TASK = "CLASSIFY_EXPLANATION";
    static final String PROMPT_VERSION = "aciklama-siniflandirma-v1";
    private static final Logger log = LoggerFactory.getLogger(TutorModelRouter.class);
    private static final Set<String> COMPUTABLE = Set.of("matematik", "geometri", "fizik", "kimya");
    private static final Pattern LETTER = Pattern.compile(
            "(?:\\b(?:[Cc]evap|[Yy]anıt|[Şş]ık(?:kı|ki)?)\\s*[:\\-]?\\s*\\(?[A-E]\\)?(?!\\p{L}))|(?:(?<!\\p{L})[A-E]\\)\\s)|(?:(?<!\\p{L})[A-E] şıkk)");
    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)?");

    public record Classification(String label, String feedback, String tier, String model, boolean cacheHit,
                                 String routedTo) {}

    private final JdbcTemplate jdbc;
    private final TutorModelGateway gateway;
    private final TutorProperties props;
    private final ObjectMapper mapper;

    public TutorModelRouter(JdbcTemplate jdbc, TutorModelGateway gateway, TutorProperties props, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.gateway = gateway;
        this.props = props;
        this.mapper = mapper;
    }

    public enum Tier { ECONOMIC, STRONG }

    /** Hangi kademeden başlanacağı: zor sayısal içerik doğrudan güçlü modele gider. */
    static List<Tier> route(JsonNode content) {
        String subject = content.path("question").path("subjectId").asText();
        String difficulty = content.path("classification").path("difficulty").asText();
        boolean hard = COMPUTABLE.contains(subject) && ("ZOR".equals(difficulty) || "ILERI".equals(difficulty));
        return hard ? List.of(Tier.STRONG) : List.of(Tier.ECONOMIC, Tier.STRONG);
    }

    public Classification classify(long sessionId, long contentId, JsonNode content, JsonNode step, String studentText) {
        List<String> labels = allowedLabels(content);
        if (!props.models().enabled()) {
            logCall("RULES", null, false, "FALLBACK", null, sessionId);
            return toTeacher(sessionId, contentId, step, studentText, null);
        }
        for (Tier tier : route(content)) {
            TutorProperties.Tier config = tier == Tier.ECONOMIC ? props.models().economic() : props.models().strong();
            if (!config.configured()) {
                logCall(tier.name(), null, false, "UNAVAILABLE", null, sessionId);
                continue;
            }
            String key = cacheKey(contentId, step.path("id").asText(), studentText, config.model());
            Optional<JsonNode> cached = cached(key);
            if (cached.isPresent()) {
                logCall(tier.name(), config.model(), true, "OK", 0, sessionId);
                return result(cached.get(), content, step, tier, config.model(), true);
            }
            long started = System.nanoTime();
            JsonNode answer;
            try {
                String raw = gateway.complete(config, systemPrompt(), userPrompt(content, step, studentText, labels),
                        Duration.ofSeconds(Math.max(3, props.models().timeoutSeconds())));
                answer = mapper.readTree(raw);
            } catch (Exception error) {
                log.debug("Öğretim modeli ulaşılamadı ({}): {}", tier, error.getMessage());
                logCall(tier.name(), config.model(), false, "UNAVAILABLE", elapsed(started), sessionId);
                continue;
            }
            Optional<String> problem = validate(answer, labels, content, step);
            if (problem.isPresent()) {
                log.debug("Model çıktısı reddedildi ({}): {}", tier, problem.get());
                logCall(tier.name(), config.model(), false, "INVALID", elapsed(started), sessionId);
                continue;
            }
            if ("UNSURE".equals(answer.path("label").asText()) || answer.path("confidence").asDouble() < 0.6) {
                logCall(tier.name(), config.model(), false, "ESCALATED", elapsed(started), sessionId);
                continue;
            }
            store(key, config.model(), answer);
            logCall(tier.name(), config.model(), false, "OK", elapsed(started), sessionId);
            return result(answer, content, step, tier, config.model(), false);
        }
        return toTeacher(sessionId, contentId, step, studentText, null);
    }

    private Classification toTeacher(long sessionId, long contentId, JsonNode step, String text, String modelLabel) {
        jdbc.update("""
                INSERT INTO tutor_teacher_queue(session_id, content_id, step_id, student_text, model_label)
                VALUES (?, ?, ?, ?, ?)""", sessionId, contentId, step.path("id").asText(null), text, modelLabel);
        logCall("TEACHER", null, false, "ESCALATED", null, sessionId);
        return new Classification("TEACHER",
                "Açıklamanı öğretmenine ilettim; değerlendirmesi beceri kaydına not olarak eklenecek. "
                        + "Bu arada aşağıdaki gerekçelerden sana en yakın olanı seçerek devam edebilirsin.",
                "TEACHER", null, false, "TEACHER");
    }

    private Classification result(JsonNode answer, JsonNode content, JsonNode step, Tier tier, String model, boolean cacheHit) {
        String label = answer.path("label").asText();
        String feedback = answer.path("feedback").asText("").trim();
        if (feedback.isEmpty()) feedback = template(label, content, step);
        return new Classification(label, feedback, tier.name(), model, cacheHit, tier.name());
    }

    static String template(String label, JsonNode content, JsonNode step) {
        if (label.startsWith("MISCONCEPTION:")) {
            String id = label.substring("MISCONCEPTION:".length());
            for (JsonNode item : content.path("misconceptions")) {
                if (id.equals(item.path("id").asText())) return item.path("fix").asText();
            }
        }
        return switch (label) {
            case "CORRECT" -> "Gerekçen doğru. " + step.path("why").asText();
            case "PARTIAL" -> "Doğru yoldasın; eksik kalan nokta: " + step.path("why").asText();
            default -> "Açıklaman bu adımın gerekçesiyle eşleşmedi. Adımı yeniden oku: " + step.path("why").asText();
        };
    }

    static List<String> allowedLabels(JsonNode content) {
        List<String> labels = new ArrayList<>(List.of("CORRECT", "PARTIAL", "OFF_TOPIC", "UNSURE"));
        for (JsonNode item : content.path("misconceptions")) labels.add("MISCONCEPTION:" + item.path("id").asText());
        return labels;
    }

    /** Model çıktısının öğretim sözleşmesine uyup uymadığını denetler. */
    static Optional<String> validate(JsonNode answer, List<String> labels, JsonNode content, JsonNode step) {
        if (answer == null || !answer.isObject()) return Optional.of("JSON nesnesi değil");
        if (!labels.contains(answer.path("label").asText())) return Optional.of("izinsiz etiket");
        JsonNode confidence = answer.path("confidence");
        if (!confidence.isNumber() || confidence.asDouble() < 0 || confidence.asDouble() > 1) return Optional.of("güven 0-1 değil");
        String feedback = answer.path("feedback").asText("");
        if (feedback.length() > 400) return Optional.of("geri bildirim uzun");
        if (LETTER.matcher(feedback).find()) return Optional.of("şık harfi anıyor");
        Set<String> known = numbers(step.path("text").asText() + " " + step.path("why").asText() + " "
                + content.path("reading").path("text").asText());
        for (String number : numbers(feedback)) {
            if (!known.contains(number)) return Optional.of("adımda olmayan sayı: " + number);
        }
        return Optional.empty();
    }

    static Set<String> numbers(String text) {
        Set<String> found = new LinkedHashSet<>();
        Matcher matcher = NUMBER.matcher(text == null ? "" : text);
        while (matcher.find()) found.add(matcher.group().replace(',', '.'));
        return found;
    }

    static String systemPrompt() {
        return """
                Sen bir YKS öğretmen asistanısın. Tek görevin, öğrencinin bir çözüm adımı için yazdığı gerekçeyi \
                verilen ölçütlerle karşılaştırıp sınıflandırmaktır. Yeni hesap, yeni sayı ya da yeni çözüm üretme. \
                Sorunun sonucunu veya doğru şıkkı asla söyleme. Emin değilsen "UNSURE" kullan. \
                Yalnız şu JSON'u döndür: {"label": "<izinli etiketlerden biri>", "confidence": <0 ile 1 arası>, \
                "feedback": "<öğrenciye en fazla iki cümle, Türkçe, yönlendirici>"}""";
    }

    String userPrompt(JsonNode content, JsonNode step, String studentText, List<String> labels) {
        ObjectNode input = mapper.createObjectNode();
        input.put("ders", content.path("question").path("subjectId").asText());
        input.put("adim", step.path("text").asText());
        input.put("dogruGerekce", step.path("why").asText());
        var misconceptions = input.putArray("yanilgilar");
        for (JsonNode item : content.path("misconceptions")) {
            misconceptions.addObject().put("id", item.path("id").asText()).put("yanilgi", item.path("mistake").asText())
                    .put("neden", item.path("cause").asText());
        }
        var allowed = input.putArray("izinliEtiketler");
        labels.forEach(allowed::add);
        input.put("ogrenciGerekcesi", studentText);
        return input.toString();
    }

    /** Önbellek için yazım farklarını yok sayar; Türkçe I/İ/ı/i ayrımı da aynı anahtara katlanır. */
    static String normalize(String text) {
        String folded = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT)
                .replace("i̇", "i").replace('ı', 'i');
        return folded.replaceAll("\\s+", " ").trim();
    }

    static String cacheKey(long contentId, String stepId, String text, String model) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String material = String.join("|", PROMPT_VERSION, TASK, Long.toString(contentId), stepId, normalize(text), model);
            return HexFormat.of().formatHex(digest.digest(material.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    private Optional<JsonNode> cached(String key) {
        List<String> rows = jdbc.queryForList("SELECT output::text FROM tutor_model_cache WHERE cache_key = ?", String.class, key);
        if (rows.isEmpty()) return Optional.empty();
        jdbc.update("UPDATE tutor_model_cache SET hits = hits + 1, last_hit_at = now() WHERE cache_key = ?", key);
        try {
            return Optional.of(mapper.readTree(rows.get(0)));
        } catch (Exception error) {
            return Optional.empty();
        }
    }

    private void store(String key, String model, JsonNode answer) {
        jdbc.update("""
                INSERT INTO tutor_model_cache(cache_key, task, model, output) VALUES (?, ?, ?, ?::jsonb)
                ON CONFLICT (cache_key) DO NOTHING""", key, TASK, model, answer.toString());
    }

    private void logCall(String tier, String model, boolean cacheHit, String status, Integer latency, long sessionId) {
        jdbc.update("""
                INSERT INTO tutor_model_calls(task, tier, model, cache_hit, status, latency_ms, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)""", TASK, tier, model, cacheHit, status, latency, sessionId);
    }

    private static int elapsed(long started) {
        return (int) Math.min(Integer.MAX_VALUE, (System.nanoTime() - started) / 1_000_000);
    }
}
