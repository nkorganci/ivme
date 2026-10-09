# Adım 6 — kayıtlı serbest pratik

Tarih: 2026-10-09. Durum: sürüyor. Bu dilim soru başına pratik olaylarını kalıcı hale getirir; çalışma oturumu seçimi ve tam soru ekranı tasarımı ayrı alt işlerdir.

## Yapılanlar

- `V9__pratik_turu.sql` her soruda birden fazla çalışma turunu ayırmak için `question_attempts.practice_round` alanını ekler. Mevcut satırlar varsa tur 1 kabul edilir. Olaylarda öğrenci, soru, UUID, şık, doğru/yanlış, olay anındaki cevap anahtarı, yaklaşık aktif saniye ve sunucu zamanı saklanır. Soru anahtarı sonradan değişse de eski turun görünen cevabı korunur.
- `GET/POST /api/questions/{id}/practice` yalnız oturumdaki `USER` rolünün kendi olaylarını okur/yazar. Bir turda en çok iki yanıt vardır. Yanlış cevap doğru şıkkı açıklamaz; öğrenci tekrar deneyebilir, açıkça cevabı gösterebilir veya atlayabilir. Tamamlanan turdan sonraki yanıt yeni tur açar. Aynı `clientEventId` tekrarlandığında yeni satır yazılmaz; aynı UUID farklı işlemde kullanılırsa 409 döner. Öğrenci satır kilidi eşzamanlı istekleri sıralar.
- Çözüm görseli, öğrenci pratikte doğru yanıt/cevap gösterme olayına veya teslim edilmiş sınava sahip olana kadar 404 döner. Operatör ön izlemesi korunur. Eski kayıtsız `/check` API'si kaldırıldı.
- React soru ekranı geçmiş turu sayfa yenilemesinden sonra yükler; yanlış sonrası tekrar, cevabı göster, atla ve yeniden çalış seçeneklerini sunar. Sekme görünür, odaklı ve yakın zamanda etkileşimli ise saniye sayılır; bu süre yaklaşık ölçümdür. Ağ yanıtı kaybolursa aynı UUID ile yeniden gönderim yapılır.

## Denetim

`ivme_test` veritabanında 44 arka yüz testi geçti; 1 Windows sembolik bağlantı testi izin olmadığı için atlandı. Yeni testler öğrenci izolasyonu, yanlışta cevap gizliliği, iki yanıt sınırı, açık cevap gösterme, tekrar UUID, soru anahtarı değişiminde geçmişin korunması, süre doğrulaması ve çözüm görseli sahipliğini kapsar. Geçici `ivme_e2e` DB'sine eski yedek geri yüklenip Flyway V9 uygulandı; masaüstü ve mobil Chrome akışları ayrı ayrı 22/22 geçti. Yanlışın yenileme sonrası kayıtlı kalması ve açık cevap gösterme görsel olarak kontrol edildi. Görüntüler Git dışı `veri/ui-practice/` klasöründedir. Prova süreçleri kapatıldı ve geçici DB silindi.

**Gerçek DB geçişi:** Git dışındaki `veri/yedek/ivme-20261009-prepilot.dump` yedeğinin SHA-256 özeti yeniden doğrulandı; V8 ve 80.097 soru geçiş öncesi okundu. Uygulama yalnız yerel 8081 portunda bir kez açılarak V9 uygulandı. Sonrasında V9, 80.097 soru, 3 kullanıcı, 2 geçici parolalı yetkili hesap ve 0 eski deneme kaydı doğrulandı; uygulama kapatıldı. V8 yedeği geri dönüş noktası olarak saklanır. V9 sonrası `veri/yedek/ivme-20261009-v9.dump` yedeği alındı (1.159.057 bayt; SHA-256 `7F5AEAB5AD8D41468469E14BECB90A861FBDFBE0772D13D5C9E9DCE2C1E143BA`); arşiv listesi okunabildi. Görseller bu yedeğin içinde değildir.

## Sonraki alt işler

- `study_sessions` ve `session_questions` ile pratik oturumu, yeni/önceki/yanlış sorular seçimi ve sunucu tarafı oturum sırası. Bu tamamlanınca denemelere oturum kimliği bağlanacak.
- Ders/konu/alt konu/soru tipi taksonomisinin olay anındaki sürümü ve ilk deneme istatistikleri; öğrenciye toplam/çözülen/kalan sayıları.
- Karalama tahtası ve konu notu/ipuçları sekmeleri, kullanıcı/soru bazında kaydı; çevrim dışı veya ağ kopması durumunda daha görünür kayıt durumu.
- Görünür/odaklı sekme süresinin gerçek cihazlarda ölçümü ve kullanıcının yaklaşık süre açıklaması. Mevcut sayaç sunucunun güvenilir süre ölçümü olarak sunulmaz.
