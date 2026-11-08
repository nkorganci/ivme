package com.hedefyks;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.QuestionImportService;
import com.hedefyks.question.ExamType;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.user.Role;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.support.TransactionTemplate;

/** Copied only into an isolated source tree; actual bounded source package is required. */
class YksSourcePilotTest extends TestBase {
    @Autowired QuestionImportService importer;
    @Autowired TransactionTemplate transaction;
    @Autowired ImageStorage images;
    Path folder;
    JsonNode resources,selection;
    byte[] csv;
    @Override protected boolean catalogFixtureRequired(){return true;}

    @BeforeEach void sourcePackage() throws Exception {
        assertThat(jdbc.queryForObject("select current_database()",String.class)).isEqualTo("ivme_test");
        String configured=System.getenv("IVME_YKS_PILOT_PACKAGE");
        assertThat(configured).as("Actual source package must be explicit").isNotBlank();
        folder=Path.of(configured).toRealPath();
        resources=json.readTree(folder.resolve("pilot-resources-v2.json").toFile()).path("resources");
        selection=json.readTree(folder.resolve("source-cards-and-decisions.json").toFile()).path("selection");
        csv=Files.readAllBytes(folder.resolve("pilot-insert-only.csv"));
        assertThat(resources.size()).isEqualTo(3);
        try(var stream=new ClassPathResource("content-taxonomy.json").getInputStream()) {
            var nav=json.readTree(stream).path("curriculumNavigation");
            assertThat(nav.path("authority").asText()).isEqualTo("MEBI_PROVIDER");
            jdbc.update("UPDATE learning_catalog.runs SET summary=jsonb_build_object('curriculumNavigation',?::jsonb) WHERE run_key=(SELECT run_key FROM learning_catalog.current_run)",nav.toString());
        }
    }

