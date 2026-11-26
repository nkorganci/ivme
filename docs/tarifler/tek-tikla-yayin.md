# İvme VPS kurulumu, ilk yükleme ve medya

## Contabo siparişi

**Mevcut yaklaşık 10 kullanıcı için Cloud VPS 4, 8 GB RAM ve 100 GB SSD ile başla.** İkinci tam geri yüklemeyi ayrı bir ortamda yap ve yedekleri VPS dışında tut. Aynı VPS’ye başka bir proje veya ikinci tam veritabanı kopyası eklenecekse Cloud VPS 6’nın 200 GB SSD seçeneğini değerlendir. [Sunucu seçiminin hesabı ve sıfırdan yayın rehberi](sifirdan-vps-ve-yayin.md)

İvme için satın alınan sunucu **Cloud VPS 6, 6 vCPU, 12 GB RAM ve 200 GB SSD**. Contabo’daki Ubuntu 24.04 ilk kontrolde 193 GiB dosya sistemi ve yaklaşık 191 GiB kullanılabilir alan gösterdi. Tam medya için yaklaşık 16 GiB ve güncel ilk PostgreSQL dökümü için 4,61 GB aktarılır. Dökümün sıkıştırılmış boyutu ile açılmış veritabanının ve indekslerinin boyutu ayrı ölçülür.

| Sipariş alanı | Seçim |
|---|---|
| Image | Ubuntu 24.04 LTS, x86_64. Ubuntu Minimal gösteriliyorsa kullanılabilir. |
| Private Networking | No Private Networking |
| Bandwidth | Dahil olan Unlimited Traffic |
| IPv4 | Dahil olan tek IP |
| Object Storage ve Monitoring | None |
| Cloud-init ve SSH | SSH açık anahtarını ekle. Sistem kurulumu için aşağıdaki bootstrap kullanılır. |
| Auto Backup | VPS dışındaki şifreli yedek hedefi varsa sağlayıcı eklentisi isteğe bağlıdır. |

## Sunucunun ilk kurulumu

