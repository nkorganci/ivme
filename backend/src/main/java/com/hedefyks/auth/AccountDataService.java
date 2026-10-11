package com.hedefyks.auth;

import com.hedefyks.common.ApiException;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Own-data export and account erasure; shared questions and other students stay intact. */
@Service
public class AccountDataService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;

    public AccountDataService(UserRepository users, PasswordEncoder encoder, JdbcTemplate jdbc) {
        this.users = users;
        this.encoder = encoder;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> export(Long userId, String password) {
        User user = verifiedStudent(userId, password);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("formatVersion", 2);
        data.put("exportedAt", Instant.now().toString());
        data.put("profile", Map.of("id", user.getId(), "username", user.getUsername(),
                "email", user.getEmail(), "phone", user.getPhone() == null ? "" : user.getPhone(),
                "createdAt", user.getCreatedAt().toString()));
        data.put("exams", jdbc.queryForList("SELECT id, title, exam_type, subject, status, selection_mode, question_count, "
                + "time_limit_minutes, started_at, submitted_at, duration_seconds, correct_count, wrong_count, "
                + "blank_count, percent, net FROM exams WHERE user_id = ? ORDER BY id", userId));
        data.put("examQuestions", jdbc.queryForList("SELECT eq.exam_id, eq.question_id, eq.question_order, "
                + "eq.question_code, eq.subject, eq.topic, eq.selected_answer, eq.is_correct "
                + "FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id "
                + "WHERE e.user_id = ? ORDER BY eq.exam_id, eq.question_order", userId));
        data.put("studySessions", jdbc.queryForList("SELECT id, mode, selection_mode, status, filter_bank, "
                + "filter_exam_type, filter_subject, filter_topic, time_limit_seconds, started_at, ended_at "
                + "FROM study_sessions WHERE user_id = ? ORDER BY id", userId));
        data.put("sessionQuestions", jdbc.queryForList("SELECT sq.session_id, sq.question_id, sq.position "
                + "FROM session_questions sq JOIN study_sessions s ON s.id = sq.session_id "
                + "WHERE s.user_id = ? ORDER BY sq.session_id, sq.position", userId));
        data.put("questionAttempts", jdbc.queryForList("SELECT id, question_id, session_id, event_type, practice_round, "
                + "selected_answer, is_correct, active_seconds, created_at "
                + "FROM question_attempts WHERE user_id = ? ORDER BY id", userId));
        data.put("attemptTaxonomySnapshots", jdbc.queryForList("SELECT s.attempt_id, s.node_kind, s.node_code, "
                + "s.node_name, s.taxonomy_version FROM attempt_taxonomy_snapshot s "
                + "JOIN question_attempts a ON a.id = s.attempt_id WHERE a.user_id = ? "
                + "ORDER BY s.attempt_id, s.node_kind, s.node_code", userId));
        data.put("questionHelpfulness", jdbc.queryForList("SELECT question_id, helpful, updated_at "
                + "FROM question_helpfulness WHERE user_id = ? ORDER BY question_id", userId));
        data.put("questionBoards", jdbc.queryForList("SELECT question_id, strokes_json, version, updated_at "
                + "FROM question_boards WHERE user_id = ? ORDER BY question_id", userId));
        data.put("feedback", jdbc.queryForList("SELECT question_id, category, difficulty_vote, rating, message, "
                + "resolved, created_at, updated_at FROM feedback WHERE user_id = ? ORDER BY id", userId));
        data.put("goals", jdbc.queryForList("SELECT period, metric, subject, target_count, starts_on, ends_on, "
                + "status, created_at FROM goals WHERE user_id = ? ORDER BY id", userId));
        data.put("studyProgramWeeks", jdbc.queryForList("SELECT week_start, selected_start, selected_end, "
                + "zone_id, cells::text AS cells, updated_at FROM student_program_weeks "
                + "WHERE user_id = ? ORDER BY week_start", userId));
        data.put("activityEvents", jdbc.queryForList("SELECT session_key, event_type, active_seconds, created_at "
                + "FROM activity_events WHERE user_id = ? ORDER BY id", userId));
        return data;
    }

    @Transactional
    public void erase(Long userId, String password) {
        verifiedStudent(userId, password);
        // Feedback reviewed by this user must no longer refer to the deleted account.
        jdbc.update("UPDATE feedback SET resolved_by = NULL WHERE resolved_by = ?", userId);
        jdbc.update("DELETE FROM feedback WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM question_boards WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM question_attempts WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM study_sessions WHERE user_id = ?", userId); // session_questions cascade
        jdbc.update("DELETE FROM exams WHERE user_id = ?", userId); // exam_questions cascade
        jdbc.update("DELETE FROM goals WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM activity_events WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM users WHERE id = ? AND role = 'USER'", userId);
    }

    private User verifiedStudent(Long userId, String password) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Hesap bulunamadı."));
        if (user.getRole() != Role.USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bu işlem yalnız öğrenci hesabı içindir.");
        }
        if (password == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mevcut şifre hatalı.",
                    Map.of("currentPassword", "Mevcut şifre hatalı."));
        }
        return user;
    }
}
