package com.hedefyks.feedback;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackRepository extends JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback> {

    record RatingAgg(Double avg, long count) {}

    record ReportedRow(Long questionId, String code, String subject, String topic, long reportCount,
                       java.time.Instant lastReportAt) {}

    @Query("select f from Feedback f where f.user.id = :userId and f.question.id = :questionId and f.category = :category")
    Optional<Feedback> findMine(@Param("userId") Long userId, @Param("questionId") Long questionId,
                                @Param("category") FeedbackCategory category);

    @Query("""
            select new com.hedefyks.feedback.FeedbackRepository$RatingAgg(avg(f.rating), count(f.rating))
            from Feedback f where f.question.id = :qid and f.category = :cat""")
    RatingAgg ratingAgg(@Param("qid") Long questionId, @Param("cat") FeedbackCategory category);

    @Query("""
            select f.difficultyVote, count(f) from Feedback f
            where f.question.id = :qid and f.category = :cat and f.difficultyVote is not null
            group by f.difficultyVote""")
    List<Object[]> difficultyVotes(@Param("qid") Long questionId, @Param("cat") FeedbackCategory category);

    long countByResolvedFalseAndCategoryIn(Collection<FeedbackCategory> categories);

    @Query("select count(distinct f.question.id) from Feedback f where f.category = :cat and f.resolved = false")
    long reportedQuestionCount(@Param("cat") FeedbackCategory category);

    @Query("""
            select new com.hedefyks.feedback.FeedbackRepository$ReportedRow(
                q.id, q.code, q.subject, q.topic, count(f), max(f.createdAt))
            from Feedback f join f.question q
            where f.category = :cat and f.resolved = false
            group by q.id, q.code, q.subject, q.topic
            order by max(f.createdAt) desc""")
    List<ReportedRow> reportedQuestions(@Param("cat") FeedbackCategory category);

    /** Yönetim listesindeki sorular için çözülmemiş bildirim sayıları: [questionId, adet]. */
    @Query("""
            select f.question.id, count(f) from Feedback f
            where f.question.id in :ids and f.category = :cat and f.resolved = false
            group by f.question.id""")
    List<Object[]> openReportCounts(@Param("ids") Collection<Long> ids, @Param("cat") FeedbackCategory category);

    /** Yönetim listesindeki sorular için yıldız ortalaması: [questionId, ortalama, adet]. */
    @Query("""
            select f.question.id, avg(f.rating), count(f.rating) from Feedback f
            where f.question.id in :ids and f.category = :cat
            group by f.question.id""")
    List<Object[]> ratingStats(@Param("ids") Collection<Long> ids, @Param("cat") FeedbackCategory category);

    @Override
    @EntityGraph(attributePaths = {"user", "question"})
    Page<Feedback> findAll(Specification<Feedback> spec, Pageable pageable);
}
