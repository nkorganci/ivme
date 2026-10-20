CREATE TABLE page_annotations (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type varchar(8) NOT NULL CHECK (resource_type IN ('QUESTION', 'PDF')),
    resource_id bigint NOT NULL CHECK (resource_id > 0),
    page_number integer NOT NULL CHECK (page_number > 0),
    strokes_json text NOT NULL DEFAULT '[]' CHECK (length(strokes_json) <= 65536),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, resource_type, resource_id, page_number)
);

CREATE TRIGGER audit_page_annotations AFTER INSERT OR UPDATE OR DELETE ON page_annotations
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
