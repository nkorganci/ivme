-- TAS-01: the user requested a fresh learning history, with other studies preserved.
-- This migration records the boundary only. Explicit maintenance performs the scoped cleanup.
CREATE TABLE learning_engine_lifecycle (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    started_at timestamptz NOT NULL,
    cleaned_at timestamptz
);
INSERT INTO learning_engine_lifecycle(singleton, started_at)
VALUES (true, '2026-10-31T11:26:31Z');
