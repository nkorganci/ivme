-- Invalid source bodies remain recoverable and retain all learner references.
CREATE TABLE learning_catalog.question_source_issues (
    question_code varchar(60) NOT NULL REFERENCES questions(code),
    issue_code text NOT NULL,
    source_image_sha256 char(64) NOT NULL CHECK (source_image_sha256 ~ '^[0-9a-f]{64}$'),
    status text NOT NULL CHECK (status IN ('QUARANTINED','RESOLVED')),
    previous_active boolean NOT NULL,
    evidence jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    PRIMARY KEY(question_code,issue_code,source_image_sha256)
);
CREATE INDEX question_source_issues_open ON learning_catalog.question_source_issues(question_code) WHERE status='QUARANTINED';
