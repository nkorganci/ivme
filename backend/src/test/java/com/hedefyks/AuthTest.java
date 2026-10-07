package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class AuthTest extends TestBase {

    private static final String REGISTER = "{\"username\":\"Ayse\",\"email\":\"ayse@example.com\",\"password\":\"Sifre1234\"}";

    @Test
    void sifreDuzMetinSaklanmaz() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REGISTER))
                .andExpect(status().isCreated());
        String hash = jdbc.queryForObject("select password_hash from users where username = 'Ayse'", String.class);
        assertThat(hash).startsWith("{bcrypt}").doesNotContain("Sifre1234");
    }

    @Test
    void ayniKullaniciAdiBuyukKucukHarfeDuyarsizReddedilir() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REGISTER))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"AYSE\",\"email\":\"baska@example.com\",\"password\":\"Sifre1234\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.alanlar.username").exists());
    }

    @Test
    void zayifSifreVeGecersizEpostaReddedilir() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ab\",\"email\":\"yanlis\",\"password\":\"kisa\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.alanlar.username").exists())
                .andExpect(jsonPath("$.alanlar.email").exists())
                .andExpect(jsonPath("$.alanlar.password").exists());
    }

    @Test
    void girisCikisAkisi() throws Exception {
        user("ayse", Role.USER);
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"ayse\",\"password\":\"yanlis\"}"))
                .andExpect(status().isUnauthorized());

        MockHttpSession session = login("ayse@example.com", "Sifre1234");     // e-posta ile de girilir
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("ayse")).andExpect(jsonPath("$.role").value("USER"));

        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void yetkiKurallari() throws Exception {
        user("ayse", Role.USER);
        user("yonetici", Role.ADMIN);
        mvc.perform(get("/api/questions/filters")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"ayse\",\"password\":\"Sifre1234\"}")).andExpect(status().isForbidden());   // CSRF yok

        MockHttpSession userSession = login("ayse", "Sifre1234");
        mvc.perform(get("/api/admin/stats").session(userSession)).andExpect(status().isForbidden());
        MockHttpSession adminSession = login("yonetici", "Sifre1234");
        mvc.perform(get("/api/admin/stats").session(adminSession)).andExpect(status().isOk())
                .andExpect(jsonPath("$.userCount").value(2));
    }

    @Test
    void sifreDegistirme() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        send(session, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/account/password"),
                "{\"currentPassword\":\"yanlis\",\"newPassword\":\"YeniSifre99\"}").andExpect(status().isBadRequest());
        send(session, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/account/password"),
                "{\"currentPassword\":\"Sifre1234\",\"newPassword\":\"YeniSifre99\"}").andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"ayse\",\"password\":\"Sifre1234\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"ayse\",\"password\":\"YeniSifre99\"}")).andExpect(status().isOk());
    }
}
