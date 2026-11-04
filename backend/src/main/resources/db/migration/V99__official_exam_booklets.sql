-- Aynı yıldaki farklı tarih, oturum ve A/B kitapçıkları bağımsız arşivlerdir.
CREATE TABLE official_exam_booklets (
    id varchar(60) PRIMARY KEY,
    track_id varchar(40) NOT NULL REFERENCES exam_tracks(id),
    exam_type varchar(20) NOT NULL,
    exam_year int NOT NULL,
    label text NOT NULL,
    source_path text NOT NULL,
    source_sha256 char(64) NOT NULL,
    expected_count int NOT NULL CHECK(expected_count>0),
    time_limit_minutes int NOT NULL CHECK(time_limit_minutes>0),
    cancelled_numbers int[] NOT NULL DEFAULT '{}'
);
CREATE TABLE official_exam_booklet_questions (
    booklet_id varchar(60) NOT NULL REFERENCES official_exam_booklets(id),
    question_code varchar(60) NOT NULL REFERENCES questions(code),
    position int NOT NULL CHECK(position>0),
    PRIMARY KEY(booklet_id,position),
    UNIQUE(booklet_id,question_code)
);
UPDATE exam_tracks SET sections='[{"examId":"YURT_DISI_MY","name":"Mesleki Yeterlilik","detail":"60 soru · 75 dakika","minutes":75,
"subjects":[{"name":"Türkçe ve Türk Kültürü","questions":18},{"name":"Tarih ve Coğrafya","questions":18},
{"name":"Eğitim Bilimleri","questions":12},{"name":"Mevzuat ve Genel Kültür","questions":12}]}]'::jsonb
WHERE id='YURT_DISI_OGRETMEN';
