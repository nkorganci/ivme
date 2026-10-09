package com.hedefyks.question;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionAttemptRepository extends JpaRepository<QuestionAttempt, Long> {
    List<QuestionAttempt> findByUserIdAndQuestionIdOrderByPracticeRoundAscIdAsc(Long userId, Long questionId);

    Optional<QuestionAttempt> findByUserIdAndClientEventId(Long userId, UUID clientEventId);

    @Query("""
            select count(a) > 0 from QuestionAttempt a
            where a.userId = :userId and a.questionId = :questionId
              and (a.eventType = com.hedefyks.question.AttemptEventType.REVEAL
                   or (a.eventType = com.hedefyks.question.AttemptEventType.ANSWER and a.correct = true))
            """)
    boolean hasSeenAnswer(@Param("userId") Long userId, @Param("questionId") Long questionId);
}
