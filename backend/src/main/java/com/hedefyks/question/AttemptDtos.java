package com.hedefyks.question;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AttemptDtos {
    private AttemptDtos() {}

    public record AttemptRequest(
            @NotNull UUID clientEventId,
            @NotNull AttemptEventType eventType,
            String answer,
            @Min(0) @Max(21600) Integer activeSeconds,
            Long sessionId) {}

    public record AttemptItem(Long id, AttemptEventType eventType, String selectedAnswer,
                              Boolean correct, int activeSeconds, Instant createdAt,
                              List<QuestionTaxonomyService.Label> taxonomySnapshot) {
        static AttemptItem of(QuestionAttempt a, List<QuestionTaxonomyService.Label> labels) {
            return new AttemptItem(a.getId(), a.getEventType(), a.getSelectedAnswer(),
                    a.getCorrect(), a.getActiveSeconds(), a.getCreatedAt(), labels);
        }
    }

    public record PracticeState(int round, List<AttemptItem> attempts, int remainingAttempts,
                                boolean canAnswer, boolean canReveal, boolean roundComplete,
                                String correctAnswer, String solutionUrl) {}
}
