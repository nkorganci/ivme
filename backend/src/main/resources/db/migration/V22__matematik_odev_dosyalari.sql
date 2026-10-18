CREATE TABLE math_private_lesson_attachments (
    id bigserial PRIMARY KEY,
    lesson_id bigint NOT NULL REFERENCES math_private_lessons(id) ON DELETE CASCADE,
    original_name text NOT NULL,
    stored_name text NOT NULL UNIQUE,
    size_bytes bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_math_lesson_attachments_lesson ON math_private_lesson_attachments(lesson_id, id);

INSERT INTO math_private_lesson_attachments(lesson_id, original_name, stored_name, size_bytes)
SELECT id, attachment_name, attachment_file, 0
FROM math_private_lessons
WHERE attachment_file IS NOT NULL;

ALTER TABLE math_private_lessons
    DROP COLUMN attachment_name,
    DROP COLUMN attachment_file,
    DROP COLUMN attachment_type;
