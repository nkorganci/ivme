package com.hedefyks.question;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "question_attempts")
@Getter
@Setter
@NoArgsConstructor
public class QuestionAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "client_event_id", nullable = false)
    private UUID clientEventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private AttemptEventType eventType;

    @Column(name = "practice_round", nullable = false)
    private int practiceRound = 1;

    @Column(name = "selected_answer")
    private String selectedAnswer;

    @Column(name = "correct_answer", nullable = false)
    private String correctAnswer;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(name = "active_seconds", nullable = false)
    private int activeSeconds;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
