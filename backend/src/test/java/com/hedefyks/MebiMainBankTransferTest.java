package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionSource;
import com.hedefyks.question.ExamType;
import com.hedefyks.user.Role;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class MebiMainBankTransferTest extends TestBase {
    private String migration() throws Exception {
        try(var input=new ClassPathResource("db/migration/V102__mebi_main_question_bank.sql").getInputStream()) {
            return new String(input.readAllBytes(),StandardCharsets.UTF_8);
        }
    }

    private long fixture(boolean bind) {
        jdbc.execute("ALTER TABLE questions DROP CONSTRAINT questions_bank_check");
        jdbc.execute("ALTER TABLE questions ADD CONSTRAINT questions_bank_check CHECK(bank IN ('OGM','CIKMIS','MEBI_PRACTICE_2'))");
        var question=question("MEBI-TRANSFER-TEST","Biyoloji","B");
        questions.flush();
        jdbc.update("UPDATE questions SET bank='MEBI_PRACTICE_2' WHERE id=?",question.getId());
        String run="test-main-bank-"+UUID.randomUUID();
        jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')",run);
        jdbc.update("INSERT INTO learning_catalog.current_run VALUES(true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key",run);
        if(bind) {
            jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,'excel.tyt.biyoloji.transfer',?::jsonb)",run,
                "{\"id\":\"excel.tyt.biyoloji.transfer\",\"exam\":\"TYT\",\"subjectId\":\"biyoloji\",\"subject\":\"Biyoloji\",\"unit\":\"Hücre\",\"topic\":\"Hücre Bölünmeleri\",\"selectable\":true}");
            jdbc.update("""
                INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
                SELECT ?, 'question:'||q.code,'QUESTION','TYT','biyoloji',true,
                  jsonb_build_object('questionCode',q.code,'bank',q.bank,'url','/soru/'||q.code,
                    'sourceUpdatedAt',extract(epoch from q.updated_at)::text,'sourceVersion','unchanged-proof',
                    'sourceImage',jsonb_build_object('reference',q.image),'automaticLabels',jsonb_build_object('assignments','[]'::jsonb)),
                  ARRAY['excel.tyt.biyoloji.transfer'],ARRAY['biyoloji'],ARRAY['TYT']
                FROM questions q WHERE q.id=?
                """,run,question.getId());
            jdbc.update("INSERT INTO learning_catalog.assignments VALUES (?,'question:MEBI-TRANSFER-TEST','excel.tyt.biyoloji.transfer','PRIMARY')",run);
        }
        return question.getId();
    }

    @Test void preservesIdsAllContentLinksCategoriesOldCatalogAndStudentHistory() throws Exception {
        long id=fixture(true);
        var owner=user("transfer-owner",Role.USER);
        jdbc.update("INSERT INTO student_question_preferences(user_id,question_id,repeat_preference) VALUES (?,?,'AGAIN')",owner.getId(),id);
        String before=jdbc.queryForObject("SELECT (to_jsonb(q)-'bank')::text FROM questions q WHERE id=?",String.class,id);
        String preference=jdbc.queryForObject("SELECT to_jsonb(p)::text FROM student_question_preferences p WHERE question_id=?",String.class,id);
        String oldRun=jdbc.queryForObject("SELECT run_key FROM learning_catalog.current_run",String.class);
        String oldData=jdbc.queryForObject("SELECT data::text FROM learning_catalog.current_items WHERE question_code='MEBI-TRANSFER-TEST'",String.class);
        jdbc.execute(migration());
        assertThat(jdbc.queryForObject("SELECT bank FROM questions WHERE id=?",String.class,id)).isEqualTo("OGM");
        assertThat(jdbc.queryForObject("SELECT (to_jsonb(q)-'bank')::text FROM questions q WHERE id=?",String.class,id)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT to_jsonb(p)::text FROM student_question_preferences p WHERE question_id=?",String.class,id)).isEqualTo(preference);
        assertThat(jdbc.queryForObject("SELECT data::text FROM learning_catalog.items WHERE run_key=? AND question_code='MEBI-TRANSFER-TEST'",String.class,oldRun)).isEqualTo(oldData);
        assertThat(jdbc.queryForObject("SELECT data->>'bank' FROM learning_catalog.current_items WHERE question_code='MEBI-TRANSFER-TEST'",String.class)).isEqualTo("OGM");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.current_assignments WHERE category_id='excel.tyt.biyoloji.transfer'",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM questions",Integer.class)).isEqualTo(1);
        jdbc.execute(migration()); // Reapplying with no legacy rows cannot duplicate questions or the catalog.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.question_bank_transfers WHERE migration_key='mebi-main-bank-v1'",Integer.class)).isEqualTo(1);
    }

    @Test void refusesUnboundSourceQuestions() throws Exception {
        fixture(false);String sql=migration();
        assertThatThrownBy(()->jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection->{
            var checkpoint=connection.setSavepoint();
            try(var statement=connection.createStatement()) {statement.execute(sql);}
            catch(java.sql.SQLException error) {connection.rollback(checkpoint);throw error;}
            return null;
        })).hasMessageContaining("binding incomplete");
        assertThat(jdbc.queryForObject("SELECT bank FROM questions WHERE code='MEBI-TRANSFER-TEST'",String.class)).isEqualTo("MEBI_PRACTICE_2");
    }

    @Test void savedBankAndSourcePairsResolveToMainWithoutChangingExamScope() {
        var filter=new QuestionFilter(QuestionBank.MEBI_PRACTICE_2,ExamType.TYT,null,null,List.of(),"ANY",true,null,null,
            List.of(QuestionSource.MEBI2_TYT,QuestionSource.OGM_TYT,QuestionSource.CIKMIS_AYT));
        assertThat(filter.bank()).isEqualTo(QuestionBank.OGM);
        assertThat(filter.source()).containsExactly(QuestionSource.OGM_TYT,QuestionSource.CIKMIS_AYT);
        assertThat(filter.examType()).isEqualTo(ExamType.TYT);
        assertThat(QuestionSource.MEBI2_AYT.canonical()).isEqualTo(QuestionSource.OGM_AYT);
    }
}
