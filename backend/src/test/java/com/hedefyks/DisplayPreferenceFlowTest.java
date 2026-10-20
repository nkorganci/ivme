package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class DisplayPreferenceFlowTest extends TestBase {
    @Test
    void displayPreferenceFollowsAccountAcrossSessions() throws Exception {
        user("prefs_ayse", Role.USER);
        user("prefs_mehmet", Role.USER);
        var first = login("prefs_ayse", "Sifre1234");
        var second = login("prefs_ayse", "Sifre1234");
        var other = login("prefs_mehmet", "Sifre1234");
        String path = "/api/preferences/sidebar-rail";

        assertThat(read(send(first, get(path), null)).path("value").asBoolean()).isFalse();
        send(first, put(path), "{\"value\":true}").andExpect(status().isOk());
        assertThat(read(send(second, get(path), null)).path("value").asBoolean()).isTrue();
        assertThat(read(send(other, get(path), null)).path("value").asBoolean()).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_record_audit WHERE record_type = 'user_display_preferences'",
                Integer.class)).isEqualTo(1);
        send(first, put(path), "{}").andExpect(status().isBadRequest());
    }
}
