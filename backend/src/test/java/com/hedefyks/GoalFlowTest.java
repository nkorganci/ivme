package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class GoalFlowTest extends TestBase {
    @Test
    void hedef_olusturma_duzenleme_durdurma_ve_iki_hesap_sahipligi() throws Exception {
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        String body = """
                {"period":"WEEK","metric":"UNIQUE_QUESTIONS","subject":"Türkçe",
                 "targetCount":20,"zone":"Europe/Istanbul"}
                """;
        long id = read(send(ayse, post("/api/goals"), body).andExpect(status().isCreated()))
                .get("id").asLong();
        assertThat(read(send(mehmet, get("/api/goals"), null).andExpect(status().isOk())).size()).isZero();
        send(mehmet, patch("/api/goals/" + id), "{\"targetCount\":30}")
                .andExpect(status().isNotFound());
        send(mehmet, post("/api/goals/" + id + "/stop"), null).andExpect(status().isNotFound());
        var updated = read(send(ayse, patch("/api/goals/" + id),
                "{\"targetCount\":30,\"subject\":\"Matematik\"}").andExpect(status().isOk()));
        assertThat(updated.get("targetCount").asInt()).isEqualTo(30);
        assertThat(updated.get("subject").asText()).isEqualTo("Matematik");
        send(ayse, post("/api/goals/" + id + "/stop"), null).andExpect(status().isOk());
        send(ayse, post("/api/goals/" + id + "/stop"), null).andExpect(status().isOk());
        send(ayse, patch("/api/goals/" + id), "{\"targetCount\":40}").andExpect(status().isConflict());
        send(ayse, post("/api/goals"), body.replace("\"targetCount\":20", "\"targetCount\":0"))
                .andExpect(status().isBadRequest());
        send(ayse, post("/api/goals"), body.replace("Europe/Istanbul", "Invalid/Zone"))
                .andExpect(status().isBadRequest());
    }
}
