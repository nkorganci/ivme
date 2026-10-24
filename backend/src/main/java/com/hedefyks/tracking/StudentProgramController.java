package com.hedefyks.tracking;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student-program/weeks")
public class StudentProgramController {
    public record Week(JsonNode rows, long revision) {}
    public record SaveWeek(JsonNode rows, long revision) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public StudentProgramController(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping("/{monday}")
    public Week get(@AuthenticationPrincipal AppUserDetails me, @PathVariable LocalDate monday) {
        checkMonday(monday);
        return jdbc.query("SELECT rows::text, revision FROM student_program_weeks WHERE user_id = ? AND week_start = ?",
                (rs, row) -> {
                    try {
                        return new Week(mapper.readTree(rs.getString(1)), rs.getLong(2));
                    } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
                        throw new IllegalStateException("Program kaydı okunamadı.", error);
                    }
                }, me.id(), monday).stream().findFirst().orElse(null);
    }

    @DeleteMapping
    public void deleteAll(@AuthenticationPrincipal AppUserDetails me) {
        jdbc.update("DELETE FROM student_program_weeks WHERE user_id = ?", me.id());
    }

    @PutMapping("/{monday}")
    public Week save(@AuthenticationPrincipal AppUserDetails me, @PathVariable LocalDate monday,
                     @RequestBody SaveWeek input) {
        checkMonday(monday);
        validate(input);
        String rows = input.rows().toString();
        List<Long> revisions;
        if (input.revision() == 0) {
            revisions = jdbc.query("""
                    INSERT INTO student_program_weeks(user_id, week_start, rows)
                    VALUES (?, ?, ?::jsonb)
                    ON CONFLICT (user_id, week_start) DO NOTHING
                    RETURNING revision
                    """, (rs, row) -> rs.getLong(1), me.id(), monday, rows);
        } else {
            revisions = jdbc.query("""
                    UPDATE student_program_weeks
                    SET rows = ?::jsonb, revision = revision + 1, updated_at = now()
                    WHERE user_id = ? AND week_start = ? AND revision = ?
                    RETURNING revision
                    """, (rs, row) -> rs.getLong(1),
                    rows, me.id(), monday, input.revision());
        }
        if (revisions.isEmpty())
            throw ApiException.conflict("Bu hafta başka bir oturumda değişti. Değişikliklerinizi koruyup sayfayı yenileyerek güncel kaydı açın.");
        return new Week(input.rows(), revisions.getFirst());
    }

    private static void checkMonday(LocalDate monday) {
        if (monday.getDayOfWeek().getValue() != 1)
            throw ApiException.badRequest("Hafta başlangıcı pazartesi olmalı.");
    }

    private static void validate(SaveWeek input) {
        if (input == null || input.revision() < 0 || input.rows() == null || !input.rows().isArray()
                || input.rows().isEmpty() || input.rows().size() > 1440
                || input.rows().toString().length() > 250_000)
            throw ApiException.badRequest("Haftalık program geçersiz veya çok büyük.");
        int total = 0;
        int start = 0;
        for (int i = 0; i < input.rows().size(); i++) {
            JsonNode row = input.rows().get(i);
            if (!row.isObject() || !row.path("minutes").canConvertToInt()
                    || row.path("minutes").asInt() < 1 || row.path("minutes").asInt() > 1440)
                throw ApiException.badRequest("Saat satırı geçersiz.");
            if (i == 0) {
                JsonNode firstStart = row.get("start");
                if (firstStart != null) {
                    if (!firstStart.canConvertToInt() || firstStart.asInt() < 0 || firstStart.asInt() >= 1440)
                        throw ApiException.badRequest("Başlangıç saati geçersiz.");
                    start = firstStart.asInt();
                }
            } else if (row.has("start")) throw ApiException.badRequest("Saat satırı geçersiz.");
            total += row.path("minutes").asInt();
            JsonNode cells = row.path("cells");
            if (!cells.isArray() || cells.size() != 7)
                throw ApiException.badRequest("Program günleri geçersiz.");
            for (JsonNode cell : cells)
                if (!cell.isTextual() || cell.asText().length() > 5000)
                    throw ApiException.badRequest("Program notu geçersiz veya çok uzun.");
            JsonNode bindings = row.get("bindings");
            if (bindings != null && (!bindings.isArray() || bindings.size() != 7))
                throw ApiException.badRequest("Program konu bağları geçersiz.");
        }
        if (start + total > 1440) throw ApiException.badRequest("Program 24 saati aşıyor.");
    }
}
