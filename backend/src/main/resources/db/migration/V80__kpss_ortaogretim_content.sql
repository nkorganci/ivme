-- KPSS Ortaöğretim içeriği: sınav türleri, kaynak çiftleri ve sınav hedefinin yayına alınması.
-- KPSS'nin iki testi TYT/AYT gibi ayrı sınav türü kimliği taşır: KPSS_OO_GY (Genel Yetenek), KPSS_OO_GK (Genel Kültür).
ALTER TABLE questions DROP CONSTRAINT questions_exam_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_exam_type_check
    CHECK (exam_type IN ('TYT', 'AYT', 'KPSS_OO_GY', 'KPSS_OO_GK'));
ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_filter_exam_type_check;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_filter_exam_type_check
    CHECK (filter_exam_type IN ('TYT', 'AYT', 'KPSS_OO_GY', 'KPSS_OO_GK'));
ALTER TABLE exam_archive_positions ALTER COLUMN exam_type TYPE varchar(10);
ALTER TABLE exam_archive_positions DROP CONSTRAINT exam_archive_positions_exam_type_check;
ALTER TABLE exam_archive_positions ADD CONSTRAINT exam_archive_positions_exam_type_check
    CHECK (exam_type IN ('TYT', 'AYT', 'KPSS_OO_GY', 'KPSS_OO_GK'));

-- Hangi ekranların bu sınav için hazır olduğu; ACTIVE sınavda boş liste "hepsi hazır" demektir.
ALTER TABLE exam_tracks ADD COLUMN ready_features text[] NOT NULL DEFAULT '{}';
UPDATE exam_tracks SET status = 'ACTIVE',
    summary = 'Genel Yetenek + Genel Kültür · 120 soru · 130 dakika',
    note = '2006–2024 arasındaki 10 sınavın çıkmış soruları ders, ünite ve konuya göre sınıflandırıldı. Konu videoları ve soru bankası sonra eklenecek.',
    ready_features = ARRAY['home', 'curriculum', 'study', 'past-questions', 'statistics', 'tracking']
  WHERE id = 'KPSS_ORTAOGRETIM';
UPDATE exam_tracks SET note = 'Henüz hazır değil. Şu an yalnız KPSS Ortaöğretim hazır.' WHERE status = 'PLANNED';

-- Her deneme ve çalışma oturumu oluşturulduğu sınava aittir; geçmiş ve özetler bu kimlikle ayrılır.
ALTER TABLE exams ADD COLUMN track_id varchar(40) NOT NULL DEFAULT 'YKS' REFERENCES exam_tracks(id);
ALTER TABLE study_sessions ADD COLUMN track_id varchar(40) NOT NULL DEFAULT 'YKS' REFERENCES exam_tracks(id);
CREATE INDEX ix_exams_user_track ON exams (user_id, track_id, status, submitted_at DESC);
CREATE INDEX ix_study_sessions_user_track ON study_sessions (user_id, track_id, mode, started_at DESC);

-- Kaynak adı "BANKA_SINAV" biçimindedir; sınav kimliği alt çizgi içerebilir (KPSS_OO_GY), bu yüzden yalnız ilk alt çizgiden bölünür.
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
   CASE WHEN jsonb_array_length(e.request->'categoryIds')=0 THEN true WHEN e.request->>'match'='ALL' AND coalesce(jsonb_array_length(e.request->'categoryGroups'),0)>0 THEN NOT EXISTS (SELECT 1 FROM jsonb_array_elements(e.request->'categoryGroups') g WHERE NOT (e.eligible_ids ?| ARRAY(SELECT jsonb_array_elements_text(g)))) WHEN e.request->>'match'='ALL' THEN e.eligible_ids ?& ARRAY(SELECT jsonb_array_elements_text(e.request->'categoryIds'))
        ELSE e.eligible_ids ?| ARRAY(SELECT jsonb_array_elements_text(e.request->'categoryIds')) END
   AND (coalesce(jsonb_array_length(e.request->'sources'),0)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(e.request->'sources') source(value) WHERE split_part(source.value,'_',1)=e.source_bank AND substr(source.value,position('_' in source.value)+1)=ANY(e.effective_exams)))
   AND (coalesce(e.request->>'legacyTopic','')='' OR e.legacy_topic=e.request->>'legacyTopic')
   AND (coalesce(e.request->>'exam','')='' OR e.request->>'exam'=ANY(e.effective_exams))
   AND (coalesce(e.request->>'subjectId','')='' OR e.request->>'subjectId'=ANY(e.effective_subjects))
   AND (coalesce(e.request->>'questionTypeId','')='' OR EXISTS(
     SELECT 1 FROM learning_catalog.current_question_taxonomy t WHERE t.question_id=e.id
       AND t.kind='QUESTION_TYPE' AND t.category_id=e.request->>'questionTypeId'))
   AND (coalesce(e.request->>'teacherDifficulty','')='' OR e.review_status='APPROVE'
     AND e.effective_labels->>'difficulty'=e.request->>'teacherDifficulty')
$function$;
