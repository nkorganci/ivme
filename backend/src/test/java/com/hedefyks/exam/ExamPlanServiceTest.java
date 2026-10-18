package com.hedefyks.exam;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionAvailabilityService;
import com.hedefyks.question.QuestionSelectionMode;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

class ExamPlanServiceTest {
    private final QuestionAvailabilityService availability = mock(QuestionAvailabilityService.class);
    private final ExamPlanService plans = new ExamPlanService(availability);

    @Test
    void tyt_profili_ve_ayt_alanlari_ders_agirliklarini_korur() {
        mockCounts(false);

        assertThat(plans.plan(1L, null, ExamType.TYT, ExamTrack.SAYISAL,
                QuestionSelectionMode.MIXED, 120).subjects())
                .extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(40, 5, 5, 5, 5, 40, 7, 7, 6);
        assertThat(plans.plan(1L, null, ExamType.AYT, ExamTrack.SAYISAL,
                QuestionSelectionMode.MIXED, 80).subjects())
                .extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(40, 14, 13, 13);
        assertThat(plans.plan(1L, null, ExamType.AYT, ExamTrack.ESIT_AGIRLIK,
                QuestionSelectionMode.MIXED, 80).subjects())
                .extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(40, 24, 10, 6);
        assertThat(plans.plan(1L, null, ExamType.AYT, ExamTrack.SOZEL,
                QuestionSelectionMode.MIXED, 80).subjects())
                .extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(24, 10, 6, 11, 11, 12, 6);
        assertThat(plans.plan(1L, null, ExamType.TYT, ExamTrack.SOZEL,
                QuestionSelectionMode.MIXED, 9).subjects())
                .extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(1, 1, 1, 1, 1, 1, 1, 1, 1);
    }

    @Test
    void kisa_deneme_toplami_tam_tutar_ve_eksik_bransta_hazir_olmaz() {
        mockCounts(true);
        var plan = plans.plan(1L, null, ExamType.AYT, ExamTrack.SAYISAL,
                QuestionSelectionMode.NEW, 10);
        assertThat(plan.subjects()).extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(5, 2, 2, 1);
        assertThat(plan.ready()).isFalse();
        assertThat(plan.subjects()).filteredOn(row -> row.available() < row.target())
                .extracting(ExamPlanService.SubjectQuota::subject).containsExactly("Fizik");
    }

    @Test
    void secim_her_branstan_plandaki_kadar_soru_alir() {
        mockCounts(false);
        when(availability.balancedSubjectCandidates(eq(1L), any(), any(), eq(QuestionSelectionMode.MIXED),
                any(), org.mockito.ArgumentMatchers.anyInt())).thenAnswer(invocation -> {
            List<String> subjects = invocation.getArgument(4);
            int limit = invocation.getArgument(5);
            // Every branch shares these IDs: a question must still appear only once.
            return subjects.stream().flatMap(subject -> LongStream.rangeClosed(1, limit)
                    .mapToObj(id -> new com.hedefyks.question.ExamTopicBalancer.Candidate(id, subject, subject, 0, 0))).toList();
        });
        var plan = plans.plan(1L, null, ExamType.AYT, ExamTrack.ESIT_AGIRLIK,
                QuestionSelectionMode.MIXED, 20);
        var ids = plans.select(1L, null, QuestionSelectionMode.MIXED, plan);
        assertThat(ids).hasSize(20).doesNotHaveDuplicates();
        assertThat(plan.subjects()).extracting(ExamPlanService.SubjectQuota::target)
                .containsExactly(10, 6, 3, 1);
    }

    private void mockCounts(boolean shortage) {
        when(availability.countBySubject(eq(1L), any(), any(), any(), any())).thenAnswer(invocation -> {
            List<String> subjects = invocation.getArgument(4);
            return subjects.stream().collect(Collectors.toMap(subject -> subject,
                    subject -> shortage && subject.equals("Fizik") ? 0L : 200L));
        });
    }
}
