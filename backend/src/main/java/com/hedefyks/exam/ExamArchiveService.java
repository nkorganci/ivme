package com.hedefyks.exam;

import com.hedefyks.common.ApiException;
import com.hedefyks.question.*;
import com.hedefyks.review.SharedQuestionLabels;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Original booklet identities are independent of mutable curriculum labels. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ExamArchiveService {
    public record ArchivePlan(int year, ExamType examType, ExamTrack track, int questionCount,
                              int timeLimitMinutes, boolean ready, int estimatedQuestionCount,
                              List<ExamPlanService.SubjectQuota> subjects) {}
    public record ArchiveQuestion(Long id, int year, String subject, int position, boolean provisional) {}
    private final JdbcClient jdbc;
    private final SharedQuestionLabels labels;
    private final ExamPlanService plans;
    private final QuestionAvailabilityService availability;

    public ExamArchiveService(JdbcClient jdbc, SharedQuestionLabels labels, ExamPlanService plans,
                              QuestionAvailabilityService availability) {
        this.jdbc = jdbc; this.labels = labels; this.plans = plans; this.availability = availability;
    }

    public List<ArchivePlan> list(ExamType exam, ExamTrack track) {
        if (exam == null) throw ApiException.badRequest("TYT veya AYT seçmelisin.");
        var selectedTrack = exam == ExamType.TYT || track == null ? ExamTrack.SAYISAL : track;
        var quotas = plans.fullQuotas(exam, selectedTrack);
        var rows = questions(exam, null);
        var replacements = replacements(exam, quotas);
        var years = jdbc.sql("SELECT DISTINCT exam_year FROM exam_archive_positions WHERE exam_type=:exam ORDER BY exam_year DESC")
                .param("exam", exam.name()).query(Integer.class).list();
        return years.stream().map(year -> {
            var subjects = quotas.stream().map(quota -> new ExamPlanService.SubjectQuota(quota.subject(), quota.target(),
                    rows.stream().filter(q -> q.year() == year && q.subject().equals(quota.subject())).count())).toList();
            var selected = complete(year, subjects, rows, replacements);
            return new ArchivePlan(year, exam, selectedTrack, plans.fullQuestionCount(exam, selectedTrack),
                    plans.timeLimitMinutes(exam), selected.size() == plans.fullQuestionCount(exam, selectedTrack),
                    subjects.stream().mapToInt(q -> Math.max(0, q.target() - (int) q.available())).sum(), subjects);
        }).toList();
    }

    public List<ArchiveQuestion> select(ExamType exam, ExamTrack track, int year) {
        var plan = list(exam, track).stream().filter(p -> p.year() == year).findFirst()
                .orElseThrow(() -> ApiException.badRequest("Bu yıl için kayıtlı sınav yok."));
        if (!plan.ready()) throw ApiException.badRequest("Eksik soruları tahmini sorularla tamamlamak için aynı sınav ve ders havuzunda yeterli soru yok.");
        var selected = complete(year, plan.subjects(), questions(exam, year), replacements(exam, plan.subjects()));
        if (selected.size() != plan.questionCount()) throw ApiException.conflict("Sınav arşivi değişti. Yeniden dene.");
        return selected;
    }

    private List<QuestionAvailabilityService.SubjectCandidate> replacements(ExamType exam,
            List<ExamPlanService.SubjectQuota> quotas) {
        // Twice the exam size leaves enough candidates after excluding every original ID.
        return availability.archiveReplacementCandidates(exam,
                quotas.stream().map(ExamPlanService.SubjectQuota::subject).toList(),
                2 * quotas.stream().mapToInt(ExamPlanService.SubjectQuota::target).sum());
    }

    private List<ArchiveQuestion> complete(int year, List<ExamPlanService.SubjectQuota> quotas,
            List<ArchiveQuestion> rows, List<QuestionAvailabilityService.SubjectCandidate> replacements) {
        var required = new HashSet<>(quotas.stream().map(ExamPlanService.SubjectQuota::subject).toList());
        var originals = rows.stream().filter(q -> q.year() == year && required.contains(q.subject())).toList();
        var used = new HashSet<>(originals.stream().map(ArchiveQuestion::id).toList());
        var additions = new HashMap<String,List<ArchiveQuestion>>();
        for (var quota : quotas) {
            long present = originals.stream().filter(q -> q.subject().equals(quota.subject())).count();
            if (present > quota.target()) return List.of();
            var added = new ArrayList<ArchiveQuestion>();
            for (var candidate : replacements) {
                if (present + added.size() == quota.target()) break;
                if (candidate.subject().equals(quota.subject()) && used.add(candidate.id()))
                    added.add(new ArchiveQuestion(candidate.id(), year, quota.subject(), 0, true));
            }
            if (present + added.size() != quota.target()) return List.of();
            additions.put(quota.subject(), added);
        }
        // Keep all original questions in booklet order; append supplements at each subject's end.
        var result = new ArrayList<ArchiveQuestion>();
        var pending = new HashSet<>(required);
        for (int i=0; i<originals.size(); i++) {
            var original = originals.get(i);
            result.add(original);
            if (i+1 == originals.size() || !originals.get(i+1).subject().equals(original.subject())) {
                result.addAll(additions.get(original.subject()));
                pending.remove(original.subject());
            }
        }
        // An entirely missing subject still receives its full quota.
        for (var quota : quotas) if (pending.contains(quota.subject())) result.addAll(additions.get(quota.subject()));
        return result;
    }

    private List<ArchiveQuestion> questions(ExamType exam, Integer year) {
        String selection = labels.selection(new QuestionFilter(QuestionBank.CIKMIS, exam, null, null));
        var statement = new StringBuilder(selection == null ? "" : """
            WITH allowed AS MATERIALIZED (SELECT id FROM learning_catalog.question_ids_for_labels(:selection))
            """).append("""
            SELECT q.id AS question_id,a.exam_year,a.subject,a.booklet_position FROM exam_archive_positions a
            JOIN questions q ON q.code=a.question_code WHERE q.active AND q.bank='CIKMIS'
              AND q.exam_type=a.exam_type AND q.exam_year=a.exam_year AND a.exam_type=:exam
            """);
        var params = new HashMap<String,Object>(); params.put("exam", exam.name());
        if (year != null) { statement.append(" AND a.exam_year=:year"); params.put("year",year); }
        if (selection != null) {
            statement.append(" AND q.id IN (SELECT id FROM allowed)");
            params.put("selection",selection);
        }
        statement.append(" ORDER BY a.exam_year DESC,a.booklet_position");
        return jdbc.sql(statement.toString()).params(params).query((rs,n) -> new ArchiveQuestion(
                rs.getLong("question_id"),rs.getInt("exam_year"),rs.getString("subject"),rs.getInt("booklet_position"),false)).list();
    }
}
