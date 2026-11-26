# Contabo’da dört proje

## 1. Adresler ve portlar

| Proje | Windows geliştirme | VPS’de uygulama | HTTPS |
|---|---|---|---|
| İvme | `localhost:1010` | `127.0.0.1:1010` | `net.ivme.dev` |
| Wrestling | `localhost:1011` | `127.0.0.1:1011` | `wrestling.ivme.dev` |
| Arapça | `localhost:1012` | `127.0.0.1:1012` | `arabic.ivme.dev` |
| PrepExpert | `localhost:1013` | `127.0.0.1:1013` | `prepexpert.ivme.dev` |

Cloudflare’ın `ivme-contabo` tüneli HTTPS isteklerini tablodaki VPS portlarına taşır. Tarayıcı HTTPS adresini kullanır. PostgreSQL konteynerleri kendi Compose ağlarında çalışır. İvme’nin isteğe bağlı Vite ön yüzü `1110`, Wrestling’in iç geliştirme API’si `8085`, Arapça’nın Vite geliştirme API’si `1112` kullanır.

Dört uygulama ve ilk güncelleme sonrasında VPS ölçümü 71 GiB kullanılmış disk, 123 GiB kullanılabilir disk ve 9,4 GiB kullanılabilir bellek gösterdi.

## 2. Yerelde açma ve hesap değiştirme

İvme için `Ivme Baslat.bat`, Wrestling için `start.ps1`, Arapça için `Arapca Baslat.bat`, PrepExpert için `start-sat.bat` kullan. Yerel uygulamalar sırasıyla `ivme_local`, `wrestling_club_local`, `arapca_local` ve `sat_local` veritabanlarına yazar. Portlar yalnız bu bilgisayardan erişilir.

Wrestling, Arapça ve PrepExpert ilk yerel açılışta bir öğrenci hesabı kullanır. Üstteki düğmeler projedeki rollere geçer. Yetki denemeleri için ayrı yerel hesaplar oluşturulur. Üretim profili mevcut kullanıcı hesabıyla oturum açmayı gerektirir.

## 3. Değişikliği yayımlama

1. Yerel `test` dalında kodu değiştir ve uygulamayı dene. Yayınlanacak dosyaları seçip commit et. Commit bilgisayarda kalır.
2. Docker Desktop açıkken proje dizininde `git push` çalıştır. Bu bilgisayarda her projenin Git ayarı yerel `test` dalını GitHub’daki `production` dalına gönderir. VS Code Stage işleminden sonra yayın düğmesi de aynı işlemi yapar.
3. Git’in `.githooks/pre-push` denetimi yalnız commit içeriğinden Linux imajlarını derler. İvme depolama testlerini, Wrestling iki Java birim test sınıfını, Arapça müfredat kontrolü ve npm testlerini, PrepExpert npm testlerini çalıştırır. Bir test hata verirse GitHub güncellenmez. Geçen imajlar SHA etiketiyle SSH üzerinden VPS’ye hazırlanır.
4. Contabo’daki `tested-release@PROJE.timer` yaklaşık 45 saniyede bir hazırlanmış bir aday var mı diye bakar. GitHub production ucuyla eşleşirse kalıcı PostgreSQL volume’unu kullanarak o sürümü çalıştırır. Sağlık kontrolünden sonra /srv/PROJE/current.sha güncellenir. Push tamamlandıktan sonra bilgisayar kapatılabilir. Hazırlanmamış bir commit (ör. GitHub web arayüzünden yapılan değişiklik) dağıtılmaz. Yayını doğrulamak için `ssh ivme-vps cat /srv/PROJE/current.sha` ile `git rev-parse HEAD` sonuçlarını karşılaştır.
5. Yeni Windows klonunda aynı çalışma alanı dizinlerini kullan. Dört depoda `git config core.hooksPath .githooks` ve `git config remote.origin.push refs/heads/test:refs/heads/production` çalıştır (İvme için origin yerine ivme). SSH anahtarı ve sunucu parmak izi bu bilgisayarda ayrıca tanımlanır. Dağıtım, yedek ve Docker işlemleri VPS’deki servis hesabına aittir. Üç özel GitHub deposunun VPS anahtarları yalnız okuma yetkilidir.

Her proje `/srv/<proje>` altında kendi ortam dosyalarını, kalıcı veritabanı volume’unu, sürümlerini ve yedeklerini tutar. Veri dosyaları ve ilk yedek özel SSH aktarımıyla gider. Rutin yayın mevcut PostgreSQL volume’unu kullanır. İlk taşıma için `--restore` ve doğrulanmış döküm gerekir.

Wrestling, Arapça ve PrepExpert günlük PostgreSQL yedekleri `ivme-project-backup@<proje>.timer` ile alınır. İlk yedekler SHA-256 kontrolünden geçti. Dönen günlük dosyalar `/srv/<proje>/backup/daily` altındadır. İlk taşıma dökümleri o projenin `backup` dizininde ayrıca saklanır.

## 4. Veri kapsamı

