-- Eski hesaplar ve sistem yöneticisi için null; yeni öğrenci kayıtlarında API zorunlu tutar.
ALTER TABLE users ADD COLUMN phone varchar(16);
ALTER TABLE users ADD CONSTRAINT ck_users_phone_e164
    CHECK (phone IS NULL OR phone ~ '^[+][1-9][0-9]{7,14}$');
