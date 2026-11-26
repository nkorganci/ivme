-- Öğretmenlik sınavı seçeneği yalnız öğretmenliğe ait içerikleri listeler.
UPDATE exam_tracks SET
  note='Yalnız öğretmenlik sınavlarına ait Eğitim Bilimleri, MEB-AGS ve ÖABT içerikleri gösterilir. Kaynaklar izin ve içerik incelemesi tamamlandıkça eklenir.',
  sections='[
    {"examId":"OGRETMEN_EB","name":"Tarihsel Eğitim Bilimleri","detail":"2006–2024","minutes":75,"subjects":[]},
    {"examId":"OGRETMEN_AGS","name":"MEB-AGS","detail":"2025 ve sonrası","minutes":110,"subjects":[]},
    {"examId":"OGRETMEN_OABT","name":"ÖABT · Branş sınavları","detail":"Yıl ve öğretmenlik branşına göre","minutes":120,"subjects":[]}
  ]'::jsonb,
  ready_features=ARRAY['past-questions','question-bank','study','pdf-inventory']
WHERE id='KPSS_OABT';
