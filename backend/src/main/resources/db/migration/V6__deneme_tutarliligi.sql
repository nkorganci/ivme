-- Bir oturumdaki yanıt yalnız o oturumun sahibine ve seçilmiş sorusuna ait olabilir.
ALTER TABLE study_sessions ADD CONSTRAINT uq_study_session_owner UNIQUE (id, user_id);
ALTER TABLE question_attempts ADD CONSTRAINT fk_attempt_session_owner
    FOREIGN KEY (session_id, user_id) REFERENCES study_sessions(id, user_id);
ALTER TABLE question_attempts ADD CONSTRAINT fk_attempt_session_question
    FOREIGN KEY (session_id, question_id) REFERENCES session_questions(session_id, question_id);

-- Puanlama anındaki cevap görüntüsü ile doğru/yanlış bayrağı uyuşmalı.
ALTER TABLE question_attempts ADD CONSTRAINT ck_attempt_answer_matches_result
    CHECK (event_type <> 'ANSWER' OR is_correct = (selected_answer = correct_answer));
