package com.hedefyks.question;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionAttemptRepository extends JpaRepository<QuestionAttempt, Long> {
    @Query("""
            select count(a) > 0 from QuestionAttempt a
            where a.userId = :userId and a.questionId = :questionId
              and a.eventType <> com.hedefyks.question.AttemptEventType.SKIP
            """)
    boolean hasEngaged(@Param("userId") Long userId, @Param("questionId") Long questionId);
    @Query("""
            select a from QuestionAttempt a
            where a.userId = :userId and a.questionId = :questionId
              and ((:sessionId is null and a.sessionId is null) or a.sessionId = :sessionId)
            order by a.practiceRound, a.id
            """)
    List<QuestionAttempt> findForScope(@Param("userId") Long userId, @Param("questionId") Long questionId,
                                        @Param("sessionId") Long sessionId);

    Optional<QuestionAttempt> findByUserIdAndClientEventId(Long userId, UUID clientEventId);

    @Query("""
            select count(a) > 0 from QuestionAttempt a
            where a.userId = :userId and a.questionId = :questionId
              and (a.eventType = com.hedefyks.question.AttemptEventType.REVEAL
                   or (a.eventType = com.hedefyks.question.AttemptEventType.ANSWER and a.correct = true))
            """)
    boolean hasSeenAnswer(@Param("userId") Long userId, @Param("questionId") Long questionId);
}
