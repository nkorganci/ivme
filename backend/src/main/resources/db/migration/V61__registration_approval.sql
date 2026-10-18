-- Existing accounts keep access. All subsequent registrations require explicit approval.
ALTER TABLE users ADD COLUMN approved boolean NOT NULL DEFAULT true;
ALTER TABLE users ALTER COLUMN approved SET DEFAULT false;
