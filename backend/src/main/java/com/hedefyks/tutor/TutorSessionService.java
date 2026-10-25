package com.hedefyks.tutor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.common.ApiException;
import com.hedefyks.tutor.TutorPolicy.Capabilities;
import com.hedefyks.tutor.TutorPolicy.NextStep;
import com.hedefyks.tutor.TutorPolicy.SessionState;
import com.hedefyks.tutor.TutorPolicy.StepType;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Öğretim oturumu: olayları kaydeder, durumu olaylardan yeniden kurar, öğrencinin hak ettiği
 * içeriği parça parça açar ve politika ile bir sonraki adımı seçer. Cevap anahtarı, çözüm,
 * seçilmemiş şıkların yanılgı eşlemesi ve gerekçe doğruluğu hak edilmeden yanıta girmez.
 */
@Service
public class TutorSessionService {
    public record Action(String type, String choice, String optionId, String stepId, String level, String text) {}

    private record Event(String type, JsonNode payload, Instant at) {}

    private static final Set<String> LEVELS = Set.of("SEZGI", "ADIM", "KISAYOL");
    private static final int MAX_FREE_TEXT = 5;

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final TutorContentStore store;
    private final TutorModelRouter router;
    private final Clock clock;

    public TutorSessionService(JdbcTemplate jdbc, ObjectMapper mapper, TutorContentStore store, TutorModelRouter router) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.store = store;
        this.router = router;
        this.clock = Clock.systemUTC();
    }

    // ------------------------------------------------------------------ katalog ve beceriler

    @Transactional(readOnly = true)
    public Map<String, Object> catalog(long userId) {
        var contents = store.visibleCatalog();
        Map<String, String> units = unitNames(contents.stream().map(TutorContentStore.Stored::categoryId).toList());
        Map<String, SkillModel.State> skills = skillMap(userId);
        Map<Long, Map<String, Object>> sessions = new HashMap<>();
        jdbc.query("""
                SELECT DISTINCT ON (question_id) question_id, id, status, outcome FROM tutor_sessions
                WHERE user_id = ? ORDER BY question_id, started_at DESC""", rs -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("sessionId", rs.getLong("id"));
            row.put("status", rs.getString("status"));
            row.put("outcome", rs.getString("outcome"));
            sessions.put(rs.getLong("question_id"), row);
        }, userId);
        List<Map<String, Object>> items = new ArrayList<>();
        for (var stored : contents) {
            JsonNode content = stored.content();
            Map<String, Object> item = questionMeta(stored, units);
            item.put("patternName", content.path("pattern").path("name").asText());
            JsonNode visual = content.path("visual");
            item.put("visual", visual.path("recommended").asBoolean() ? visual.path("template").asText() : null);
            item.put("contentStatus", stored.status());
            item.put("band", stored.band());
            SkillModel.State skill = skills.get(stored.patternKey());
            item.put("mastery", skill == null ? null : skill.mastery());
            item.put("masteryLevel", skill == null ? null : SkillModel.level(skill.mastery()));
            item.put("nextReviewAt", skill == null ? null : skill.nextReviewAt());
            item.put("lastSession", sessions.get(stored.questionId()));
            items.add(item);
        }
        return Map.of("items", items, "visibility", store.visibleStatuses().contains("AUTO") ? "PILOT" : "APPROVED_ONLY");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> skills(long userId) {
        Map<String, String> names = new HashMap<>();
        for (var stored : store.visibleCatalog()) names.put(stored.patternKey(), stored.content().path("pattern").path("name").asText());
        List<Map<String, Object>> rows = new ArrayList<>();
        jdbc.query("""
                SELECT skill_key, subject_id, category_id, mastery, independent_correct, assisted_correct, wrong,
                       hints_used, explain_correct, explain_total, transfer_correct, streak, last_outcome,
                       last_practiced_at, next_review_at
                FROM tutor_skill_states WHERE user_id = ? ORDER BY next_review_at NULLS LAST, skill_key""", rs -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("skillKey", rs.getString("skill_key"));
            row.put("name", names.getOrDefault(rs.getString("skill_key"), rs.getString("skill_key")));
            row.put("subjectId", rs.getString("subject_id"));
            row.put("categoryId", rs.getString("category_id"));
            double mastery = rs.getBigDecimal("mastery").doubleValue();
            row.put("mastery", mastery);
            row.put("level", SkillModel.level(mastery));
            row.put("independentCorrect", rs.getInt("independent_correct"));
            row.put("assistedCorrect", rs.getInt("assisted_correct"));
            row.put("wrong", rs.getInt("wrong"));
            row.put("hintsUsed", rs.getInt("hints_used"));
            row.put("explainCorrect", rs.getInt("explain_correct"));
            row.put("explainTotal", rs.getInt("explain_total"));
            row.put("transferCorrect", rs.getInt("transfer_correct"));
            row.put("streak", rs.getInt("streak"));
            row.put("lastOutcome", rs.getString("last_outcome"));
            row.put("lastPracticedAt", instant(rs.getTimestamp("last_practiced_at")));
            row.put("nextReviewAt", instant(rs.getTimestamp("next_review_at")));
            rows.add(row);
        }, userId);
        return rows;
    }

    // ------------------------------------------------------------------ oturum

    @Transactional
    public Map<String, Object> start(long userId, String code) {
        Long questionId = jdbc.query("SELECT id FROM questions WHERE code = ? AND active", (rs, n) -> rs.getLong(1), code)
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        guardExam(questionId, userId);
        var stored = store.visibleForQuestion(questionId)
                .orElseThrow(() -> ApiException.notFound("Bu soru için öğretim içeriği henüz yayında değil."));
        guardKey(stored);
        var open = jdbc.query("SELECT id, content_id FROM tutor_sessions WHERE user_id = ? AND question_id = ? AND status = 'OPEN'",
                (rs, n) -> new long[]{rs.getLong(1), rs.getLong(2)}, userId, questionId).stream().findFirst();
        if (open.isPresent() && open.get()[1] == stored.id()) return view(userId, open.get()[0]);
        // İçerik yeni sürüme geçtiyse eski açık oturum sonuçsuz kapanır; geçmiş olaylar korunur.
        open.ifPresent(row -> jdbc.update("UPDATE tutor_sessions SET status = 'DONE', finished_at = now() WHERE id = ?", row[0]));
        Long sessionId = jdbc.queryForObject("""
                INSERT INTO tutor_sessions(user_id, question_id, content_id) VALUES (?, ?, ?) RETURNING id""",
                Long.class, userId, questionId, stored.id());
        if (sessionId == null) throw new IllegalStateException("Oturum oluşturulamadı.");
        SkillModel.State skill = skill(userId, stored.patternKey());
        ObjectNode payload = mapper.createObjectNode().put("contentId", stored.id()).put("versionNo", stored.versionNo())
                .put("masteryAtStart", skill.mastery());
        append(sessionId, "START", payload);
        return view(userId, sessionId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> view(long userId, long sessionId) {
        var session = session(userId, sessionId, false);
        var stored = store.byId(session.contentId()).orElseThrow(() -> ApiException.notFound("İçerik bulunamadı."));
        return render(userId, session, stored, events(sessionId), null);
    }

    @Transactional
    public Map<String, Object> act(long userId, long sessionId, Action action) {
        if (action == null || action.type() == null) throw ApiException.badRequest("İşlem türü gerekli.");
        var session = session(userId, sessionId, true);
        if (!"OPEN".equals(session.status())) throw ApiException.conflict("Bu oturum tamamlandı; yeni oturum başlatabilirsin.");
        guardExam(session.questionId(), userId);
        var stored = store.byId(session.contentId()).orElseThrow(() -> ApiException.notFound("İçerik bulunamadı."));
        guardKey(stored);
        JsonNode content = stored.content();
        List<Event> events = events(sessionId);
        SessionState state = state(events, content);
        Capabilities caps = capabilities(content);
        boolean solved = state.solved(caps);
        Map<String, Object> feedback = null;
        switch (action.type()) {
            case "PREVIEW" -> {
                if (!state.previewShown()) append(sessionId, "PREVIEW", mapper.createObjectNode());
            }
            case "STRATEGY" -> {
                if (state.strategyDone()) throw ApiException.conflict("İlk hamle zaten seçildi.");
                JsonNode option = option(content.path("strategyChoice").path("options"), action.optionId());
                append(sessionId, "STRATEGY", mapper.createObjectNode().put("optionId", action.optionId())
                        .put("correct", option.path("correct").asBoolean()));
            }
            case "HINT" -> {
                if (solved) throw ApiException.conflict("Soru çözüldü; ipucuna gerek yok.");
                if (state.hintsShown() >= 3) throw ApiException.conflict("Üç ipucunun hepsini gördün; adım adım çözüme geçebilirsin.");
                append(sessionId, "HINT", mapper.createObjectNode().put("level", state.hintsShown() + 1));
            }
            case "ANSWER" -> {
                if (state.answeredCorrectly() || state.solutionViewed()) throw ApiException.conflict("Bu soru için cevap kapandı.");
                String choice = choice(action.choice(), content.path("question").path("choiceCount").asInt(5));
                if (wrongChoices(events).contains(choice)) throw ApiException.conflict("Bu şıkkı zaten denedin.");
                boolean correct = choice.equals(content.path("question").path("answerKey").asText());
                String misconception = null;
                if (!correct) {
                    for (JsonNode item : content.path("misconceptions")) {
                        if (choice.equals(item.path("choice").asText(null))) { misconception = item.path("id").asText(); break; }
                    }
                }
                ObjectNode payload = mapper.createObjectNode().put("choice", choice).put("correct", correct)
                        .put("hintsBefore", state.hintsShown()).put("stepsBefore", state.stepsRevealed())
                        .put("wrongBefore", state.wrongCount());
                if (misconception != null) payload.put("misconceptionId", misconception); else payload.putNull("misconceptionId");
                append(sessionId, "ANSWER", payload);
            }
            case "STEP" -> {
                int total = caps.stepCount();
                if (state.stepsRevealed() >= total) throw ApiException.conflict("Bütün adımlar açık.");
                String stepId = content.path("solution").path("steps").path(state.stepsRevealed()).path("id").asText();
                append(sessionId, "STEP", mapper.createObjectNode().put("stepId", stepId));
            }
            case "EXPLAIN" -> {
                JsonNode step = step(content, action.stepId());
                if (!step.has("selfExplain")) throw ApiException.badRequest("Bu adım için gerekçe sorusu yok.");
                if (!solved && !revealedSteps(events, content).contains(action.stepId())) {
                    throw ApiException.conflict("Önce bu adımı aç.");
                }
                if (explainedSteps(events).contains(action.stepId())) throw ApiException.conflict("Bu adımın gerekçesini zaten seçtin.");
                JsonNode option = option(step.path("selfExplain").path("options"), action.optionId());
                append(sessionId, "EXPLAIN", mapper.createObjectNode().put("stepId", action.stepId())
                        .put("optionId", action.optionId()).put("correct", option.path("correct").asBoolean()));
            }
            case "LEVEL" -> {
                if (!solved) throw ApiException.conflict("Farklı anlatım seviyeleri çözüm açıldıktan sonra gösterilir.");
                String level = action.level() == null ? "" : action.level();
                if (!LEVELS.contains(level)) throw ApiException.badRequest("Anlatım seviyesi geçersiz.");
                if ("KISAYOL".equals(level) && content.path("solution").path("levels").path("kisayol").isNull()) {
                    throw ApiException.badRequest("Bu soru için kısayol anlatımı yok.");
                }
                append(sessionId, "LEVEL", mapper.createObjectNode().put("level", level));
            }
            case "PREDICT" -> {
                JsonNode visual = content.path("visual");
                if (!visual.path("recommended").asBoolean() || !visual.has("predict")) throw ApiException.badRequest("Bu görselde tahmin sorusu yok.");
                if (!"PRE".equals(visual.path("stage").asText()) && !solved) throw ApiException.conflict("Görsel çözümden sonra açılır.");
                if ("PRE".equals(visual.path("stage").asText()) && !solved && !state.previewShown()) {
                    append(sessionId, "PREVIEW", mapper.createObjectNode());
                }
                if (state.predictDone()) throw ApiException.conflict("Tahminini zaten yaptın.");
                JsonNode option = option(visual.path("predict").path("options"), action.optionId());
                append(sessionId, "PREDICT", mapper.createObjectNode().put("optionId", action.optionId())
                        .put("correct", option.path("correct").asBoolean()));
            }
            case "SOLUTION" -> {
                if (state.solutionViewed()) throw ApiException.conflict("Çözüm zaten açık.");
                append(sessionId, "SOLUTION", mapper.createObjectNode().put("answeredBefore", state.answeredCorrectly()));
            }
            case "TWIN_ANSWER" -> {
                if (!solved) throw ApiException.conflict("İkiz soru, asıl soru tamamlandıktan sonra açılır.");
                if (state.twinAnswered()) throw ApiException.conflict("İkiz soruyu zaten yanıtladın.");
                JsonNode twin = content.path("twin");
                String choice = choice(action.choice(), 5);
                if (!twin.path("choices").has(choice)) throw ApiException.badRequest("Şık geçersiz.");
                append(sessionId, "TWIN_ANSWER", mapper.createObjectNode().put("choice", choice)
                        .put("correct", choice.equals(twin.path("answer").asText())));
            }
            case "FREE_TEXT" -> {
                String text = action.text() == null ? "" : action.text().trim();
                if (text.length() < 3 || text.length() > 500) throw ApiException.badRequest("Açıklama 3-500 karakter olmalı.");
                JsonNode step = step(content, action.stepId());
                if (!solved && !revealedSteps(events, content).contains(action.stepId())) throw ApiException.conflict("Önce bu adımı aç.");
                long used = events.stream().filter(e -> "FREE_TEXT".equals(e.type())).count();
                if (used >= MAX_FREE_TEXT) throw ApiException.conflict("Bu oturumda açıklama sınırına ulaştın.");
                var result = router.classify(sessionId, stored.id(), content, step, text);
                append(sessionId, "FREE_TEXT", mapper.createObjectNode().put("stepId", action.stepId()).put("text", text)
                        .put("label", result.label()).put("feedback", result.feedback()).put("tier", result.tier())
                        .put("routedTo", result.routedTo()).put("cacheHit", result.cacheHit()));
            }
            case "FINISH" -> {
                if (!solved) throw ApiException.conflict("Önce soruyu çöz ya da çözümü aç.");
                feedback = finish(userId, session, stored, state);
            }
            default -> throw ApiException.badRequest("Bilinmeyen işlem.");
        }
        return render(userId, session(userId, sessionId, false), stored, events(sessionId), feedback);
    }

    private Map<String, Object> finish(long userId, SessionRow session, TutorContentStore.Stored stored, SessionState state) {
        SkillModel.Outcome outcome = state.outcome() == null ? SkillModel.Outcome.SOLUTION_VIEWED : state.outcome();
        SkillModel.State before = skill(userId, stored.patternKey());
        var evidence = new SkillModel.Evidence(outcome, state.hintsBeforeCorrect(), state.wrongBeforeCorrect(),
                state.explainCorrect(), state.explainTotal(), state.twinAnswered() ? state.twinCorrect() : null);
        Instant now = clock.instant();
        SkillModel.State after = SkillModel.apply(before, evidence, now);
        saveSkill(userId, stored, after);
        append(session.id(), "DONE", mapper.createObjectNode().put("outcome", outcome.name())
                .put("masteryBefore", before.mastery()).put("masteryAfter", after.mastery())
                .put("nextReviewAt", after.nextReviewAt().toString()));
        jdbc.update("UPDATE tutor_sessions SET status = 'DONE', outcome = ?, finished_at = now() WHERE id = ?",
                outcome.name(), session.id());
        return Map.of("outcome", outcome.name(), "masteryBefore", before.mastery(), "masteryAfter", after.mastery());
    }

    // ------------------------------------------------------------------ görünüm

    private Map<String, Object> render(long userId, SessionRow session, TutorContentStore.Stored stored, List<Event> events,
                                       Map<String, Object> lastFeedback) {
        JsonNode content = stored.content();
        SessionState state = state(events, content);
        Capabilities caps = capabilities(content);
        boolean solved = state.solved(caps);
        SkillModel.State skill = skill(userId, stored.patternKey());
        double mastery = events.isEmpty() ? skill.mastery() : events.get(0).payload().path("masteryAtStart").asDouble(skill.mastery());
        NextStep next = TutorPolicy.decide(state, caps, mastery);

        Map<String, Object> view = new LinkedHashMap<>();
        view.put("sessionId", session.id());
        view.put("status", session.status());
        view.put("outcome", session.outcome());
        view.put("question", questionMeta(stored, unitNames(List.of(stored.categoryId()))));
        view.put("content", Map.of("id", stored.id(), "versionNo", stored.versionNo(),
                "status", "APPROVED".equals(stored.status()) ? "APPROVED" : "PILOT", "band", stored.band()));
        view.put("pattern", Map.of("key", stored.patternKey(), "name", content.path("pattern").path("name").asText()));
        view.put("skill", Map.of("mastery", skill.mastery(), "level", SkillModel.level(skill.mastery()),
                "nextReviewAt", skill.nextReviewAt() == null ? "" : skill.nextReviewAt().toString()));
        view.put("nextStep", Map.of("type", next.type().name(), "title", next.title(), "reason", next.reason()));
        view.put("wrongChoices", wrongChoices(events));
        view.put("answeredCorrectly", state.answeredCorrectly());
        view.put("solved", solved);
        view.put("cards", cards(events, content, stored, state, solved, mastery));
        view.put("prompts", prompts(next, events, content, state, solved));
        int steps = caps.stepCount();
        Map<String, Object> available = new LinkedHashMap<>();
        available.put("hint", !solved && state.hintsShown() < 3);
        available.put("hintsLeft", Math.max(0, 3 - state.hintsShown()));
        available.put("answer", !state.answeredCorrectly() && !state.solutionViewed() && "OPEN".equals(session.status()));
        available.put("step", state.stepsRevealed() < steps && "OPEN".equals(session.status()));
        available.put("stepsLeft", Math.max(0, steps - state.stepsRevealed()));
        available.put("solution", !state.solutionViewed() && "OPEN".equals(session.status()));
        available.put("levels", solved ? levels(content) : List.of());
        available.put("preview", !state.previewShown());
        available.put("freeText", solved || state.stepsRevealed() > 0);
        available.put("finish", solved && "OPEN".equals(session.status()));
        view.put("available", available);
        if (lastFeedback != null) view.put("summary", lastFeedback);
        return view;
    }

    /**
     * Kartlar olay sırasıyla kurulur. Doğru cevaptan sonraki aşamalar döngü sırasıyla açılır:
     * gerekçe sorusu yanıtlanınca görsel, görsel aşaması bitince (ya da gerekmiyorsa) ikiz soru.
     */
    private List<Map<String, Object>> cards(List<Event> events, JsonNode content, TutorContentStore.Stored stored,
                                            SessionState state, boolean solved, double mastery) {
        List<Map<String, Object>> cards = new ArrayList<>();
        Map<String, Map<String, Object>> stepCards = new HashMap<>();
        Map<String, JsonNode> explained = new HashMap<>();
        Map<String, List<Map<String, Object>>> freeTexts = new HashMap<>();
        JsonNode predict = null;
        for (Event event : events) {
            if ("EXPLAIN".equals(event.type())) explained.put(event.payload().path("stepId").asText(), event.payload());
            if ("PREDICT".equals(event.type())) predict = event.payload();
            if ("FREE_TEXT".equals(event.type())) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("text", event.payload().path("text").asText());
                item.put("label", event.payload().path("label").asText());
                item.put("feedback", event.payload().path("feedback").asText());
                item.put("routedTo", event.payload().path("routedTo").asText());
                freeTexts.computeIfAbsent(event.payload().path("stepId").asText(), k -> new ArrayList<>()).add(item);
            }
        }
        Capabilities caps = capabilities(content);
        JsonNode visualNode = content.path("visual");
        boolean visualShown = false;
        boolean finalShown = false;
        boolean twinShown = false;
        for (int i = 0; i < events.size(); i++) {
            Event event = events.get(i);
            JsonNode p = event.payload();
            switch (event.type()) {
                case "PREVIEW" -> {
                    cards.add(patternCard(content, "PATTERN"));
                    JsonNode visual = content.path("visual");
                    if (!visualShown && visual.path("recommended").asBoolean() && "PRE".equals(visual.path("stage").asText())) {
                        cards.add(visualCard(visual, predict));
                        visualShown = true;
                    }
                }
                case "STRATEGY" -> {
                    JsonNode option = find(content.path("strategyChoice").path("options"), p.path("optionId").asText());
                    Map<String, Object> card = card("STRATEGY");
                    card.put("prompt", content.path("strategyChoice").path("prompt").asText());
                    card.put("chosen", option.path("text").asText());
                    card.put("correct", p.path("correct").asBoolean());
                    card.put("feedback", option.path("feedback").asText());
                    if (!p.path("correct").asBoolean()) {
                        JsonNode right = correctOption(content.path("strategyChoice").path("options"));
                        card.put("better", right.path("text").asText());
                        card.put("betterFeedback", right.path("feedback").asText());
                    }
                    cards.add(card);
                }
                case "HINT" -> {
                    JsonNode hint = content.path("hints").path(p.path("level").asInt() - 1);
                    Map<String, Object> card = card("HINT");
                    card.put("level", hint.path("level").asInt());
                    card.put("hintKind", hint.path("kind").asText());
                    card.put("text", hint.path("text").asText());
                    cards.add(card);
                }
                case "ANSWER" -> {
                    Map<String, Object> card = card("ANSWER");
                    card.put("choice", p.path("choice").asText());
                    card.put("correct", p.path("correct").asBoolean());
                    if (!p.path("correct").asBoolean()) {
                        String id = p.path("misconceptionId").asText(null);
                        JsonNode item = id == null ? null : find(content.path("misconceptions"), id);
                        if (item != null && !item.isMissingNode()) {
                            card.put("misconception", Map.of("mistake", item.path("mistake").asText(),
                                    "cause", item.path("cause").asText(), "fix", item.path("fix").asText(),
                                    "guidingQuestion", item.path("guidingQuestion").asText()));
                        } else {
                            JsonNode guide = content.path("guidingQuestions").path(Math.min(state.wrongCount() - 1,
                                    Math.max(0, content.path("guidingQuestions").size() - 1)));
                            card.put("guidingQuestion", guide.isMissingNode() ? null : guide.path("text").asText());
                        }
                    }
                    cards.add(card);
                    if (p.path("correct").asBoolean() && !finalShown) {
                        cards.add(finalCard(content));
                        finalShown = true;
                    }
                }
                case "STEP", "EXPLAIN", "FREE_TEXT" -> addStep(cards, stepCards, content, stored, p.path("stepId").asText(),
                        explained, freeTexts, solved);
                case "SOLUTION" -> {
                    for (JsonNode step : content.path("solution").path("steps")) {
                        addStep(cards, stepCards, content, stored, step.path("id").asText(), explained, freeTexts, true);
                    }
                    if (!finalShown) { cards.add(finalCard(content)); finalShown = true; }
                    if (!content.path("alternative").isNull()) cards.add(alternativeCard(content));
                }
                case "LEVEL" -> {
                    Map<String, Object> card = card("LEVEL");
                    String level = p.path("level").asText();
                    card.put("level", level);
                    card.put("text", "ADIM".equals(level) ? null : content.path("solution").path("levels")
                            .path("SEZGI".equals(level) ? "sezgi" : "kisayol").asText());
                    if ("ADIM".equals(level)) {
                        List<Map<String, Object>> steps = new ArrayList<>();
                        for (JsonNode step : content.path("solution").path("steps")) {
                            steps.add(Map.of("text", step.path("text").asText(), "why", step.path("why").asText()));
                        }
                        card.put("steps", steps);
                    }
                    cards.add(card);
                }
                case "TWIN_ANSWER" -> {
                    JsonNode twin = content.path("twin");
                    if (!twinShown) { cards.add(twinCard(content, true)); twinShown = true; }
                    Map<String, Object> card = card("TWIN_RESULT");
                    card.put("choice", p.path("choice").asText());
                    card.put("correct", p.path("correct").asBoolean());
                    card.put("answer", twin.path("answer").asText());
                    card.put("solution", twin.path("solution").asText());
                    cards.add(card);
                }
                case "DONE" -> {
                    Map<String, Object> card = patternCard(content, "SUMMARY");
                    card.put("outcome", p.path("outcome").asText());
                    card.put("masteryBefore", p.path("masteryBefore").asDouble());
                    card.put("masteryAfter", p.path("masteryAfter").asDouble());
                    card.put("nextReviewAt", p.path("nextReviewAt").asText());
                    putAha(card, content);
                    List<Map<String, Object>> mistakes = new ArrayList<>();
                    for (JsonNode item : content.path("misconceptions")) {
                        mistakes.add(Map.of("mistake", item.path("mistake").asText(), "fix", item.path("fix").asText()));
                    }
                    card.put("misconceptions", mistakes);
                    cards.add(card);
                }
                default -> { }
            }
            SessionState partial = state(events.subList(0, i + 1), content);
            if (!partial.solved(caps) || partial.done() || !TutorPolicy.explainStageDone(partial, caps)) continue;
            if (!visualShown && caps.hasVisual()) {
                cards.add(visualCard(visualNode, predict));
                visualShown = true;
            }
            boolean visualDone = !caps.hasVisual() || partial.predictDone() || !TutorPolicy.needsPicture(partial, mastery);
            if (!twinShown && caps.hasTwin() && visualDone) {
                cards.add(twinCard(content, state.twinAnswered()));
                twinShown = true;
            }
        }
        if (solved && !finalShown && state.solutionViewed()) cards.add(finalCard(content));
        return cards;
    }

    private Map<String, Object> twinCard(JsonNode content, boolean answered) {
        Map<String, Object> twin = card("TWIN");
        twin.put("text", content.path("twin").path("text").asText());
        twin.put("choices", content.path("twin").path("choices"));
        twin.put("answered", answered);
        return twin;
    }

    private void addStep(List<Map<String, Object>> cards, Map<String, Map<String, Object>> stepCards, JsonNode content,
                         TutorContentStore.Stored stored, String stepId, Map<String, JsonNode> explained,
                         Map<String, List<Map<String, Object>>> freeTexts, boolean solved) {
        if (stepCards.containsKey(stepId)) return;
        JsonNode steps = content.path("solution").path("steps");
        int index = 0;
        for (; index < steps.size(); index++) if (stepId.equals(steps.path(index).path("id").asText())) break;
        JsonNode step = steps.path(index);
        Map<String, Object> card = card("STEP");
        card.put("stepId", stepId);
        card.put("index", index + 1);
        card.put("total", steps.size());
        card.put("text", step.path("text").asText());
        JsonNode result = explained.get(stepId);
        boolean hasQuestion = step.has("selfExplain");
        // Gerekçe sorusu olan adımda "neden" metni, öğrenci kendi gerekçesini seçene kadar gizli kalır.
        card.put("why", !hasQuestion || result != null ? step.path("why").asText() : null);
        card.put("verified", stepVerified(stored, index));
        if (hasQuestion) {
            Map<String, Object> question = new LinkedHashMap<>();
            question.put("prompt", step.path("selfExplain").path("prompt").asText());
            question.put("options", options(step.path("selfExplain").path("options")));
            if (result != null) {
                JsonNode chosen = find(step.path("selfExplain").path("options"), result.path("optionId").asText());
                question.put("result", Map.of("optionId", result.path("optionId").asText(),
                        "correct", result.path("correct").asBoolean(), "feedback", chosen.path("feedback").asText()));
            }
            card.put("selfExplain", question);
        }
        card.put("freeTexts", freeTexts.getOrDefault(stepId, List.of()));
        stepCards.put(stepId, card);
        cards.add(card);
    }

    private List<Map<String, Object>> prompts(NextStep next, List<Event> events, JsonNode content, SessionState state, boolean solved) {
        List<Map<String, Object>> prompts = new ArrayList<>();
        if (!state.strategyDone() && !solved && state.attempts() == 0) {
            Map<String, Object> prompt = card("STRATEGY");
            prompt.put("suggested", next.type() == StepType.STRATEGY);
            prompt.put("prompt", content.path("strategyChoice").path("prompt").asText());
            prompt.put("options", options(content.path("strategyChoice").path("options")));
            prompts.add(prompt);
        }
        if (next.type() == StepType.EXPLAIN) {
            Set<String> done = explainedSteps(events);
            for (JsonNode step : content.path("solution").path("steps")) {
                if (step.has("selfExplain") && !done.contains(step.path("id").asText())) {
                    Map<String, Object> prompt = card("EXPLAIN");
                    prompt.put("stepId", step.path("id").asText());
                    prompt.put("stepText", step.path("text").asText());
                    prompt.put("prompt", step.path("selfExplain").path("prompt").asText());
                    prompt.put("options", options(step.path("selfExplain").path("options")));
                    prompts.add(prompt);
                    break;
                }
            }
        }
        return prompts;
    }

    private Map<String, Object> patternCard(JsonNode content, String kind) {
        JsonNode pattern = content.path("pattern");
        Map<String, Object> card = card(kind);
        card.put("name", pattern.path("name").asText());
        card.put("trigger", pattern.path("trigger").asText());
        card.put("bigIdea", pattern.path("bigIdea").asText());
        card.put("method", pattern.path("method"));
        card.put("whenNot", pattern.path("whenNot").asText());
        card.put("examTip", pattern.path("examTip").asText());
        // Kavrayış katmanının cevabı ele vermeyen kısmı; aha ve sağlama yalnız çözümden sonra (finalCard).
        JsonNode insight = content.path("insight");
        if (insight.isObject()) {
            Map<String, Object> pre = new LinkedHashMap<>();
            pre.put("analogy", insight.path("analogy"));
            pre.put("mindset", insight.path("mindset").asText());
            pre.put("radar", insight.path("radar"));
            pre.put("targetSeconds", insight.path("targetSeconds").asInt());
            card.put("insight", pre);
        }
        return card;
    }

    private static void putAha(Map<String, Object> card, JsonNode content) {
        JsonNode insight = content.path("insight");
        if (!insight.isObject()) return;
        card.put("aha", insight.path("aha").asText());
        card.put("sanityCheck", insight.path("sanityCheck").asText());
    }

    private Map<String, Object> visualCard(JsonNode visual, JsonNode predict) {
        Map<String, Object> card = card("VISUAL");
        card.put("template", visual.path("template").asText());
        card.put("title", visual.path("title").asText());
        card.put("reason", visual.path("reason").asText());
        card.put("stage", visual.path("stage").asText());
        card.put("params", visual.path("params"));
        card.put("frames", visual.path("frames"));
        if (visual.has("predict")) {
            Map<String, Object> question = new LinkedHashMap<>();
            question.put("prompt", visual.path("predict").path("prompt").asText());
            question.put("options", options(visual.path("predict").path("options")));
            if (predict != null) {
                JsonNode chosen = find(visual.path("predict").path("options"), predict.path("optionId").asText());
                question.put("result", Map.of("optionId", predict.path("optionId").asText(),
                        "correct", predict.path("correct").asBoolean(), "feedback", chosen.path("feedback").asText()));
            }
            card.put("predict", question);
        }
        return card;
    }

    private Map<String, Object> finalCard(JsonNode content) {
        Map<String, Object> card = card("FINAL");
        card.put("choice", content.path("solution").path("finalAnswer").path("choice").asText());
        card.put("value", content.path("solution").path("finalAnswer").path("value").asText());
        card.put("levels", levels(content));
        putAha(card, content);
        return card;
    }

    private Map<String, Object> alternativeCard(JsonNode content) {
        Map<String, Object> card = card("ALTERNATIVE");
        card.put("title", content.path("alternative").path("title").asText());
        card.put("text", content.path("alternative").path("text").asText());
        return card;
    }

    private static List<String> levels(JsonNode content) {
        return content.path("solution").path("levels").path("kisayol").isNull()
                ? List.of("SEZGI", "ADIM") : List.of("SEZGI", "ADIM", "KISAYOL");
    }

    private static boolean stepVerified(TutorContentStore.Stored stored, int index) {
        String path = "solution.steps[" + index + "].check";
        for (JsonNode check : stored.verification().path("checks")) {
            if (path.equals(check.path("path").asText())) return check.path("passed").asBoolean();
        }
        return false;
    }

    private static List<Map<String, Object>> options(JsonNode options) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (JsonNode option : options) list.add(Map.of("id", option.path("id").asText(), "text", option.path("text").asText()));
        return list;
    }

    private static Map<String, Object> card(String kind) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("kind", kind);
        return card;
    }

    // ------------------------------------------------------------------ durum

    static Capabilities capabilities(JsonNode content) {
        boolean selfExplain = false;
        for (JsonNode step : content.path("solution").path("steps")) selfExplain |= step.has("selfExplain");
        JsonNode visual = content.path("visual");
        return new Capabilities(selfExplain, visual.path("recommended").asBoolean(),
                "PRE".equals(visual.path("stage").asText()), content.has("twin"),
                content.path("solution").path("steps").size());
    }

    private SessionState state(List<Event> events, JsonNode content) {
        boolean preview = false, strategyDone = false, strategyCorrect = false, answeredCorrectly = false;
        boolean solutionViewed = false, solutionBeforeCorrect = false, predictDone = false, twinAnswered = false, done = false;
        Boolean twinCorrect = null;
        int hints = 0, hintsSinceAttempt = 0, attempts = 0, wrong = 0, explainCorrect = 0, explainTotal = 0;
        int stepsBeforeCorrect = 0, hintsBeforeCorrect = 0, wrongBeforeCorrect = 0;
        boolean lastWrong = false, lastMapped = false;
        Set<String> steps = new HashSet<>();
        for (Event event : events) {
            JsonNode p = event.payload();
            switch (event.type()) {
                case "PREVIEW" -> preview = true;
                case "STRATEGY" -> { strategyDone = true; strategyCorrect = p.path("correct").asBoolean(); lastWrong = false; }
                case "HINT" -> { hints++; hintsSinceAttempt++; lastWrong = false; }
                case "ANSWER" -> {
                    attempts++;
                    hintsSinceAttempt = 0;
                    if (p.path("correct").asBoolean()) {
                        answeredCorrectly = true;
                        stepsBeforeCorrect = p.path("stepsBefore").asInt();
                        hintsBeforeCorrect = p.path("hintsBefore").asInt();
                        wrongBeforeCorrect = p.path("wrongBefore").asInt();
                        lastWrong = false;
                    } else {
                        wrong++;
                        lastWrong = true;
                        lastMapped = !p.path("misconceptionId").isNull() && !p.path("misconceptionId").isMissingNode();
                    }
                }
                case "STEP" -> { steps.add(p.path("stepId").asText()); lastWrong = false; }
                case "SOLUTION" -> {
                    solutionViewed = true;
                    if (!answeredCorrectly) solutionBeforeCorrect = true;
                    for (JsonNode step : content.path("solution").path("steps")) steps.add(step.path("id").asText());
                    lastWrong = false;
                }
                case "EXPLAIN" -> { explainTotal++; if (p.path("correct").asBoolean()) explainCorrect++; }
                case "PREDICT" -> predictDone = true;
                case "TWIN_ANSWER" -> { twinAnswered = true; twinCorrect = p.path("correct").asBoolean(); }
                case "DONE" -> done = true;
                default -> { }
            }
        }
        return new SessionState(preview, strategyDone, strategyCorrect, hints, hintsSinceAttempt, attempts, wrong, lastWrong,
                lastWrong && lastMapped, answeredCorrectly, steps.size(), stepsBeforeCorrect, hintsBeforeCorrect,
                wrongBeforeCorrect, solutionViewed, solutionBeforeCorrect, explainCorrect, explainTotal, predictDone,
                twinAnswered, twinCorrect, done);
    }

    private static List<String> wrongChoices(List<Event> events) {
        List<String> wrong = new ArrayList<>();
        for (Event event : events) {
            if ("ANSWER".equals(event.type()) && !event.payload().path("correct").asBoolean()) wrong.add(event.payload().path("choice").asText());
        }
        return wrong;
    }

    private static Set<String> explainedSteps(List<Event> events) {
        Set<String> ids = new HashSet<>();
        for (Event event : events) if ("EXPLAIN".equals(event.type())) ids.add(event.payload().path("stepId").asText());
        return ids;
    }

    private static Set<String> revealedSteps(List<Event> events, JsonNode content) {
        Set<String> ids = new HashSet<>();
        for (Event event : events) {
            if ("STEP".equals(event.type())) ids.add(event.payload().path("stepId").asText());
            if ("SOLUTION".equals(event.type())) for (JsonNode step : content.path("solution").path("steps")) ids.add(step.path("id").asText());
        }
        return ids;
    }

    // ------------------------------------------------------------------ yardımcılar ve kalıcılık

    private record SessionRow(long id, long userId, long questionId, long contentId, String status, String outcome) {}

    private SessionRow session(long userId, long sessionId, boolean lock) {
        return jdbc.query("SELECT id, user_id, question_id, content_id, status, outcome FROM tutor_sessions WHERE id = ? AND user_id = ?"
                        + (lock ? " FOR UPDATE" : ""),
                (rs, n) -> new SessionRow(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getString(5), rs.getString(6)),
                sessionId, userId).stream().findFirst().orElseThrow(() -> ApiException.notFound("Oturum bulunamadı."));
    }

    private List<Event> events(long sessionId) {
        return jdbc.query("SELECT type, payload::text, created_at FROM tutor_events WHERE session_id = ? ORDER BY seq",
                (rs, n) -> new Event(rs.getString(1), read(rs.getString(2)), rs.getTimestamp(3).toInstant()), sessionId);
    }

    private void append(long sessionId, String type, JsonNode payload) {
        jdbc.update("""
                INSERT INTO tutor_events(session_id, seq, type, payload)
                VALUES (?, coalesce((SELECT max(seq) FROM tutor_events WHERE session_id = ?), 0) + 1, ?, ?::jsonb)""",
                sessionId, sessionId, type, payload.toString());
    }

    private JsonNode read(String raw) {
        try {
            return mapper.readTree(raw);
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    private void guardExam(long questionId, long userId) {
        Boolean inExam = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
                               WHERE eq.question_id = ? AND e.user_id = ? AND e.status = 'IN_PROGRESS')""",
                Boolean.class, questionId, userId);
        if (Boolean.TRUE.equals(inExam)) throw ApiException.notFound("Sınav sürerken öğretim modu kullanılamaz.");
    }

    /** İçerik, sorunun güncel anahtarıyla uyuşmuyorsa öğrenciye açılmaz (anahtar düzeltmesi sonrası). */
    private void guardKey(TutorContentStore.Stored stored) {
        String key = jdbc.queryForObject("SELECT correct_answer FROM questions WHERE id = ?", String.class, stored.questionId());
        if (!stored.content().path("question").path("answerKey").asText().equals(key)) {
            throw ApiException.conflict("Bu içerik sorunun güncel cevap anahtarıyla uyuşmuyor; öğretmen incelemesi bekleniyor.");
        }
    }

    private static String choice(String raw, int count) {
        String choice = raw == null ? "" : raw.trim().toUpperCase();
        if (choice.length() != 1 || "ABCDE".indexOf(choice) < 0 || "ABCDE".indexOf(choice) >= count) {
            throw ApiException.badRequest("Şık geçersiz.");
        }
        return choice;
    }

    private static JsonNode option(JsonNode options, String id) {
        JsonNode option = find(options, id);
        if (option.isMissingNode()) throw ApiException.badRequest("Seçenek geçersiz.");
        return option;
    }

    private static JsonNode correctOption(JsonNode options) {
        for (JsonNode option : options) if (option.path("correct").asBoolean()) return option;
        return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
    }

    private static JsonNode find(JsonNode array, String id) {
        for (JsonNode item : array) if (item.path("id").asText().equals(id)) return item;
        return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
    }

    private static JsonNode step(JsonNode content, String stepId) {
        JsonNode step = find(content.path("solution").path("steps"), stepId == null ? "" : stepId);
        if (step.isMissingNode()) throw ApiException.badRequest("Adım geçersiz.");
        return step;
    }

    private Map<String, Object> questionMeta(TutorContentStore.Stored stored, Map<String, String> units) {
        JsonNode question = stored.content().path("question");
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("questionId", stored.questionId());
        meta.put("code", stored.questionCode());
        meta.put("exam", question.path("exam").asText());
        meta.put("subjectId", stored.subjectId());
        meta.put("categoryId", stored.categoryId());
        meta.put("unitName", units.getOrDefault(stored.categoryId(), stored.categoryId()));
        meta.put("subtopic", question.path("subtopic").asText());
        meta.put("choiceCount", question.path("choiceCount").asInt(5));
        meta.put("difficulty", stored.content().path("classification").path("difficulty").asText());
        return meta;
    }

    private Map<String, String> unitNames(List<String> categoryIds) {
        Map<String, String> names = new HashMap<>();
        if (categoryIds.isEmpty()) return names;
        jdbc.query("SELECT category_id, definition->>'topic' FROM learning_catalog.current_categories WHERE category_id = ANY(?)",
                rs -> { names.put(rs.getString(1), rs.getString(2)); },
                (Object) categoryIds.stream().distinct().toArray(String[]::new));
        return names;
    }

    private Map<String, SkillModel.State> skillMap(long userId) {
        Map<String, SkillModel.State> map = new HashMap<>();
        jdbc.query("SELECT * FROM tutor_skill_states WHERE user_id = ?", rs -> {
            map.put(rs.getString("skill_key"), skillRow(rs));
        }, userId);
        return map;
    }

    private SkillModel.State skill(long userId, String key) {
        return jdbc.query("SELECT * FROM tutor_skill_states WHERE user_id = ? AND skill_key = ?", (rs, n) -> skillRow(rs), userId, key)
                .stream().findFirst().orElse(SkillModel.State.fresh());
    }

    private static SkillModel.State skillRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new SkillModel.State(rs.getBigDecimal("mastery").doubleValue(), rs.getInt("independent_correct"),
                rs.getInt("assisted_correct"), rs.getInt("wrong"), rs.getInt("hints_used"), rs.getInt("explain_correct"),
                rs.getInt("explain_total"), rs.getInt("transfer_correct"), rs.getInt("streak"), rs.getString("last_outcome"),
                instant(rs.getTimestamp("last_practiced_at")), instant(rs.getTimestamp("next_review_at")));
    }

    private void saveSkill(long userId, TutorContentStore.Stored stored, SkillModel.State s) {
        jdbc.update("""
                INSERT INTO tutor_skill_states(user_id, skill_key, subject_id, category_id, mastery, independent_correct,
                    assisted_correct, wrong, hints_used, explain_correct, explain_total, transfer_correct, streak,
                    last_outcome, last_practiced_at, next_review_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
                ON CONFLICT (user_id, skill_key) DO UPDATE SET mastery = excluded.mastery,
                    independent_correct = excluded.independent_correct, assisted_correct = excluded.assisted_correct,
                    wrong = excluded.wrong, hints_used = excluded.hints_used, explain_correct = excluded.explain_correct,
                    explain_total = excluded.explain_total, transfer_correct = excluded.transfer_correct,
                    streak = excluded.streak, last_outcome = excluded.last_outcome,
                    last_practiced_at = excluded.last_practiced_at, next_review_at = excluded.next_review_at,
                    updated_at = now()""",
                userId, stored.patternKey(), stored.subjectId(), stored.categoryId(), s.mastery(), s.independentCorrect(),
                s.assistedCorrect(), s.wrong(), s.hintsUsed(), s.explainCorrect(), s.explainTotal(), s.transferCorrect(),
                s.streak(), s.lastOutcome(), timestamp(s.lastPracticedAt()), timestamp(s.nextReviewAt()));
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    Optional<TutorContentStore.Stored> visible(long questionId) {
        return store.visibleForQuestion(questionId);
    }
}
