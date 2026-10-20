ALTER TABLE users
    ADD COLUMN active_seconds bigint NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
    ADD COLUMN last_login_country_code varchar(2)
        CHECK (last_login_country_code IS NULL OR last_login_country_code ~ '^[A-Z0-9]{2}$');
