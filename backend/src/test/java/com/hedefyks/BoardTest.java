package com.hedefyks;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.question.Question;
import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class BoardTest extends TestBase {
    @Test
    void karalama_sahibe_ozel_kalir_ve_surumu_korur() throws Exception {
        Question q = question("B-1", "Türkçe", "A");
        user("ayse", Role.USER);
        user("mehmet", Role.USER);
        var ayse = login("ayse", "Sifre1234");
        var mehmet = login("mehmet", "Sifre1234");
        String path = "/api/questions/" + q.getId() + "/board";

        send(ayse, get(path), null).andExpect(jsonPath("$.version").value(0))
                .andExpect(jsonPath("$.strokes.length()").value(0));
        send(ayse, put(path), "{\"version\":0,\"strokes\":[[[0.1,0.2],[1,1]]]}" )
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        send(mehmet, get(path), null).andExpect(jsonPath("$.version").value(0));
        send(mehmet, put(path), "{\"version\":0,\"strokes\":[[[0,0]]]}" )
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        send(ayse, get(path), null).andExpect(jsonPath("$.strokes[0][1][0]").value(1));
        send(ayse, put(path), "{\"version\":0,\"strokes\":[]}").andExpect(status().isConflict());
        send(ayse, put(path), "{\"version\":1,\"strokes\":[]}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        send(mehmet, get(path), null).andExpect(jsonPath("$.strokes.length()").value(1));
    }

    @Test
    void gecersiz_cizim_kapali_soru_ve_yetki_reddedilir() throws Exception {
        Question q = question("B-2", "Matematik", "B");
        user("ayse", Role.USER);
        user("operator", Role.OPERATOR);
        var ayse = login("ayse", "Sifre1234");
        var operator = login("operator", "Sifre1234");
        String path = "/api/questions/" + q.getId() + "/board";

        send(ayse, put(path), "{\"version\":0,\"strokes\":[[[1.1,0]]]}" )
                .andExpect(status().isBadRequest());
        send(ayse, put(path), "{\"version\":0,\"strokes\":[[[0,0],[]]]}" )
                .andExpect(status().isBadRequest());
        send(ayse, put(path), "{\"version\":0,\"strokes\":\"data:image/png;base64,...\"}" )
                .andExpect(status().isBadRequest());
        send(operator, get(path), null).andExpect(status().isForbidden());
        q.setActive(false);
        questions.saveAndFlush(q);
        send(ayse, get(path), null).andExpect(status().isNotFound());
        send(ayse, put(path), "{\"version\":0,\"strokes\":[]}").andExpect(status().isNotFound());
    }
}
