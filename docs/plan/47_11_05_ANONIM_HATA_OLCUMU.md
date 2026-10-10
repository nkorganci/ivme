# 11.05 — Anonim temel hizmet hata ölçümü

**Durum:** BITTI (yalıtılmış test DB ve masaüstü/telefon tarayıcı provası) · **Tarih:** 2026-10-09

Flyway V17 `service_error_events` tablosu yalnız `id`, sabit `UNEXPECTED_API` türü ve sunucu zamanı tutar. Kullanıcı/soru kimliği, yol, IP, mesaj ve istisna metni yazılmaz. Genel hata yakalayıcısı beklenmeyen API istisnasında bir olay ekler; 4xx doğrulama/yetki hataları eklenmez. Sayacın DB yazımı başarısızsa asıl 500 yanıtı korunur. Başlangıç, tünel, ağ veya veritabanı tamamen erişilemezken oluşan hatalar bu sayaçta güvenilir biçimde ölçülmez.

Yönetici gün/hafta/ay kartı, 11.02 gizlilik kuralıyla beşlik aralıkta yalnız yakalanan beklenmeyen API hata sayısını gösterir; dönem etkin öğrenci sayısı beşten azsa sayı gizlenir. Ham olaylar her gün ve uygulama açılışında 90 günden eskiyse silinir. `ServiceErrorMetricsTest` 500/400 ayrımı, genel yanıtın bilgi sızdırmaması, tablo sütunları ve saklama sınırını doğruladı. `AdminUsageTest`, `RoleBoundaryTest`, `ActivityRetentionTest`, ön yüz derlemesi ve 1280/390 px Chrome kontrolü geçti. Canlı DB V17 geçişi 05.03 kapsamındadır.
