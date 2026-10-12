ALTER TABLE math_private_lessons
    ADD COLUMN status varchar(16) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN understanding text NOT NULL DEFAULT '',
    ADD COLUMN gaps text NOT NULL DEFAULT '',
    ADD COLUMN review_topics text NOT NULL DEFAULT '',
    ADD COLUMN next_goal text NOT NULL DEFAULT '',
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
    ADD CONSTRAINT ck_math_lesson_status CHECK (status IN ('PLANNED','COMPLETED','CANCELLED','POSTPONED'));

CREATE TABLE math_lesson_topics (
    id bigserial PRIMARY KEY,
    lesson_id bigint NOT NULL REFERENCES math_private_lessons(id) ON DELETE CASCADE,
    description text NOT NULL CHECK (length(trim(description)) > 0)
);
CREATE INDEX ix_math_lesson_topics_lesson ON math_lesson_topics(lesson_id);
INSERT INTO math_lesson_topics(lesson_id, description)
SELECT id, topic FROM math_private_lessons WHERE trim(topic) <> '';

CREATE TABLE math_lesson_homeworks (
    id bigserial PRIMARY KEY,
    lesson_id bigint NOT NULL REFERENCES math_private_lessons(id) ON DELETE CASCADE,
    description text NOT NULL DEFAULT '',
    source_name text NOT NULL DEFAULT '',
    pages text NOT NULL DEFAULT '',
    web_url text NOT NULL DEFAULT '',
    assigned_date date,
    due_date date,
    status varchar(16) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','SUBMITTED','REVIEWED')),
    teacher_note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_math_lesson_homeworks_lesson ON math_lesson_homeworks(lesson_id);
INSERT INTO math_lesson_homeworks(lesson_id,description,source_name)
SELECT id,homework,homework_source FROM math_private_lessons
WHERE trim(homework) <> '' OR trim(homework_source) <> '';

CREATE TABLE math_homework_evaluations (
    id bigserial PRIMARY KEY,
    homework_id bigint NOT NULL REFERENCES math_lesson_homeworks(id) ON DELETE CASCADE,
    correct_count integer NOT NULL CHECK (correct_count >= 0),
    wrong_count integer NOT NULL CHECK (wrong_count >= 0),
    blank_count integer NOT NULL CHECK (blank_count >= 0),
    evaluated_on date NOT NULL,
    note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_math_homework_evaluations_homework ON math_homework_evaluations(homework_id,id);

CREATE TABLE math_lesson_weekly_goals (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    target_minutes integer NOT NULL DEFAULT 360 CHECK (target_minutes BETWEEN 0 AND 10080)
);

ALTER TABLE math_private_lesson_attachments
    ADD COLUMN homework_id bigint REFERENCES math_lesson_homeworks(id) ON DELETE CASCADE,
    ADD COLUMN content_type varchar(40) NOT NULL DEFAULT 'application/octet-stream';
CREATE INDEX ix_math_lesson_attachments_homework ON math_private_lesson_attachments(homework_id);
