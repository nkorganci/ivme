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
                              int timeLimitMinutes, boolean ready, List<ExamPlanService.SubjectQuota> subjects) {}
    public record ArchiveQuestion(Long id, int year, String subject, int position) {}
    private final JdbcClient jdbc;
    private final SharedQuestionLabels labels;
    private final ExamPlanService plans;

    public ExamArchiveService(JdbcClient jdbc, SharedQuestionLabels labels, ExamPlanService plans) {
        this.jdbc = jdbc; this.labels = labels; this.plans = plans;
    }

    public List<ArchivePlan> list(ExamType exam, ExamTrack track) {
        if (exam == null) throw ApiException.badRequest("TYT veya AYT seçmelisin.");
        var selectedTrack = exam == ExamType.TYT || track == null ? ExamTrack.SAYISAL : track;
        var quotas = plans.fullQuotas(exam, selectedTrack);
        var rows = questions(exam, null);
        var years = jdbc.sql("SELECT DISTINCT exam_year FROM exam_archive_positions WHERE exam_type=:exam ORDER BY exam_year DESC")
                .param("exam", exam.name()).query(Integer.class).list();
        return years.stream().map(year -> {
            var subjects = quotas.stream().map(quota -> new ExamPlanService.SubjectQuota(quota.subject(), quota.target(),
                    rows.stream().filter(q -> q.year() == year && q.subject().equals(quota.subject())).count())).toList();
            return new ArchivePlan(year, exam, selectedTrack, plans.fullQuestionCount(exam, selectedTrack),
                    plans.timeLimitMinutes(exam), subjects.stream().allMatch(q -> q.available() == q.target()), subjects);
        }).toList();
    }

    public List<ArchiveQuestion> select(ExamType exam, ExamTrack track, int year) {
        var plan = list(exam, track).stream().filter(p -> p.year() == year).findFirst()
                .orElseThrow(() -> ApiException.badRequest("Bu yıl için kayıtlı sınav yok."));
        if (!plan.ready()) throw ApiException.badRequest("Bu yılın tam sınavı henüz hazır değil. Arşivde eksik veya inceleme bekleyen sorular var.");
        var required = new HashSet<>(plan.subjects().stream().map(ExamPlanService.SubjectQuota::subject).toList());
        var selected = questions(exam, year).stream().filter(q -> required.contains(q.subject())).toList();
        if (selected.size() != plan.questionCount()) throw ApiException.conflict("Sınav arşivi değişti. Yeniden dene.");
        return selected;
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
                rs.getLong("question_id"),rs.getInt("exam_year"),rs.getString("subject"),rs.getInt("booklet_position"))).list();
    }
}
