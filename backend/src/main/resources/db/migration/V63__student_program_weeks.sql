-- Haftalık programın tek kalıcı kaynağı: kullanıcı + pazartesi.
CREATE TABLE student_program_weeks (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start date NOT NULL,
    revision bigint NOT NULL DEFAULT 1,
    rows jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, week_start),
    CONSTRAINT ck_student_program_monday CHECK (extract(isodow FROM week_start) = 1),
    CONSTRAINT ck_student_program_rows CHECK (jsonb_typeof(rows) = 'array')
);
