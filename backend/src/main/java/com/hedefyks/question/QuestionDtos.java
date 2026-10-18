package com.hedefyks.question;

import java.util.Map;
import java.util.List;

public final class QuestionDtos {

    private QuestionDtos() {}

    public record FilterRow(ExamType examType, String subject, String topic, long count,
                            Long totalCount, Long examCount, Long subjectCount, Long subjectTotalCount, Long topicTotalCount) {
        public FilterRow(ExamType examType, String subject, String topic, long count) {
            this(examType, subject, topic, count, null, null, null, null, null);
        }
    }

    public record QuestionListItem(Long id, String code, QuestionBank bank, ExamType examType, String subject,
                                   String topic, Integer year, String source,
                                   @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_EMPTY) Map<String,Object> resource) {
        public static QuestionListItem of(Question q) {
            return new QuestionListItem(q.getId(), q.getCode(), q.getBank(), q.getExamType(), q.getSubject(),
                    q.getTopic(), q.getYear(), q.getSource(),Map.of());
        }
        public static QuestionListItem of(Question q,Map<String,Object> resource) {
            return new QuestionListItem(q.getId(),q.getCode(),q.getBank(),q.getExamType(),java.util.Objects.toString(resource.get("subject"),q.getSubject()),
                java.util.Objects.toString(resource.get("topic"),q.getTopic()),q.getYear(),q.getSource(),resource);
        }
    }

    public record Evaluation(Difficulty difficultyVote, Integer rating) {}

    /** Doğru cevap içermez; yalnız kayıtlı pratik turunda doğru yanıt veya açıkça gösterme ile öğrenilir. */
    public record QuestionDetail(Long id, String code, QuestionBank bank, ExamType examType, String subject,
                                 String topic, Integer year, String source, int choiceCount, boolean hasSolutionImage,
                                 Double avgRating, long ratingCount, Map<String, Long> difficultyVotes,
                                 Evaluation myEvaluation, List<QuestionTaxonomyService.Label> approvedLabels,
                                 QuestionHelpfulnessService.Summary helpfulness, boolean hasApprovedHint) {}

}
