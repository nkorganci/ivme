package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import com.hedefyks.auth.AuthDtos;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class AuthTest extends TestBase {

    private static final String REGISTER = "{\"username\":\"Ayse\",\"email\":\"ayse@example.com\",\"phone\":\"0555 111 22 33\",\"password\":\"GucluBirSifre2026\"}";

    @Test
    void sifreDuzMetinSaklanmaz() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REGISTER))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contactComplete").value(true))
                .andExpect(jsonPath("$.phone").doesNotExist());
        String hash = jdbc.queryForObject("select password_hash from users where username = 'Ayse'", String.class);
        assertThat(hash).startsWith("{bcrypt}").doesNotContain("GucluBirSifre2026");
        assertThat(jdbc.queryForObject("select phone from users where username = 'Ayse'", String.class))
                .isEqualTo("+905551112233");
    }

    @Test
    void ayniKullaniciAdiBuyukKucukHarfeDuyarsizReddedilir() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REGISTER))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"AYSE\",\"email\":\"baska@example.com\",\"phone\":\"+905552223344\",\"password\":\"GucluBirSifre2026\"}"))
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
                .andExpect(jsonPath("$.alanlar.phone").exists())
                .andExpect(jsonPath("$.alanlar.password").exists());
    }

    @Test
    void gecersizTelefonReddedilir() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Ayse\",\"email\":\"ayse@example.com\",\"phone\":\"12345\",\"password\":\"GucluBirSifre2026\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.alanlar.phone").exists());
        assertThat(users.existsByUsername("Ayse")).isFalse();
    }

    @Test
    void uzunUtf8SifreVeLogSizintisiEngellenir() throws Exception {
        String password = "ş".repeat(40);
        var request = new AuthDtos.RegisterRequest("Ayse", "ayse@example.com", "+905551112233", password);
        assertThat(request.toString()).doesNotContain(password).doesNotContain("+905551112233");
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
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
        user("operator", Role.OPERATOR);
        mvc.perform(get("/api/questions/filters")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"ayse\",\"password\":\"Sifre1234\"}")).andExpect(status().isForbidden());   // CSRF yok

        MockHttpSession userSession = login("ayse", "Sifre1234");
        mvc.perform(get("/api/admin/stats").session(userSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/operator/questions").session(userSession)).andExpect(status().isForbidden());
        MockHttpSession adminSession = login("yonetici", "Sifre1234");
        mvc.perform(get("/api/admin/stats").session(adminSession)).andExpect(status().isOk())
                .andExpect(jsonPath("$.userCount").value(1))
                .andExpect(jsonPath("$.questionCount").doesNotExist());
        mvc.perform(get("/api/operator/questions").session(adminSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/feedback").session(adminSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/questions/filters").session(adminSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/exams/summary").session(adminSession)).andExpect(status().isForbidden());
        MockHttpSession operatorSession = login("operator", "Sifre1234");
        mvc.perform(get("/api/admin/stats").session(operatorSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/operator/questions").session(operatorSession)).andExpect(status().isOk());
        mvc.perform(get("/api/exams/summary").session(operatorSession)).andExpect(status().isForbidden());
    }

    @Test
    void sifreDegistirme() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        send(session, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/account/password"),
                "{\"currentPassword\":\"yanlis\",\"newPassword\":\"YeniSifre99\"}").andExpect(status().isBadRequest());
        send(session, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/account/password"),
                "{\"currentPassword\":\"Sifre1234\",\"newPassword\":\"YeniGucluSifre2026\"}").andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"ayse\",\"password\":\"Sifre1234\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"ayse\",\"password\":\"YeniGucluSifre2026\"}")).andExpect(status().isOk());
    }

    @Test
    void eskiKullaniciTelefonunuSifreyleTamamlar() throws Exception {
        user("ayse", Role.USER);
        MockHttpSession session = login("ayse", "Sifre1234");
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.contactComplete").value(false));

        send(session, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/account/contact"),
                "{\"email\":\"ayse@example.com\",\"phone\":\"0555 111 22 33\",\"currentPassword\":\"yanlis\"}")
                .andExpect(status().isBadRequest());
        send(session, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/account/contact"),
                "{\"email\":\"ayse@example.com\",\"phone\":\"0555 111 22 33\",\"currentPassword\":\"Sifre1234\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("+905551112233"));
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.contactComplete").value(true))
                .andExpect(jsonPath("$.phone").doesNotExist());
        mvc.perform(get("/api/account/contact").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("+905551112233"));
    }
}
