# 07.08 — Doğrulanmış konu PDF'sinden soru kurucusuna geçiş

**Durum:** BITTI (ilk doğrulanmış kaynak dilimi) · **Tarih:** 2026-10-09

## Kanıt ve kapsam

Katalog `1099`, TYT Türkçe “Noktalama İşaretleri” özgün konu PDF'sinin SHA-256 özeti `f316e8d16b41e3f1041d3009e0b8dcf2ad87a078e320ad6cb87177981321dbf4` ile eşleşiyor. PDF'nin ilk sayfası görsel olarak incelendi; nokta, virgül, noktalı virgül, iki nokta, soru, ünlem ve diğer noktalama kurallarını anlatıyor. “3 Adım Soru Bankası - TYT Türkçe” PDF'sinin SHA-256 özeti `ab98a35e4819d2695482dcf5e98b2f11fd4b63022c0a24824c1011103f562fd1`; fiziksel 181. sayfasında aynı konu başlığı altında `3a-tyt-turkce-85-01`, `-02`, `-03` kartlarının metinleri ayrı ayrı bulundu. Bu üç kodun ithalat CSV kayıtları OGM/TYT/Türkçe ve etkindir. Kaynak PDF'lerin tamamı Git dışındadır.

Sürümlü `topic-pdf-links.json` yalnız bu üç soru kodunu onaylar. Katalog kimliği, sınav/ders ve PDF checksum'ı eşleşmeden bağlantı açılmaz. Özgün PDF değişir veya kaybolursa bağlantı kapanır. Diğer sekiz başlık adayı onaylı sayılmaz.

## Uygulama

Onaylı PDF detayında “Bu konudan soru çöz” ve “Test oluştur” eylemleri görünür. Kurucular `topicPdfId` taşır, kaynak/konu filtresini kilitler ve dört soru geçmişi modunun gerçek sayılarını gösterir. Sunucu, istek gövdesindeki kaynak/ders/konu alanları değiştirilse bile yalnız onaylı soru kodlarını havuza alır; yetersiz havuzda mevcut hata kuralı geçerlidir. Pratik oturumunda doğrulanmış konu adı saklanır, sınav başlığında görünür. Eski genel kurucu akışları değişmez.

## Kontrol

- Backend: `TopicPdfSelectionTest`, `TopicPdfServiceTest`, `TopicPdfEndpointTest` geçti. Test DB'de aynı geniş konuya ait onaysız soru ve sahte filtre isteği havuzu genişletmedi; bilinmeyen PDF reddedildi.
- Ön yüz: `npm run build` geçti. İzole API yanıtlarıyla `node testler/topic-pdf-ui.mjs` 1280 ve 390 px genişlikte PDF detayı, pratik/sınav kurucuları, kapsam kilidi ve yatay taşmayı kontrol etti (6/6).
- Canlı `ivme` DB ve çalışan servisler değiştirilmedi. Gerçek canlı katalog ve soru içe alma durumu 05.03 kapsamındaki kontrollü geçişte ayrıca doğrulanacak. Yalnız üç soru onaylı olduğundan dört modun bazıları sıfır veya yetersiz havuz gösterebilir; bu doğru boş durumdur.

**Sonraki iş:** 07.09; kaliteli zorluk verisi varsa sınırlandırılmış seçime eklenir, yoksa etiket eksikliği açıkça gösterilir.
