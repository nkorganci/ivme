package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.user.Role;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FullExamFlowTest extends TestBase {
    private static final Map<String, Integer> TYT = Map.of("Türkçe",40,"Matematik",40,"Tarih",5,
            "Coğrafya",5,"Felsefe",5,"Din Kültürü",5,"Fizik",7,"Kimya",7,"Biyoloji",6);
    private static final Map<String, Map<String, Integer>> AYT = Map.of(
            "SAYISAL", Map.of("Matematik",40,"Fizik",14,"Kimya",13,"Biyoloji",13),
            "ESIT_AGIRLIK", Map.of("Matematik",40,"Türk Dili ve Edebiyatı",24,"Tarih-1",10,"Coğrafya-1",6),
            "SOZEL", Map.of("Türk Dili ve Edebiyatı",24,"Tarih-1",10,"Coğrafya-1",6,
                    "Tarih-2",11,"Coğrafya-2",11,"Felsefe Grubu",12,"Din Kültürü",6));

    private void seed() {
        var subjects = new HashSet<>(TYT.keySet());
        AYT.values().forEach(quotas -> subjects.addAll(quotas.keySet()));
        var rows = new ArrayList<Object[]>();
        for (var bank : QuestionBank.values()) for (var exam : ExamType.values())
            for (String subject : subjects) for (int i=0; i<48; i++) {
                rows.add(new Object[]{bank+"-"+exam+"-"+subject+"-"+i, bank.name(), exam.name(), subject});
            }
        jdbc.batchUpdate("INSERT INTO questions(code,bank,exam_type,subject,topic,image,correct_answer) VALUES (?,?,?,?,'Konu','fixture.webp','A')", rows);
    }

    @Test void fullExamsKeepEveryQuotaAndSelectOnlyRequestedBanksAndExam() throws Exception {
        seed(); user("full_exam_student", Role.USER);
        var session = login("full_exam_student", "Sifre1234");
        for (String exam : List.of("TYT", "AYT")) for (String track : AYT.keySet())
            for (String bank : List.of("OGM", "CIKMIS", "")) {
                if (exam.equals("TYT") && !track.equals("SAYISAL")) continue;
                var request = json.createObjectNode().put("examType",exam).put("track",track);
                if (!bank.isEmpty()) request.put("bank",bank);
                // Full exams cannot inherit an old topic, difficulty or custom count.
                request.put("questionCount",1).put("subject","Yanlış branş").put("topicPdfId",999)
                        .put("teacherDifficulty","ZOR").put("selectionMode","WRONG");
                var result = read(send(session, post("/api/exams/full"),request.toString()).andExpect(status().isCreated()));
                var expected = exam.equals("TYT") ? TYT : AYT.get(track);
                assertThat(result.path("questionCount").asInt()).isEqualTo(exam.equals("TYT")?120:80);
                assertThat(result.path("timeLimitMinutes").asInt()).isEqualTo(exam.equals("TYT")?165:180);
                assertThat(result.path("selectionMode").asText()).isEqualTo("MIXED");
                var actual = new LinkedHashMap<String,Integer>(); var ids = new HashSet<Long>();
                for (JsonNode q : result.path("questions")) {
                    actual.merge(q.path("subject").asText(),1,Integer::sum);
                    assertThat(ids.add(q.path("questionId").asLong())).isTrue();
                    assertThat(q.has("correctAnswer")).isFalse();
                }
                assertThat(actual).isEqualTo(expected);
                var selected = jdbc.queryForList("SELECT DISTINCT q.bank,q.exam_type,q.active FROM exam_questions eq JOIN questions q ON q.id=eq.question_id WHERE eq.exam_id=?", result.path("id").asLong());
                assertThat(selected).allSatisfy(row -> {
                    assertThat(row.get("exam_type")).isEqualTo(exam);
                    assertThat(row.get("active")).isEqualTo(true);
                    if (!bank.isEmpty()) assertThat(row.get("bank")).isEqualTo(bank);
                });
                if (bank.isEmpty()) assertThat(selected).extracting(row -> row.get("bank")).containsExactlyInAnyOrder("OGM","CIKMIS");
                var planRequest = get("/api/exams/plan").param("examType",exam).param("track",track);
                if (!bank.isEmpty()) planRequest.param("bank",bank);
                var plan = read(send(session,planRequest,null).andExpect(status().isOk()));
                assertThat(plan.path("questionCount").asInt()).isEqualTo(ids.size());
                assertThat(plan.path("ready").asBoolean()).isTrue();
            }
    }

    @Test void missingBranchDoesNotBorrowQuestionsFromAnotherBranchOrBank() throws Exception {
        seed(); user("short_exam_student",Role.USER);
        var session = login("short_exam_student","Sifre1234");
        jdbc.update("UPDATE questions SET active=false WHERE bank='OGM' AND exam_type='AYT' AND subject='Fizik'");
        var plan=read(send(session,get("/api/exams/plan").param("bank","OGM").param("examType","AYT"),null).andExpect(status().isOk()));
        assertThat(plan.path("ready").asBoolean()).isFalse();
        send(session,post("/api/exams/full"),"{\"bank\":\"OGM\",\"examType\":\"AYT\"}").andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM exams",Integer.class)).isZero();
        send(session,post("/api/exams/full"),"{\"examType\":\"AYT\"}").andExpect(status().isCreated());
        send(session,post("/api/exams/full"),"{}").andExpect(status().isBadRequest());
    }

    @Test void repeatedFullExamDrawsDifferentQuestions() throws Exception {
        seed(); user("random_exam_student",Role.USER);
        var session=login("random_exam_student","Sifre1234");
        var first=read(send(session,post("/api/exams/full"),"{\"bank\":\"OGM\",\"examType\":\"AYT\"}").andExpect(status().isCreated()));
        var second=read(send(session,post("/api/exams/full"),"{\"bank\":\"OGM\",\"examType\":\"AYT\"}").andExpect(status().isCreated()));
        var one=new HashSet<Long>();var two=new HashSet<Long>();
        first.path("questions").forEach(q->one.add(q.path("questionId").asLong()));
        second.path("questions").forEach(q->two.add(q.path("questionId").asLong()));
        assertThat(one).isNotEqualTo(two);
    }

    @Test void excludingSolvedUsesBothPracticeAndSubmittedExamHistoryForEachSource() throws Exception {
        seed(); user("new_exam_student", Role.USER);
        var session = login("new_exam_student", "Sifre1234");
        for (String exam : List.of("TYT", "AYT")) for (String bank : List.of("OGM", "CIKMIS")) {
            long practiced = jdbc.queryForObject("SELECT id FROM questions WHERE bank=? AND exam_type=? AND subject='Matematik' ORDER BY id LIMIT 1", Long.class, bank, exam);
            send(session, post("/api/questions/" + practiced + "/practice"),
                    "{\"clientEventId\":\"" + java.util.UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\"B\"}")
                    .andExpect(status().isOk());
            var previous = read(send(session, post("/api/exams"), json.createObjectNode()
                    .put("bank", bank).put("examType", exam).put("subject", "Matematik")
                    .put("questionCount", 1).put("selectionMode", "NEW").toString()).andExpect(status().isCreated()));
            long examined = previous.path("questions").get(0).path("questionId").asLong();
            send(session, post("/api/exams/" + previous.path("id").asLong() + "/submit"),
                    "{\"answers\":{\"" + examined + "\":\"A\"}}").andExpect(status().isOk());

            var freshPlan = read(send(session, get("/api/exams/plan").param("bank", bank).param("examType", exam)
                    .param("includeSolved", "false"), null).andExpect(status().isOk()));
            assertThat(freshPlan.path("selectionMode").asText()).isEqualTo("NEW");
            assertThat(freshPlan.path("subjects").findValues("available")).allSatisfy(value -> assertThat(value.asInt()).isBetween(46, 48));
            var full = read(send(session, post("/api/exams/full"), json.createObjectNode()
                    .put("bank", bank).put("examType", exam).put("includeSolved", false).toString()).andExpect(status().isCreated()));
            assertThat(full.path("selectionMode").asText()).isEqualTo("NEW");
            for (var question : full.path("questions")) {
                assertThat(question.path("questionId").asLong()).isNotIn(practiced, examined);
            }

            // Solving enough mathematics questions must cause a real shortage, never a repeat fallback.
            var owner = users.findAll().stream().filter(item -> item.getUsername().equals("new_exam_student")).findFirst().orElseThrow();
            jdbc.update("INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct) "
                    + "SELECT ?,id,gen_random_uuid(),'ANSWER','A',correct_answer,true FROM questions WHERE bank=? AND exam_type=? AND subject='Matematik'", owner.getId(), bank, exam);
            var emptyPlan = read(send(session, get("/api/exams/plan").param("bank", bank).param("examType", exam)
                    .param("includeSolved", "false"), null).andExpect(status().isOk()));
            assertThat(emptyPlan.path("ready").asBoolean()).isFalse();
            send(session, post("/api/exams/full"), json.createObjectNode().put("bank", bank)
                    .put("examType", exam).put("includeSolved", false).toString()).andExpect(status().isBadRequest());
            var mixed = read(send(session, post("/api/exams/full"), json.createObjectNode().put("bank", bank)
                    .put("examType", exam).put("includeSolved", true).toString()).andExpect(status().isCreated()));
            assertThat(mixed.path("selectionMode").asText()).isEqualTo("MIXED");
        }
    }
}
