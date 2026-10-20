CREATE FUNCTION audit_page_annotation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    item page_annotations%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN item := OLD; ELSE item := NEW; END IF;
    INSERT INTO user_record_audit(user_id, record_type, record_key, operation, revision)
    VALUES (item.user_id, 'page_annotations',
            item.resource_type || ':' || item.resource_id || ':' || item.page_number,
            TG_OP, item.version);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER audit_page_annotations ON page_annotations;
CREATE TRIGGER audit_page_annotations AFTER INSERT OR UPDATE OR DELETE ON page_annotations
    FOR EACH ROW EXECUTE FUNCTION audit_page_annotation();
