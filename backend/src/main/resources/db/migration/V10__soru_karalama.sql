CREATE TABLE question_boards (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    strokes_json text NOT NULL DEFAULT '[]' CHECK (length(strokes_json) <= 65536),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
);
