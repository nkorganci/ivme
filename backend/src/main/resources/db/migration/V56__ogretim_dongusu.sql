-- Öğretim döngüsü (akıllı öğretmen pilotu).
-- Üç ayrı sorumluluk: doğrulanmış ve sürümlü soru içeriği (tutor_contents), öğrencinin beceri kaydı
-- (tutor_skill_states) ve bir sonraki öğretim adımını seçen oturum akışı (tutor_sessions/tutor_events).
-- İçerik yalnız scripts/ogretim-icerigi.py ile yeni sürüm olarak eklenir; öğretmen kararı ayrı satırdır.

CREATE TABLE tutor_contents (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id      bigint       NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_code    varchar(60)  NOT NULL,
    version_no       integer      NOT NULL CHECK (version_no > 0),
    schema_version   integer      NOT NULL CHECK (schema_version > 0),
    content          jsonb        NOT NULL,
    content_sha256   char(64)     NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
    image_sha256     char(64)     NOT NULL CHECK (image_sha256 ~ '^[a-f0-9]{64}$'),
    answer_key       varchar(1)   NOT NULL CHECK (answer_key IN ('A', 'B', 'C', 'D', 'E')),
    subject_id       varchar(32)  NOT NULL,
    category_id      text         NOT NULL,
    pattern_key      varchar(120) NOT NULL,
    verification     jsonb        NOT NULL,
    confidence       numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    confidence_band  varchar(8)   NOT NULL CHECK (confidence_band IN ('HIGH', 'MEDIUM', 'LOW')),
    review_flag      boolean      NOT NULL,
    review_reasons   jsonb        NOT NULL DEFAULT '[]'::jsonb,
    status           varchar(16)  NOT NULL
        CHECK (status IN ('AUTO_VERIFIED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
    generator        varchar(120) NOT NULL,
    generation_tier  varchar(12)  NOT NULL CHECK (generation_tier IN ('ECONOMIC', 'STRONG', 'HUMAN')),
    prompt_version   varchar(60)  NOT NULL,
    source_file      varchar(300),
    created_at       timestamptz  NOT NULL DEFAULT now(),
    reviewed_by      bigint       REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      timestamptz,
    UNIQUE (question_id, version_no),
    UNIQUE (question_id, content_sha256)
);
CREATE INDEX ix_tutor_contents_subject ON tutor_contents (subject_id, status);

-- Öğretmen kararları sürüme bağlı ve değişmezdir; kalibrasyon bu satırlardan hesaplanır.
CREATE TABLE tutor_content_reviews (
    id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_id           bigint       NOT NULL REFERENCES tutor_contents(id) ON DELETE CASCADE,
    reviewer_id          bigint       REFERENCES users(id) ON DELETE SET NULL,
    decision             varchar(24)  NOT NULL CHECK (decision IN ('APPROVE', 'REJECT', 'REQUEST_REGENERATION')),
    rubric               jsonb        NOT NULL,
    note                 varchar(2000) NOT NULL DEFAULT '',
    confidence_at_review numeric(4,3) NOT NULL,
    band_at_review       varchar(8)   NOT NULL,
    created_at           timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX ix_tutor_reviews_content ON tutor_content_reviews (content_id, created_at DESC);

CREATE TABLE tutor_regeneration_requests (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id         bigint       NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content_id          bigint       REFERENCES tutor_contents(id) ON DELETE SET NULL,
    requested_by        bigint       REFERENCES users(id) ON DELETE SET NULL,
    reason              varchar(2000) NOT NULL,
    status              varchar(12)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'EXPORTED', 'RESOLVED', 'CANCELLED')),
    resolved_content_id bigint       REFERENCES tutor_contents(id) ON DELETE SET NULL,
    created_at          timestamptz  NOT NULL DEFAULT now(),
    resolved_at         timestamptz
);
CREATE UNIQUE INDEX ux_tutor_regeneration_open ON tutor_regeneration_requests (question_id)
    WHERE status IN ('OPEN', 'EXPORTED');

CREATE TABLE tutor_sessions (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id bigint      NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content_id  bigint      NOT NULL REFERENCES tutor_contents(id) ON DELETE CASCADE,
    status      varchar(8)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE')),
    outcome     varchar(24) CHECK (outcome IN ('INDEPENDENT', 'ASSISTED', 'WORKED', 'SOLUTION_VIEWED')),
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);
CREATE UNIQUE INDEX ux_tutor_sessions_open ON tutor_sessions (user_id, question_id) WHERE status = 'OPEN';
CREATE INDEX ix_tutor_sessions_user ON tutor_sessions (user_id, started_at DESC);

-- Olay günlüğü değişmezdir; oturum görünümü ve politika bu sıradan yeniden kurulur.
CREATE TABLE tutor_events (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id bigint      NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    seq        integer     NOT NULL CHECK (seq > 0),
    type       varchar(24) NOT NULL CHECK (type IN ('START', 'PREVIEW', 'STRATEGY', 'HINT', 'ANSWER', 'STEP',
                   'EXPLAIN', 'LEVEL', 'PREDICT', 'SOLUTION', 'TWIN_ANSWER', 'FREE_TEXT', 'DONE')),
    payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, seq)
);

