package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.exam.*;
import com.hedefyks.question.*;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;

class ExamArchiveFlowTest extends TestBase {
    @Autowired ExamPlanService plans;
    @AfterEach void clearPositions() { jdbc.update("DELETE FROM exam_archive_positions WHERE question_code LIKE 'ARCHIVE-%'"); }

    private List<String> seed(ExamType exam, ExamTrack track, int year) {
        var codes = new ArrayList<String>(); int position=1;
        for (var quota : plans.fullQuotas(exam,track)) for (int i=0;i<quota.target();i++) {
            // Reverse lexical/insertion order: only the preserved position may determine booklet order.
            String code="ARCHIVE-"+exam+"-"+year+"-"+(1000-position);
            var q=question(code,quota.subject(),"A"); q.setYear(year);q.setExamType(exam);questions.saveAndFlush(q);
            jdbc.update("INSERT INTO exam_archive_positions(question_code,exam_year,exam_type,subject,booklet_position) VALUES (?,?,?,?,?)",
                    code,year,exam.name(),quota.subject(),position++);
            codes.add(code);
        }
        return codes;
    }

    @Test void archiveStartsOnlyChosenYearInBookletOrderAndRetainsAllQuestionsOnRepeat() throws Exception {
        var codes=seed(ExamType.TYT,ExamTrack.SAYISAL,2084);
        seed(ExamType.TYT,ExamTrack.SAYISAL,2085);
        user("archive_student",Role.USER); var session=login("archive_student","Sifre1234");
        var list=read(send(session,get("/api/exams/archive").param("examType","TYT"),null).andExpect(status().isOk()));
        assertThat(list.findValues("ready")).anySatisfy(v -> assertThat(v.asBoolean()).isTrue());
        for(int repeat=0;repeat<2;repeat++) {
            var result=read(send(session,post("/api/exams/full"),"{\"examType\":\"TYT\",\"year\":2084}").andExpect(status().isCreated()));
            assertThat(result.path("title").asText()).isEqualTo("2084 TYT tam sınavı");
            assertThat(result.path("questions").findValuesAsText("code")).containsExactlyElementsOf(codes);
            assertThat(result.path("questionCount").asInt()).isEqualTo(120);
            assertThat(result.path("timeLimitMinutes").asInt()).isEqualTo(165);
            send(session,post("/api/exams/"+result.path("id").asLong()+"/submit"),"{}").andExpect(status().isOk());
        }
        send(session,post("/api/exams/full"),"{\"examType\":\"TYT\",\"year\":2084,\"includeSolved\":false}").andExpect(status().isBadRequest());
        send(session,post("/api/exams/full"),"{\"examType\":\"TYT\",\"year\":2084,\"bank\":\"OGM\"}").andExpect(status().isBadRequest());
    }

    @Test void incompleteYearUsesMarkedReplacementAndArchiveSurvivesQuestionRemoval() throws Exception {
        var codes=seed(ExamType.AYT,ExamTrack.SAYISAL,2085);
        seed(ExamType.AYT,ExamTrack.SAYISAL,2084);
        user("archive_shortage",Role.USER);var session=login("archive_shortage","Sifre1234");
        jdbc.update("UPDATE questions SET active=false WHERE code=?",codes.getFirst());
        var supplemented=read(send(session,post("/api/exams/full"),"{\"examType\":\"AYT\",\"year\":2085}").andExpect(status().isCreated()));
        assertThat(supplemented.path("questionCount").asInt()).isEqualTo(80);
        assertThat(supplemented.path("title").asText()).contains("tahmini sorularla tamamlandı");
        assertThat(supplemented.path("questions").findValuesAsText("code")).doesNotHaveDuplicates().doesNotContain(codes.getFirst());
        assertThat(supplemented.path("questions").findValues("archiveProvisional").stream().filter(v -> v.asBoolean())).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_questions WHERE exam_id=? AND archive_provisional",Integer.class,supplemented.path("id").asLong())).isEqualTo(1);
        var complete=read(send(session,post("/api/exams/full"),"{\"examType\":\"AYT\",\"year\":2084}").andExpect(status().isCreated()));
        assertThat(complete.path("questionCount").asInt()).isEqualTo(80);
        assertThat(complete.path("timeLimitMinutes").asInt()).isEqualTo(180);
        jdbc.update("DELETE FROM questions WHERE code=?",codes.getFirst());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_archive_positions WHERE question_code=?",Integer.class,codes.getFirst())).isEqualTo(1);
    }

