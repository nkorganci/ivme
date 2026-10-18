CREATE TABLE ayt_trial_sheets (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    revision bigint NOT NULL DEFAULT 0,
    payload jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
