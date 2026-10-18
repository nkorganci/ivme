package com.hedefyks.exam;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionSelectionMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Bir kullanıcının sınavı. Sonuç sayıları gönderim anında yazılır ve sonradan değişmez. */
@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "exam_type")
    private ExamType examType;

    private String subject;

    @Enumerated(EnumType.STRING)
    private ExamStatus status = ExamStatus.IN_PROGRESS;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_mode", nullable = false)
    private QuestionSelectionMode selectionMode = QuestionSelectionMode.MIXED;

    @Column(name = "question_count")
    private int questionCount;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @Column(name = "started_at")
    private Instant startedAt = Instant.now();

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "correct_count")
    private Integer correctCount;

    @Column(name = "wrong_count")
    private Integer wrongCount;

    @Column(name = "blank_count")
    private Integer blankCount;

    private BigDecimal percent;
    private BigDecimal net;
}
