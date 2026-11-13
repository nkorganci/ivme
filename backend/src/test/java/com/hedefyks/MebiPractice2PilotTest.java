package com.hedefyks;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;

import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.QuestionImportService;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.user.Role;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

/** Actual 21-image source package, tested exclusively in the temporary database. */
@TestPropertySource(properties="app.images.dir=../veri/mebi-pratik-2/20261111-source-inventory/single-test-crop-pilot")
class MebiPractice2PilotTest extends TestBase {
    private static final Path PACKAGE=Path.of("../veri/mebi-pratik-2/20261111-source-inventory/single-test-crop-pilot");
    @Autowired QuestionImportService importer;
    @Autowired TransactionTemplate transaction;
    @Override protected boolean catalogFixtureRequired(){return true;}

    @Test void directPracticeTwoPageLoadForwardsToReact() throws Exception {
        mvc.perform(get("/pratik-2")).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    private byte[] csv() throws Exception {
        assertThat(jdbc.queryForObject("select current_database()",String.class)).isEqualTo("ivme_test");
        var proof=json.readTree(PACKAGE.resolve("second-reading/report.json").toFile());
        assertThat(proof.path("status").asText()).isEqualTo("PASS");
        assertThat(proof.path("results").size()).isEqualTo(21);
        return Files.readAllBytes(PACKAGE.resolve("pilot-insert-only.csv"));
    }

    @Test void actualSourceImagesAndAnswersImportOnceAndPreserveOldIdentity() throws Exception {
        var old=question("legacy-mebi-pilot-sentinel","Tarih","B");
        long oldId=old.getId();
        var result=importer.run(csv(),"mebi-pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(result.errorCount()).as(result.toString()).isZero();
        assertThat(result.inserted()).isEqualTo(21);
        var repeated=importer.run(csv(),"mebi-pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(repeated.errorCount()).isZero();assertThat(repeated.inserted()).isZero();
        assertThat(questions.count()).isEqualTo(22);
        assertThat(questions.findByCode(old.getCode()).orElseThrow().getId()).isEqualTo(oldId);
        assertThat(questions.findByCode(old.getCode()).orElseThrow().getCorrectAnswer()).isEqualTo("B");
        var pack=json.readTree(PACKAGE.resolve("reviewed-package.json").toFile());
        for(var item:pack.path("items")) {
            var q=questions.findByCode(item.path("code").asText()).orElseThrow();
            assertThat(q.getCorrectAnswer()).isEqualTo(item.path("answer").asText());
            assertThat(q.getBank()).isEqualTo(QuestionBank.MEBI_PRACTICE_2);
        }
    }

    @Test void invalidAnswerAndExplicitRollbackLeaveNoPilotQuestions() throws Exception {
        byte[] original=csv();
        byte[] invalid=new String(original,StandardCharsets.UTF_8).replace("\"C\"","\"F\"").getBytes(StandardCharsets.UTF_8);
        var rejected=importer.run(invalid,"bad-pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(rejected.errorCount()).isPositive();assertThat(rejected.applied()).isFalse();
        assertThat(questions.count()).isZero();
        assertThatThrownBy(()->transaction.executeWithoutResult(tx->{
            var result=importer.run(original,"pilot.csv",ImportMode.INSERT_ONLY,false);
            assertThat(result.inserted()).isEqualTo(21);
            throw new IllegalStateException("pilot rollback");
        })).isInstanceOf(IllegalStateException.class).hasMessage("pilot rollback");
        assertThat(questions.count()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.question_intake",Integer.class)).isZero();
    }

    @Test void pilotApiUsesControlledTopicAndDoesNotLeakIntoFirstBank() throws Exception {
        var result=importer.run(csv(),"pilot.csv",ImportMode.INSERT_ONLY,false);
        assertThat(result.inserted()).isEqualTo(21);
        var resources=json.readTree(PACKAGE.resolve("pilot-resources.json").toFile()).path("resources");
        for(var item:resources) {
            String code=item.path("questionCode").asText();
            String category=item.path("categoryIds").get(0).asText();
            var copy=item.deepCopy();
            ((com.fasterxml.jackson.databind.node.ObjectNode)copy).put("sourceUpdatedAt",jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE code=?",String.class,code));
            jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) SELECT run_key,?,'QUESTION','AYT','biyoloji',true,?::jsonb,ARRAY[?],ARRAY['biyoloji'],ARRAY['AYT'] FROM learning_catalog.current_run",
                "question:"+code,copy.toString(),category);
            jdbc.update("INSERT INTO learning_catalog.assignments SELECT run_key,?,?, 'PRIMARY' FROM learning_catalog.current_run","question:"+code,category);
        }
        user("mebi_pilot_student",Role.USER);var session=login("mebi_pilot_student","Sifre1234");
        var list=read(send(session,get("/api/questions").param("bank","MEBI_PRACTICE_2")
            .param("categoryId","excel.ayt.biyoloji.03fef08f029e99373ac8"),null).andExpect(status().isOk()));
        assertThat(list.path("totalElements").asInt()).isEqualTo(21);
        assertThat(list.toString()).doesNotContain("correctAnswer","correct_answer");
        var oldPool=read(send(session,get("/api/questions/availability"),null).andExpect(status().isOk()));
        assertThat(oldPool.path("total").asInt()).isZero();
    }
}
