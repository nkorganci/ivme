CREATE TABLE learning_catalog.pdf_audit_state (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    metadata jsonb NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE learning_catalog.pdf_audit_rows (
    catalog_id integer PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
