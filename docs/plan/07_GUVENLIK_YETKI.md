# Adım 4 — Yetki ayrımı ve güvenlik kaydı

**Durum:** sürüyor · **Tarih:** 2026-10-08. Bu belge [yol haritasının](00_YOL_HARITASI.md) 4. adımına aittir.

## İlk alt iş: yönetici ve içerik operatörü

| Rol | İzinli iş | Arayüz / API |
|---|---|---|
| `USER` | Kendi çalışma ve sınav verileri | Öğrenci sayfaları; nesne sahipliği ayrıca sunucuda denetlenir |
| `ADMIN` | Toplu öğrenci ve gönderilen sınav sayısı | `/yonetim`, yalnız `GET /api/admin/stats` |
| `OPERATOR` | Soru, içe aktarma ve bildirim bakımı | `/icerik-bakimi`, `/api/operator/**` |

`/api/admin/**` altında istatistik dışındaki istekler açıkça reddedilir. `ADMIN` ve `OPERATOR` birbirinin API'sini kullanamaz. Öğrenci soru/sınav/bildirim API'leri yalnız `USER` içindir; operatör sadece soru görseli önizlemesini ayrıca okuyabilir. Yönetici ve operatör arayüzünde öğrenci gezinme bağlantıları gizlenir ve doğrudan adresle açma da engellenir. `V7__icerik_operatoru.sql` rol kısıtına `OPERATOR` ekler. Üretim açılışında ayrıcalıklı bir hesabın eski geliştirme parolasını kullanması reddedilir; yeni yönetici parolası 15 karakterden kısa veya 72 UTF-8 bayttan uzun olamaz. Geliştirme profili yalnız yerel kullanım içindir.

**UI kontrolü:** Test veritabanında yönetici ekranı yalnız iki toplu sayı gösterdi; operatör ekranı içerik sekmelerini gösterdi. İki rolün karşı API çağrıları 403 döndü. 390 px genişlikte yatay taşma görülmedi. Ekran görüntüleri çalışma alanındaki Git dışı `veri/ui-kontrol-root/` ve `veri/ui-kontrol-operator_test/` klasörlerindedir.

**Test:** Seçili dosyaların temiz çalışma ağacında 20 arka yüz testi ve React üretim derlemesi geçti. Yetki testinde yöneticinin soru ve sınav, operatörün sınav API'sine doğrudan erişimi 403 olarak doğrulandı.

**Veri ve hesap kararı:** Gerçek `ivme` veritabanındaki öğrenci ve yönetici hesaplarının parolaları değiştirilmedi. İçerik operatörü hesabı gerçek veritabanına eklenmedi. Kullanıcı seçtiği ayrı hesabı hazırladığında rol, kontrollü olarak `OPERATOR` yapılacak. Yerel testteki `operator_test` yalnız `ivme_test` içindedir.

**Tünel sınırı:** Spring Boot varsayılan olarak yalnız `127.0.0.1` üzerinde dinler; `X-Forwarded-*` başlıkları kullanılmaz. Böylece uygulama bu başlıklarla sahte HTTPS/Host/istemci bilgisi kabul etmez. Üretim örnek ayarında QR için sabit `https://net.ivme.dev` ve güvenli oturum çerezi vardır. Cloudflare Tunnel hedefi `http://localhost:8081` olmalıdır. Farklı ağa açma kararı ayrıca gözden geçirilir.

## Açık kontrol listesi

- Her öğrenci verisi API'sinde nesne sahipliği ve iki kullanıcıyla çapraz erişim testi.
- CSRF, oturum süresi/çıkış, giriş hızı ve güvenli çerez denetimi.
- Tünel arkasında istemci IP'sinin doğrulanması ve hız sınırı testi; `CF-Connecting-IP` yalnız yerel tünel bağlantısında değerlendirilir.
- Görsel yolunun kök dışına çıkması, dosya türü ve hata yanıtında bilgi sızıntısı testi.
- Etkinlik verisinin saklama/silme ve dışa aktarma kararı; yedek ve geri yükleme provası.
- Üretim için ayrı sınırlı DB rolü, güçlü hesap parolaları ve internetten erişim provası.

Bu liste bitmeden Adım 4 tamamlandı veya site paylaşmaya hazır sayılmaz.
