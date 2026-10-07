package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.feedback.FeedbackCategory;
import com.hedefyks.feedback.FeedbackRepository;
import com.hedefyks.question.QuestionDtos.CheckResponse;
import com.hedefyks.question.QuestionDtos.Evaluation;
import com.hedefyks.question.QuestionDtos.FilterRow;
import com.hedefyks.question.QuestionDtos.QuestionDetail;
import com.hedefyks.question.QuestionDtos.QuestionListItem;
import java.text.Collator;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class QuestionService {

    private static final Collator TR = Collator.getInstance(Locale.forLanguageTag("tr-TR"));

    private final QuestionRepository questions;
    private final FeedbackRepository feedback;

    public QuestionService(QuestionRepository questions, FeedbackRepository feedback) {
        this.questions = questions;
        this.feedback = feedback;
    }

    public List<FilterRow> filters() {
        return questions.filterRows().stream()
                .sorted(Comparator.comparing(FilterRow::examType)
                        .thenComparing(FilterRow::subject, TR)
                        .thenComparing(FilterRow::topic, Comparator.nullsLast(TR)))
                .toList();
    }

    public PageResponse<QuestionListItem> list(QuestionFilter filter, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("id"));
        return PageResponse.of(questions.findAll(QuestionSpecs.filter(filter, true), pageable), QuestionListItem::of);
    }

    public QuestionDetail detail(Long id, Long userId) {
        return toDetail(findActive(id), userId);
    }

    public QuestionDetail detailByCode(String code, Long userId) {
        return toDetail(questions.findByCode(code).filter(Question::isActive)
                .orElseThrow(() -> ApiException.notFound("Soru bulunamadı.")), userId);
    }

    /** Aynı filtreye göre sıradaki/önceki soru; yoksa boş döner (204). */
    public Optional<QuestionDetail> neighbor(Long id, boolean next, QuestionFilter filter, Long userId) {
        var spec = QuestionSpecs.filter(filter, true).and(QuestionSpecs.idAfter(id, next));
        Sort sort = next ? Sort.by("id").ascending() : Sort.by("id").descending();
        return questions.findBy(spec, q -> q.sortBy(sort).first()).map(q -> toDetail(q, userId));
    }

    public CheckResponse check(Long id, String answer) {
        Question q = findActive(id);
        String a = Answers.normalize(answer, q.getChoiceCount());
        if (a == null) throw ApiException.badRequest("Bir şık seç.");
        return new CheckResponse(a.equals(q.getCorrectAnswer()), q.getCorrectAnswer(), q.getSolutionUrl());
    }

    public Question findActive(Long id) {
        return questions.findById(id).filter(Question::isActive)
                .orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
    }

    private QuestionDetail toDetail(Question q, Long userId) {
        var agg = feedback.ratingAgg(q.getId(), FeedbackCategory.RATING);
        Double avg = agg.avg() == null ? null : Math.round(agg.avg() * 10) / 10.0;
        Map<String, Long> votes = new LinkedHashMap<>();
        for (Difficulty d : Difficulty.values()) votes.put(d.name(), 0L);
        for (Object[] row : feedback.difficultyVotes(q.getId(), FeedbackCategory.RATING)) {
            votes.put(((Difficulty) row[0]).name(), (Long) row[1]);
        }
        Evaluation mine = feedback.findMine(userId, q.getId(), FeedbackCategory.RATING)
                .map(f -> new Evaluation(f.getDifficultyVote(), f.getRating())).orElse(null);
        return new QuestionDetail(q.getId(), q.getCode(), q.getExamType(), q.getSubject(), q.getTopic(),
                q.getYear(), q.getSource(), q.getChoiceCount(), avg, agg.count(), votes, mine);
    }
}
