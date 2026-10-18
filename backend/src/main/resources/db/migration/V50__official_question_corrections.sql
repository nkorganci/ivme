-- Official source corrections are distinct from teacher labels and learner scores.
CREATE TABLE learning_catalog.official_question_corrections (
    correction_key text PRIMARY KEY,
    question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_code text NOT NULL,
    official_status text NOT NULL CHECK (official_status='cancelled'),
    source_url text NOT NULL,
    source_sha256 text NOT NULL CHECK (length(source_sha256)=64),
    identity jsonb NOT NULL,
    before_active boolean NOT NULL,
    before_source_stamp text NOT NULL,
    answer_events bigint NOT NULL,
    exam_references bigint NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);
