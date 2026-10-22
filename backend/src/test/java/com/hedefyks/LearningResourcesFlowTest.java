package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class LearningResourcesFlowTest extends TestBase {
    @MockitoBean ImageStorage images;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    com.hedefyks.review.LearningLabelStore labelStore;
    private static final String RUN="learning-resource-flow-test";
    private static final String API="/api/learning-resources";

    @AfterEach void clearLabels() {
        clearRun(RUN+"-history");
        clearRun(RUN+"-next");
        clearRun(RUN);
    }
    private void clearRun(String run) {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?",run);
        jdbc.update("DELETE FROM learning_catalog.assignments WHERE run_key=?",run);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?",run);
        jdbc.update("DELETE FROM learning_catalog.categories WHERE run_key=?",run);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?",run);
    }
    private void category(String id,String branch,String topic,String subtopic) throws Exception {
        var c=new LinkedHashMap<String,Object>();c.put("id",id);c.put("exam","TYT");c.put("subjectId",branch);
        c.put("subject",branch.equals("fizik")?"Fizik":"Kimya");c.put("topic",topic);c.put("subtopic",subtopic);c.put("origin","SOURCE");
        if(!subtopic.isBlank()) c.put("parentId","learning-main");
        jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)",RUN,id,json.writeValueAsString(c));
    }
    private void item(String key,String kind,String branch,boolean visible,String updated,String... ids) throws Exception {
        var assignments=Arrays.stream(ids).map(id->Map.of("categoryId",id,"relation","PRIMARY")).toList();
        var labels=Map.of("assignments",assignments,"difficulty","BELIRLENMEDI","contentFormat",kind.equals("QUESTION")?"SORU":"KONU_ANLATIMI",
            "skills",List.of("YORUMLAMA"),"grades",List.of(10),"provenance","SOURCE_EVIDENCE","inputFingerprint",key);
        var data=new LinkedHashMap<String,Object>();data.put("key",key);data.put("kind",kind);data.put("exam","TYT");data.put("subjectId",branch);
        data.put("subject",branch.equals("fizik")?"Fizik":"Kimya");data.put("title",key);data.put("url","/soru/"+key.replace("question:",""));
        data.put("availability",visible?"available":"source_only");data.put("automaticLabels",labels);data.put("studentVisible",visible);
        data.put("searchText",key.toLowerCase().replace(':',' ').replace('-',' '));
        if(kind.equals("QUESTION")){data.put("questionCode",key.replace("question:",""));data.put("sourceUpdatedAt",updated);data.put("bank","OGM");}
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) VALUES (?,?,?,?,?, ?,?::jsonb,?::text[],?::text[],ARRAY['TYT'])",
            RUN,key,kind,"TYT",branch,visible,json.writeValueAsString(data),"{"+String.join(",",ids)+"}","{"+branch+"}");
        for(String id:ids)jdbc.update("INSERT INTO learning_catalog.assignments VALUES (?,?,?,?)",RUN,key,id,"PRIMARY");
    }
    private void fixture() throws Exception {
        clearLabels();
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')",RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key",RUN);
        category("learning-main","fizik","Hareket ve kuvvet","");
        category("learning-sub","fizik","Hareket ve kuvvet","Sürtünme kuvveti");
        category("learning-chem","kimya","Atom ve yapısı","");
        for(String code:List.of("LEARNING-A","LEARNING-B","LEARNING-C")) {
            var q=question(code,code.endsWith("C")?"Kimya":"Fizik","A");
            when(images.load(q.getImage())).thenReturn(new ByteArrayResource(new byte[]{1,2,3}));
            String stamp=jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,q.getId());
            item("question:"+code,"QUESTION",code.endsWith("C")?"kimya":"fizik",true,stamp,
                code.endsWith("A")?new String[]{"learning-main","learning-sub"}:code.endsWith("B")?new String[]{"learning-main"}:new String[]{"learning-chem"});
        }
        item("video:learning","VIDEO","fizik",true,null,"learning-main","learning-sub");
        item("question:SOURCE-ONLY","QUESTION","fizik",false,null,"learning-main");
    }
    private com.fasterxml.jackson.databind.node.ObjectNode approve(JsonNode detail,String category) {
        var b=json.createObjectNode();b.put("key",detail.path("item").path("key").asText());b.put("fingerprint",detail.path("fingerprint").asText());
        b.put("revision",0);b.put("verdict","APPROVE");b.put("note","Kaynak ve konu kontrol edildi.");
        var checks=b.putObject("checks");for(String c:List.of("branch","topic","answer","image"))checks.put(c,"OK");
        for(String f:List.of("proposedExam","proposedSubject","proposedTopic","proposedSubtopic","proposedAnswer","proposedUrl"))b.put(f,"");
        b.put("difficulty","ORTA");b.put("contentFormat","SORU");b.putArray("skills");b.putArray("grades");
        b.putArray("assignments").addObject().put("categoryId",category).put("relation","PRIMARY");return b;
    }

    @Test void publishedCategoriesAreAuthoritativeAndNewSourceHeadingsCannotCreateRuntimeIdentities() throws Exception {
        fixture();user("catalog_reader",Role.USER);user("catalog_teacher",Role.OPERATOR);
        category("tyt.fizik.basinc","fizik","DB'de güncel basınç adı","");
        question("UNPUBLISHED-HEADING","Fizik","A");
        var student=login("catalog_reader","Sifre1234");var teacher=login("catalog_teacher","Sifre1234");
        for (var endpoint:List.of(API+"/metadata","/api/operator/content-review/catalog")) {
            var result=read(send(endpoint.startsWith(API)?student:teacher,get(endpoint),null).andExpect(status().isOk()));
            var definitions=new ArrayList<JsonNode>();result.path("categories").forEach(definitions::add);
            assertThat(definitions.stream().filter(c->"tyt.fizik.basinc".equals(c.path("id").asText())).toList())
                .singleElement().satisfies(c->assertThat(c.path("topic").asText()).isEqualTo("DB'de güncel basınç adı"));
            assertThat(definitions).noneMatch(c->"tyt.fizik.optik-golge-ve-yansima".equals(c.path("id").asText()));
            assertThat(definitions).noneMatch(c->"Konu".equals(c.path("topic").asText()));
        }
        send(student,get(API).param("categoryId","tyt.matematik.sayi-basamaklari"),null).andExpect(status().isBadRequest());
    }

    @Test void metadataKeepsOneDatabaseSnapshotWhenAnotherConnectionPublishes() throws Exception {
        fixture();user("snapshot_reader",Role.USER);var student=login("snapshot_reader","Sifre1234");
        String next=RUN+"-next";
        jdbc.update("UPDATE learning_catalog.runs SET summary=jsonb_build_object('runKey',run_key) WHERE run_key=?",RUN);
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST',jsonb_build_object('runKey',?::text))",next,next);
        jdbc.update("INSERT INTO learning_catalog.categories SELECT ?,category_id,definition FROM learning_catalog.categories WHERE run_key=? AND category_id='learning-chem'",next,RUN);
        org.mockito.Mockito.doAnswer(call->{
            java.util.concurrent.CompletableFuture.runAsync(()->jdbc.update("UPDATE learning_catalog.current_run SET run_key=?",next))
                .get(10,java.util.concurrent.TimeUnit.SECONDS);
            return call.callRealMethod();
        }).when(labelStore).categories();
        try {
            var result=read(send(student,get(API+"/metadata"),null).andExpect(status().isOk()));
            assertThat(result.path("summary").path("runKey").asText()).isEqualTo(RUN);
            var ids=new ArrayList<String>();result.path("categories").forEach(c->ids.add(c.path("id").asText()));
            assertThat(ids).contains("learning-main","learning-sub","learning-chem");
            assertThat(jdbc.queryForObject("SELECT run_key FROM learning_catalog.current_run",String.class)).isEqualTo(next);
        } finally { org.mockito.Mockito.reset(labelStore); }
    }

    @Test void manualPagesRemainVisibleAndPrivateExtractionDataIsNotDisclosed() throws Exception {
        fixture();user("manual_reader",Role.USER);var session=login("manual_reader","Sifre1234");
        item("pdf:manual","PDF","fizik",true,null,"learning-main");
        var manual=json.createObjectNode();manual.put("status","NEEDS_MANUAL_REVIEW");manual.put("code","EMPTY_OR_UNREADABLE");
        manual.put("label","Boş/okunamayan — manuel inceleme");manual.put("reason","İki OCR yöntemi denendi.");
        manual.put("internalPath","private-source");
        var page=manual.putArray("pages").addObject();page.put("page",3);page.put("label","Görsel/okunamayan");
        page.put("status","NEEDS_MANUAL_REVIEW");page.put("reason","Şekil ağırlıklı sayfa.");page.put("text","correctAnswer private-text");
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{manualReview}',?::jsonb) WHERE run_key=? AND item_key='pdf:manual'",manual.toString(),RUN);
        var response=read(send(session,get(API).param("manualReviewOnly","true").param("manualReviewType","EMPTY_OR_UNREADABLE"),null).andExpect(status().isOk()));
        assertThat(response.path("totalElements").asInt()).isEqualTo(1);
        assertThat(response.path("content").get(0).path("manualReview").path("pages").get(0).path("page").asInt()).isEqualTo(3);
        assertThat(response.toString()).doesNotContain("internalPath","private-source","correctAnswer","private-text");
        var detail=read(send(session,get(API+"/item").param("key","pdf:manual"),null).andExpect(status().isOk()));
        assertThat(detail).isEqualTo(response.path("content").get(0));
        send(session,get(API+"/item").param("key","question:SOURCE-ONLY"),null).andExpect(status().isNotFound());
        assertThat(read(send(session,get(API).param("manualReviewType","TIME_REVIEW"),null)).path("totalElements").asInt()).isZero();
    }

    @Test void coverageSeparatesReferencesAndPhysicalAssetsAndUnionsVerifiedPages() throws Exception {
        fixture();user("coverage_reader",Role.USER);var session=login("coverage_reader","Sifre1234");
        for(int i=1;i<=2;i++) {
            String key="pdf:shared-"+i;item(key,"PDF","fizik",true,null,"learning-main");
            var assignment=json.createObjectNode();assignment.put("categoryId","learning-main");assignment.put("relation","PRIMARY");
            assignment.put("locatorStatus","VERIFIED");var loc=assignment.putArray("locators").addObject();
            loc.put("type","PDF");loc.put("pdfPageStart",i+1);loc.put("pdfPageEnd",i+3);loc.put("pageCount",10);
            jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(jsonb_set(data,'{canonicalAssetId}','\"same-pdf-hash\"'),'{automaticLabels,assignments}',?::jsonb) WHERE run_key=? AND item_key=?",json.createArrayNode().add(assignment).toString(),RUN,key);
        }
        var result=read(send(session,get(API+"/coverage").param("exam","TYT").param("subject","fizik"),null).andExpect(status().isOk()));
        var summary=result.path("summary");assertThat(summary.path("QUESTION").asInt()).isEqualTo(2);
        assertThat(summary.path("resources").asInt()).isEqualTo(5);
        assertThat(summary.path("physicalAssets").asInt()).isEqualTo(4);
        assertThat(summary.path("references").asInt()).isEqualTo(7);
        assertThat(summary.path("verifiedPdfPages").asDouble()).isEqualTo(4);
        assertThat(summary.path("verifiedVideoSeconds").asDouble()).isZero();
        assertThat(summary.path("bankCounts").path("OGM").asInt()).isEqualTo(2);
        assertThat(result.toString()).doesNotContain("correctAnswer","same-pdf-hash");
        send(session,get(API+"/coverage").param("exam","TYT").param("subject","unknown"),null).andExpect(status().isBadRequest());
    }

    @Test void coverageRejectsMalformedOrOutOfBoundsRangesWithoutDroppingSources() throws Exception {
        fixture();user("range_reader",Role.USER);var session=login("range_reader","Sifre1234");
        item("pdf:ranges","PDF","fizik",true,null,"learning-main");
        var ranges=Map.of("pdf:ranges", """
            [{"type":"PDF","pdfPageStart":2,"pdfPageEnd":4,"pageCount":5},
             {"type":"PDF","pdfPageStart":0,"pdfPageEnd":1,"pageCount":5},
             {"type":"PDF","pdfPageStart":4,"pdfPageEnd":3,"pageCount":5},
             {"type":"PDF","pdfPageStart":1.5,"pdfPageEnd":2,"pageCount":5},
             {"type":"PDF","pdfPageStart":2,"pdfPageEnd":6,"pageCount":5},
             {"type":"PDF","pdfPageStart":2,"pdfPageEnd":3},
             {"type":"PDF","pdfPageStart":"2","pdfPageEnd":3,"pageCount":5}]
            """, "video:learning", """
            [{"type":"VIDEO","startSeconds":10,"endSeconds":40,"durationSeconds":60},
             {"type":"VIDEO","startSeconds":-10,"endSeconds":10,"durationSeconds":60},
             {"type":"VIDEO","startSeconds":40,"endSeconds":40,"durationSeconds":60},
             {"type":"VIDEO","startSeconds":20,"endSeconds":70,"durationSeconds":60},
             {"type":"VIDEO","startSeconds":0,"endSeconds":60}]
            """);
        for(var entry:ranges.entrySet()) {
            var assignment=json.createObjectNode().put("categoryId","learning-main").put("relation","PRIMARY").put("locatorStatus","VERIFIED");
            assignment.set("locators",json.readTree(entry.getValue()));
            jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,assignments}',?::jsonb) WHERE run_key=? AND item_key=?",
                json.createArrayNode().add(assignment).toString(),RUN,entry.getKey());
        }
        var summary=read(send(session,get(API+"/coverage").param("exam","TYT").param("subject","fizik"),null).andExpect(status().isOk())).path("summary");
        assertThat(summary.path("resources").asInt()).isEqualTo(4);
        assertThat(summary.path("verifiedPdfPages").asDouble()).isEqualTo(3);
        assertThat(summary.path("verifiedVideoSeconds").asDouble()).isEqualTo(30);
    }

    @Test void commonQuestionIdsAgreeAcrossLibraryListAvailabilityPracticeAndExamSnapshot() throws Exception {
        fixture();user("shared_selector",Role.USER);var session=login("shared_selector","Sifre1234");
        var listed=read(send(session,get("/api/questions").param("categoryId","learning-main"),null).andExpect(status().isOk()));
        assertThat(listed.path("totalElements").asInt()).isEqualTo(2);
        assertThat(listed.toString()).doesNotContain("correctAnswer");
        assertThat(read(send(session,get("/api/questions/availability").param("categoryId","learning-main"),null)).path("total").asInt()).isEqualTo(2);
        assertThat(read(send(session,get("/api/questions/availability").param("categoryId","learning-main","learning-sub").param("categoryMatch","ALL"),null)).path("total").asInt()).isEqualTo(1);
        assertThat(read(send(session,get("/api/questions/availability").param("categoryId","learning-main").param("includeCandidates","false"),null)).path("total").asInt()).isZero();
        var request=json.createObjectNode();request.put("questionCount",2);request.put("selectionMode","MIXED");
        request.put("clientRequestId",UUID.randomUUID().toString());request.putArray("categoryId").add("learning-main");
        var practice=read(send(session,post("/api/study-sessions"),request.toString()).andExpect(status().isCreated()));
        assertThat(practice.path("questions").size()).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT catalog_filter->'categoryIds'->>0 FROM study_sessions WHERE id=?",String.class,practice.path("id").asLong())).isEqualTo("learning-main");
        var history=read(send(session,get("/api/study-sessions"),null).andExpect(status().isOk()));
        assertThat(history.at("/content/0/categoryIds/0").asText()).isEqualTo("learning-main");
        var exam=read(send(session,post("/api/exams"),request.toString()).andExpect(status().isCreated()));
        long examId=exam.path("id").asLong();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_questions WHERE exam_id=? AND learning_label_snapshot->>'catalogRunKey'=?",Integer.class,examId,RUN)).isEqualTo(2);
        String snapshot=jdbc.queryForObject("SELECT learning_label_snapshot::text FROM exam_questions WHERE exam_id=? ORDER BY question_id LIMIT 1",String.class,examId);
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,assignments}','[]') WHERE run_key=?",RUN);
        assertThat(jdbc.queryForObject("SELECT learning_label_snapshot::text FROM exam_questions WHERE exam_id=? ORDER BY question_id LIMIT 1",String.class,examId)).isEqualTo(snapshot);
    }

    @Test void candidateScopeCannotEraseGeneralOrLessonPoolsAndOnlyCurrentBankQuestionsEnterFacets() throws Exception {
        fixture();var owner=user("general_scope_reader",Role.USER);var session=login("general_scope_reader","Sifre1234");
        question("NOT-IN-CURRENT-CATALOG","Fizik","A");
        for(String include:List.of("true","false")) {
            var count=read(send(session,get("/api/questions/availability").param("examType","TYT").param("includeCandidates",include),null).andExpect(status().isOk()));
            assertThat(count.path("total").asInt()).isEqualTo(3);
            assertThat(read(send(session,get("/api/questions").param("includeCandidates",include),null)).path("totalElements").asInt()).isEqualTo(3);
            assertThat(read(send(session,get(API).param("kind","QUESTION").param("bankOnly","true").param("includeCandidates",include),null)).path("totalElements").asInt()).isEqualTo(3);
            assertThat(read(send(session,get("/api/questions/availability").param("subject","Fizik").param("includeCandidates",include),null)).path("total").asInt()).isEqualTo(2);
        }
        assertThat(read(send(session,get("/api/questions/availability").param("categoryId","learning-main").param("includeCandidates","false"),null)).path("total").asInt()).isZero();
        var facets=read(send(session,get("/api/questions/filters"),null).andExpect(status().isOk()));
        assertThat(facets.get(0).path("totalCount").asInt()).isEqualTo(3);
        assertThat(facets.get(0).path("examCount").asInt()).isEqualTo(3);
        var counts=read(send(session,get("/api/questions/category-counts").param("subject","Fizik"),null).andExpect(status().isOk()));
        assertThat(counts.path("learning-main").asInt()).isEqualTo(2);
        assertThat(counts.path("learning-sub").asInt()).isEqualTo(1);
        assertThat(counts.has("learning-chem")).isFalse();
        assertThat(read(send(session,get("/api/questions/category-counts").param("bank","OGM"),null)).isEmpty()).isTrue();
        var request=json.createObjectNode().put("questionCount",2).put("selectionMode","MIXED")
            .put("examType","TYT").put("subject","Fizik").put("includeCandidates",false).put("clientRequestId",UUID.randomUUID().toString());
        var practice=read(send(session,post("/api/study-sessions"),request.toString()).andExpect(status().isCreated()));
        assertThat(practice.path("questions").size()).isEqualTo(2);
        assertThat(practice.toString()).doesNotContain("NOT-IN-CURRENT-CATALOG");
        jdbc.update("UPDATE questions SET updated_at=updated_at+interval '1 second' WHERE code='LEARNING-B'");
        assertThat(read(send(session,get("/api/questions/category-counts").param("subject","Fizik"),null)).path("learning-main").asInt()).isEqualTo(1);
        assertThat(read(send(session,get("/api/questions/filters"),null)).get(0).path("totalCount").asInt()).isEqualTo(2);
    }

    @Test void questionFacetsUseEffectiveTeacherSubjectsAndCountMultiSubjectQuestionsOnce() throws Exception {
        fixture();user("facet_reader",Role.USER);user("facet_teacher",Role.OPERATOR);
        var student=login("facet_reader","Sifre1234");var teacher=login("facet_teacher","Sifre1234");
        var detail=read(send(teacher,get("/api/operator/content-review/item").param("key","question:LEARNING-A"),null));
        var decision=approve(detail,"learning-chem");
        decision.withArray("assignments").addObject().put("categoryId","learning-main").put("relation","SECONDARY");
        send(teacher,put("/api/operator/content-review"),decision.toString()).andExpect(status().isOk());
        var rows=read(send(student,get("/api/questions/filters"),null));
        for(var row:rows) {
            assertThat(row.path("totalCount").asInt()).isEqualTo(3);
            assertThat(row.path("examCount").asInt()).isEqualTo(3);
            var count=read(send(student,get("/api/questions/availability").param("examType",row.path("examType").asText()).param("subject",row.path("subject").asText()),null));
            assertThat(row.path("subjectCount").asInt()).isEqualTo(count.path("total").asInt());
        }
        var counts=read(send(student,get("/api/questions/category-counts").param("includeCandidates","false"),null));
        assertThat(counts.path("learning-chem").asInt()).isEqualTo(1);
        assertThat(counts.path("learning-main").asInt()).isEqualTo(1);
    }

    @Test void twoTopicsKeepTheSameResourceIdentityAndTheirOwnTimeRanges() throws Exception {
        fixture();user("two_topic_reader",Role.USER);var session=login("two_topic_reader","Sifre1234");
        var assignments=json.createArrayNode();
        int start=0;
        for(String category:List.of("learning-main","learning-sub")) {
            var assignment=assignments.addObject().put("categoryId",category).put("relation","PRIMARY").put("locatorStatus","VERIFIED");
            assignment.putArray("locators").addObject().put("type","VIDEO").put("startSeconds",start).put("endSeconds",start+30).put("durationSeconds",120);
            start=60;
        }
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,assignments}',?::jsonb) WHERE run_key=? AND item_key='video:learning'",assignments.toString(),RUN);
        JsonNode first=null;
        for(String category:List.of("learning-main","learning-sub")) {
            var result=read(send(session,get(API).param("kind","VIDEO").param("categoryId",category),null).andExpect(status().isOk()));
            assertThat(result.path("totalElements").asInt()).isEqualTo(1);
            var row=result.path("content").get(0);
            assertThat(row.path("key").asText()).isEqualTo("video:learning");
            assertThat(row.path("labels").path("assignments").get(0).path("locators").get(0).path("startSeconds").asInt()).isZero();
            assertThat(row.path("labels").path("assignments").get(1).path("locators").get(0).path("startSeconds").asInt()).isEqualTo(60);
            if(first==null)first=row;else assertThat(row).isEqualTo(first);
        }
        assertThat(read(send(session,get(API+"/item").param("key","video:learning"),null))).isEqualTo(first);
    }

    @Test void questionListReusesPublicPresentationForEveryRowBeyondTwentyFive() throws Exception {
        fixture();user("batch_reader",Role.USER);var session=login("batch_reader","Sifre1234");
        for(int i=0;i<30;i++) {
            String code="BATCH-"+i;var q=question(code,"Fizik","A");
            String stamp=jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,q.getId());
            item("question:"+code,"QUESTION","fizik",true,stamp,"learning-main");
        }
        var result=read(send(session,get("/api/questions").param("size","100"),null).andExpect(status().isOk()));
        assertThat(result.path("content").size()).isEqualTo(33);
        for(var row:result.path("content")) {
            assertThat(row.path("resource").path("key").asText()).isEqualTo("question:"+row.path("code").asText());
            assertThat(row.path("resource").path("labels").path("assignments").isArray()).isTrue();
        }
        assertThat(result.toString()).doesNotContain("correctAnswer","inputFingerprint","internalPath");
    }

    @Test void progressDeduplicatesFirstQuestionsKeepsHistoricalLabelsAndIsolatesAccounts() throws Exception {
        fixture();var owner=user("progress_owner",Role.USER);user("progress_other",Role.USER);
        var student=login("progress_owner","Sifre1234");var other=login("progress_other","Sifre1234");
        long first=questions.findByCode("LEARNING-A").orElseThrow().getId(),second=questions.findByCode("LEARNING-B").orElseThrow().getId();
        for(var answer:List.of(Map.of("id",first,"answer","B"),Map.of("id",first,"answer","A"),Map.of("id",second,"answer","A"))) {
            var body=json.createObjectNode().put("clientEventId",UUID.randomUUID().toString()).put("eventType","ANSWER").put("answer",answer.get("answer").toString()).put("activeSeconds",10);
            send(student,post("/api/questions/"+answer.get("id")+"/practice"),body.toString()).andExpect(status().isOk());
        }
        var current=read(send(student,get(API+"/progress"),null));
        assertThat(current.path("summary").path("total").asInt()).isEqualTo(2);
        assertThat(current.path("summary").path("wrong").asInt()).isEqualTo(1);
        assertThat(current.path("summary").path("repeatAttempts").asInt()).isEqualTo(1);
        assertThat(current.path("mediaProgressRecorded").asBoolean()).isFalse();
        var historical=read(send(student,get(API+"/progress").param("classification","HISTORICAL"),null));
        assertThat(historical.path("unclassified").asInt()).isZero();
        assertThat(historical.path("categories").size()).isEqualTo(2);
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,assignments}','[{\"categoryId\":\"learning-chem\",\"relation\":\"PRIMARY\"}]'),category_ids=ARRAY['learning-chem'] WHERE run_key=? AND item_key='question:LEARNING-A'",RUN);
        var changed=read(send(student,get(API+"/progress"),null));
        assertThat(changed.path("categories").toString()).contains("learning-chem").doesNotContain("learning-sub");
        assertThat(read(send(student,get(API+"/progress").param("classification","HISTORICAL"),null))).isEqualTo(historical);
        assertThat(read(send(other,get(API+"/progress").param("userId",owner.getId().toString()),null)).path("summary").path("total").asInt()).isZero();
        long legacy=questions.findByCode("LEARNING-C").orElseThrow().getId();
        jdbc.update("INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct) VALUES (?,?,?,'ANSWER','A','A',true)",owner.getId(),legacy,UUID.randomUUID());
        assertThat(read(send(student,get(API+"/progress").param("classification","HISTORICAL"),null)).path("unclassified").asInt()).isEqualTo(1);
        send(student,get(API+"/progress").param("classification","invalid"),null).andExpect(status().isBadRequest());
    }

    @Test void tutoringSourceKeysPersistOnceAndRejectAnUnrelatedTopicWithoutTouchingNotes() throws Exception {
        fixture();user("source_owner",Role.USER);user("source_other",Role.USER);
        var owner=login("source_owner","Sifre1234");var other=login("source_other","Sifre1234");
        String topic="ayt.matematik.fonksiyonlar";
        var definition=json.createObjectNode().put("id",topic).put("exam","AYT").put("subjectId","matematik").put("subject","Matematik").put("topic","Fonksiyonlar").put("subtopic","").put("origin","CURRICULUM");
        jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)",RUN,topic,definition.toString());
        item("pdf:tracked-math","PDF","matematik",true,null,topic);
        var request=json.createObjectNode().put("date","2026-10-16").put("start","10:00").put("end","11:00").put("topic","Özgün ders notu").put("homework","Özgün ödev").put("status","PLANNED").put("note","Korunan açıklama");
        var learning=request.putObject("learning").put("examType","AYT").put("branch","MATHEMATICS").put("mastery","NOT_STARTED").put("categoryId",topic);
        learning.putArray("resourceKeys").add("pdf:tracked-math").add("pdf:tracked-math");
        var saved=read(send(owner,post("/api/math-tutoring"),request.toString()).andExpect(status().isOk()));
        assertThat(saved.path("learning").path("resourceKeys").size()).isEqualTo(1);
        assertThat(saved.path("note").asText()).isEqualTo("Korunan açıklama");
        assertThat(read(send(other,get("/api/math-tutoring"),null)).size()).isZero();
        learning.putArray("resourceKeys").add("video:learning");
        send(owner,patch("/api/math-tutoring/"+saved.path("id").asLong()),request.toString()).andExpect(status().isBadRequest());
        assertThat(read(send(owner,get("/api/math-tutoring"),null)).get(0)).isEqualTo(saved);
        // An old run still contains the relationship, but it has left the current catalog.
        String history=RUN+"-history";
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')",history);
        jdbc.update("INSERT INTO learning_catalog.categories SELECT ?,category_id,definition FROM learning_catalog.categories WHERE run_key=?",history,RUN);
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data) SELECT ?,item_key,kind,exam,subject_id,student_visible,data FROM learning_catalog.items WHERE run_key=? AND item_key='pdf:tracked-math'",history,RUN);
        jdbc.update("INSERT INTO learning_catalog.assignments VALUES (?,'pdf:tracked-math',?,'PRIMARY')",history,topic);
        jdbc.update("DELETE FROM learning_catalog.assignments WHERE run_key=? AND item_key='pdf:tracked-math'",RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=? AND item_key='pdf:tracked-math'",RUN);
        learning.putArray("resourceKeys").add("pdf:tracked-math");
        send(owner,patch("/api/math-tutoring/"+saved.path("id").asLong()),request.toString()).andExpect(status().isBadRequest());
        assertThat(read(send(owner,get("/api/math-tutoring"),null)).get(0)).isEqualTo(saved);
    }

    @Test void candidateChoiceFiltersEachSelectedRelationWithAnyAndAll() throws Exception {
        fixture();user("candidate_reader",Role.USER);var session=login("candidate_reader","Sifre1234");
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(jsonb_set(data,'{automaticLabels,assignments,0,scopeStatus}','\"CONFIRMED\"'),'{automaticLabels,assignments,1,scopeStatus}','\"CANDIDATE\"') WHERE run_key=? AND item_key='video:learning'",RUN);
        assertThat(read(send(session,get(API).param("kind","VIDEO").param("includeCandidates","false").param("categoryId","learning-main","learning-sub").param("match","ANY"),null)).path("totalElements").asInt()).isEqualTo(1);
        assertThat(read(send(session,get(API).param("kind","VIDEO").param("includeCandidates","false").param("categoryId","learning-main","learning-sub").param("match","ALL"),null)).path("totalElements").asInt()).isZero();
        assertThat(read(send(session,get(API).param("kind","VIDEO").param("includeCandidates","false").param("categoryId","learning-sub"),null)).path("totalElements").asInt()).isZero();
        assertThat(read(send(session,get(API).param("kind","VIDEO").param("categoryId","learning-main","learning-sub").param("match","ALL"),null)).path("totalElements").asInt()).isEqualTo(1);
    }

    @Test void filtersEverySourceWithAnyAllAndNeverLeaksAnswersOrTreatsProposalsAsApproved() throws Exception {
        fixture();user("learning_user",Role.USER);var session=login("learning_user","Sifre1234");
        var all=read(send(session,get(API),null).andExpect(status().isOk()));
        assertThat(all.path("totalElements").asInt()).isEqualTo(4);
        assertThat(all.toString()).doesNotContain("correctAnswer","contentSha256","decision");
        var both=read(send(session,get(API).param("categoryId","learning-main","learning-sub").param("match","ALL"),null));
        assertThat(both.path("totalElements").asInt()).isEqualTo(2);
        var either=read(send(session,get(API).param("categoryId","learning-sub","learning-chem").param("match","ANY").param("kind","QUESTION"),null));
        assertThat(either.path("totalElements").asInt()).isEqualTo(2);
        assertThat(read(send(session,get(API).param("approvedOnly","true"),null)).path("totalElements").asInt()).isZero();
        assertThat(read(send(session,get(API).param("skill","YORUMLAMA").param("grade","10").param("contentFormat","SORU"),null)).path("totalElements").asInt()).isEqualTo(3);
        send(session,get(API).param("categoryId","missing-category"),null).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM content_reviews",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_taxonomy",Long.class)).isZero();
    }
    @Test void currentTeacherDecisionOverridesStudentFiltersAndChangedImageRevokesItsApproval() throws Exception {
        fixture();user("learning_user",Role.USER);user("learning_teacher",Role.OPERATOR);
        var student=login("learning_user","Sifre1234");var teacher=login("learning_teacher","Sifre1234");
        String reviewApi="/api/operator/content-review";
        var detail=read(send(teacher,get(reviewApi+"/item").param("key","question:LEARNING-A"),null));
        assertThat(detail.path("labels").path("assignments").size()).isEqualTo(2);
        send(teacher,put(reviewApi),approve(detail,"learning-chem").toString()).andExpect(status().isOk());
        var approved=read(send(student,get(API).param("approvedOnly","true").param("subject","kimya"),null));
        assertThat(approved.path("totalElements").asInt()).isEqualTo(1);
        assertThat(approved.path("content").get(0).path("reviewStatus").asText()).isEqualTo("APPROVE");
        assertThat(approved.path("content").get(0).path("subject").asText()).isEqualTo("Kimya");
        assertThat(approved.path("content").get(0).path("topic").asText()).isEqualTo("Atom ve yapısı");
        var collection=read(send(student,get("/api/questions").param("categoryId","learning-chem"),null));
        var changed=java.util.stream.StreamSupport.stream(collection.path("content").spliterator(),false).filter(r->r.path("code").asText().equals("LEARNING-A")).findFirst().orElseThrow();
        assertThat(changed.path("subject").asText()).isEqualTo("Kimya");
        assertThat(changed.path("resource").path("subject").asText()).isEqualTo("Kimya");
        var question=questions.findByCode("LEARNING-A").orElseThrow();
        assertThat(question.getSubject()).isEqualTo("Fizik");assertThat(question.getCorrectAnswer()).isEqualTo("A");
        when(images.load(question.getImage())).thenReturn(new ByteArrayResource(new byte[]{4,5,6}));
        assertThat(read(send(student,get(API).param("approvedOnly","true"),null)).path("totalElements").asInt()).isZero();
        send(student,get(reviewApi),null).andExpect(status().isForbidden());
        send(teacher,get(API),null).andExpect(status().isForbidden());
    }
    @Test void approvedQuestionTypeAndTeacherDifficultyAgreeAcrossSelectionAndBecomeStaleWithSource() throws Exception {
        fixture();user("typed_student",Role.USER);user("typed_teacher",Role.OPERATOR);
        var student=login("typed_student","Sifre1234");var teacher=login("typed_teacher","Sifre1234");
        long node=jdbc.queryForObject("INSERT INTO taxonomy_nodes(kind,code,name) VALUES ('QUESTION_TYPE','shared-type-fixture','Sayısal yorum') ON CONFLICT(parent_id,kind,code) DO UPDATE SET active=true RETURNING id",Long.class);
        long questionId=questions.findByCode("LEARNING-A").orElseThrow().getId();
        jdbc.update("INSERT INTO question_taxonomy(question_id,node_id,source,approval_status,taxonomy_version) VALUES (?,?,'HUMAN','APPROVED','fixture-v1')",questionId,node);
        String type="taxonomy:"+node;
        var detail=read(send(teacher,get("/api/operator/content-review/item").param("key","question:LEARNING-A"),null));
        send(teacher,put("/api/operator/content-review"),approve(detail,"learning-main").toString()).andExpect(status().isOk());
        jdbc.update("UPDATE learning_catalog.items SET data=jsonb_set(data,'{automaticLabels,difficulty}','\"ZOR\"') WHERE run_key=? AND item_key='question:LEARNING-B'",RUN);
        assertThat(read(send(student,get(API).param("kind","QUESTION").param("bankOnly","true").param("questionTypeId",type).param("teacherDifficulty","ORTA"),null)).path("totalElements").asInt()).isEqualTo(1);
        var listed=read(send(student,get("/api/questions").param("questionTypeId",type).param("teacherDifficulty","ORTA"),null));
        assertThat(listed.path("totalElements").asInt()).isEqualTo(1);
        assertThat(listed.path("content").get(0).path("resource").path("questionTypes").get(0).path("id").asText()).isEqualTo(type);
        assertThat(read(send(student,get("/api/questions/availability").param("questionTypeId",type).param("teacherDifficulty","ORTA"),null)).path("total").asInt()).isEqualTo(1);
        assertThat(read(send(student,get("/api/questions/availability").param("teacherDifficulty","ZOR"),null)).path("total").asInt()).isZero();
        var request=json.createObjectNode().put("questionTypeId",type).put("teacherDifficulty","ORTA").put("questionCount",1).put("examType","TYT");
        request.put("clientRequestId",UUID.randomUUID().toString());
        send(student,post("/api/study-sessions"),request.toString()).andExpect(status().isCreated());
        var exam=read(send(student,post("/api/exams"),request.toString()).andExpect(status().isCreated()));
        long examId=exam.path("id").asLong();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_taxonomy_snapshot s JOIN exam_questions eq ON eq.id=s.exam_question_id WHERE eq.exam_id=? AND s.node_id=?",Integer.class,examId,node)).isEqualTo(1);
        jdbc.update("UPDATE questions SET updated_at=updated_at+interval '1 second' WHERE id=?",questionId);
        assertThat(read(send(student,get("/api/questions/availability").param("questionTypeId",type),null)).path("total").asInt()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_taxonomy_snapshot s JOIN exam_questions eq ON eq.id=s.exam_question_id WHERE eq.exam_id=? AND s.node_id=?",Integer.class,examId,node)).isEqualTo(1);
        send(student,get(API).param("questionTypeId","taxonomy:999999999999"),null).andExpect(status().isBadRequest());
    }

    @Test void changedQuestionMetadataCannotSilentlyReuseStaleLabels() throws Exception {
        fixture();user("learning_user",Role.USER);var session=login("learning_user","Sifre1234");
        jdbc.update("UPDATE questions SET topic='Değişen konu',updated_at=updated_at+interval '1 second' WHERE code='LEARNING-A'");
        assertThat(read(send(session,get(API).param("kind","QUESTION"),null)).path("totalElements").asInt()).isEqualTo(2);
    }

    @Test void relationMetadataKeepsLocationsAndEffectiveNamesWithoutLeakingInternalEvidence() throws Exception {
        fixture();user("metadata_student",Role.USER);var student=login("metadata_student","Sifre1234");
        var data=json.createObjectNode();data.put("key","video:learning");data.put("kind","VIDEO");data.put("contractVersion",2);
        data.put("title","Eski başlık");data.put("originalTitle","Özgün video başlığı");data.put("displayTitle","Eskimiş görünen ad");
        data.put("sourceLabel","Hoca");data.put("url","https://www.youtube.com/watch?v=fixture");data.put("availability","available");
        var assignment=data.putObject("automaticLabels").putArray("assignments").addObject();
        assignment.put("categoryId","learning-main");assignment.put("relation","PRIMARY");assignment.put("scopeStatus","CANDIDATE");
        assignment.put("confidence","LOW");assignment.put("confidenceReason","İçerik incelemesi bekliyor.");
        assignment.put("locatorStatus","ESTIMATED");assignment.put("locatorReason","Bölüm kaydı.");
        assignment.putArray("evidence").addObject().put("text","correctAnswer: A; internal file path");
        var locator=assignment.putArray("locators").addObject();locator.put("type","VIDEO");locator.put("startSeconds",30);locator.put("endSeconds",60);
        locator.put("durationSeconds",120);locator.put("internalPath","private-source");
        jdbc.update("UPDATE learning_catalog.items SET data=?::jsonb WHERE run_key=? AND item_key='video:learning'",data.toString(),RUN);
        var response=read(send(student,get(API).param("kind","VIDEO"),null).andExpect(status().isOk()));
        var row=response.path("content").get(0);var publicAssignment=row.path("labels").path("assignments").get(0);
        assertThat(row.path("displayTitle").asText()).isEqualTo("TYT | Fizik | Hareket ve kuvvet (tahmini) | Hoca | Video");
        assertThat(row.path("originalTitle").asText()).isEqualTo("Özgün video başlığı");
        assertThat(publicAssignment.path("locators").get(0).path("startSeconds").asInt()).isEqualTo(30);
        assertThat(response.toString()).doesNotContain("correctAnswer","internalPath","private-source","internal file path");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.current_relation_details WHERE item_key='video:learning'",Long.class)).isEqualTo(1);
    }

    @Test void teacherExamCorrectionControlsBothFiltersAndDisplayedScope() throws Exception {
        fixture();
        category("learning-ayt","fizik","Çembersel hareket","");
        jdbc.update("UPDATE learning_catalog.categories SET definition=jsonb_set(definition,'{exam}','\"AYT\"') WHERE run_key=? AND category_id='learning-ayt'",RUN);
        user("scope_student",Role.USER);user("scope_teacher",Role.OPERATOR);
        var student=login("scope_student","Sifre1234");var teacher=login("scope_teacher","Sifre1234");
        var detail=read(send(teacher,get("/api/operator/content-review/item").param("key","question:LEARNING-A"),null));
        send(teacher,put("/api/operator/content-review"),approve(detail,"learning-ayt").toString()).andExpect(status().isOk());
        var ayt=read(send(student,get(API).param("exam","AYT").param("approvedOnly","true"),null));
        assertThat(ayt.path("totalElements").asInt()).isEqualTo(1);
        assertThat(ayt.path("content").get(0).path("exam").asText()).isEqualTo("AYT");
        assertThat(read(send(student,get(API).param("exam","TYT").param("approvedOnly","true"),null)).path("totalElements").asInt()).isZero();
    }

    @Test void libraryRouteCanBeOpenedDirectlyInPackagedApplication() throws Exception {
        mvc.perform(get("/kaynak-kutuphanesi")).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    @Test void proposedBranchIsVisibleToItsTeacherEvenWhenSourceBranchIsWrong() throws Exception {
        fixture();
        jdbc.update("UPDATE learning_catalog.items SET subject_ids=ARRAY['fizik'],data=jsonb_set(data,'{automaticLabels,assignments}',?::jsonb) WHERE run_key=? AND item_key='question:LEARNING-C'",
            "[{\"categoryId\":\"learning-main\",\"relation\":\"PRIMARY\"}]",RUN);
        user("branch_teacher",Role.OPERATOR);var teacher=login("branch_teacher","Sifre1234");
        var list=read(send(teacher,get("/api/operator/content-review").param("subject","fizik").param("kind","QUESTION").param("q","LEARNING-C"),null).andExpect(status().isOk()));
        assertThat(list.path("totalElements").asInt()).isEqualTo(1);
        assertThat(list.path("content").get(0).path("labels").path("assignments").get(0).path("categoryId").asText()).isEqualTo("learning-main");
    }
}