    private void importActual() {
        var result=importer.run(csv,"pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(result.errorCount()).as(result.toString()).isZero();
        assertThat(result.inserted()).isEqualTo(3);
    }
    private void publishTestOnly() {
        for(var input:resources) {
            ObjectNode item=(ObjectNode)input.deepCopy();
            String code=item.path("questionCode").asText(),category=item.path("categoryIds").get(0).asText();
            String stamp=jdbc.queryForObject("SELECT extract(epoch FROM updated_at)::text FROM questions WHERE code=?",String.class,code);
            item.put("sourceUpdatedAt",stamp);
            jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) SELECT run_key,?,'QUESTION','AYT','din',true,?::jsonb,ARRAY[?],ARRAY['din'],ARRAY['AYT'] FROM learning_catalog.current_run",
                "question:"+code,item.toString(),category);
            jdbc.update("INSERT INTO learning_catalog.assignments SELECT run_key,?,?, 'PRIMARY' FROM learning_catalog.current_run","question:"+code,category);
        }
    }

    @Test void realSourceAnswersAndPreferredLeafIdsSurvivePreviewAndTwoImports() throws Exception {
        var preview=importer.run(csv,"pilot.csv",ImportMode.INSERT_ONLY,true);
        assertThat(preview.errorCount()).as(preview.toString()).isZero();
        assertThat(preview.inserted()).isEqualTo(3);
        assertThat(questions.count()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.question_intake",Integer.class)).isZero();
        importActual();
        var intakeBefore=jdbc.queryForList("SELECT * FROM learning_catalog.question_intake ORDER BY question_code");
        var questionsBefore=jdbc.queryForList("SELECT * FROM questions ORDER BY code");
        var second=importer.run(csv,"pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(second.errorCount()).isZero();assertThat(second.inserted()).isZero();assertThat(second.skipped()).isEqualTo(3);
        assertThat(jdbc.queryForList("SELECT * FROM questions ORDER BY code")).isEqualTo(questionsBefore);
        assertThat(jdbc.queryForList("SELECT * FROM learning_catalog.question_intake ORDER BY question_code")).isEqualTo(intakeBefore);
        for(var decision:selection.path("newPilotQuestions")) {
            String code=decision.path("sourceCode").asText();var q=questions.findByCode(code).orElseThrow();
            assertThat(q.getCorrectAnswer()).isEqualTo(decision.path("answer").asText());
            assertThat(q.getExamType()).isEqualTo(ExamType.AYT);
            var intake=json.readTree(jdbc.queryForObject("SELECT resource::text FROM learning_catalog.question_intake WHERE question_code=?",String.class,code));
            assertThat(intake.path("categoryIds").get(0).asText()).isEqualTo(decision.path("categoryId").asText());
            assertThat(intake.path("subjectIds").get(0).asText()).isEqualTo("din");
            assertThat(intake.path("examIds").get(0).asText()).isEqualTo("AYT");
            assertThat(intake.path("automaticLabels").path("assignments").get(0).path("review").path("status").asText()).isEqualTo("PENDING");
            assertThat(images.exists(q.getImage())).isTrue();
            var expected=resources.findValuesAsText("questionCode");assertThat(expected).contains(code);
        }
    }

    @Test void oldQuestionIdsAnswersStudentAttemptsAndProgressRemainByteEquivalent() throws Exception {
        var learner=user("source_pilot_history",Role.USER);
        for(var old:selection.path("reusedQuestions")) {
            var q=question(old.path("canonicalQuestionCode").asText(),"Tarih",old.path("answer").asText());
            q.setExamType(ExamType.AYT);questions.saveAndFlush(q);
            jdbc.update("INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct,learning_label_snapshot) VALUES (?,?,?,'ANSWER',?,?,true,'{\"categoryIds\":[\"preserved-old-topic\"]}'::jsonb)",
                learner.getId(),q.getId(),UUID.randomUUID(),q.getCorrectAnswer(),q.getCorrectAnswer());
        }
        jdbc.update("INSERT INTO curriculum_topic_progress(user_id,topic_id) VALUES (?,?)",learner.getId(),"preserved-old-topic");
        var oldRows=jdbc.queryForList("SELECT * FROM questions ORDER BY code");
        var attempts=jdbc.queryForList("SELECT * FROM question_attempts ORDER BY id");
        var progress=jdbc.queryForList("SELECT * FROM curriculum_topic_progress ORDER BY topic_id");
        importActual();
        assertThat(questions.count()).isEqualTo(15);
        assertThat(jdbc.queryForList("SELECT * FROM questions WHERE code LIKE 'mt-ayt-tarih-15-%' ORDER BY code")).isEqualTo(oldRows);
        assertThat(jdbc.queryForList("SELECT * FROM question_attempts ORDER BY id")).isEqualTo(attempts);
        assertThat(jdbc.queryForList("SELECT * FROM curriculum_topic_progress ORDER BY topic_id")).isEqualTo(progress);
    }

    @Test void invalidPrintedAnswerStopsTheWholeBatchAndTransactionRollbackRemovesAllStaging() {
        String invalid=new String(csv,StandardCharsets.UTF_8).replace(",A,5,true,OGM",",F,5,true,OGM");
        assertThat(invalid).isNotEqualTo(new String(csv,StandardCharsets.UTF_8));
        var result=importer.run(invalid.getBytes(StandardCharsets.UTF_8),"pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(result.errorCount()).isPositive();assertThat(result.applied()).isFalse();assertThat(questions.count()).isZero();
        assertThatThrownBy(()->transaction.executeWithoutResult(state->{importActual();throw new IllegalStateException("intentional isolated rollback");}))
            .isInstanceOf(IllegalStateException.class).hasMessage("intentional isolated rollback");
        assertThat(questions.count()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.question_intake",Integer.class)).isZero();
    }

    @Test void actualCandidateCatalogFiltersByFineTopicAndDoesNotExposeAnswers() throws Exception {
        importActual();publishTestOnly();
        user("source_pilot_reader",Role.USER);var session=login("source_pilot_reader","Sifre1234");
        var metadata=read(send(session,get("/api/learning-resources/metadata"),null).andExpect(status().isOk()));
        assertThat(metadata.toString()).contains("Tasavvufi Düşüncenin Ahlaki Boyutu");
        assertThat(metadata.toString()).doesNotContain("D:\\workspace","originalPath");
        for(var entry:Map.of("excel.ayt.din.b18ae752a082a2431680",2,
                "mebi.ayt.din.8869b591-3e69-4c5d-fd3f-08dce8618010",1).entrySet()) {
            var available=read(send(session,get("/api/questions/availability").param("categoryId",entry.getKey()),null).andExpect(status().isOk()));
            assertThat(available.path("total").asInt()).isEqualTo(entry.getValue());
            var sources=read(send(session,get("/api/learning-resources").param("kind","QUESTION").param("categoryId",entry.getKey()),null).andExpect(status().isOk()));
            assertThat(sources.path("totalElements").asInt()).isEqualTo(entry.getValue());
            assertThat(sources.toString()).doesNotContain("correctAnswer","correct_answer");
        }
    }
}
