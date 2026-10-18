package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.config.AppProperties;
import com.hedefyks.question.Question;
import com.hedefyks.question.QrService;
import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

class SecurityHardeningTest extends TestBase {

    private org.springframework.test.web.servlet.ResultActions tryLogin(String ip, String login, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").with(csrf()).header("CF-Connecting-IP", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + login + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void hatali_giris_denemeleri_sinirlanir() throws Exception {
        user("ayse", Role.USER);
        for (int i = 0; i < 8; i++) {
            tryLogin("203.0.113.10", "ayse", "yanlis" + i).andExpect(status().isUnauthorized());
        }
        // Sınır dolunca doğru şifre bile aynı IP + kullanıcı için engellenir
        tryLogin("203.0.113.10", "ayse", "Sifre1234").andExpect(status().isTooManyRequests());
        // Başka bir IP etkilenmez
        tryLogin("203.0.113.11", "ayse", "Sifre1234").andExpect(status().isOk());
    }

    @Test
    void basarili_giris_sayaci_sifirlar() throws Exception {
        user("ali", Role.USER);
        for (int i = 0; i < 5; i++) {
            tryLogin("203.0.113.20", "ali", "yanlis").andExpect(status().isUnauthorized());
        }
        tryLogin("203.0.113.20", "ali", "Sifre1234").andExpect(status().isOk());
        for (int i = 0; i < 5; i++) {
            tryLogin("203.0.113.20", "ali", "yanlis").andExpect(status().isUnauthorized());   // sayaç sıfırlandığı için engellenmez
        }
    }

    @Test
    void qr_adresi_sahte_forwarded_basliklarindan_etkilenmez() throws Exception {
        Question q = question("T-1", "Matematik", "A");
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");

        var result = mvc.perform(get("/api/questions/" + q.getId() + "/qr").session(session)
                        .header("X-Forwarded-Proto", "https").header("X-Forwarded-Host", "yeni-alan.example.com"))
                .andExpect(status().isOk()).andReturn();
        assertThat(result.getResponse().getHeader("X-Question-Url")).isEqualTo("http://localhost/soru/T-1");
        assertThat(result.getResponse().getContentAsByteArray()).isNotEmpty();
    }

    @Test
    void sabit_site_adresi_tanimliysa_o_kullanilir() {
        QrService fixed = new QrService(new AppProperties("https://sabit.example/", null, null, null));
        assertThat(fixed.questionUrl(new MockHttpServletRequest(), "X-9")).isEqualTo("https://sabit.example/soru/X-9");
    }
}
