package com.hedefyks.feedback;

import com.hedefyks.question.Difficulty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class FeedbackDtos {

    private FeedbackDtos() {}

    public record FeedbackRequest(
            @NotNull(message = "Kategori gerekli.") FeedbackCategory category,
            Long questionId,
            Difficulty difficultyVote,
            @Min(value = 1, message = "Puan 1–5 olmalı.") @Max(value = 5, message = "Puan 1–5 olmalı.") Integer rating,
            @Size(max = 2000, message = "Mesaj en fazla 2000 karakter olabilir.") String message) {}

    public record Created(Long id) {}
}
