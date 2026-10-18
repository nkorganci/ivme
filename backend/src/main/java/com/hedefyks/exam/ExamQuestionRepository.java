package com.hedefyks.exam;

import java.util.List;
import java.util.Optional;
import com.hedefyks.exam.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, Long> {

    record SubjectResult(Long examId, String subject, long total, long correct, long wrong, long blank) {}

    // Use the submitted answer and subject snapshots; never reclassify historical results.
    @Query("""
            select new com.hedefyks.exam.ExamQuestionRepository$SubjectResult(
                eq.examId, eq.subject, count(eq),
                sum(case when eq.selectedAnswer is not null and eq.correct = true then 1L else 0L end),
                sum(case when eq.selectedAnswer is not null and (eq.correct = false or eq.correct is null) then 1L else 0L end),
                sum(case when eq.selectedAnswer is null then 1L else 0L end))
            from ExamQuestion eq where eq.examId in :examIds
            group by eq.examId, eq.subject order by eq.examId, eq.subject
            """)
    List<SubjectResult> summarizeSubjects(@Param("examIds") List<Long> examIds);

    @Query("select eq from ExamQuestion eq join fetch eq.question where eq.examId = :examId order by eq.position")
    List<ExamQuestion> findAllByExam(@Param("examId") Long examId);

    Optional<ExamQuestion> findByExamIdAndQuestionId(Long examId, Long questionId);

    @Query("""
            select count(eq) > 0 from ExamQuestion eq, Exam e
            where eq.examId = e.id and eq.question.id = :questionId
              and e.userId = :userId and e.status = :status
            """)
    boolean inSubmittedExam(@Param("userId") Long userId, @Param("questionId") Long questionId,
                            @Param("status") ExamStatus status);
}
