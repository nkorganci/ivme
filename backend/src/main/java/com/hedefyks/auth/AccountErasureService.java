package com.hedefyks.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Removes an account and its private records inside the caller's transaction. */
@Service
public class AccountErasureService {
    private final JdbcTemplate jdbc;

    public AccountErasureService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void erase(long userId) {
        // These older foreign keys do not cascade. Other private tables cascade from users.
        jdbc.update("UPDATE feedback SET resolved_by = NULL WHERE resolved_by = ?", userId);
        jdbc.update("DELETE FROM feedback WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM learning_engine_events WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM learning_engine_profiles WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM question_attempts WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM study_sessions WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM exams WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM activity_events WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM content_review_history WHERE reviewer_id = ?", userId);
        jdbc.update("DELETE FROM content_reviews WHERE reviewer_id = ?", userId);
        jdbc.update("DELETE FROM users WHERE id = ?", userId);
    }
}
