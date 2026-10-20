CREATE OR REPLACE FUNCTION audit_user_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    record_data jsonb;
BEGIN
    record_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    -- FK ile hesap silinirken çocuk satırlar ebeveynden sonra silinebilir.
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = (record_data->>'user_id')::bigint) THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;
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
