package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.exam.ExamQuestionRepository;
import com.hedefyks.exam.ExamStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuestionHelpfulnessService {
    public record Summary(long helpful, long notHelpful, Boolean mine, boolean canVote) {}

    private final JdbcTemplate jdbc;
    private final QuestionRepository questions;
    private final QuestionAttemptRepository attempts;
    private final ExamQuestionRepository examQuestions;

    public QuestionHelpfulnessService(JdbcTemplate jdbc, QuestionRepository questions,
                                      QuestionAttemptRepository attempts, ExamQuestionRepository examQuestions) {
        this.jdbc = jdbc;
        this.questions = questions;
        this.attempts = attempts;
        this.examQuestions = examQuestions;
    }

    public Summary summary(Long questionId, Long userId) {
        long[] counts = jdbc.queryForObject("""
                SELECT count(*) FILTER (WHERE helpful), count(*) FILTER (WHERE NOT helpful)
                FROM question_helpfulness WHERE question_id = ?
                """, (rs, row) -> new long[]{rs.getLong(1), rs.getLong(2)}, questionId);
        Boolean mine = jdbc.query("SELECT helpful FROM question_helpfulness WHERE question_id = ? AND user_id = ?",
                (rs, row) -> rs.getBoolean(1), questionId, userId).stream().findFirst().orElse(null);
        return new Summary(counts[0], counts[1], mine, eligible(questionId, userId));
    }

    @Transactional
    public Summary vote(Long questionId, Long userId, Boolean helpful) {
        if (helpful == null) throw ApiException.badRequest("Fayda oyu gerekli.");
        if (questions.findById(questionId).filter(Question::isActive).isEmpty()) {
            throw ApiException.notFound("Soru bulunamadı.");
        }
        if (!eligible(questionId, userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Fayda oyu için önce soruyu çöz.");
        }
        jdbc.update("""
                INSERT INTO question_helpfulness(user_id, question_id, helpful) VALUES (?, ?, ?)
                ON CONFLICT (user_id, question_id) DO UPDATE SET helpful = EXCLUDED.helpful, updated_at = now()
                """, userId, questionId, helpful);
        return summary(questionId, userId);
    }

    private boolean eligible(Long questionId, Long userId) {
        return attempts.hasEngaged(userId, questionId)
                || examQuestions.inSubmittedExam(userId, questionId, ExamStatus.SUBMITTED);
    }
}
