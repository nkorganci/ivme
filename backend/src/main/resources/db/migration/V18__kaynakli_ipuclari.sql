-- Kaynaklı ipuçları yalnız içerik denetiminden sonra APPROVED yapılır.
-- AI geçici etiketleri bu tabloya onaylı içerik olarak yazılmaz.
CREATE TABLE question_hints (
    question_id bigint PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    image_sha256 char(64) NOT NULL CHECK (image_sha256 ~ '^[a-f0-9]{64}$'),
    taxonomy_version varchar(40) NOT NULL,
    question_type_code varchar(80) NOT NULL,
    note_id varchar(50) NOT NULL,
    note_review_version integer NOT NULL CHECK (note_review_version > 0),
    catalog_id integer NOT NULL CHECK (catalog_id > 0),
    pdf_sha256 char(64) NOT NULL CHECK (pdf_sha256 ~ '^[a-f0-9]{64}$'),
    source_page integer NOT NULL CHECK (source_page > 0),
    pre_answer_hint varchar(500),
    post_submission_explanation varchar(1000),
    review_status varchar(12) NOT NULL DEFAULT 'DRAFT'
        CHECK (review_status IN ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED')),
    reviewer_id varchar(80),
    reviewed_at timestamptz,
    answer_leak_checked boolean NOT NULL DEFAULT false,
    review_version integer NOT NULL DEFAULT 1 CHECK (review_version > 0),
    CONSTRAINT ck_question_hints_approved CHECK (
        review_status <> 'APPROVED' OR
        (length(trim(coalesce(pre_answer_hint, ''))) > 0
         AND length(trim(coalesce(post_submission_explanation, ''))) > 0
         AND length(trim(coalesce(reviewer_id, ''))) > 0
         AND reviewed_at IS NOT NULL AND answer_leak_checked)
    )
);
