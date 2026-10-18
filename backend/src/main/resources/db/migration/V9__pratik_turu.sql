-- Bir soruyu yeniden çalışan öğrencinin denemelerini aynı tur altında tut.
ALTER TABLE question_attempts ADD COLUMN practice_round integer NOT NULL DEFAULT 1
    CHECK (practice_round > 0);
CREATE INDEX ix_attempts_user_question_round
    ON question_attempts(user_id, question_id, practice_round, id);
