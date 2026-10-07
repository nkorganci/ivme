package com.hedefyks.question;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class QuestionSpecs {

    private QuestionSpecs() {}

    public static Specification<Question> filter(QuestionFilter f, Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (active != null) p.add(cb.equal(root.get("active"), active));
            if (f.examType() != null) p.add(cb.equal(root.get("examType"), f.examType()));
            if (f.subject() != null) p.add(cb.equal(root.get("subject"), f.subject()));
            if (f.topic() != null) p.add(cb.equal(root.get("topic"), f.topic()));
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    /** Kodda geçen metne göre arama (yönetim). */
    public static Specification<Question> codeContains(String text) {
        return (root, query, cb) -> text == null || text.isBlank()
                ? cb.conjunction()
                : cb.like(cb.lower(root.get("code")), "%" + escapeLike(text.trim().toLowerCase()) + "%", '\\');
    }

    /** Sıradaki / önceki soru için id koşulu. */
    public static Specification<Question> idAfter(long id, boolean next) {
        return (root, query, cb) -> next ? cb.greaterThan(root.get("id"), id) : cb.lessThan(root.get("id"), id);
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
