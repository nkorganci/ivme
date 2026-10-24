package com.hedefyks.exam;

import com.hedefyks.common.ApiException;
import com.hedefyks.examtrack.ExamTrackService;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.ExamTopicBalancer;
import com.hedefyks.question.QuestionAvailabilityService;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionSelectionMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** ÖSYM testlerinin ders ağırlıklarını seçilen soru sayısına orantılı uygular. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ExamPlanService {
    public record SubjectQuota(String subject, int target, long available) {}
    public record Plan(QuestionBank bank, ExamType examType, ExamTrack track,
                       QuestionSelectionMode selectionMode, int questionCount,
                       boolean ready, List<SubjectQuota> subjects, int timeLimitMinutes) {}
    public record SelectedQuestion(Long id, String subject) {}
    private record Weight(String subject, int count) {}

    private static final List<Weight> TYT = List.of(
            new Weight("Türkçe", 40), new Weight("Tarih", 5), new Weight("Coğrafya", 5),
            new Weight("Felsefe", 5), new Weight("Din Kültürü", 5),
            new Weight("Matematik", 40),
            new Weight("Fizik", 7), new Weight("Kimya", 7), new Weight("Biyoloji", 6));
    private static final List<Weight> AYT_SAYISAL = List.of(
            new Weight("Matematik", 40), new Weight("Fizik", 14),
            new Weight("Kimya", 13), new Weight("Biyoloji", 13));
    private static final List<Weight> AYT_ESIT_AGIRLIK = List.of(
            new Weight("Matematik", 40), new Weight("Türk Dili ve Edebiyatı", 24),
            new Weight("Tarih-1", 10), new Weight("Coğrafya-1", 6));
    private static final List<Weight> AYT_SOZEL = List.of(
            new Weight("Türk Dili ve Edebiyatı", 24), new Weight("Tarih-1", 10),
            new Weight("Coğrafya-1", 6), new Weight("Tarih-2", 11),
            new Weight("Coğrafya-2", 11), new Weight("Felsefe Grubu", 12),
            new Weight("Din Kültürü", 6));

    private final QuestionAvailabilityService availability;
    private final ExamTrackService tracks;

    public ExamPlanService(QuestionAvailabilityService availability, ExamTrackService tracks) {
        this.availability = availability;
        this.tracks = tracks;
    }

    public Plan fullPlan(Long userId, QuestionBank bank, ExamType examType, ExamTrack track, boolean includeSolved) {
        ExamTrack selectedTrack = track == null || examType != ExamType.AYT ? ExamTrack.SAYISAL : track;
        return plan(userId, bank, examType, selectedTrack,
                includeSolved ? QuestionSelectionMode.MIXED : QuestionSelectionMode.NEW,
                fullQuestionCount(examType, selectedTrack));
    }

    public int fullQuestionCount(ExamType examType, ExamTrack track) {
        if (examType == null) throw ApiException.badRequest("TYT veya AYT seçmelisin.");
        return weights(examType, track == null ? ExamTrack.SAYISAL : track).stream().mapToInt(Weight::count).sum();
    }

    public int timeLimitMinutes(ExamType examType) {
        // KPSS testlerinin süresi sınav tanımındadır (ör. Ortaöğretim GY ve GK: 65'er dakika).
        if (examType != null && examType.kpss()) return tracks.section(examType).minutes();
        return examType == ExamType.TYT ? 165 : 180;
    }

    public List<SubjectQuota> fullQuotas(ExamType examType, ExamTrack track) {
        return weights(examType, track == null ? ExamTrack.SAYISAL : track).stream()
                .map(w -> new SubjectQuota(w.subject(), w.count(), 0)).toList();
    }

    public Plan plan(Long userId, QuestionBank bank, ExamType examType, ExamTrack track,
                     QuestionSelectionMode mode, int questionCount) {
        if (examType == null || track == null || questionCount < 1 || questionCount > 120) {
            throw ApiException.badRequest("Dengeli deneme için sınav, alan ve 1–120 arası soru sayısı seç.");
        }
        var weights = weights(examType, track);
        if (questionCount < weights.size()) {
            throw ApiException.badRequest("Bu dengeli deneme için en az " + weights.size() + " soru seç.");
        }
        var targets = allocate(weights, questionCount);
        var selection = mode == null ? QuestionSelectionMode.MIXED : mode;
        var counts = availability.countBySubject(userId, bank, examType, selection,
                weights.stream().map(Weight::subject).toList());
        List<SubjectQuota> subjects = new ArrayList<>();
        boolean ready = true;
        for (int i = 0; i < weights.size(); i++) {
            if (targets[i] == 0) continue;
            String subject = weights.get(i).subject();
            long available = counts.getOrDefault(subject, 0L);
            subjects.add(new SubjectQuota(subject, targets[i], available));
            if (available < targets[i]) ready = false;
        }
        return new Plan(bank, examType, track, selection, questionCount, ready, List.copyOf(subjects), timeLimitMinutes(examType));
    }

    public List<Long> select(Long userId, QuestionBank bank, QuestionSelectionMode mode, Plan plan) {
        return selectQuestions(userId, plan).stream().map(SelectedQuestion::id).toList();
    }

    public List<SelectedQuestion> selectQuestions(Long userId, Plan plan) {
        if (!plan.ready()) {
            var shortage = plan.subjects().stream().filter(row -> row.available() < row.target()).findFirst().orElseThrow();
            throw ApiException.badRequest(shortage.subject() + " için " + shortage.target()
                    + " soru gerekiyor; uygun havuzda " + shortage.available() + " soru var.");
        }
        List<SelectedQuestion> result = new ArrayList<>();
        var ids = new java.util.HashSet<Long>();
        var candidates = availability.balancedSubjectCandidates(userId, plan.bank(), plan.examType(),
                plan.selectionMode(), plan.subjects().stream().map(SubjectQuota::subject).toList(), plan.questionCount());
        for (var row : plan.subjects()) {
            var selected = ExamTopicBalancer.select(candidates.stream()
                    .filter(candidate -> candidate.subject().equals(row.subject())).toList(), row.target(), ids);
            if (selected.size() != row.target()) throw ApiException.conflict("Soru havuzu değişti. Yeniden dene.");
            ids.addAll(selected);
            selected.forEach(id -> result.add(new SelectedQuestion(id, row.subject())));
        }
        return result;
    }

    private List<Weight> weights(ExamType examType, ExamTrack track) {
        if (examType == ExamType.TYT) return TYT; // TYT tüm puan türlerinde ortak testtir.
        // KPSS ders dağılımı ÖSYM kılavuzundan exam_tracks.sections içine kaydedilmiştir.
        if (examType.kpss()) return tracks.section(examType).subjects().stream()
                .map(s -> new Weight(s.name(), s.questions())).toList();
        return switch (track) {
            case SAYISAL -> AYT_SAYISAL;
            case ESIT_AGIRLIK -> AYT_ESIT_AGIRLIK;
            case SOZEL -> AYT_SOZEL;
        };
    }

    /** En büyük kalan yöntemi: toplam tam olarak istenen sayı, eşitlikte kitapçık sırası. */
    private static int[] allocate(List<Weight> weights, int count) {
        int total = weights.stream().mapToInt(Weight::count).sum();
        int[] targets = new int[weights.size()];
        int assigned = 0;
        for (int i = 0; i < weights.size(); i++) {
            targets[i] = count * weights.get(i).count() / total;
            assigned += targets[i];
        }
        var byRemainder = java.util.stream.IntStream.range(0, weights.size()).boxed()
                .sorted(Comparator.<Integer>comparingInt(i -> count * weights.get(i).count() % total)
                        .reversed().thenComparingInt(i -> i)).toList();
        for (int i = 0; i < count - assigned; i++) targets[byRemainder.get(i)]++;
        // Kısa denemede her branş en az bir soru alır; toplam sayı değişmez.
        for (int i = 0; i < targets.length; i++) {
            if (targets[i] > 0) continue;
            int donor = java.util.stream.IntStream.range(0, targets.length)
                    .filter(j -> targets[j] > 1).boxed()
                    .max(Comparator.<Integer>comparingInt(j -> targets[j]).thenComparingInt(j -> -j))
                    .orElseThrow();
            targets[donor]--;
            targets[i]++;
        }
        return targets;
    }
}
