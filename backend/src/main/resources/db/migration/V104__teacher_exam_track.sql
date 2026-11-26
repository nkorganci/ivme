-- Birleşik öğretmenlik seçeneği KPSS seçimi altında görünür; eski track anahtarı korunur.
ALTER TABLE questions DROP CONSTRAINT questions_exam_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_exam_type_check CHECK (exam_type IN (
  'TYT','AYT','KPSS_OO_GY','KPSS_OO_GK','KPSS_LS_GY','KPSS_LS_GK','YURT_DISI_MY',
  'OGRETMEN_AGS','OGRETMEN_EB','OGRETMEN_OABT'));

ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_filter_exam_type_check;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_filter_exam_type_check
  CHECK (filter_exam_type IS NULL OR filter_exam_type IN (
    'TYT','AYT','KPSS_OO_GY','KPSS_OO_GK','KPSS_LS_GY','KPSS_LS_GK','YURT_DISI_MY',
    'OGRETMEN_AGS','OGRETMEN_EB','OGRETMEN_OABT'));

ALTER TABLE exam_archive_positions DROP CONSTRAINT exam_archive_positions_exam_type_check;
ALTER TABLE exam_archive_positions ADD CONSTRAINT exam_archive_positions_exam_type_check CHECK (exam_type IN (
  'TYT','AYT','KPSS_OO_GY','KPSS_OO_GK','KPSS_LS_GY','KPSS_LS_GK','YURT_DISI_MY',
  'OGRETMEN_AGS','OGRETMEN_EB','OGRETMEN_OABT'));

UPDATE user_exam_tracks SET track_id='KPSS_OABT' WHERE track_id='OGRETMEN_AGS';
UPDATE exam_tracks SET family='KPSS', name='Öğretmenlik Sınavı', status='PREPARING', sort_order=60,
  audience='AGS, tarihsel Eğitim Bilimleri ve öğretmenlik alan sınavlarına hazırlanan adaylar',
  summary='AGS · Eğitim Bilimleri · ÖABT branşları',
  note='Yalnız öğretmenlik sınavlarına ait Eğitim Bilimleri, MEB-AGS ve ÖABT içerikleri gösterilir. Kaynaklar izin ve içerik incelemesi tamamlandıkça eklenir.',
  sections='[
    {"examId":"OGRETMEN_EB","name":"Tarihsel Eğitim Bilimleri","detail":"2006–2024","minutes":75,"subjects":[]},
    {"examId":"OGRETMEN_AGS","name":"MEB-AGS","detail":"2025 ve sonrası","minutes":110,"subjects":[]},
    {"examId":"OGRETMEN_OABT","name":"ÖABT · Branş sınavları","detail":"Yıl ve öğretmenlik branşına göre","minutes":120,"subjects":[]}
  ]'::jsonb,
  ready_features=ARRAY['past-questions','question-bank','study','pdf-inventory']
WHERE id='KPSS_OABT';

UPDATE exam_tracks SET status='PLANNED', note='Birleşik Öğretmenlik Sınavı seçeneğine taşındı.'
WHERE id='OGRETMEN_AGS';
