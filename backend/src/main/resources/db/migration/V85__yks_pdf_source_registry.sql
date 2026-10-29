-- A byte-identical YKS PDF has one source identity, regardless of catalog aliases.
-- Page observations and source occurrences are evidence, never teacher approval.
CREATE TABLE learning_catalog.pdf_sources (
    source_sha256 char(64) PRIMARY KEY CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
    page_count integer NOT NULL CHECK (page_count >= 0),
    extractor_version text NOT NULL,
    observations jsonb NOT NULL,
    content_format text NOT NULL DEFAULT 'UNREVIEWED',
    coverage_state text NOT NULL DEFAULT 'NEEDS_REVIEW'
        CHECK (coverage_state IN ('NEEDS_REVIEW','INCOMPLETE','VERIFIED','NO_QUESTIONS')),
    expected_questions integer CHECK (expected_questions >= 0),
    coverage_evidence jsonb NOT NULL DEFAULT '{}',
    recorded_at timestamptz NOT NULL DEFAULT now(),
    CHECK (coverage_state <> 'VERIFIED' OR expected_questions > 0),
    CHECK (coverage_state <> 'NO_QUESTIONS' OR expected_questions = 0)
);
CREATE TABLE learning_catalog.pdf_source_files (
    relative_path text PRIMARY KEY,
    source_sha256 char(64) NOT NULL REFERENCES learning_catalog.pdf_sources,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    mtime_ns bigint NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pdf_source_files_hash ON learning_catalog.pdf_source_files(source_sha256);
CREATE TABLE learning_catalog.pdf_source_catalog (
    catalog_id integer PRIMARY KEY REFERENCES learning_catalog.pdf_audit_rows,
    source_sha256 char(64) NOT NULL REFERENCES learning_catalog.pdf_sources
);
CREATE INDEX pdf_source_catalog_hash ON learning_catalog.pdf_source_catalog(source_sha256);
CREATE TABLE learning_catalog.pdf_source_pages (
    source_sha256 char(64) NOT NULL REFERENCES learning_catalog.pdf_sources,
    page_number integer NOT NULL CHECK (page_number > 0),
    observations jsonb NOT NULL,
    PRIMARY KEY(source_sha256,page_number)
);
CREATE TABLE learning_catalog.pdf_question_occurrences (
    source_sha256 char(64) NOT NULL REFERENCES learning_catalog.pdf_sources,
    locator_key text NOT NULL,
    page_number integer NOT NULL CHECK (page_number > 0),
    printed_numbers integer[] NOT NULL DEFAULT '{}',
    question_code varchar(60) REFERENCES questions(code),
    status text NOT NULL CHECK (status IN ('LINKED','CANDIDATE','NEEDS_REVIEW','EXCLUDED')),
    evidence jsonb NOT NULL,
    PRIMARY KEY(source_sha256,locator_key),
    CHECK (status <> 'LINKED' OR question_code IS NOT NULL)
);
CREATE INDEX pdf_occurrence_question ON learning_catalog.pdf_question_occurrences(question_code);
CREATE TABLE learning_catalog.question_source_registry (
    question_code varchar(60) PRIMARY KEY REFERENCES questions(code),
    source_kind text NOT NULL CHECK (source_kind IN ('PDF','WEB','UNRESOLVED')),
    source_sha256 char(64) REFERENCES learning_catalog.pdf_sources,
    source_reference text NOT NULL,
    source_stamp text NOT NULL,
    evidence jsonb NOT NULL,
    CHECK (source_kind <> 'PDF' OR source_sha256 IS NOT NULL)
);
CREATE INDEX question_source_kind ON learning_catalog.question_source_registry(source_kind);
CREATE TABLE learning_catalog.question_content_fingerprints (
    question_code varchar(60) NOT NULL REFERENCES questions(code),
    algorithm text NOT NULL,
    fingerprint char(64) NOT NULL,
    PRIMARY KEY(question_code,algorithm,fingerprint)
);
CREATE INDEX question_content_match ON learning_catalog.question_content_fingerprints(algorithm,fingerprint);
