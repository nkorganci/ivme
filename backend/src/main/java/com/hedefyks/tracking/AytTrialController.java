package com.hedefyks.tracking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import java.util.List;
import java.util.Map;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ayt-trials")
public class AytTrialController {
    public record Sheet(long revision, String area, JsonNode rows) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AytTrialController(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping
    public Sheet get(@AuthenticationPrincipal AppUserDetails me) {
        List<Sheet> found = jdbc.query("SELECT revision, payload::text FROM ayt_trial_sheets WHERE user_id = ?",
                (rs, n) -> {
                    try {
                        JsonNode payload = mapper.readTree(rs.getString(2));
                        return new Sheet(rs.getLong(1), payload.path("area").asText("SAY"), payload.path("rows"));
                    } catch (JsonProcessingException e) {
                        throw new IllegalStateException("AYT çizelgesi okunamadı.", e);
                    }
                }, me.id());
        return found.isEmpty() ? new Sheet(0, "SAY", mapper.createArrayNode()) : found.getFirst();
    }

    @PutMapping
    public Sheet save(@AuthenticationPrincipal AppUserDetails me, @RequestBody Sheet input) {
        validate(input);
        String payload;
        try {
            payload = mapper.writeValueAsString(Map.of("area", input.area(), "rows", input.rows()));
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("Deneme bilgileri işlenemedi.");
        }
        if (payload.length() > 500_000) throw ApiException.badRequest("Deneme kaydı çok büyük.");
        Long newRevision;
        try {
            if (input.revision() == 0) {
                newRevision = jdbc.queryForObject("""
                        INSERT INTO ayt_trial_sheets(user_id, revision, payload)
                        VALUES (?, 1, ?::jsonb) ON CONFLICT (user_id) DO NOTHING RETURNING revision
                        """, Long.class, me.id(), payload);
            } else {
                newRevision = jdbc.queryForObject("""
                        UPDATE ayt_trial_sheets SET revision = revision + 1, payload = ?::jsonb, updated_at = now()
                        WHERE user_id = ? AND revision = ? RETURNING revision
                        """, Long.class, payload, me.id(), input.revision());
            }
        } catch (EmptyResultDataAccessException e) {
            throw ApiException.conflict("Denemeler başka bir oturumda değişti. Sayfayı yenileyin.");
        }
        return new Sheet(newRevision, input.area(), input.rows());
    }

    private static void validate(Sheet input) {
        if (input == null || input.revision() < 0 || input.area() == null
                || !List.of("SAY", "SOZ", "EA", "DIL").contains(input.area())
                || input.rows() == null || !input.rows().isArray() || input.rows().size() > 500) {
            throw ApiException.badRequest("AYT deneme bilgileri geçersiz.");
        }
        Map<String, Integer> limits = Map.ofEntries(
                Map.entry("math", 40), Map.entry("physics", 14), Map.entry("chemistry", 13),
                Map.entry("biology", 13), Map.entry("literature", 24), Map.entry("history1", 10),
                Map.entry("geography1", 6), Map.entry("history2", 11), Map.entry("geography2", 11),
                Map.entry("philosophy", 12), Map.entry("religion", 6), Map.entry("language", 80));
        for (JsonNode row : input.rows()) {
            if (!row.isObject() || !row.path("id").isTextual() || row.path("id").asText().isBlank()
                    || row.path("id").asText().length() > 100 || !row.path("date").isTextual()
                    || !row.path("date").asText().matches("(?:|\\d{4}-\\d{2}-\\d{2})")
                    || !row.path("testNets").isObject()) {
                throw ApiException.badRequest("AYT deneme satırı geçersiz.");
            }
            var fields = row.path("testNets").fields();
            while (fields.hasNext()) {
                var field = fields.next();
                Integer limit = limits.get(field.getKey());
                if (limit == null || !field.getValue().isTextual()
                        || !field.getValue().asText().matches("-?\\d*(?:[.,]\\d{0,2})?")) {
                    throw ApiException.badRequest("AYT net bilgisi geçersiz.");
                }
                String raw = field.getValue().asText();
                if (!raw.isEmpty() && !List.of("-", ".", "-.", ",", "-,").contains(raw)) {
                    double net = Double.parseDouble(raw.replace(',', '.'));
                    if (net < -limit / 4.0 || net > limit) throw ApiException.badRequest("AYT net bilgisi geçersiz.");
                }
            }
        }
    }
}
