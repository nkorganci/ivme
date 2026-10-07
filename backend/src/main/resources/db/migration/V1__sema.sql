-- YKS Hazırlık — ilk şema (5 tablo). Veritabanı bu dosyadan sıfırdan kurulabilir.

-- ============ users ============
CREATE TABLE users (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      varchar(30)  NOT NULL,
    email         varchar(254) NOT NULL,
    password_hash varchar(100) NOT NULL,                       -- BCrypt ({bcrypt}...), asla düz metin değil
    role          varchar(10)  NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    enabled       boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_username ON users (lower(username));
CREATE UNIQUE INDEX ux_users_email    ON users (lower(email));

-- ============ questions ============
-- Görselin kendisi veritabanında DEĞİL; "image" yalnızca kök resim klasörüne göre göreli yoldur.
CREATE TABLE questions (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           varchar(60)  NOT NULL UNIQUE,               -- kalıcı dış kimlik (QR adresi: /soru/{code})
    exam_type      varchar(10)  NOT NULL CHECK (exam_type IN ('TYT', 'AYT')),
    subject        varchar(80)  NOT NULL,                      -- ders
    topic          varchar(160),                               -- konu
    difficulty     varchar(10)  CHECK (difficulty IN ('KOLAY', 'ORTA', 'ZOR')),
    exam_year      integer,
    source         varchar(200),
    image          varchar(300) NOT NULL,
    correct_answer varchar(1)   NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
    choice_count   integer      NOT NULL DEFAULT 5 CHECK (choice_count BETWEEN 2 AND 5),
    solution_url   varchar(500),
    active         boolean      NOT NULL DEFAULT true,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX ix_questions_filter     ON questions (active, exam_type, subject, topic);
CREATE INDEX ix_questions_difficulty ON questions (difficulty);

-- ============ exams ============
-- Sonuç sayıları gönderim anında yazılır; sonradan soru cevabı değişse de bu satırlar değişmez.
CREATE TABLE exams (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id            bigint       NOT NULL REFERENCES users (id),
    title              varchar(200) NOT NULL,                  -- örn. "TYT Matematik"
    exam_type          varchar(10),
    subject            varchar(80),
    status             varchar(12)  NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED')),
    question_count     integer      NOT NULL,
    time_limit_minutes integer,                                -- boş = süresiz
    started_at         timestamptz  NOT NULL DEFAULT now(),
    submitted_at       timestamptz,
    duration_seconds   integer,
    correct_count      integer,
    wrong_count        integer,
    blank_count        integer,
    percent            numeric(5, 2),                          -- doğru / toplam * 100
    net                numeric(6, 2)                           -- doğru - yanlış / 4
);
CREATE INDEX ix_exams_user ON exams (user_id, status, submitted_at DESC);

-- ============ exam_questions ============
-- question_code / subject / topic sınav oluşturulurken, correct_answer ve is_correct gönderim anında kopyalanır.
CREATE TABLE exam_questions (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id         bigint       NOT NULL REFERENCES exams (id) ON DELETE CASCADE,
    question_id     bigint       NOT NULL REFERENCES questions (id),
    question_order  integer      NOT NULL,
    question_code   varchar(60)  NOT NULL,
    subject         varchar(80)  NOT NULL,
    topic           varchar(160),
    selected_answer varchar(1)   CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E')),
    correct_answer  varchar(1)   CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
    is_correct      boolean,                                   -- boş bırakılan için null
    UNIQUE (exam_id, question_order),
    UNIQUE (exam_id, question_id)
);
CREATE INDEX ix_exam_questions_question ON exam_questions (question_id);

-- ============ feedback ============
-- RATING = soru değerlendirmesi (kolay/orta/zor + yıldız), QUESTION_ISSUE = soru sorunu bildirimi, GENERAL = genel görüş.
CREATE TABLE feedback (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         bigint       NOT NULL REFERENCES users (id),
    question_id     bigint       REFERENCES questions (id),
    category        varchar(20)  NOT NULL CHECK (category IN ('RATING', 'QUESTION_ISSUE', 'GENERAL')),
    difficulty_vote varchar(10)  CHECK (difficulty_vote IN ('KOLAY', 'ORTA', 'ZOR')),
    rating          integer      CHECK (rating BETWEEN 1 AND 5),
    message         varchar(2000),
    resolved        boolean      NOT NULL DEFAULT false,
    resolved_at     timestamptz,
    resolved_by     bigint       REFERENCES users (id),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);
-- Kullanıcı başına soru başına tek değerlendirme (tekrar gönderilirse güncellenir)
CREATE UNIQUE INDEX ux_feedback_rating ON feedback (user_id, question_id) WHERE category = 'RATING';
CREATE INDEX ix_feedback_question ON feedback (question_id);
CREATE INDEX ix_feedback_list     ON feedback (resolved, category, created_at DESC);
