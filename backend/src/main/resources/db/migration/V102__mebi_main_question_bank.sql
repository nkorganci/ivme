-- Bank reclassification only: preserve question IDs, content, timestamps,
-- student history, source URLs, relation keys and all old catalog snapshots.
CREATE TABLE IF NOT EXISTS learning_catalog.question_bank_transfers (
  migration_key text PRIMARY KEY,
  previous_run_key text NOT NULL,
  new_run_key text NOT NULL,
  source_bank text NOT NULL,
  target_bank text NOT NULL,
  question_ids bigint[] NOT NULL,
  question_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $transfer$
DECLARE
  previous_run text;
  next_run text;
  moved_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(738452019);
  LOCK TABLE public.questions IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*) INTO moved_count FROM public.questions WHERE bank='MEBI_PRACTICE_2';
  IF moved_count=0 THEN RETURN; END IF;
  SELECT run_key INTO previous_run FROM learning_catalog.current_run WHERE singleton FOR UPDATE;
  IF previous_run IS NULL THEN RAISE EXCEPTION 'Published source catalog required for main-bank transfer'; END IF;
  IF EXISTS (SELECT 1 FROM questions q LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code
    WHERE q.bank='MEBI_PRACTICE_2' AND (i.item_key IS NULL OR NOT i.student_visible
      OR i.data->>'bank' IS DISTINCT FROM 'MEBI_PRACTICE_2'
      OR i.source_stamp IS DISTINCT FROM extract(epoch from q.updated_at)::text
      OR cardinality(i.category_ids)=0 OR cardinality(i.subject_ids)=0 OR cardinality(i.exam_ids)=0))
  THEN RAISE EXCEPTION 'Existing source question/catalog binding incomplete'; END IF;
  IF EXISTS (SELECT 1 FROM learning_catalog.current_items i JOIN questions q ON q.code=i.question_code
    CROSS JOIN LATERAL unnest(i.category_ids) a(id)
    LEFT JOIN learning_catalog.current_categories c ON c.category_id=a.id
    WHERE q.bank='MEBI_PRACTICE_2' AND (c.category_id IS NULL
      OR NOT coalesce((c.definition->>'selectable')::boolean,false)
      OR NOT (c.definition->>'exam'=ANY(i.exam_ids))
      OR NOT (c.definition->>'subjectId'=ANY(i.subject_ids))))
  THEN RAISE EXCEPTION 'Main course/unit/topic definitions differ'; END IF;

  CREATE TEMP TABLE main_bank_transfer_questions ON COMMIT DROP AS
    SELECT id,code,to_jsonb(q)-'bank' AS preserved_content FROM questions q WHERE bank='MEBI_PRACTICE_2';
  next_run := 'labels-v1-'||md5(previous_run||':mebi-main-bank-v1');
  INSERT INTO learning_catalog.runs(run_key,method,summary)
    SELECT next_run,'MEBI_EXISTING_QUESTIONS_MAIN_BANK_TRANSFER',
      summary||jsonb_build_object('runKey',next_run,'previousRunKey',previous_run,
        'mainBankTransfer',jsonb_build_object('sourceBank','MEBI_PRACTICE_2','targetBank','OGM',
          'questionsMoved',moved_count,'newQuestionInsertions',0,'studentWrites',0))
    FROM learning_catalog.runs WHERE run_key=previous_run;
  INSERT INTO learning_catalog.categories SELECT next_run,category_id,definition
    FROM learning_catalog.categories WHERE run_key=previous_run;
  INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
    SELECT next_run,i.item_key,i.kind,i.exam,i.subject_id,i.student_visible,
      CASE WHEN t.id IS NOT NULL THEN jsonb_set(i.data,'{bank}','"OGM"'::jsonb) ELSE i.data END,
      i.category_ids,i.subject_ids,i.exam_ids
    FROM learning_catalog.items i LEFT JOIN main_bank_transfer_questions t ON t.code=i.question_code
    WHERE i.run_key=previous_run;
  INSERT INTO learning_catalog.assignments SELECT next_run,item_key,category_id,relation
    FROM learning_catalog.assignments WHERE run_key=previous_run;

  UPDATE questions q SET bank='OGM' FROM main_bank_transfer_questions t WHERE q.id=t.id;
  IF EXISTS (SELECT 1 FROM main_bank_transfer_questions t JOIN questions q USING(id)
    WHERE (to_jsonb(q)-'bank') IS DISTINCT FROM t.preserved_content OR q.bank<>'OGM')
  THEN RAISE EXCEPTION 'Question identity/content/history stamp changed'; END IF;
  UPDATE learning_catalog.current_run SET run_key=next_run WHERE singleton AND run_key=previous_run;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current catalog changed'; END IF;
  INSERT INTO learning_catalog.question_bank_transfers
    (migration_key,previous_run_key,new_run_key,source_bank,target_bank,question_ids,question_count)
    SELECT 'mebi-main-bank-v1',previous_run,next_run,'MEBI_PRACTICE_2','OGM',array_agg(id ORDER BY id),moved_count
    FROM main_bank_transfer_questions;
END $transfer$;

-- Historical filters/session enums remain readable, but new isolated-bank
-- question insertions cannot accidentally restart the retired import chain.
ALTER TABLE questions DROP CONSTRAINT questions_bank_check;
ALTER TABLE questions ADD CONSTRAINT questions_bank_check CHECK (bank IN ('CIKMIS','OGM'));

-- Saved legacy source tokens resolve to the main bank too.
DO $aliases$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('learning_catalog.question_ids_for_labels(text)'::regprocedure) INTO definition;
  EXECUTE replace(definition,
    'THEN ''MEBI_PRACTICE_2'' ELSE split_part(source.value,''_'',1)',
    'THEN ''OGM'' ELSE split_part(source.value,''_'',1)');
END $aliases$;
