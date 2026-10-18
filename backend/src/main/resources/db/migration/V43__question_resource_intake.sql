-- Intake labels are validated drafts, independent of published catalog runs.
CREATE TABLE learning_catalog.question_intake (
    question_code varchar(60) PRIMARY KEY REFERENCES questions(code) ON DELETE CASCADE,
    source_stamp text NOT NULL,
    resource jsonb NOT NULL CHECK (resource->>'contractVersion'='2'
        AND resource->>'kind'='QUESTION'
        AND resource->>'questionCode'=question_code
        AND jsonb_array_length(resource->'automaticLabels'->'assignments')>0),
    status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED')),
    updated_at timestamptz NOT NULL DEFAULT now()
);
