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
    private final AccountErasureService erasure;

    public AccountDataService(UserRepository users, PasswordEncoder encoder, JdbcTemplate jdbc,
                              AccountErasureService erasure) {
        this.users = users;
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.erasure = erasure;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> export(Long userId, String password) {
        User user = verifiedStudent(userId, password);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("formatVersion", 6);
        data.put("exportedAt", Instant.now().toString());
        data.put("profile", Map.of("id", user.getId(), "username", user.getUsername(),
                "email", user.getEmail(), "phone", user.getPhone() == null ? "" : user.getPhone(),
                "createdAt", user.getCreatedAt().toString()));
        data.put("exams", jdbc.queryForList("SELECT id, title, exam_type, subject, status, selection_mode, question_count, "
                + "time_limit_minutes, started_at, submitted_at, duration_seconds, correct_count, wrong_count, "
                + "blank_count, percent, net FROM exams WHERE user_id = ? ORDER BY id", userId));
        data.put("examQuestions", jdbc.queryForList("SELECT eq.exam_id, eq.question_id, eq.question_order, "
                + "eq.question_code, eq.subject, eq.topic, eq.selected_answer, eq.flagged, eq.is_correct "
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
        data.put("examTaxonomySnapshots",jdbc.queryForList("SELECT s.exam_question_id,s.node_kind,s.node_code,s.node_name,s.taxonomy_version "
                + "FROM exam_taxonomy_snapshot s JOIN exam_questions eq ON eq.id=s.exam_question_id JOIN exams e ON e.id=eq.exam_id "
                + "WHERE e.user_id=? ORDER BY s.exam_question_id,s.node_code",userId));
        data.put("questionHelpfulness", jdbc.queryForList("SELECT question_id, helpful, updated_at "
                + "FROM question_helpfulness WHERE user_id = ? ORDER BY question_id", userId));
        data.put("questionBoards", jdbc.queryForList("SELECT question_id, strokes_json, version, updated_at "
                + "FROM question_boards WHERE user_id = ? ORDER BY question_id", userId));
        data.put("pageAnnotations", jdbc.queryForList("SELECT resource_type, resource_id, page_number, strokes_json, graph_json, version, updated_at "
                + "FROM page_annotations WHERE user_id = ? ORDER BY resource_type, resource_id, page_number", userId));
        data.put("feedback", jdbc.queryForList("SELECT question_id, category, difficulty_vote, rating, message, "
                + "resolved, created_at, updated_at FROM feedback WHERE user_id = ? ORDER BY id", userId));
        data.put("activityEvents", jdbc.queryForList("SELECT session_key, event_type, active_seconds, created_at "
                + "FROM activity_events WHERE user_id = ? ORDER BY id", userId));
        data.put("curriculumTopicProgress", jdbc.queryForList("SELECT topic_id, completed_at "
                + "FROM curriculum_topic_progress WHERE user_id = ? ORDER BY topic_id", userId));
        data.put("studentProgramWeeks", jdbc.queryForList("SELECT week_start, revision, rows::text AS rows, updated_at "
                + "FROM student_program_weeks WHERE user_id = ? ORDER BY week_start", userId));
        data.put("tytTrialSheets", jdbc.queryForList("SELECT revision, payload::text AS payload, updated_at "
                + "FROM tyt_trial_sheets WHERE user_id = ?", userId));
        data.put("aytTrialSheets", jdbc.queryForList("SELECT revision, payload::text AS payload, updated_at "
                + "FROM ayt_trial_sheets WHERE user_id = ?", userId));
        data.put("displayPreferences", jdbc.queryForList("SELECT preference_key, value "
                + "FROM user_display_preferences WHERE user_id = ? ORDER BY preference_key", userId));
        data.put("examTrack", jdbc.queryForList("SELECT track_id, updated_at "
                + "FROM user_exam_tracks WHERE user_id = ?", userId));
        data.put("mathTutoringLessons", jdbc.queryForList("SELECT id, lesson_date, start_time, end_time, "
                + "topic, homework, status, note, learning::text AS learning, revision "
                + "FROM math_tutoring_lessons WHERE user_id = ? ORDER BY id", userId));
        data.put("mathTutoringFiles", jdbc.queryForList("SELECT f.id, f.lesson_id, f.original_name, "
                + "f.content_type, f.content FROM math_tutoring_files f "
                + "JOIN math_tutoring_lessons l ON l.id = f.lesson_id WHERE l.user_id = ? ORDER BY f.id", userId));
        data.put("selfCheckAttempts", jdbc.queryForList("SELECT kind, item_key, answers::text AS answers, created_at "
                + "FROM student_self_check_attempts WHERE user_id = ? ORDER BY id", userId));
        data.put("recordAudit", jdbc.queryForList("SELECT record_type, record_key, operation, revision, occurred_at "
                + "FROM user_record_audit WHERE user_id = ? ORDER BY id", userId));
        data.put("tutorSessions", jdbc.queryForList("SELECT s.id, q.code AS question_code, s.status, s.outcome, "
                + "s.started_at, s.finished_at FROM tutor_sessions s JOIN questions q ON q.id = s.question_id "
                + "WHERE s.user_id = ? ORDER BY s.id", userId));
        data.put("tutorEvents", jdbc.queryForList("SELECT e.session_id, e.seq, e.type, e.payload::text AS payload, "
                + "e.created_at FROM tutor_events e JOIN tutor_sessions s ON s.id = e.session_id "
                + "WHERE s.user_id = ? ORDER BY e.session_id, e.seq", userId));
        data.put("tutorSkills", jdbc.queryForList("SELECT skill_key, subject_id, category_id, mastery, "
                + "independent_correct, assisted_correct, wrong, hints_used, explain_correct, explain_total, "
                + "transfer_correct, streak, last_outcome, last_practiced_at, next_review_at "
                + "FROM tutor_skill_states WHERE user_id = ? ORDER BY skill_key", userId));
        data.put("learningEngineProfiles", jdbc.queryForList("SELECT subject, settings::text AS settings, revision, updated_at "
                + "FROM learning_engine_profiles WHERE user_id = ? ORDER BY subject", userId));
        data.put("learningEngineEvents", jdbc.queryForList("SELECT id, subject, kind, concept_id, question_id, correct, "
                + "occurred_at, payload::text AS payload FROM learning_engine_events WHERE user_id = ? ORDER BY id", userId));
        return data;
    }

    @Transactional
    public void erase(Long userId, String password) {
        verifiedStudent(userId, password);
        erasure.erase(userId);
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
