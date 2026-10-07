package com.hedefyks.question;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface QuestionRepository extends JpaRepository<Question, Long>, JpaSpecificationExecutor<Question> {

    Optional<Question> findByCode(String code);

    List<Question> findByCodeIn(Collection<String> codes);

    long countByActiveTrue();

    /** Filtre açılır listeleri için ders/konu bazında soru sayıları (yalnız aktif sorular). */
    @Query("""
            select new com.hedefyks.question.QuestionDtos$FilterRow(q.examType, q.subject, q.topic, count(q))
            from Question q where q.active = true
            group by q.examType, q.subject, q.topic""")
    List<QuestionDtos.FilterRow> filterRows();
}
