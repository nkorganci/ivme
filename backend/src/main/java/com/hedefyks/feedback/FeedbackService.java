package com.hedefyks.feedback;

import com.hedefyks.common.ApiException;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionRepository;
import com.hedefyks.user.UserRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FeedbackService {

    private final FeedbackRepository feedback;
    private final QuestionRepository questions;
    private final UserRepository users;

    public FeedbackService(FeedbackRepository feedback, QuestionRepository questions, UserRepository users) {
        this.feedback = feedback;
        this.questions = questions;
        this.users = users;
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
                // Kullanıcı başına soru başına tek değerlendirme: varsa güncelle
                f = feedback.findMine(userId, q.getId(), FeedbackCategory.RATING).orElseGet(Feedback::new);
                f.setQuestion(q);
                f.setDifficultyVote(req.difficultyVote());
                f.setRating(req.rating());
                f.setMessage(message);
                f.setResolved(true);                 // değerlendirmeler işlem gerektirmez; çözülmüş sayılır
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
