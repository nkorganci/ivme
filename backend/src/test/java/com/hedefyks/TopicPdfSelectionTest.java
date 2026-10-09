package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.common.ApiException;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.topicpdf.TopicPdfService;
import com.hedefyks.user.Role;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class TopicPdfSelectionTest extends TestBase {
    @MockitoBean TopicPdfService topicPdfs;

    @Test
    void pdfSelectionUsesOnlyReviewedQuestionCodesEvenWithForgedFilters() throws Exception {
        when(topicPdfs.approvedQuestionCodes(1099)).thenReturn(List.of("approved-1", "approved-2"));
        when(topicPdfs.detail(1099)).thenReturn(new TopicPdfService.Item(1099, "Noktalama İşaretleri",
                "TYT", "turkce", "topic_summary", 11, 1, "available", "Noktalama İşaretleri"));
        Question first = ogmQuestion("approved-1");
        Question second = ogmQuestion("approved-2");
        ogmQuestion("same-broad-topic-but-not-approved");
        question("approved-code-in-wrong-bank", "Türkçe", "A");
        user("pdflearner", Role.USER);
        var learner = login("pdflearner", "Sifre1234");

        JsonNode counts = read(send(learner, get("/api/questions/availability")
                .param("topicPdfId", "1099").param("bank", "CIKMIS")
                .param("subject", "Matematik"), null).andExpect(status().isOk()));
        assertThat(counts.get("total").asInt()).isEqualTo(2);

        String examBody = """
                {"topicPdfId":1099,"bank":"CIKMIS","subject":"Matematik",
                 "questionCount":2,"selectionMode":"MIXED"}
                """;
        JsonNode exam = read(send(learner, post("/api/exams"), examBody).andExpect(status().isCreated()));
        assertThat(exam.get("questions").size()).isEqualTo(2);
        assertThat(List.of(exam.get("questions").get(0).get("questionId").asLong(),
                exam.get("questions").get(1).get("questionId").asLong()))
                .containsExactlyInAnyOrder(first.getId(), second.getId());

        String practiceBody = """
                {"topicPdfId":1099,"bank":"CIKMIS","subject":"Matematik",
                 "questionCount":2,"selectionMode":"MIXED","clientRequestId":"%s"}
                """.formatted(UUID.randomUUID());
        JsonNode practice = read(send(learner, post("/api/study-sessions"), practiceBody)
                .andExpect(status().isCreated()));
        assertThat(practice.get("topic").asText()).isEqualTo("Noktalama İşaretleri");
        assertThat(practice.get("questions").size()).isEqualTo(2);
    }

    @Test
    void unknownPdfCannotStartAStudySession() throws Exception {
        when(topicPdfs.approvedQuestionCodes(9999))
                .thenThrow(ApiException.notFound("Doğrulanmış konu soru bağı bulunamadı."));
        user("pdflearner2", Role.USER);
        var learner = login("pdflearner2", "Sifre1234");
        send(learner, post("/api/study-sessions"), """
                {"topicPdfId":9999,"questionCount":1,"clientRequestId":"%s"}
                """.formatted(UUID.randomUUID())).andExpect(status().isNotFound());
    }

    private Question ogmQuestion(String code) {
        Question question = question(code, "Türkçe", "A");
        question.setBank(QuestionBank.OGM);
        question.setTopic("Ses Bilgisi ve Yazım");
        return questions.save(question);
    }
}
