-- Soru aktarımından sonra Dersler'in üç bölümü ve hesap bazlı geçmiş açılır.
UPDATE exam_tracks SET ready_features = ARRAY['curriculum','pdf-inventory','past-questions','study','statistics']
WHERE id = 'YURT_DISI_OGRETMEN';

ALTER TABLE exam_source_documents ADD COLUMN IF NOT EXISTS page_count int;
ALTER TABLE exam_source_documents ADD COLUMN IF NOT EXISTS expected_count int;
ALTER TABLE exam_source_documents ADD COLUMN IF NOT EXISTS missing_numbers int[] NOT NULL DEFAULT '{}';
ALTER TABLE exam_source_documents ADD COLUMN IF NOT EXISTS unanswered_numbers int[] NOT NULL DEFAULT '{}';
