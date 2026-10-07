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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Kalıcı dış kimlik; QR adresi /soru/{code}. */
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "exam_type")
    private ExamType examType;

    private String subject;
    private String topic;

    @Column(name = "exam_year")
    private Integer year;

    private String source;

    /** Kök resim klasörüne göre göreli yol (görselin kendisi veritabanında değil). */
    private String image;

    @Column(name = "correct_answer")
    private String correctAnswer;

    @Column(name = "choice_count")
    private int choiceCount = 5;

    @Column(name = "solution_url")
    private String solutionUrl;

    private boolean active = true;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();
}
