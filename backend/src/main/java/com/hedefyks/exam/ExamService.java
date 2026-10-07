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
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionRepository;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExamService {

    private final ExamRepository exams;
    private final ExamQuestionRepository examQuestions;
    private final QuestionRepository questions;
    private final JdbcClient jdbc;

    public ExamService(ExamRepository exams, ExamQuestionRepository examQuestions, QuestionRepository questions,
                       JdbcClient jdbc) {
        this.exams = exams;
        this.examQuestions = examQuestions;
        this.questions = questions;
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- oluşturma / devam

    public ExamSession create(Long userId, CreateExamRequest req) {
        QuestionFilter filter = new QuestionFilter(req.examType(), req.subject(), req.topic());
        List<Long> ids = randomIds(filter, req.questionCount());
        if (ids.isEmpty()) {
            throw ApiException.badRequest("Seçtiğin filtrelere uygun soru bulunamadı.");
        }
        Map<Long, Question> byId = new HashMap<>();
        questions.findAllById(ids).forEach(q -> byId.put(q.getId(), q));

        Exam exam = new Exam();
        exam.setUserId(userId);
        exam.setTitle(title(filter));
        exam.setExamType(filter.examType());
        exam.setSubject(filter.subject());
        exam.setQuestionCount(ids.size());
        exam.setTimeLimitMinutes(req.timeLimitMinutes() == null || req.timeLimitMinutes() <= 0 ? null : req.timeLimitMinutes());
        exams.save(exam);

        List<ExamQuestion> rows = new ArrayList<>();
        int pos = 1;
        for (Long id : ids) {
            Question q = byId.get(id);
            ExamQuestion eq = new ExamQuestion();
            eq.setExamId(exam.getId());
            eq.setQuestion(q);
            eq.setPosition(pos++);
            eq.setQuestionCode(q.getCode());
            eq.setSubject(q.getSubject());
            eq.setTopic(q.getTopic());
            rows.add(eq);
        }
        examQuestions.saveAll(rows);
        return toSession(exam, rows);
    }

    @Transactional(readOnly = true)
    public ExamSession session(Long userId, Long examId) {
        Exam exam = own(userId, examId);
        if (exam.getStatus() == ExamStatus.SUBMITTED) {
            return toSession(exam, List.of());
        }
        return toSession(exam, examQuestions.findAllByExam(examId));
    }

    public void saveAnswer(Long userId, Long examId, Long questionId, String answer) {
        Exam exam = own(userId, examId);
        if (exam.getStatus() != ExamStatus.IN_PROGRESS) {
            throw ApiException.conflict("Bu sınav zaten gönderildi.");
        }
        ExamQuestion eq = examQuestions.findByExamIdAndQuestionId(examId, questionId)
                .orElseThrow(() -> ApiException.notFound("Bu soru sınavında yok."));
        eq.setSelectedAnswer(Answers.normalize(answer, eq.getQuestion().getChoiceCount()));
    }

    // ---------------------------------------------------------------- gönderme

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
        return PageResponse.of(exams.findByUserIdAndStatusOrderBySubmittedAtDesc(userId, ExamStatus.SUBMITTED, pageable),
                this::toHistory);
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
        return f.topic() != null ? base + " – " + f.topic() : base;
    }

    /** Filtreye uyan aktif sorulardan rastgele n tanesinin kimliği (sıra da rastgele). */
    private List<Long> randomIds(QuestionFilter f, int n) {
        StringBuilder sql = new StringBuilder("select id from questions where active = true");
        Map<String, Object> params = new HashMap<>();
        if (f.examType() != null) { sql.append(" and exam_type = :examType"); params.put("examType", f.examType().name()); }
        if (f.subject() != null) { sql.append(" and subject = :subject"); params.put("subject", f.subject()); }
        if (f.topic() != null) { sql.append(" and topic = :topic"); params.put("topic", f.topic()); }
        sql.append(" order by random() limit :n");
        params.put("n", n);
        return jdbc.sql(sql.toString()).params(params).query(Long.class).list();
    }

    private static Long remaining(Exam e) {
        if (e.getTimeLimitMinutes() == null) return null;
        long elapsed = Duration.between(e.getStartedAt(), Instant.now()).getSeconds();
        return Math.max(0, e.getTimeLimitMinutes() * 60L - elapsed);
    }

    private ExamSession toSession(Exam e, List<ExamQuestion> rows) {
        boolean open = e.getStatus() == ExamStatus.IN_PROGRESS;
        List<SessionQuestion> qs = rows.stream()
                .map(r -> new SessionQuestion(r.getQuestion().getId(), r.getPosition(), r.getQuestionCode(),
                        r.getSubject(), r.getTopic(), r.getQuestion().getChoiceCount(), r.getSelectedAnswer()))
                .toList();
        return new ExamSession(e.getId(), e.getTitle(), e.getStatus(), e.getQuestionCount(), e.getTimeLimitMinutes(),
                e.getStartedAt(), open ? remaining(e) : null, qs);
    }

    private HistoryItem toHistory(Exam e) {
        return new HistoryItem(e.getId(), e.getTitle(), e.getQuestionCount(), e.getCorrectCount(), e.getWrongCount(),
                e.getBlankCount(), e.getPercent(), e.getNet(), e.getDurationSeconds(), e.getSubmittedAt());
    }

    private ExamResult toResult(Exam e, List<ExamQuestion> rows) {
        Map<String, int[]> subjects = new LinkedHashMap<>();          // [toplam, doğru, yanlış, boş]
        List<ResultQuestion> qs = new ArrayList<>();
        for (ExamQuestion r : rows) {
            String status = r.getSelectedAnswer() == null ? "BLANK" : Boolean.TRUE.equals(r.getCorrect()) ? "CORRECT" : "WRONG";
            qs.add(new ResultQuestion(r.getPosition(), r.getQuestion().getId(), r.getQuestionCode(), r.getSubject(),
                    r.getTopic(), r.getSelectedAnswer(), r.getCorrectAnswer(), status));
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
