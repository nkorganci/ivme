package com.hedefyks;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class AuthRateLimitTest extends TestBase {

    private ResultActions loginFrom(String ip, String username, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").with(csrf()).header("CF-Connecting-IP", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + username + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void hataliGirisAyniIpVeKullaniciIcinSinirlanir() throws Exception {
        user("ayse", Role.USER);
        for (int i = 0; i < 8; i++) {
            loginFrom("198.51.100.10", "ayse", "yanlis").andExpect(status().isUnauthorized());
        }
        loginFrom("198.51.100.10", "ayse", "Sifre1234").andExpect(status().isTooManyRequests());
        loginFrom("198.51.100.11", "ayse", "Sifre1234").andExpect(status().isOk());
    }

    @Test
    void basariliGirisKullaniciSayaciniSifirlar() throws Exception {
        user("ali", Role.USER);
        for (int i = 0; i < 5; i++) {
            loginFrom("198.51.100.20", "ali", "yanlis").andExpect(status().isUnauthorized());
        }
        loginFrom("198.51.100.20", "ali", "Sifre1234").andExpect(status().isOk());
        for (int i = 0; i < 5; i++) {
            loginFrom("198.51.100.20", "ali", "yanlis").andExpect(status().isUnauthorized());
        }
    }
}
