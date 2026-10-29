package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hedefyks.topicpdf.PdfSourceRegistry;
import com.hedefyks.user.Role;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

class PdfSourceRegistryTest extends TestBase {
    @Autowired PdfSourceRegistry registry;

    @Test
    void reviewedAcceptancePublishesAtomicallyAndRejectsAStaleReplay() throws Exception {
        var root=java.nio.file.Path.of("").toAbsolutePath().getParent();
        var python=root.getParent().resolve(".venv/Scripts/python.exe");
        var log=java.nio.file.Files.createTempFile("ivme-pdf-accept-test-",".log");
        try {
            var process=new ProcessBuilder(python.toString(),"-X","utf8","testler/pdf-acceptance-db-probe.py")
                    .directory(root.toFile()).redirectErrorStream(true).redirectOutput(log.toFile()).start();
            assertThat(process.waitFor(60,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThat(process.exitValue()).withFailMessage(java.nio.file.Files.readString(log)).isZero();
        } finally { java.nio.file.Files.deleteIfExists(log); }
    }

    @BeforeEach
    void clearRegistryFixture() {
        jdbc.execute("TRUNCATE learning_catalog.pdf_sources CASCADE");
        jdbc.update("DELETE FROM learning_catalog.pdf_audit_rows WHERE catalog_id BETWEEN 900001 AND 900003");
    }

    private void source(String hash, int expected, int... aliases) {
        jdbc.update("""
            INSERT INTO learning_catalog.pdf_sources(source_sha256,page_count,extractor_version,observations,
                content_format,coverage_state,expected_questions)
            VALUES (?,3,'fixture','{}','TEST','VERIFIED',?)
            """, hash, expected);
        for (int id : aliases) {
            jdbc.update("INSERT INTO learning_catalog.pdf_audit_rows VALUES (?,?::jsonb,now())", id,
                    "{\"id\":" + id + ",\"title\":\"Fixture\",\"exam\":\"TYT\",\"subject\":\"Türkçe\",\"category\":\"Soru\",\"candidateCount\":0}");
            jdbc.update("INSERT INTO learning_catalog.pdf_source_catalog VALUES (?,?)", id, hash);
        }
    }

    private void occurrence(String hash, String code) {
        jdbc.update("""
            INSERT INTO learning_catalog.pdf_question_occurrences
            SELECT ?,?,1,ARRAY[1],code,'LINKED',jsonb_build_object('sourceStamp',extract(epoch FROM updated_at)::text)
            FROM questions WHERE code=?
            """, hash, code, code);
    }

    @SuppressWarnings("unchecked")
    @Test
    void aliasesAndRepeatedQuestionsHaveSeparateDocumentAndUniqueBankCounts() {
        question("registry-q1", "Türkçe", "A");
        question("registry-q2", "Türkçe", "B");
        jdbc.update("""
            INSERT INTO questions(code,exam_type,subject,image,correct_answer)
            VALUES ('registry-kpss','KPSS_OO_GY','Türkçe','test.webp','A')
            """);
        String first = "a".repeat(64), second = "b".repeat(64);
        source(first, 2, 900001, 900002);
        source(second, 1, 900003);
        occurrence(first, "registry-q1");
        occurrence(first, "registry-q2");
        occurrence(second, "registry-q1");
        assertThat(registry.complete(first)).isTrue();
        jdbc.update("""
            INSERT INTO learning_catalog.pdf_question_occurrences VALUES
              (?,'other-exam',2,ARRAY[3],NULL,'EXCLUDED','{"scopeExclusion":"OTHER_EXAM"}')
            """,first);
        assertThat(registry.complete(first)).isTrue();
        jdbc.update("UPDATE learning_catalog.pdf_question_occurrences SET evidence='{}' WHERE locator_key='other-exam'");
        assertThat(registry.complete(first)).isFalse();
        assertThat(((List<Map<String,Object>>)registry.list().get("pdfs")).getFirst().get("allQuestionsTaken")).isEqualTo(false);
        jdbc.update("""
            UPDATE learning_catalog.pdf_question_occurrences SET evidence='{"scopeExclusion":"OTHER_EXAM"}'
            WHERE locator_key='other-exam'
            """);
        Map<String, Object> response = registry.list();
        List<Map<String, Object>> rows = (List<Map<String, Object>>) response.get("pdfs");
        assertThat(rows).hasSize(2);
        assertThat(((Number) response.get("liveQuestionCount")).intValue()).isEqualTo(2);
        assertThat(((Number) response.get("uniquePdfQuestionCount")).intValue()).isEqualTo(2);
        assertThat(rows.stream().mapToLong(r -> ((Number) r.get("questionCount")).longValue()).sum()).isEqualTo(3);
        assertThat(rows).allSatisfy(r -> assertThat(r.get("allQuestionsTaken")).isEqualTo(true));
        assertThat(registry.proof(900001,json.createObjectNode()).path("proof").get(0).path("sourceRef").asText())
            .isNotBlank();
        jdbc.update("""
            INSERT INTO learning_catalog.question_source_issues
              (question_code,issue_code,source_image_sha256,status,previous_active,evidence)
            VALUES ('registry-q1','SOURCE_QUESTION_BODY_MISSING',?,'QUARANTINED',true,'{}')
            ""","e".repeat(64));
        assertThat(registry.complete(first)).isFalse();
        assertThat((List<Map<String,Object>>)registry.list().get("pdfs"))
            .allSatisfy(r -> assertThat(r.get("allQuestionsTaken")).isEqualTo(false));
        jdbc.update("UPDATE learning_catalog.question_source_issues SET status='RESOLVED' WHERE question_code='registry-q1'");
        assertThat(registry.complete(first)).isTrue();
        jdbc.update("UPDATE questions SET updated_at=updated_at+interval '1 second' WHERE code='registry-q1'");
        List<Map<String, Object>> stale = (List<Map<String, Object>>) registry.list().get("pdfs");
        assertThat(stale).allSatisfy(r -> assertThat(r.get("allQuestionsTaken")).isEqualTo(false));
        assertThat(registry.complete(first)).isFalse();
    }

    @SuppressWarnings("unchecked")
    @Test
    void expectedQuestionCountAndPendingCandidatesPreventFalseCompletion() {
        question("registry-q1", "Türkçe", "A");
        String hash = "c".repeat(64);
        source(hash, 2, 900001);
        occurrence(hash, "registry-q1");
        jdbc.update("""
            INSERT INTO learning_catalog.pdf_question_occurrences VALUES
              (?,'unimported:2',2,ARRAY[2],NULL,'CANDIDATE','{}')
            """, hash);
        List<Map<String, Object>> rows = (List<Map<String, Object>>) registry.list().get("pdfs");
        assertThat(rows.getFirst().get("allQuestionsTaken")).isEqualTo(false);
        assertThat(((Number) rows.getFirst().get("candidateCount")).intValue()).isEqualTo(1);
        assertThat(registry.complete(hash)).isFalse();
    }

    @Test
    void catalogAliasesCannotScheduleTheSamePhysicalPdfTwice() {
        var operator=user("pdfoperator",Role.ADMIN);
        String hash="d".repeat(64);
        jdbc.update("INSERT INTO learning_catalog.pdf_work_queue(catalog_id,source_sha256,action,requested_by) VALUES (900001,?,'EXTRACT',?)",
                hash,operator.getId());
        assertThatThrownBy(()->jdbc.update("INSERT INTO learning_catalog.pdf_work_queue(catalog_id,source_sha256,action,requested_by) VALUES (900002,?,'EXTRACT',?)",
                hash,operator.getId())).isInstanceOf(DataIntegrityViolationException.class);
    }

    @SuppressWarnings("unchecked")
    @Test
    void verifiedEmptySourceNeedsNoSecondExtraction() {
        String hash="9".repeat(64);source(hash,1,900001);
        jdbc.update("UPDATE learning_catalog.pdf_sources SET coverage_state='NO_QUESTIONS',expected_questions=0 WHERE source_sha256=?",hash);
        assertThat(registry.complete(hash)).isTrue();
        Map<String,Object> row=((List<Map<String,Object>>)registry.list().get("pdfs")).getFirst();
        assertThat(row.get("extractionComplete")).isEqualTo(true);
        assertThat(row.get("allQuestionsTaken")).isEqualTo(false);
        assertThat(row.get("completionLabel")).isEqualTo("Soru yok");
        jdbc.update("INSERT INTO learning_catalog.pdf_question_occurrences VALUES (?,'new-candidate',1,ARRAY[1],NULL,'CANDIDATE','{}')",hash);
        assertThat(registry.complete(hash)).isFalse();
        Map<String,Object> pending=((List<Map<String,Object>>)registry.list().get("pdfs")).getFirst();
        assertThat(pending.get("completionLabel")).isEqualTo("Doğrulanmadı");
        assertThat(pending.get("extractionComplete")).isEqualTo(false);
    }
}
