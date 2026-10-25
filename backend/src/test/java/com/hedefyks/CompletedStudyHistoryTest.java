package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class CompletedStudyHistoryTest extends TestBase {
    @Test
    void openPracticeIsResumableButOnlyFinishedPracticeEntersHistoryAndStatistics() throws Exception {
        question("FIN-1", "Türkçe", "A");
        question("FIN-2", "Türkçe", "A");
        user("owner", Role.USER);
        var owner = login("owner", "Sifre1234");
        var practice = create(owner, 2);
        long id = practice.path("id").asLong();
        long correct = practice.at("/questions/0/questionId").asLong();
        long wrong = practice.at("/questions/1/questionId").asLong();
        answer(owner, correct, id, "A");
        answer(owner, wrong, id, "B");
        assertTotals(owner, 0, 0, 0);
        for (String history : new String[]{"CORRECT", "WRONG"})
            send(owner, get("/api/questions/availability").param("history", history), null)
                    .andExpect(jsonPath("$.total").value(0));
        send(owner, get("/api/study-sessions/unfinished"), null)
                .andExpect(jsonPath("$[0].solvedCount").value(2))
                .andExpect(jsonPath("$[0].resumeQuestionCode").value(practice.at("/questions/1/code").asText()));
        send(owner, get("/api/questions/" + wrong + "/practice?sessionId=" + id), null)
                .andExpect(jsonPath("$.attempts.length()").value(1));
        // Another practice starts fresh even when an earlier unfinished practice answered this question.
        long otherId = create(owner, 2).path("id").asLong();
        send(owner, get("/api/questions/" + wrong + "/practice?sessionId=" + otherId), null)
                .andExpect(jsonPath("$.attempts.length()").value(0));
        send(owner, post("/api/study-sessions/" + id + "/finish"), null).andExpect(status().isOk());
        assertTotals(owner, 2, 1, 1);
        for (String history : new String[]{"CORRECT", "WRONG"})
            send(owner, get("/api/questions/availability").param("history", history), null)
                    .andExpect(jsonPath("$.total").value(1));
        send(owner, post("/api/study-sessions/" + id + "/cancel"), null).andExpect(status().isConflict());
        assertTotals(owner, 2, 1, 1);
    }

    @Test
    void practiceAnswerAfterABlankExamSlotReachesTopicProgressAndLeavesSolvedHistoryOnce() throws Exception {
        question("BLANK-1", "Türkçe", "A");
        user("owner", Role.USER);
        var owner = login("owner", "Sifre1234");
        long examId = read(send(owner, post("/api/exams"), "{\"questionCount\":1}")
                .andExpect(status().isCreated())).path("id").asLong();
        send(owner, post("/api/exams/" + examId + "/submit"), null).andExpect(status().isOk());
        // A blank exam slot is not a solved question: it stays selectable as new and counts as blank.
        send(owner, get("/api/questions/availability"), null)
                .andExpect(jsonPath("$.solved").value(0)).andExpect(jsonPath("$.remaining").value(1));
        assertProgress(owner, 1, 0, 0, 1);
        var practice = create(owner, 1);
        long id = practice.path("id").asLong();
        answer(owner, practice.at("/questions/0/questionId").asLong(), id, "A");
        assertProgress(owner, 1, 0, 0, 1);
        send(owner, post("/api/study-sessions/" + id + "/finish"), null).andExpect(status().isOk());
        assertProgress(owner, 1, 1, 0, 0);
        send(owner, get("/api/questions/availability"), null)
                .andExpect(jsonPath("$.solved").value(1)).andExpect(jsonPath("$.remaining").value(0));
        // An exam taken after the practice answers the same question again without adding a second count.
        long later = read(send(owner, post("/api/exams"), "{\"questionCount\":1}")
                .andExpect(status().isCreated())).path("id").asLong();
        send(owner, put("/api/exams/" + later + "/answers"),
                "{\"questionId\":" + practice.at("/questions/0/questionId").asLong() + ",\"answer\":\"B\"}")
                .andExpect(status().isNoContent());
        send(owner, post("/api/exams/" + later + "/submit"), null).andExpect(status().isOk());
        assertProgress(owner, 1, 1, 0, 0);
    }

    @Test
    void practiceCancellationIsOwnedIdempotentAndCannotBeAnsweredOrFinished() throws Exception {
        question("CANCEL-P", "Türkçe", "A");
        user("owner", Role.USER);
        user("other", Role.USER);
        var owner = login("owner", "Sifre1234");
        var other = login("other", "Sifre1234");
        var practice = create(owner, 1);
        long id = practice.path("id").asLong();
        long questionId = practice.at("/questions/0/questionId").asLong();
        answer(owner, questionId, id, "B");
        String cancel = "/api/study-sessions/" + id + "/cancel";
        mvc.perform(post(cancel).with(csrf())).andExpect(status().isUnauthorized());
        send(other, post(cancel), null).andExpect(status().isNotFound());
        send(owner, post(cancel), null).andExpect(status().isNoContent());
        send(owner, post(cancel), null).andExpect(status().isNoContent());
        send(owner, get("/api/study-sessions/unfinished"), null).andExpect(jsonPath("$.length()").value(0));
        send(owner, get("/api/study-sessions/unfinished-summary"), null).andExpect(jsonPath("$.count").value(0));
        send(owner, get("/api/study-sessions/" + id), null)
                .andExpect(jsonPath("$.status").value("ABANDONED")).andExpect(jsonPath("$.result").isEmpty());
        send(owner, post("/api/study-sessions/" + id + "/finish"), null).andExpect(status().isConflict());
        send(owner, post("/api/questions/" + questionId + "/practice"), event(id, "A")).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts WHERE session_id=?", Long.class, id)).isEqualTo(1);
        assertTotals(owner, 0, 0, 0);
    }

    @Test
    void cancelledExamCannotBeResumedSubmittedOrCountedAndFinishedExamCannotBeCancelled() throws Exception {
        var question = question("CANCEL-E", "Türkçe", "A");
        user("owner", Role.USER);
        user("other", Role.USER);
        var owner = login("owner", "Sifre1234");
        var other = login("other", "Sifre1234");
        long id = read(send(owner, post("/api/exams"), "{\"questionCount\":1}")
                .andExpect(status().isCreated())).path("id").asLong();
        String answer = "{\"questionId\":" + question.getId() + ",\"answer\":\"A\"}";
        send(owner, put("/api/exams/" + id + "/answers"), answer).andExpect(status().isNoContent());
        assertTotals(owner, 0, 0, 0);
        String cancel = "/api/exams/" + id + "/cancel";
        mvc.perform(post(cancel).with(csrf())).andExpect(status().isUnauthorized());
        send(other, post(cancel), null).andExpect(status().isNotFound());
        send(owner, post(cancel), null).andExpect(status().isNoContent());
        send(owner, post(cancel), null).andExpect(status().isNoContent());
        send(owner, get("/api/exams/" + id), null).andExpect(status().isConflict());
        send(owner, post("/api/exams/" + id + "/submit"), null).andExpect(status().isConflict());
        send(owner, put("/api/exams/" + id + "/answers"), answer).andExpect(status().isConflict());
        send(owner, get("/api/study-sessions/unfinished"), null).andExpect(jsonPath("$.length()").value(0));
        send(owner, get("/api/exams/summary"), null).andExpect(jsonPath("$.examCount").value(0));
        assertTotals(owner, 0, 0, 0);
        long finished = read(send(owner, post("/api/exams"), "{\"questionCount\":1}")
                .andExpect(status().isCreated())).path("id").asLong();
        send(owner, put("/api/exams/" + finished + "/answers"), answer).andExpect(status().isNoContent());
        send(owner, post("/api/exams/" + finished + "/submit"), null).andExpect(status().isOk());
        send(owner, post("/api/exams/" + finished + "/cancel"), null).andExpect(status().isConflict());
        assertTotals(owner, 1, 1, 0);
    }

    private JsonNode create(MockHttpSession session, int count) throws Exception {
        return read(send(session, post("/api/study-sessions"), "{\"questionCount\":" + count
                + ",\"clientRequestId\":\"" + UUID.randomUUID() + "\"}").andExpect(status().isCreated()));
    }

    private String event(long id, String answer) {
        return "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\""
                + answer + "\",\"activeSeconds\":10,\"sessionId\":" + id + "}";
    }

    private void answer(MockHttpSession session, long questionId, long id, String answer) throws Exception {
        send(session, post("/api/questions/" + questionId + "/practice"), event(id, answer)).andExpect(status().isOk());
    }

    private void assertProgress(MockHttpSession session, int total, int correct, int wrong, int blank) throws Exception {
        for (String classification : new String[]{"CURRENT", "HISTORICAL"})
            send(session, get("/api/learning-resources/progress").param("classification", classification), null)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.summary.total").value(total))
                    .andExpect(jsonPath("$.summary.correct").value(correct)).andExpect(jsonPath("$.summary.wrong").value(wrong))
                    .andExpect(jsonPath("$.summary.blank").value(blank));
    }

    private void assertTotals(MockHttpSession session, int total, int correct, int wrong) throws Exception {
        send(session, get("/api/questions/availability"), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.solved").value(total)).andExpect(jsonPath("$.correct").value(correct))
                .andExpect(jsonPath("$.everWrong").value(wrong));
        send(session, get("/api/progress/first-attempts?period=DAY&zone=UTC"), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(total)).andExpect(jsonPath("$.correct").value(correct))
                .andExpect(jsonPath("$.wrong").value(wrong));
        for (String classification : new String[]{"CURRENT", "HISTORICAL"})
            send(session, get("/api/learning-resources/progress").param("classification", classification), null)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.summary.total").value(total))
                    .andExpect(jsonPath("$.summary.correct").value(correct)).andExpect(jsonPath("$.summary.wrong").value(wrong));
    }
}
