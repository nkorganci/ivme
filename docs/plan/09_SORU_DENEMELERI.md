# Adım 6 — kayıtlı serbest pratik

Tarih: 2026-10-09. Durum: sürüyor. Bu dilim soru başına pratik olaylarını kalıcı hale getirir; çalışma oturumu seçimi ve tam soru ekranı tasarımı ayrı alt işlerdir.

## Yapılanlar

- `V9__pratik_turu.sql` her soruda birden fazla çalışma turunu ayırmak için `question_attempts.practice_round` alanını ekler. Mevcut satırlar varsa tur 1 kabul edilir. Olaylarda öğrenci, soru, UUID, şık, doğru/yanlış, olay anındaki cevap anahtarı, yaklaşık aktif saniye ve sunucu zamanı saklanır. Soru anahtarı sonradan değişse de eski turun görünen cevabı korunur.
- `GET/POST /api/questions/{id}/practice` yalnız oturumdaki `USER` rolünün kendi olaylarını okur/yazar. Bir turda en çok iki yanıt vardır. Yanlış cevap doğru şıkkı açıklamaz; öğrenci tekrar deneyebilir, açıkça cevabı gösterebilir veya atlayabilir. Tamamlanan turdan sonraki yanıt yeni tur açar. Aynı `clientEventId` tekrarlandığında yeni satır yazılmaz; aynı UUID farklı işlemde kullanılırsa 409 döner. Öğrenci satır kilidi eşzamanlı istekleri sıralar.
- Çözüm görseli, öğrenci pratikte doğru yanıt/cevap gösterme olayına veya teslim edilmiş sınava sahip olana kadar 404 döner. Operatör ön izlemesi korunur. Eski kayıtsız `/check` API'si kaldırıldı.
- React soru ekranı geçmiş turu sayfa yenilemesinden sonra yükler; yanlış sonrası tekrar, cevabı göster, atla ve yeniden çalış seçeneklerini sunar. Sekme görünür, odaklı ve yakın zamanda etkileşimli ise saniye sayılır; bu süre yaklaşık ölçümdür. Ağ yanıtı kaybolursa aynı UUID ile yeniden gönderim yapılır.
- `V10__soru_karalama.sql` ve `GET/PUT /api/questions/{id}/board` öğrenci/soru başına çizimi kaydeder. Yalnız etkin soru ve oturumdaki öğrenci erişebilir. Çizim 0–1 koordinatlı küçük vektör JSON olarak tutulur; sürüm çakışmasına 409, geçersiz/aşırı büyük çizime 400 döner. Sayfadaki Karalama ve QR sekmeleri masaüstü ve telefonda çalışır. Her çizgi bitince kayıt durumu gösterilir; ağ hatasında çizim ekranda kalır ve yeniden deneme sunulur.

## Denetim

`ivme_test` veritabanında 44 arka yüz testi geçti; 1 Windows sembolik bağlantı testi izin olmadığı için atlandı. Yeni testler öğrenci izolasyonu, yanlışta cevap gizliliği, iki yanıt sınırı, açık cevap gösterme, tekrar UUID, soru anahtarı değişiminde geçmişin korunması, süre doğrulaması ve çözüm görseli sahipliğini kapsar. Geçici `ivme_e2e` DB'sine eski yedek geri yüklenip Flyway V9 uygulandı; masaüstü ve mobil Chrome akışları ayrı ayrı 22/22 geçti. Yanlışın yenileme sonrası kayıtlı kalması ve açık cevap gösterme görsel olarak kontrol edildi. Görüntüler Git dışı `veri/ui-practice/` klasöründedir. Prova süreçleri kapatıldı ve geçici DB silindi.

