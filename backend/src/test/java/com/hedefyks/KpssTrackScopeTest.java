package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

/** KPSS Ortaöğretim seçiliyken liste, sayım, müfredat, pratik ve deneme yalnız KPSS içeriğinden gelir; YKS ayrı kalır. */
class KpssTrackScopeTest extends TestBase {
    private static final String RUN = "kpss-track-scope-test";

    @AfterEach void clearCatalog() {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.categories WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?", RUN);
    }

    private void category(String id, String exam, String subjectId, String subject, String topic) throws Exception {
        var c = new LinkedHashMap<String, Object>();
        c.put("id", id); c.put("exam", exam); c.put("subjectId", subjectId); c.put("subject", subject);
        c.put("unit", "Ünite"); c.put("unitId", id + ".u"); c.put("topic", topic); c.put("order", 1);
        c.put("canonicalUnit", true); c.put("canonicalTopic", true); c.put("selectable", true); c.put("origin", "CURRICULUM");
        jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)", RUN, id, json.writeValueAsString(c));
    }

    private void question(String code, ExamType exam, String subject, String subjectId, String categoryId) throws Exception {
        var q = question(code, subject, "A");
        q.setBank(QuestionBank.CIKMIS); q.setExamType(exam); q.setTopic("Sözcükte Anlam");
        questions.saveAndFlush(q);
        String stamp = jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?", String.class, q.getId());
        var data = new LinkedHashMap<String, Object>();
        data.put("key", "question:" + code); data.put("kind", "QUESTION"); data.put("exam", exam.name());
        data.put("subjectId", subjectId); data.put("subject", subject); data.put("title", code); data.put("url", "/soru/" + code);
        data.put("availability", "available"); data.put("studentVisible", true); data.put("questionCode", code);
        data.put("sourceUpdatedAt", stamp); data.put("bank", "CIKMIS");
        data.put("automaticLabels", Map.of("assignments", List.of(Map.of("categoryId", categoryId, "relation", "PRIMARY", "scopeStatus", "CANDIDATE"))));
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) "
                + "VALUES (?,?,'QUESTION',?,?,true,?::jsonb,?::text[],?::text[],?::text[])", RUN, "question:" + code, exam.name(), subjectId,
                json.writeValueAsString(data), "{" + categoryId + "}", "{" + subjectId + "}", "{" + exam.name() + "}");
    }

    private List<String> codes(JsonNode page) {
        var result = new ArrayList<String>();
        page.path("content").forEach(q -> result.add(q.path("code").asText()));
        return result;
    }

    @Test
    void kpssStudentSeesOnlyKpssContentAndYksStaysSeparate() throws Exception {
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')", RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", RUN);
        category("tyt.turkce.sa", "TYT", "turkce", "Türkçe", "Sözcükte Anlam");
        category("kpss-oo.turkce.tsa", "KPSS_OO_GY", "kpss-turkce", "Türkçe", "Sözcükte Anlam");
        category("kpss-oo.tarih.tr1", "KPSS_OO_GK", "kpss-tarih", "Tarih", "İslamiyet Öncesi Türk Devletleri");
        question("TYT-1", ExamType.TYT, "Türkçe", "turkce", "tyt.turkce.sa");
        question("KPSS-OO-2024-GY-01", ExamType.KPSS_OO_GY, "Türkçe", "kpss-turkce", "kpss-oo.turkce.tsa");
        question("KPSS-OO-2024-GK-01", ExamType.KPSS_OO_GK, "Tarih", "kpss-tarih", "kpss-oo.tarih.tr1");
        user("kpss_ogrenci", Role.USER);
        MockHttpSession session = login("kpss_ogrenci", "Sifre1234");

        // YKS (varsayılan) öğrencisi KPSS sorusu görmez.
        assertThat(codes(read(send(session, get("/api/questions"), null)))).containsExactly("TYT-1");
        send(session, put("/api/exam-tracks/current"), "{\"trackId\":\"KPSS_ORTAOGRETIM\"}").andExpect(status().isOk());

        assertThat(codes(read(send(session, get("/api/questions"), null))))
                .containsExactlyInAnyOrder("KPSS-OO-2024-GY-01", "KPSS-OO-2024-GK-01");
        // Eski YKS süzgeci KPSS'te YKS sorusu açmaz.
        assertThat(codes(read(send(session, get("/api/questions").param("examType", "TYT"), null)))).doesNotContain("TYT-1");
        assertThat(codes(read(send(session, get("/api/questions").param("source", "CIKMIS_TYT"), null)))).doesNotContain("TYT-1");
        // "Türkçe" adı KPSS'te KPSS Türkçe dersine (kpss-turkce) çözülür.
        assertThat(codes(read(send(session, get("/api/questions").param("subject", "Türkçe"), null))))
                .containsExactly("KPSS-OO-2024-GY-01");
        assertThat(codes(read(send(session, get("/api/questions").param("categoryId", "kpss-oo.tarih.tr1"), null))))
                .containsExactly("KPSS-OO-2024-GK-01");
        assertThat(read(send(session, get("/api/questions/availability"), null)).path("total").asInt()).isEqualTo(2);
        var filters = read(send(session, get("/api/questions/filters").param("bank", "CIKMIS"), null));
        var filterExams = new HashSet<String>();
        filters.forEach(row -> filterExams.add(row.path("examType").asText()));
        assertThat(filterExams).containsExactlyInAnyOrder("KPSS_OO_GY", "KPSS_OO_GK");

        // Dersler ekranı yalnız KPSS kategorilerini ve derslerini alır.
        var metadata = read(send(session, get("/api/learning-resources/metadata"), null));
        var exams = new HashSet<String>();
        metadata.path("categories").forEach(c -> exams.add(c.path("exam").asText()));
        assertThat(exams).containsExactlyInAnyOrder("KPSS_OO_GY", "KPSS_OO_GK");
        var branches = new ArrayList<String>();
        metadata.path("branches").forEach(b -> branches.add(b.path("id").asText()));
        assertThat(branches).containsExactlyInAnyOrder("kpss-turkce", "kpss-tarih");

        // Pratik yalnız KPSS sorularından kurulur ve KPSS geçmişine yazılır.
        var body = Map.of("questionCount", 2, "clientRequestId", UUID.randomUUID().toString());
        var practice = read(send(session, post("/api/study-sessions"), json.writeValueAsString(body)).andExpect(status().isCreated()));
        var practiceCodes = new ArrayList<String>();
        practice.path("questions").forEach(q -> practiceCodes.add(q.path("code").asText()));
        assertThat(practiceCodes).containsExactlyInAnyOrder("KPSS-OO-2024-GY-01", "KPSS-OO-2024-GK-01");
        assertThat(jdbc.queryForObject("SELECT track_id FROM study_sessions WHERE id=?", String.class, practice.path("id").asLong()))
                .isEqualTo("KPSS_ORTAOGRETIM");

        // Deneme planı ÖSYM dağılımını sınav tanımından okur; YKS testi KPSS'te istenemez.
        var plan = read(send(session, get("/api/exams/plan").param("examType", "KPSS_OO_GY"), null).andExpect(status().isOk()));
        assertThat(plan.path("timeLimitMinutes").asInt()).isEqualTo(65);
        var quotas = new ArrayList<String>();
        plan.path("subjects").forEach(s -> quotas.add(s.path("subject").asText() + "=" + s.path("target").asInt()));
        assertThat(quotas).containsExactly("Türkçe=30", "Matematik=30");
        send(session, get("/api/exams/plan").param("examType", "TYT"), null).andExpect(status().isBadRequest());

        // YKS'e dönünce yalnız YKS içeriği ve YKS geçmişi kalır.
        send(session, put("/api/exam-tracks/current"), "{\"trackId\":\"YKS\"}").andExpect(status().isOk());
        assertThat(codes(read(send(session, get("/api/questions"), null)))).containsExactly("TYT-1");
        assertThat(read(send(session, get("/api/study-sessions"), null)).path("totalElements").asInt()).isZero();
        var yksExams = new HashSet<String>();
        read(send(session, get("/api/learning-resources/metadata"), null)).path("categories").forEach(c -> yksExams.add(c.path("exam").asText()));
        assertThat(yksExams).doesNotContain("KPSS_OO_GY", "KPSS_OO_GK");
    }

    /** KPSS düzeyleri ders kimliklerini paylaşır (kpss-turkce) ama sorular, konular, deneme planı ve geçmiş düzeye göre ayrılır. */
    @Test
    void kpssLevelsShareSubjectIdsButNotContent() throws Exception {
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')", RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", RUN);
        category("kpss-oo.turkce.tsa", "KPSS_OO_GY", "kpss-turkce", "Türkçe", "Sözcükte Anlam");
        category("kpss-ls.turkce.tsa", "KPSS_LS_GY", "kpss-turkce", "Türkçe", "Sözcükte Anlam");
        category("kpss-ls.tarih.tr1", "KPSS_LS_GK", "kpss-tarih", "Tarih", "İslamiyet Öncesi Türk Devletleri");
        question("KPSS-OO-2024-GY-01", ExamType.KPSS_OO_GY, "Türkçe", "kpss-turkce", "kpss-oo.turkce.tsa");
        question("KPSS-LS-2022-GY-01", ExamType.KPSS_LS_GY, "Türkçe", "kpss-turkce", "kpss-ls.turkce.tsa");
        question("KPSS-LS-2022-GK-01", ExamType.KPSS_LS_GK, "Tarih", "kpss-tarih", "kpss-ls.tarih.tr1");
        user("lisans_ogrenci", Role.USER);
        MockHttpSession session = login("lisans_ogrenci", "Sifre1234");
        send(session, put("/api/exam-tracks/current"), "{\"trackId\":\"KPSS_LISANS\"}").andExpect(status().isOk());

        assertThat(codes(read(send(session, get("/api/questions"), null))))
                .containsExactlyInAnyOrder("KPSS-LS-2022-GY-01", "KPSS-LS-2022-GK-01");
        assertThat(codes(read(send(session, get("/api/questions").param("subject", "Türkçe"), null))))
                .containsExactly("KPSS-LS-2022-GY-01");
        assertThat(codes(read(send(session, get("/api/questions").param("categoryId", "kpss-oo.turkce.tsa"), null)))).isEmpty();
        var exams = new HashSet<String>();
        read(send(session, get("/api/learning-resources/metadata"), null)).path("categories").forEach(c -> exams.add(c.path("exam").asText()));
        assertThat(exams).containsExactlyInAnyOrder("KPSS_LS_GY", "KPSS_LS_GK");

        var plan = read(send(session, get("/api/exams/plan").param("examType", "KPSS_LS_GK"), null).andExpect(status().isOk()));
        assertThat(plan.path("timeLimitMinutes").asInt()).isEqualTo(65);
        var quotas = new ArrayList<String>();
        plan.path("subjects").forEach(s -> quotas.add(s.path("subject").asText() + "=" + s.path("target").asInt()));
        assertThat(quotas).containsExactly("Tarih=27", "Coğrafya=18", "Vatandaşlık=9", "Güncel Bilgiler=6");
        send(session, get("/api/exams/plan").param("examType", "KPSS_OO_GY"), null).andExpect(status().isBadRequest());

        var body = Map.of("questionCount", 2, "clientRequestId", UUID.randomUUID().toString());
        var practice = read(send(session, post("/api/study-sessions"), json.writeValueAsString(body)).andExpect(status().isCreated()));
        assertThat(jdbc.queryForObject("SELECT track_id FROM study_sessions WHERE id=?", String.class, practice.path("id").asLong()))
                .isEqualTo("KPSS_LISANS");

        // Ortaöğretim'e geçince Lisans soruları ve Lisans geçmişi görünmez.
        send(session, put("/api/exam-tracks/current"), "{\"trackId\":\"KPSS_ORTAOGRETIM\"}").andExpect(status().isOk());
        assertThat(codes(read(send(session, get("/api/questions"), null)))).containsExactly("KPSS-OO-2024-GY-01");
        assertThat(read(send(session, get("/api/study-sessions"), null)).path("totalElements").asInt()).isZero();
    }

    /** Kaynak envanteri ve eksik kayıtları yalnız tanımlı rol/durum/tür değerlerini ve tutarlı sayıları kabul eder. */
    @Test
    void sourceInventoryRejectsInconsistentRows() {
        jdbc.update("INSERT INTO exam_source_documents(track_id,path,sha256,role,status,question_count,active_count,note) "
                + "VALUES ('KPSS_LISANS','a.pdf',repeat('0',64),'SORU_KITAPCIGI','ISLENDI',2,1,'test')");
        jdbc.update("INSERT INTO exam_coverage_gaps(track_id,exam_year,exam_type,gap_type,expected_count,available_count,question_numbers,note) "
                + "VALUES ('KPSS_LISANS',2016,'KPSS_LS_GY','CEVAP_BEKLIYOR',60,60,'{1,2}','test')");
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO exam_source_documents(track_id,path,sha256,role,status,question_count,active_count,note) "
                + "VALUES ('KPSS_LISANS','b.pdf',repeat('0',64),'SORU_KITAPCIGI','ISLENDI',1,2,'aktif soru sayısı toplamı aşamaz')"));
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO exam_coverage_gaps(track_id,exam_year,exam_type,gap_type,expected_count,available_count,note) "
                + "VALUES ('KPSS_LISANS',2016,'KPSS_LS_GK','BILINMIYOR',60,0,'tanımsız tür')"));
        jdbc.update("DELETE FROM exam_source_documents WHERE path='a.pdf'");
        jdbc.update("DELETE FROM exam_coverage_gaps WHERE note='test'");
    }
}
