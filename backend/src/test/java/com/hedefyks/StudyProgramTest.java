package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StudyProgramTest extends TestBase {
    private static final String ZONE = "Europe/Istanbul";

    @Test
    void savesSelectedDaysAndKeepsUsersSeparate() throws Exception {
        user("programayse", Role.USER);
        user("programmehmet", Role.USER);
        var ayse = login("programayse", "Sifre1234");
        var mehmet = login("programmehmet", "Sifre1234");
        LocalDate monday = LocalDate.now(java.time.ZoneId.of(ZONE))
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate selected = monday.plusDays(2);
        List<String> hours = new ArrayList<>(java.util.Collections.nCopies(14, ""));
        hours.set(0, "Matematik çalış");
        Map<String, Object> week = Map.of("weekStart", monday.toString(), "selectedStart", selected.toString(),
                "selectedEnd", selected.toString(), "zone", ZONE,
                "cells", Map.of(selected.toString(), hours));
        String body = json.writeValueAsString(Map.of("weeks", List.of(week)));

        var saved = read(send(ayse, put("/api/study-program"), body).andExpect(status().isOk()));
        assertThat(saved.size()).isEqualTo(1);
        assertThat(saved.get(0).get("selectedStart").asText()).isEqualTo(selected.toString());
        assertThat(saved.get(0).get("cells").get(selected.toString()).get(0).asText()).isEqualTo("Matematik çalış");
        assertThat(saved.get(0).get("timeBoundaries").get(0).asText()).isEqualTo("08:00");
        List<String> changedTimes = new ArrayList<>();
        for (int hour = 8; hour <= 22; hour++) changedTimes.add("%02d:30".formatted(hour));
        Map<String, Object> changedWeek = new LinkedHashMap<>(week);
        changedWeek.put("timeBoundaries", changedTimes);
        var changed = read(send(ayse, put("/api/study-program"),
                json.writeValueAsString(Map.of("weeks", List.of(changedWeek)))).andExpect(status().isOk()));
        assertThat(changed.get(0).get("timeBoundaries").get(14).asText()).isEqualTo("22:30");
        assertThat(read(send(ayse, get("/api/study-program?start=" + selected + "&end=" + selected), null)
                .andExpect(status().isOk())).get(0).get("timeBoundaries").get(1).asText()).isEqualTo("09:30");
        changedTimes.set(1, "08:31");
        send(ayse, put("/api/study-program"), json.writeValueAsString(Map.of("weeks", List.of(changedWeek))))
                .andExpect(status().isBadRequest());
        assertThat(read(send(mehmet, get("/api/study-program?start=" + selected + "&end=" + selected), null)
                .andExpect(status().isOk())).size()).isZero();
        assertThat(read(send(ayse, get("/api/study-program?start=" + selected + "&end=" + selected), null)
                .andExpect(status().isOk())).size()).isEqualTo(1);

        send(ayse, put("/api/study-program"), body.replace("Europe/Istanbul", "America/Chicago"))
                .andExpect(status().isConflict());
        List<String> tooLong = new ArrayList<>(hours);
        tooLong.set(0, "x".repeat(251));
        Map<String, Object> badWeek = new LinkedHashMap<>(week);
        badWeek.put("cells", Map.of(selected.toString(), tooLong));
        send(ayse, put("/api/study-program"), json.writeValueAsString(Map.of("weeks", List.of(badWeek))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void pastWeekCannotBeChangedAndMultiweekRangeLoads() throws Exception {
        var owner = user("programgecmis", Role.USER);
        var session = login("programgecmis", "Sifre1234");
        LocalDate monday = LocalDate.now(java.time.ZoneId.of(ZONE))
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate future = monday.plusWeeks(1);
        var blank = java.util.Collections.nCopies(14, "");
        var weeks = List.of(
                Map.of("weekStart", monday.toString(), "selectedStart", monday.toString(),
                        "selectedEnd", monday.plusDays(6).toString(), "zone", ZONE,
                        "cells", Map.of(monday.toString(), blank)),
                Map.of("weekStart", future.toString(), "selectedStart", future.toString(),
                        "selectedEnd", future.toString(), "zone", ZONE,
                        "cells", Map.of(future.toString(), blank)));
        send(session, put("/api/study-program"), json.writeValueAsString(Map.of("weeks", weeks)))
                .andExpect(status().isOk());
        assertThat(read(send(session, get("/api/study-program?start=" + monday + "&end=" + future), null)
                .andExpect(status().isOk())).size()).isEqualTo(2);

        LocalDate past = monday.minusWeeks(1);
        jdbc.update("INSERT INTO student_program_weeks(user_id,week_start,selected_start,selected_end,zone_id,cells) "
                + "VALUES (?,?,?,?,?,?::jsonb)", owner.getId(), past, past, past, ZONE,
                json.writeValueAsString(Map.of(past.toString(), blank)));
        var history = read(send(session, get("/api/study-program?start=" + past + "&end=" + past), null)
                .andExpect(status().isOk()));
        assertThat(history.get(0).get("editable").asBoolean()).isFalse();
        assertThat(history.get(0).get("selectedStart").asText()).isEqualTo(past.toString());
        var pastWeek = Map.of("weekStart", past.toString(), "selectedStart", past.toString(),
                "selectedEnd", past.toString(), "zone", ZONE, "cells", Map.of(past.toString(), blank));
        send(session, put("/api/study-program"), json.writeValueAsString(Map.of("weeks", List.of(pastWeek))))
                .andExpect(status().isConflict());
    }
}
