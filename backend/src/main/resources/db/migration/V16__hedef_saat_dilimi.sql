-- Hedefin yerel takvim sınırı, oluşturulduğu IANA saat dilimiyle sabitlenir.
ALTER TABLE goals ADD COLUMN zone_id varchar(64) NOT NULL DEFAULT 'Europe/Istanbul';
ALTER TABLE goals ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE goals ADD COLUMN stopped_at timestamptz;
ALTER TABLE goals ADD CONSTRAINT ck_goals_stopped_at CHECK (stopped_at IS NULL OR stopped_at >= created_at);
CREATE INDEX ix_goals_user_status_period ON goals(user_id, status, starts_on DESC);
