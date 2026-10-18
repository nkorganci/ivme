-- Teacher decisions are separate from imported content, with optimistic revisions and append-only history.
CREATE TABLE physics_content_reviews (
    item_key varchar(500) PRIMARY KEY,
    revision integer NOT NULL CHECK (revision > 0),
    reviewer_id bigint NOT NULL REFERENCES users(id),
    decision jsonb NOT NULL,
    snapshot jsonb NOT NULL,
    fingerprint varchar(64) NOT NULL,
    saved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE physics_content_review_history (
    item_key varchar(500) NOT NULL,
    revision integer NOT NULL,
    reviewer_id bigint NOT NULL REFERENCES users(id),
    decision jsonb NOT NULL,
    snapshot jsonb NOT NULL,
    fingerprint varchar(64) NOT NULL,
    saved_at timestamptz NOT NULL,
    PRIMARY KEY (item_key, revision)
);