Wrestling ve Arapça’nın hesapları ve çalışma kayıtları PostgreSQL ile taşındı. Kullanıcılar yeni sunucuda tekrar giriş yapar. PrepExpert’in uygulaması, hesapları ve yayımlanabilir içerik paketi taşındı. Dondurulmuş Bank 1, özel olarak işaretli Bank 2 ve onlarla ilişkili olabilecek kişisel çalışma geçmişi yerel kopyada durur. Wrestling’in aile kayıt e-postaları için üretim SMTP ayarları gerekir.

## 5. Üretim hareketlerini Windows’ta izleme

### 5.1. Otomatik güncelleme

Windows’a girişte ve oturum açıkken iki saatte bir `Ivme-ProductionDataMirror` görevi çalışır. Görev Contabo’dan SSH üzerinden o andaki hareket kayıtlarını okur. Bir süre bağlantı kurulamazsa beşer dakika arayla üç kez yeniden dener. Bir projenin kopyası ancak o projeye ait tüm tablolar başarıyla geldikten sonra yenilenir.

Yerel PostgreSQL 18’de `production_izleme` veritabanını aç. Bu veritabanı varsayılan olarak salt okunur. `ivme`, `wrestling`, `arapca`, `prepexpert` şemalarından tablo seçebilirsin. Şifreler, oturum belirteçleri, iletişim ve sağlık bilgileri ve soru arşivleri kopyaya alınmaz. Geliştirme uygulamaları kendi yerel veritabanlarını kullanır. Windows’taki değişiklikler Contabo’ya geri gönderilmez.

### 5.2. Sorgulama ve elle yenileme

pgAdmin’de `localhost:5432` bağlantısındaki `production_izleme` veritabanında şu sorguları çalıştırabilirsin.

```sql
SELECT * FROM ivme.ogrenci_cozumleri ORDER BY created_at DESC LIMIT 30;
SELECT * FROM arapca.daily_activity ORDER BY day DESC LIMIT 30;
SELECT * FROM wrestling.weekly_student_progress ORDER BY week_start DESC LIMIT 30;
SELECT * FROM prepexpert.learner_records ORDER BY updated_at DESC LIMIT 30;
SELECT * FROM ivme.sync_status;
```

Son yenileme saatini her şemanın `sync_status` tablosunda görürsün. PowerShell’de elle yenilemek için `Start-ScheduledTask -TaskName Ivme-ProductionDataMirror` çalıştır. Sonuç `%LOCALAPPDATA%\IvmeProductionMirror\last-sync.log` dosyasına yazılır. Görevi yeniden kurmak için İvme uygulama dizininde `powershell -ExecutionPolicy Bypass -File deploy/production-mirror.ps1 -Install` çalıştır.

## 6. Gerçek verilerle yerel uygulama testi

1. Windows girişinde yenilenen salt okunur etkinlik görünümü için 5. bölümü kullan. Yerel uygulamanın yazılabilir çalışma kopyası ayrı bir PostgreSQL 18 konteynerindedir. Docker Desktop açıkken proje başlatıcısını kullan. PostgreSQL portu yalnız bilgisayarın kendisinden erişilebilir (`127.0.0.1:55432`). Proje başına ayrı veritabanı ve giriş rolü bulunur. Yerel bağlantı parolaları Windows hesabının DPAPI anahtarıyla korunur.
2. İlk kopya veya güncelleme için ilgili uygulamanın yerel sunucusunu kapatıp `Refresh local test data.bat` çalıştır. Betik Contabo’dan tutarlı bir PostgreSQL anlık görüntüsü alır, şemayı ve seçilmiş verileri yeni yerel veritabanına yükler ve tüm ilişkileri kurar. Yenileme başarısızsa veya eski kopyada açık bağlantı varsa mevcut kopya korunur. Başarılı değişimde önceki kopya aynı konteynerde `saved_PROJE_ZAMAN` adıyla kalır. Bu kopyalar zamanla disk tüketir.
3. İvme’de sorular, denemeler, oturumlar ve cevaplar; Wrestling’de üyeler, gruplar, antrenman ve yoklama; Arapça’da müfredat, oturumlar, soru çözümü ve ders ilerlemesi; PrepExpert’te maskeli hesaplar ve yayın şeması kullanılır. Özel SAT içeriği, serbest biçimli öğrenci kayıtları, eski oturum belirteçleri ve gerçek giriş parolaları kopyalanmaz. Üretim hesaplarının yerel adları yapaydır. Geliştirici rol düğmeleri ayrı test kullanıcıları açar. İvme’de büyük araştırma tablolarının satırları yerel test kopyasına alınmaz.
4. Uygulamayı olağan başlangıç dosyasıyla tekrar aç. Yerel bir deneme, kullanıcı veya ilerleme kaydı yalnız test kopyasına yazılır. Orijinal Windows PostgreSQL ve özel SAT çalışma bankası 5432 portunda korunur. Yazılabilir test kopyasının hangi anda yenileneceğini sen seçersin. Son canlı etkinlikleri elle yenilemeden görmek için 5. bölümdeki otomatik görünümü kullan.
5. Şema değişikliği gerekiyorsa projeye yeni bir migration ekle, yerelde dene ve kodla birlikte commit et. Üretimde mevcut veriyi koruyan eklemeli değişiklikler kullan. Eski kolon veya tabloyu kaldırmak ayrı bir geçiş gerektirir. Bir uygulama sürümünün geri alınması veritabanı migration’ını kendiliğinden geri almaz.