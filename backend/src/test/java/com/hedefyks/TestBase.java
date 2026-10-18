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
import org.junit.jupiter.api.AfterEach;
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

/** Ortak test altyapısı: ivme_test veritabanını her testte temizler (yalnız "_test" ile biten veritabanında!). */
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
        jdbc.execute("TRUNCATE service_error_events, feedback, exam_questions, exams, questions, users RESTART IDENTITY CASCADE");
        if (catalogFixtureRequired()) publishCatalogFixture();
    }

    private static final String CATALOG_FIXTURE = catalogFixtureKey();
    private static String catalogFixtureKey() {
        try {
            var digest=java.security.MessageDigest.getInstance("SHA-256");
            for(String name:java.util.List.of("content-taxonomy.json","pdf-review-labels.json"))
                try(var input=new org.springframework.core.io.ClassPathResource(name).getInputStream()) {digest.update(input.readAllBytes());}
            return "test-packaged-catalog-fixture-"+java.util.HexFormat.of().formatHex(digest.digest()).substring(0,16);
        } catch(Exception error) {throw new IllegalStateException(error);}
    }
    protected boolean catalogFixtureRequired() { return false; }

    /** Explicit test data; production services never substitute packaged labels for DB rows. */
    private void publishCatalogFixture() {
        try {
            jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}') ON CONFLICT DO NOTHING", CATALOG_FIXTURE);
            if (jdbc.queryForObject("SELECT count(*) FROM learning_catalog.categories WHERE run_key=?", Integer.class, CATALOG_FIXTURE) == 0) {
                try (var input = new org.springframework.core.io.ClassPathResource("content-taxonomy.json").getInputStream()) {
                    var rows = new java.util.ArrayList<Object[]>();
                    for (var category : json.readTree(input).path("categories"))
                        rows.add(new Object[]{CATALOG_FIXTURE, category.path("id").asText(), category.toString()});
                    jdbc.batchUpdate("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)", rows);
                }
            }
            if (jdbc.queryForObject("SELECT count(*) FROM learning_catalog.items WHERE run_key=?", Integer.class, CATALOG_FIXTURE) == 0) {
                try (var input = new org.springframework.core.io.ClassPathResource("pdf-review-labels.json").getInputStream()) {
                    var rows = new java.util.ArrayList<Object[]>();
                    for (var item : json.readTree(input).path("items"))
                        rows.add(new Object[]{CATALOG_FIXTURE, item.path("key").asText(), item.path("exam").asText(), item.path("subjectId").asText(), item.toString()});
                    jdbc.batchUpdate("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data) VALUES (?,?,'PDF',?,?,true,?::jsonb)", rows);
                }
            }
            jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", CATALOG_FIXTURE);
        } catch (java.io.IOException error) { throw new IllegalStateException(error); }
    }

    @AfterEach void clearCatalogFixturePointer() {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", CATALOG_FIXTURE);
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
