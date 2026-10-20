CREATE TABLE student_self_check_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind varchar(32) NOT NULL CHECK (kind IN ('GUIDE_QUIZ', 'SOURCE_PRACTICE')),
    item_key varchar(160) NOT NULL,
    answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'array'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_student_self_check_latest
    ON student_self_check_attempts(user_id, kind, item_key, id DESC);
CREATE TRIGGER audit_student_self_checks AFTER INSERT ON student_self_check_attempts
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
