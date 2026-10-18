package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class AytTrialFlowTest extends TestBase {
    @Test
    void savesPerUserAndRejectsInvalidNetsAndStaleRevision() throws Exception {
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        assertThat(read(send(ayse, get("/api/ayt-trials"), null)).get("revision").asInt()).isZero();

        String first = """
                {"revision":0,"area":"SAY","rows":[
                  {"id":"ayt-1","date":"2026-10-12","testNets":{"math":"24,5","physics":"10"}}]}
                """;
        var saved = read(send(ayse, put("/api/ayt-trials"), first).andExpect(status().isOk()));
        assertThat(saved.get("revision").asInt()).isEqualTo(1);
        assertThat(read(send(ayse, get("/api/ayt-trials"), null)).get("rows").size()).isEqualTo(1);
        assertThat(read(send(mehmet, get("/api/ayt-trials"), null)).get("rows").size()).isZero();
        send(ayse, put("/api/ayt-trials"), first).andExpect(status().isConflict());
        send(ayse, put("/api/ayt-trials"), first.replace("\"physics\":\"10\"", "\"physics\":\"15\""))
                .andExpect(status().isBadRequest());
        send(ayse, put("/api/ayt-trials"), first.replace("\"area\":\"SAY\"", "\"area\":\"INVALID\""))
                .andExpect(status().isBadRequest());
    }
}
