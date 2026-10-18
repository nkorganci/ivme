package com.hedefyks.exam;

import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.exam.ExamDtos.ActiveExam;
import com.hedefyks.exam.ExamDtos.CreateExamRequest;
import com.hedefyks.exam.ExamDtos.ExamResult;
import com.hedefyks.exam.ExamDtos.ExamSession;
import com.hedefyks.exam.ExamDtos.HistoryItem;
import com.hedefyks.exam.ExamDtos.ResultQuestion;
import com.hedefyks.exam.ExamDtos.SessionQuestion;
import com.hedefyks.exam.ExamDtos.SubjectStat;
import com.hedefyks.exam.ExamDtos.Summary;
import com.hedefyks.question.Answers;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionAvailabilityService;
import com.hedefyks.question.QuestionRepository;
import com.hedefyks.question.QuestionSelectionMode;
import com.hedefyks.question.HintService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExamService {

    private final ExamRepository exams;
    private final ExamQuestionRepository examQuestions;
    private final QuestionRepository questions;
    private final QuestionAvailabilityService availability;
    private final HintService hints;
    private final ExamPlanService plans;
    private final com.hedefyks.review.SharedQuestionLabels sharedLabels;
    private final com.hedefyks.question.QuestionTaxonomyService taxonomy;

    public ExamService(ExamRepository exams, ExamQuestionRepository examQuestions, QuestionRepository questions,
                       QuestionAvailabilityService availability, HintService hints, ExamPlanService plans, com.hedefyks.review.SharedQuestionLabels sharedLabels,
                       com.hedefyks.question.QuestionTaxonomyService taxonomy) {
        this.exams = exams;
        this.examQuestions = examQuestions;
        this.questions = questions;
        this.availability = availability;
        this.hints = hints;
        this.plans = plans;
        this.sharedLabels=sharedLabels;
        this.taxonomy=taxonomy;
    }

    // ---------------------------------------------------------------- oluşturma / devam

    public ExamSession createFull(Long userId, ExamDtos.FullExamRequest req) {
        ExamTrack track = req.track() == null || req.examType() == ExamType.TYT ? ExamTrack.SAYISAL : req.track();
        return create(userId, new CreateExamRequest(req.bank(), req.examType(), null, null,
                plans.fullQuestionCount(req.examType(), track), req.selectionMode(),
                plans.timeLimitMinutes(req.examType()), null, track));
    }

    public ExamSession create(Long userId, CreateExamRequest req) {
        QuestionFilter filter = availability.effectiveFilter(
                new QuestionFilter(req.bank(), req.examType(), req.subject(), req.topic(),req.categoryId(),req.categoryMatch(),req.includeCandidates(),req.questionTypeId(),req.teacherDifficulty()), req.topicPdfId());
        QuestionSelectionMode selection = req.selectionMode() == null ? QuestionSelectionMode.MIXED : req.selectionMode();
        boolean balanced = req.track() != null && req.topicPdfId() == null
                && filter.subject() == null && filter.topic() == null && !filter.hasSharedSelection();
        if (req.track() != null && !balanced) {
            throw ApiException.badRequest("Alan seçimi yalnız genel denemede kullanılabilir.");
        }
        if (!balanced) {
            var counts = availability.count(userId, filter, req.topicPdfId());
            long candidates = switch (selection) {
                case NEW -> counts.remaining();
                case REPEAT -> counts.solved();
                case WRONG -> counts.everWrong();
                case MIXED -> counts.total();
            };
            if (candidates < req.questionCount()) {
                throw ApiException.badRequest("Bu seçimde yalnızca " + candidates + " soru var. Soru sayısını azalt veya seçimi değiştir.");
            }
        }
        List<Long> ids;
        Map<Long, String> selectedSubjects = new HashMap<>();
        if (balanced) {
            var plan = plans.plan(userId, filter.bank(), filter.examType(), req.track(), selection, req.questionCount());
            var selected = plans.selectQuestions(userId, plan);
            selected.forEach(q -> selectedSubjects.put(q.id(), q.subject()));
            ids = selected.stream().map(ExamPlanService.SelectedQuestion::id).toList();
        } else {
            ids = availability.randomIds(userId, filter, selection, req.questionCount(), req.topicPdfId());
        }
        if (ids.size() != req.questionCount()) throw ApiException.conflict("Soru havuzu değişti. Yeniden dene.");
        Map<Long, Question> byId = new HashMap<>();
        questions.findAllById(ids).forEach(q -> byId.put(q.getId(), q));

        Exam exam = new Exam();
        exam.setUserId(userId);
        exam.setSelectionMode(selection);
        exam.setTitle(balanced ? filter.examType() + (filter.examType() == ExamType.AYT
                ? " " + switch (req.track()) {
                    case SAYISAL -> "Sayısal";
                    case SOZEL -> "Sözel";
                    case ESIT_AGIRLIK -> "Eşit Ağırlık";
                } : "") + " denemesi" : title(filter));
        exam.setExamType(filter.examType());
        exam.setSubject(filter.subject());
        exam.setQuestionCount(ids.size());
        exam.setTimeLimitMinutes(req.timeLimitMinutes() == null || req.timeLimitMinutes() <= 0 ? null : req.timeLimitMinutes());
        exams.save(exam);

        List<ExamQuestion> rows = new ArrayList<>();
        var snapshots=sharedLabels.snapshots(ids);
        var topics=sharedLabels.topicNames(snapshots);
        int pos = 1;
        for (Long id : ids) {
            Question q = byId.get(id);
            ExamQuestion eq = new ExamQuestion();
            eq.setExamId(exam.getId());
            eq.setQuestion(q);
            eq.setPosition(pos++);
            eq.setQuestionCode(q.getCode());
            eq.setSubject(selectedSubjects.getOrDefault(id, q.getSubject()));
            eq.setTopic(topics.getOrDefault(id,q.getTopic()));
            eq.setLearningLabelSnapshot(snapshots.get(id));
            rows.add(eq);
        }
        examQuestions.saveAllAndFlush(rows);
        taxonomy.snapshotExam(exam.getId());
        return toSession(exam, rows);
    }

    @Transactional(readOnly = true)
    public ExamSession session(Long userId, Long examId) {
        Exam exam = own(userId, examId);
        if (exam.getStatus() == ExamStatus.CANCELLED) throw ApiException.conflict("Bu deneme iptal edildi.");
        if (exam.getStatus() == ExamStatus.SUBMITTED) {
            return toSession(exam, List.of());
        }
        return toSession(exam, examQuestions.findAllByExam(examId));
    }

    public void saveAnswer(Long userId, Long examId, Long questionId, String answer) {
        Exam exam = exams.lockByIdAndUserId(examId, userId)
                .orElseThrow(() -> ApiException.notFound("Sınav bulunamadı."));
        if (exam.getStatus() != ExamStatus.IN_PROGRESS) {
            throw ApiException.conflict("Bu sınav sona erdi.");
        }
        ExamQuestion eq = examQuestions.findByExamIdAndQuestionId(examId, questionId)
                .orElseThrow(() -> ApiException.notFound("Bu soru sınavında yok."));
        eq.setSelectedAnswer(Answers.normalize(answer, eq.getQuestion().getChoiceCount()));
    }

    // ---------------------------------------------------------------- gönderme

    public void cancel(Long userId, Long examId) {
        Exam exam = exams.lockByIdAndUserId(examId, userId)
                .orElseThrow(() -> ApiException.notFound("Sınav bulunamadı."));
        if (exam.getStatus() == ExamStatus.CANCELLED) return;
        if (exam.getStatus() != ExamStatus.IN_PROGRESS) throw ApiException.conflict("Tamamlanmış deneme iptal edilemez.");
        exam.setStatus(ExamStatus.CANCELLED);
    }

    /**
     * Sınavı bitirir ve notlandırır. O anki doğru cevap exam_questions.correct_answer'a kopyalanır;
     * D/Y/B, yüzde, net ve süre exams satırına yazılır. Sonradan soru cevabı değişse de bunlar değişmez.
     * İkinci çağrıda aynı sonuç döner (satır kilidiyle çifte gönderim engellenir).
     */
    public ExamResult submit(Long userId, Long examId, Map<String, String> answers) {
        Exam exam = exams.lockByIdAndUserId(examId, userId)
                .orElseThrow(() -> ApiException.notFound("Sınav bulunamadı."));
        List<ExamQuestion> rows = examQuestions.findAllByExam(examId);
        if (exam.getStatus() == ExamStatus.SUBMITTED) {
            return toResult(exam, rows);
        }
        if (exam.getStatus() == ExamStatus.CANCELLED) throw ApiException.conflict("Bu deneme iptal edildi.");

        if (answers != null) {
            Map<Long, ExamQuestion> byQuestionId = new HashMap<>();
            rows.forEach(r -> byQuestionId.put(r.getQuestion().getId(), r));
            for (var entry : answers.entrySet()) {
                Long questionId = parseId(entry.getKey());
                ExamQuestion eq = byQuestionId.get(questionId);
                if (eq == null) {
                    throw ApiException.badRequest("Bu soru sınavında yok: " + entry.getKey());
                }
                eq.setSelectedAnswer(Answers.normalize(entry.getValue(), eq.getQuestion().getChoiceCount()));
            }
        }

        int correct = 0, wrong = 0, blank = 0;
        for (ExamQuestion eq : rows) {
            String right = eq.getQuestion().getCorrectAnswer();
            eq.setCorrectAnswer(right);                          // geçmiş için kopya
            if (eq.getSelectedAnswer() == null) {
                eq.setCorrect(null);
                blank++;
            } else if (eq.getSelectedAnswer().equals(right)) {
                eq.setCorrect(true);
                correct++;
            } else {
                eq.setCorrect(false);
                wrong++;
            }
        }

        Instant now = Instant.now();
        long seconds = Math.max(0, Duration.between(exam.getStartedAt(), now).getSeconds());
        if (exam.getTimeLimitMinutes() != null) {
            seconds = Math.min(seconds, exam.getTimeLimitMinutes() * 60L);   // süre sınırını aşamaz
        }
        int total = rows.size();
        exam.setStatus(ExamStatus.SUBMITTED);
        exam.setSubmittedAt(now);
        exam.setDurationSeconds((int) seconds);
        exam.setCorrectCount(correct);
        exam.setWrongCount(wrong);
        exam.setBlankCount(blank);
        exam.setPercent(total == 0 ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(correct).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP));
        exam.setNet(BigDecimal.valueOf(correct)
                .subtract(BigDecimal.valueOf(wrong).divide(BigDecimal.valueOf(4), 2, RoundingMode.HALF_UP))
                .setScale(2, RoundingMode.HALF_UP));
        return toResult(exam, rows);
    }

    @Transactional(readOnly = true)
    public ExamResult result(Long userId, Long examId) {
        Exam exam = own(userId, examId);
        if (exam.getStatus() != ExamStatus.SUBMITTED) {
            throw ApiException.conflict("Sınav henüz gönderilmedi.");
        }
        return toResult(exam, examQuestions.findAllByExam(examId));
    }

    // ---------------------------------------------------------------- geçmiş / özet

    @Transactional(readOnly = true)
    public PageResponse<HistoryItem> history(Long userId, int page, int size) {
        var pageable = PageResponse.pageable(page, size);
        var results = exams.findByUserIdAndStatusOrderBySubmittedAtDesc(userId, ExamStatus.SUBMITTED, pageable);
        var subjects = historySubjects(results.stream().map(Exam::getId).toList());
        return PageResponse.of(results, exam -> toHistory(exam, subjects.getOrDefault(exam.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public Summary summary(Long userId) {
        var agg = exams.aggregate(userId, ExamStatus.SUBMITTED);
        Double avg = agg.avgPercent() == null ? null : Math.round(agg.avgPercent() * 10) / 10.0;
        HistoryItem last = exams.findByUserIdAndStatusOrderBySubmittedAtDesc(userId, ExamStatus.SUBMITTED, PageRequest.of(0, 1))
                .stream().findFirst().map(this::toHistory).orElse(null);
        ActiveExam active = exams.findFirstByUserIdAndStatusOrderByStartedAtDesc(userId, ExamStatus.IN_PROGRESS)
                .map(e -> new ActiveExam(e.getId(), e.getTitle(), e.getQuestionCount(), remaining(e))).orElse(null);
        return new Summary(agg.examCount(), avg, agg.correct(), agg.wrong(), agg.blank(), last, active);
    }

    // ---------------------------------------------------------------- yardımcılar

    private Exam own(Long userId, Long examId) {
        return exams.findByIdAndUserId(examId, userId).orElseThrow(() -> ApiException.notFound("Sınav bulunamadı."));
    }

    private static Long parseId(String s) {
        try {
            return Long.valueOf(s.trim());
        } catch (RuntimeException e) {
            throw ApiException.badRequest("Geçersiz soru kimliği: " + s);
        }
    }

    private static String title(QuestionFilter f) {
        String base = (f.examType() != null ? f.examType().name() + " " : "") + (f.subject() != null ? f.subject() : "Karma");
        if (f.topic() != null) base = base + " – " + f.topic();
        if (f.bank() != null) base = base + " · " + (f.bank() == QuestionBank.OGM ? "Soru Bankası" : "Çıkmış Sorular");
        return base;
    }

    private static Long remaining(Exam e) {
        if (e.getTimeLimitMinutes() == null) return null;
        long elapsed = Duration.between(e.getStartedAt(), Instant.now()).getSeconds();
        return Math.max(0, e.getTimeLimitMinutes() * 60L - elapsed);
    }

    private ExamSession toSession(Exam e, List<ExamQuestion> rows) {
        boolean open = e.getStatus() == ExamStatus.IN_PROGRESS;
        var topics=sharedLabels.topicNames(sharedLabels.snapshots(rows.stream().map(r->r.getQuestion().getId()).toList()));
        List<SessionQuestion> qs = rows.stream()
                .map(r -> new SessionQuestion(r.getQuestion().getId(), r.getPosition(), r.getQuestionCode(),
                        r.getSubject(), topics.getOrDefault(r.getQuestion().getId(),r.getTopic()), r.getQuestion().getChoiceCount(), r.getSelectedAnswer()))
                .toList();
        return new ExamSession(e.getId(), e.getTitle(), e.getStatus(), e.getSelectionMode(),
                e.getQuestionCount(), e.getTimeLimitMinutes(),
                e.getStartedAt(), open ? remaining(e) : null, qs);
    }

    private HistoryItem toHistory(Exam e) {
        return toHistory(e, historySubjects(List.of(e.getId())).getOrDefault(e.getId(), List.of()));
    }

    private Map<Long, List<SubjectStat>> historySubjects(List<Long> examIds) {
        Map<Long, List<SubjectStat>> subjects = new HashMap<>();
        if (examIds.isEmpty()) return subjects;
        for (var row : examQuestions.summarizeSubjects(examIds)) {
            subjects.computeIfAbsent(row.examId(), key -> new ArrayList<>()).add(new SubjectStat(
                    row.subject(), Math.toIntExact(row.total()), Math.toIntExact(row.correct()),
                    Math.toIntExact(row.wrong()), Math.toIntExact(row.blank())));
        }
        return subjects;
    }

    private HistoryItem toHistory(Exam e, List<SubjectStat> subjects) {
        return new HistoryItem(e.getId(), e.getTitle(), e.getQuestionCount(), e.getCorrectCount(), e.getWrongCount(),
                e.getBlankCount(), e.getPercent(), e.getNet(), e.getDurationSeconds(), e.getSubmittedAt(),
                e.getExamType(), subjects);
    }

    private ExamResult toResult(Exam e, List<ExamQuestion> rows) {
        var topics=sharedLabels.topicNames(sharedLabels.snapshots(rows.stream().map(r->r.getQuestion().getId()).toList()));
        Map<String, int[]> subjects = new LinkedHashMap<>();          // [toplam, doğru, yanlış, boş]
        List<ResultQuestion> qs = new ArrayList<>();
        for (ExamQuestion r : rows) {
            String status = r.getSelectedAnswer() == null ? "BLANK" : Boolean.TRUE.equals(r.getCorrect()) ? "CORRECT" : "WRONG";
            qs.add(new ResultQuestion(r.getPosition(), r.getQuestion().getId(), r.getQuestionCode(), r.getSubject(),
                    topics.getOrDefault(r.getQuestion().getId(),r.getTopic()), r.getSelectedAnswer(), r.getCorrectAnswer(), status,
                    hints.available(r.getQuestion().getId())));
            int[] s = subjects.computeIfAbsent(r.getSubject(), k -> new int[4]);
            s[0]++;
            s[switch (status) { case "CORRECT" -> 1; case "WRONG" -> 2; default -> 3; }]++;
        }
        List<SubjectStat> bySubject = subjects.entrySet().stream()
                .map(en -> new SubjectStat(en.getKey(), en.getValue()[0], en.getValue()[1], en.getValue()[2], en.getValue()[3]))
                .toList();
        return new ExamResult(e.getId(), e.getTitle(), e.getQuestionCount(), e.getCorrectCount(), e.getWrongCount(),
                e.getBlankCount(), e.getPercent(), e.getNet(), e.getDurationSeconds(), e.getSubmittedAt(),
                e.getExamType(), e.getSubject(), e.getStartedAt(), bySubject, qs);
    }
}
