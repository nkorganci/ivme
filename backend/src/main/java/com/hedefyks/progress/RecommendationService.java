package com.hedefyks.progress;

import com.hedefyks.common.ApiException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Yalnız onaylı soru tipi ve soru başına ilk cevaptan açıklanabilir çalışma ipucu üretir. */
@Service
@Transactional(readOnly = true)
public class RecommendationService {
    public record Suggestion(String questionTypeCode, String questionType, String skill,
                             String subtopic, String prerequisite, long questions,
                             long correct, long wrong, double recentWeightedSuccess,
                             Long averageActiveSeconds, boolean slowerThanSubject,
                             long exampleQuestionId, String exampleQuestionCode) {}
    public record Result(String subject, long labeledQuestions, int distinctTypes,
                         String status, List<Suggestion> suggestions) {}
    private record Evidence(long questionId, String questionCode, long typeId, String code, String type,
                            String skill, String subtopic, String prerequisite,
                            boolean correct, int activeSeconds, Instant occurredAt) {}
    private static final int MIN_TOTAL = 30;
    private static final int MIN_TYPES = 3;
    private static final int MIN_PER_TYPE = 5;
    private static final int MAX_DAYS = 90;

    private static final String SQL = """
            WITH events AS (
              SELECT a.question_id, a.id AS source_id, 0 AS source_order, a.created_at AS occurred_at,
                     a.is_correct, a.active_seconds, q.subject
              FROM completed_practice_attempts a JOIN questions q ON q.id = a.question_id
              WHERE a.user_id = ? AND a.event_type = 'ANSWER'
              UNION ALL
              SELECT eq.question_id, eq.id, 1, e.submitted_at, eq.is_correct, 0, eq.subject
              FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
              WHERE e.user_id = ? AND e.status = 'SUBMITTED' AND eq.selected_answer IS NOT NULL
                AND eq.is_correct IS NOT NULL
            ), firsts AS (
              SELECT *, row_number() OVER
                (PARTITION BY question_id ORDER BY occurred_at, source_order, source_id) AS rn
              FROM events
            ), labeled AS (
              SELECT f.*, s.node_id AS type_id
              FROM firsts f JOIN attempt_taxonomy_snapshot s ON s.attempt_id = f.source_id
                AND s.node_kind = 'QUESTION_TYPE'
              WHERE f.rn = 1 AND f.source_order = 0
              UNION ALL
              SELECT f.*, s.node_id
              FROM firsts f JOIN exam_taxonomy_snapshot s ON s.exam_question_id=f.source_id
                AND s.node_kind='QUESTION_TYPE'
              WHERE f.rn = 1 AND f.source_order = 1
            )
            SELECT l.question_id, q.code AS question_code, t.id AS type_id, t.code, t.name AS type_name,
                   sk.name AS skill_name, st.name AS subtopic_name,
                   (SELECT string_agg(DISTINCT pre_st.name, ' + ' ORDER BY pre_st.name)
                    FROM taxonomy_prerequisites tp
                    JOIN taxonomy_nodes pre_sk ON pre_sk.id = tp.prerequisite_id AND pre_sk.kind = 'SKILL'
                    JOIN taxonomy_nodes pre_st ON pre_st.id = pre_sk.parent_id AND pre_st.kind = 'SUBTOPIC'
                    WHERE tp.node_id = sk.id) AS prerequisite,
                   l.is_correct, l.active_seconds, l.occurred_at
            FROM labeled l JOIN questions q ON q.id = l.question_id AND q.active
            JOIN taxonomy_nodes t ON t.id = l.type_id AND t.kind = 'QUESTION_TYPE' AND t.active
            JOIN taxonomy_nodes sk ON sk.id = t.parent_id AND sk.kind = 'SKILL' AND sk.active
            JOIN taxonomy_nodes st ON st.id = sk.parent_id AND st.kind = 'SUBTOPIC' AND st.active
            WHERE l.subject = ? AND l.occurred_at >= ? AND l.occurred_at < ?
            ORDER BY l.occurred_at, l.question_id, t.id
            """;

    private final JdbcTemplate jdbc;

    public RecommendationService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Result forSubject(Long userId, String subject) {
        return forSubjectAt(userId, subject, Instant.now());
    }

    public Result forSubjectAt(Long userId, String subject, Instant now) {
        if (subject == null || subject.isBlank() || subject.length() > 80) {
            throw ApiException.badRequest("Geçerli bir ders seç.");
        }
        String normalized = subject.trim();
        List<Evidence> rows = jdbc.query(SQL, (rs, n) -> new Evidence(
                rs.getLong("question_id"), rs.getString("question_code"),
                rs.getLong("type_id"), rs.getString("code"),
                rs.getString("type_name"), rs.getString("skill_name"),
                rs.getString("subtopic_name"), rs.getString("prerequisite"),
                rs.getBoolean("is_correct"), rs.getInt("active_seconds"),
                rs.getObject("occurred_at", OffsetDateTime.class).toInstant()),
                userId, userId, normalized,
                OffsetDateTime.ofInstant(now.minusSeconds(MAX_DAYS * 86400L), ZoneOffset.UTC),
                OffsetDateTime.ofInstant(now, ZoneOffset.UTC));
        Set<Long> unique = new HashSet<>();
        Map<Long, List<Evidence>> byType = new HashMap<>();
        long allTimed = 0;
        long allSeconds = 0;
        for (Evidence row : rows) {
            unique.add(row.questionId());
            byType.computeIfAbsent(row.typeId(), ignored -> new ArrayList<>()).add(row);
            if (row.activeSeconds() > 0) { allTimed++; allSeconds += row.activeSeconds(); }
        }
        if (unique.size() < MIN_TOTAL || byType.size() < MIN_TYPES) {
            return new Result(normalized, unique.size(), byType.size(), "INSUFFICIENT_DATA", List.of());
        }
        double subjectAverage = allTimed == 0 ? 0 : (double) allSeconds / allTimed;
        List<Suggestion> suggestions = new ArrayList<>();
        Instant recent = now.minusSeconds(30L * 86400);
        for (List<Evidence> group : byType.values()) {
            if (group.size() < MIN_PER_TYPE) continue;
            double weightedCorrect = 0;
            double weightTotal = 0;
            long correct = 0;
            long timed = 0;
            long seconds = 0;
            for (Evidence row : group) {
                double weight = row.occurredAt().isBefore(recent) ? 1 : 2;
                weightTotal += weight;
                if (row.correct()) { correct++; weightedCorrect += weight; }
                if (row.activeSeconds() > 0) { timed++; seconds += row.activeSeconds(); }
            }
            double success = Math.round(weightedCorrect * 1000 / weightTotal) / 10.0;
            boolean slow = timed >= MIN_PER_TYPE && allTimed >= MIN_TOTAL
                    && (double) seconds / timed > subjectAverage * 1.5;
            if (success >= 60 && !slow) continue;
            Evidence first = group.stream().filter(row -> !row.correct()).findFirst().orElse(group.getFirst());
            suggestions.add(new Suggestion(first.code(), first.type(), first.skill(), first.subtopic(),
                    first.prerequisite(), group.size(), correct, group.size() - correct,
                    success, timed == 0 ? null : Math.round((double) seconds / timed), slow,
                    first.questionId(), first.questionCode()));
        }
        suggestions.sort(Comparator.comparingDouble(Suggestion::recentWeightedSuccess)
                .thenComparing(Suggestion::questionTypeCode));
        return new Result(normalized, unique.size(), byType.size(),
                suggestions.isEmpty() ? "NO_CLEAR_WEAKNESS" : "SUGGESTIONS", suggestions);
    }
}
