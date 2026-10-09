# 08.04 — Öğrenci zaman çizelgesi

**Durum:** YAPILACAK (kod ve test DB doğrulandı; 06.05 gerçek cihaz kabulü açık) · **Tarih:** 2026-10-09

Giriş ve açık çıkış `activity_events` tablosuna aynı oturum anahtarıyla yazılır. `GET /api/progress/timeline` öğrencinin yerel gün/hafta/ay tarihlerini kullanır; her gün için giriş sayısı, açıkça kapanmış oturum sayısı, bu oturumların duvar saati süresi ve gönderilmiş soru olaylarındaki yaklaşık aktif saniye döner. Oturum süresi giriş gününe yazılır. Tarayıcıyı kapatmak veya bağlantının kopması açık çıkış değildir; bu süre tahmin edilmez. Aktif süre yalnız kaydedilmiş soru olaylarından gelir; cevap gönderilmeden ayrılmak süre üretmez. Ham etkinlik olaylarının 90 günlük saklama kuralı sürer.

İlerlemem ekranında bu kaynaklar ayrı sütunlarda açıklanır. `ProgressPeriodTest` yerel gün, iki kullanıcı ayrımı, açık oturum, aktif saniye ve gerçek giriş/çıkış kaydını `ivme_test` üzerinde doğruladı. `AuthTest`, `ProgressAccessTest`, `ActivityRetentionTest` ve ön yüz derlemesi geçti.

**Kalan kabul:** [06.05](32_06_05_AKTIF_SURE.md) kapsamındaki fiziksel telefon ve masaüstü odak/uyku ölçümü yapılmalı. Bu sonuçlar olmadan aktif süre doğruluğu ve 08.04 tam kabulü yazılmaz. Canlı geçiş ayrıca 05.03 kapsamındadır.
