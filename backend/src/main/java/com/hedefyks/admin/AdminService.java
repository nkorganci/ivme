package com.hedefyks.admin;

import com.hedefyks.admin.AdminDtos.AdminFeedback;
import com.hedefyks.admin.AdminDtos.AdminQuestion;
import com.hedefyks.admin.AdminDtos.QuestionUpdate;
import com.hedefyks.admin.AdminDtos.ReportedQuestion;
import com.hedefyks.admin.AdminDtos.Stats;
import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.exam.ExamRepository;
import com.hedefyks.exam.ExamStatus;
import com.hedefyks.feedback.Feedback;
import com.hedefyks.feedback.FeedbackCategory;
import com.hedefyks.feedback.FeedbackRepository;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionRepository;
import com.hedefyks.question.QuestionSpecs;
import com.hedefyks.user.Role;
import com.hedefyks.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminService {

    private final UserRepository users;
    private final QuestionRepository questions;
    private final ExamRepository exams;
    private final FeedbackRepository feedback;

    public AdminService(UserRepository users, QuestionRepository questions, ExamRepository exams,
                        FeedbackRepository feedback) {
        this.users = users;
        this.questions = questions;
        this.exams = exams;
        this.feedback = feedback;
    }

    @Transactional(readOnly = true)
    public Stats stats() {
        return new Stats(users.countByRole(Role.USER), exams.countByStatus(ExamStatus.SUBMITTED));
    }

    // ------------------------------------------------------------------ sorular

    @Transactional(readOnly = true)
    public PageResponse<AdminQuestion> questions(String query, QuestionFilter filter, Boolean active, int page, int size) {
        var spec = QuestionSpecs.filter(filter, active).and(QuestionSpecs.codeContains(query));
        var result = questions.findAll(spec, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("id")));
        List<Long> ids = result.getContent().stream().map(Question::getId).toList();
        Map<Long, Long> reports = new HashMap<>();
        Map<Long, Object[]> ratings = new HashMap<>();
        if (!ids.isEmpty()) {
            feedback.openReportCounts(ids, FeedbackCategory.QUESTION_ISSUE).forEach(r -> reports.put((Long) r[0], (Long) r[1]));
            feedback.ratingStats(ids, FeedbackCategory.RATING).forEach(r -> ratings.put((Long) r[0], r));
        }
        return PageResponse.of(result, q -> toAdmin(q, reports.getOrDefault(q.getId(), 0L), ratings.get(q.getId())));
    }

    @Transactional(readOnly = true)
    public AdminQuestion question(Long id) {
        Question q = find(id);
        long reports = feedback.openReportCounts(List.of(id), FeedbackCategory.QUESTION_ISSUE).stream()
                .mapToLong(r -> (Long) r[1]).sum();
        Object[] rating = feedback.ratingStats(List.of(id), FeedbackCategory.RATING).stream().findFirst().orElse(null);
        return toAdmin(q, reports, rating);
    }

    public AdminQuestion update(Long id, QuestionUpdate u) {
        Question q = find(id);
        q.setExamType(u.examType());
        q.setSubject(u.subject().trim());
        q.setTopic(blankToNull(u.topic()));
        q.setYear(u.year());
        q.setSource(blankToNull(u.source()));
        q.setImage(normalizeImage(u.image()));
        String answer = u.correctAnswer().trim().toUpperCase();
        if (answer.charAt(0) - 'A' >= u.choiceCount()) {
            throw ApiException.badRequest("Doğru cevap şık sayısının dışında.");
        }
        q.setCorrectAnswer(answer);
        q.setChoiceCount(u.choiceCount());
        q.setSolutionUrl(blankToNull(u.solutionUrl()));
        q.setActive(u.active());
        q.setUpdatedAt(Instant.now());
        questions.flush();
        return question(id);
    }

    // ------------------------------------------------------------------ geri bildirim

    @Transactional(readOnly = true)
    public PageResponse<AdminFeedback> feedback(FeedbackCategory category, Boolean resolved, int page, int size) {
        Specification<Feedback> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (category != null) p.add(cb.equal(root.get("category"), category));
            if (resolved != null) p.add(cb.equal(root.get("resolved"), resolved));
            if (!Long.class.equals(query.getResultType())) {      // sayım sorgusunda sıralama yok
                query.orderBy(cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        var result = feedback.findAll(spec, PageResponse.pageable(page, size));
        return PageResponse.of(result, this::toAdmin);
    }

    public AdminFeedback resolve(Long id, boolean resolved, Long adminId) {
        Feedback f = feedback.findById(id).orElseThrow(() -> ApiException.notFound("Geri bildirim bulunamadı."));
        f.setResolved(resolved);
        f.setResolvedAt(resolved ? Instant.now() : null);
        f.setResolvedBy(resolved ? adminId : null);
        f.setUpdatedAt(Instant.now());
        feedback.flush();
        return toAdmin(feedback.findById(id).orElseThrow());
    }

    @Transactional(readOnly = true)
    public List<ReportedQuestion> reportedQuestions() {
        return feedback.reportedQuestions(FeedbackCategory.QUESTION_ISSUE).stream()
                .map(r -> new ReportedQuestion(r.questionId(), r.code(), r.subject(), r.topic(), r.reportCount(), r.lastReportAt()))
                .toList();
    }

    // ------------------------------------------------------------------ yardımcılar

    private Question find(Long id) {
        return questions.findById(id).orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
    }

    private AdminQuestion toAdmin(Question q, long openReports, Object[] rating) {
        Double avg = rating == null || rating[1] == null ? null : Math.round(((Double) rating[1]) * 10) / 10.0;
        long count = rating == null ? 0 : (Long) rating[2];
        return new AdminQuestion(q.getId(), q.getCode(), q.getExamType(), q.getSubject(), q.getTopic(),
                q.getYear(), q.getSource(), q.getImage(), q.getCorrectAnswer(), q.getChoiceCount(), q.getSolutionUrl(),
                q.isActive(), openReports, avg, count, q.getUpdatedAt());
    }

    private AdminFeedback toAdmin(Feedback f) {
        return new AdminFeedback(f.getId(), f.getCategory(), f.getUser().getUsername(),
                f.getQuestion() == null ? null : f.getQuestion().getId(),
                f.getQuestion() == null ? null : f.getQuestion().getCode(),
                f.getDifficultyVote(), f.getRating(), f.getMessage(), f.isResolved(), f.getResolvedAt(), f.getCreatedAt());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String normalizeImage(String image) {
        String p = image.trim().replace('\\', '/');
        while (p.startsWith("/")) p = p.substring(1);
        if (p.contains("..") || p.matches("^[A-Za-z]:.*")) {
            throw ApiException.badRequest("Görsel yolu klasör dışına çıkamaz; kök klasöre göre göreli olmalı.");
        }
        return p;
    }
}
