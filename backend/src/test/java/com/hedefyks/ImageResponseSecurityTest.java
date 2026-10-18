package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class ImageResponseSecurityTest extends TestBase {

    @Test
    void gecersizGorselYoluDosyaKonumunuAcigaCikarmaz() throws Exception {
        var q = question("TEST-1", "Matematik", "A");
        q.setImage("../private.webp");
        questions.save(q);
        user("ayse", Role.USER);
        var session = login("ayse", "Sifre1234");

        var response = mvc.perform(get("/api/questions/" + q.getId() + "/image").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.hata").value("Soru görseli bulunamadı."))
                .andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("private.webp", "D:\\", "../");
    }
}
