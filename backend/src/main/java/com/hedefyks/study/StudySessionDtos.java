package com.hedefyks.study;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class StudySessionDtos {
    private StudySessionDtos() {}

    public record CreateRequest(
            QuestionBank bank, ExamType examType, String subject, String topic,
            @NotNull(message = "Soru sayısı gerekli.")
            @Min(value = 1, message = "En az 1 soru seçmelisin.")
            @Max(value = 120, message = "En fazla 120 soru seçebilirsin.")
            Integer questionCount,
            @NotNull(message = "İstek kimliği gerekli.") UUID clientRequestId) {}

    public record SessionQuestion(Long questionId, int position, String code, QuestionBank bank,
                                  String subject, String topic) {}

    public record Session(Long id, Instant startedAt, int questionCount, List<SessionQuestion> questions) {}
}
