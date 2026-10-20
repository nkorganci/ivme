package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class StudentSelfCheckFlowTest extends TestBase {
    @Test
    void savedAttemptsAreSharedAcrossSameAccountSessionsAndAudited() throws Exception {
        user("oz_testi_ayse", Role.USER);
        user("oz_testi_mehmet", Role.USER);
        var first = login("oz_testi_ayse", "Sifre1234");
        var second = login("oz_testi_ayse", "Sifre1234");
        var other = login("oz_testi_mehmet", "Sifre1234");
        var latest = get("/api/self-checks/latest")
                .param("kind", "SOURCE_PRACTICE").param("itemKey", "note:tyt-test");
        assertThat(send(first, latest, null).andReturn().getResponse().getContentAsString()).isBlank();
        var saved = read(send(first, post("/api/self-checks"),
                "{\"kind\":\"SOURCE_PRACTICE\",\"itemKey\":\"note:tyt-test\",\"answers\":[2]}"));
        assertThat(saved.get("answers").get(0).asInt()).isEqualTo(2);
        assertThat(read(send(second, get("/api/self-checks/latest")
                .param("kind", "SOURCE_PRACTICE").param("itemKey", "note:tyt-test"), null))
                .get("id").asLong()).isEqualTo(saved.get("id").asLong());
        assertThat(send(other, get("/api/self-checks/latest")
                .param("kind", "SOURCE_PRACTICE").param("itemKey", "note:tyt-test"), null)
                .andReturn().getResponse().getContentAsString()).isBlank();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_record_audit WHERE record_type = 'student_self_check_attempts'",
                Integer.class)).isEqualTo(1);

        var retake = read(send(second, post("/api/self-checks"),
                "{\"kind\":\"SOURCE_PRACTICE\",\"itemKey\":\"note:tyt-test\",\"answers\":[1]}"));
        assertThat(retake.get("id").asLong()).isGreaterThan(saved.get("id").asLong());
        assertThat(read(send(first, get("/api/self-checks/latest")
                .param("kind", "SOURCE_PRACTICE").param("itemKey", "note:tyt-test"), null))
                .get("answers").get(0).asInt()).isEqualTo(1);

        String guideAnswers = "[" + "0,".repeat(39) + "0]";
        send(first, post("/api/self-checks"),
                "{\"kind\":\"GUIDE_QUIZ\",\"itemKey\":\"coaching-guide-v1\",\"answers\":" + guideAnswers + "}")
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM student_self_check_attempts", Integer.class)).isEqualTo(3);

        send(first, post("/api/self-checks"),
                "{\"kind\":\"GUIDE_QUIZ\",\"itemKey\":\"coaching-guide-v1\",\"answers\":[0]}")
                .andExpect(status().isBadRequest());
        send(first, post("/api/self-checks"),
                "{\"kind\":\"SOURCE_PRACTICE\",\"itemKey\":\"note:tyt-test\",\"answers\":[4]}")
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM student_self_check_attempts", Integer.class)).isEqualTo(3);
    }
}
