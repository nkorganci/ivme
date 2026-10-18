package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.feedback.FeedbackCategory;
import com.hedefyks.feedback.FeedbackRepository;
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
import java.util.Objects;
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
    private final QuestionTaxonomyService taxonomy;
    private final QuestionHelpfulnessService helpfulness;
    private final HintService hints;
    private final com.hedefyks.review.SharedQuestionLabels sharedLabels;
    private final com.hedefyks.review.LearningResourceService resources;

    public QuestionService(QuestionRepository questions, FeedbackRepository feedback,
                           QuestionTaxonomyService taxonomy, QuestionHelpfulnessService helpfulness,
                           HintService hints, com.hedefyks.review.SharedQuestionLabels sharedLabels,com.hedefyks.review.LearningResourceService resources) {
        this.questions = questions;
        this.feedback = feedback;
        this.taxonomy = taxonomy;
        this.helpfulness = helpfulness;
        this.hints = hints;
        this.sharedLabels=sharedLabels;
        this.resources=resources;
    }

    public List<FilterRow> filters(QuestionBank bank) {
        return filters(bank,List.of());
    }

    public List<FilterRow> filters(QuestionBank bank,List<QuestionSource> source) {
        var current=sharedLabels.filterRows(bank,source);
        var fallback=current!=null?current:source.isEmpty()?(bank == null ? questions.filterRows() : questions.filterRowsByBank(bank))
                :source.stream().distinct().filter(s->bank==null || s.bank()==bank)
                    .flatMap(s->questions.filterRowsByBank(s.bank()).stream().filter(r->r.examType()==s.examType())).toList();
        return fallback.stream()
                .sorted(Comparator.comparing(FilterRow::examType)
                        .thenComparing(FilterRow::subject, TR)
                        .thenComparing(FilterRow::topic, Comparator.nullsLast(TR)))
                .toList();
    }

    public PageResponse<QuestionListItem> list(QuestionFilter filter, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("id"));
        var result=questions.findAll(QuestionSpecs.filter(filter, true,sharedLabels.questionIds(filter)), pageable);
        var presentations=resources.items(result.getContent().stream().map(q->"question:"+q.getCode()).toList());
        return PageResponse.of(result,q->QuestionListItem.of(q,presentations.getOrDefault("question:"+q.getCode(),Map.of())));
    }

    public Map<String,Long> categoryCounts(QuestionFilter filter) {
        return sharedLabels.categoryCounts(filter);
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
        var spec = QuestionSpecs.filter(filter, true,sharedLabels.questionIds(filter)).and(QuestionSpecs.idAfter(id, next));
        Sort sort = next ? Sort.by("id").ascending() : Sort.by("id").descending();
        return questions.findBy(spec, q -> q.sortBy(sort).first()).map(q -> toDetail(q, userId));
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
        var presentation=resources.items(List.of("question:"+q.getCode())).getOrDefault("question:"+q.getCode(),Map.of());
        return new QuestionDetail(q.getId(), q.getCode(), q.getBank(), q.getExamType(), Objects.toString(presentation.get("subject"),q.getSubject()),
                Objects.toString(presentation.get("topic"),q.getTopic()),
                q.getYear(), q.getSource(), q.getChoiceCount(), q.getSolutionImage() != null, avg, agg.count(), votes, mine,
                taxonomy.approved(q.getId()), helpfulness.summary(q.getId(), userId), hints.available(q.getId()));
    }
}
