ALTER TABLE exam_questions ADD COLUMN flagged boolean NOT NULL DEFAULT false;

CREATE FUNCTION audit_exam_flag() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO user_record_audit(user_id, record_type, record_key, operation)
    SELECT e.user_id, 'exam_flags', NEW.exam_id::text || ':' || NEW.question_id::text, 'UPDATE'
    FROM exams e WHERE e.id = NEW.exam_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_exam_flag_change AFTER UPDATE OF flagged ON exam_questions
    FOR EACH ROW WHEN (OLD.flagged IS DISTINCT FROM NEW.flagged)
    EXECUTE FUNCTION audit_exam_flag();
