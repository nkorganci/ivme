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
@RequestMapping("/api/tyt-trials")
public class TytTrialController {
    public record Sheet(long revision, String area, String obp, JsonNode rows) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public TytTrialController(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping
    public Sheet get(@AuthenticationPrincipal AppUserDetails me) {
        List<Sheet> found = jdbc.query("SELECT revision, payload::text FROM tyt_trial_sheets WHERE user_id = ?",
                (rs, n) -> {
                    try {
                        JsonNode payload = mapper.readTree(rs.getString(2));
                        return new Sheet(rs.getLong(1), payload.path("area").asText("TYT"),
                                payload.path("obp").asText(""), payload.path("rows"));
                    } catch (JsonProcessingException e) {
                        throw new IllegalStateException("TYT çizelgesi okunamadı.", e);
                    }
                }, me.id());
        return found.isEmpty() ? new Sheet(0, "TYT", "", mapper.createArrayNode()) : found.getFirst();
    }

    @PutMapping
    public Sheet save(@AuthenticationPrincipal AppUserDetails me, @RequestBody Sheet input) {
        validate(input);
        String payload;
        try {
            payload = mapper.writeValueAsString(Map.of("area", input.area(), "obp", input.obp(), "rows", input.rows()));
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("Deneme bilgileri işlenemedi.");
        }
        if (payload.length() > 500_000) throw ApiException.badRequest("Deneme kaydı çok büyük.");
        Long newRevision;
        try {
            if (input.revision() == 0) {
                newRevision = jdbc.queryForObject("""
                        INSERT INTO tyt_trial_sheets(user_id, revision, payload)
                        VALUES (?, 1, ?::jsonb) ON CONFLICT (user_id) DO NOTHING RETURNING revision
                        """, Long.class, me.id(), payload);
            } else {
                newRevision = jdbc.queryForObject("""
                        UPDATE tyt_trial_sheets SET revision = revision + 1, payload = ?::jsonb, updated_at = now()
                        WHERE user_id = ? AND revision = ? RETURNING revision
                        """, Long.class, payload, me.id(), input.revision());
            }
        } catch (EmptyResultDataAccessException e) {
            throw ApiException.conflict("Denemeler başka bir oturumda değişti. Sayfayı yenileyin.");
        }
        return new Sheet(newRevision, input.area(), input.obp(), input.rows());
    }

    private static void validate(Sheet input) {
        if (input == null || input.revision() < 0 || input.area() == null
                || !List.of("TYT", "SAY", "SOZ", "EA", "DIL").contains(input.area())
                || input.obp() == null || !input.obp().matches("\\d*(?:[.,]\\d{0,5})?")
                || (!input.obp().isEmpty() && !input.obp().matches("[.,]")
                    && Double.parseDouble(input.obp().replace(',', '.')) > 500)
                || input.rows() == null || !input.rows().isArray() || input.rows().size() > 500) {
            throw ApiException.badRequest("TYT deneme bilgileri geçersiz.");
        }
        for (JsonNode row : input.rows()) {
            if (!row.isObject() || !row.path("id").isTextual() || row.path("id").asText().isBlank()
                    || row.path("id").asText().length() > 100 || !row.path("date").isTextual()
                    || !row.path("date").asText().matches("(?:|\\d{4}-\\d{2}-\\d{2})")) {
                throw ApiException.badRequest("Deneme satırı geçersiz.");
            }
        }
    }
}
