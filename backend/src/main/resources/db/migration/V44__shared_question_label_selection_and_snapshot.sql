-- Stable controlled IDs select real, active bank questions only. Drafts and
-- source-only note examples cannot enter practice through this predicate.
CREATE FUNCTION learning_catalog.matches_question_label(code text, request_text text)
RETURNS boolean LANGUAGE sql STABLE AS $function$
 WITH request AS (SELECT $2::jsonb AS value), selected AS (
   SELECT i.*,r.value AS request,
     (SELECT o FROM jsonb_array_elements(coalesce(r.value->'overrides','[]')) o
       WHERE o->>'item_key'=i.item_key LIMIT 1) AS override
   FROM learning_catalog.current_items i CROSS JOIN request r
   JOIN questions q ON q.code=$1
   WHERE i.item_key='question:'||$1 AND i.kind='QUESTION' AND i.student_visible
     AND q.active AND i.source_stamp=extract(epoch from q.updated_at)::text
 ), eligible AS (
   SELECT s.*,coalesce((SELECT jsonb_agg(a->>'categoryId')
     FROM jsonb_array_elements(coalesce(s.override->'labels',s.data->'automaticLabels')->'assignments') a
     WHERE coalesce((s.request->>'includeCandidates')::boolean,true)
       OR s.override->>'status'='APPROVE' OR a->>'scopeStatus'='CONFIRMED'),'[]') AS eligible_ids
   FROM selected s WHERE coalesce(s.override->>'status','PENDING')<>'REMOVE'
 ) SELECT coalesce(bool_or(
    CASE WHEN request->>'match'='ALL' THEN eligible_ids ?& ARRAY(SELECT jsonb_array_elements_text(request->'categoryIds'))
         ELSE eligible_ids ?| ARRAY(SELECT jsonb_array_elements_text(request->'categoryIds')) END
    AND (coalesce(request->>'exam','')='' OR coalesce(override->'exam_ids',to_jsonb(exam_ids)) ? (request->>'exam'))
    AND (coalesce(request->>'subjectId','')='' OR coalesce(override->'subject_ids',to_jsonb(subject_ids)) ? (request->>'subjectId'))
 ),false) FROM eligible
$function$;

-- Null means the historical event predates capture; never backfill old events
-- from today's labels. A present snapshot survives later catalog/review changes.
ALTER TABLE question_attempts ADD COLUMN learning_label_snapshot jsonb;
ALTER TABLE exam_questions ADD COLUMN learning_label_snapshot jsonb;
ALTER TABLE study_sessions ADD COLUMN catalog_filter jsonb;
