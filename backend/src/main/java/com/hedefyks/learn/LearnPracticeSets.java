package com.hedefyks.learn;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.common.ApiException;
import com.hedefyks.examtrack.ExamTrackService;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.study.StudySessionDtos.QuestionStatus;
import com.hedefyks.study.StudySessionDtos.Session;
import com.hedefyks.study.StudySessionService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TAS-05: Konuyu Öğrenelim'in konu testi, çıkmış sorular ve soru tipi alıştırması ortak PRATIK oturumu olarak kurulur
 * (`study_sessions`, mode=PRACTICE, origin=KONU_OGRENME). Soru seçimini ders motoru yapar; sunucu her soruyu yeniden
 * doğrular, sırayı ve içerik özetini saklar ve oturumu `/soru/{kod}?sessionId=` ortak çözüm ekranına bırakır.
 */
@Service
public class LearnPracticeSets {
    public static final int MAX_ITEMS = 120;
    static final Set<String> KINDS = Set.of("TOPIC_TEST", "PAST_EXAM", "ARCHETYPE");
    private static final Pattern ID = Pattern.compile("^[a-z0-9-]{1,80}$");
    /** Ders motoru bağlamları (LearnService.CONTEXTS ile aynı adlar): eski ekranlarla aynı etki. */
    private static final Map<String, String> CONTEXT = Map.of("TOPIC_TEST", "test", "PAST_EXAM", "cikmis", "ARCHETYPE", "practice");

    public record Item(Long questionId, String archetypeId, Integer difficulty) {}
    public record CreateBody(UUID clientRequestId, String conceptId, String kind, String archetypeId, String title,
                             Boolean resume, List<Item> items, Long expectedUserId) {}
    public record Created(Session session, boolean resumed, boolean repeated) {}

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final AnswerKeys keys;
    private final ImageStorage images;
    private final StudySessionService sessions;
    private final ExamTrackService tracks;

