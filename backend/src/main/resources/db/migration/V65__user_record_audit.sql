-- Başarılı kalıcı değişikliklerin veritabanı içi izi. İçerik ve kişisel metinler tekrarlanmaz.
CREATE TABLE user_record_audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type varchar(64) NOT NULL,
    record_key varchar(120) NOT NULL,
    operation varchar(8) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    revision bigint,
    occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_user_record_audit_user_time ON user_record_audit(user_id, occurred_at DESC);

CREATE FUNCTION audit_user_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    record_data jsonb;
BEGIN
    record_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    INSERT INTO user_record_audit(user_id, record_type, record_key, operation, revision)
    VALUES ((record_data->>'user_id')::bigint, TG_TABLE_NAME,
            coalesce(record_data->>'week_start', record_data->>'preference_key',
                     record_data->>'id', record_data->>'user_id'),
            TG_OP, (record_data->>'revision')::bigint);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_student_program AFTER INSERT OR UPDATE OR DELETE ON student_program_weeks
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_tyt_trials AFTER INSERT OR UPDATE OR DELETE ON tyt_trial_sheets
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_ayt_trials AFTER INSERT OR UPDATE OR DELETE ON ayt_trial_sheets
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_preferences AFTER INSERT OR UPDATE OR DELETE ON user_display_preferences
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_exams AFTER INSERT OR UPDATE OR DELETE ON exams
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_study_sessions AFTER INSERT OR UPDATE OR DELETE ON study_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_math_lessons AFTER INSERT OR UPDATE OR DELETE ON math_tutoring_lessons
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_feedback AFTER INSERT OR UPDATE OR DELETE ON feedback
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();

CREATE FUNCTION audit_exam_answer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO user_record_audit(user_id, record_type, record_key, operation)
    SELECT e.user_id, 'exam_answers', NEW.exam_id::text || ':' || NEW.question_id::text, 'UPDATE'
    FROM exams e WHERE e.id = NEW.exam_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER audit_exam_answer_change AFTER UPDATE OF selected_answer ON exam_questions
    FOR EACH ROW WHEN (OLD.selected_answer IS DISTINCT FROM NEW.selected_answer)
    EXECUTE FUNCTION audit_exam_answer();
