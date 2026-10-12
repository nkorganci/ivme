CREATE TABLE math_private_lessons (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    topic text NOT NULL DEFAULT '',
    homework text NOT NULL DEFAULT '',
    homework_source text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    zoom_url text NOT NULL DEFAULT '',
    attachment_name text,
    attachment_file text,
    attachment_type varchar(40),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_math_lesson_times CHECK (end_time > start_time)
);
CREATE INDEX ix_math_private_lessons_user_date ON math_private_lessons(user_id, lesson_date, start_time);
