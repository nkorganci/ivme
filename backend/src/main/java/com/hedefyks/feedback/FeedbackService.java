package com.hedefyks.feedback;

import com.hedefyks.common.ApiException;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionRepository;
import com.hedefyks.user.UserRepository;
import java.time.Instant;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FeedbackService {

    private final FeedbackRepository feedback;
    private final QuestionRepository questions;
    private final UserRepository users;
    private final JdbcClient jdbc;

    public FeedbackService(FeedbackRepository feedback, QuestionRepository questions, UserRepository users, JdbcClient jdbc) {
        this.feedback = feedback;
        this.questions = questions;
        this.users = users;
        this.jdbc = jdbc;
    }

    public Long create(Long userId, FeedbackDtos.FeedbackRequest req) {
        String message = req.message() == null ? null : req.message().trim();
        if (message != null && message.isEmpty()) message = null;

        Feedback f;
        switch (req.category()) {
            case RATING -> {
                Question q = activeQuestion(req.questionId());
                if (req.difficultyVote() == null && req.rating() == null) {
                    throw ApiException.badRequest("Zorluk seç veya yıldız ver.");
                }
                // Kullanıcı başına soru başına tek değerlendirme (kısmi benzersiz indeks). Tek deyimle birleştirilir: eşzamanlı iki
                // istek ikinci kayıt açmaz, yalnız yıldız ya da yalnız zorluk gönderilince diğer alan silinmez (TAS-06).
                return jdbc.sql("""
                        INSERT INTO feedback (user_id, question_id, category, difficulty_vote, rating, message, resolved, created_at, updated_at)
                        VALUES (:userId, :questionId, 'RATING', :difficulty, :rating, :message, true, now(), now())
                        ON CONFLICT (user_id, question_id) WHERE category = 'RATING'
                        DO UPDATE SET difficulty_vote = COALESCE(EXCLUDED.difficulty_vote, feedback.difficulty_vote),
                                      rating = COALESCE(EXCLUDED.rating, feedback.rating),
                                      message = COALESCE(EXCLUDED.message, feedback.message), updated_at = now()
                        RETURNING id
                        """).param("userId", userId).param("questionId", q.getId())
                        .param("difficulty", req.difficultyVote() == null ? null : req.difficultyVote().name())
                        .param("rating", req.rating()).param("message", message).query(Long.class).single();
            }
            case QUESTION_ISSUE -> {
                Question q = activeQuestion(req.questionId());
                requireMessage(message, "Sorunu kısaca anlat (en az 5 karakter).");
                f = new Feedback();
                f.setQuestion(q);
                f.setMessage(message);
            }
            case GENERAL -> {
                requireMessage(message, "Görüşünü yaz (en az 5 karakter).");
                f = new Feedback();
                f.setRating(req.rating());
                f.setMessage(message);
            }
            default -> throw ApiException.badRequest("Geçersiz kategori.");
        }
        f.setCategory(req.category());
        f.setUser(users.getReferenceById(userId));
        f.setUpdatedAt(Instant.now());
        return feedback.save(f).getId();
    }

    private Question activeQuestion(Long questionId) {
        if (questionId == null) throw ApiException.badRequest("questionId gerekli.");
        return questions.findById(questionId).filter(Question::isActive)
                .orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
    }

    private static void requireMessage(String message, String error) {
        if (message == null || message.length() < 5) throw ApiException.badRequest(error);
    }
}
