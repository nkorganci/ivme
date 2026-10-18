package com.hedefyks.exam;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionSelectionMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ExamDtos {

    private ExamDtos() {}

    public record FullExamRequest(QuestionBank bank,
            @NotNull(message = "TYT veya AYT seçmelisin.") ExamType examType, ExamTrack track,
            Boolean includeSolved, @Min(2018) @Max(2100) Integer year) {
        public FullExamRequest(QuestionBank bank, ExamType examType, ExamTrack track, Boolean includeSolved) {
            this(bank, examType, track, includeSolved, null);
        }
        public QuestionSelectionMode selectionMode() {
            return Boolean.FALSE.equals(includeSolved) ? QuestionSelectionMode.NEW : QuestionSelectionMode.MIXED;
        }
    }

    public record CreateExamRequest(
            QuestionBank bank, ExamType examType, String subject, String topic,
            @NotNull(message = "Soru sayısı gerekli.")
            @Min(value = 1, message = "En az 1 soru seçmelisin.")
            @Max(value = 120, message = "En fazla 120 soru seçebilirsin.")
            Integer questionCount,
            QuestionSelectionMode selectionMode,
            @Min(value = 0, message = "Süre negatif olamaz.")
            @Max(value = 600, message = "Süre en fazla 600 dakika olabilir.")
            Integer timeLimitMinutes, Integer topicPdfId, ExamTrack track,
            List<String> categoryId,String categoryMatch,Boolean includeCandidates,String questionTypeId,String teacherDifficulty) {
        public CreateExamRequest(QuestionBank bank,ExamType examType,String subject,String topic,Integer questionCount,
                QuestionSelectionMode selectionMode,Integer timeLimitMinutes,Integer topicPdfId,ExamTrack track) {
            this(bank,examType,subject,topic,questionCount,selectionMode,timeLimitMinutes,topicPdfId,track,null,null,null,null,null);
        }
    }

    public record AnswerRequest(@NotNull(message = "questionId gerekli.") Long questionId, String answer) {}

    /** answers: { "<questionId>": "B" }; gövde isteğe bağlıdır. */
    public record SubmitRequest(Map<String, String> answers) {}

    public record SessionQuestion(Long questionId, int position, String code, String subject, String topic,
                                  int choiceCount, String selectedAnswer) {}

    public record ExamSession(Long id, String title, ExamStatus status, QuestionSelectionMode selectionMode,
                              int questionCount, Integer timeLimitMinutes,
                              Instant startedAt, Long remainingSeconds, List<SessionQuestion> questions) {}

    public record HistoryItem(Long id, String title, int questionCount, int correctCount, int wrongCount,
                              int blankCount, BigDecimal percent, BigDecimal net, int durationSeconds,
                              Instant submittedAt, ExamType examType, List<SubjectStat> bySubject) {}

    public record SubjectStat(String subject, int total, int correct, int wrong, int blank) {}

    public record ResultQuestion(int position, Long questionId, String code, String subject, String topic,
                                 String selectedAnswer, String correctAnswer, String status,
                                 boolean hasExplanation) {}

    public record ExamResult(Long id, String title, int questionCount, int correctCount, int wrongCount,
                             int blankCount, BigDecimal percent, BigDecimal net, int durationSeconds,
                             Instant submittedAt, ExamType examType, String subject, Instant startedAt,
                             List<SubjectStat> bySubject, List<ResultQuestion> questions) {}

    public record ActiveExam(Long id, String title, int questionCount, Long remainingSeconds) {}

    public record Summary(long examCount, Double averagePercent, long totalCorrect, long totalWrong, long totalBlank,
                          HistoryItem lastExam, ActiveExam activeExam) {}
}
