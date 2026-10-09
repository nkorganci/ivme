package com.hedefyks.progress;

import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Yalnız açık giriş ve çıkışı kaydeder; kapanan tarayıcı oturumunu tahmin etmez. */
@Service
public class LoginActivity {
    private static final String SESSION_KEY = LoginActivity.class.getName() + ".key";
    private final JdbcTemplate jdbc;

    public LoginActivity(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void login(Long userId, HttpSession session) {
        UUID key = UUID.randomUUID();
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type) VALUES (?,?,'LOGIN')", userId, key);
        session.setAttribute(SESSION_KEY, key);
    }

    public void logout(Long userId, HttpSession session) {
        if (session == null) return;
        Object key = session.getAttribute(SESSION_KEY);
        if (!(key instanceof UUID uuid)) return;
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type) VALUES (?,?,'LOGOUT')", userId, uuid);
        session.removeAttribute(SESSION_KEY);
    }
}
