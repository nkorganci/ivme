-- Keep the established query and all its topic/teacher/source guards intact.
-- MEBI2_AYT/TYT is the source token for bank MEBI_PRACTICE_2.
DO $migration$
DECLARE definition text;
DECLARE original text := 'split_part(source.value,''_'',1)=e.source_bank';
BEGIN
  SELECT pg_get_functiondef('learning_catalog.question_ids_for_labels(text)'::regprocedure)
    INTO definition;
  IF position(original in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected source selection function; review MEBI source migration';
  END IF;
  EXECUTE replace(definition, original,
    '(CASE WHEN split_part(source.value,''_'',1)=''MEBI2'' THEN ''MEBI_PRACTICE_2'' ELSE split_part(source.value,''_'',1) END)=e.source_bank');
END $migration$;
