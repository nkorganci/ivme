package com.hedefyks.question;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class QuestionSpecs {

    private QuestionSpecs() {}

    public static Specification<Question> filter(QuestionFilter f, Boolean active) {
        return filter(f,active,null);
    }
    public static Specification<Question> filter(QuestionFilter f, Boolean active, List<Long> catalogSelection) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (active != null) p.add(cb.equal(root.get("active"), active));
            if (f.bank() != null) p.add(cb.equal(root.get("bank"), f.bank()));
            if(catalogSelection!=null) {
                var allowed=cb.<Long>in(root.get("id"));
                // Numeric literals avoid one JDBC parameter per question; a broad
                // category can contain more rows than a prepared statement permits.
                catalogSelection.forEach(id->allowed.value(cb.literal(id)));
                p.add(catalogSelection.isEmpty()?cb.disjunction():allowed);
            }
            else {
                if (!f.source().isEmpty()) p.add(cb.or(f.source().stream().map(source -> cb.and(
                        cb.equal(root.get("bank"), source.bank()), cb.equal(root.get("examType"), source.examType())))
                        .toArray(Predicate[]::new)));
                if (f.examType() != null) p.add(cb.equal(root.get("examType"), f.examType()));
                if (f.subject() != null) p.add(cb.equal(root.get("subject"), f.subject()));
                if (f.topic() != null) p.add(cb.equal(root.get("topic"), f.topic()));
            }
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
