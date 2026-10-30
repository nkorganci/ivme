package com.hedefyks.learn;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.common.ApiException;
import com.hedefyks.question.Answers;
import com.hedefyks.question.AttemptDtos.AttemptRequest;
import com.hedefyks.question.AttemptDtos.PracticeState;
import com.hedefyks.question.AttemptEventType;
import com.hedefyks.question.AttemptService;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionRepository;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Konuyu Öğrenelim olay günlüğü. Olaylar yalnız eklenir; kavram durumu istemcide bu olaylardan türetilir.
 * Banka sorusu cevabı sunucuda puanlanır ve bağımsız pratik olarak da kaydedilir (cevap anahtarı önceden gönderilmez).
 */
@Service
public class LearnService {
    static final Set<String> SUBJECTS = Set.of("matematik");
    private static final Set<String> KINDS = Set.of("attempt", "lesson", "concept", "set", "queue", "plan");
    private static final Set<String> ITEM_TYPES = Set.of("bank", "lesson_q", "flashcard");
    private static final Set<String> CONTEXTS = Set.of("pretest", "posttest", "quick_check", "misconception", "mastery", "testout",
            "review", "missed", "mixed", "placement", "reteach", "practice", "flashcards", "sibling", "test", "cikmis");
    private static final Set<String> SERVER_FIELDS = Set.of("seq", "correctAnswer", "recordedAt");
    private static final Pattern CONCEPT = Pattern.compile("^[a-z0-9-]{1,80}$");
    private static final Pattern ITEM = Pattern.compile("^[\\p{L}\\p{N}_:.\\-]{1,120}$");
    private static final int MAX_PAYLOAD = 6000;
    private static final int MAX_BATCH = 100;
    private static final long MAX_TIME_MS = 21_600_000L;
    private static final Instant EARLIEST = Instant.parse("2024-01-01T00:00:00Z");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final QuestionRepository questions;
    private final AttemptService attempts;

    public LearnService(JdbcTemplate jdbc, ObjectMapper mapper, QuestionRepository questions, AttemptService attempts) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.questions = questions;
        this.attempts = attempts;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> state(long userId, String subject) {
        requireSubject(subject);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("profile", profile(userId, subject));
        out.put("events", jdbc.query("SELECT id, payload::text FROM learning_engine_events WHERE user_id = ? AND subject = ? ORDER BY id",
                (rs, row) -> withSeq(rs.getString(2), rs.getLong(1)), userId, subject));
        out.put("serverNow", Instant.now().toString());
        return out;
    }

    private Map<String, Object> profile(long userId, String subject) {
        return jdbc.query("SELECT settings::text, revision, updated_at FROM learning_engine_profiles WHERE user_id = ? AND subject = ?",
                (rs, row) -> {
                    Map<String, Object> value = new LinkedHashMap<>();
                    value.put("settings", read(rs.getString(1)));
                    value.put("revision", rs.getLong(2));
                    value.put("updatedAt", rs.getObject(3, OffsetDateTime.class));
                    return value;
                }, userId, subject).stream().findFirst().orElse(null);
    }

    @Transactional
    public Map<String, Object> saveProfile(long userId, String subject, JsonNode settings, Long revision) {
        requireSubject(subject);
        if (settings == null || !settings.isObject()) throw ApiException.badRequest("Ayarlar bir nesne olmalı.");
        String text = write(settings);
        if (text.length() > MAX_PAYLOAD) throw ApiException.badRequest("Ayarlar çok uzun.");
        int changed;
        if (revision == null || revision == 0) {
            changed = jdbc.update("INSERT INTO learning_engine_profiles(user_id, subject, settings) VALUES (?, ?, ?::jsonb) ON CONFLICT DO NOTHING",
                    userId, subject, text);
        } else {
            changed = jdbc.update("UPDATE learning_engine_profiles SET settings = ?::jsonb, revision = revision + 1, updated_at = now() "
                    + "WHERE user_id = ? AND subject = ? AND revision = ?", text, userId, subject, revision);
        }
        if (changed == 0) throw ApiException.conflict("Ayarlar başka bir pencerede değişmiş; sayfayı yenileyip tekrar dene.");
        return profile(userId, subject);
    }

