package com.hedefyks;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionRepository;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Ortak test altyapısı: yks_hazirlik_test veritabanını her testte temizler (yalnız "_test" ile biten veritabanında!). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class TestBase {

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected UserRepository users;
    @Autowired protected QuestionRepository questions;
    @Autowired protected PasswordEncoder encoder;

    @BeforeEach
    void cleanDatabase() {
        String db = jdbc.queryForObject("select current_database()", String.class);
        if (db == null || !db.endsWith("_test")) {
            throw new IllegalStateException("Testler yalnız *_test veritabanında çalışır, bağlı olunan: " + db);
        }
        jdbc.execute("TRUNCATE feedback, exam_questions, exams, questions, users RESTART IDENTITY CASCADE");
    }

    protected Question question(String code, String subject, String correct) {
        Question q = new Question();
        q.setCode(code);
        q.setExamType(ExamType.TYT);
        q.setSubject(subject);
        q.setTopic("Konu");
        q.setImage("TYT/turkce/TYT-0001.webp");
        q.setCorrectAnswer(correct);
        return questions.save(q);
    }

    protected User user(String username, Role role) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setPasswordHash(encoder.encode("Sifre1234"));
        u.setRole(role);
        return users.save(u);
    }

    /** Giriş yapar, oturumu döner. */
    protected MockHttpSession login(String login, String password) throws Exception {
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + login + "\",\"password\":\"" + password + "\"}")).andReturn();
        return session;
    }

    protected ResultActions send(MockHttpSession session, org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b,
                                 String body) throws Exception {
        var req = b.session(session).with(csrf());
        if (body != null) req = req.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(req);
    }

    protected JsonNode read(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }
}
