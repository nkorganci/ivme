package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class CurriculumProgressFlowTest extends TestBase {
    @Override protected boolean catalogFixtureRequired() { return true; }
    @Test
    void recordsCompletionPerStudentAndAllowsUndo() throws Exception {
        user("konu_ayse", Role.USER);
        user("konu_mehmet", Role.USER);
        var ayse = login("konu_ayse", "Sifre1234");
        var mehmet = login("konu_mehmet", "Sifre1234");
        String path = "/api/curriculum/progress/tyt.matematik.sayi-basamaklari";

        assertThat(read(send(ayse, get("/api/curriculum/progress"), null)).size()).isZero();
        var saved = read(send(ayse, put(path), "{\"completed\":true}").andExpect(status().isOk()));
        assertThat(saved.get("topicId").asText()).isEqualTo("tyt.matematik.sayi-basamaklari");
        assertThat(saved.get("completedAt").asText()).isNotBlank();
        var repeated = read(send(ayse, put(path), "{\"completed\":true}").andExpect(status().isOk()));
        assertThat(repeated.get("completedAt").asText()).isEqualTo(saved.get("completedAt").asText());
        assertThat(read(send(ayse, get("/api/curriculum/progress"), null)).size()).isEqualTo(1);
        assertThat(read(send(mehmet, get("/api/curriculum/progress"), null)).size()).isZero();

        send(ayse, put(path), "{\"completed\":false}").andExpect(status().isOk());
        assertThat(read(send(ayse, get("/api/curriculum/progress"), null)).size()).isZero();
        send(ayse, put("/api/curriculum/progress/invalid"), "{\"completed\":true}")
                .andExpect(status().isBadRequest());
        send(ayse, put(path), "{}").andExpect(status().isBadRequest());
    }
}
