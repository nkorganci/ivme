package com.hedefyks;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class TopicPdfAccessTest extends TestBase {

    @Test
    void onlyStudentsCanReadTopicPdfEndpoints() throws Exception {
        user("student", Role.USER);
        user("admin", Role.ADMIN);
        user("operator", Role.OPERATOR);
        var student = login("student", "Sifre1234");
        var admin = login("admin", "Sifre1234");
        var operator = login("operator", "Sifre1234");
        String[] paths = {"/api/topic-pdfs", "/api/topic-pdfs/filters",
                "/api/topic-pdfs/17", "/api/topic-pdfs/17/file"};
        for (String path : paths) {
            send(admin, get(path), null).andExpect(status().isForbidden());
            send(operator, get(path), null).andExpect(status().isForbidden());
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        send(student, get(paths[0]), null).andExpect(status().isOk());
        send(student, get(paths[1]), null).andExpect(status().isOk());
        send(student, get(paths[2]), null).andExpect(status().isNotFound());
        send(student, get(paths[3]), null).andExpect(status().isNotFound());
    }
}
