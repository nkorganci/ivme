package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class PhysicsTopicReviewTest extends TestBase {
    @Override protected boolean catalogFixtureRequired() {return true;}
    private static final String API="/api/operator/content-review";

    @Test void topicOnlyDecisionUsesSharedHistoryWithoutApprovingContentAndRejectsOldRevision() throws Exception {
        user("topic_teacher",Role.OPERATOR);var session=login("topic_teacher","Sifre1234");
        var detail=read(send(session,get(API+"/item").param("key","topic:tyt.fizik.basinc"),null));
        var body=json.createObjectNode().put("key","topic:tyt.fizik.basinc")
            .put("fingerprint",detail.path("fingerprint").asText()).put("revision",0).put("note","");
        body.putArray("assignments").addObject().put("categoryId","tyt.fizik.madde-ve-ozellikleri").put("relation","PRIMARY");
        var saved=read(send(session,put(API+"/topics"),body.toString()).andExpect(status().isOk()));
        assertThat(saved.path("status").asText()).isEqualTo("FIX");
        assertThat(saved.path("review").path("decision").path("checks").path("structure").asText()).isEqualTo("UNSURE");
        assertThat(saved.path("labels").path("grades").get(0).asInt()).isEqualTo(9);
        assertThat(saved.path("labels").path("assignments").get(0).path("scopeStatus").asText()).isEqualTo("CONFIRMED");
        assertThat(saved.path("review").path("decision").path("topicSelectionOnly").asBoolean()).isTrue();
        assertThat(saved.path("history").size()).isEqualTo(1);
        send(session,put(API+"/topics"),body.toString()).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM content_review_history",Long.class)).isEqualTo(1);
    }

    @Test void topicOnlyDecisionRejectsLegacyCategoriesAndStudentWrite() throws Exception {
        user("topic_operator",Role.OPERATOR);var teacher=login("topic_operator","Sifre1234");
        var detail=read(send(teacher,get(API+"/item").param("key","topic:tyt.fizik.basinc"),null));
        var body=json.createObjectNode().put("key","topic:tyt.fizik.basinc")
            .put("fingerprint",detail.path("fingerprint").asText()).put("revision",0).put("note","");
        body.putArray("assignments").addObject().put("categoryId","tyt.fizik.optik-golge-ve-yansima").put("relation","PRIMARY");
        send(teacher,put(API+"/topics"),body.toString()).andExpect(status().isBadRequest());
        user("topic_student",Role.USER);var student=login("topic_student","Sifre1234");
        send(student,put(API+"/topics"),body.toString()).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM content_reviews",Long.class)).isZero();
    }

    @Test void legacySplitRetainsAnyWithinEachGroupAndAllBetweenGroups() {
        String request="""
            {"categoryIds":["tyt.fizik.aydinlanma-ve-golge","tyt.fizik.kuresel-aynalar"],"match":"ALL",
             "categoryGroups":[["tyt.fizik.aydinlanma-ve-golge","tyt.fizik.kuresel-aynalar"]]}
            """;
        // Exercise the migration's SQL expression independently of machine-label fixtures.
        Boolean match=jdbc.queryForObject("""
            SELECT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(?::jsonb->'categoryGroups') g
              WHERE NOT jsonb_exists_any('["tyt.fizik.kuresel-aynalar"]'::jsonb, ARRAY(SELECT jsonb_array_elements_text(g))))
            """,Boolean.class,request);
        assertThat(match).isTrue();
    }

    @Test void teacherTopicSelectionImmediatelyUpdatesLibraryQuestionFilterAndReviewQueue() throws Exception {
        String opticalUnit=jdbc.queryForObject("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' AND definition->>'exam'='TYT' AND definition->>'subjectId'='fizik' AND definition->>'topic'='Optik'",String.class);
        user("shared_topic_teacher",Role.OPERATOR);var session=login("shared_topic_teacher","Sifre1234");
        var question=question("PHYSICS-TOPIC-SHARED","Fizik","A");
        String run=jdbc.queryForObject("SELECT run_key FROM learning_catalog.current_run",String.class);
        String key="question:"+question.getCode();
        String stamp=jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,question.getId());
        var data=json.createObjectNode().put("key",key).put("kind","QUESTION").put("exam","TYT").put("subjectId","fizik")
            .put("subject","Fizik").put("questionCode",question.getCode()).put("sourceUpdatedAt",stamp).put("title",question.getCode())
            .put("studentVisible",true).put("availability","available");
        var labels=data.putObject("automaticLabels").put("difficulty","BELIRLENMEDI").put("contentFormat","SORU");
        labels.putArray("skills");labels.putArray("grades");
        labels.putArray("assignments").addObject().put("categoryId","system.fizik.tyt.konu-incelemesi").put("relation","PRIMARY");
        var manual=data.putObject("manualReview").put("status","NEEDS_MANUAL_REVIEW").put("code","LABEL_REVIEW")
            .put("label","Fizik konusu — seçim bekliyor").put("reason","Temel konu seçilmeli.");
        manual.putArray("reasons").add("PHYSICS_TOPIC_SELECTION_REQUIRED");manual.putArray("pages");
        jdbc.update("""
            INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
            VALUES (?,?,'QUESTION','TYT','fizik',true,?::jsonb,ARRAY['system.fizik.tyt.konu-incelemesi'],ARRAY['fizik'],ARRAY['TYT'])
            ON CONFLICT(run_key,item_key) DO UPDATE SET data=excluded.data
            """,run,key,data.toString());
        try {
            assertThat(read(send(session,get(API).param("kind","QUESTION").param("labelState","PHYSICS_REVIEW"),null)).path("totalElements").asInt()).isEqualTo(1);
            var detail=read(send(session,get(API+"/item").param("key",key),null));
            var body=json.createObjectNode().put("key",key).put("fingerprint",detail.path("fingerprint").asText()).put("revision",0).put("note","");
            body.putArray("assignments").addObject().put("categoryId",opticalUnit).put("relation","PRIMARY");
            send(session,put(API+"/topics"),body.toString()).andExpect(status().isOk());
            assertThat(read(send(session,get(API).param("kind","QUESTION").param("labelState","PHYSICS_REVIEW"),null)).path("totalElements").asInt()).isZero();
            user("shared_topic_reader",Role.USER);var reader=login("shared_topic_reader","Sifre1234");
            var library=read(send(reader,get("/api/learning-resources").param("kind","QUESTION")
                .param("categoryId",opticalUnit).param("includeCandidates","false"),null).andExpect(status().isOk()));
            assertThat(library.path("totalElements").asInt()).isEqualTo(1);
            assertThat(library.path("content").get(0).has("manualReview")).isFalse();
            assertThat(read(send(reader,get("/api/learning-resources").param("kind","QUESTION")
                .param("manualReviewOnly","true"),null)).path("totalElements").asInt()).isZero();
            var count=read(send(reader,get("/api/questions/category-counts").param("includeCandidates","false"),null).andExpect(status().isOk()));
            assertThat(count.path(opticalUnit).asInt()).isEqualTo(1);
            var presented=read(send(reader,get("/api/questions/code/"+question.getCode()),null).andExpect(status().isOk()));
            assertThat(presented.path("topic").asText()).isEqualTo("Optik");
            var questionList=read(send(reader,get("/api/questions").param("categoryId",opticalUnit),null).andExpect(status().isOk()));
            assertThat(questionList.path("content").get(0).path("topic").asText()).isEqualTo("Optik");
            var named=read(send(reader,get("/api/questions/availability").param("subject","Fizik")
                .param("topic","Optik").param("includeCandidates","false"),null).andExpect(status().isOk()));
            assertThat(named.path("total").asInt()).isEqualTo(1);
            var facets=read(send(reader,get("/api/questions/filters"),null).andExpect(status().isOk()));
            assertThat(facets.get(0).path("topic").asText()).isEqualTo("Optik");
            assertThat(questions.findById(question.getId()).orElseThrow().getTopic()).isEqualTo("Konu");
            assertThat(questions.findById(question.getId()).orElseThrow().getCorrectAnswer()).isEqualTo("A");
        } finally {jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=? AND item_key=?",run,key);}
    }

    @Test void physicsSelectionPreservesOtherBranchLabelsWithoutConfirmingThem() throws Exception {
        user("mixed_topic_teacher",Role.OPERATOR);var session=login("mixed_topic_teacher","Sifre1234");
        String run=jdbc.queryForObject("SELECT run_key FROM learning_catalog.current_run",String.class);
        String chemistry=jdbc.queryForObject("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'subjectId'='kimya' AND definition->>'exam'='TYT' AND definition->>'canonicalUnit'='true' LIMIT 1",String.class);
        String key="note:physics-mixed-test";
        var data=json.createObjectNode().put("key",key).put("kind","NOTE").put("exam","TYT").put("subjectId","fizik")
            .put("title","Karma kaynak");
        var labels=data.putObject("automaticLabels").put("difficulty","BELIRLENMEDI").put("contentFormat","KONU_ANLATIMI");
        labels.putArray("skills");labels.putArray("grades").add(9);
        var assignments=labels.putArray("assignments");
        assignments.addObject().put("categoryId","system.fizik.tyt.konu-incelemesi").put("relation","PRIMARY");
        assignments.addObject().put("categoryId",chemistry).put("relation","SECONDARY");
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data) VALUES (?,?,'NOTE','TYT','fizik',true,?::jsonb)",run,key,data.toString());
        try {
            var detail=read(send(session,get(API+"/item").param("key",key),null));
            var body=json.createObjectNode().put("key",key).put("fingerprint",detail.path("fingerprint").asText()).put("revision",0).put("note","");
            body.putArray("assignments").addObject().put("categoryId","tyt.fizik.basinc").put("relation","PRIMARY");
            var saved=read(send(session,put(API+"/topics"),body.toString()).andExpect(status().isOk()));
            var byId=new java.util.HashMap<String,com.fasterxml.jackson.databind.JsonNode>();
            saved.path("labels").path("assignments").forEach(a->byId.put(a.path("categoryId").asText(),a));
            assertThat(byId.keySet()).containsExactlyInAnyOrder(chemistry,"tyt.fizik.basinc");
            assertThat(byId.get(chemistry).has("scopeStatus")).isFalse();
            assertThat(byId.get("tyt.fizik.basinc").path("scopeStatus").asText()).isEqualTo("CONFIRMED");
            assertThat(saved.path("labels").path("grades").toString()).isEqualTo("[9,10]");
        } finally {jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=? AND item_key=?",run,key);}
    }
}
