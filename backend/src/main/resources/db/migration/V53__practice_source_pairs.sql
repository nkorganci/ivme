-- Select the union of bank/exam pairs without creating a bank/exam cross product.
-- Keep current source stamps, human overrides and real active bank identities.
CREATE OR REPLACE FUNCTION learning_catalog.question_ids_for_labels(request_text text)
RETURNS TABLE(id bigint) LANGUAGE sql STABLE AS $function$
 WITH request AS (SELECT $1::jsonb AS value), overrides AS (
   SELECT o.* FROM request r CROSS JOIN LATERAL jsonb_to_recordset(coalesce(r.value->'overrides','[]'))
     AS o(item_key text,labels jsonb,status text,category_ids text[],subject_ids text[],exam_ids text[])
 ), selected AS (
   SELECT q.id,q.bank AS source_bank,q.topic AS legacy_topic,i.*,r.value AS request,o.status AS review_status,
     coalesce(o.labels,i.data->'automaticLabels') AS effective_labels,
     coalesce(o.subject_ids,i.subject_ids) AS effective_subjects,
     coalesce(o.exam_ids,i.exam_ids) AS effective_exams
   FROM learning_catalog.current_items i JOIN questions q ON q.code=i.question_code
   CROSS JOIN request r LEFT JOIN overrides o USING(item_key)
   WHERE i.kind='QUESTION' AND i.student_visible AND q.active
     AND (coalesce(r.value->>'bank','')='' OR q.bank=r.value->>'bank')
     AND i.source_stamp=extract(epoch from q.updated_at)::text AND coalesce(o.status,'PENDING')<>'REMOVE'
     AND (jsonb_array_length(r.value->'categoryIds')=0 OR coalesce(o.category_ids,i.category_ids) && ARRAY(SELECT jsonb_array_elements_text(r.value->'categoryIds')))
 ), eligible AS (
   SELECT s.*,(SELECT coalesce(jsonb_agg(a->>'categoryId'),'[]')
     FROM jsonb_array_elements(s.effective_labels->'assignments') a
     WHERE coalesce((s.request->>'includeCandidates')::boolean,true)
       OR s.review_status='APPROVE' OR a->>'scopeStatus'='CONFIRMED') AS eligible_ids
   FROM selected s
 ) SELECT e.id FROM eligible e WHERE
   CASE WHEN jsonb_array_length(e.request->'categoryIds')=0 THEN true WHEN e.request->>'match'='ALL' THEN e.eligible_ids ?& ARRAY(SELECT jsonb_array_elements_text(e.request->'categoryIds'))
        ELSE e.eligible_ids ?| ARRAY(SELECT jsonb_array_elements_text(e.request->'categoryIds')) END
   AND (coalesce(jsonb_array_length(e.request->'sources'),0)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(e.request->'sources') source(value) WHERE split_part(source.value,'_',1)=e.source_bank AND split_part(source.value,'_',2)=ANY(e.effective_exams)))
   AND (coalesce(e.request->>'legacyTopic','')='' OR e.legacy_topic=e.request->>'legacyTopic')
   AND (coalesce(e.request->>'exam','')='' OR e.request->>'exam'=ANY(e.effective_exams))
   AND (coalesce(e.request->>'subjectId','')='' OR e.request->>'subjectId'=ANY(e.effective_subjects))
   AND (coalesce(e.request->>'questionTypeId','')='' OR EXISTS(
     SELECT 1 FROM learning_catalog.current_question_taxonomy t WHERE t.question_id=e.id
       AND t.kind='QUESTION_TYPE' AND t.category_id=e.request->>'questionTypeId'))
   AND (coalesce(e.request->>'teacherDifficulty','')='' OR e.review_status='APPROVE'
     AND e.effective_labels->>'difficulty'=e.request->>'teacherDifficulty')
$function$;
