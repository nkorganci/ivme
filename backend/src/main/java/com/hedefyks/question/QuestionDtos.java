package com.hedefyks.question;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public final class QuestionDtos {

    private QuestionDtos() {}

    public record FilterRow(ExamType examType, String subject, String topic, long count) {}

    public record QuestionListItem(Long id, String code, QuestionBank bank, ExamType examType, String subject,
                                   String topic, Integer year, String source) {
        public static QuestionListItem of(Question q) {
            return new QuestionListItem(q.getId(), q.getCode(), q.getBank(), q.getExamType(), q.getSubject(),
                    q.getTopic(), q.getYear(), q.getSource());
        }
    }

    public record Evaluation(Difficulty difficultyVote, Integer rating) {}

    /** Doğru cevap içermez; yalnızca /check ile öğrenilir. */
    public record QuestionDetail(Long id, String code, QuestionBank bank, ExamType examType, String subject,
                                 String topic, Integer year, String source, int choiceCount, boolean hasSolutionImage,
                                 Double avgRating, long ratingCount, Map<String, Long> difficultyVotes,
                                 Evaluation myEvaluation) {}

    public record CheckRequest(@NotBlank(message = "Bir şık seç.") String answer) {}

    public record CheckResponse(boolean correct, String correctAnswer, String solutionUrl) {}
}
