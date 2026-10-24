-- Deneme ve çalışma oturumlarının sınav hedefi (geçmiş/özet sınava göre ayrılır).
-- V80'in ilk uygulanan sürümünde bu kolonlar yoktu; yeni kurulumda V80 ekler, burada yalnız eksikse eklenir.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS track_id varchar(40) NOT NULL DEFAULT 'YKS' REFERENCES exam_tracks(id);
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS track_id varchar(40) NOT NULL DEFAULT 'YKS' REFERENCES exam_tracks(id);
CREATE INDEX IF NOT EXISTS ix_exams_user_track ON exams (user_id, track_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS ix_study_sessions_user_track ON study_sessions (user_id, track_id, mode, started_at DESC);
