# İvme — veritabanı geçişi ve ilerleme şeması (2026-10-08)

## Yerel durum

- PostgreSQL rolü `root`, yerel parola kullanıcı talebiyle `root`. Geliştirme bağlantısı artık `jdbc:postgresql://localhost:5432/ivme`; test bağlantısı `ivme_test`. Üretim/tünel için bu ortak parola kullanılmaz.
- Eski `yks_hazirlik` silinmedi. `pg_dump -Fc` yedeği Git dışındaki `uygulama/veri/yedek/` klasöründe. Yedek yeni, boş `ivme` DB'sine `pg_restore --no-owner --no-privileges` ile geri yüklendi.
- Kaynak ve hedefte aynı sayılar: 2 kullanıcı, 80.097 soru, 7 sınav, 136 sınav sorusu, 1 geri bildirim. `ivme` açılışında Flyway V4–V6 uygulandı; V1–V3 yedekten geldi. `ivme_test` temiz kurulumunda V1–V6 çalıştı.
- `veritabani-sifirla.bat` eski iki DB'yi **silerek** yeniden oluşturur. Bu geçişte kullanılmadı; dolu veritabanında çalıştırılmamalı.

## Yeni tablolar ve kurallar

| Tablo | Amaç / temel kısıt |
|---|---|
| `study_sessions` | Kullanıcının pratik/test oturumu; seçim modu, süre ve durum |
| `session_questions` | Oturumdaki tekil sorular ve sıra; aynı soru/sıra yinelenemez |
| `question_attempts` | Yanıt, cevabı gösterme ve atlama olayları; o andaki cevap anahtarı, doğru/yanlış, aktif saniye, sunucu zamanı; kullanıcı başına tekil `client_event_id`; V6 ile oturum sahibi/sorusu ve puan tutarlılığı zorunlu |
| `goals` | Gün/hafta/ay için hedef türü, sayı, tarih ve durum |
| `taxonomy_nodes`, `question_taxonomy`, `taxonomy_prerequisites` | Sınavdan beceri/soru tipine kadar genişletilebilir etiketler ve önkoşullar; mevcut soruların metin etiketleri ileride eşlenecek |
| `activity_events` | Giriş, etkin aralık ve çıkış; ham IP ve iletişim bilgisi yok |

Mevcut `feedback` tablosu öğrencinin kolay/orta/zor oyunu ve soru sorun bildirimini zaten tutar; aynı işi yapan ikinci tablo açılmadı. Bu göçler yalnız **veri temelidir**: yeni tablolara yazan API ve kişisel panolar 6–10. adımlarda bağlanır. Mevcut sınav/geçmiş tabloları korunur.

## Doğrulama ve sınır

- `mvn test`: 27 test geçti; Flyway V1–V6 `ivme_test` üzerinde çalıştı.
- `ivme` üzerinde uygulama yalnız `127.0.0.1:18081` adresinde başlatıldı; Hibernate şemayı doğruladı ve V6 uygulandı. Kimliksiz `/api/auth/me` 401 döndü.
- Ayrı `ivme_test` örnek verisiyle ana sayfa, soru, sınav kurma, geçmiş ve yönetim ekranları 1280 px masaüstü ve 390 px telefonda açıldı; mobil yatay taşma yok. Ekran görüntüleri Git dışındaki `veri/ui-kontrol/` klasöründe. Mevcut `ivme` hesabının şifresiyle giriş doğrulanmadı; verilen `root/root` bu kopyada kabul edilmedi, test DB'de çalıştı. Gerçek hesabın şifresi değiştirilmedi.
- Yeni ilerleme tablolarında henüz ürün verisi yok. Ön yüz onları kullanana kadar bu durum beklenir.

## Yeni kurulum / geri dönüş

1. PostgreSQL'de `root` rolüyle boş `ivme` ve `ivme_test` oluştur: `CREATE DATABASE ivme OWNER root TEMPLATE template0;` ve `CREATE DATABASE ivme_test OWNER root TEMPLATE template0;`. `ivme_test` testler tarafından temizlenir; gerçek veri oraya konmaz.
2. Dolu eski DB'den geçiyorsan, önce Git dışına `pg_dump -Fc -h localhost -U root -d yks_hazirlik -f <yedek.dump>` al; yeni boş `ivme`ye `pg_restore -h localhost -U root -d ivme --exit-on-error --no-owner --no-privileges <yedek.dump>` ile geri yükle. Aynı tablo sayılarını karşılaştır.
3. `backend-baslat.bat` yeni varsayılan DB'ye bağlanır ve eksik Flyway göçlerini uygular. İlk paylaşım öncesi geliştirme yönetici parolası, ayrı DB rolü ve güvenli çerez ayarı 4–5. adımlarda tamamlanır.
4. Geri dönüş gerekirse eski `yks_hazirlik` DB'si ve dump yerinde durur. Yeni yazılan denemeler oluştuğunda geri dönmeden önce ayrıca `ivme` yedeği alınmalıdır.
