# Uygulamayı çalıştırma ve yayımlama

## Yerel uygulama

Java 21, Maven, Node.js 22+ ve PostgreSQL gerekir. Üst dizindeki `Ivme Baslat.bat`, `yerel-baslat.ps1` üzerinden tek `main` uygulamasını `http://localhost:1010` adresinde açar. `yerel-ortam.ps1` yerel DB/port ayarlarını seçer; sırlar Git dışındaki `.codex/local-environment.json` dosyasındadır. Görseller `veri/resimler-pilot`, PDF kataloğu `veri/ogm-konu-pdf-katalog/entries` altındadır.

`canli-izle.ps1` kaynak değişince paketi yeniler. `python scripts/ivme.py bekle` derleme bitişini, `python scripts/ivme.py durum --hizli` sunulan asset sürümünü gösterir. Hatalar `backend/target/live-watch.log`, `live-build.stderr.log`, `application.stderr.log` dosyalarındadır. Gerekirse `yeniden-baslat.ps1` dönüşümlü JAR yuvasıyla servisi yeniler ve HTTP'den HTML/asset ile `app-version.txt` sürümünü doğrular. Başarısız yenilemede eski paket korunur.

İsteğe bağlı Vite akışında önce paketli uygulama ve izleyiciyi durdur; `backend-baslat.bat` API'yi 8081'de, `frontend-baslat.bat` ön yüzü 1010'da açar. Normal geliştirmede paketli uygulama ve izleyici kullanılır.

## Paylaşılan HTTPS erişimi

1. `uretim.ayarlar.ornek.bat` dosyasını Git dışında kalacak `uretim.ayarlar.bat` olarak kopyala. DB, görsel klasörü, `YKS_SITE_ADRESI=https://net.ivme.dev`, `YKS_COOKIE_SECURE=true` ve `PORT=1010` değerlerini ayarla. Üretimde geçici parolaları değiştir; sınırlı DB rolü ve göç sırası için [12.03 yayın işi](../plan/12-icerik-ve-yayin.md) kullan. `YKS_FLYWAY_ETKIN=false` yalnız yetkili göçten sonra seçilir.
2. `uretim-derle.bat` ile React içeren Spring Boot paketini oluştur; `uretim-calistir.bat` ile tek Java sürecini başlat. Sunucu `127.0.0.1:1010` adresinde dinler. Cloudflare tünel hedefi aynı adrestir; ek Vite tüneli açılmaz.
3. Yerel ve tünel adresinde giriş/çıkış, görsel, QR, CSRF çerezi, mobil görünüm ve yeniden başlatmayı denetle. Eski asset görünürse tarayıcı önbelleğini yenile. Geçici parolalı ayrıcalıklı hesap, geçersiz HTTPS adresi veya güvenli olmayan çerez ayarıyla üretim açılışı reddedilir.

`ivme` veritabanı öğrenci geçmişini tutar; Git güncellemesi onu taşımaz. DB ve görseller ayrı yedeklenir. `veritabani-sifirla.bat` gerçek veri üzerinde çalıştırılmaz. Git push veya dış dağıtım ayrı kullanıcı talimatı gerektirir.
