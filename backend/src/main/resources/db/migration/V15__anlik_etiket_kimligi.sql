-- Aynı kısa kod farklı üst dallarda bulunabilir; anlık kopya tekil düğüm kimliğiyle tutulur.
ALTER TABLE attempt_taxonomy_snapshot ADD COLUMN node_id bigint;
UPDATE attempt_taxonomy_snapshot s SET node_id = qt.node_id
FROM question_attempts a JOIN question_taxonomy qt ON qt.question_id = a.question_id
JOIN taxonomy_nodes n ON n.id = qt.node_id
WHERE a.id = s.attempt_id AND n.kind = s.node_kind AND n.code = s.node_code;
ALTER TABLE attempt_taxonomy_snapshot ALTER COLUMN node_id SET NOT NULL;
ALTER TABLE attempt_taxonomy_snapshot DROP CONSTRAINT attempt_taxonomy_snapshot_pkey;
ALTER TABLE attempt_taxonomy_snapshot ADD PRIMARY KEY (attempt_id, node_id);
