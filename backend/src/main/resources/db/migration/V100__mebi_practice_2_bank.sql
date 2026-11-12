-- Preserve existing rows and constraints; allow the isolated MEBI bank.
ALTER TABLE questions DROP CONSTRAINT questions_bank_check;
ALTER TABLE questions ALTER COLUMN bank TYPE varchar(24);
ALTER TABLE questions ADD CONSTRAINT questions_bank_check
    CHECK (bank IN ('CIKMIS','OGM','MEBI_PRACTICE_2'));
ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_filter_bank_check;
ALTER TABLE study_sessions ALTER COLUMN filter_bank TYPE varchar(24);
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_filter_bank_check
    CHECK (filter_bank IN ('CIKMIS','OGM','MEBI_PRACTICE_2'));
