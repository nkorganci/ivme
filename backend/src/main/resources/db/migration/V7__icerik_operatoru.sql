-- Ürün yöneticisi toplu istatistik, içerik operatörü soru/bildirim bakımı görür.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN', 'OPERATOR'));
