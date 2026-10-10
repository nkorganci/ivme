# 08.04 — Öğrenci zaman çizelgesi

**Durum:** BITTI (kod, test DB ve masaüstü/mobil tarayıcı görünümü) · **Tarih:** 2026-10-09

Giriş ve açık çıkış `activity_events` tablosuna aynı oturum anahtarıyla yazılır. `GET /api/progress/timeline` öğrencinin yerel gün/hafta/ay tarihlerini kullanır; her gün için giriş sayısı, açıkça kapanmış oturum sayısı, bu oturumların duvar saati süresi ve gönderilmiş soru olaylarındaki yaklaşık aktif saniye döner. Oturum süresi giriş gününe yazılır. Tarayıcıyı kapatmak veya bağlantının kopması açık çıkış değildir; bu süre tahmin edilmez. Aktif süre yalnız kaydedilmiş soru olaylarından gelir; cevap gönderilmeden ayrılmak süre üretmez. Ham etkinlik olaylarının 90 günlük saklama kuralı sürer.

İlerlemem ekranında bu kaynaklar ayrı sütunlarda açıklanır. `ProgressPeriodTest` yerel gün, iki kullanıcı ayrımı, açık oturum, aktif saniye ve gerçek giriş/çıkış kaydını `ivme_test` üzerinde doğruladı. `AuthTest`, `ProgressAccessTest`, `ActivityRetentionTest` toplam 18 testle geçti; `active-time.test.mjs` 3/3 geçti. Ön yüz derlemesi ve izole Chrome zaman çizelgesi görünümü 1280/390 px genişlikte geçti; yatay taşma görülmedi.

**Ayrı açık işler:** [06.05](32_06_05_AKTIF_SURE.md) fiziksel telefon ve masaüstü odak/uyku ölçümü; 05.03 canlı DB geçişi. 08.04 `BITTI` yalnız burada doğrulanan zaman çizelgesi ve sürelerin ayrı sunumu kapsamındadır; fiziksel cihaz ölçümü yapılmış sayılmaz.
