# İvme VPS yayını

[Tek tıkla yayın](tek-tikla-yayin.md) normal kurulum ve güncelleme akışıdır. Bu tarif ilk taşımanın el ile uygulanabilen adımlarını ve kurtarma işlemlerini içerir.

Windows'ta `test` geliştirme dalı ile `ivme_local` ve geçici `ivme_test` veritabanları kullanılır. GitHub'daki `production` dalı VPS'ye kurulacak sürümü tutar. Yayın için doğrulanan commit seçilir ve sunucuda aynı SHA ile Docker imajı oluşturulur. GitHub deposu herkese açıktır. PostgreSQL dökümü, çalışma dosyaları, kaynak listeleri ve gerçek ortam dosyaları SSH üzerinden özel dizinlere taşınır.

## İlk taşıma

1. Ubuntu 24.04 LTS üzerinde Docker Engine ve Compose kur. SSH anahtarıyla erişilebilen dağıtım hesabını ve `/srv/ivme/data`, `/srv/ivme/backup` dizinlerini hazırla. Yedek dizinini yalnız dağıtım hesabına aç. Uygulama origin'i 127.0.0.1:1010'a bağlıdır. PostgreSQL Compose ağı içinde kalır. [Ubuntu için Docker kurulumu](https://docs.docker.com/engine/install/ubuntu/)
2. Onaylanan `production` commit'ini ayrı bir checkout'a al. Dökümdeki Flyway sürümüyle eşleşen commit kullan. `deploy/` içinde `settings.env.example` dosyasını `.env` olarak, diğer iki örneği `db.env` ve `app.env` olarak kopyala. `umask 077` kullan ve iki ayrı yüksek entropili DB parolası gir. `IVME_REVISION` alanına checkout'un tam SHA'sını yaz. `YKS_SITE_ADRESI` mevcut HTTPS adresidir.
3. Windows'taki PostgreSQL 18 `pg_dump -Fc` ile `ivme` veritabanının özel dökümünü al. `pg_restore --list` ile arşivi oku, SHA-256 kaydet. Öğrenci verisini korumak için kaynağa yeni yazıları durdurduktan sonra son dökümü al. Ön prova kesintisiz, son kopya yazma durdurulduktan sonra yapılır.
4. Çalışma alanı ve yeni bir özel çıktı diziniyle `python deploy/assets.py WORKSPACE PRIVATE_OUTPUT` çalıştır. Soru görselleri, katalog girdileri, PDF inceleme adayları, yurt dışı kitapçıkları ve katalogdaki PDF'ler listelenir. Windows'taki etkin eşlemeden Linux yol listesi çıkarılır. `missing-pdfs.json` mevcut kaynak eksiklerini gösterir. Yayında beklenen bir belge eksikse kaynağın doğru kopyasını doğrula. Ham OCR, video önbelleği ve içerik üretim araçları kendi depolama alanında kalır.

Çalışma alanının üst dizininden, SSH anahtarı ve doğrulanmış sunucu parmak iziyle aşağıdaki aktarımı yap. `PRIVATE_OUTPUT` hazırladığın dizin, `ivme-vps` SSH takma adıdır. `assets.files` UTF-8 ve sıfır baytla ayrılmış göreli yollardan oluşur.

```bash
rsync -rt --from0 --files-from=PRIVATE_OUTPUT/assets.files --partial --info=progress2 ./ ivme-vps:/srv/ivme/data/
ssh ivme-vps mkdir -p /srv/ivme/data/Kaynaklar/Katalog
rsync -t --partial --info=progress2 PRIVATE_OUTPUT/production-paths.json ivme-vps:/srv/ivme/data/Kaynaklar/Katalog/production-paths.json
rsync -t --partial --info=progress2 PRIVATE_OUTPUT/assets.sha256 ivme-vps:/srv/ivme/backup/
rsync -t --partial --info=progress2 ivme.dump ivme.dump.sha256 ivme-vps:/srv/ivme/backup/
```

Dosyalar geldikten sonra `/srv/ivme/data` içinden `sha256sum -c --quiet /srv/ivme/backup/assets.sha256`, yedek dizininden `sha256sum -c ivme.dump.sha256` çalıştır. Konteyner UID 10001 çalışma dosyalarını okuyabilmelidir. Geri yükleme ve prova için yeni Compose projesi ve temiz bir PostgreSQL hacmi kullan.

```bash
cd deploy
docker compose config --quiet
docker compose up -d --wait db
docker compose exec -T db pg_restore --exit-on-error --no-owner --no-privileges -U ivme_owner -d ivme < /srv/ivme/backup/ivme.dump
docker compose run --rm migrate validate
docker compose exec -T db psql -X -U ivme_owner -d ivme -f - < app-role.sql
docker compose exec db psql -X -U ivme_owner -d ivme -c '\password ivme_app'
docker compose exec -T db psql -X -U ivme_owner -d ivme -v ON_ERROR_STOP=1 -c 'ALTER ROLE ivme_app LOGIN'
sh start.sh
curl -fsS http://127.0.0.1:1010/actuator/health/readiness
curl -fsS http://127.0.0.1:1010/app-version.txt
```

`\password` istemine `app.env` içindeki uygulama parolası girilir. Kaynak dökümdeki şema yeni sürümden gerideyse, sağlıklı yedek alındıktan sonra `docker compose run --rm migrate` ile göçleri uygula ve sonra doğrula. Döküm daha ilerideyse doğrulama durur. Dökümün Flyway geçmişini değiştirmek yerine uyumlu kodu onayla. Bir boş prova veritabanı için önce `CREATE EXTENSION vector` ve ardından Flyway `migrate` çalıştırılır.

## Trafik geçişi ve sonraki yayınlar

- Prova için ayrı tünel/hostname seç. Mevcut hostname'i yeni makineye ancak hazır olma, sürüm, giriş/çıkış, normal kullanıcıyla soru ve görsel, taşınan kaynak PDF, QR ve öğrenci geçmişi doğrulanınca yönlendir. Gerekiyorsa Brevo ve öğretmen modeli için `app.env` ayarlarını tamamla ve canlı doğrulama yap. Örnek ayarda bu iki entegrasyon kapalıdır. [Cloudflare Tunnel kurulumu](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- Sonraki yayında önce önceki SHA'yı ve yedek konumunu kaydet. İmajı commit SHA'sıyla önceden derle. Şema gerekiyorsa bakım penceresinde göçü ve rol izinlerini uygula. `sh start.sh` şemayı doğrular, paketi açar ve çalışan sürümü commit SHA'sıyla karşılaştırır.
- Eski imajı sakla ve şema uyumluysa önceki SHA'ya dön. Uyumsuz şema değişikliğinde yeni öğrenci yazıları başladıysa dönüş veri uzlaştırması ister. Geri yükleme yeni bir hacimde denenir.
- PostgreSQL dökümünü otomatik al ve şifreli olarak VPS dışına kopyala. Medya ve yol listesini sürümlü yedekle. Geri yükleme provasında öğrenci geçmişi ve dosya karma değerlerini denetle.
