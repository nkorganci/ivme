package com.hedefyks.admin;

import com.hedefyks.feedback.FeedbackCategory;
import com.hedefyks.question.Difficulty;
import com.hedefyks.question.ExamType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class AdminDtos {

    private AdminDtos() {}

    public record Stats(long userCount, long questionCount, long activeQuestionCount, long submittedExamCount,
                        long openFeedbackCount, long reportedQuestionCount) {}

    public record AdminQuestion(Long id, String code, ExamType examType, String subject, String topic,
                                Integer year, String source, String image,
                                String correctAnswer, int choiceCount, String solutionUrl, boolean active,
                                long openReportCount, Double avgRating, long ratingCount, Instant updatedAt) {}

    public record QuestionUpdate(
            @NotNull(message = "Sınav türü gerekli.") ExamType examType,
            @NotBlank(message = "Ders gerekli.") @Size(max = 80, message = "Ders en fazla 80 karakter.") String subject,
            @Size(max = 160, message = "Konu en fazla 160 karakter.") String topic,
            @Min(value = 1990, message = "Yıl 1990–2100 olmalı.") @Max(value = 2100, message = "Yıl 1990–2100 olmalı.") Integer year,
            @Size(max = 200, message = "Kaynak en fazla 200 karakter.") String source,
            @NotBlank(message = "Görsel yolu gerekli.") @Size(max = 300, message = "Görsel yolu en fazla 300 karakter.") String image,
            @NotBlank(message = "Doğru cevap gerekli.") @Pattern(regexp = "^[A-Ea-e]$", message = "Doğru cevap A–E olmalı.") String correctAnswer,
            @Min(value = 4, message = "Şık sayısı 4 veya 5 olmalı.") @Max(value = 5, message = "Şık sayısı 4 veya 5 olmalı.") int choiceCount,
            @Pattern(regexp = "^$|^https?://\\S+$", message = "Çözüm bağlantısı http:// veya https:// ile başlamalı.")
            @Size(max = 500, message = "Çözüm bağlantısı en fazla 500 karakter.") String solutionUrl,
            boolean active) {}

    public record AdminFeedback(Long id, FeedbackCategory category, String username, Long questionId,
                                String questionCode, Difficulty difficultyVote, Integer rating, String message,
                                boolean resolved, Instant resolvedAt, Instant createdAt) {}

    public record ResolveRequest(@NotNull(message = "resolved gerekli.") Boolean resolved) {}

    public record ReportedQuestion(Long questionId, String code, String subject, String topic, long reportCount,
                                   Instant lastReportAt) {}
}
