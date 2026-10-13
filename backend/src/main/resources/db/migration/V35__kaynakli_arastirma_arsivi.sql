-- Araştırma arşivi öğrenci ve soru bankası tablolarından ayrıdır.
-- İdempotent DDL, yerel aktarım betiğiyle aynı şemayı kurar; başka göçleri çalıştırmaz.
CREATE SCHEMA IF NOT EXISTS source_research;

CREATE TABLE IF NOT EXISTS source_research.runs (
    run_key char(64) PRIMARY KEY CHECK (run_key ~ '^[a-f0-9]{64}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    pipeline_version text NOT NULL,
    input_manifest jsonb NOT NULL,
    summary jsonb NOT NULL,
    published_notes jsonb NOT NULL,
    handoff_note text NOT NULL,
    review_status text NOT NULL DEFAULT 'DRAFT' CHECK (review_status = 'DRAFT')
);

CREATE TABLE IF NOT EXISTS source_research.documents (
    catalog_id integer NOT NULL,
    sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    title text NOT NULL,
    local_path text NOT NULL,
    official_url text NOT NULL,
    page_count integer NOT NULL CHECK (page_count > 0),
    PRIMARY KEY (catalog_id, sha256)
);

CREATE TABLE IF NOT EXISTS source_research.document_pages (
    catalog_id integer NOT NULL,
    document_sha256 char(64) NOT NULL,
    page_number integer NOT NULL CHECK (page_number > 0),
    extractor_version text NOT NULL,
    text_content text NOT NULL,
    text_sha256 char(64) NOT NULL,
    has_images boolean NOT NULL,
    has_vector_graphics boolean,
    extraction_status text NOT NULL CHECK (extraction_status IN ('TEXT_AVAILABLE', 'NEEDS_VISUAL_REVIEW')),
    visual_review_status text NOT NULL DEFAULT 'NOT_REVIEWED'
        CHECK (visual_review_status IN ('NOT_REVIEWED', 'ASSISTANT_REVIEWED')),
    PRIMARY KEY (catalog_id, document_sha256, page_number, extractor_version),
    FOREIGN KEY (catalog_id, document_sha256) REFERENCES source_research.documents(catalog_id, sha256)
);

CREATE TABLE IF NOT EXISTS source_research.run_documents (
    run_key char(64) NOT NULL REFERENCES source_research.runs(run_key),
    catalog_id integer NOT NULL,
    document_sha256 char(64) NOT NULL,
    PRIMARY KEY (run_key, catalog_id, document_sha256),
    FOREIGN KEY (catalog_id, document_sha256) REFERENCES source_research.documents(catalog_id, sha256)
);

CREATE TABLE IF NOT EXISTS source_research.question_evidence (
    run_key char(64) NOT NULL REFERENCES source_research.runs(run_key),
    bank text NOT NULL CHECK (bank IN ('CIKMIS', 'OGM')),
    code text NOT NULL,
    exam_type text NOT NULL,
    subject text NOT NULL,
    proposed_label text NOT NULL,
    source_text text NOT NULL,
    text_sha256 char(64) NOT NULL,
    image_path text,
    image_sha256 char(64),
    extraction_status text NOT NULL CHECK (extraction_status IN ('TEXT_AVAILABLE', 'VISUAL_ONLY', 'SHORT_TEXT')),
    inspection_status text NOT NULL CHECK (inspection_status IN ('SOURCE_LINKED', 'ASSISTANT_TEXT_REVIEWED', 'ASSISTANT_IMAGE_REVIEWED')),
    evidence jsonb NOT NULL,
    PRIMARY KEY (run_key, bank, code)
);
CREATE INDEX IF NOT EXISTS ix_source_research_question_topic
    ON source_research.question_evidence(run_key, exam_type, subject, proposed_label);
CREATE INDEX IF NOT EXISTS ix_source_research_question_review
    ON source_research.question_evidence(run_key, extraction_status, inspection_status);

CREATE TABLE IF NOT EXISTS source_research.topic_inventory (
    run_key char(64) NOT NULL REFERENCES source_research.runs(run_key),
    exam_type text NOT NULL,
    subject text NOT NULL,
    source_label text NOT NULL,
    analysis jsonb NOT NULL,
    PRIMARY KEY (run_key, exam_type, subject, source_label)
);

CREATE TABLE IF NOT EXISTS source_research.topic_guides (
    run_key char(64) NOT NULL REFERENCES source_research.runs(run_key),
    group_id text NOT NULL,
    topic_id text NOT NULL,
    title text NOT NULL,
    content jsonb NOT NULL,
    review_status text NOT NULL DEFAULT 'DRAFT' CHECK (review_status = 'DRAFT'),
    PRIMARY KEY (run_key, group_id, topic_id)
);

CREATE TABLE IF NOT EXISTS source_research.observations (
    run_key char(64) NOT NULL REFERENCES source_research.runs(run_key),
    object_key text NOT NULL,
    observation text NOT NULL,
    evidence jsonb NOT NULL,
    PRIMARY KEY (run_key, object_key)
);
