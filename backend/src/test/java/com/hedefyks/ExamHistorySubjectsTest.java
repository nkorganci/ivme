package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class ExamHistorySubjectsTest extends TestBase {
    @Test void historyIncludesSubmittedSubjectSnapshotsWithoutLeakingOtherUsersOrAnswers() throws Exception {
        var math = question("H-M", "Matematik", "A");
        var turkish = question("H-T", "Türkçe", "B");
        question("H-B", "Türkçe", "C");
        user("history_student", Role.USER);
        user("other_student", Role.USER);
        var session = login("history_student", "Sifre1234");
        long id = read(send(session, post("/api/exams"), "{\"examType\":\"TYT\",\"questionCount\":3}")
                .andExpect(status().isCreated())).path("id").asLong();
        assertThat(read(send(session, get("/api/exams"), null).andExpect(status().isOk()))
                .path("totalElements").asInt()).isZero();
        send(session, post("/api/exams/" + id + "/submit"),
                "{\"answers\":{\"" + math.getId() + "\":\"A\",\"" + turkish.getId() + "\":\"D\"}}")
                .andExpect(status().isOk());
        send(session, post("/api/exams"), "{\"examType\":\"TYT\",\"questionCount\":1}")
                .andExpect(status().isCreated());
        long cancelled = read(send(session, post("/api/exams"), "{\"examType\":\"TYT\",\"questionCount\":1}")
                .andExpect(status().isCreated())).path("id").asLong();
        send(session, post("/api/exams/" + cancelled + "/cancel"), null).andExpect(status().isNoContent());
        jdbc.update("UPDATE questions SET subject='Fizik',correct_answer='D'");
        var page = read(send(session, get("/api/exams?size=1"), null).andExpect(status().isOk()));
        assertThat(page.path("totalElements").asInt()).isEqualTo(1);
        var result = page.path("content").get(0);
        assertThat(result.path("examType").asText()).isEqualTo("TYT");
        assertThat(result.toString()).doesNotContain("correctAnswer", "selectedAnswer", "questionId");
        assertThat(result.path("bySubject").size()).isEqualTo(2);
        int total = 0, correct = 0, wrong = 0, blank = 0;
        for (var subject : result.path("bySubject")) {
            total += subject.path("total").asInt(); correct += subject.path("correct").asInt();
            wrong += subject.path("wrong").asInt(); blank += subject.path("blank").asInt();
            assertThat(subject.path("subject").asText()).isIn("Matematik", "Türkçe");
        }
        assertThat(total).isEqualTo(3); assertThat(correct).isEqualTo(1);
        assertThat(wrong).isEqualTo(1); assertThat(blank).isEqualTo(1);
        assertThat(read(send(session, get("/api/exams?page=1&size=1"), null).andExpect(status().isOk()))
                .path("content").size()).isZero();
        var other = login("other_student", "Sifre1234");
        assertThat(read(send(other, get("/api/exams"), null).andExpect(status().isOk()))
                .path("content").size()).isZero();
    }
}
