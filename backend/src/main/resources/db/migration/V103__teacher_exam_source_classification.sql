-- Yerel, tekrar çalıştırılabilir kaynak sınıflandırması; soru/öğrenci geçmişi korunur.
ALTER TABLE exam_tracks DROP CONSTRAINT IF EXISTS exam_tracks_family_check;
ALTER TABLE exam_tracks ADD CONSTRAINT exam_tracks_family_check
  CHECK (family IN ('YKS','KPSS','YURT_DISI','OGRETMENLIK'));
UPDATE exam_tracks SET family='OGRETMENLIK', name='Öğretmen ÖABT',
  note='Öğretmenlik alan sınavları KPSS kaynaklarından ayrıldı. 2013–2024 tarihsel KPSS ÖABT, 2025 sonrası MEB-AGS ÖABT; kaynak envanteri mevcut, soru bankası hazırlanmadı.'
WHERE id='KPSS_OABT';
-- KPSS_OABT teknik kimliği mevcut yabancı anahtarları ve hesap tercihlerini korur.
INSERT INTO exam_tracks(id,family,name,audience,status,sort_order,note,sections)
VALUES ('OGRETMEN_AGS','OGRETMENLIK','Öğretmen AGS','Millî Eğitim Akademisine hazırlanan öğretmen adayları',
 'PLANNED',61,'2025 ve 2026 AGS kaynakları; eski Eğitim Bilimleri belgeleri tarihsel kaynak olarak ayrı tutulur. Kaynak envanteri mevcut, soru bankası hazırlanmadı.','[]')
ON CONFLICT(id) DO NOTHING;
CREATE SCHEMA IF NOT EXISTS source_research;
CREATE TABLE IF NOT EXISTS source_research.teacher_documents (
 relative_path text PRIMARY KEY,
 track_id varchar(40) NOT NULL REFERENCES exam_tracks(id),
 exam_year integer NOT NULL,
 branch text NOT NULL,
 sha256 char(64) NOT NULL,
 source_url text NOT NULL,
 source_page text NOT NULL,
 publication_scope text NOT NULL,
 page_count integer NOT NULL,
 answer_key_detected boolean NOT NULL,
 metadata jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS source_research.teacher_source_moves (
 original_path text PRIMARY KEY,
 current_path text NOT NULL,
 sha256 char(64) NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS source_research.teacher_expected_documents (
 source_url text PRIMARY KEY,
 exam_year integer NOT NULL,
 track_id varchar(40) NOT NULL REFERENCES exam_tracks(id),
 branch text NOT NULL,
 source_page text NOT NULL,
 retrieval_status text NOT NULL,
 local_paths jsonb NOT NULL,
 error text,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
