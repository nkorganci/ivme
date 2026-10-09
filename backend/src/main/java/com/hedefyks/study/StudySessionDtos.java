package com.hedefyks.study;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionSelectionMode;
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
            Integer durationMinutes,
            @NotNull(message = "İstek kimliği gerekli.") UUID clientRequestId) {}

    public record SessionQuestion(Long questionId, int position, String code, QuestionBank bank,
                                  String subject, String topic, QuestionStatus status,
                                  AnswerResult firstResult, AnswerResult lastResult) {}

    public record Result(int correct, int wrong, int blank,
                         int firstCorrect, int firstWrong, int firstBlank) {}

    public record Session(Long id, Instant startedAt, QuestionSelectionMode selectionMode,
                          QuestionBank bank, ExamType examType, String subject, String topic,
                          int questionCount, Integer timeLimitSeconds, Instant deadlineAt,
                          Instant serverNow, Instant endedAt, String status, Result result,
                          List<SessionQuestion> questions) {}
}
