package com.hedefyks.progress;

import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Giriş/çıkışları ve ön plandaki etkin süreyi kaydeder; kapalı tarayıcı zamanını tahmin etmez. */
@Service
public class LoginActivity {
    private static final String SESSION_KEY = LoginActivity.class.getName() + ".key";
    private final JdbcTemplate jdbc;

    public LoginActivity(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void login(Long userId, HttpSession session) {
        login(userId, session, null);
    }

    @Transactional
    public void login(Long userId, HttpSession session, String countryCode) {
        UUID key = UUID.randomUUID();
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type) VALUES (?,?,'LOGIN')", userId, key);
        jdbc.update("UPDATE users SET last_login_at=now(),last_login_country_code=? WHERE id=?", countryCode, userId);
        session.setAttribute(SESSION_KEY, key);
    }

    @Transactional
    public void active(Long userId, HttpSession session, int activeSeconds) {
        if (session == null || activeSeconds < 1 || activeSeconds > 90) return;
        Object key = session.getAttribute(SESSION_KEY);
        if (!(key instanceof UUID uuid)) return;
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type,active_seconds) VALUES (?,?,'ACTIVE',?)",
                userId, uuid, activeSeconds);
        jdbc.update("UPDATE users SET active_seconds=active_seconds+? WHERE id=?", activeSeconds, userId);
    }

    public void logout(Long userId, HttpSession session) {
        if (session == null) return;
        Object key = session.getAttribute(SESSION_KEY);
        if (!(key instanceof UUID uuid)) return;
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type) VALUES (?,?,'LOGOUT')", userId, uuid);
        session.removeAttribute(SESSION_KEY);
    }
}
