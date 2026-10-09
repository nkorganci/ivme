ALTER TABLE exams ADD COLUMN selection_mode varchar(10) NOT NULL DEFAULT 'MIXED'
    CHECK (selection_mode IN ('NEW', 'REPEAT', 'MIXED', 'WRONG'));
