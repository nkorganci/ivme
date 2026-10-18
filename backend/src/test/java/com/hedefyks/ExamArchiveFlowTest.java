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

    @Test void incompleteYearDoesNotBorrowFromAnotherYearAndArchiveSurvivesQuestionRemoval() throws Exception {
        var codes=seed(ExamType.AYT,ExamTrack.SAYISAL,2085);
        seed(ExamType.AYT,ExamTrack.SAYISAL,2084);
        user("archive_shortage",Role.USER);var session=login("archive_shortage","Sifre1234");
        jdbc.update("UPDATE questions SET active=false WHERE code=?",codes.getFirst());
        send(session,post("/api/exams/full"),"{\"examType\":\"AYT\",\"year\":2085}").andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exams",Integer.class)).isZero();
        var complete=read(send(session,post("/api/exams/full"),"{\"examType\":\"AYT\",\"year\":2084}").andExpect(status().isCreated()));
        assertThat(complete.path("questionCount").asInt()).isEqualTo(80);
        assertThat(complete.path("timeLimitMinutes").asInt()).isEqualTo(180);
        jdbc.update("DELETE FROM questions WHERE code=?",codes.getFirst());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_archive_positions WHERE question_code=?",Integer.class,codes.getFirst())).isEqualTo(1);
    }
}
