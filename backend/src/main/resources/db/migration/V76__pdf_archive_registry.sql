-- Main-only logical PDF archive. Source PDFs remain in the shared Kaynaklar tree.
CREATE TABLE learning_catalog.pdf_archive (
    source_sha256 varchar(64) PRIMARY KEY CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
    archive_relative_path text NOT NULL UNIQUE,
    original_relative_path text NOT NULL,
    question_count integer NOT NULL CHECK (question_count > 0),
    proof_codes jsonb NOT NULL,
    archived_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learning_catalog.pdf_work_queue DROP CONSTRAINT pdf_work_queue_action_check;
UPDATE learning_catalog.pdf_work_queue SET action='ARCHIVE_REVIEW' WHERE action='DELETE_REVIEW';
ALTER TABLE learning_catalog.pdf_work_queue ADD CONSTRAINT pdf_work_queue_action_check
    CHECK (action IN ('EXTRACT', 'ARCHIVE_REVIEW'));
