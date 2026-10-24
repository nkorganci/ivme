package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.review.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ReviewCatalogSubjectTest {
    private final ObjectMapper json = new ObjectMapper();
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ReviewCatalog catalog = new ReviewCatalog(json, jdbc, mock(LearningLabelStore.class));

    @Test void subjectFiltersKeepTheFourLessonsSeparate() {
        for (var label : List.of("Matematik", "matematik")) assertThat(catalog.subjectId(label)).isEqualTo("matematik");
        for (var label : List.of("Geometri", "geometri")) assertThat(catalog.subjectId(label)).isEqualTo("geometri");
        for (var label : List.of("Türkçe", "turkce")) assertThat(catalog.subjectId(label)).isEqualTo("turkce");
        for (var label : List.of("Türk Dili ve Edebiyatı", "Edebiyat", "edebiyat")) assertThat(catalog.subjectId(label)).isEqualTo("edebiyat");
        verifyNoInteractions(jdbc);
    }

    @Test void officialTestQuotasIncludeBothLessonsWithoutMergingTheirDefinitions() throws Exception {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        var reviews = mock(ContentReviewService.class);
        when(reviews.studentOverrides()).thenReturn(List.of());
        var labels = new SharedQuestionLabels(reviews, catalog, jdbc, json);
        var math = labels.subjectSelection(QuestionBank.OGM, ExamType.AYT, List.of("Matematik"));
        assertThat(json.readTree(math.subjects()).findValuesAsText("subject_id")).containsExactlyInAnyOrder("matematik", "geometri");
        var literature = labels.subjectSelection(QuestionBank.OGM, ExamType.AYT, List.of("Türk Dili ve Edebiyatı"));
        assertThat(json.readTree(literature.subjects()).findValuesAsText("subject_id")).containsExactlyInAnyOrder("edebiyat", "turkce");
    }
}
