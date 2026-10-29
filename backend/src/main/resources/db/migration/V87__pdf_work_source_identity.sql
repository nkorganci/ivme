-- A catalog alias must not schedule the same physical source twice.
CREATE UNIQUE INDEX pdf_work_unique_source ON learning_catalog.pdf_work_queue(source_sha256)
    WHERE source_sha256<>'';
