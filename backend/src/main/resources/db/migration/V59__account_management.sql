-- Additive transition: preserve existing accounts, passwords and learning records.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER','ADMIN','OPERATOR','PARENT','TEACHER'));
ALTER TABLE users ADD COLUMN category varchar(12) CHECK (category IN ('STUDENT','PARENT','TEACHER'));
ALTER TABLE users ADD COLUMN site_manager boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN archived_at timestamptz;
ALTER TABLE users ADD COLUMN pause_reason text;
ALTER TABLE users ADD COLUMN last_login_at timestamptz;
ALTER TABLE users ADD COLUMN last_seen_at timestamptz;
UPDATE users u SET last_login_at=(SELECT max(created_at) FROM activity_events WHERE user_id=u.id AND event_type='LOGIN'),
 last_seen_at=(SELECT max(created_at) FROM activity_events WHERE user_id=u.id);
-- Explicit user instruction: no other legacy user's role/category is changed.
UPDATE users SET role='ADMIN',site_manager=true WHERE lower(username)='nazile';
CREATE TABLE account_audit (
 id bigserial PRIMARY KEY, actor_id bigint REFERENCES users(id) ON DELETE SET NULL,
 target_id bigint REFERENCES users(id) ON DELETE SET NULL, action varchar(40) NOT NULL,
 details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_audit_target ON account_audit(target_id,created_at DESC);
CREATE TABLE student_connections (
 id bigserial PRIMARY KEY, adult_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 student_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind varchar(10) NOT NULL CHECK(kind IN ('PARENT','TEACHER')),
 state varchar(10) NOT NULL CHECK(state IN ('PENDING','ACTIVE','REVOKED')),
 requested_by bigint REFERENCES users(id) ON DELETE SET NULL,
 approved_by bigint REFERENCES users(id) ON DELETE SET NULL,
 reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(adult_id<>student_id), UNIQUE(adult_id,student_id,kind)
);
CREATE TABLE account_notifications (
 id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 sender_id bigint REFERENCES users(id) ON DELETE SET NULL,title varchar(150) NOT NULL,
 message text NOT NULL, available_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),event_key text UNIQUE
);
CREATE INDEX account_notifications_inbox ON account_notifications(user_id,available_at DESC);
CREATE TABLE account_activity_days (
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,day date NOT NULL,
 requests integer NOT NULL DEFAULT 0,logins integer NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day)
);
INSERT INTO account_activity_days(user_id,day,requests,logins)
 SELECT user_id,(created_at AT TIME ZONE 'Europe/Istanbul')::date,count(*),count(*) FILTER(WHERE event_type='LOGIN')
 FROM activity_events GROUP BY user_id,(created_at AT TIME ZONE 'Europe/Istanbul')::date;
CREATE TABLE account_notification_rules (
 id integer PRIMARY KEY CHECK(id=1),enabled boolean NOT NULL DEFAULT false,
 inactivity_days integer NOT NULL DEFAULT 7 CHECK(inactivity_days BETWEEN 1 AND 365),
 message text NOT NULL DEFAULT 'Bir süredir çalışma yapmadın. Kaldığın yerden devam edebilirsin.'
);
INSERT INTO account_notification_rules(id) VALUES(1);
