ALTER TABLE user_record_audit ALTER COLUMN record_key TYPE varchar(200);

CREATE OR REPLACE FUNCTION audit_user_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    record_data jsonb;
BEGIN
    record_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    INSERT INTO user_record_audit(user_id, record_type, record_key, operation, revision)
    VALUES ((record_data->>'user_id')::bigint, TG_TABLE_NAME,
            coalesce(record_data->>'week_start', record_data->>'preference_key',
                     record_data->>'id', record_data->>'question_id',
                     record_data->>'topic_id', record_data->>'user_id'),
            TG_OP, (record_data->>'revision')::bigint);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_question_boards AFTER INSERT OR UPDATE OR DELETE ON question_boards
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_curriculum_progress AFTER INSERT OR UPDATE OR DELETE ON curriculum_topic_progress
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE TRIGGER audit_question_helpfulness AFTER INSERT OR UPDATE OR DELETE ON question_helpfulness
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
CREATE FUNCTION audit_math_tutoring_file() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    file_data record;
BEGIN
    IF TG_OP = 'DELETE' THEN file_data := OLD; ELSE file_data := NEW; END IF;
    INSERT INTO user_record_audit(user_id, record_type, record_key, operation)
    SELECT lesson.user_id, 'math_tutoring_files', file_data.id::text, TG_OP
    FROM math_tutoring_lessons lesson WHERE lesson.id = file_data.lesson_id;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER audit_math_tutoring_files AFTER INSERT OR DELETE ON math_tutoring_files
    FOR EACH ROW EXECUTE FUNCTION audit_math_tutoring_file();
