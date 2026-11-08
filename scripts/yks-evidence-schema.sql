-- Preparation evidence only; no runtime catalog, questions or learner writes.
CREATE SCHEMA IF NOT EXISTS yks_evidence;
CREATE TABLE IF NOT EXISTS yks_evidence.artifacts (
 sha256 text PRIMARY KEY CHECK (sha256 ~ '^[0-9a-f]{64}$'),
 byte_count bigint NOT NULL CHECK(byte_count>=0),
 content bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(octet_length(content)=byte_count),
 CHECK(encode(sha256(content),'hex')=sha256)
);
CREATE TABLE IF NOT EXISTS yks_evidence.checkpoints (
 checkpoint_sha256 text PRIMARY KEY CHECK(checkpoint_sha256 ~ '^[0-9a-f]{64}$'),
 run_id text NOT NULL,
 manifest_sha256 text NOT NULL REFERENCES yks_evidence.artifacts(sha256),
 status text NOT NULL CHECK(status='ARCHIVED'),
 summary jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS yks_evidence.checkpoint_files (
 checkpoint_sha256 text NOT NULL REFERENCES yks_evidence.checkpoints(checkpoint_sha256),
 logical_path text NOT NULL,
 artifact_sha256 text NOT NULL REFERENCES yks_evidence.artifacts(sha256),
 role text NOT NULL,
 PRIMARY KEY(checkpoint_sha256,logical_path)
);
CREATE TABLE IF NOT EXISTS yks_evidence.source_dispositions (
 checkpoint_sha256 text NOT NULL REFERENCES yks_evidence.checkpoints(checkpoint_sha256),
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
 page_count integer NOT NULL CHECK(page_count>0),
 state text NOT NULL,
 next_action text NOT NULL,
 evidence jsonb NOT NULL,
 PRIMARY KEY(checkpoint_sha256,source_sha256)
);
CREATE INDEX IF NOT EXISTS yks_source_history ON yks_evidence.source_dispositions(source_sha256,checkpoint_sha256);
-- JSON is for querying. Artifact bytes are the authoritative lossless original,
-- including NUL, formula glyphs, unsuccessful model responses and source quotes.
CREATE TABLE IF NOT EXISTS yks_evidence.records (
 checkpoint_sha256 text NOT NULL REFERENCES yks_evidence.checkpoints(checkpoint_sha256),
 record_kind text NOT NULL,
 record_key text NOT NULL,
 source_sha256 text,
 source_code text,
 status text NOT NULL,
 parent_artifact_sha256 text NOT NULL REFERENCES yks_evidence.artifacts(sha256),
 evidence jsonb NOT NULL,
 PRIMARY KEY(checkpoint_sha256,record_kind,record_key)
);
CREATE INDEX IF NOT EXISTS yks_record_source ON yks_evidence.records(source_sha256,record_kind);
CREATE INDEX IF NOT EXISTS yks_record_code ON yks_evidence.records(source_code,record_kind);
