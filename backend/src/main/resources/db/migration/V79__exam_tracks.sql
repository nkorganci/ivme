-- Sınav hedefleri (YKS, KPSS türleri) ve öğrencinin seçtiği sınav.
-- Menü ve ekranlar ortaktır; seçilen sınav hangi içeriğin gösterileceğini belirler.
-- ACTIVE: içerik hazır; PREPARING: seçilebilir, içerik hazırlanıyor; PLANNED: listede görünür, henüz seçilemez.
CREATE TABLE exam_tracks (
    id varchar(40) PRIMARY KEY,
    family varchar(16) NOT NULL CHECK (family IN ('YKS', 'KPSS')),
    name varchar(80) NOT NULL,
    audience varchar(200) NOT NULL,
    status varchar(16) NOT NULL CHECK (status IN ('ACTIVE', 'PREPARING', 'PLANNED')),
    sort_order int NOT NULL UNIQUE,
    summary varchar(200),
    note varchar(400),
    -- Oturum/test bölümleri. examId, yayımlanmış katalogdaki sınav kimliğidir (TYT, AYT...).
    sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array')
);

INSERT INTO exam_tracks(id, family, name, audience, status, sort_order, summary, note, sections) VALUES
('YKS', 'YKS', 'YKS (TYT · AYT)', 'Üniversiteye hazırlanan lise öğrencileri ve mezunlar', 'ACTIVE', 10,
 'TYT 120 soru · 165 dakika, AYT alanına göre 80 soru · 180 dakika', NULL,
 '[{"examId":"TYT","name":"TYT","detail":"120 soru · 165 dakika"},
   {"examId":"AYT","name":"AYT","detail":"Alanına göre 80 soru · 180 dakika"}]'),
('KPSS_ORTAOGRETIM', 'KPSS', 'KPSS Ortaöğretim', 'Lise mezunları', 'PREPARING', 20,
 'Genel Yetenek + Genel Kültür · 120 soru · 130 dakika',
 'Dersler, konu videoları ve sorular hazırlanıyor. Hazır olan içerik bu sınav seçiliyken aynı menülerde otomatik görünecek.',
 '[{"examId":"KPSS_OO_GY","name":"Genel Yetenek","detail":"60 soru","subjects":[{"name":"Türkçe","questions":30},{"name":"Matematik","questions":30}]},
   {"examId":"KPSS_OO_GK","name":"Genel Kültür","detail":"60 soru","subjects":[{"name":"Tarih","questions":27},{"name":"Coğrafya","questions":18},{"name":"Vatandaşlık","questions":9},{"name":"Güncel Bilgiler","questions":6}]}]'),
('KPSS_ONLISANS', 'KPSS', 'KPSS Ön Lisans', '2 yıllık üniversite (ön lisans) mezunları', 'PLANNED', 30,
 NULL, 'Henüz hazır değil. Şu an KPSS Ortaöğretim hazırlanıyor.', '[]'),
('KPSS_LISANS', 'KPSS', 'KPSS Lisans', '4 yıllık üniversite (lisans) mezunları', 'PLANNED', 40,
 NULL, 'Henüz hazır değil. Şu an KPSS Ortaöğretim hazırlanıyor.', '[]'),
('KPSS_A_GRUBU', 'KPSS', 'KPSS A Grubu', 'Uzman yardımcılığı, müfettiş yardımcılığı gibi kariyer meslekleri', 'PLANNED', 50,
 NULL, 'Henüz hazır değil. Şu an KPSS Ortaöğretim hazırlanıyor.', '[]'),
('KPSS_OABT', 'KPSS', 'KPSS Öğretmenlik / ÖABT', 'Öğretmen adayları; ilgili alan sınavına tabi branşlar', 'PLANNED', 60,
 NULL, 'Henüz hazır değil. Şu an KPSS Ortaöğretim hazırlanıyor.', '[]'),
('KPSS_DHBT', 'KPSS', 'KPSS DHBT', 'Din hizmetleri alanındaki bazı kadrolara başvuran adaylar', 'PLANNED', 70,
 NULL, 'Henüz hazır değil. Şu an KPSS Ortaöğretim hazırlanıyor.', '[]');

-- Kayıt yoksa ilk ACTIVE sınav (YKS) kullanılır; mevcut öğrenciler YKS'de kalır.
CREATE TABLE user_exam_tracks (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    track_id varchar(40) NOT NULL REFERENCES exam_tracks(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER audit_exam_track AFTER INSERT OR UPDATE OR DELETE ON user_exam_tracks
    FOR EACH ROW EXECUTE FUNCTION audit_user_record();
