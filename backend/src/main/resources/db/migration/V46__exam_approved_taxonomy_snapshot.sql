-- No backfill: current labels cannot establish a historical exam's original labels.
CREATE TABLE exam_taxonomy_snapshot (
    exam_question_id bigint NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
    node_id bigint NOT NULL REFERENCES taxonomy_nodes(id),
    node_kind varchar(40) NOT NULL,
    node_code varchar(160) NOT NULL,
    node_name varchar(300) NOT NULL,
    taxonomy_version varchar(100) NOT NULL,
    PRIMARY KEY (exam_question_id, node_id)
);
