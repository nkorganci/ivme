-- OCR observations preserve the image/model identity and never approve content.
CREATE TABLE learning_catalog.question_content_observations (
    question_code varchar(60) NOT NULL REFERENCES questions(code),
    source_image_sha256 char(64) NOT NULL,
    extractor_version text NOT NULL,
    model_sha256 char(64) NOT NULL,
    observations jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(question_code,source_image_sha256,extractor_version,model_sha256)
);
CREATE INDEX question_observation_image ON learning_catalog.question_content_observations(source_image_sha256);
