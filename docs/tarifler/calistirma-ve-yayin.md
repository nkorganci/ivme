# Çalıştırma, yayın ve pgvector

## Yerel uygulama

Java 21, Maven, Node.js 22+ ve PostgreSQL gerekir. Üst dizindeki `Ivme Baslat.bat`, `yerel-baslat.ps1` üzerinden tek `main` uygulamasını `http://localhost:1010` adresinde açar; `yerel-ortam.ps1` yerel DB/port ayarını seçer, sırlar Git dışındaki `.codex/local-environment.json`'dadır. Görseller `veri/resimler-pilot`, PDF kataloğu `veri/ogm-konu-pdf-katalog/entries` altındadır.

Başlatıcı PostgreSQL'in 5432'de dinlediğini denetler, izleyiciyi açar; uygulama zaten yanıt veriyorsa tarayıcıyı hemen açar, vermiyorsa izleyici günlüğünü gösterip hazır olunca açar; derleme hatasında ilgili satırları gösterip pencereyi açık bırakır (pencereyi kapatmak açılışı durdurmaz).

`canli-izle.ps1` kaynak değişince paketi yeniler. Uygulama kapalıyken kaynak parmak izi son yayımlanan paketle aynıysa derlemeden o paketi açar (~20 sn; yol `backend/target/live-deployed.jar`); parmak izi `canli-kaynaklar.ps1`'dedir ve `static/` dışındaki tüm `backend/src/main/resources` dosyalarını kapsar. Kapalıyken başlayan derleme başarısız olursa önceki paket açılır. `yeniden-baslat.ps1` her zaman yeniden derler, dönüşümlü JAR yuvasıyla servisi yeniler, HTTP'den HTML/asset ve `app-version.txt` sürümünü doğrular; başarısızlıkta eski paket korunur. Günlükler: `backend/target/live-watch.log`, `live-build.stderr.log`, `live-start.stderr.log`, `application.stderr.log`.

Türkçe metin içeren `.ps1` dosyaları BOM'lu UTF-8 kaydedilir (PowerShell 5.1 BOM'suz dosyayı ANSI okur). İsteğe bağlı Vite akışında önce paketli uygulama ve izleyiciyi durdur; `backend-baslat.bat` API'yi 8081'de, `frontend-baslat.bat` ön yüzü 1010'da açar.

## Paylaşılan HTTPS erişimi

1. `uretim.ayarlar.ornek.bat`'ı Git dışı `uretim.ayarlar.bat` olarak kopyala: DB, görsel klasörü, `YKS_SITE_ADRESI=https://net.ivme.dev`, `YKS_COOKIE_SECURE=true`, `PORT=1010`. Üretimde geçici parolaları değiştir; sınırlı DB rolü ve göç sırası için [12.03](../plan/12-icerik-ve-yayin.md). `YKS_FLYWAY_ETKIN=false` yalnız yetkili göçten sonra.
2. `uretim-derle.bat` paketi, `uretim-calistir.bat` tek Java sürecini başlatır (`127.0.0.1:1010`; Cloudflare tünel hedefi aynı adres, ek Vite tüneli yok).
3. Yerel ve tünel adresinde giriş/çıkış, görsel, QR, CSRF çerezi, mobil görünüm ve yeniden başlatmayı denetle. Geçici parolalı ayrıcalıklı hesap, geçersiz HTTPS adresi veya güvenli olmayan çerez ayarıyla üretim açılışı reddedilir.

`ivme` veritabanı öğrenci geçmişini tutar; Git güncellemesi onu taşımaz. DB ve görseller ayrı yedeklenir (`scripts/ivme-yedek-al.ps1`). `veritabani-sifirla.bat` gerçek veri üzerinde çalıştırılmaz. Git push veya dış dağıtım ayrı kullanıcı talimatı ister.

## pgvector (PostgreSQL 18, yalnız `localhost:5432/ivme`)

Kurulu ve doğrulandı: PostgreSQL 18, pgvector 0.8.7 (kaynak commit `f37c13f68b57d2c3472b2214fbcff699d6d34876`). Yeniden kurulum gerekirse Visual Studio Build Tools 2022 C++ + Windows SDK + Git ile, yönetici x64 Native Tools Command Prompt'ta:

```bat
set "PGROOT=C:\Program Files\PostgreSQL\18"
cd /d %TEMP%
git clone --depth 1 --branch v0.8.7 https://github.com/pgvector/pgvector.git pgvector-0.8.7
cd pgvector-0.8.7
nmake /F Makefile.win
nmake /F Makefile.win install
```

Yetkili hesapla `CREATE EXTENSION IF NOT EXISTS vector;` çalıştırılır (uygulama rolü `root` süper kullanıcı değildir). Doğrulama: `SELECT '[1,2,3]'::vector <-> '[4,6,3]'::vector;` → `5`. Parolaları komut satırına veya belgeye yazma; öğrenci tablolarını değiştirmek gerekmez. Derleme/kurulum günlükleri `%LOCALAPPDATA%\Ivme\pgvector-setup` altındadır.
