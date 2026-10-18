-- İki soru koleksiyonu: CIKMIS = "AYT-TYT Çıkmış Sorular", OGM = "Soru Bankası" (tüm OGM kaynakları).
-- solution_image: çözümlü sorularda çözüm görselinin göreli yolu (resim klasörüne göre).
ALTER TABLE questions ADD COLUMN bank varchar(10) NOT NULL DEFAULT 'CIKMIS' CHECK (bank IN ('CIKMIS', 'OGM'));
ALTER TABLE questions ADD COLUMN solution_image varchar(300);

DROP INDEX ix_questions_filter;
CREATE INDEX ix_questions_filter ON questions (bank, active, exam_type, subject, topic);