1. Contabo konsoluna `%USERPROFILE%\.ssh\ivme-vps.pub` açık anahtarını ekle. İlk bağlantıda sağlayıcının konsolundan doğruladığın host parmak izini OpenSSH'ye kaydet. İlk yönetici hesabı root ise `adduser --disabled-password --gecos '' ivme-deploy` ile dağıtım hesabını oluştur. `install -d -m 0700 -o ivme-deploy -g ivme-deploy /home/ivme-deploy/.ssh` ile SSH dizinini hazırla. İvme'nin açık anahtar dosyasını `install -m 0600 -o ivme-deploy -g ivme-deploy ivme-vps.pub /home/ivme-deploy/.ssh/authorized_keys` ile ekle. Docker grubundaki dağıtım hesabı sunucuda yönetici düzeyinde yetkiye sahiptir. [Contabo SSH anahtarları ve cloud-init](https://contabo.com/en-us/cloud-init/)
2. Windows'ta `%USERPROFILE%\.ssh\config` içinde şu yapıyı kullan. Ardından `ssh ivme-vps` ile doğrula.

```sshconfig
Host ivme-vps
    HostName YOUR_VPS_IP
    User ivme-deploy
    IdentityFile ~/.ssh/ivme-vps
    IdentitiesOnly yes
```

3. Yerel uygulama dizininden `scp deploy/bootstrap-ubuntu.sh ivme-vps:/tmp/ivme-bootstrap.sh` çalıştır. Sunucunun yönetici oturumunda `sudo sh /tmp/ivme-bootstrap.sh ivme-deploy` çalıştır. Betik Docker Engine, Compose ve Git'i hazırlar, `/srv/ivme` dizinlerini ve iki ayrı veritabanı parolasını oluşturur. 8 GB planında ilk açılıştan önce `/srv/ivme/config/compose.env` içinde `IVME_JAVA_OPTS=-Xmx2g` ayarla. Yeni dağıtım oturumunda `docker compose version` ve `docker info` çalışmalıdır. [Docker'ın Ubuntu tarifi](https://docs.docker.com/engine/install/ubuntu/)
4. Yerel `deploy/local.json.example` dosyasını `deploy/local.json` olarak kopyala ve SSH takma adını gir. Docker Desktop Linux konteyner modunda açık olmalı. Medya için Windows'ta `rclone` kullanılır. Betik Windows OpenSSH'nin aynı anahtarını ve doğrulanmış host kaydını kullanır. [Rclone Windows kurulumu](https://rclone.org/install/) · [Rclone SFTP](https://rclone.org/sftp/)
5. Önce [medya listesini](vps-yayini.md) hazırla ve `Ivme Medya Gonder.bat` ile doğrulanmış klasörü aktar. V104 dökümünü yüklemek için V103 ve V104 dahil, DB geçmişiyle eşleşen kodu yerel `test` dalında gözden geçir. Sonraki bölümdeki ilk kurulum komutuyla veriyi yükle. Canlı geçiş için kaynak yazılarını durdurduktan sonra son dökümü al. İlk restore boş veritabanında, tek işlemde yapılır.

## Günlük yayın ve ilk yükleme

Günlük yayın dört projede aynıdır ve [dört proje rehberinde](coklu-proje-yayini.md) anlatılır. **Ivme Yayinla.bat** stage edilmiş dosyaları commit eder ve `git push` çalıştırır. Push kontrolü imajı derler, test eder ve sunucuya hazırlar. Sunucu sürümü bir dakika içinde başlatır.

`deploy/release.py` yalnız ilk kurulum ve önizleme için kalır:

```powershell
python -X utf8 deploy/release.py --preview
python -X utf8 deploy/release.py --restore "D:\private\ivme.dump"
```

`--preview` commit edilmiş kodla Linux imajını ve üretim testlerini çalıştırır. SSH ve push gerektirmez. `--restore` yalnız boş bir sunucudaki ilk yüklemede kullanılır ve `ivme.dump.sha256` dosyasını aynı dizinde bekler. Dökümde uygulanmış Flyway SQL dosyalarının sürüm ve sağlama değerleri Git'teki dosyalarla eşleşmeli. Uygulanmış dosyayı değiştirirsen özgün halini geri getirip yeni düzenlemeyi sonraki sürüme ekle. Medyayı ilk yüklemeden önce gönder.

Canlı öğrenci veritabanı VPS'deki `ivme`, yerel geliştirme veritabanı `ivme_local` ve otomatik testlerin oluşturup kaldırdığı veritabanı `ivme_test`. Yeni Flyway SQL'i olan yayında sunucu uygulamayı durdurur, doğrulanmış yedek alır ve göçü uygular. Bu süre boyunca site kapalıdır, bu yüzden böyle bir yayını yoğun olmayan bir zamanda yap.

## Medya, Cloudflare ve sonraki projeler

- Medya paketi ayrı güncellenir. `Ivme Medya Gonder.bat` ile önceki doğrulanmış manifest klasörünü seçebilir ya da yerel içerik değiştiğinde `python deploy/assets.py WORKSPACE PRIVATE_OUTPUT` ile yenisini oluşturabilirsin. Rclone değişen veya eksik dosyaları gönderir, VPS SHA-256 listesini denetler ve PDF yol listesini en son etkinleştirir. Java yeni katalog yollarını yeniden başladığında okur.
- Kaynak PDF küçültmede önce [16.03 kaynak kurallarını](../plan/16-ogrenme-kalitesi.md#silme-kuralları) uygula. Yayımdan kaldırıldığı DB'de kaydedilmiş PDF'lerin SHA-256 listesini `learning_catalog.pdf_archive` tablosundan alıp `--archived-pdf-shas` ile manifestten çıkarabilirsin. Medya kopyası sunucudaki mevcut dosyaları silmez. Disk temizliği ilgili canlı PDF bağlantıları ve geri yüklenebilir yedek doğrulandıktan sonra ayrı yürütülür.
- Ubuntu'da Cloudflare Tunnel'ın `cloudflared` servisini kur. İvme için `net.ivme.dev → http://127.0.0.1:1010` rotasını uçtan uca doğrula. PostgreSQL Compose ağı içinde kalır. Büyük özel aktarım SSH/SFTP üzerinden yapılır. [Cloudflare Tunnel yönlendirme](https://developers.cloudflare.com/tunnel/concepts/routing/)
- Bu kurulum `ivme-contabo` adlı ayrı tüneli kullanır. Ubuntu’da `ivme-cloudflared.service` bağlantıyı açar ve yeniden başlatır. Tünel anahtarı `/etc/ivme-cloudflared/token` altında yöneticiye özel dosyadır. Windows’taki `ivme-pc` tüneli öteki uygulamalara hizmet verdiği için yalnız `net.ivme.dev` rotası taşınır. Önce VPS’den `curl -fsS http://127.0.0.1:1010/actuator/health/readiness` ile hazır olma durumunu kontrol et. DNS geçişinden sonra dış ağdan `/actuator/health/readiness` ve `/app-version.txt` uçlarını doğrula.
- Cloudflare panelinde tünele yayımlanmış uygulama rotası eklemek, mevcut DNS kaydının hedefini değiştirmeyebilir. `ivme.dev → DNS → Records` altında yalnız `net` kaydının içeriğini `ivme-contabo` tünelinin CNAME hedefine al ve **Proxied** durumunu koru. Dış ağdan sağlık ve sürüm yanıtını kontrol et.
- Diğer projeler için ayrı Compose proje adı, `/srv/<proje>` dizini, veritabanı/volume, ortam dosyası ve loopback portu kullan. Aynı Cloudflare tünelinde her projeye ayrı alt alan adı ver. İvme örneği localhost 1010, ikinci site 1020 olabilir. Sunucu doluluğunu `df -h`, konteyner disk kullanımını `docker system df` ile izle.

## Veritabanı yedekleri

Günlük yedekler, bilgisayardaki kopyalar ve geri yükleme [dört proje rehberinin 6. bölümündedir](coklu-proje-yayini.md#6-yedekler-ve-veriyi-geri-alma).
