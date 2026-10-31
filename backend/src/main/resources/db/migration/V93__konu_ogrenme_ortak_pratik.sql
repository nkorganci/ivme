-- TAS-05: Konuyu Öğrenelim'den açılan oturum, ortak PRATIK oturumudur (study_sessions, mode=PRACTICE).
-- Mevcut oturumlar origin='STUDY' kalır; hiçbir öğrenci kaydı değiştirilmez veya silinmez.
ALTER TABLE study_sessions
    ADD COLUMN origin varchar(16) NOT NULL DEFAULT 'STUDY' CHECK (origin IN ('STUDY', 'KONU_OGRENME')),
    ADD COLUMN learning_kind varchar(16) CHECK (learning_kind IN ('TOPIC_TEST', 'PAST_EXAM', 'ARCHETYPE')),
    ADD COLUMN learning_concept_id varchar(80) CHECK (learning_concept_id ~ '^[a-z0-9-]{1,80}$'),
    ADD COLUMN learning_scope jsonb CHECK (learning_scope IS NULL OR jsonb_typeof(learning_scope) = 'object'),
    ADD CONSTRAINT study_sessions_learning_shape CHECK (
        (origin = 'KONU_OGRENME') = (learning_kind IS NOT NULL AND learning_concept_id IS NOT NULL AND learning_scope IS NOT NULL));

-- Set sırası zaten session_questions.position; soru tipi, zorluk ve görsel içerik özeti setle birlikte saklanır.
ALTER TABLE session_questions
    ADD COLUMN learning_archetype varchar(80) CHECK (learning_archetype IS NULL OR learning_archetype ~ '^[a-z0-9-]{1,80}$'),
    ADD COLUMN learning_difficulty smallint CHECK (learning_difficulty IS NULL OR learning_difficulty BETWEEN 1 AND 3),
    ADD COLUMN content_sha256 char(64);

CREATE INDEX ix_study_sessions_learning_open ON study_sessions (user_id, learning_concept_id, learning_kind)
    WHERE origin = 'KONU_OGRENME' AND status = 'IN_PROGRESS';
