package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.hedefyks.question.*;
import com.hedefyks.review.ContentReviewService;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** The batched pool must preserve the existing catalogue predicate and learner isolation. */
class ExamSubjectPoolTest extends TestBase {
    @Autowired QuestionAvailabilityService availability;
    @MockitoBean ContentReviewService reviews;
    private static final String RUN = "exam-subject-pool-test";

    @AfterEach void clearRun() {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?", RUN);
    }

    private Question published(String code, QuestionBank bank, String... subjects) throws Exception {
        var q = question(code, "Legacy subject differs from catalogue", "A");
        q.setBank(bank); questions.saveAndFlush(q);
        String stamp = jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?", String.class, q.getId());
        var data = Map.of("key", "question:" + code, "questionCode", code, "sourceUpdatedAt", stamp,
                "automaticLabels", Map.of("assignments", List.of()));
        jdbc.update("""
            INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
            VALUES (?,?,'QUESTION','TYT',?,true,?::jsonb,ARRAY[]::text[],?::text[],ARRAY['TYT'])
            """, RUN, "question:" + code, subjects[0], json.writeValueAsString(data), "{" + String.join(",", subjects) + "}");
        return q;
    }

    @Test void batchedCountsAndBoundedSamplesMatchEveryExistingFilterAndHistoryMode() throws Exception {
        clearRun();
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')", RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", RUN);
        var owner = user("pool_owner", Role.USER);
        var other = user("pool_other", Role.USER);
        var practiced = published("POOL-PRACTICED", QuestionBank.CIKMIS, "fizik");
        var shared = published("POOL-SHARED", QuestionBank.CIKMIS, "fizik", "kimya");
        published("POOL-REASSIGNED", QuestionBank.CIKMIS, "fizik");
        published("POOL-REMOVED", QuestionBank.CIKMIS, "fizik");
        var stale = published("POOL-STALE", QuestionBank.CIKMIS, "fizik");
        published("POOL-OGM", QuestionBank.OGM, "fizik");
        question("POOL-UNPUBLISHED", "Fizik", "A");
        jdbc.update("UPDATE questions SET updated_at=updated_at+interval '1 second' WHERE id=?", stale.getId());
        when(reviews.studentOverrides()).thenReturn(List.of(
            Map.of("item_key", "question:POOL-REMOVED", "status", "REMOVE"),
            Map.of("item_key", "question:POOL-REASSIGNED", "status", "APPROVE",
                "subject_ids", List.of("kimya"), "exam_ids", List.of("TYT"),
                "labels", Map.of("assignments", List.of()))));
        jdbc.update("""
            INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct)
            VALUES (?,?,gen_random_uuid(),'ANSWER','B','A',false),(?,?,gen_random_uuid(),'ANSWER','B','A',false)
            """, owner.getId(), practiced.getId(), other.getId(), shared.getId());

        for (QuestionBank bank : Arrays.asList(null, QuestionBank.CIKMIS, QuestionBank.OGM)) {
            for (var mode : QuestionSelectionMode.values()) {
                var subjects = List.of("Fizik", "Kimya", "Biyoloji");
                var counts = availability.countBySubject(owner.getId(), bank, ExamType.TYT, mode, subjects);
                var candidates = availability.randomSubjectCandidates(owner.getId(), bank, ExamType.TYT, mode, subjects, 2);
                for (String subject : subjects) {
                    var filter = new QuestionFilter(bank, ExamType.TYT, subject, null);
                    var reference = availability.count(owner.getId(), filter);
                    long expected = switch (mode) {
                        case MIXED -> reference.total(); case NEW -> reference.remaining();
                        case REPEAT -> reference.solved(); case WRONG -> reference.everWrong();
                    };
                    assertThat(counts.getOrDefault(subject, 0L)).as(bank + "/" + mode + "/" + subject).isEqualTo(expected);
                    var allowed = availability.randomIds(owner.getId(), filter, mode, 100);
                    var sample = candidates.stream().filter(row -> row.subject().equals(subject))
                            .map(QuestionAvailabilityService.SubjectCandidate::id).toList();
                    assertThat(sample).hasSize((int)Math.min(2, expected)).doesNotHaveDuplicates();
                    assertThat(allowed).containsAll(sample);
                }
            }
        }
        var counts = availability.countBySubject(owner.getId(), null, ExamType.TYT, QuestionSelectionMode.MIXED, List.of("Fizik", "Kimya"));
        assertThat(counts).containsEntry("Fizik", 3L).containsEntry("Kimya", 2L);
    }
}
