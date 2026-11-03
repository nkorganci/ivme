-- Yurt dışı öğretmenlik sınavını ortak soru/pratik akışına ekle.
ALTER TABLE questions ALTER COLUMN exam_type TYPE varchar(20);
ALTER TABLE questions DROP CONSTRAINT questions_exam_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_exam_type_check
    CHECK (exam_type IN ('TYT','AYT','KPSS_OO_GY','KPSS_OO_GK','KPSS_LS_GY','KPSS_LS_GK','YURT_DISI_MY'));
ALTER TABLE study_sessions ALTER COLUMN filter_exam_type TYPE varchar(20);
ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_filter_exam_type_check;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_filter_exam_type_check
    CHECK (filter_exam_type IS NULL OR filter_exam_type IN ('TYT','AYT','KPSS_OO_GY','KPSS_OO_GK','KPSS_LS_GY','KPSS_LS_GK','YURT_DISI_MY'));
ALTER TABLE exam_archive_positions ALTER COLUMN exam_type TYPE varchar(20);
ALTER TABLE exam_archive_positions DROP CONSTRAINT exam_archive_positions_exam_type_check;
ALTER TABLE exam_archive_positions ADD CONSTRAINT exam_archive_positions_exam_type_check
    CHECK (exam_type IN ('TYT','AYT','KPSS_OO_GY','KPSS_OO_GK','KPSS_LS_GY','KPSS_LS_GK','YURT_DISI_MY'));
ALTER TABLE exam_tracks DROP CONSTRAINT exam_tracks_family_check;
ALTER TABLE exam_tracks ADD CONSTRAINT exam_tracks_family_check CHECK (family IN ('YKS','KPSS','YURT_DISI'));

INSERT INTO exam_tracks(id,family,name,audience,status,sort_order,summary,note,sections,ready_features)
VALUES ('YURT_DISI_OGRETMEN','YURT_DISI','Yurt Dışı Öğretmenlik','Yurt dışında görevlendirilecek öğretmen adayları',
 'ACTIVE',80,'Mesleki Yeterlilik Yazılı Sınavı · 60 soru · 75 dakika',
 'Çıkmış sorular soru bankası ve pratikte kullanılabilir.',
 '[{"examId":"YURT_DISI_MY","name":"Mesleki Yeterlilik","detail":"60 soru · 75 dakika","minutes":75,"subjects":[]}]',
 ARRAY['past-questions','study'])
ON CONFLICT (id) DO NOTHING;