CREATE TABLE tutor_skill_states (
    user_id             bigint       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_key           varchar(120) NOT NULL,
    subject_id          varchar(32)  NOT NULL,
    category_id         text         NOT NULL,
    mastery             numeric(5,4) NOT NULL CHECK (mastery BETWEEN 0 AND 1),
    independent_correct integer      NOT NULL DEFAULT 0,
    assisted_correct    integer      NOT NULL DEFAULT 0,
    wrong               integer      NOT NULL DEFAULT 0,
    hints_used          integer      NOT NULL DEFAULT 0,
    explain_correct     integer      NOT NULL DEFAULT 0,
    explain_total       integer      NOT NULL DEFAULT 0,
    transfer_correct    integer      NOT NULL DEFAULT 0,
    streak              integer      NOT NULL DEFAULT 0,
    last_outcome        varchar(24),
    last_practiced_at   timestamptz,
    next_review_at      timestamptz,
    updated_at          timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_key)
);
CREATE INDEX ix_tutor_skills_review ON tutor_skill_states (user_id, next_review_at);

-- Model çıktıları yalnız içerik sürümü + girdi özeti anahtarıyla yeniden kullanılır.
CREATE TABLE tutor_model_cache (
    cache_key   char(64)     PRIMARY KEY CHECK (cache_key ~ '^[a-f0-9]{64}$'),
    task        varchar(32)  NOT NULL,
    model       varchar(120) NOT NULL,
    output      jsonb        NOT NULL,
    hits        integer      NOT NULL DEFAULT 0,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    last_hit_at timestamptz
);

CREATE TABLE tutor_model_calls (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task       varchar(32)  NOT NULL,
    tier       varchar(12)  NOT NULL CHECK (tier IN ('ECONOMIC', 'STRONG', 'TEACHER', 'RULES')),
    model      varchar(120),
    cache_hit  boolean      NOT NULL,
    status     varchar(16)  NOT NULL CHECK (status IN ('OK', 'INVALID', 'UNAVAILABLE', 'ESCALATED', 'FALLBACK')),
    latency_ms integer,
    session_id bigint       REFERENCES tutor_sessions(id) ON DELETE SET NULL,
    created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX ix_tutor_model_calls_time ON tutor_model_calls (created_at DESC);

-- Modelin emin olamadığı öğrenci açıklamaları öğretmene gider.
CREATE TABLE tutor_teacher_queue (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id    bigint        NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    content_id    bigint        NOT NULL REFERENCES tutor_contents(id) ON DELETE CASCADE,
    step_id       varchar(40),
    student_text  varchar(1000) NOT NULL,
    model_label   varchar(40),
    status        varchar(12)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    teacher_label varchar(40),
    teacher_note  varchar(1000),
    resolved_by   bigint        REFERENCES users(id) ON DELETE SET NULL,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    resolved_at   timestamptz
);
CREATE INDEX ix_tutor_teacher_queue_open ON tutor_teacher_queue (status, created_at);
