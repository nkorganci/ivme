-- Review work is separate from source PDFs and immutable published catalog runs.
CREATE TABLE learning_catalog.pdf_work_queue (
    catalog_id integer PRIMARY KEY,
    source_sha256 varchar(64) NOT NULL CHECK (source_sha256 = '' OR source_sha256 ~ '^[0-9a-f]{64}$'),
    action varchar(20) NOT NULL CHECK (action IN ('EXTRACT', 'DELETE_REVIEW')),
    status varchar(20) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'IN_REVIEW', 'DONE')),
    requested_by bigint NOT NULL REFERENCES users(id),
    requested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