    @Test void thirtyFourTurkishQuestionsAreCompletedToFortyAndMarkersSurviveResumeAndGrading() throws Exception {
        var codes=seed(ExamType.TYT,ExamTrack.SAYISAL,2086);
        for (var code : codes.subList(0,6)) jdbc.update("UPDATE questions SET active=false WHERE code=?",code);
        var replacements=new ArrayList<String>();
        for(int n=0;n<6;n++) {
            String code="ARCHIVE-SUPPLEMENT-"+n;
            var q=question(code,"Türkçe","B"); q.setBank(QuestionBank.OGM);questions.saveAndFlush(q);
            replacements.add(code);
            var wrongExam=question("ARCHIVE-WRONG-EXAM-"+n,"Türkçe","A");wrongExam.setExamType(ExamType.AYT);questions.saveAndFlush(wrongExam);
            var inactive=question("ARCHIVE-INACTIVE-"+n,"Türkçe","A");inactive.setActive(false);questions.saveAndFlush(inactive);
        }
        user("archive_turkish",Role.USER);var session=login("archive_turkish","Sifre1234");
        var list=read(send(session,get("/api/exams/archive").param("examType","TYT"),null).andExpect(status().isOk()));
        var plan=java.util.stream.StreamSupport.stream(list.spliterator(),false).filter(p->p.path("year").asInt()==2086).findFirst().orElseThrow();
        assertThat(plan.path("ready").asBoolean()).isTrue();
        assertThat(plan.path("estimatedQuestionCount").asInt()).isEqualTo(6);
        assertThat(plan.path("subjects").get(0).path("available").asInt()).isEqualTo(34);
        var exam=read(send(session,post("/api/exams/full"),"{\"examType\":\"TYT\",\"year\":2086}").andExpect(status().isCreated()));
        assertThat(exam.path("questionCount").asInt()).isEqualTo(120);
        assertThat(exam.path("timeLimitMinutes").asInt()).isEqualTo(165);
        var selected=exam.path("questions");
        assertThat(selected.findValuesAsText("code")).doesNotHaveDuplicates().containsAll(replacements);
        for(int n=0;n<34;n++) assertThat(selected.get(n).path("code").asText()).isEqualTo(codes.get(n+6));
        for(int n=34;n<40;n++) {
            assertThat(selected.get(n).path("archiveProvisional").asBoolean()).isTrue();
            assertThat(selected.get(n).path("subject").asText()).isEqualTo("Türkçe");
        }
        var answers=json.createObjectNode();
        for(var q:selected) if(q.path("archiveProvisional").asBoolean()) answers.put(q.path("questionId").asText(),"B");
        long id=exam.path("id").asLong();
        var resumed=read(send(session,get("/api/exams/"+id),null).andExpect(status().isOk()));
        assertThat(resumed.path("questions")).isEqualTo(selected);
        var result=read(send(session,post("/api/exams/"+id+"/submit"),json.createObjectNode().set("answers",answers).toString()).andExpect(status().isOk()));
        assertThat(result.path("correctCount").asInt()).isEqualTo(6);
        assertThat(result.path("blankCount").asInt()).isEqualTo(114);
        assertThat(result.path("questions").findValues("archiveProvisional").stream().filter(v->v.asBoolean())).hasSize(6);
        var stored=read(send(session,get("/api/exams/"+id+"/result"),null).andExpect(status().isOk()));
        assertThat(stored.path("questions")).isEqualTo(result.path("questions"));
    }

    @Test void insufficientReplacementPoolAndUnknownYearStillRejectWithoutPartialExams() throws Exception {
        var codes=seed(ExamType.TYT,ExamTrack.SAYISAL,2087);
        jdbc.update("UPDATE questions SET active=false WHERE code=?",codes.getFirst());
        user("archive_insufficient",Role.USER);var session=login("archive_insufficient","Sifre1234");
        var list=read(send(session,get("/api/exams/archive").param("examType","TYT"),null).andExpect(status().isOk()));
        var plan=java.util.stream.StreamSupport.stream(list.spliterator(),false).filter(p->p.path("year").asInt()==2087).findFirst().orElseThrow();
        assertThat(plan.path("ready").asBoolean()).isFalse();
        send(session,post("/api/exams/full"),"{\"examType\":\"TYT\",\"year\":2087}").andExpect(status().isBadRequest());
        send(session,post("/api/exams/full"),"{\"examType\":\"TYT\",\"year\":2099}").andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exams",Integer.class)).isZero();
    }

    @ParameterizedTest @EnumSource(ExamTrack.class)
    void allAytTracksCanFillAnEntireMissingSubject(ExamTrack track) throws Exception {
        var codes=seed(ExamType.AYT,track,2088);
        var missing=plans.fullQuotas(ExamType.AYT,track).getFirst();
        for(var code:codes.subList(0,missing.target())) jdbc.update("UPDATE questions SET active=false WHERE code=?",code);
        for(int n=0;n<missing.target();n++) {
            var q=question("ARCHIVE-TRACK-"+n,missing.subject(),"A");q.setExamType(ExamType.AYT);q.setBank(QuestionBank.OGM);questions.saveAndFlush(q);
        }
        user("archive_track",Role.USER);var session=login("archive_track","Sifre1234");
        var exam=read(send(session,post("/api/exams/full"),"{\"examType\":\"AYT\",\"year\":2088,\"track\":\""+track+"\"}").andExpect(status().isCreated()));
        assertThat(exam.path("questionCount").asInt()).isEqualTo(80);
        assertThat(exam.path("timeLimitMinutes").asInt()).isEqualTo(180);
        assertThat(exam.path("questions").findValuesAsText("code")).doesNotHaveDuplicates();
        for(var quota:plans.fullQuotas(ExamType.AYT,track))
            assertThat(exam.path("questions").findValuesAsText("subject").stream().filter(quota.subject()::equals)).hasSize(quota.target());
        assertThat(exam.path("questions").findValues("archiveProvisional").stream().filter(v->v.asBoolean())).hasSize(missing.target());
    }
}
