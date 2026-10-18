-- Versioned source-derived labels are separate from teacher decisions and student performance.
CREATE SCHEMA IF NOT EXISTS learning_catalog;
CREATE TABLE IF NOT EXISTS learning_catalog.runs (
    run_key varchar(80) PRIMARY KEY,
    method varchar(80) NOT NULL,
    summary jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_catalog.categories (
    run_key varchar(80) NOT NULL REFERENCES learning_catalog.runs(run_key),
    category_id text NOT NULL,
    definition jsonb NOT NULL,
    PRIMARY KEY (run_key, category_id)
);
CREATE TABLE IF NOT EXISTS learning_catalog.items (
    run_key varchar(80) NOT NULL REFERENCES learning_catalog.runs(run_key),
    item_key text NOT NULL,
    kind varchar(16) NOT NULL CHECK (kind IN ('QUESTION','PDF','NOTE','VIDEO','TOPIC')),
    exam varchar(16) NOT NULL,
    subject_id varchar(32) NOT NULL,
    student_visible boolean NOT NULL,
    data jsonb NOT NULL,
    PRIMARY KEY (run_key, item_key)
);
CREATE TABLE IF NOT EXISTS learning_catalog.assignments (
    run_key varchar(80) NOT NULL,
    item_key text NOT NULL,
    category_id text NOT NULL,
    relation varchar(16) NOT NULL CHECK (relation IN ('PRIMARY','SECONDARY','PREREQUISITE')),
    PRIMARY KEY (run_key,item_key,category_id),
    FOREIGN KEY (run_key,item_key) REFERENCES learning_catalog.items(run_key,item_key),
    FOREIGN KEY (run_key,category_id) REFERENCES learning_catalog.categories(run_key,category_id)
);
CREATE INDEX IF NOT EXISTS learning_items_scope ON learning_catalog.items(run_key,student_visible,kind,exam,subject_id);
CREATE INDEX IF NOT EXISTS learning_assignments_category ON learning_catalog.assignments(run_key,category_id,item_key);
CREATE TABLE IF NOT EXISTS learning_catalog.current_run (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    run_key varchar(80) NOT NULL REFERENCES learning_catalog.runs(run_key)
);
CREATE OR REPLACE VIEW learning_catalog.current_items AS
    SELECT i.* FROM learning_catalog.items i JOIN learning_catalog.current_run r USING(run_key);
CREATE OR REPLACE VIEW learning_catalog.current_categories AS
    SELECT c.* FROM learning_catalog.categories c JOIN learning_catalog.current_run r USING(run_key);
CREATE OR REPLACE VIEW learning_catalog.current_assignments AS
    SELECT a.* FROM learning_catalog.assignments a JOIN learning_catalog.current_run r USING(run_key);
