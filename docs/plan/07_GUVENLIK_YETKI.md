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

**Yerel hesap kararı:** Kullanıcının seçtiği `ivmeadmin` (`ADMIN`) ve `ivmeoperator` (`OPERATOR`) hesapları gerçek `ivme` veritabanında hazırlandı; ikisi de kullanıcının istediği aynı geçici parolayı kullanır. Önce yalnız `users` tablosunun Git dışı yedeği alındı. Eski `root` yönetici hesabı `ivmeadmin` olarak yeniden adlandırıldı; öğrenci hesabına dokunulmadı. Geçici parola açık metin olarak kaynak koda/belgeye yazılmadı; her hesap için ayrı tuzlu BCrypt özeti oluşturuldu ve ikisi de `password_change_required=true` işaretlendi. `dev` profilindeki otomatik `root` yönetici oluşturma kaldırıldı. Hesap ekranında parola değişince işaret temizlenir; üretim açılışı işaretli `ADMIN`/`OPERATOR` hesabını reddeder. Geçici yetkili hesap, geliştirme profili tünele bağlansa da Cloudflare istemci veya dış alan adı başlığıyla giriş yapamaz; yalnız yerel adresten açılır. İki hesap da en az 15 karakterlik farklı, güçlü parolaya geçirilmeden tünel üzerinden yayın yapılmaz. Yerel API giriş denemesinde iki rolün kendi uç noktası 200, karşı rolünki 403 döndü.

**Saklama kararı:** Ham giriş/aktiflik/çıkış olayları (`activity_events`) en fazla 90 gün tutulur; uygulama açıldığında ve her gün 03:00 UTC'de eski olaylar silinir. Bu tabloya olay yazma henüz uygulanmadığından mevcut gerçek veride silinecek kayıt yoktur. Soru çözme ve sınav geçmişi 90 günlük bu kurala dahil değildir. Günlük/haftalık/aylık uzun dönem grafiklerinin hangi toplu kayıtlardan üretileceği ve öğrencinin veri dışa aktarma/silme akışı ilerleme adımında tamamlanacak.

**Tünel sınırı:** Spring Boot varsayılan olarak yalnız `127.0.0.1` üzerinde dinler; `X-Forwarded-*` başlıkları kullanılmaz. Böylece uygulama bu başlıklarla sahte HTTPS/Host/istemci bilgisi kabul etmez. Üretim örnek ayarında QR için sabit `https://net.ivme.dev` ve güvenli oturum çerezi vardır. Cloudflare Tunnel hedefi `http://localhost:8081` olmalıdır. Farklı ağa açma kararı ayrıca gözden geçirilir.

**Bildirim gizliliği:** İçerik operatörü soru hatasını ve açıklamayı görebilir; bildiren öğrencinin kullanıcı adı API yanıtından ve arayüzden çıkarılmıştır. Serbest metin öğrenci tarafından kişisel bilgi içerebilir; operatör rolü ayrı hesapla sınırlı tutulur.

**Görsel sınırı:** Yerel görsel deposu yalnız WebP, PNG, JPEG ve GIF uzantılarını kabul eder; sunmadan önce dosya imzasını denetler. HTML/SVG ya da görsel uzantısıyla gizlenmiş HTML sunulmaz. Yol hem normalleştirilmiş hem gerçek dosya konumuyla denetlenir; başlangıçta mevcut doğrudan alt klasör görsel bağlantıları tanınır, onların içinden başka klasöre kaçan bağlantılar reddedilir. Yerel OGM pilot bağlantısında gerçek görsel servis edildi; sembolik dosya bağlantısı oluşturan test bu Windows ortamında izin olmadığı için atlandı. Mevcut `ivme` veritabanındaki 80.097 görsel yolunun tamamı `.webp` uzantılıdır. İçe alma sırasında `exists` yol/uzantı/gerçek kök konumunu kontrol eder; içerik imzası yükleme anında denetlenir.

