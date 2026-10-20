package com.hedefyks.tracking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
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
    public record Input(String kind, String itemKey, List<Integer> answers) {}
    public record Attempt(long id, String kind, String itemKey, List<Integer> answers, OffsetDateTime createdAt) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public StudentSelfCheckController(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping("/latest")
    public Attempt latest(@AuthenticationPrincipal AppUserDetails me,
                          @RequestParam String kind, @RequestParam String itemKey) {
        validateKey(kind, itemKey);
        return jdbc.query("""
                SELECT id, kind, item_key, answers::text, created_at
                FROM student_self_check_attempts
                WHERE user_id = ? AND kind = ? AND item_key = ?
                ORDER BY id DESC LIMIT 1
                """, (rs, row) -> new Attempt(rs.getLong(1), rs.getString(2), rs.getString(3),
                decode(rs.getString(4)), rs.getObject(5, OffsetDateTime.class)),
                me.id(), kind, itemKey).stream().findFirst().orElse(null);
    }

    @PostMapping
    public Attempt save(@AuthenticationPrincipal AppUserDetails me, @RequestBody Input input) {
        if (input == null) throw ApiException.badRequest("Alıştırma yanıtları gerekli.");
        validateKey(input.kind(), input.itemKey());
        int expected = "GUIDE_QUIZ".equals(input.kind()) ? 40 : 1;
        if (input.answers() == null || input.answers().size() != expected
                || input.answers().stream().anyMatch(answer -> answer == null || answer < 0 || answer > 3))
            throw ApiException.badRequest("Alıştırma yanıtları eksik veya geçersiz.");
        String answers;
        try { answers = mapper.writeValueAsString(input.answers()); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Yanıtlar kodlanamadı.", error); }
        return jdbc.query("""
                INSERT INTO student_self_check_attempts(user_id, kind, item_key, answers)
                VALUES (?, ?, ?, ?::jsonb)
                RETURNING id, kind, item_key, answers::text, created_at
                """, (rs, row) -> new Attempt(rs.getLong(1), rs.getString(2), rs.getString(3),
                decode(rs.getString(4)), rs.getObject(5, OffsetDateTime.class)),
                me.id(), input.kind(), input.itemKey(), answers).getFirst();
    }

    private void validateKey(String kind, String itemKey) {
        boolean guide = "GUIDE_QUIZ".equals(kind) && "coaching-guide-v1".equals(itemKey);
        boolean note = "SOURCE_PRACTICE".equals(kind) && itemKey != null
                && itemKey.matches("note:[a-zA-Z0-9._:-]{1,155}");
        if (!guide && !note) throw ApiException.badRequest("Alıştırma kimliği geçersiz.");
    }

    private List<Integer> decode(String value) {
        try { return mapper.readValue(value, mapper.getTypeFactory().constructCollectionType(List.class, Integer.class)); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Alıştırma yanıtları okunamadı.", error); }
    }
}