    @Transactional
    public List<JsonNode> append(long userId, String subject, List<JsonNode> events) {
        requireSubject(subject);
        if (events == null || events.isEmpty()) throw ApiException.badRequest("Kaydedilecek olay yok.");
        if (events.size() > MAX_BATCH) throw ApiException.badRequest("Tek istekte en çok " + MAX_BATCH + " olay gönderilir.");
        List<JsonNode> saved = new ArrayList<>();
        for (JsonNode raw : events) {
            Event event = validate(raw);
            if ("bank".equals(event.itemType())) throw ApiException.badRequest("Banka sorusu cevabı /bank-answer ile puanlanır.");
            saved.add(insert(userId, subject, event, null));
        }
        return saved;
    }

    /** Banka sorusunu puanlar, bağımsız pratik olarak kaydeder ve olayı ekler; aynı olay kimliği tekrar puanlanmaz. */
    @Transactional
    public Map<String, Object> bankAnswer(long userId, String subject, JsonNode raw) {
        requireSubject(subject);
        Event event = validate(raw);
        if (!"attempt".equals(event.kind()) || !"bank".equals(event.itemType())) throw ApiException.badRequest("Banka cevabı bir attempt olayı olmalı.");
        Long questionId = event.payload().path("questionId").canConvertToLong() ? event.payload().path("questionId").asLong() : null;
        if (questionId == null) throw ApiException.badRequest("Soru kimliği gerekli.");
        JsonNode existing = existing(userId, event.id());
        Question question = questions.findById(questionId).filter(q -> existing != null || q.isActive())
                .orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        JsonNode recorded = existing;
        if (recorded == null) {
            if (!"Matematik".equals(question.getSubject()) || !(question.getExamType() == ExamType.TYT || question.getExamType() == ExamType.AYT))
                throw ApiException.badRequest("Konuyu Öğrenelim yalnız TYT–AYT Matematik sorularını puanlar.");
            String chosen = Answers.normalize(event.payload().path("chosen").asText(null), question.getChoiceCount());
            if (chosen == null) throw ApiException.badRequest("Bir şık seç.");
            int seconds = (int) Math.min(21600, Math.max(0, event.payload().path("timeMs").asLong(0) / 1000));
            PracticeState before = attempts.state(questionId, userId, null);
            if (!before.roundComplete() && !before.attempts().isEmpty())
                attempts.submit(questionId, userId, new AttemptRequest(derived(event.id(), "skip"), AttemptEventType.SKIP, null, 0, null));
            attempts.submit(questionId, userId, new AttemptRequest(event.id(), AttemptEventType.ANSWER, chosen, seconds, null));
            boolean correct = chosen.equals(question.getCorrectAnswer());
            if (!correct) attempts.submit(questionId, userId, new AttemptRequest(derived(event.id(), "reveal"), AttemptEventType.REVEAL, null, 0, null));
            ObjectNode payload = event.payload().deepCopy();
            payload.put("chosen", chosen);
            payload.put("correct", correct);
            payload.put("code", question.getCode());
            recorded = insert(userId, subject, new Event(event.id(), event.at(), event.kind(), event.conceptId(), event.itemType(), payload),
                    Map.of("correct", correct, "correctAnswer", question.getCorrectAnswer(), "questionId", questionId));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("event", recorded);
        out.put("correct", recorded.path("correct").asBoolean());
        out.put("correctAnswer", recorded.path("correctAnswer").asText());
        out.put("hasSolution", question.getSolutionImage() != null && !question.getSolutionImage().isBlank());
        return out;
    }

    record Event(UUID id, Instant at, String kind, String conceptId, String itemType, ObjectNode payload) {}

    private Event validate(JsonNode raw) {
        if (raw == null || !raw.isObject()) throw ApiException.badRequest("Olay bir nesne olmalı.");
        ObjectNode payload = ((ObjectNode) raw).deepCopy();
        SERVER_FIELDS.forEach(payload::remove);
        UUID id;
        try { id = UUID.fromString(payload.path("id").asText("")); }
        catch (IllegalArgumentException error) { throw ApiException.badRequest("Olay kimliği UUID olmalı."); }
        Instant at;
        try { at = Instant.parse(payload.path("at").asText("")); }
        catch (DateTimeParseException error) { throw ApiException.badRequest("Olay zamanı ISO-8601 olmalı."); }
        if (at.isBefore(EARLIEST) || at.isAfter(Instant.now().plus(1, ChronoUnit.DAYS))) throw ApiException.badRequest("Olay zamanı geçersiz.");
        payload.put("at", at.toString());
        String kind = payload.path("kind").asText("");
        if (!KINDS.contains(kind)) throw ApiException.badRequest("Bilinmeyen olay türü.");
        String conceptId = payload.hasNonNull("conceptId") ? payload.get("conceptId").asText() : null;
        if (conceptId != null && !CONCEPT.matcher(conceptId).matches()) throw ApiException.badRequest("Kavram kimliği geçersiz.");
        String itemType = null;
        if ("attempt".equals(kind)) {
            itemType = payload.path("itemType").asText("");
            if (!ITEM_TYPES.contains(itemType)) throw ApiException.badRequest("Öğe türü geçersiz.");
            if (!ITEM.matcher(payload.path("itemId").asText("")).matches()) throw ApiException.badRequest("Öğe kimliği geçersiz.");
            if (!CONTEXTS.contains(payload.path("context").asText(""))) throw ApiException.badRequest("Deneme bağlamı geçersiz.");
            if (conceptId == null) throw ApiException.badRequest("Denemede kavram kimliği gerekli.");
            if (!"bank".equals(itemType) && !payload.path("correct").isBoolean()) throw ApiException.badRequest("Denemede doğru/yanlış bilgisi gerekli.");
            JsonNode confidence = payload.get("confidence");
            if (confidence != null && !confidence.isNull() && !(confidence.isInt() && confidence.asInt() >= 1 && confidence.asInt() <= 3))
                throw ApiException.badRequest("Güven 1–3 olmalı.");
            long timeMs = payload.path("timeMs").asLong(0);
            if (timeMs < 0 || timeMs > MAX_TIME_MS) throw ApiException.badRequest("Süre geçersiz.");
            JsonNode difficulty = payload.get("difficulty");
            if (difficulty != null && !difficulty.isNull() && !(difficulty.isNumber() && difficulty.asInt() >= 1 && difficulty.asInt() <= 3))
                throw ApiException.badRequest("Zorluk 1–3 olmalı.");
        }
        if (write(payload).length() > MAX_PAYLOAD) throw ApiException.badRequest("Olay çok büyük.");
        return new Event(id, at, kind, conceptId, itemType, payload);
    }

    private JsonNode insert(long userId, String subject, Event event, Map<String, Object> serverFields) {
        JsonNode existing = existing(userId, event.id());
        if (existing != null) return existing;
        ObjectNode stored = event.payload().deepCopy();
        if (serverFields != null) serverFields.forEach((key, value) -> stored.set(key, mapper.valueToTree(value)));
        Long questionId = stored.path("questionId").canConvertToLong() && "attempt".equals(event.kind()) ? stored.path("questionId").asLong() : null;
        if (questionId != null && !questions.existsById(questionId)) throw ApiException.badRequest("Soru bulunamadı.");
        Boolean correct = stored.path("correct").isBoolean() ? stored.path("correct").asBoolean() : null;
        try {
            Long id = jdbc.queryForObject("""
                    INSERT INTO learning_engine_events(user_id, client_event_id, subject, kind, concept_id, item_type, question_id, correct, occurred_at, payload)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb) RETURNING id
                    """, Long.class, userId, event.id(), subject, event.kind(), event.conceptId(), event.itemType(), questionId, correct,
                    Timestamp.from(event.at()), write(stored));
            stored.put("seq", id);
            return stored;
        } catch (DuplicateKeyException race) {
            JsonNode again = existing(userId, event.id());
            if (again == null) throw race;
            return again;
        }
    }

    private JsonNode existing(long userId, UUID id) {
        return jdbc.query("SELECT id, payload::text FROM learning_engine_events WHERE user_id = ? AND client_event_id = ?",
                (rs, row) -> withSeq(rs.getString(2), rs.getLong(1)), userId, id).stream().findFirst().orElse(null);
    }

    private JsonNode withSeq(String payload, long id) {
        ObjectNode node = (ObjectNode) read(payload);
        node.put("seq", id);
        return node;
    }

    private static UUID derived(UUID id, String suffix) {
        return UUID.nameUUIDFromBytes((id + ":" + suffix).getBytes(StandardCharsets.UTF_8));
    }

    private static void requireSubject(String subject) {
        if (!SUBJECTS.contains(subject)) throw ApiException.badRequest("Bu ders için Konuyu Öğrenelim henüz yok.");
    }

    private JsonNode read(String text) {
        try { return mapper.readTree(text); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Kayıt okunamadı.", error); }
    }

    private String write(JsonNode node) {
        try { return mapper.writeValueAsString(node); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Kayıt yazılamadı.", error); }
    }
}
