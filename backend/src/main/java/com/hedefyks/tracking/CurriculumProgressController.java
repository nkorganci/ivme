package com.hedefyks.tracking;

import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/curriculum/progress")
public class CurriculumProgressController {
    public record TopicProgress(String topicId, Instant completedAt) {}
    public record Change(Boolean completed) {}

    private final JdbcTemplate jdbc;
    private final com.hedefyks.review.ReviewCatalog vocabulary;

    public CurriculumProgressController(JdbcTemplate jdbc,com.hedefyks.review.ReviewCatalog vocabulary) {
        this.jdbc = jdbc;
        this.vocabulary=vocabulary;
    }

    @GetMapping
    public List<TopicProgress> list(@AuthenticationPrincipal AppUserDetails me) {
        var saved = jdbc.query("SELECT topic_id, completed_at FROM curriculum_topic_progress WHERE user_id = ? ORDER BY topic_id",
                (rs, row) -> new TopicProgress(rs.getString(1), rs.getTimestamp(2).toInstant()), me.id());
        var definitions = new java.util.HashMap<String,java.util.Map<String,Object>>();
        vocabulary.categories().forEach(c -> definitions.put(c.get("id").toString(), c));
        var result = new java.util.LinkedHashMap<String,TopicProgress>();
        for(var row:saved) {
            result.putIfAbsent(row.topicId(),row);
            var category=definitions.get(row.topicId());
            if(category==null || !(category.get("canonicalTopicIds") instanceof List<?> targets) || targets.size()!=1)continue;
            String target=targets.get(0).toString();
            // A split old topic is never silently marked as several completed topics.
            if(definitions.containsKey(target))result.putIfAbsent(target,new TopicProgress(target,row.completedAt()));
        }
        return List.copyOf(result.values());
    }

    @PutMapping("/{topicId}")
    @org.springframework.transaction.annotation.Transactional
    public TopicProgress change(@AuthenticationPrincipal AppUserDetails me,
                                @PathVariable String topicId, @RequestBody Change input) {
        if (topicId == null || topicId.length() > 160 || !topicId.matches("[a-zA-Z0-9:._-]+")
                || input == null || input.completed() == null
                || Boolean.TRUE.equals(input.completed()) && vocabulary.categories().stream().noneMatch(c->topicId.equals(c.get("id")) && "CURRICULUM".equals(c.get("origin")) && !Boolean.FALSE.equals(c.get("selectable")))) {
            throw ApiException.badRequest("Konu bilgisi geçersiz.");
        }
        if (!input.completed()) {
            jdbc.update("""
                DELETE FROM curriculum_topic_progress WHERE user_id = ? AND (topic_id = ? OR topic_id IN (
                  SELECT category_id FROM learning_catalog.current_categories
                  WHERE definition->'canonicalTopicIds'=jsonb_build_array(?::text)))
                """, me.id(), topicId, topicId);
            return new TopicProgress(topicId, null);
        }
        return jdbc.queryForObject("""
                INSERT INTO curriculum_topic_progress(user_id, topic_id, completed_at)
                VALUES (?, ?, now())
                ON CONFLICT (user_id, topic_id) DO UPDATE SET completed_at = curriculum_topic_progress.completed_at
                RETURNING topic_id, completed_at
                """, (rs, row) -> new TopicProgress(rs.getString(1), rs.getTimestamp(2).toInstant()), me.id(), topicId);
    }
}
