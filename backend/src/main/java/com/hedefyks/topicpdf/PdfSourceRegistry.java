package com.hedefyks.topicpdf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Current YKS source coverage, grouped by PDF bytes rather than catalog aliases. */
@Service
public class PdfSourceRegistry {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public PdfSourceRegistry(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public boolean available() {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM learning_catalog.pdf_sources)", Boolean.class));
    }

    public boolean complete(String sourceSha256) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM learning_catalog.pdf_sources s WHERE s.source_sha256=?
                  AND ((s.coverage_state='VERIFIED' AND s.expected_questions>0) OR (s.coverage_state='NO_QUESTIONS' AND s.expected_questions=0))
                  AND s.expected_questions=(SELECT coalesce(sum(greatest(cardinality(o.printed_numbers),1)),0)
                    FROM learning_catalog.pdf_question_occurrences o WHERE o.source_sha256=s.source_sha256 AND o.status='LINKED')
                  AND NOT EXISTS(SELECT 1 FROM learning_catalog.pdf_question_occurrences o
                    LEFT JOIN questions q ON q.code=o.question_code WHERE o.source_sha256=s.source_sha256
                    AND ((o.status<>'LINKED' AND NOT(o.status='EXCLUDED' AND o.evidence->>'scopeExclusion' IS NOT DISTINCT FROM 'OTHER_EXAM'))
                      OR (o.status='LINKED' AND o.evidence->>'sourceStamp' IS DISTINCT FROM extract(epoch FROM q.updated_at)::text)))
                  AND NOT EXISTS(SELECT 1 FROM learning_catalog.pdf_question_occurrences o
                    JOIN learning_catalog.question_source_issues i ON i.question_code=o.question_code
                    WHERE o.source_sha256=s.source_sha256 AND i.status='QUARANTINED'))
                """, Boolean.class, sourceSha256));
    }

    private ObjectNode parse(String json) {
        try { return (ObjectNode) mapper.readTree(json); }
        catch (Exception exception) { throw new IllegalStateException("PDF kaynak kaydı okunamadı.", exception); }
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> list() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map<String, Object> record : jdbc.queryForList("""
                WITH aliases AS (
                  SELECT source_sha256,min(catalog_id) catalog_id,array_agg(catalog_id ORDER BY catalog_id) catalog_ids
                  FROM learning_catalog.pdf_source_catalog GROUP BY source_sha256
                ), linked AS (
                  SELECT o.source_sha256,
                    count(DISTINCT o.question_code) FILTER(WHERE o.status='LINKED' AND q.active) question_count,
                    count(*) FILTER(WHERE o.status='CANDIDATE') candidate_count,
                    count(*) FILTER(WHERE o.status='NEEDS_REVIEW' OR (o.status='EXCLUDED' AND o.evidence->>'scopeExclusion' IS DISTINCT FROM 'OTHER_EXAM')) review_count,
                    count(*) FILTER(WHERE o.status='EXCLUDED' AND o.evidence->>'scopeExclusion'='OTHER_EXAM') excluded_count,
                    coalesce(sum(greatest(cardinality(o.printed_numbers),1)) FILTER(WHERE o.status='LINKED'),0) covered_slots,
                    count(*) FILTER(WHERE o.status='LINKED' AND o.evidence->>'sourceStamp' IS DISTINCT FROM extract(epoch FROM q.updated_at)::text) stale_count
                  FROM learning_catalog.pdf_question_occurrences o
                  LEFT JOIN questions q ON q.code=o.question_code AND q.exam_type IN ('TYT','AYT')
                  GROUP BY o.source_sha256
                ), issues AS (
                  SELECT o.source_sha256,count(DISTINCT i.question_code) issue_count
                  FROM learning_catalog.pdf_question_occurrences o
                  JOIN learning_catalog.question_source_issues i ON i.question_code=o.question_code AND i.status='QUARANTINED'
                  GROUP BY o.source_sha256
                )
                SELECT (r.data-'proof'-'relativePath'-'sourceScope')::text data,s.source_sha256,s.page_count,s.content_format,s.coverage_state,
                  s.expected_questions,s.coverage_evidence::text,a.catalog_ids,
                  coalesce(l.question_count,0) question_count,coalesce(l.candidate_count,0) candidate_count,
                  coalesce(l.review_count,0) review_count,coalesce(l.covered_slots,0) covered_slots,
                  coalesce(l.excluded_count,0) excluded_count,
                  coalesce(l.stale_count,0) stale_count,
                  coalesce(i.issue_count,0) issue_count,
                  ar.source_sha256 IS NOT NULL archived
                FROM aliases a JOIN learning_catalog.pdf_sources s USING(source_sha256)
                JOIN learning_catalog.pdf_audit_rows r ON r.catalog_id=a.catalog_id
                LEFT JOIN linked l USING(source_sha256)
                LEFT JOIN issues i USING(source_sha256)
                LEFT JOIN learning_catalog.pdf_archive ar USING(source_sha256)
                ORDER BY a.catalog_id
                """)) {
            ObjectNode node = parse((String) record.get("data"));
            boolean archived = Boolean.TRUE.equals(record.get("archived"));
            int expected = record.get("expected_questions") instanceof Number n ? n.intValue() : -1;
            long candidates = ((Number) record.get("candidate_count")).longValue();
            long reviews = ((Number) record.get("review_count")).longValue();
            long stale = ((Number) record.get("stale_count")).longValue();
            long issues = ((Number) record.get("issue_count")).longValue();
            boolean complete = "VERIFIED".equals(record.get("coverage_state")) && expected > 0
                    && ((Number) record.get("covered_slots")).longValue() == expected && candidates == 0 && reviews == 0 && stale == 0 && issues == 0;
            ObjectNode coverage = parse((String) record.get("coverage_evidence"));
            node.put("candidatePackageAvailable", coverage.path("candidatePackage").isTextual());
            node.put("questionCount", ((Number) record.get("question_count")).longValue());
            node.put("candidateCount", candidates);
            node.put("reviewCount", reviews);
            node.put("sourceIssueCount", issues);
            node.put("pages", ((Number) record.get("page_count")).intValue());
            node.put("sha256", (String) record.get("source_sha256"));
            node.put("archiveState", archived ? "Arşivde" : "Aktif");
            node.put("available", !archived);
            node.put("allQuestionsTaken", complete);
            long excluded=((Number)record.get("excluded_count")).longValue();
            node.put("excludedOtherExamCount",excluded);
            boolean noQuestionsVerified="NO_QUESTIONS".equals(record.get("coverage_state")) && expected==0
                    && ((Number)record.get("covered_slots")).longValue()==0 && reviews==0 && candidates==0 && stale==0 && issues==0;
            node.put("extractionComplete",complete || noQuestionsVerified);
            node.put("completionLabel", complete ? "Evet" : noQuestionsVerified ? excluded>0 ? "YKS sorusu yok" : "Soru yok" : "Doğrulanmadı");
            if (expected >= 0) node.put("expectedQuestions", expected); else node.putNull("expectedQuestions");
            node.put("processingLabel", complete ? "İşlendi (tam)" : noQuestionsVerified ? "İşlendi (soru yok)" : candidates > 0 ? "Eksik / aday hazır"
                    : node.path("questionCount").asLong() > 0 ? "Eşleşti / tamlık açık" : "İnceleme bekliyor");
            node.put("status", issues > 0 ? "Eksik soru içeriği var" : stale > 0 ? "Soru kaynağı değişmiş" : complete ? "Tam kapsam doğrulandı" : noQuestionsVerified ? "YKS sorusu içermiyor"
                    : node.path("questionCount").asLong() > 0 ? "Kanıtlı banka sorusu var" : "PDF–soru bağı doğrulanmadı");
            String format = (String) record.get("content_format");
            if ("KARMA".equals(format)) {
                node.put("category", "Ders notu + soru");
                node.put("title", node.path("title").asText() + " · Ders notu ve sorular");
            } else if ("KONU_ANLATIMI".equals(format)) node.put("category", "Ders notu");
            node.set("coverageEvidence", coverage);
            rows.add(mapper.convertValue(node, Map.class));
        }
        // Unavailable/video-only catalog entries remain explicit, without fabricated PDF identities.
        for (String json : jdbc.queryForList("""
                SELECT (r.data-'proof'-'relativePath'-'sourceScope')::text FROM learning_catalog.pdf_audit_rows r
                WHERE NOT EXISTS(SELECT 1 FROM learning_catalog.pdf_source_catalog c WHERE c.catalog_id=r.catalog_id)
                ORDER BY catalog_id
                """, String.class)) {
            ObjectNode node = parse(json);
            node.put("completionLabel", "Dosya yok");
            node.put("allQuestionsTaken", false);
            node.put("processingLabel", "Kaynak bekleniyor");
            node.put("archiveState", "Aktif");
            rows.add(mapper.convertValue(node, Map.class));
        }
        Map<Integer, String> work = new LinkedHashMap<>();
        Map<String, String> sourceWork = new LinkedHashMap<>();
        jdbc.queryForList("SELECT catalog_id,action FROM learning_catalog.pdf_work_queue").forEach(r ->
                work.put(((Number) r.get("catalog_id")).intValue(), (String) r.get("action")));
        jdbc.queryForList("SELECT source_sha256,action FROM learning_catalog.pdf_work_queue").forEach(r ->
                sourceWork.put((String) r.get("source_sha256"), (String) r.get("action")));
        rows.forEach(r -> r.put("workAction", sourceWork.getOrDefault((String) r.get("sha256"),
                work.getOrDefault(((Number) r.get("id")).intValue(), ""))));
        Map<String, Object> summary = jdbc.queryForMap("""
                SELECT count(*) bank_total,
                  count(*) FILTER(WHERE EXISTS(SELECT 1 FROM learning_catalog.pdf_question_occurrences o
                    WHERE o.question_code=q.code AND o.status='LINKED')) pdf_linked,
                  count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM learning_catalog.pdf_question_occurrences o
                    WHERE o.question_code=q.code AND o.status='LINKED')) source_review,
                  count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM learning_catalog.question_source_registry r
                    WHERE r.question_code=q.code AND r.source_stamp=extract(epoch FROM q.updated_at)::text)) changed_sources
                FROM questions q WHERE q.active AND q.exam_type IN ('TYT','AYT')
                """);
        var result = new LinkedHashMap<String,Object>();
        result.putAll(Map.of("pdfs", rows, "liveQuestionCount", summary.get("bank_total"),
                "uniquePdfQuestionCount", summary.get("pdf_linked"), "sourceReviewQuestionCount", summary.get("source_review"),
                "physicalPdfCount", jdbc.queryForObject("SELECT count(*) FROM learning_catalog.pdf_source_files", Long.class),
                "uniquePdfCount", jdbc.queryForObject("SELECT count(*) FROM learning_catalog.pdf_sources", Long.class),
                "current", ((Number) summary.get("changed_sources")).longValue() == 0,
                "auditedAt", jdbc.queryForObject("SELECT max(recorded_at)::text FROM learning_catalog.pdf_sources", String.class)));
        result.put("quarantinedQuestionCount",jdbc.queryForObject("""
            SELECT count(DISTINCT i.question_code) FROM learning_catalog.question_source_issues i
            JOIN questions q ON q.code=i.question_code WHERE i.status='QUARANTINED' AND q.exam_type IN ('TYT','AYT')
            """,Long.class));
        return result;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public JsonNode proof(int catalogId, JsonNode original) {
        List<String> records = jdbc.queryForList("""
                SELECT jsonb_build_object('code',o.question_code,'bank',q.bank,'page',o.page_number,
                  'matchType',min(coalesce(o.evidence->>'matchType',o.evidence->>'duplicateMatch','SOURCE_IDENTITY')),
                  'sourceRef',min(coalesce(o.evidence->>'reference',
                    (o.evidence->>'sourceFile')||'#page='||o.page_number::text,o.locator_key)))::text
                FROM learning_catalog.pdf_source_catalog c
                JOIN learning_catalog.pdf_question_occurrences o USING(source_sha256)
                JOIN questions q ON q.code=o.question_code
                WHERE c.catalog_id=? AND o.status='LINKED' AND q.active AND q.exam_type IN ('TYT','AYT')
                GROUP BY o.question_code,q.bank,o.page_number
                ORDER BY o.page_number,o.question_code
                """, String.class, catalogId);
        ObjectNode result = original.deepCopy();
        List<Map<String, Object>> sources = jdbc.queryForList("""
                SELECT s.source_sha256,s.expected_questions,s.coverage_state,s.coverage_evidence::text
                FROM learning_catalog.pdf_source_catalog c JOIN learning_catalog.pdf_sources s USING(source_sha256)
                WHERE c.catalog_id=?
                """, catalogId);
        if (!sources.isEmpty()) {
            Map<String, Object> source = sources.getFirst();
            result.put("sha256", (String) source.get("source_sha256"));
            result.put("hashVerified", true);
            result.put("coverageState", (String) source.get("coverage_state"));
            result.set("coverageEvidence", parse((String) source.get("coverage_evidence")));
            if (source.get("expected_questions") instanceof Number expected) result.put("expectedQuestions", expected.intValue());
        }
        var proof = mapper.createArrayNode();
        records.forEach(record -> proof.add(parse(record)));
        result.set("proof", proof);
        result.put("questionCount", records.stream().map(r -> parse(r).path("code").asText()).distinct().count());
        result.put("candidateCount",jdbc.queryForObject("""
            SELECT count(*) FROM learning_catalog.pdf_question_occurrences o
            JOIN learning_catalog.pdf_source_catalog c USING(source_sha256) WHERE c.catalog_id=? AND o.status='CANDIDATE'
            """,Long.class,catalogId));
        return result;
    }
}
