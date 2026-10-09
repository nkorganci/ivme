package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "server.servlet.session.cookie.secure=true")
class SecureCsrfCookieTest extends TestBase {

    @Test
    void tunelAyarindaCsrfCereziDeSecureOlur() throws Exception {
        var response = mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized()).andReturn().getResponse();
        assertThat(response.getCookie("XSRF-TOKEN")).isNotNull();
        assertThat(response.getCookie("XSRF-TOKEN").getSecure()).isTrue();
        assertThat(response.getHeader("Strict-Transport-Security")).contains("max-age=15552000");
    }
}
