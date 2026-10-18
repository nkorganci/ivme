package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.Test;

class CanonicalUnitFlowTest extends TestBase {
    @Override protected boolean catalogFixtureRequired(){return true;}
    private String unit(String topic) {
        return jdbc.queryForObject("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' AND definition->>'exam'='TYT' AND definition->>'subjectId'='biyoloji' AND definition->>'topic'=?",String.class,topic);
    }
    private com.hedefyks.question.Question labelledQuestion(String code,String category) throws Exception {
        var q=question(code,"Biyoloji","A");
        String stamp=jdbc.queryForObject("SELECT extract(epoch FROM updated_at)::text FROM questions WHERE id=?",String.class,q.getId());
        var data=json.createObjectNode().put("key","question:"+code).put("kind","QUESTION").put("exam","TYT")
            .put("subjectId","biyoloji").put("subject","Biyoloji").put("questionCode",code).put("title",code)
            .put("topic","Kaynağın eski alt başlığı").put("sourceUpdatedAt",stamp).put("studentVisible",true)
            .put("availability","available").put("sourceVersion","test-source").put("url","/soru/"+code);
        var labels=data.putObject("automaticLabels").put("difficulty","BELIRLENMEDI").put("contentFormat","SORU")
            .put("gradeStatus","ESTIMATED").put("gradeReason","Sınav kapsamı tahmini");
        labels.putArray("grades").add(9).add(10);labels.putArray("skills");
        labels.putArray("assignments").addObject().put("categoryId",category).put("relation","PRIMARY")
            .put("scopeStatus","CANDIDATE").put("confidence","LOW");
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) SELECT run_key,?,'QUESTION','TYT','biyoloji',true,?::jsonb,ARRAY[?]::text[],ARRAY['biyoloji'],ARRAY['TYT'] FROM learning_catalog.current_run ON CONFLICT(run_key,item_key) DO UPDATE SET data=excluded.data,category_ids=excluded.category_ids,subject_ids=excluded.subject_ids,exam_ids=excluded.exam_ids",
            "question:"+code,data.toString(),category);
        return q;
    }
    @Test void metadataOffersExactlyReferenceUnitsWithoutLegacySubtopics() throws Exception {
        user("unit_reader",Role.USER);var s=login("unit_reader","Sifre1234");
        var metadata=read(send(s,get("/api/learning-resources/metadata"),null));
        var selectable=new ArrayList<com.fasterxml.jackson.databind.JsonNode>();
        metadata.path("categories").forEach(c->{if(!c.path("selectable").isBoolean()||c.path("selectable").asBoolean())selectable.add(c);});
        assertThat(selectable).hasSize(237);
        assertThat(selectable).allMatch(c->c.path("canonicalUnit").asBoolean()&&c.path("subtopic").asText().isEmpty());
        assertThat(selectable.stream().filter(c->c.path("subjectId").asText().equals("biyoloji")).count()).isEqualTo(25);
    }
    @Test void estimatesAreFilterableAndLegacyCategoryAndNamedFiltersShareOnePool() throws Exception {
        String target=unit("Kalıtım");labelledQuestion("UNIT-ESTIMATE",target);
        user("estimate_reader",Role.USER);var s=login("estimate_reader","Sifre1234");
        var resources=read(send(s,get("/api/learning-resources").param("kind","QUESTION").param("labelStatus","ESTIMATED").param("grade","9"),null).andExpect(status().isOk()));
        assertThat(resources.path("totalElements").asInt()).isEqualTo(1);
        assertThat(resources.path("content").get(0).path("labels").path("gradeStatus").asText()).isEqualTo("ESTIMATED");
        assertThat(resources.toString()).doesNotContain("correctAnswer");
        assertThat(read(send(s,get("/api/learning-resources").param("kind","QUESTION").param("grade","11"),null)).path("totalElements").asInt()).isZero();
        assertThat(read(send(s,get("/api/learning-resources").param("kind","QUESTION").param("labelStatus","APPROVED"),null)).path("totalElements").asInt()).isZero();
        String legacy=jdbc.queryForObject("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'subjectId'='biyoloji' AND definition->>'exam'='TYT' AND definition->>'topic'='Kalıtımın genel ilkeleri' AND definition->>'canonicalUnit'='false' LIMIT 1",String.class);
        for(var request:List.of(get("/api/questions/availability").param("categoryId",target),get("/api/questions/availability").param("categoryId",legacy),get("/api/questions/availability").param("subject","Biyoloji").param("topic","Kalıtım")))
            assertThat(read(send(s,request,null)).path("total").asInt()).isEqualTo(1);
        var facets=read(send(s,get("/api/questions/filters"),null));
        assertThat(facets.get(0).path("topic").asText()).isEqualTo("Kalıtım");
        send(s,get("/api/learning-resources").param("labelStatus","bad"),null).andExpect(status().isBadRequest());
    }
    @Test void teacherUnitSelectionChangesCurrentProgressButPreservesFirstAttemptAndOriginalQuestion() throws Exception {
        String before=unit("Kalıtım"),after=unit("Hücre ve Organeller");
        var q=labelledQuestion("UNIT-HISTORY",before);user("unit_student",Role.USER);user("unit_teacher",Role.OPERATOR);
        var student=login("unit_student","Sifre1234");var teacher=login("unit_teacher","Sifre1234");
        send(student,post("/api/questions/"+q.getId()+"/practice"),json.writeValueAsString(Map.of("clientEventId",UUID.randomUUID(),"eventType","ANSWER","answer","A"))).andExpect(status().isOk());
        var detail=read(send(teacher,get("/api/operator/content-review/item").param("key","question:"+q.getCode()),null));
        var body=json.createObjectNode().put("key","question:"+q.getCode()).put("fingerprint",detail.path("fingerprint").asText()).put("revision",0).put("note","");
        body.putArray("assignments").addObject().put("categoryId",after).put("relation","PRIMARY");
        var saved=read(send(teacher,put("/api/operator/content-review/topics"),body.toString()).andExpect(status().isOk()));
        assertThat(saved.path("status").asText()).isEqualTo("FIX");
        assertThat(saved.path("labels").path("grades").size()).isEqualTo(2);
        assertThat(saved.path("labels").path("gradeStatus").asText()).isEqualTo("ESTIMATED");
        assertThat(read(send(student,get("/api/learning-resources").param("kind","QUESTION").param("labelStatus","ESTIMATED"),null)).path("totalElements").asInt()).isEqualTo(1);
        var current=read(send(student,get("/api/learning-resources/progress"),null));
        var historical=read(send(student,get("/api/learning-resources/progress").param("classification","HISTORICAL"),null));
        assertThat(current.path("categories").get(0).path("categoryId").asText()).isEqualTo(after);
        assertThat(historical.path("categories").get(0).path("categoryId").asText()).isEqualTo(before);
        assertThat(current.path("summary").path("correct").asInt()).isEqualTo(1);
        assertThat(questions.findById(q.getId()).orElseThrow().getTopic()).isEqualTo("Konu");
        assertThat(questions.findById(q.getId()).orElseThrow().getCorrectAnswer()).isEqualTo("A");
        assertThat(read(send(student,get("/api/questions/code/"+q.getCode()),null)).path("topic").asText()).isEqualTo("Hücre ve Organeller");
        send(teacher,put("/api/operator/content-review/topics"),body.toString()).andExpect(status().isConflict());
    }
    @Test void practiceAndExamUseTheSameCanonicalUnitAndSaveItsSnapshot() throws Exception {
        String id=unit("Kalıtım");var q=labelledQuestion("UNIT-SESSION",id);user("unit_practice",Role.USER);var s=login("unit_practice","Sifre1234");
        String body=json.writeValueAsString(Map.of("examType","TYT","subject","Biyoloji","categoryId",List.of(id),"questionCount",1,"selectionMode","MIXED","clientRequestId",UUID.randomUUID()));
        var practice=read(send(s,post("/api/study-sessions"),body).andExpect(status().isCreated()));
        assertThat(practice.path("questions").get(0).path("questionId").asLong()).isEqualTo(q.getId());
        assertThat(practice.path("questions").get(0).path("topic").asText()).isEqualTo("Kalıtım");
        var exam=read(send(s,post("/api/exams"),body).andExpect(status().isCreated()));
        assertThat(exam.path("questionCount").asInt()).isEqualTo(1);
        assertThat(exam.path("questions").get(0).path("topic").asText()).isEqualTo("Kalıtım");
        assertThat(jdbc.queryForObject("SELECT learning_label_snapshot->'labels'->'assignments'->0->>'categoryId' FROM exam_questions WHERE exam_id=?",String.class,exam.path("id").asLong())).isEqualTo(id);
    }
}
