-- Supporting curriculum files and exhaustive source reconciliation share the label run identity.
CREATE TABLE IF NOT EXISTS learning_catalog.source_audits (
    run_key varchar(80) PRIMARY KEY REFERENCES learning_catalog.runs(run_key),
    inventory_audit jsonb NOT NULL,
    curriculum_references jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
