-- Çalışma oturumları ve öğrenci olayları. Arayüz/API sonraki adımlarda bağlanır.
CREATE TABLE study_sessions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    mode varchar(12) NOT NULL CHECK (mode IN ('PRACTICE', 'TEST')),
    selection_mode varchar(10) NOT NULL CHECK (selection_mode IN ('NEW', 'REPEAT', 'MIXED', 'WRONG')),
    status varchar(12) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    time_limit_seconds integer CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX ix_study_sessions_user_time ON study_sessions(user_id, started_at DESC);

CREATE TABLE session_questions (
    session_id bigint NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    question_id bigint NOT NULL REFERENCES questions(id),
    position integer NOT NULL CHECK (position > 0),
    PRIMARY KEY (session_id, question_id),
    UNIQUE (session_id, position)
);
CREATE INDEX ix_session_questions_question ON session_questions(question_id);

CREATE TABLE question_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    question_id bigint NOT NULL REFERENCES questions(id),
    session_id bigint REFERENCES study_sessions(id),
    client_event_id uuid NOT NULL,
    event_type varchar(8) NOT NULL CHECK (event_type IN ('ANSWER', 'REVEAL', 'SKIP')),
    selected_answer varchar(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E')),
    correct_answer varchar(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
    is_correct boolean,
    active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds BETWEEN 0 AND 21600),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, client_event_id),
    CHECK ((event_type = 'ANSWER' AND selected_answer IS NOT NULL AND is_correct IS NOT NULL)
        OR (event_type <> 'ANSWER' AND selected_answer IS NULL AND is_correct IS NULL))
);
CREATE INDEX ix_attempts_user_question_time ON question_attempts(user_id, question_id, created_at, id);
CREATE INDEX ix_attempts_user_time ON question_attempts(user_id, created_at DESC);
CREATE INDEX ix_attempts_session ON question_attempts(session_id) WHERE session_id IS NOT NULL;

CREATE TABLE goals (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    period varchar(7) NOT NULL CHECK (period IN ('DAY', 'WEEK', 'MONTH')),
    metric varchar(16) NOT NULL CHECK (metric IN ('UNIQUE_QUESTIONS', 'ATTEMPTS', 'TESTS', 'EXAMS')),
    subject varchar(80),
    target_count integer NOT NULL CHECK (target_count > 0),
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    status varchar(8) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_on >= starts_on)
);
CREATE INDEX ix_goals_user_period ON goals(user_id, starts_on DESC, ends_on);

-- İçerik taksonomisi veriyle büyür; mevcut soruların metin etiketleri daha sonra eşlenir.
CREATE TABLE taxonomy_nodes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id bigint REFERENCES taxonomy_nodes(id),
    kind varchar(16) NOT NULL CHECK (kind IN ('EXAM', 'SUBJECT', 'TOPIC', 'SUBTOPIC', 'SKILL', 'QUESTION_TYPE')),
    code varchar(80) NOT NULL,
    name varchar(160) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    UNIQUE NULLS NOT DISTINCT (parent_id, kind, code),
    CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX ix_taxonomy_parent ON taxonomy_nodes(parent_id, kind);

CREATE TABLE question_taxonomy (
    question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    node_id bigint NOT NULL REFERENCES taxonomy_nodes(id),
    source varchar(12) NOT NULL DEFAULT 'HUMAN' CHECK (source IN ('HUMAN', 'RULE', 'AI_REVIEWED')),
    PRIMARY KEY (question_id, node_id)
);
CREATE INDEX ix_question_taxonomy_node ON question_taxonomy(node_id, question_id);

CREATE TABLE taxonomy_prerequisites (
    node_id bigint NOT NULL REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
    prerequisite_id bigint NOT NULL REFERENCES taxonomy_nodes(id),
    PRIMARY KEY (node_id, prerequisite_id),
    CHECK (node_id <> prerequisite_id)
);

-- Sadece ölçüm için gerekli olaylar; ham IP/kişisel iletişim bilgisi tutulmaz.
CREATE TABLE activity_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    session_key uuid NOT NULL,
    event_type varchar(10) NOT NULL CHECK (event_type IN ('LOGIN', 'ACTIVE', 'LOGOUT')),
    active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds BETWEEN 0 AND 300),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (event_type = 'ACTIVE' OR active_seconds = 0)
);
CREATE INDEX ix_activity_user_time ON activity_events(user_id, created_at DESC);
CREATE INDEX ix_activity_session_time ON activity_events(session_key, created_at);