    public LearnPracticeSets(JdbcClient jdbc, ObjectMapper mapper, AnswerKeys keys, ImageStorage images,
                             StudySessionService sessions, ExamTrackService tracks) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.keys = keys;
        this.images = images;
        this.sessions = sessions;
        this.tracks = tracks;
    }

    private record Row(long id, String code, String bank, Integer year, String image, boolean positioned) {}

    @Transactional
    public Created create(long userId, CreateBody body) {
        if (body == null || body.clientRequestId() == null) throw ApiException.badRequest("İstek kimliği gerekli.");
        String kind = body.kind() == null ? "" : body.kind();
        if (!KINDS.contains(kind)) throw ApiException.badRequest("Set türü geçersiz.");
        String concept = body.conceptId() == null ? "" : body.conceptId();
        List<String> categories = ID.matcher(concept).matches() ? keys.conceptCategories(concept) : List.of();
        if (categories.isEmpty()) throw ApiException.badRequest("Bu ders kavramı için soru kataloğu bulunamadı.");
        String archetype = "ARCHETYPE".equals(kind) ? body.archetypeId() : null;
        if ("ARCHETYPE".equals(kind) && (archetype == null || !ID.matcher(archetype).matches())) throw ApiException.badRequest("Soru tipi gerekli.");
        List<Item> items = body.items() == null ? List.of() : body.items();
        if (items.isEmpty()) throw ApiException.badRequest("Sette en az bir soru olmalı.");
        if (items.size() > MAX_ITEMS) throw ApiException.badRequest("Bir sette en fazla " + MAX_ITEMS + " soru olabilir.");
        Set<Long> seen = new HashSet<>();
        for (Item item : items) {
            if (item == null || item.questionId() == null || item.questionId() <= 0) throw ApiException.badRequest("Soru kimliği geçersiz.");
            if (!seen.add(item.questionId())) throw ApiException.badRequest("Aynı soru sette ikinci kez yer alamaz.");
            if (item.archetypeId() != null && !ID.matcher(item.archetypeId()).matches()) throw ApiException.badRequest("Soru tipi geçersiz.");
            if (item.difficulty() != null && (item.difficulty() < 1 || item.difficulty() > 3)) throw ApiException.badRequest("Zorluk 1–3 olmalı.");
        }

        // Cevap kaydı ve oturum bitirme de bu satır kilidini kullanır; eşzamanlı iki sekme sıralanır.
        jdbc.sql("SELECT id FROM users WHERE id = :userId FOR UPDATE").param("userId", userId).query(Long.class).single();

        Optional<Long> previous = jdbc.sql("""
                SELECT id FROM study_sessions WHERE user_id = :userId AND client_request_id = :requestId AND mode = 'PRACTICE'
                """).param("userId", userId).param("requestId", body.clientRequestId()).query(Long.class).optional();
        if (previous.isPresent()) {
            Session existing = sessions.get(userId, previous.get());
            if (existing.origin() == null || !kind.equals(existing.origin().kind()) || !concept.equals(existing.origin().conceptId()))
                throw ApiException.conflict("Bu istek kimliği başka bir çalışmada kullanılmış.");
            return new Created(existing, false, true);
        }

        String trackId = tracks.trackId(userId);
        if (body.resume() == null || body.resume()) {
            Optional<Long> open = jdbc.sql("""
                    SELECT id FROM study_sessions
                    WHERE user_id = :userId AND track_id = :trackId AND mode = 'PRACTICE' AND status = 'IN_PROGRESS'
                      AND origin = 'KONU_OGRENME' AND learning_kind = :kind AND learning_concept_id = :concept
                      AND learning_scope->>'archetypeId' IS NOT DISTINCT FROM CAST(:archetype AS text)
                    ORDER BY started_at DESC, id DESC LIMIT 1
                    """).param("userId", userId).param("trackId", trackId).param("kind", kind).param("concept", concept)
                    .param("archetype", archetype).query(Long.class).optional();
            if (open.isPresent()) {
                Session session = sessions.get(userId, open.get());
                if (session.questions().stream().anyMatch(q -> q.status() != QuestionStatus.COMPLETED)) return new Created(session, true, false);
                sessions.finish(userId, open.get()); // Bütün soruları çözülmüş set bekletilmez; yeni set kurulur.
            }
        }

        List<Row> rows = jdbc.sql("""
                SELECT q.id, q.code, q.bank, q.exam_year, q.image,
                       EXISTS (SELECT 1 FROM exam_archive_positions p WHERE p.question_code = q.code) AS positioned
                FROM questions q
                WHERE q.id IN (:ids) AND q.active AND q.subject = 'Matematik' AND q.exam_type IN ('TYT', 'AYT')
                  AND EXISTS (SELECT 1 FROM learning_catalog.current_items i
                              WHERE i.question_code = q.code AND i.kind = 'QUESTION' AND i.student_visible
                                AND i.availability = 'available' AND i.category_ids && ARRAY[:categories]::text[])
                """).param("ids", items.stream().map(Item::questionId).toList()).param("categories", categories)
                .query((rs, n) -> new Row(rs.getLong("id"), rs.getString("code"), rs.getString("bank"),
                        (Integer) rs.getObject("exam_year"), rs.getString("image"), rs.getBoolean("positioned"))).list();
        Map<Long, Row> byId = new LinkedHashMap<>();
        rows.forEach(row -> byId.put(row.id(), row));
        List<String> missing = items.stream().filter(item -> !byId.containsKey(item.questionId())).map(item -> String.valueOf(item.questionId())).toList();
        if (!missing.isEmpty()) throw ApiException.conflict("Şu sorular bu konuda kullanılamıyor (etkin değil, öğrenciye açık değil veya başka konuya bağlı): "
                + String.join(", ", missing.stream().limit(8).toList()));
        if ("PAST_EXAM".equals(kind)) {
            List<String> notPast = rows.stream().filter(r -> !"CIKMIS".equals(r.bank()) || r.year() == null || !r.positioned()).map(Row::code).toList();
            if (!notPast.isEmpty()) throw ApiException.conflict("Çıkmış sorular setine doğrulanmış sınav konumu olmayan soru girmez: "
                    + String.join(", ", notPast.stream().limit(8).toList()));
        }

        // Aynı soru farklı kodla (ör. Eşit Ağırlık ve Sayısal kitapçıkları) gelebilir: görünen içerik baytı tekil olmalı.
        Map<String, String> firstWithHash = new LinkedHashMap<>();
        List<String> twins = new ArrayList<>();
        Map<Long, String> hashById = new LinkedHashMap<>();
        for (Item item : items) {
            Row row = byId.get(item.questionId());
            String hash = contentHash(row);
            hashById.put(row.id(), hash);
            String first = firstWithHash.putIfAbsent(hash, row.code());
            if (first != null) twins.add(first + " = " + row.code());
        }
        if (!twins.isEmpty()) throw ApiException.conflict("Aynı görseli taşıyan sorular bir sette birlikte kullanılamaz: "
                + String.join("; ", twins.stream().limit(6).toList()));

        String title = title(body.title(), kind);
        ObjectNode scope = mapper.createObjectNode().put("title", title).put("itemCount", items.size());
        if (archetype != null) scope.put("archetypeId", archetype);
        jdbc.sql("SELECT run_key FROM learning_catalog.current_run WHERE singleton").query(String.class).optional()
                .ifPresent(run -> scope.put("catalogRun", run));
        ObjectNode catalog = mapper.createObjectNode();
        categories.forEach(catalog.putArray("categoryIds")::add);
        Optional<Long> inserted = jdbc.sql("""
                INSERT INTO study_sessions (user_id, mode, selection_mode, client_request_id, filter_subject, filter_topic,
                                            catalog_filter, track_id, origin, learning_kind, learning_concept_id, learning_scope)
                VALUES (:userId, 'PRACTICE', 'MIXED', :requestId, 'Matematik', :title,
                        CAST(:catalog AS jsonb), :trackId, 'KONU_OGRENME', :kind, :concept, CAST(:scope AS jsonb))
                ON CONFLICT (user_id, client_request_id) DO NOTHING RETURNING id
                """).param("userId", userId).param("requestId", body.clientRequestId()).param("title", title)
                .param("catalog", catalog.toString()).param("trackId", trackId).param("kind", kind).param("concept", concept)
                .param("scope", scope.toString()).query(Long.class).optional();
        if (inserted.isEmpty()) throw ApiException.conflict("Çalışma aynı anda başka bir pencerede kuruldu. Sayfayı yenile.");
        long sessionId = inserted.get();
        int position = 0;
        for (Item item : items) {
            jdbc.sql("""
                    INSERT INTO session_questions (session_id, question_id, position, learning_archetype, learning_difficulty, content_sha256)
                    VALUES (:sessionId, :questionId, :position, :archetype, :difficulty, :hash)
                    """).param("sessionId", sessionId).param("questionId", item.questionId()).param("position", ++position)
                    .param("archetype", item.archetypeId()).param("difficulty", item.difficulty() == null ? null : item.difficulty().shortValue())
                    .param("hash", hashById.get(item.questionId())).update();
        }
        return new Created(sessions.get(userId, sessionId), false, false);
    }

    private static String title(String requested, String kind) {
        String clean = requested == null ? "" : requested.replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
        if (clean.length() > 120) clean = clean.substring(0, 120).trim();
        if (!clean.isEmpty()) return clean;
        return switch (kind) { case "PAST_EXAM" -> "Çıkmış sorular"; case "ARCHETYPE" -> "Soru tipi alıştırması"; default -> "Konu testi"; };
    }

    /** Öğrencinin gördüğü görselin (kırpılmış/onarılmış varyant dâhil) SHA-256 özeti; görsel yoksa set kurulmaz. */
    private String contentHash(Row row) {
        try (var stream = images.load(row.image()).getInputStream()) {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(stream.readAllBytes()));
        } catch (ApiException | IOException error) {
            throw ApiException.conflict("Soru görseli okunamadı: " + row.code());
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }

    /** Açık ve son tamamlanan ortak setler: ders ekranı "devam et" ve sonuç özeti için. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> summaries(long userId) {
        return jdbc.sql("""
                SELECT s.id, s.status, s.learning_kind, s.learning_concept_id, s.learning_scope->>'archetypeId' AS archetype,
                       s.learning_scope->>'title' AS title, s.started_at, s.ended_at,
                       (SELECT count(*) FROM session_questions sq WHERE sq.session_id = s.id) AS total,
                       (SELECT count(DISTINCT a.question_id) FROM question_attempts a
                         WHERE a.session_id = s.id AND a.user_id = s.user_id AND a.event_type = 'ANSWER') AS answered,
                       (SELECT count(*) FROM (SELECT DISTINCT ON (a.question_id) a.is_correct FROM question_attempts a
                         WHERE a.session_id = s.id AND a.user_id = s.user_id AND a.event_type = 'ANSWER'
                         ORDER BY a.question_id, a.practice_round, a.id) f WHERE f.is_correct) AS first_correct
                FROM study_sessions s
                WHERE s.user_id = :userId AND s.origin = 'KONU_OGRENME' AND s.mode = 'PRACTICE' AND s.status IN ('IN_PROGRESS', 'COMPLETED')
                ORDER BY s.started_at DESC, s.id DESC LIMIT 60
                """).param("userId", userId).query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("status", rs.getString("status"));
            row.put("kind", rs.getString("learning_kind"));
            row.put("conceptId", rs.getString("learning_concept_id"));
            row.put("archetypeId", rs.getString("archetype"));
            row.put("title", rs.getString("title"));
            row.put("total", rs.getInt("total"));
            row.put("answered", rs.getInt("answered"));
            row.put("firstCorrect", rs.getInt("first_correct"));
            row.put("startedAt", rs.getTimestamp("started_at").toInstant().toString());
            row.put("endedAt", rs.getTimestamp("ended_at") == null ? null : rs.getTimestamp("ended_at").toInstant().toString());
            return row;
        }).list();
    }

    /**
     * Ortak ekranda verilen cevaplar ders motoruna ikinci kez yazılmaz; her (soru, tur) için ilk cevap, motorun okuduğu
     * bir `attempt` olayına çevrilir. Kimlik cevap satırından türetilir, iptal edilen setler katılmaz.
     */
    @Transactional(readOnly = true)
    public List<ObjectNode> engineEvents(long userId) {
        return jdbc.sql("""
                SELECT f.id, f.session_id, f.question_id, f.selected_answer, f.is_correct, f.active_seconds, f.created_at,
                       q.code, q.exam_type, s.learning_kind, s.learning_concept_id, sq.learning_archetype, sq.learning_difficulty
                FROM (SELECT DISTINCT ON (a.session_id, a.question_id, a.practice_round)
                             a.id, a.session_id, a.question_id, a.selected_answer, a.is_correct, a.active_seconds, a.created_at
                      FROM question_attempts a
                      WHERE a.user_id = :userId AND a.event_type = 'ANSWER' AND a.session_id IS NOT NULL
                      ORDER BY a.session_id, a.question_id, a.practice_round, a.id) f
                JOIN study_sessions s ON s.id = f.session_id AND s.user_id = :userId
                     AND s.origin = 'KONU_OGRENME' AND s.status <> 'ABANDONED'
                JOIN session_questions sq ON sq.session_id = f.session_id AND sq.question_id = f.question_id
                JOIN questions q ON q.id = f.question_id
                ORDER BY f.id
                """).param("userId", userId).query((rs, n) -> {
            ObjectNode event = mapper.createObjectNode();
            long attemptId = rs.getLong("id");
            event.put("id", UUID.nameUUIDFromBytes(("practice-set-attempt:" + attemptId).getBytes(StandardCharsets.UTF_8)).toString());
            event.put("at", Instant.ofEpochMilli(rs.getTimestamp("created_at").getTime()).toString());
            event.put("kind", "attempt").put("itemType", "bank").put("itemId", rs.getString("code"));
            event.put("questionId", rs.getLong("question_id")).put("conceptId", rs.getString("learning_concept_id"));
            if (rs.getString("learning_archetype") != null) event.put("archetypeId", rs.getString("learning_archetype"));
            if (rs.getObject("learning_difficulty") != null) event.put("difficulty", rs.getInt("learning_difficulty"));
            event.put("context", CONTEXT.get(rs.getString("learning_kind")));
            event.put("chosen", rs.getString("selected_answer")).put("correct", rs.getBoolean("is_correct"));
            event.put("timeMs", rs.getInt("active_seconds") * 1000L).put("exam", rs.getString("exam_type"));
            event.put("setId", "ps-" + rs.getLong("session_id")).put("hintUsed", false).put("mode", "INDEPENDENT").put("shared", true);
            event.put("seq", attemptId);
            return event;
        }).list();
    }
}
