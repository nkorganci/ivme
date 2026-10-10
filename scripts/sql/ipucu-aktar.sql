-- psql -X -w -v ON_ERROR_STOP=1 -v hint_payload=<JSON> -f this-file
-- The Python source gate has checked the real image, human label, note and editor review.
BEGIN;
SELECT set_config('ivme.hint_payload', :'hint_payload', true);
DO $import$
DECLARE
    payload jsonb := current_setting('ivme.hint_payload')::jsonb;
    question_row questions%ROWTYPE;
    old_row question_hints%ROWTYPE;
    expected_type_code text := payload #>> '{question,question_type_code}';
    expected_taxonomy_version text := payload #>> '{question,taxonomy_version}';
BEGIN
    IF payload #>> '{review,status}' <> 'approved'
       OR payload #>> '{review,answer_leak_checked}' <> 'true'
       OR length(trim(coalesce(payload #>> '{review,reviewer_id}', ''))) = 0 THEN
        RAISE EXCEPTION 'Editör onayı veya cevap sızıntısı denetimi eksik';
    END IF;
    SELECT * INTO question_row FROM questions
      WHERE code = payload #>> '{question,code}' AND active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Etkin soru kodu bulunamadı'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM question_taxonomy qt JOIN taxonomy_nodes n ON n.id = qt.node_id
        WHERE qt.question_id = question_row.id AND qt.approval_status = 'APPROVED'
          AND qt.source = 'HUMAN' AND qt.taxonomy_version = expected_taxonomy_version
          AND n.kind = 'QUESTION_TYPE' AND n.code = expected_type_code AND n.active
    ) THEN RAISE EXCEPTION 'Veritabanında eşleşen insan onaylı soru tipi yok'; END IF;

    SELECT * INTO old_row FROM question_hints WHERE question_id = question_row.id FOR UPDATE;
    IF FOUND THEN
        IF old_row.image_sha256 = payload #>> '{question,image_sha256}'
           AND old_row.taxonomy_version = expected_taxonomy_version
           AND old_row.question_type_code = expected_type_code
           AND old_row.note_id = payload #>> '{note,note_id}'
           AND old_row.note_review_version = (payload #>> '{note,review_version}')::integer
           AND old_row.catalog_id = (payload #>> '{note,catalog_id}')::integer
           AND old_row.pdf_sha256 = payload #>> '{note,pdf_sha256}'
           AND old_row.source_page = (payload #>> '{note,page}')::integer
           AND old_row.pre_answer_hint = payload #>> '{content,pre_answer_hint}'
           AND old_row.post_submission_explanation = payload #>> '{content,post_submission_explanation}'
           AND old_row.review_status = 'APPROVED'
           AND old_row.reviewer_id = payload #>> '{review,reviewer_id}'
           AND old_row.reviewed_at = (payload #>> '{review,reviewed_at_utc}')::timestamptz
           AND old_row.answer_leak_checked
           AND old_row.review_version = (payload #>> '{review,version}')::integer THEN
            RETURN;
        END IF;
        RAISE EXCEPTION 'Soru için farklı ipucu var; sürümlü düzeltme ayrı inceleme ister';
    END IF;

    INSERT INTO question_hints(question_id, image_sha256, taxonomy_version, question_type_code,
        note_id, note_review_version, catalog_id, pdf_sha256, source_page,
        pre_answer_hint, post_submission_explanation, review_status, reviewer_id,
        reviewed_at, answer_leak_checked, review_version)
    VALUES (question_row.id, payload #>> '{question,image_sha256}', expected_taxonomy_version, expected_type_code,
        payload #>> '{note,note_id}', (payload #>> '{note,review_version}')::integer,
        (payload #>> '{note,catalog_id}')::integer, payload #>> '{note,pdf_sha256}',
        (payload #>> '{note,page}')::integer, payload #>> '{content,pre_answer_hint}',
        payload #>> '{content,post_submission_explanation}', 'APPROVED',
        payload #>> '{review,reviewer_id}',
        (payload #>> '{review,reviewed_at_utc}')::timestamptz, true,
        (payload #>> '{review,version}')::integer);
END
$import$;
COMMIT;
