CREATE TABLE user_display_preferences (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key varchar(40) NOT NULL,
    value boolean NOT NULL,
    PRIMARY KEY (user_id, preference_key)
);
