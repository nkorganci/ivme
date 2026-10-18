-- Existing decisions have no provable source binding. Preserve them without
-- promoting them to a current approval; historical event snapshots stay intact.
ALTER TABLE question_taxonomy ADD COLUMN source_stamp text;
ALTER TABLE question_taxonomy ADD COLUMN source_version text;

CREATE FUNCTION bind_question_taxonomy_source() RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    IF NEW.approval_status='APPROVED' AND NEW.source IN ('HUMAN','AI_REVIEWED') THEN
        SELECT extract(epoch FROM q.updated_at)::text,i.data->>'sourceVersion'
          INTO NEW.source_stamp,NEW.source_version
          FROM questions q LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code
          WHERE q.id=NEW.question_id;
    ELSE
        NEW.source_stamp=NULL;
        NEW.source_version=NULL;
    END IF;
    RETURN NEW;
END
$function$;
CREATE TRIGGER bind_question_taxonomy_source BEFORE INSERT OR UPDATE OF approval_status,source,taxonomy_version,node_id,question_id
    ON question_taxonomy FOR EACH ROW EXECUTE FUNCTION bind_question_taxonomy_source();

CREATE VIEW learning_catalog.current_question_taxonomy AS
 SELECT q.id AS question_id,i.item_key,n.id AS node_id,'taxonomy:'||n.id AS category_id,
   n.kind,n.code,n.name,qt.taxonomy_version
 FROM question_taxonomy qt JOIN questions q ON q.id=qt.question_id AND q.active
 JOIN taxonomy_nodes n ON n.id=qt.node_id AND n.active
 JOIN learning_catalog.current_items i ON i.question_code=q.code AND i.student_visible
 WHERE qt.approval_status='APPROVED' AND qt.source IN ('HUMAN','AI_REVIEWED')
   AND qt.source_stamp=extract(epoch FROM q.updated_at)::text
   AND i.source_stamp=qt.source_stamp
   AND (qt.source_version IS NULL OR qt.source_version=i.data->>'sourceVersion');
