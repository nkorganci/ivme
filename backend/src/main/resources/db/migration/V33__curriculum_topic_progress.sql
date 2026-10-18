CREATE TABLE curriculum_topic_progress (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id varchar(160) NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, topic_id)
);
