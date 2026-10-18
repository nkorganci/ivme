-- Öğrencinin haftalık programı. Bir haftada seçilen aralık ve hücreler birlikte saklanır.
CREATE TABLE student_program_weeks (
    user_id        bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start     date NOT NULL,
    selected_start date NOT NULL,
    selected_end   date NOT NULL,
    zone_id        varchar(64) NOT NULL,
    cells          jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, week_start),
    CONSTRAINT ck_program_week_monday CHECK (extract(isodow FROM week_start) = 1),
    CONSTRAINT ck_program_week_range CHECK (
        selected_start >= week_start AND selected_end <= week_start + 6
        AND selected_start <= selected_end
    ),
    CONSTRAINT ck_program_week_cells_object CHECK (jsonb_typeof(cells) = 'object')
);
