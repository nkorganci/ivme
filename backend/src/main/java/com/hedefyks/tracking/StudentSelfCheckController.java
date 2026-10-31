package com.hedefyks.tracking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.learn.AnswerKeys;
import com.hedefyks.review.LearningResourceService;
import com.hedefyks.user.AppUserDetails;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/self-checks")
public class StudentSelfCheckController {
    public record Input(String kind, String itemKey, List<Integer> answers, Boolean solutionSeen) {}
    /** `correct` yalnız sunucu anahtarı olan not alıştırmasında dolu; rehber testi ve anahtarsız kayıtta null. */
    public record Attempt(long id, String kind, String itemKey, List<Integer> answers, Boolean correct, OffsetDateTime createdAt) {}

    private static final String COLUMNS = "id, kind, item_key, answers::text, correct, created_at";

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final AnswerKeys keys;
    private final LearningResourceService resources;

    public StudentSelfCheckController(JdbcTemplate jdbc, ObjectMapper mapper, AnswerKeys keys, LearningResourceService resources) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.keys = keys;
        this.resources = resources;
    }

    @GetMapping("/latest")
    public Attempt latest(@AuthenticationPrincipal AppUserDetails me,
                          @RequestParam String kind, @RequestParam String itemKey) {
        validateKey(kind, itemKey);
        return jdbc.query("SELECT " + COLUMNS + " FROM student_self_check_attempts "
                + "WHERE user_id = ? AND kind = ? AND item_key = ? ORDER BY id DESC LIMIT 1",
                this::attempt, me.id(), kind, itemKey).stream().findFirst().orElse(null);
    }

    @PostMapping
    public Attempt save(@AuthenticationPrincipal AppUserDetails me, @RequestBody Input input) {
        if (input == null) throw ApiException.badRequest("Alıştırma yanıtları gerekli.");
        validateKey(input.kind(), input.itemKey());
        int expected = "GUIDE_QUIZ".equals(input.kind()) ? 40 : 1;
        if (input.answers() == null || input.answers().size() != expected
                || input.answers().stream().anyMatch(answer -> answer == null || answer < 0 || answer > 3))
            throw ApiException.badRequest("Alıştırma yanıtları eksik veya geçersiz.");
        // TAS-04: not alıştırması sunucu anahtarıyla puanlanır ve cevap anındaki konu bağıyla saklanır.
        AnswerKeys.NoteKey key = "SOURCE_PRACTICE".equals(input.kind()) ? keys.notePractice(input.itemKey()) : null;
        if (key != null && input.answers().getFirst() >= key.choices()) throw ApiException.badRequest("Alıştırma yanıtları eksik veya geçersiz.");
        Boolean correct = key == null ? null : input.answers().getFirst() == key.answer();
        String topics = "SOURCE_PRACTICE".equals(input.kind()) ? encode(resources.studentTopicIds(input.itemKey())) : null;
        return jdbc.query("INSERT INTO student_self_check_attempts(user_id, kind, item_key, answers, correct, solution_seen, key_version, category_snapshot) "
                + "VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?::jsonb) RETURNING " + COLUMNS, this::attempt,
                me.id(), input.kind(), input.itemKey(), encode(input.answers()), correct,
                "SOURCE_PRACTICE".equals(input.kind()) ? Boolean.TRUE.equals(input.solutionSeen()) : null,
                key == null ? null : key.version(), topics).getFirst();
    }

    private void validateKey(String kind, String itemKey) {
        boolean guide = "GUIDE_QUIZ".equals(kind) && "coaching-guide-v1".equals(itemKey);
        boolean note = "SOURCE_PRACTICE".equals(kind) && itemKey != null
                && itemKey.matches("note:[a-zA-Z0-9._:-]{1,155}");
        if (!guide && !note) throw ApiException.badRequest("Alıştırma kimliği geçersiz.");
    }

    private Attempt attempt(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new Attempt(rs.getLong(1), rs.getString(2), rs.getString(3), decode(rs.getString(4)),
                (Boolean) rs.getObject(5), rs.getObject(6, OffsetDateTime.class));
    }

    private String encode(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Yanıtlar kodlanamadı.", error); }
    }

    private List<Integer> decode(String value) {
        try { return mapper.readValue(value, mapper.getTypeFactory().constructCollectionType(List.class, Integer.class)); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Alıştırma yanıtları okunamadı.", error); }
    }
}
