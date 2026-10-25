-- KPSS Lisans içeriği: GY ve GK sınav türleri ve sınav hedefinin yayına alınması.
-- Testler Ortaöğretim gibi ayrı sınav türü kimliği taşır: KPSS_LS_GY (Genel Yetenek), KPSS_LS_GK (Genel Kültür).
ALTER TABLE questions DROP CONSTRAINT questions_exam_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_exam_type_check
    CHECK (exam_type IN ('TYT', 'AYT', 'KPSS_OO_GY', 'KPSS_OO_GK', 'KPSS_LS_GY', 'KPSS_LS_GK'));
ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_filter_exam_type_check;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_filter_exam_type_check
    CHECK (filter_exam_type IN ('TYT', 'AYT', 'KPSS_OO_GY', 'KPSS_OO_GK', 'KPSS_LS_GY', 'KPSS_LS_GK'));
ALTER TABLE exam_archive_positions DROP CONSTRAINT exam_archive_positions_exam_type_check;
ALTER TABLE exam_archive_positions ADD CONSTRAINT exam_archive_positions_exam_type_check
    CHECK (exam_type IN ('TYT', 'AYT', 'KPSS_OO_GY', 'KPSS_OO_GK', 'KPSS_LS_GY', 'KPSS_LS_GK'));

-- ÖSYM 2026 KPSS Lisans kılavuzu Tablo-1: GY sözel %50 / sayısal %50; GK Tarih %45, Coğrafya %30, Vatandaşlık %15, Güncel %10.
-- 120 soru 130 dakika; GY ve GK ayrı denemelerde 65'er dakika.
UPDATE exam_tracks SET status = 'ACTIVE',
    summary = 'Genel Yetenek + Genel Kültür · 120 soru · 130 dakika',
    note = '2006–2022 arasındaki 17 sınavın tüm soruları ve 2023–2026 ÖSYM örnek soruları ders, ünite ve konuya göre sınıflandırıldı. '
        || '2016 soruları cevap anahtarı bulunana kadar yayımlanmaz. Konu videoları ve soru bankası sonra eklenecek.',
    ready_features = ARRAY['home', 'curriculum', 'study', 'past-questions', 'statistics', 'tracking'],
    sections = '[{"name": "Genel Yetenek", "detail": "60 soru · 65 dakika", "examId": "KPSS_LS_GY", "minutes": 65,
                  "subjects": [{"name": "Türkçe", "questions": 30}, {"name": "Matematik", "questions": 30}]},
                 {"name": "Genel Kültür", "detail": "60 soru · 65 dakika", "examId": "KPSS_LS_GK", "minutes": 65,
                  "subjects": [{"name": "Tarih", "questions": 27}, {"name": "Coğrafya", "questions": 18},
                               {"name": "Vatandaşlık", "questions": 9}, {"name": "Güncel Bilgiler", "questions": 6}]}]'::jsonb
  WHERE id = 'KPSS_LISANS';
UPDATE exam_tracks SET note = 'Henüz hazır değil. Şu an KPSS Ortaöğretim ve KPSS Lisans hazır.' WHERE status = 'PLANNED';
