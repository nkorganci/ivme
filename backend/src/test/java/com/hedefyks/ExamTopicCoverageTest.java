package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.exam.*;
import com.hedefyks.question.*;
import com.hedefyks.review.ContentReviewService;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ExamTopicCoverageTest extends TestBase {
    @Autowired ExamPlanService plans;
    @Autowired ExamService exams;
    @Autowired ExamArchiveService archive;
    @Autowired QuestionAvailabilityService availability;
    @MockitoBean ContentReviewService reviews;
    private static final String RUN = "exam-topic-coverage-test";

    @AfterEach void clearRun() {
        jdbc.update("DELETE FROM exam_archive_positions WHERE question_code LIKE 'UNIT-%'");
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.categories WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?", RUN);
    }

    private void seed(String prefix, ExamType exam, String subject, int topics) {
        var rows = new ArrayList<Object[]>();
        for (int topic=0; topic<topics; topic++) for (int n=0; n<(topic==0?50:3); n++)
            rows.add(new Object[]{prefix+"-"+topic+"-"+n,exam.name(),subject,"Ünite "+topic});
        jdbc.batchUpdate("INSERT INTO questions(code,bank,exam_type,subject,topic,image,correct_answer) VALUES (?,'OGM',?,?,?,'fixture.webp','A')", rows);
    }

    private JsonNode branch(MockHttpSession session, int count, String mode) throws Exception {
        return read(send(session,post("/api/exams"),json.createObjectNode().put("bank","OGM")
                .put("examType","TYT").put("subject","Fizik").put("questionCount",count)
                .put("selectionMode",mode).toString()).andExpect(status().isCreated()));
    }

    private Set<String> topics(JsonNode exam) {
        var topics = new HashSet<String>();
        exam.path("questions").forEach(q -> topics.add(q.path("topic").asText()));
        return topics;
    }

    @Test void branchCoverageRotatesUnaskedTopicsDespiteLargeUnequalQuestionPools() throws Exception {
        seed("ROTATE",ExamType.TYT,"Fizik",11);
        user("rotate_student",Role.USER);
        var session = login("rotate_student","Sifre1234");
        var first = topics(branch(session,4,"MIXED"));
        var second = topics(branch(session,4,"NEW"));
        assertThat(first).hasSize(4); assertThat(second).hasSize(4).doesNotContainAnyElementsOf(first);
        var third = topics(branch(session,4,"MIXED"));
        var all = new HashSet<>(first); all.addAll(second); all.addAll(third);
        assertThat(all).hasSize(11);
        var counts = jdbc.queryForList("SELECT count(*) FROM exam_questions GROUP BY topic",Long.class);
        assertThat(Collections.max(counts)-Collections.min(counts)).isLessThanOrEqualTo(1);
    }

    @Test void allFullProfilesBalanceEveryBranchAndRotateWithinItsQuota() {
        for (var type : ExamType.values()) for (var track : ExamTrack.values()) {
            if (type==ExamType.TYT && track!=ExamTrack.SAYISAL) continue;
            var owner = user("profile_"+type+"_"+track,Role.USER);
            for (var quota : plans.fullQuotas(type,track)) {
                if (jdbc.queryForObject("SELECT count(*) FROM questions WHERE exam_type=? AND subject=?",Integer.class,type.name(),quota.subject())==0)
                    seed(type+"-"+quota.subject(),type,quota.subject(),quota.target()+3);
            }
            var request = new ExamDtos.FullExamRequest(QuestionBank.OGM,type,track,true);
            var first = exams.createFull(owner.getId(),request);
            var second = exams.createFull(owner.getId(),request);
            for (var quota : plans.fullQuotas(type,track)) {
                var one = first.questions().stream().filter(q -> q.subject().equals(quota.subject())).map(ExamDtos.SessionQuestion::topic).toList();
                var two = second.questions().stream().filter(q -> q.subject().equals(quota.subject())).map(ExamDtos.SessionQuestion::topic).toList();
                assertThat(one).hasSize(quota.target()).doesNotHaveDuplicates();
                assertThat(two).hasSize(quota.target()).doesNotHaveDuplicates();
                var union = new HashSet<>(one); union.addAll(two);
                // Later profiles can reuse a subject whose quota was larger; all previously omitted units come first.
                assertThat(union).hasSize(Math.min(quota.target()*2,
                    jdbc.queryForObject("SELECT count(DISTINCT topic) FROM questions WHERE exam_type=? AND subject=?",Integer.class,type.name(),quota.subject())));
            }
        }
    }

    @Test void cancelledExamsAndAnotherLearnerDoNotConsumeCoverage() throws Exception {
        seed("OWNER",ExamType.TYT,"Fizik",8);
        var owner = user("coverage_owner",Role.USER);
        var other = user("coverage_other",Role.USER);
        var session = login("coverage_owner","Sifre1234");
        var exam = branch(session,4,"MIXED");
        send(session,post("/api/exams/"+exam.path("id").asLong()+"/cancel"),null).andExpect(status().isNoContent());
        var candidates = availability.balancedSubjectCandidates(owner.getId(),QuestionBank.OGM,ExamType.TYT,QuestionSelectionMode.MIXED,List.of("Fizik"),4);
        assertThat(candidates).allSatisfy(c -> assertThat(c.previousCount()).isZero());
        branch(session,4,"MIXED");
        var unrelated = availability.balancedSubjectCandidates(other.getId(),QuestionBank.OGM,ExamType.TYT,QuestionSelectionMode.MIXED,List.of("Fizik"),4);
        assertThat(unrelated).allSatisfy(c -> assertThat(c.previousCount()).isZero());
    }

    @Test void publishedUnitsAndTeacherCorrectionsOverrideLegacyTopicNames() throws Exception {
        var owner = user("catalog_coverage",Role.USER);
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')",RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key",RUN);
        for (int unit=0;unit<7;unit++) {
            String category = "coverage.unit."+unit;
            var definition = new LinkedHashMap<String,Object>(Map.of("id",category,"exam","TYT","subjectId","fizik",
                    "subject","Fizik","topic","Ortak ünite "+unit,"canonicalUnit",true,"canonicalTopic",true));
            jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)",RUN,category,json.writeValueAsString(definition));
            for (int n=0;n<(unit==0?30:3);n++) {
                var q = question("UNIT-"+unit+"-"+n,"Eski ders adı","A");
                q.setBank(QuestionBank.OGM); q.setYear(2088); q.setTopic("Bütün kaynak başlıkları aynı"); questions.saveAndFlush(q);
                String stamp = jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,q.getId());
                var data = Map.of("questionCode",q.getCode(),"sourceUpdatedAt",stamp,"automaticLabels",Map.of("assignments",List.of(
                        Map.of("categoryId",category,"relation","PRIMARY","scopeStatus","CONFIRMED"))));
                jdbc.update("""
                    INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
                    VALUES (?,?,'QUESTION','TYT','fizik',true,?::jsonb,?::text[],ARRAY['fizik'],ARRAY['TYT'])
                    """,RUN,"question:"+q.getCode(),json.writeValueAsString(data),"{"+category+"}");
            }
        }
        org.mockito.Mockito.when(reviews.studentOverrides()).thenReturn(List.of(Map.of(
                "item_key","question:UNIT-0-0","status","APPROVE","subject_ids",List.of("fizik"),"exam_ids",List.of("TYT"),
                "labels",Map.of("assignments",List.of(Map.of("categoryId","coverage.unit.6","relation","PRIMARY","scopeStatus","CONFIRMED"))))));
        var corrected = availability.balancedSubjectCandidates(owner.getId(),QuestionBank.OGM,ExamType.TYT,QuestionSelectionMode.MIXED,List.of("Fizik"),120);
        Long correctedId = questions.findAll().stream().filter(q -> q.getCode().equals("UNIT-0-0")).findFirst().orElseThrow().getId();
        assertThat(corrected).filteredOn(c -> c.id().equals(correctedId)).extracting(ExamTopicBalancer.Candidate::topic).containsExactly("coverage.unit.6");
        var session = login("catalog_coverage","Sifre1234");
        var one = topics(branch(session,3,"MIXED"));
        var two = topics(branch(session,3,"MIXED"));
        assertThat(one).hasSize(3); assertThat(two).hasSize(3).doesNotContainAnyElementsOf(one);
        var selectedOnly = new QuestionFilter(QuestionBank.OGM,ExamType.TYT,"Fizik",null,
                List.of("coverage.unit.1","coverage.unit.2"),"ANY",false);
        var ids = availability.balancedExamIds(owner.getId(),selectedOnly,QuestionSelectionMode.MIXED,4,null);
        assertThat(ids).hasSize(4).doesNotHaveDuplicates();
        assertThat(corrected.stream().filter(c -> ids.contains(c.id())).map(ExamTopicBalancer.Candidate::topic).distinct())
                .containsExactlyInAnyOrder("coverage.unit.1","coverage.unit.2");
        // Archive selection must also use the published pool, not just the registry or legacy subject.
        var archived = question("UNIT-ARCHIVED","Fizik","A"); archived.setYear(2088); questions.saveAndFlush(archived);
        var unpublished = question("UNIT-UNPUBLISHED","Fizik","A"); unpublished.setYear(2088);questions.saveAndFlush(unpublished);
        String stamp = jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,archived.getId());
        var data = Map.of("questionCode",archived.getCode(),"sourceUpdatedAt",stamp,"automaticLabels",Map.of("assignments",List.of()));
        jdbc.update("""
            INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
            VALUES (?,?,'QUESTION','TYT','fizik',true,?::jsonb,ARRAY[]::text[],ARRAY['fizik'],ARRAY['TYT'])
            """,RUN,"question:"+archived.getCode(),json.writeValueAsString(data));
        for(var q : List.of(archived,unpublished))
            jdbc.update("INSERT INTO exam_archive_positions(exam_year,exam_type,subject,booklet_position,question_code) VALUES (2088,'TYT','Fizik',?,?)",q.equals(archived)?1:2,q.getCode());
        var year = archive.list(ExamType.TYT,ExamTrack.SAYISAL).stream().filter(p -> p.year()==2088).findFirst().orElseThrow();
        assertThat(year.subjects().stream().filter(q -> q.subject().equals("Fizik")).findFirst().orElseThrow().available()).isEqualTo(1);
    }

    @Test void fullTestGroupsIncludeGeometryAndAllPhilosophyBranches() throws Exception {
        var owner=user("group_coverage",Role.USER);
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')",RUN);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key",RUN);
        for(String subjectId : List.of("geometri","felsefe","psikoloji","sosyoloji","mantik")) {
            String category="coverage.group."+subjectId;
            var definition=Map.of("id",category,"exam","AYT","subjectId",subjectId,"subject",subjectId,
                    "topic",subjectId,"canonicalUnit",true,"canonicalTopic",true);
            jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)",RUN,category,json.writeValueAsString(definition));
            var q=question("GROUP-"+subjectId,subjectId,"A");q.setExamType(ExamType.AYT);q.setBank(QuestionBank.OGM);questions.saveAndFlush(q);
            String stamp=jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?",String.class,q.getId());
            var data=Map.of("questionCode",q.getCode(),"sourceUpdatedAt",stamp,"automaticLabels",Map.of("assignments",List.of(
                    Map.of("categoryId",category,"relation","PRIMARY","scopeStatus","CONFIRMED"))));
            jdbc.update("""
                INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
                VALUES (?,?,'QUESTION','AYT',?,true,?::jsonb,?::text[],?::text[],ARRAY['AYT'])
                """,RUN,"question:"+q.getCode(),subjectId,json.writeValueAsString(data),"{"+category+"}","{"+subjectId+"}");
        }
        var subjects=List.of("Matematik","Felsefe Grubu");
        assertThat(availability.countBySubject(owner.getId(),QuestionBank.OGM,ExamType.AYT,QuestionSelectionMode.MIXED,subjects))
                .containsEntry("Matematik",1L).containsEntry("Felsefe Grubu",4L);
        var candidates=availability.balancedSubjectCandidates(owner.getId(),QuestionBank.OGM,ExamType.AYT,QuestionSelectionMode.MIXED,subjects,80);
        assertThat(candidates).hasSize(5).allSatisfy(c -> assertThat(c.topic()).startsWith("coverage.group."));
        assertThat(candidates).filteredOn(c -> c.subject().equals("Matematik")).extracting(ExamTopicBalancer.Candidate::topic)
                .containsExactly("coverage.group.geometri");
    }
}
