package com.hedefyks.user;

import com.hedefyks.common.ApiException;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/preferences")
public class DisplayPreferenceController {
    public record Preference(Boolean value) {}
    private static final Map<String, Boolean> DEFAULTS = Map.of("sidebar-rail", false, "question-image-fit", true);
    private final JdbcTemplate jdbc;

    public DisplayPreferenceController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/{key}")
    public Preference get(@AuthenticationPrincipal AppUserDetails me, @PathVariable String key) {
        checkKey(key);
        return new Preference(jdbc.query("SELECT value FROM user_display_preferences WHERE user_id = ? AND preference_key = ?",
                (rs, row) -> rs.getBoolean(1), me.id(), key).stream().findFirst().orElse(DEFAULTS.get(key)));
    }

    @PutMapping("/{key}")
    public Preference save(@AuthenticationPrincipal AppUserDetails me, @PathVariable String key,
                           @RequestBody Preference input) {
        checkKey(key);
        if (input == null || input.value() == null) throw ApiException.badRequest("Görünüm tercihi geçersiz.");
        jdbc.update("""
                INSERT INTO user_display_preferences(user_id, preference_key, value) VALUES (?, ?, ?)
                ON CONFLICT (user_id, preference_key) DO UPDATE SET value = EXCLUDED.value
                """, me.id(), key, input.value());
        return input;
    }

    private static void checkKey(String key) {
        if (!DEFAULTS.containsKey(key)) throw ApiException.badRequest("Görünüm tercihi geçersiz.");
    }
}
