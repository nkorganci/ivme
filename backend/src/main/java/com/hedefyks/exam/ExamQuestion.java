package com.hedefyks.exam;

import com.hedefyks.question.Question;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Sınavdaki bir soru. questionCode/subject/topic oluşturulurken, correctAnswer ve correct
 * gönderim anında kopyalanır; böylece soru sonradan değişse de geçmiş sonuç aynı kalır.
 */
@Entity
@Table(name = "exam_questions")
@Getter
@Setter
@NoArgsConstructor
public class ExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id")
    private Long examId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private Question question;

    @Column(name = "question_order")
    private int position;

    @Column(name = "question_code")
    private String questionCode;

    private String subject;
    private String topic;

    @Column(name = "selected_answer")
    private String selectedAnswer;

    @Column(name = "correct_answer")
    private String correctAnswer;

    /** Boş bırakılan için null. */
    @Column(name = "is_correct")
    private Boolean correct;
}
