package com.hedefyks.progress;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.DateTimeException;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyProgramService {
    public static final int SLOT_COUNT = 14;
    private static final List<String> DEFAULT_BOUNDARIES = IntStream.rangeClosed(8, 22)
            .mapToObj(hour -> "%02d:00".formatted(hour)).toList();
    public record Week(LocalDate weekStart, LocalDate selectedStart, LocalDate selectedEnd,
                       String zone, Map<String, List<String>> cells, List<String> timeBoundaries,
                       boolean editable) {}
    public record WeekInput(LocalDate weekStart, LocalDate selectedStart, LocalDate selectedEnd,
                            String zone, Map<String, List<String>> cells, List<String> timeBoundaries) {}
    public record Save(List<WeekInput> weeks) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public StudyProgramService(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public List<Week> list(Long userId, LocalDate start, LocalDate end) {
        range(start, end);
        return query(userId, monday(start), monday(end));
    }

    @Transactional
    public List<Week> save(Long userId, Save input) {
        if (input == null || input.weeks() == null || input.weeks().isEmpty()
                || input.weeks().size() > 54) throw ApiException.badRequest("Kaydedilecek hafta seç.");
        Map<LocalDate, Boolean> seen = new HashMap<>();
        for (WeekInput week : input.weeks()) {
            validate(week);
            if (seen.put(week.weekStart(), true) != null) throw ApiException.badRequest("Hafta tekrarlanamaz.");
            ZoneId zone = ZoneId.of(week.zone());
            if (week.weekStart().plusDays(6).isBefore(LocalDate.now(zone))) {
                throw ApiException.conflict("Geçmiş hafta düzenlenemez.");
            }
            List<Map<String, Object>> existing = jdbc.queryForList("SELECT zone_id, time_boundaries::text AS time_boundaries "
                    + "FROM student_program_weeks WHERE user_id = ? AND week_start = ?", userId, week.weekStart());
            String existingZone = existing.isEmpty() ? null : (String) existing.get(0).get("zone_id");
            if (existingZone != null && !existingZone.equals(week.zone())) {
                throw ApiException.conflict("Bu haftanın saat dilimi değiştirilemez.");
            }
            List<String> boundaries = week.timeBoundaries();
            if (boundaries == null) {
                if (existing.isEmpty()) boundaries = DEFAULT_BOUNDARIES;
                else {
                    try { boundaries = json.readValue((String) existing.get(0).get("time_boundaries"), new TypeReference<>() {}); }
                    catch (JsonProcessingException e) { throw new IllegalStateException("Kayıtlı saatler okunamadı.", e); }
                }
            }
            validateBoundaries(boundaries);
            String cells;
            String times;
            try { cells = json.writeValueAsString(week.cells()); times = json.writeValueAsString(boundaries); }
            catch (JsonProcessingException e) { throw ApiException.badRequest("Program hücreleri geçersiz."); }
            int updated = jdbc.update("""
                    INSERT INTO student_program_weeks(user_id, week_start, selected_start, selected_end, zone_id, cells, time_boundaries)
                    SELECT ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb
                    WHERE ?::date + 6 >= (now() AT TIME ZONE ?)::date
                    ON CONFLICT (user_id, week_start) DO UPDATE SET
                      selected_start = excluded.selected_start, selected_end = excluded.selected_end,
                      cells = excluded.cells, time_boundaries = excluded.time_boundaries, updated_at = now()
                    WHERE student_program_weeks.zone_id = excluded.zone_id
                      AND student_program_weeks.week_start + 6 >=
                          (now() AT TIME ZONE student_program_weeks.zone_id)::date
                    """, userId, week.weekStart(), week.selectedStart(), week.selectedEnd(), week.zone(), cells, times,
                    week.weekStart(), week.zone());
            if (updated == 0) throw ApiException.conflict("Geçmiş hafta düzenlenemez veya saat dilimi değişti.");
        }
        LocalDate first = input.weeks().stream().map(WeekInput::weekStart).min(LocalDate::compareTo).orElseThrow();
        LocalDate last = input.weeks().stream().map(WeekInput::weekStart).max(LocalDate::compareTo).orElseThrow();
        if (ChronoUnit.WEEKS.between(first, last) + 1 != input.weeks().size()) {
            throw ApiException.badRequest("Haftalar kesintisiz olmalı.");
        }
        return query(userId, first, last);
    }

    private List<Week> query(Long userId, LocalDate first, LocalDate last) {
        return jdbc.query("SELECT week_start, selected_start, selected_end, zone_id, cells::text AS cells, "
                + "time_boundaries::text AS time_boundaries "
                + "FROM student_program_weeks WHERE user_id = ? AND week_start BETWEEN ? AND ? "
                + "ORDER BY week_start", (rs, n) -> row(rs), userId, first, last);
    }

    private void validate(WeekInput week) {
        if (week == null || week.weekStart() == null || week.selectedStart() == null || week.selectedEnd() == null
                || week.weekStart().getDayOfWeek() != DayOfWeek.MONDAY
                || week.selectedStart().isBefore(week.weekStart())
                || week.selectedEnd().isAfter(week.weekStart().plusDays(6))
                || week.selectedStart().isAfter(week.selectedEnd())) {
            throw ApiException.badRequest("Hafta tarihleri geçersiz.");
        }
        if (week.zone() == null || week.zone().isBlank() || week.zone().length() > 64) {
            throw ApiException.badRequest("Saat dilimi geçersiz.");
        }
        try { ZoneId.of(week.zone()); }
        catch (DateTimeException e) { throw ApiException.badRequest("Saat dilimi geçersiz."); }
        if (week.cells() == null || week.cells().size() > 7) {
            throw ApiException.badRequest("Program hücreleri geçersiz.");
        }
        for (var entry : week.cells().entrySet()) {
            LocalDate date;
            try { date = LocalDate.parse(entry.getKey()); }
            catch (DateTimeException e) { throw ApiException.badRequest("Program günü geçersiz."); }
            if (date.isBefore(week.selectedStart()) || date.isAfter(week.selectedEnd())
                    || entry.getValue() == null || entry.getValue().size() != SLOT_COUNT) {
                throw ApiException.badRequest("Program hücreleri geçersiz.");
            }
            for (String value : entry.getValue()) {
                if (value == null || value.length() > 250) {
                    throw ApiException.badRequest("Bir saatlik not en fazla 250 karakter olabilir.");
                }
            }
        }
    }

    private void validateBoundaries(List<String> boundaries) {
        if (boundaries == null || boundaries.size() != SLOT_COUNT + 1) {
            throw ApiException.badRequest("Saat aralıkları geçersiz.");
        }
        int previous = -1;
        for (String value : boundaries) {
            if (value == null || !value.matches("[0-2][0-9]:[0-5][0-9]")) {
                throw ApiException.badRequest("Saat aralıkları geçersiz.");
            }
            int minute;
            try { minute = LocalTime.parse(value).toSecondOfDay() / 60; }
            catch (DateTimeException e) { throw ApiException.badRequest("Saat aralıkları geçersiz."); }
            if (previous >= 0 && minute - previous < 5) {
                throw ApiException.badRequest("Saat aralıkları en az 5 dakika olmalı.");
            }
            previous = minute;
        }
    }

    private Week row(ResultSet rs) throws SQLException {
        LocalDate start = rs.getObject("week_start", LocalDate.class);
        String zoneName = rs.getString("zone_id");
        Map<String, List<String>> cells;
        List<String> boundaries;
        try {
            cells = json.readValue(rs.getString("cells"), new TypeReference<>() {});
            boundaries = json.readValue(rs.getString("time_boundaries"), new TypeReference<>() {});
        }
        catch (JsonProcessingException e) { throw new IllegalStateException("Kayıtlı program okunamadı.", e); }
        return new Week(start, rs.getObject("selected_start", LocalDate.class),
                rs.getObject("selected_end", LocalDate.class), zoneName, cells, boundaries,
                !start.plusDays(6).isBefore(Instant.now().atZone(ZoneId.of(zoneName)).toLocalDate()));
    }

    private static void range(LocalDate start, LocalDate end) {
        if (start == null || end == null || start.isAfter(end) || ChronoUnit.DAYS.between(start, end) > 366) {
            throw ApiException.badRequest("En fazla 367 günlük tarih aralığı seç.");
        }
    }

    private static LocalDate monday(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
