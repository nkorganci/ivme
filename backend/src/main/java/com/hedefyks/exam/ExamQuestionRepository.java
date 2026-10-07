package com.hedefyks.exam;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, Long> {

    @Query("select eq from ExamQuestion eq join fetch eq.question where eq.examId = :examId order by eq.position")
    List<ExamQuestion> findAllByExam(@Param("examId") Long examId);

    Optional<ExamQuestion> findByExamIdAndQuestionId(Long examId, Long questionId);
}
