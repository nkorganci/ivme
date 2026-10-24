package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;

class ExamTrackFlowTest extends TestBase {
    private static final String PATH = "/api/exam-tracks";

    @Test
    void examTrackSelectionIsStoredPerAccount() throws Exception {
        user("track_ayse", Role.USER);
        user("track_mehmet", Role.USER);
        var first = login("track_ayse", "Sifre1234");
        var second = login("track_ayse", "Sifre1234");
        var other = login("track_mehmet", "Sifre1234");

        var initial = read(send(first, get(PATH), null));
        assertThat(initial.path("currentId").asText()).isEqualTo("YKS");
        var ids = new ArrayList<String>();
        initial.path("tracks").forEach(t -> ids.add(t.path("id").asText()));
        assertThat(ids).containsExactly("YKS", "KPSS_ORTAOGRETIM", "KPSS_ONLISANS", "KPSS_LISANS",
                "KPSS_A_GRUBU", "KPSS_OABT", "KPSS_DHBT");
        assertThat(initial.path("tracks").get(1).path("status").asText()).isEqualTo("PREPARING");
        assertThat(initial.path("tracks").get(1).path("sections").size()).isEqualTo(2);
        assertThat(initial.path("tracks").get(2).path("note").asText()).contains("hazır değil");

        var selected = read(send(first, put(PATH + "/current"), "{\"trackId\":\"KPSS_ORTAOGRETIM\"}"));
        assertThat(selected.path("currentId").asText()).isEqualTo("KPSS_ORTAOGRETIM");
        assertThat(read(send(second, get(PATH), null)).path("currentId").asText()).isEqualTo("KPSS_ORTAOGRETIM");
        assertThat(read(send(other, get(PATH), null)).path("currentId").asText()).isEqualTo("YKS");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_record_audit WHERE record_type = 'user_exam_tracks'",
                Integer.class)).isEqualTo(1);

        send(first, put(PATH + "/current"), "{\"trackId\":\"KPSS_LISANS\"}").andExpect(status().isBadRequest());
        send(first, put(PATH + "/current"), "{\"trackId\":\"YOK\"}").andExpect(status().isBadRequest());
        send(first, put(PATH + "/current"), "{}").andExpect(status().isBadRequest());
        assertThat(read(send(first, get(PATH), null)).path("currentId").asText()).isEqualTo("KPSS_ORTAOGRETIM");

        send(first, put(PATH + "/current"), "{\"trackId\":\"YKS\"}").andExpect(status().isOk());
        assertThat(read(send(second, get(PATH), null)).path("currentId").asText()).isEqualTo("YKS");
    }
}
