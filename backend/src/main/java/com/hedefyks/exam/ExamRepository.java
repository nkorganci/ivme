package com.hedefyks.exam;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    record Agg(long examCount, Double avgPercent, long correct, long wrong, long blank) {}

    Optional<Exam> findByIdAndUserId(Long id, Long userId);

    /** Aynı sınavın iki kez gönderilmesine karşı satır kilidi. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Exam e where e.id = :id and e.userId = :userId")
    Optional<Exam> lockByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    Page<Exam> findByUserIdAndStatusOrderBySubmittedAtDesc(Long userId, ExamStatus status, Pageable pageable);

    Optional<Exam> findFirstByUserIdAndStatusOrderByStartedAtDesc(Long userId, ExamStatus status);

    long countByStatus(ExamStatus status);

    @Query("""
            select new com.hedefyks.exam.ExamRepository$Agg(
                count(e), avg(e.percent),
                coalesce(sum(e.correctCount), 0L), coalesce(sum(e.wrongCount), 0L), coalesce(sum(e.blankCount), 0L))
            from Exam e where e.userId = :userId and e.status = :status""")
    Agg aggregate(@Param("userId") Long userId, @Param("status") ExamStatus status);
}
