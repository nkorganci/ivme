-- Only future public registrations enqueue work; never backfill existing users.
CREATE TABLE registration_notification_outbox (
    id bigserial PRIMARY KEY,
    event_key uuid NOT NULL UNIQUE,
    event_type varchar(32) NOT NULL DEFAULT 'NEW_REGISTRATION' CHECK (event_type = 'NEW_REGISTRATION'),
    user_id bigint NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status varchar(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','PROCESSING','RETRY','FAILED','ACCEPTED')),
    recipient varchar(254),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    lease_token uuid,
    lease_until timestamptz,
    error_code varchar(64),
    provider_message_id varchar(500),
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz
);
CREATE INDEX registration_notification_due ON registration_notification_outbox(next_attempt_at, id)
    WHERE status IN ('PENDING','RETRY','PROCESSING');
