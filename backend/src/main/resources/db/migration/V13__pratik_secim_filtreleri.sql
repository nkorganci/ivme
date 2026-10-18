-- Pratik soru seçiminin nasıl kurulduğunu soru sırasından ayrı olarak koru.
ALTER TABLE study_sessions ADD COLUMN filter_bank varchar(10)
    CHECK (filter_bank IN ('CIKMIS', 'OGM'));
ALTER TABLE study_sessions ADD COLUMN filter_exam_type varchar(10)
    CHECK (filter_exam_type IN ('TYT', 'AYT'));
ALTER TABLE study_sessions ADD COLUMN filter_subject varchar(80);
ALTER TABLE study_sessions ADD COLUMN filter_topic varchar(160);
