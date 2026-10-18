package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class TytTrialFlowTest extends TestBase {
    @Test
    void savesPerUserAndRejectsStaleRevision() throws Exception {
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        assertThat(read(send(ayse, get("/api/tyt-trials"), null)).get("revision").asInt()).isZero();

        String first = """
                {"revision":0,"area":"TYT","obp":"","rows":[
                  {"id":"trial-1","date":"2026-10-12","name":"","answers":{},"nets":{},
                   "testNets":{"math":"24,5","turkish":"31,25"}}]}
                """;
        var saved = read(send(ayse, put("/api/tyt-trials"), first).andExpect(status().isOk()));
        assertThat(saved.get("revision").asInt()).isEqualTo(1);
        assertThat(saved.get("rows").get(0).get("testNets").get("math").asText()).isEqualTo("24,5");
        assertThat(read(send(ayse, get("/api/tyt-trials"), null)).get("rows").size()).isEqualTo(1);
        assertThat(read(send(mehmet, get("/api/tyt-trials"), null)).get("rows").size()).isZero();
        send(ayse, put("/api/tyt-trials"), first).andExpect(status().isConflict());
        send(ayse, put("/api/tyt-trials"), first.replace("\"revision\":0", "\"revision\":1"))
                .andExpect(status().isOk());
        send(ayse, put("/api/tyt-trials"), first.replace("\"area\":\"TYT\"", "\"area\":\"INVALID\""))
                .andExpect(status().isBadRequest());
    }
}
