# İvme tek tıkla yayın ve VPS kurulumu

## Contabo siparişi

**Cloud VPS 8, 24 GB RAM ve 300 GB SSD** İvme ile aynı VPS'ye sonraki projeler için önerilen başlangıçtır. Yalnız İvme ve birkaç hafif servis için 150 GB NVMe seçeneği de yeterli bir başlangıçtır. İvme V104 kaynağı yaklaşık 38 GB PostgreSQL, 15,73 GiB çalışma medyası ve 2,93 GB sıkıştırılmış prova dökümü içerir. Linux, Docker imajları, büyüme ve geri yükleme için ayrı boşluk gerekir. Kullanıcıların çoğu Türkiye'deyse Avrupa bölgesini seç. [Contabo seçenekleri](https://contabo.com/en-us/pricing/) · [Desteklenen Linux sürümleri](https://contabo.com/en-us/linux-vps/)

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

3. Yerel uygulama dizininden `scp deploy/bootstrap-ubuntu.sh ivme-vps:/tmp/ivme-bootstrap.sh` çalıştır. Sunucunun yönetici oturumunda `sudo sh /tmp/ivme-bootstrap.sh ivme-deploy` çalıştır. Betik Docker Engine, Compose ve Git'i hazırlar, `/srv/ivme` dizinlerini ve iki ayrı veritabanı parolasını oluşturur. Yeni dağıtım oturumunda `docker compose version` ve `docker info` çalışmalıdır. [Docker'ın Ubuntu tarifi](https://docs.docker.com/engine/install/ubuntu/)
4. Yerel `deploy/local.json.example` dosyasını `deploy/local.json` olarak kopyala ve SSH takma adını gir. Docker Desktop Linux konteyner modunda açık olmalı. Medya için Windows'ta `rclone` kullanılır. Betik Windows OpenSSH'nin aynı anahtarını ve doğrulanmış host kaydını kullanır. [Rclone Windows kurulumu](https://rclone.org/install/) · [Rclone SFTP](https://rclone.org/sftp/)
5. Önce [medya listesini](vps-yayini.md) hazırla ve `Ivme Medya Gonder.bat` ile doğrulanmış klasörü aktar. V104 dökümünü yüklemek için V103 ve V104 dahil, DB geçmişiyle eşleşen kodu yerel `test` dalında gözden geçir. Sonraki bölümdeki ilk kurulum komutuyla veriyi yükle. Canlı geçiş için kaynak yazılarını durdurduktan sonra son dökümü al. İlk restore boş veritabanında, tek işlemde yapılır.

## Bir tıklama

Yerel `test` dalında IDE'nin Git panelinden yayına girecek dosyaları stage et. Ardından **Ivme Yayinla.bat** dosyasına çift tıkla. Betik seçili değişiklikleri commit eder ve imajı bu commit'ten oluşturur. Stage edilmemiş dosyalar yerelde kalır. Çalışma alanı temizse düğme son commit ile devam eder. Taslaklar açıkken mevcut commit'i yayımlamak için `--committed` kullan.

```powershell
python -X utf8 deploy/release.py --preview
python -X utf8 deploy/release.py --restore "D:\private\ivme.dump"
```

`--preview` commit edilmiş kodla Linux imajını ve üretim testlerini çalıştırır. SSH ve push gerektirmez. İlk yükleme `ivme.dump.sha256` dosyasını aynı dizinde bekler ve kodda dökümdeki Flyway göçleri bulunuyorsa devam eder. Medyayı daha önce yükle. İlk tam yayından sonraki sürümlerde `--restore` kullanmadan düğmeye bas.

Yayın GitHub `production` dalının ucunu alır ve yerel `test` ile birleştirilen sürümü derler. İmaj Linux amd64 olarak commit SHA'sıyla etiketlenir. Ön yüz derlemesi ile PDF, görsel ve kaynak çözümleme testleri yerelde Docker içinde çalışır. V104 prova imajı SSH aktarımında yaklaşık 220 MB ölçüldü. GitHub'a kod fast-forward olarak push edilir, aynı SHA ve imaj VPS'de doğrulanır. Ücretli registry veya CI gerekmez. GitHub herkese açık olduğu için öğrenci verisi, medya, dökümler ve ortam ayarları özel SSH aktarımında tutulur.

VPS eşzamanlı yayınları kilitler. Göç varsa uygulama durur ve PostgreSQL yedeği doğrulandıktan sonra Flyway uygulanır. Yeni konteynerin sağlık durumu ve `app-version.txt` dosyası doğrulanır. Başlatma başarısızsa veritabanıyla uyumlu önceki imaj denenir. Şema değişmişse önceki şemaya dönüş elle planlanır ve öğrenci kayıtları korunur. İmaj aktarıldıktan veya kod push edildikten sonra bağlantı koptuysa aynı düğme tekrar kullanılabilir.

## Medya, Cloudflare ve sonraki projeler

- Medya paketi ayrı güncellenir. `Ivme Medya Gonder.bat` ile önceki doğrulanmış manifest klasörünü seçebilir ya da yerel içerik değiştiğinde `python deploy/assets.py WORKSPACE PRIVATE_OUTPUT` ile yenisini oluşturabilirsin. Rclone değişen veya eksik dosyaları gönderir, VPS SHA-256 listesini denetler ve PDF yol listesini en son etkinleştirir. Java yeni katalog yollarını yeniden başladığında okur.
- Kaynak PDF küçültmede önce [16.03 kaynak kurallarını](../plan/16-ogrenme-kalitesi.md#silme-kuralları) uygula. Yayımdan kaldırıldığı DB'de kaydedilmiş PDF'lerin SHA-256 listesini `learning_catalog.pdf_archive` tablosundan alıp `--archived-pdf-shas` ile manifestten çıkarabilirsin. Medya kopyası sunucudaki mevcut dosyaları silmez. Disk temizliği ilgili canlı PDF bağlantıları ve geri yüklenebilir yedek doğrulandıktan sonra ayrı yürütülür.
- Ubuntu'da Cloudflare Tunnel'ın `cloudflared` servisini kur. İvme için `net.ivme.dev → http://127.0.0.1:1010` rotasını uçtan uca doğrula. PostgreSQL Compose ağı içinde kalır. Büyük özel aktarım SSH/SFTP üzerinden yapılır. [Cloudflare Tunnel yönlendirme](https://developers.cloudflare.com/tunnel/concepts/routing/)
- Diğer projeler için ayrı Compose proje adı, `/srv/<proje>` dizini, veritabanı/volume, ortam dosyası ve loopback portu kullan. Aynı Cloudflare tünelinde her projeye ayrı alt alan adı ver. İvme örneği localhost 1010, ikinci site 1020 olabilir. Sunucu doluluğunu `df -h`, konteyner disk kullanımını `docker system df` ile izle. Düzenli DB dökümlerini şifreli olarak VPS dışına kopyala ve geri yükleme dene.
