package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class StudentProgramFlowTest extends TestBase {
    private static final String PATH = "/api/student-program/weeks/2026-10-19";
    private static final String ROWS = "[{\"minutes\":60,\"cells\":[\"Matematik\",\"\",\"\",\"\",\"\",\"\",\"\"],\"bindings\":[null,null,null,null,null,null,null]}]";

    @Test
    void sameAccountSessionsShareWeeksAndOtherAccountCannotReadThem() throws Exception {
        user("program_ayse", Role.USER);
        user("program_mehmet", Role.USER);
        var first = login("program_ayse", "Sifre1234");
        var second = login("program_ayse", "Sifre1234");
        var other = login("program_mehmet", "Sifre1234");

        assertThat(send(first, get(PATH), null).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).isBlank();
        JsonNode saved = read(send(first, put(PATH), "{\"rows\":" + ROWS + ",\"revision\":0}")
                .andExpect(status().isOk()));
        assertThat(saved.path("revision").asText()).isNotBlank();
        assertThat(read(send(second, get(PATH), null)).path("rows").get(0).path("cells").get(0).asText())
                .isEqualTo("Matematik");
        assertThat(send(other, get(PATH), null).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).isBlank();

        send(second, put(PATH), "{\"rows\":" + ROWS + ",\"revision\":0}")
                .andExpect(status().isConflict());
        JsonNode updated = read(send(second, put(PATH), "{\"rows\":" + ROWS
                + ",\"revision\":\"" + saved.path("revision").asText() + "\"}")
                .andExpect(status().isOk()));
        assertThat(updated.path("revision").asText()).isNotEqualTo(saved.path("revision").asText());
        send(first, put(PATH), "{\"rows\":" + ROWS
                + ",\"revision\":\"" + saved.path("revision").asText() + "\"}")
                .andExpect(status().isConflict());
        assertThat(read(send(first, get(PATH), null)).path("rows").get(0).path("cells").get(0).asText())
                .isEqualTo("Matematik");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_record_audit WHERE record_type = 'student_program_weeks'",
                Integer.class)).isEqualTo(2);
    }

    @Test
    void invalidWeekOrRowsAreRejected() throws Exception {
        user("program_test", Role.USER);
        var session = login("program_test", "Sifre1234");
        send(session, put("/api/student-program/weeks/2026-10-20"),
                "{\"rows\":" + ROWS + ",\"revision\":0}").andExpect(status().isBadRequest());
        send(session, put(PATH), "{\"rows\":[{\"minutes\":1441,\"cells\":[]}],\"revision\":0}")
                .andExpect(status().isBadRequest());
    }
}
