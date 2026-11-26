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

1. Projeyi yerel `test` dalında test et ve yayına girecek dosyaları VS Code’da Stage et.
2. Docker Desktop açıkken proje kökündeki `Yayinla.bat` dosyasına çift tıkla. İvme’nin düğmesi `Ivme Yayinla.bat`. Diğer üç düğme bu çalışma alanındaki ortak `deploy/project_release.py` betiğini çağırır.
3. Betik dosyaları commit eder, aynı commit’ten Linux imajı oluşturur, GitHub `production` dalını günceller ve imajı SSH üzerinden VPS’ye gönderir. Sunucu yeni konteynerlerin sağlık kontrolünü tamamladıktan sonra çalışan sürümü kaydeder. `--committed` yalnız son commit’i kullanır.

Dört projenin normal çalışma dalı yerel `test`, yayın dalı GitHub’daki `production`. `git commit` değişikliği yerel tarihe kaydeder. `git push` komutu seçili uzak Git dalını günceller. Contabo güncellemesi için `Yayinla.bat` imajı da kurar. Git dalı, Docker imajı ve öğrenci veritabanı farklı işlevlere sahiptir.

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