**Karalama doğrulaması:** Çalışan `8081/5173` süreçlerine dokunmadan yalıtılmış kaynak kopyasında `ivme_test` üzerinde V10 uygulandı; 44 test geçti, 2 test atlandı. V9 yedeğinden oluşturulan geçici `ivme_e2e` veritabanı V10'a geçti; ayrı `8082/5174` sunucularında masaüstü ve telefon Chrome akışları ayrı ayrı 26/26 denetimle çizim, yenileme, tuvalin yeniden çizilmesi, QR ve eski pratik adımlarını doğruladı. Görüntüler Git dışı `veri/ui-board/` altındadır. Prova sunucuları kapatılıp geçici DB silindi. Gerçek `ivme` veritabanı ve çalışan site V9 olarak bırakıldı; uygulama yeniden başlatılınca Flyway V10 uygulanır. Ön yüz geliştirme sunucusu yeni dosyayı eski API ile sunarsa Karalama sekmesi otomatik gizlenir; mevcut soru akışı çalışır.

**Gerçek DB geçişi:** Git dışındaki `veri/yedek/ivme-20261009-prepilot.dump` yedeğinin SHA-256 özeti yeniden doğrulandı; V8 ve 80.097 soru geçiş öncesi okundu. Uygulama yalnız yerel 8081 portunda bir kez açılarak V9 uygulandı. Sonrasında V9, 80.097 soru, 3 kullanıcı, 2 geçici parolalı yetkili hesap ve 0 eski deneme kaydı doğrulandı; uygulama kapatıldı. V8 yedeği geri dönüş noktası olarak saklanır. V9 sonrası `veri/yedek/ivme-20261009-v9.dump` yedeği alındı (1.159.057 bayt; SHA-256 `7F5AEAB5AD8D41468469E14BECB90A861FBDFBE0772D13D5C9E9DCE2C1E143BA`); arşiv listesi okunabildi. Görseller bu yedeğin içinde değildir.

## Sonraki alt işler

- `study_sessions` ve `session_questions` ile süresiz pratik oturumu ve sunucu tarafı soru sırası [07.03](13_07_03_PRATIK_OTURUMU.md) kapsamında tamamlandı. Denemelere oturum kimliği bağlama [07.04](14_07_04_OTURUM_DENEMELERI.md), yeni/önceki/yanlış pratik seçimi [07.05](16_07_05_PRATIK_SECIMI.md) kapsamında tamamlandı.
- Ders/konu/alt konu/soru tipi taksonomisinin olay anındaki sürümü ve ilk deneme istatistikleri. Toplam/çözülen/kalan ilk sayıları [Adım 7/8 kaydında](10_SORU_KAPSAMI.md) eklendi.
- Konu notu/ipuçları sekmesi kaynaklı içerik hattı tamamlanınca açılacak. Karalamada çevrim dışı kalıcılık henüz yok; ağ hatasında çizim sayfa açık kaldığı sürece tutulur, yeniden deneme ile kaydedilebilir.
- Görünür/odaklı sekme süresinin gerçek cihazlarda ölçümü ve kullanıcının yaklaşık süre açıklaması. Mevcut sayaç sunucunun güvenilir süre ölçümü olarak sunulmaz.

**Durum: AÇIK.** [06.01–06.04 ve 06.06](12_NUMARALI_IS_LISTESI.md) `BITTI`; 06.05 gerçek cihaz ölçümü bekler.

**06.05 ara kayıt · 2026-10-09:** Geciken tarayıcı aralığı yerine monotonic zaman, görünürlük/odak ve 60 saniyelik boşta kalma eşiği kullanan yaklaşık aktif süre hesabı [06.05 kaydında](32_06_05_AKTIF_SURE.md) test edildi. Fiziksel telefon ve pencere geçişi kanıtı bekleniyor; 06.05 açık kalır.

**06.06 · 2026-10-09:** Yalnız yayımlanmış alt konu/soru tipi etiketlerinin olay anındaki adı, kodu ve sürümü sabit kopyalanır; fayda oyu çözüm sonrası tekilleştirilir. [Uygulama ve doğrulama kaydı](33_06_06_ETIKET_ANLIK_KAYIT_FAYDA_OYU.md).
