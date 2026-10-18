package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.exam.ExamQuestionRepository;
import com.hedefyks.exam.ExamStatus;
import com.hedefyks.question.AttemptDtos.AttemptRequest;
import com.hedefyks.question.AttemptDtos.AttemptItem;
import com.hedefyks.question.AttemptDtos.PracticeState;
import com.hedefyks.study.StudySessionService;
import com.hedefyks.user.UserRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Serbest pratik olayları; sınav sorularının cevap akışından ayrı tutulur. */
@Service
public class AttemptService {
    private static final int MAX_ANSWERS_PER_ROUND = 2;

    private final QuestionRepository questions;
    private final QuestionAttemptRepository attempts;
    private final UserRepository users;
    private final ExamQuestionRepository examQuestions;
    private final StudySessionService studySessions;
    private final QuestionTaxonomyService taxonomy;
    private final com.hedefyks.review.SharedQuestionLabels sharedLabels;

    public AttemptService(QuestionRepository questions, QuestionAttemptRepository attempts,
                          UserRepository users, ExamQuestionRepository examQuestions,
                          StudySessionService studySessions, QuestionTaxonomyService taxonomy, com.hedefyks.review.SharedQuestionLabels sharedLabels) {
        this.questions = questions;
        this.attempts = attempts;
        this.users = users;
        this.examQuestions = examQuestions;
        this.studySessions = studySessions;
        this.taxonomy = taxonomy;
        this.sharedLabels=sharedLabels;
    }

    @Transactional(readOnly = true)
    public PracticeState state(Long questionId, Long userId, Long sessionId) {
        Question q = active(questionId);
        if (sessionId != null) studySessions.requireQuestion(userId, sessionId, questionId, false);
        return toState(q, attempts.findForScope(userId, questionId, sessionId));
    }

    @Transactional
    public PracticeState submit(Long questionId, Long userId, AttemptRequest req) {
        Question q = active(questionId);
        users.lockById(userId).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        if (req.sessionId() != null) studySessions.requireQuestion(userId, req.sessionId(), questionId, true);
        String answer = req.eventType() == AttemptEventType.ANSWER
                ? Answers.normalize(req.answer(), q.getChoiceCount()) : null;
        if (req.eventType() == AttemptEventType.ANSWER && answer == null) {
            throw ApiException.badRequest("Bir şık seç.");
        }
        if (req.eventType() != AttemptEventType.ANSWER && req.answer() != null) {
            throw ApiException.badRequest("Bu olayda şık gönderilmez.");
        }
        QuestionAttempt duplicate = attempts.findByUserIdAndClientEventId(userId, req.clientEventId()).orElse(null);
        if (duplicate != null) {
            if (!duplicate.getQuestionId().equals(questionId) || duplicate.getEventType() != req.eventType()
                    || !Objects.equals(duplicate.getSelectedAnswer(), answer)
                    || !Objects.equals(duplicate.getSessionId(), req.sessionId())) {
                throw ApiException.conflict("Olay kimliği başka bir işlemde kullanılmış.");
            }
            return state(questionId, userId, req.sessionId());
        }

        List<QuestionAttempt> all = attempts.findForScope(userId, questionId, req.sessionId());
        int round = all.isEmpty() ? 1 : all.get(all.size() - 1).getPracticeRound();
        int currentRound = round;
        List<QuestionAttempt> current = all.stream().filter(a -> a.getPracticeRound() == currentRound).toList();
        boolean complete = complete(current);
        if (req.eventType() == AttemptEventType.ANSWER && complete) {
            round++; // açıkça yeniden yanıtlamak yeni bir çalışma turudur
            current = List.of();
        } else if (complete) {
            throw ApiException.conflict("Bu çalışma turu tamamlandı; yeni tur için tekrar yanıtla.");
        }
        if (req.eventType() == AttemptEventType.ANSWER && answerCount(current) >= MAX_ANSWERS_PER_ROUND) {
            throw ApiException.conflict("İki deneme hakkı kullanıldı; cevabı göster veya soruyu atla.");
        }

        QuestionAttempt attempt = new QuestionAttempt();
        attempt.setUserId(userId);
        attempt.setQuestionId(questionId);
        attempt.setSessionId(req.sessionId());
        attempt.setClientEventId(req.clientEventId());
        attempt.setEventType(req.eventType());
        attempt.setPracticeRound(round);
        attempt.setSelectedAnswer(answer);
        attempt.setCorrectAnswer(q.getCorrectAnswer()); // soru anahtarı değişse de geçmiş korunur
        attempt.setCorrect(answer == null ? null : answer.equals(q.getCorrectAnswer()));
        attempt.setActiveSeconds(req.activeSeconds() == null ? 0 : req.activeSeconds());
        attempts.saveAndFlush(attempt);
        taxonomy.snapshot(attempt.getId(), questionId);
        sharedLabels.snapshotAttempt(attempt.getId(),questionId);
        // Ağ isteği son saniyede başladıysa, kayıt tamamlandığı anda da süreyi doğrula.
        if (req.sessionId() != null) studySessions.requireQuestion(userId, req.sessionId(), questionId, true);
        return state(questionId, userId, req.sessionId());
    }

    @Transactional(readOnly = true)
    public boolean canSeeSolution(Long questionId, Long userId) {
        return attempts.hasSeenAnswer(userId, questionId)
                || examQuestions.inSubmittedExam(userId, questionId, ExamStatus.SUBMITTED);
    }

    private Question active(Long id) {
        return questions.findById(id).filter(Question::isActive)
                .orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
    }

    private PracticeState toState(Question q, List<QuestionAttempt> all) {
        int round = all.isEmpty() ? 1 : all.get(all.size() - 1).getPracticeRound();
        List<QuestionAttempt> current = all.stream().filter(a -> a.getPracticeRound() == round).toList();
        boolean complete = complete(current);
        int remaining = Math.max(0, MAX_ANSWERS_PER_ROUND - answerCount(current));
        QuestionAttempt seen = current.stream()
                .filter(a -> a.getEventType() == AttemptEventType.REVEAL || Boolean.TRUE.equals(a.getCorrect()))
                .findFirst().orElse(null);
        return new PracticeState(round, current.stream()
                .map(a -> AttemptItem.of(a, taxonomy.snapshotFor(a.getId()))).toList(),
                complete ? 0 : remaining, !complete && remaining > 0, !complete, complete,
                seen == null ? null : seen.getCorrectAnswer(), seen == null ? null : q.getSolutionUrl());
    }

    private static int answerCount(List<QuestionAttempt> current) {
        return (int) current.stream().filter(a -> a.getEventType() == AttemptEventType.ANSWER).count();
    }

    private static boolean complete(List<QuestionAttempt> current) {
        return current.stream().anyMatch(a -> a.getEventType() != AttemptEventType.ANSWER
                || Boolean.TRUE.equals(a.getCorrect()));
    }
}