**Giriş hızı ve CSRF:** Aynı IP ve kullanıcı için hatalı giriş sınırı ile başarılı girişte bu sayacın temizlenmesi ayrı API testleriyle doğrulandı. Oturum açılmış olsa bile CSRF belirteci taşımayan parola değişikliği 403 ile reddedilir; parola hash'i değişmez. Tünel trafiğindeki gerçek istemci IP davranışı dış erişim provasına bırakıldı.

**Güvenli çerez:** `YKS_COOKIE_SECURE=true` olduğunda hem oturum hem de JavaScript'in CSRF başlığına kopyaladığı `XSRF-TOKEN` çerezi `Secure` olur. Tünel ile uygulama arası HTTP olduğundan CSRF çerezi için bu açık ayar gerekir. Test profilinde çerezin `Secure` niteliği doğrulandı; gerçek HTTPS yanıtı ayrıca dış erişim provasına bırakıldı.

**Yerel görsel kökü:** Önceki `veri/resimler/ogm` bağlantısı taşınmış, artık var olmayan `D:\workspace\Eczacimiz Nazile\site\data\ogm\img` yoluna bakıyordu. Eski bağlantıya dokunmadan Git dışı `veri/resimler-pilot` kökü oluşturuldu: `ogm` gerçek `D:\workspace\ivme\site\data\ogm\img` klasörüne, `tyt`/`ayt` mevcut görsel klasörlerine bağlanır. `backend-baslat.bat` bu kökü bulursa kullanır. Rastgele seçilen 30 sorunun dosyası ve WebP imzası doğrulandı; kaynak dosyalar taşınmadı.

**2026-10-09 yedek provası:** Gerçek `ivme` veritabanının Git dışı `veri/yedek/ivme-20261009-prepilot.dump` tam yedeği `pg_dump -Fc` ile alındı (1.158.505 bayt; SHA-256 `5CD9CDAE4C7DF3F012C8EDC2B8F624BAC324FB6A5FC8353D7BF16D417A0A2071`). Ayrı geçici veritabanına geri yükleme başarılı oldu: kaynak ve geri yüklenen kopyada 80.097 soru, 3 kullanıcı, 0 ham etkinlik, Flyway sürüm 8 ve 2 geçici yetkili hesap eşleşti. Geçici prova veritabanı silindi; gerçek veriye dokunulmadı. Görseller bu DB yedeğinde bulunmaz; ayrıca yedeklenmelidir. Aynı disk dışındaki yedek hedefi henüz kurulmadı.

## Açık kontrol listesi

- Yeni ilerleme API'lerinde nesne sahipliği ve iki kullanıcıyla çapraz erişim testi. Mevcut sınav API'sinin oturum/cevap/teslim/sonuç/geçmiş/özet çapraz hesap testleri geçti.
- Oturum süresi/çıkış ve tünel üzerinden `Set-Cookie` denetimi. Giriş hızı, parola değişikliğinde CSRF reddi ve `Secure` CSRF çerezi test edildi.
- Tünel arkasında istemci IP'sinin doğrulanması ve hız sınırı testi; `CF-Connecting-IP` yalnız yerel tünel bağlantısında değerlendirilir.
- Hata yanıtında bilgi sızıntısı testi; görsel gerçek yol, izinli uzantı ve dosya imzası denetimi eklendi. Sembolik bağlantı kaçış testi bu Windows ortamında atlandı; Linux CI veya symlink izni olan makinede çalıştırılmalı.
- Etkinlik verisi için öğrenciye açıklama, uzun dönem toplulaştırma ve dışa aktarma/silme akışı; DB yedeğinin ve görsellerin ayrı yerde saklanması. Ham olayların 90 günlük otomatik silinmesi ve yerel DB geri yükleme provası uygulandı.
- Üretim için ayrı sınırlı DB rolü, güçlü hesap parolaları ve internetten erişim provası.

Bu liste bitmeden Adım 4 tamamlandı veya site paylaşmaya hazır sayılmaz.
