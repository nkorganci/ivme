package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ContentReviewFlowTest extends TestBase {
    @Override protected boolean catalogFixtureRequired() { return true; }
    private static final String API = "/api/operator/content-review";
    @MockitoBean ImageStorage images;

    @Test void unpublishedCatalogCannotBeReplacedByPackagedCategoriesOrPdfLabels() throws Exception {
        user("unpublished_teacher",Role.OPERATOR);var session=login("unpublished_teacher","Sifre1234");
        jdbc.update("DELETE FROM learning_catalog.current_run");
        var metadata=read(send(session,get(API+"/catalog"),null).andExpect(status().isOk()));
        var ids=new java.util.ArrayList<String>();metadata.path("categories").forEach(c->ids.add(c.path("id").asText()));
        assertThat(ids).doesNotContain("tyt.fizik.basinc");
        var detail=read(send(session,get(API+"/item").param("key","pdf:422"),null).andExpect(status().isOk()));
        assertThat(detail.path("item").has("automaticLabels")).isFalse();
        assertThat(detail.path("labels").size()).isZero();
        assertThat(detail.path("status").asText()).isEqualTo("PENDING");
    }

    @Test void pdfReviewAndExportUsePublishedDatabaseLabels() throws Exception {
        user("db_pdf_teacher",Role.OPERATOR);var session=login("db_pdf_teacher","Sifre1234");
        String original=jdbc.queryForObject("SELECT data::text FROM learning_catalog.current_items WHERE item_key='pdf:422'",String.class);
        try {
            jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,difficulty}','\"ZOR\"') WHERE run_key=(SELECT run_key FROM learning_catalog.current_run) AND item_key='pdf:422'");
            var detail=read(send(session,get(API+"/item").param("key","pdf:422"),null).andExpect(status().isOk()));
            assertThat(detail.path("labels").path("difficulty").asText()).isEqualTo("ZOR");
            var exported=read(send(session,get(API+"/export"),null).andExpect(status().isOk()));
            var matches=new java.util.ArrayList<com.fasterxml.jackson.databind.JsonNode>();
            exported.path("automaticPdfLabels").forEach(i->{if("pdf:422".equals(i.path("key").asText()))matches.add(i);});
            assertThat(matches).singleElement().satisfies(i->assertThat(i.path("automaticLabels").path("difficulty").asText()).isEqualTo("ZOR"));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM content_reviews",Long.class)).isZero();
        } finally {
            jdbc.update("UPDATE learning_catalog.items SET data=?::jsonb WHERE run_key=(SELECT run_key FROM learning_catalog.current_run) AND item_key='pdf:422'",original);
        }
    }

    @Test
    void everyPdfHasPersistentHeadingLabelsWithoutInventingTeacherDecisionsOrLabellingQuestions() throws Exception {
        user("pdf_operator", Role.OPERATOR);
        var session = login("pdf_operator", "Sifre1234");
        var question = question("PDF-LABEL-UNCHANGED", "Fizik", "A");
        var list = read(send(session, get(API).param("subject", "all").param("kind", "PDF"), null).andExpect(status().isOk()));
        assertThat(list.path("totalElements").asInt()).isGreaterThan(2600);
        assertThat(list.path("labelCounts").path("unlabelled").asInt()).isZero();
        assertThat(list.path("labelCounts").path("labelled").asInt()).isEqualTo(list.path("totalElements").asInt());
        for (var item : list.path("content")) {
            assertThat(item.path("labels").path("assignments").size()).isPositive();
            assertThat(item.path("reviewStatus").asText()).isEqualTo("PENDING");
        }
        var empty = read(send(session, get(API).param("subject", "all").param("kind", "PDF").param("labelState", "UNLABELLED"), null));
        assertThat(empty.path("totalElements").asInt()).isZero();
        var movement = read(send(session, get(API).param("subject", "fizik").param("kind", "PDF").param("topic", "Hareket ve kuvvet"), null));
        assertThat(movement.path("totalElements").asInt()).isPositive();
        var detail = read(send(session, get(API + "/item").param("key", "pdf:422"), null));
        assertThat(detail.path("item").path("topic").asText()).isEqualTo("Hareket ve kuvvet");
        assertThat(detail.path("item").path("automaticLabels").path("evidence").size()).isPositive();
        assertThat(detail.path("labels").path("assignments").size()).isPositive();
        assertThat(detail.path("review").isNull()).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM content_reviews", Long.class)).isZero();
        assertThat(questions.findById(question.getId()).orElseThrow().getTopic()).isEqualTo("Konu");
    }

    private ObjectNode decision(JsonNode detail, String verdict) {
        var body = json.createObjectNode();
        body.put("key", detail.path("item").path("key").asText());
        body.put("fingerprint", detail.path("fingerprint").asText());
        body.put("revision", detail.path("review").path("revision").asInt(0));
        body.put("verdict", verdict); body.put("note", "Öğretmen tarafından kaynak kontrol edildi.");
        var checks = body.putObject("checks");
        if ("QUESTION".equals(detail.path("item").path("kind").asText())) {
            for (String field : new String[]{"branch", "topic", "answer", "image"}) checks.put(field, "OK");
        } else for (String field : new String[]{"branch", "topic", "structure"}) checks.put(field, "OK");
        for (String field : new String[]{"proposedExam", "proposedSubject", "proposedTopic", "proposedSubtopic", "proposedAnswer", "proposedUrl"}) body.put(field, "");
        body.put("difficulty", "ORTA"); body.put("contentFormat", "QUESTION".equals(detail.path("item").path("kind").asText()) ? "SORU" : "UYGULANMAZ");
        body.putArray("skills"); body.putArray("grades");
        String category = detail.path("item").path("suggestedCategoryIds").size() > 0 ? detail.path("item").path("suggestedCategoryIds").get(0).asText()
                : detail.path("item").path("topicId").asText("tyt.fizik.basinc");
        body.putArray("assignments").addObject().put("categoryId",category).put("relation","PRIMARY");
        return body;
    }

    @Test
    void persistsVersionedTeacherDecisionsWithoutChangingSourceAndRejectsLostUpdates() throws Exception {
        user("fizik_hoca", Role.OPERATOR);
        var session = login("fizik_hoca", "Sifre1234");
        var list = read(send(session, get(API), null).andExpect(status().isOk()));
        String key = list.path("content").get(0).path("key").asText();
        var detail = read(send(session, get(API + "/item").param("key", key), null).andExpect(status().isOk()));
        var body = decision(detail, "APPROVE");
        var saved = read(send(session, put(API), body.toString()).andExpect(status().isOk()));
        assertThat(saved.path("status").asText()).isEqualTo("APPROVE");
        assertThat(saved.path("history").size()).isEqualTo(1);
        send(session, put(API), body.toString()).andExpect(status().isConflict());
        body = decision(saved, "FIX"); body.put("note", "Başlığı iki alt konuya bölün.");
        var second = read(send(session, put(API), body.toString()).andExpect(status().isOk()));
        assertThat(second.path("history").size()).isEqualTo(2);
        assertThat(second.path("item")).isEqualTo(detail.path("item"));
        var exported = read(send(session, get(API + "/export"), null).andExpect(status().isOk()));
        assertThat(exported.path("reviews").size()).isEqualTo(1);
        assertThat(exported.path("history").size()).isEqualTo(2);
        assertThat(exported.path("reviews").get(0).path("currentStatus").asText()).isEqualTo("FIX");
        assertThat(exported.path("reviews").get(0).path("reviewer").asText()).isEqualTo("fizik_hoca");
    }

    @Test
    void changedImageOrQuestionMetadataRequiresNewReviewAndOtherBranchesAreExcluded() throws Exception {
        user("fizik_hoca", Role.OPERATOR);
        var session = login("fizik_hoca", "Sifre1234");
        var q = question("PHYSICS-1", "Fizik", "A");
        question("CHEMISTRY-1", "Kimya", "B");
        when(images.load(q.getImage())).thenReturn(new ByteArrayResource(new byte[]{1,2,3}));
        String key = "question:" + q.getCode();
        var detail = read(send(session, get(API + "/item").param("key", key), null).andExpect(status().isOk()));
        var saved = read(send(session, put(API), decision(detail, "APPROVE").toString()).andExpect(status().isOk()));
        when(images.load(q.getImage())).thenReturn(new ByteArrayResource(new byte[]{9,8,7}));
        send(session, put(API), decision(saved, "FIX").toString()).andExpect(status().isConflict());
        var changed = read(send(session, get(API + "/item").param("key", key), null).andExpect(status().isOk()));
        assertThat(changed.path("status").asText()).isEqualTo("STALE");
        jdbc.update("UPDATE questions SET topic='Yeni konu' WHERE id=?", q.getId());
        send(session, put(API), decision(changed, "FIX").toString()).andExpect(status().isConflict());
        var list = read(send(session, get(API).param("kind", "QUESTION").param("bank","CIKMIS"), null).andExpect(status().isOk()));
        assertThat(list.path("totalElements").asInt()).isEqualTo(1);
        assertThat(list.path("counts").path("STALE").asInt()).isEqualTo(1);
        send(session, get(API + "/item").param("key", "question:CHEMISTRY-1"), null).andExpect(status().isOk());
        assertThat(questions.findById(q.getId()).orElseThrow().getCorrectAnswer()).isEqualTo("A");
    }

    @Test
    void requiresCompleteConsistentChecksAndOperatorAuthority() throws Exception {
        user("hoca", Role.OPERATOR); user("student", Role.USER); user("admin", Role.ADMIN);
        var session = login("hoca", "Sifre1234");
        var detail = read(send(session, get(API + "/item").param("key", "topic:tyt.fizik.basinc"), null));
        var body = decision(detail, "APPROVE"); body.withObject("checks").put("structure", "UNSURE");
        send(session, put(API), body.toString()).andExpect(status().isBadRequest());
        body = decision(detail, "APPROVE"); body.put("note", "");
        send(session, put(API), body.toString()).andExpect(status().isBadRequest());
        body = decision(detail, "APPROVE"); body.put("proposedTopic", "Yeni başlık");
        send(session, put(API), body.toString()).andExpect(status().isBadRequest());
        body = decision(detail, "WRONG_BRANCH");
        body.putArray("assignments");
        send(session, put(API), body.toString()).andExpect(status().isBadRequest());
        for (var other : new String[]{"student", "admin"}) {
            var unauthorized = login(other, "Sifre1234");
            send(unauthorized, get(API), null).andExpect(status().isForbidden());
            send(unauthorized, get(API + "/export"), null).andExpect(status().isForbidden());
            send(unauthorized, put(API), decision(detail, "APPROVE").toString()).andExpect(status().isForbidden());
        }
        mvc.perform(get(API)).andExpect(status().isUnauthorized());
    }

    @Test
    void multipleBranchesAndTopicsShareValidatedDifficultyAndFilters() throws Exception {
        user("multi_hoca", Role.OPERATOR);
        var session = login("multi_hoca", "Sifre1234");
        var q = question("MULTI-1", "Fizik", "A");
        when(images.load(q.getImage())).thenReturn(new ByteArrayResource(new byte[]{1,2,3}));
        var detail = read(send(session, get(API + "/item").param("key", "question:MULTI-1"), null));
        var body = decision(detail,"APPROVE");
        body.put("difficulty","ZOR"); body.withArray("skills").add("YORUMLAMA");
        String ratio=jdbc.queryForObject("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' AND definition->>'exam'='TYT' AND definition->>'subjectId'='matematik' AND definition->>'topic'='Oran-Orantı'",String.class);
        body.withArray("assignments").addObject().put("categoryId",ratio).put("relation","PREREQUISITE");
        send(session, put(API),body.toString()).andExpect(status().isOk());
        var math = read(send(session,get(API).param("subject","matematik").param("kind","QUESTION").param("bank","CIKMIS").param("difficulty","ZOR").param("skill","YORUMLAMA"),null));
        assertThat(math.path("totalElements").asInt()).isEqualTo(1);
        assertThat(math.path("content").get(0).path("labels").path("assignments").size()).isEqualTo(2);
        assertThat(questions.findById(q.getId()).orElseThrow().getSubject()).isEqualTo("Fizik");
        var current = read(send(session,get(API+"/item").param("key","question:MULTI-1"),null));
        body=decision(current,"FIX"); body.put("difficulty","random");
        send(session,put(API),body.toString()).andExpect(status().isBadRequest());
        body=decision(current,"FIX"); body.withArray("assignments").addObject().put("categoryId","nonexistent").put("relation","PRIMARY");
        send(session,put(API),body.toString()).andExpect(status().isBadRequest());
    }

    @Test
    void writtenLessonExamplesAndAllBranchesUseTheSameCatalog() throws Exception {
        user("notes_hoca",Role.OPERATOR); var session=login("notes_hoca","Sifre1234");
        var metadata=read(send(session,get(API+"/catalog"),null).andExpect(status().isOk()));
        assertThat(metadata.path("branches").size()).isEqualTo(14);
        assertThat(metadata.path("labels").path("difficulty").path("KOLAY").asText()).isEqualTo("Kolay");
        var detail=read(send(session,get(API+"/item").param("key","note-question:tyt-turkce:sozcukte-anlam:practice"),null).andExpect(status().isOk()));
        assertThat(detail.path("item").path("choices").size()).isEqualTo(4);
        var saved=read(send(session,put(API),decision(detail,"APPROVE").toString()).andExpect(status().isOk()));
        assertThat(saved.path("status").asText()).isEqualTo("APPROVE");
        var list=read(send(session,get(API).param("kind","NOTE").param("subject","turkce"),null).andExpect(status().isOk()));
        assertThat(list.path("totalElements").asInt()).isGreaterThan(0);
    }
}
