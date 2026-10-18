package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import com.hedefyks.user.Role;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class OfficialCancellationFlowTest extends TestBase {
    private void fixture() {
        question("2019-AYT-TDE-33","Tarih","E");
        question("2026-AYT-TDE-20","Türk Dili ve Edebiyatı","B");
        question("2026-AYT-MAT-23","Matematik","C");
    }
    private int apply() throws Exception {
        var process=new ProcessBuilder(Path.of("../../.venv/Scripts/python.exe").toAbsolutePath().normalize().toString(),
            "-X","utf8","-B",Path.of("../scripts/official-question-corrections.py").toAbsolutePath().normalize().toString(),
            "--database","ivme_test","--apply").redirectErrorStream(true).start();
        assertThat(process.waitFor(30,TimeUnit.SECONDS)).isTrue();
        String output=new String(process.getInputStream().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);
        if(process.exitValue()!=0)System.out.println(output);
        return process.exitValue();
    }
    @Test void futureSelectionExclusionPreservesKeysAttemptsAndSubmittedScoresAndIsIdempotent() throws Exception {
        fixture();var user=user("cancellation-student",Role.USER);
        Long questionId=jdbc.queryForObject("SELECT id FROM questions WHERE code='2026-AYT-MAT-23'",Long.class);
        jdbc.update("INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct,active_seconds) VALUES (?,?,?,'ANSWER','A','C',false,25)",user.getId(),questionId,UUID.randomUUID());
        Long exam=jdbc.queryForObject("INSERT INTO exams(user_id,title,status,question_count,submitted_at,correct_count,wrong_count,blank_count,percent,net) VALUES (?,'Past exam','SUBMITTED',1,now(),0,1,0,0,-0.25) RETURNING id",Long.class,user.getId());
        jdbc.update("INSERT INTO exam_questions(exam_id,question_id,question_order,question_code,subject,selected_answer,correct_answer,is_correct) VALUES (?,?,0,'2026-AYT-MAT-23','Matematik','A','C',false)",exam,questionId);
        String attempts=jdbc.queryForObject("SELECT json_agg(a)::text FROM question_attempts a",String.class);
        String exams=jdbc.queryForObject("SELECT json_agg(e)::text FROM exams e",String.class);
        String examQuestions=jdbc.queryForObject("SELECT json_agg(e)::text FROM exam_questions e",String.class);
        var answers=jdbc.queryForList("SELECT id,code,correct_answer FROM questions ORDER BY id");
        assertThat(apply()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM questions WHERE active",Integer.class)).isZero();
        assertThat(jdbc.queryForList("SELECT id,code,correct_answer FROM questions ORDER BY id")).isEqualTo(answers);
        assertThat(jdbc.queryForObject("SELECT json_agg(a)::text FROM question_attempts a",String.class)).isEqualTo(attempts);
        assertThat(jdbc.queryForObject("SELECT json_agg(e)::text FROM exams e",String.class)).isEqualTo(exams);
        assertThat(jdbc.queryForObject("SELECT json_agg(e)::text FROM exam_questions e",String.class)).isEqualTo(examQuestions);
        var stamps=jdbc.queryForList("SELECT id,updated_at FROM questions ORDER BY id");
        assertThat(apply()).isZero();
        assertThat(jdbc.queryForList("SELECT id,updated_at FROM questions ORDER BY id")).isEqualTo(stamps);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.official_question_corrections",Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT answer_events FROM learning_catalog.official_question_corrections WHERE question_code='2026-AYT-MAT-23'",Integer.class)).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThatThrownBy(()->jdbc.update("UPDATE questions SET active=true WHERE code='2026-AYT-MAT-23'"))
            .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(jdbc.queryForObject("SELECT active FROM questions WHERE code='2026-AYT-MAT-23'",Boolean.class)).isFalse();
    }
    @Test void wrongBankCannotPartiallyDeactivateOtherQuestions() throws Exception {
        fixture();jdbc.update("UPDATE questions SET bank='OGM' WHERE code='2026-AYT-MAT-23'");
        assertThat(apply()).isNotZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM questions WHERE active",Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.official_question_corrections",Integer.class)).isZero();
    }
}
