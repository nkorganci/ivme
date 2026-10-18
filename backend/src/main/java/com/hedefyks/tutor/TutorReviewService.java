package com.hedefyks.tutor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Öğretmen incelemesi: sürüm listesi, doğrulama kanıtı, karar, yeniden üretim isteği,
 * kalibrasyon ve model kullanım özeti. Karar satırları değişmezdir; onay en son kararla belirlenir.
 */
@Service
public class TutorReviewService {
    public record Rubric(int accuracy, int hints, int terminology, int teaching, int visual, boolean noLeak) {}

    private static final Set<String> DECISIONS = Set.of("APPROVE", "REJECT", "REQUEST_REGENERATION");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final TutorContentStore store;

    public TutorReviewService(JdbcTemplate jdbc, ObjectMapper mapper, TutorContentStore store) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.store = store;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String subjectId) {
        var latest = store.latestPerQuestion();
        Map<String, String> units = unitNames(latest.stream().map(TutorContentStore.Stored::categoryId).distinct().toList());
        Map<Long, Integer> reviews = new HashMap<>();
        jdbc.query("""
                SELECT c.question_id, count(r.id) FROM tutor_contents c JOIN tutor_content_reviews r ON r.content_id = c.id
                GROUP BY c.question_id""", rs -> { reviews.put(rs.getLong(1), rs.getInt(2)); });
        Set<Long> regenerating = Set.copyOf(jdbc.queryForList(
                "SELECT question_id FROM tutor_regeneration_requests WHERE status IN ('OPEN','EXPORTED')", Long.class));
        Set<Long> visible = new java.util.HashSet<>();
        store.visibleCatalog().forEach(stored -> visible.add(stored.questionId()));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (var stored : latest) {
            if (subjectId != null && !subjectId.isBlank() && !"all".equals(subjectId) && !subjectId.equals(stored.subjectId())) continue;
            JsonNode content = stored.content();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", stored.id());
            row.put("code", stored.questionCode());
            row.put("questionId", stored.questionId());
            row.put("subjectId", stored.subjectId());
            row.put("exam", content.path("question").path("exam").asText());
            row.put("unitName", units.getOrDefault(stored.categoryId(), stored.categoryId()));
            row.put("subtopic", content.path("question").path("subtopic").asText());
            row.put("difficulty", content.path("classification").path("difficulty").asText());
            row.put("patternName", content.path("pattern").path("name").asText());
            row.put("versionNo", stored.versionNo());
            row.put("status", stored.status());
            row.put("confidence", stored.confidence());
            row.put("band", stored.band());
            row.put("reviewFlag", stored.reviewFlag());
            row.put("reasons", stored.reviewReasons());
            int passed = 0, total = 0;
            for (JsonNode check : stored.verification().path("checks")) { total++; if (check.path("passed").asBoolean()) passed++; }
            row.put("checksPassed", passed);
            row.put("checksTotal", total);
            JsonNode visual = content.path("visual");
            row.put("visual", visual.path("recommended").asBoolean() ? visual.path("template").asText() : "");
            row.put("visibleToStudents", visible.contains(stored.questionId()));
            row.put("regenerating", regenerating.contains(stored.questionId()));
            row.put("reviews", reviews.getOrDefault(stored.questionId(), 0));
            row.put("createdAt", stored.createdAt());
            rows.add(row);
        }
        rows.sort((a, b) -> String.valueOf(a.get("subjectId")).compareTo(String.valueOf(b.get("subjectId"))) != 0
                ? String.valueOf(a.get("subjectId")).compareTo(String.valueOf(b.get("subjectId")))
                : String.valueOf(a.get("code")).compareTo(String.valueOf(b.get("code"))));
        return rows;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(String code) {
        var versions = store.versionsForCode(code);
        if (versions.isEmpty()) throw ApiException.notFound("Bu soru için öğretim içeriği yok.");
        var latest = versions.get(0);
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> question = new LinkedHashMap<>();
        question.put("questionId", latest.questionId());
        question.put("code", code);
        question.put("subjectId", latest.subjectId());
        question.put("unitName", unitNames(List.of(latest.categoryId())).getOrDefault(latest.categoryId(), latest.categoryId()));
        question.put("answerKey", jdbc.queryForObject("SELECT correct_answer FROM questions WHERE id = ?", String.class, latest.questionId()));
        result.put("question", question);
        List<Map<String, Object>> list = new ArrayList<>();
        for (var stored : versions) {
            Map<String, Object> version = new LinkedHashMap<>();
            version.put("id", stored.id());
            version.put("versionNo", stored.versionNo());
            version.put("status", stored.status());
            version.put("confidence", stored.confidence());
            version.put("band", stored.band());
            version.put("reviewFlag", stored.reviewFlag());
            version.put("reasons", stored.reviewReasons());
            version.put("verification", stored.verification());
            version.put("content", stored.content());
            version.put("generator", stored.generator());
            version.put("generationTier", stored.generationTier());
            version.put("createdAt", stored.createdAt());
            version.put("reviewedAt", stored.reviewedAt());
            version.put("reviews", jdbc.queryForList("""
                    SELECT r.id, r.decision, r.rubric::text AS rubric, r.note, r.confidence_at_review, r.band_at_review,
                           r.created_at, coalesce(u.username, '') AS reviewer
                    FROM tutor_content_reviews r LEFT JOIN users u ON u.id = r.reviewer_id
                    WHERE r.content_id = ? ORDER BY r.created_at DESC""", stored.id()).stream().map(this::jsonRubric).toList());
            list.add(version);
        }
        result.put("versions", list);
        result.put("regeneration", jdbc.queryForList("""
                SELECT id, status, reason, created_at, resolved_at, resolved_content_id FROM tutor_regeneration_requests
                WHERE question_id = ? ORDER BY created_at DESC""", latest.questionId()));
        result.put("usage", jdbc.queryForMap("""
                SELECT count(*) AS sessions,
                       count(*) FILTER (WHERE outcome = 'INDEPENDENT') AS independent,
                       count(*) FILTER (WHERE outcome = 'ASSISTED') AS assisted,
                       count(*) FILTER (WHERE outcome = 'WORKED') AS worked,
                       count(*) FILTER (WHERE outcome = 'SOLUTION_VIEWED') AS solution_viewed,
                       (SELECT count(*) FROM tutor_events e JOIN tutor_sessions s2 ON s2.id = e.session_id
                        WHERE s2.question_id = ? AND e.type = 'TWIN_ANSWER' AND (e.payload->>'correct')::boolean) AS twin_correct,
                       (SELECT count(*) FROM tutor_events e JOIN tutor_sessions s2 ON s2.id = e.session_id
                        WHERE s2.question_id = ? AND e.type = 'TWIN_ANSWER') AS twin_total
                FROM tutor_sessions s WHERE s.question_id = ?""", latest.questionId(), latest.questionId(), latest.questionId()));
        return result;
    }

    @Transactional
    public Map<String, Object> review(long reviewerId, long contentId, String decision, Rubric rubric, String note) {
        if (decision == null || !DECISIONS.contains(decision)) throw ApiException.badRequest("Karar geçersiz.");
        if (rubric == null) throw ApiException.badRequest("Değerlendirme ölçütleri gerekli.");
        for (int score : new int[]{rubric.accuracy(), rubric.hints(), rubric.terminology(), rubric.teaching()}) {
            if (score < 1 || score > 5) throw ApiException.badRequest("Puanlar 1-5 arasında olmalı.");
        }
        if (rubric.visual() < 0 || rubric.visual() > 5) throw ApiException.badRequest("Görsel puanı 0-5 arasında olmalı.");
        String text = note == null ? "" : note.trim();
        if (text.length() > 2000) throw ApiException.badRequest("Not çok uzun.");
        var stored = store.byId(contentId).orElseThrow(() -> ApiException.notFound("Sürüm bulunamadı."));
        if ("SUPERSEDED".equals(stored.status())) throw ApiException.conflict("Bu sürümün yerini daha yeni onaylı sürüm aldı.");
        if ("APPROVE".equals(decision) && (!rubric.noLeak() || rubric.accuracy() < 4)) {
            throw ApiException.badRequest("Onay için doğruluk en az 4 olmalı ve ipuçlarında cevap sızıntısı olmamalı.");
        }
        if (!"APPROVE".equals(decision) && text.length() < 5) throw ApiException.badRequest("Ret ve yeniden üretim için kısa bir gerekçe yaz.");
        jdbc.update("""
                INSERT INTO tutor_content_reviews(content_id, reviewer_id, decision, rubric, note, confidence_at_review, band_at_review)
                VALUES (?, ?, ?, ?::jsonb, ?, ?, ?)""", contentId, reviewerId, decision, json(rubric), text,
                stored.confidence(), stored.band());
        switch (decision) {
            case "APPROVE" -> {
                jdbc.update("UPDATE tutor_contents SET status = 'SUPERSEDED' WHERE question_id = ? AND status = 'APPROVED' AND id <> ?",
                        stored.questionId(), contentId);
                jdbc.update("UPDATE tutor_contents SET status = 'APPROVED', reviewed_by = ?, reviewed_at = now() WHERE id = ?",
                        reviewerId, contentId);
            }
            case "REJECT" -> jdbc.update("UPDATE tutor_contents SET status = 'REJECTED', reviewed_by = ?, reviewed_at = now() WHERE id = ?",
                    reviewerId, contentId);
            default -> {
                jdbc.update("UPDATE tutor_contents SET status = 'NEEDS_REVIEW', reviewed_by = ?, reviewed_at = now() WHERE id = ?",
                        reviewerId, contentId);
                int updated = jdbc.update("""
                        UPDATE tutor_regeneration_requests SET reason = reason || E'\\n' || ?, content_id = ?
                        WHERE question_id = ? AND status IN ('OPEN','EXPORTED')""", text, contentId, stored.questionId());
                if (updated == 0) {
                    jdbc.update("""
                            INSERT INTO tutor_regeneration_requests(question_id, content_id, requested_by, reason)
                            VALUES (?, ?, ?, ?)""", stored.questionId(), contentId, reviewerId, text);
                }
            }
        }
        return detail(stored.questionCode());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> calibration() {
        List<Map<String, Object>> bands = jdbc.queryForList("""
                SELECT b.band, coalesce(a.auto_count, 0) AS contents, coalesce(r.reviewed, 0) AS reviewed,
                       coalesce(r.approved, 0) AS approved, r.mean_confidence
                FROM (VALUES ('HIGH'), ('MEDIUM'), ('LOW')) AS b(band)
                LEFT JOIN (SELECT confidence_band, count(*) AS auto_count FROM tutor_contents GROUP BY confidence_band) a
                       ON a.confidence_band = b.band
                LEFT JOIN (SELECT band_at_review, count(DISTINCT content_id) AS reviewed,
                                  count(DISTINCT content_id) FILTER (WHERE decision = 'APPROVE') AS approved,
                                  round(avg(confidence_at_review), 3) AS mean_confidence
                           FROM tutor_content_reviews GROUP BY band_at_review) r ON r.band_at_review = b.band
                ORDER BY array_position(ARRAY['HIGH','MEDIUM','LOW'], b.band)""");
        List<Map<String, Object>> subjects = jdbc.queryForList("""
                SELECT c.subject_id, count(DISTINCT c.question_id) AS questions,
                       count(*) FILTER (WHERE c.status = 'APPROVED') AS approved,
                       count(*) FILTER (WHERE c.status = 'AUTO_VERIFIED') AS auto_verified,
                       count(*) FILTER (WHERE c.status = 'NEEDS_REVIEW') AS needs_review,
                       count(*) FILTER (WHERE c.status = 'REJECTED') AS rejected,
                       round(avg(c.confidence), 3) AS mean_confidence
                FROM tutor_contents c GROUP BY c.subject_id ORDER BY c.subject_id""");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bands", bands);
        result.put("subjects", subjects);
        result.put("note", "Onay oranı, güven bandının öğretmen kararıyla ne kadar uyuştuğunu gösterir. "
                + "YÜKSEK bantta onay oranı düşükse otomatik denetimler sıkılaştırılmalı; 80 bin soruya geçmeden bu tablo kabul ölçütüdür.");
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> queue() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("explanations", jdbc.queryForList("""
                SELECT t.id, t.status, t.step_id, t.student_text, t.model_label, t.teacher_label, t.teacher_note,
                       t.created_at, c.question_code, c.subject_id, c.content->'solution'->'steps' AS steps
                FROM tutor_teacher_queue t JOIN tutor_contents c ON c.id = t.content_id
                WHERE t.status = 'OPEN' ORDER BY t.created_at LIMIT 200""").stream().map(row -> {
                    Map<String, Object> copy = new LinkedHashMap<>(row);
                    copy.put("stepText", stepText(String.valueOf(row.get("steps")), String.valueOf(row.get("step_id"))));
                    copy.remove("steps");
                    return copy;
                }).toList());
        result.put("regeneration", jdbc.queryForList("""
                SELECT r.id, r.status, r.reason, r.created_at, q.code FROM tutor_regeneration_requests r
                JOIN questions q ON q.id = r.question_id WHERE r.status IN ('OPEN','EXPORTED') ORDER BY r.created_at"""));
        return result;
    }

    @Transactional
    public Map<String, Object> resolve(long reviewerId, long queueId, String label, String note) {
        if (label == null || !label.matches("CORRECT|PARTIAL|OFF_TOPIC|MISCONCEPTION:m[0-9]{1,2}")) {
            throw ApiException.badRequest("Etiket geçersiz.");
        }
        int updated = jdbc.update("""
                UPDATE tutor_teacher_queue SET status = 'RESOLVED', teacher_label = ?, teacher_note = ?, resolved_by = ?,
                       resolved_at = now() WHERE id = ? AND status = 'OPEN'""",
                label, note == null ? null : note.trim(), reviewerId, queueId);
        if (updated == 0) throw ApiException.notFound("Açık kayıt bulunamadı.");
        return queue();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> usage() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("calls", jdbc.queryForList("""
                SELECT task, tier, status, cache_hit, count(*) AS calls, round(avg(latency_ms)) AS mean_latency_ms
                FROM tutor_model_calls WHERE created_at > now() - interval '30 days'
                GROUP BY task, tier, status, cache_hit ORDER BY task, tier, status, cache_hit"""));
        result.put("cache", jdbc.queryForMap("SELECT count(*) AS entries, coalesce(sum(hits), 0) AS hits FROM tutor_model_cache"));
        return result;
    }

    private Map<String, Object> jsonRubric(Map<String, Object> row) {
        Map<String, Object> copy = new LinkedHashMap<>(row);
        try {
            copy.put("rubric", mapper.readTree(String.valueOf(row.get("rubric"))));
        } catch (Exception error) {
            copy.put("rubric", null);
        }
        return copy;
    }

    private String stepText(String steps, String stepId) {
        try {
            for (JsonNode step : mapper.readTree(steps)) if (stepId.equals(step.path("id").asText())) return step.path("text").asText();
        } catch (Exception ignored) {
            // Adım metni yalnız bağlam içindir; bulunamazsa boş döner.
        }
        return "";
    }

    private String json(Rubric rubric) {
        try {
            return mapper.writeValueAsString(rubric);
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    private Map<String, String> unitNames(List<String> categoryIds) {
        Map<String, String> names = new HashMap<>();
        if (categoryIds.isEmpty()) return names;
        jdbc.query("SELECT category_id, definition->>'topic' FROM learning_catalog.current_categories WHERE category_id = ANY(?)",
                rs -> { names.put(rs.getString(1), rs.getString(2)); }, (Object) categoryIds.toArray(String[]::new));
        return names;
    }
}
