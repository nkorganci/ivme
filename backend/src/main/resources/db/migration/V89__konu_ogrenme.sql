-- Konuyu Öğrenelim: öğrenme motorunun ekleme-yalnız olay günlüğü ve öğrenci ayarları.
-- Kavram durumu, yanlış soru kuyruğu, kartlar ve günlük plan bu olaylardan istemcide yeniden türetilir.
CREATE TABLE learning_engine_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_event_id uuid NOT NULL,
    subject varchar(32) NOT NULL CHECK (subject IN ('matematik')),
    kind varchar(16) NOT NULL CHECK (kind IN ('attempt', 'lesson', 'concept', 'set', 'queue', 'plan')),
    concept_id varchar(80) CHECK (concept_id ~ '^[a-z0-9-]{1,80}$'),
    item_type varchar(16) CHECK (item_type IN ('bank', 'lesson_q', 'flashcard')),
    question_id bigint REFERENCES questions(id),
    correct boolean,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT learning_engine_events_client UNIQUE (user_id, client_event_id),
    CONSTRAINT learning_engine_events_bank CHECK (item_type IS DISTINCT FROM 'bank' OR (question_id IS NOT NULL AND correct IS NOT NULL))
);
CREATE INDEX ix_learning_engine_events_user ON learning_engine_events(user_id, subject, id);
CREATE INDEX ix_learning_engine_events_question ON learning_engine_events(user_id, question_id) WHERE question_id IS NOT NULL;

CREATE TABLE learning_engine_profiles (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject varchar(32) NOT NULL CHECK (subject IN ('matematik')),
    settings jsonb NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, subject)
);
CREATE TRIGGER audit_learning_engine_profiles AFTER INSERT OR UPDATE OR DELETE ON learning_engine_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
