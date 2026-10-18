-- Eski ve taslak eşlemeler yayımlanmış sayılmaz. Yayın işlemi ayrıca sürüm vermelidir.
ALTER TABLE question_taxonomy ADD COLUMN approval_status varchar(12) NOT NULL DEFAULT 'PROPOSED'
    CHECK (approval_status IN ('PROPOSED', 'APPROVED'));
ALTER TABLE question_taxonomy ADD COLUMN taxonomy_version varchar(40);
ALTER TABLE question_taxonomy ADD CONSTRAINT ck_question_taxonomy_approval_version
    CHECK (approval_status <> 'APPROVED' OR (taxonomy_version IS NOT NULL AND length(trim(taxonomy_version)) > 0));

CREATE TABLE attempt_taxonomy_snapshot (
    attempt_id bigint NOT NULL REFERENCES question_attempts(id) ON DELETE CASCADE,
    node_kind varchar(16) NOT NULL CHECK (node_kind IN ('SUBTOPIC', 'QUESTION_TYPE')),
    node_code varchar(80) NOT NULL,
    node_name varchar(160) NOT NULL,
    taxonomy_version varchar(40) NOT NULL,
    PRIMARY KEY (attempt_id, node_kind, node_code)
);

CREATE TABLE question_helpfulness (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    helpful boolean NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
);
CREATE INDEX ix_question_helpfulness_question ON question_helpfulness(question_id);
