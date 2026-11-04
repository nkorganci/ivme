package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpSession;

class YurtDisiContentTest extends TestBase {
    private static final String RUN="yurt-disi-content-test";

    @BeforeEach void fixture() throws Exception {
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')",RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES(true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key",RUN);
        category("tyt","TYT","Türkçe");category("yd","YURT_DISI_MY","Eğitim Bilimleri");
        catalogQuestion("tyt","TYT","Türkçe");catalogQuestion("yd","YURT_DISI_MY","Eğitim Bilimleri");
    }
    @AfterEach void cleanup() {
        jdbc.update("DELETE FROM official_exam_booklet_questions WHERE booklet_id LIKE 'test-yd-%'");
        jdbc.update("DELETE FROM official_exam_booklets WHERE id LIKE 'test-yd-%'");
        jdbc.update("DELETE FROM exam_source_documents WHERE path='test-yd.pdf'");
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?",RUN);
        jdbc.update("DELETE FROM learning_catalog.assignments WHERE run_key=?",RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?",RUN);
        jdbc.update("DELETE FROM learning_catalog.categories WHERE run_key=?",RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?",RUN);
    }
    private void category(String id,String exam,String subject) throws Exception {
        jdbc.update("INSERT INTO learning_catalog.categories VALUES(?,?,?::jsonb)",RUN,id,json.writeValueAsString(Map.of(
            "id",id,"exam",exam,"subjectId",id,"subject",subject,"unit",subject,"topic",subject,
            "canonicalUnit",true,"selectable",true,"origin","CURRICULUM","order",1)));
    }
    private void catalogQuestion(String id,String exam,String subject) throws Exception {
        catalogQuestion(id,exam,subject,id);
    }
    private void catalogQuestion(String id,String exam,String subject,String category) throws Exception {
        var q=question("TEST-"+id,subject,"A");q.setBank(QuestionBank.CIKMIS);q.setExamType(ExamType.valueOf(exam));q.setYear(2026);
        questions.saveAndFlush(q);
        var data=new LinkedHashMap<String,Object>();
        data.put("key","question:"+q.getCode());data.put("questionCode",q.getCode());data.put("exam",exam);
        data.put("bank","CIKMIS");data.put("subjectId",category);data.put("subject",subject);data.put("studentVisible",true);
        data.put("sourceUpdatedAt",jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,q.getId()));
        data.put("automaticLabels",Map.of("assignments",List.of(Map.of("categoryId",category,"relation","PRIMARY","scopeStatus","CANDIDATE"))));
        jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) VALUES(?,?,'QUESTION',?,?,true,?::jsonb,ARRAY[?],ARRAY[?],ARRAY[?])",
            RUN,"question:"+q.getCode(),exam,category,json.writeValueAsString(data),category,category,exam);
        jdbc.update("INSERT INTO learning_catalog.assignments VALUES(?,?,?,'PRIMARY')",RUN,"question:"+q.getCode(),category);
    }
    private void choose(MockHttpSession session,String track) throws Exception {
        send(session,put("/api/exam-tracks/current"),json.writeValueAsString(Map.of("trackId",track))).andExpect(status().isOk());
    }
    @Test void personalMarksFollowBankQuestionsAcrossTracksAndPractice() throws Exception {
        user("yd_marks",Role.USER);var session=login("yd_marks","Sifre1234");
        user("yd_marks_other",Role.USER);var other=login("yd_marks_other","Sifre1234");
        catalogQuestion("yd_next","YURT_DISI_MY","Eğitim Bilimleri","yd");
        for(String[] track:List.of(new String[]{"YKS","tyt"},new String[]{"YURT_DISI_OGRETMEN","yd"})) {
            choose(session,track[0]);choose(other,track[0]);
            long qid=jdbc.queryForObject("SELECT id FROM questions WHERE code=?",Long.class,"TEST-"+track[1]);
            String pref="/api/question-preferences/questions/"+qid;
            send(session,put(pref),"{\"difficulty\":\"ZOR\",\"repeat\":\"HIDE\"}").andExpect(status().isOk());
            var list=read(send(session,get("/api/questions"),null));
            for(var q:list.path("content"))assertThat(q.path("id").asLong()).isNotEqualTo(qid);
            long own=list.path("totalElements").asLong();
            assertThat(read(send(other,get("/api/questions"),null)).path("totalElements").asLong()).isEqualTo(own+1);
            assertThat(read(send(session,get("/api/questions/availability").param("practice","true"),null)).path("total").asLong()).isEqualTo(own);
            var hidden=read(send(session,post("/api/study-sessions"),json.writeValueAsString(Map.of("questionCount",1,"mark","HIDE","myDifficulty","ZOR","clientRequestId",UUID.randomUUID().toString()))).andExpect(status().isCreated()));
            assertThat(hidden.path("questions").get(0).path("questionId").asLong()).isEqualTo(qid);
            assertThat(read(send(session,get(pref),null)).path("difficulty").asText()).isEqualTo("ZOR");
            send(session,put(pref),"{\"repeat\":\"DEFAULT\"}").andExpect(status().isOk());
            assertThat(read(send(session,get("/api/questions"),null)).path("totalElements").asLong()).isEqualTo(own+1);
            assertThat(read(send(session,get(pref),null)).path("difficulty").asText()).isEqualTo("ZOR");
        }
    }
    @Test void allLessonSectionsUseOnlyCurrentTrackContent() throws Exception {
        user("yd_content",Role.USER);var session=login("yd_content","Sifre1234");
        choose(session,"YURT_DISI_OGRETMEN");
        var metadata=read(send(session,get("/api/learning-resources/metadata"),null).andExpect(status().isOk()));
        assertThat(metadata.path("categories").size()).isEqualTo(1);
        assertThat(metadata.path("categories").get(0).path("exam").asText()).isEqualTo("YURT_DISI_MY");
        var coverage=read(send(session,get("/api/learning-resources/coverage").param("exam","YURT_DISI_MY").param("subject","yd"),null).andExpect(status().isOk()));
        assertThat(coverage.path("categories").get(0).path("bankCounts").path("CIKMIS").asInt()).isEqualTo(1);
        jdbc.update("INSERT INTO exam_source_documents(track_id,path,sha256,role,status,question_count,active_count,note) VALUES('YURT_DISI_OGRETMEN','test-yd.pdf',?,'SORU_KITAPCIGI','ISLENDI',1,1,'test')","a".repeat(64));
        var content=read(send(session,get("/api/exam-content"),null).andExpect(status().isOk()));
        assertThat(content.path("distribution").size()).isEqualTo(1);
        assertThat(content.path("distribution").get(0).path("yearCounts").path("2026").asInt()).isEqualTo(1);
        assertThat(content.path("documents").size()).isEqualTo(1);
        send(session,get("/api/exam-content/document").param("path","../secret.pdf"),null).andExpect(status().isNotFound());
        var selection=read(send(session,get("/api/exam-tracks"),null));
        var track=selection.path("tracks").findValues("id");
        assertThat(track).isNotEmpty();
        var flags=new ArrayList<String>();
        selection.path("tracks").forEach(t->{if(t.path("id").asText().equals("YURT_DISI_OGRETMEN"))t.path("readyFeatures").forEach(f->flags.add(f.asText()));});
        assertThat(flags).contains("curriculum","pdf-inventory","statistics");
        choose(session,"YKS");
        var yks=read(send(session,get("/api/learning-resources/metadata"),null));
        assertThat(yks.path("categories").size()).isEqualTo(1);
        assertThat(yks.path("categories").get(0).path("exam").asText()).isEqualTo("TYT");
        assertThat(read(send(session,get("/api/exam-content"),null)).path("documents").size()).isZero();
    }
    @Test void historyAndTopicStatisticsStayWithTheirExamWithoutChangingRecords() throws Exception {
        long uid=user("yd_history",Role.USER).getId();var session=login("yd_history","Sifre1234");
        savedHistory(uid,"tyt","YKS","TYT","Türkçe");
        savedHistory(uid,"yd","YURT_DISI_OGRETMEN","YURT_DISI_MY","Eğitim Bilimleri");
        choose(session,"YURT_DISI_OGRETMEN");
        assertThat(read(send(session,get("/api/study-sessions"),null)).path("totalElements").asInt()).isEqualTo(1);
        var exams=read(send(session,get("/api/exams"),null).andExpect(status().isOk()));
        assertThat(exams.path("totalElements").asInt()).isEqualTo(1);
        assertThat(exams.path("content").get(0).path("examType").asText()).isEqualTo("YURT_DISI_MY");
        var progress=read(send(session,get("/api/learning-resources/progress"),null).andExpect(status().isOk()));
        assertThat(progress.path("summary").path("total").asInt()).isEqualTo(1);
        assertThat(progress.path("categories").size()).isEqualTo(1);
        assertThat(progress.path("categories").get(0).path("categoryId").asText()).isEqualTo("yd");
        choose(session,"YKS");
        assertThat(read(send(session,get("/api/exams"),null)).path("content").get(0).path("examType").asText()).isEqualTo("TYT");
        assertThat(read(send(session,get("/api/learning-resources/progress"),null)).path("categories").get(0).path("categoryId").asText()).isEqualTo("tyt");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts WHERE user_id=?",Integer.class,uid)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exams WHERE user_id=?",Integer.class,uid)).isEqualTo(2);
    }
    private void savedHistory(long uid,String id,String track,String exam,String subject) {
        long qid=jdbc.queryForObject("SELECT id FROM questions WHERE code=?",Long.class,"TEST-"+id);
        long sid=jdbc.queryForObject("INSERT INTO study_sessions(user_id,mode,selection_mode,status,ended_at,track_id) VALUES(?,'PRACTICE','MIXED','COMPLETED',now(),?) RETURNING id",Long.class,uid,track);
        jdbc.update("INSERT INTO session_questions VALUES(?,?,1)",sid,qid);
        jdbc.update("INSERT INTO question_attempts(user_id,question_id,session_id,client_event_id,event_type,selected_answer,correct_answer,is_correct) VALUES(?,?,?,?,'ANSWER','A','A',true)",uid,qid,sid,UUID.randomUUID());
        long eid=jdbc.queryForObject("INSERT INTO exams(user_id,title,exam_type,status,question_count,submitted_at,duration_seconds,correct_count,wrong_count,blank_count,percent,net,track_id) VALUES(?, ?,?,'SUBMITTED',1,now(),10,1,0,0,100,1,?) RETURNING id",Long.class,uid,exam,exam,track);
        jdbc.update("INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,selected_answer,correct_answer,is_correct) VALUES(?,?,1,?,?,'A','A',true)",eid,qid,"TEST-"+id,subject);
    }

    @Test void generalExamAndUnfilteredPracticeFollowMebWeights() throws Exception {
        String[] subjects={"Türkçe ve Türk Kültürü","Tarih ve Coğrafya","Eğitim Bilimleri","Mevzuat ve Genel Kültür"};
        int[] target={18,18,12,12};
        for(int group=0;group<4;group++)if(group!=2)category("mix"+group,"YURT_DISI_MY",subjects[group]);
        for(int group=0;group<4;group++)for(int n=0;n<target[group];n++) {
            String key="mix"+group+"_"+n;
            catalogQuestion(key,"YURT_DISI_MY",subjects[group],group==2?"yd":"mix"+group);
        }
        var learner=user("yd_mixed",Role.USER);var session=login("yd_mixed","Sifre1234");choose(session,"YURT_DISI_OGRETMEN");
        var plan=read(send(session,get("/api/exams/plan").param("examType","YURT_DISI_MY"),null).andExpect(status().isOk()));
        assertThat(plan.path("questionCount").asInt()).isEqualTo(60);
        assertThat(plan.path("timeLimitMinutes").asInt()).isEqualTo(75);
        assertThat(plan.path("ready").asBoolean()).isTrue();
        for(int i=0;i<4;i++)assertThat(plan.path("subjects").get(i).path("target").asInt()).isEqualTo(target[i]);
        var exam=read(send(session,post("/api/exams/full"),"{\"examType\":\"YURT_DISI_MY\",\"includeSolved\":true}").andExpect(status().isCreated()));
        assertThat(exam.path("questionCount").asInt()).isEqualTo(60);
        for(int i=0;i<4;i++) {
            long count=0;for(var question:exam.path("questions"))if(question.path("subject").asText().equals(subjects[i]))count++;
            assertThat(count).isEqualTo(target[i]);
        }
        var hiddenIds=jdbc.queryForList("SELECT id FROM questions WHERE code LIKE 'TEST-mix0_%' ORDER BY id LIMIT 16",Long.class);
        for(long hidden:hiddenIds)jdbc.update("INSERT INTO student_question_preferences(user_id,question_id,repeat_preference) VALUES(?,?,'HIDE')",learner.getId(),hidden);
        // Only two Turkish questions remain; a 10-question practice needs three.
        send(session,post("/api/study-sessions"),json.writeValueAsString(Map.of("questionCount",10,"clientRequestId",UUID.randomUUID().toString()))).andExpect(status().isBadRequest());
        jdbc.update("DELETE FROM student_question_preferences WHERE user_id=? AND question_id=?",learner.getId(),hiddenIds.getFirst());
        var practice=read(send(session,post("/api/study-sessions"),json.writeValueAsString(Map.of("questionCount",10,"clientRequestId",UUID.randomUUID().toString()))).andExpect(status().isCreated()));
        for(var question:practice.path("questions"))assertThat(hiddenIds.subList(1,hiddenIds.size())).doesNotContain(question.path("questionId").asLong());
        int[] practiceTarget={3,3,2,2};
        for(int i=0;i<4;i++) {
            long count=0;for(var question:practice.path("questions"))if(question.path("subject").asText().equals(subjects[i]))count++;
            assertThat(count).isEqualTo(practiceTarget[i]);
        }
    }

    @Test void yearBookletsKeepTheirOrderAndRejectWrongOrMissingSessions() throws Exception {
        user("yd_booklet",Role.USER);var session=login("yd_booklet","Sifre1234");choose(session,"YURT_DISI_OGRETMEN");
        category("yd_second","YURT_DISI_MY","Türkçe ve Türk Kültürü");catalogQuestion("yd_second","YURT_DISI_MY","Türkçe ve Türk Kültürü");
        for(String id:List.of("test-yd-A","test-yd-B")) {
            jdbc.update("INSERT INTO official_exam_booklets(id,track_id,exam_type,exam_year,label,source_path,source_sha256,expected_count,time_limit_minutes,cancelled_numbers) VALUES(?,'YURT_DISI_OGRETMEN','YURT_DISI_MY',2025,?,'test.pdf',?,3,75,ARRAY[3])",id,id,"a".repeat(64));
            jdbc.update("INSERT INTO official_exam_booklet_questions VALUES(?, 'TEST-yd',?)",id,id.endsWith("A")?1:2);
            jdbc.update("INSERT INTO official_exam_booklet_questions VALUES(?, 'TEST-yd_second',?)",id,id.endsWith("A")?2:1);
        }
        var plans=read(send(session,get("/api/exams/archive").param("examType","YURT_DISI_MY"),null).andExpect(status().isOk()));
        assertThat(plans.size()).isEqualTo(2);
        assertThat(plans.get(0).path("excludedQuestionCount").asInt()).isEqualTo(1);
        assertThat(plans.get(0).path("ready").asBoolean()).isTrue();
        send(session,post("/api/exams/full"),"{\"examType\":\"YURT_DISI_MY\",\"year\":2025}").andExpect(status().isBadRequest());
        var exam=read(send(session,post("/api/exams/full"),"{\"examType\":\"YURT_DISI_MY\",\"year\":2025,\"bookletId\":\"test-yd-B\"}").andExpect(status().isCreated()));
        assertThat(exam.path("questionCount").asInt()).isEqualTo(2);
        assertThat(exam.path("questions").get(0).path("code").asText()).isEqualTo("TEST-yd_second");
        send(session,post("/api/exams/full"),"{\"examType\":\"YURT_DISI_MY\",\"year\":2015,\"bookletId\":\"test-yd-B\"}").andExpect(status().isBadRequest());
        var result=read(send(session,post("/api/exams/"+exam.path("id").asLong()+"/submit"),
            json.writeValueAsString(Map.of("answers",Map.of(
                exam.path("questions").get(0).path("questionId").asText(),"B",
                exam.path("questions").get(1).path("questionId").asText(),"A")))).andExpect(status().isOk()));
        assertThat(result.path("percent").asDouble()).isEqualTo(50);
        assertThat(result.path("net").asDouble()).isEqualTo(1);
    }
}
