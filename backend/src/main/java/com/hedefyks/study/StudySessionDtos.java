package com.hedefyks.study;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionSelectionMode;
import com.hedefyks.question.QuestionHistorySelection;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class StudySessionDtos {
    private StudySessionDtos() {}

    public enum QuestionStatus { NOT_STARTED, IN_PROGRESS, COMPLETED }
    public enum AnswerResult { CORRECT, WRONG, BLANK }

    public record CreateRequest(
            QuestionBank bank, ExamType examType, String subject, String topic,
            QuestionSelectionMode selectionMode,
            @NotNull(message = "Soru sayısı gerekli.")
            @Min(value = 1, message = "En az 1 soru seçmelisin.")
            @Max(value = 120, message = "En fazla 120 soru seçebilirsin.")
            Integer questionCount,
            @Min(value = 1, message = "Süre en az 1 dakika olmalı.")
            @Max(value = 240, message = "Süre en fazla 240 dakika olabilir.")
            Integer durationMinutes, Integer topicPdfId,
            @NotNull(message = "İstek kimliği gerekli.") UUID clientRequestId,
            List<String> categoryId,String categoryMatch,Boolean includeCandidates,String questionTypeId,String teacherDifficulty,
            List<com.hedefyks.question.QuestionSource> source,
            List<@NotNull QuestionHistorySelection> history) {
        public CreateRequest(QuestionBank bank,ExamType examType,String subject,String topic,QuestionSelectionMode selectionMode,
                Integer questionCount,Integer durationMinutes,Integer topicPdfId,UUID clientRequestId,
                List<String> categoryId,String categoryMatch,Boolean includeCandidates,String questionTypeId,String teacherDifficulty,
                List<com.hedefyks.question.QuestionSource> source) {
            this(bank,examType,subject,topic,selectionMode,questionCount,durationMinutes,topicPdfId,clientRequestId,categoryId,categoryMatch,includeCandidates,questionTypeId,teacherDifficulty,source,null);
        }
        public CreateRequest(QuestionBank bank,ExamType examType,String subject,String topic,QuestionSelectionMode selectionMode,
                Integer questionCount,Integer durationMinutes,Integer topicPdfId,UUID clientRequestId,
                List<String> categoryId,String categoryMatch,Boolean includeCandidates,String questionTypeId,String teacherDifficulty) {
            this(bank,examType,subject,topic,selectionMode,questionCount,durationMinutes,topicPdfId,clientRequestId,categoryId,categoryMatch,includeCandidates,questionTypeId,teacherDifficulty,null);
        }
        public CreateRequest(QuestionBank bank,ExamType examType,String subject,String topic,QuestionSelectionMode selectionMode,
                Integer questionCount,Integer durationMinutes,Integer topicPdfId,UUID clientRequestId) {
            this(bank,examType,subject,topic,selectionMode,questionCount,durationMinutes,topicPdfId,clientRequestId,null,null,null,null,null);
        }
    }

    public record SessionQuestion(Long questionId, int position, String code, QuestionBank bank,
                                  String subject, String topic, QuestionStatus status,
                                  AnswerResult firstResult, AnswerResult lastResult) {}

    public record Result(int correct, int wrong, int blank,
                         int firstCorrect, int firstWrong, int firstBlank) {}

    public record HistoryItem(Long id, Instant startedAt, Instant endedAt, String status,
                              QuestionSelectionMode selectionMode, Integer timeLimitSeconds,
                              int questionCount, String subject, String topic, Result result) {}

    public record UnfinishedSummary(long count, Long latestSessionId) {}

    public record UnfinishedItem(Long id, String kind, String title, Instant startedAt,
                                 int questionCount, int solvedCount,
                                 String resumeQuestionCode, String resumeQuestionBank) {}

    public record Session(Long id, Instant startedAt, QuestionSelectionMode selectionMode,
                          QuestionBank bank, ExamType examType, String subject, String topic,
                          int questionCount, Integer timeLimitSeconds, Instant deadlineAt,
                          Instant serverNow, Instant endedAt, String status, Result result,
                          List<SessionQuestion> questions) {}
}
