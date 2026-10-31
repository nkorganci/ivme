-- TAS-06: öğrencinin kişisel tekrar tercihi (zorluk etiketi mevcut feedback.difficulty_vote kaydında kalır).
-- Satır yoksa tercih DEFAULT'tur. Soru, deneme ve cevap geçmişi bu tabloyla değişmez; yalnız otomatik seçim etkilenir.
CREATE TABLE student_question_preferences (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    repeat_preference varchar(5) NOT NULL CHECK (repeat_preference IN ('AGAIN', 'HIDE')),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
);
CREATE INDEX ix_student_question_preferences_mark ON student_question_preferences (user_id, repeat_preference);

CREATE TRIGGER audit_student_question_preferences AFTER INSERT OR UPDATE OR DELETE ON student_question_preferences
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
