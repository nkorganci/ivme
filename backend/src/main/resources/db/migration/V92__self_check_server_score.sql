-- TAS-04: konu notu mini alıştırması sunucuda puanlanır ve cevap anındaki konu bağıyla saklanır.
-- Mevcut satırlar değiştirilmez; eski kayıtta bu alanlar boş kalır (yeniden puanlama/konu doldurma yok).
ALTER TABLE student_self_check_attempts
    ADD COLUMN correct boolean,
    ADD COLUMN solution_seen boolean,
    ADD COLUMN key_version varchar(40),
    ADD COLUMN category_snapshot jsonb CHECK (category_snapshot IS NULL OR jsonb_typeof(category_snapshot) = 'array');
