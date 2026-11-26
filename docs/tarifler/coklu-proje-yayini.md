# Contabo’da dört proje

## 1. Adresler ve portlar

| Proje | Windows geliştirme | VPS’de uygulama | HTTPS |
|---|---|---|---|
| İvme | `localhost:1010` | `127.0.0.1:1010` | `net.ivme.dev` |
| Wrestling | `localhost:1011` | `127.0.0.1:1011` | `wrestling.ivme.dev` |
| Arapça | `localhost:1012` | `127.0.0.1:1012` | `arabic.ivme.dev` |
| PrepExpert | `localhost:1013` | `127.0.0.1:1013` | `prepexpert.ivme.dev` |

Cloudflare’ın `ivme-contabo` tüneli HTTPS isteklerini tablodaki VPS portlarına taşır. Tarayıcı HTTPS adresini kullanır. PostgreSQL konteynerleri kendi Compose ağlarında çalışır. İvme’nin isteğe bağlı Vite ön yüzü `1110`, Wrestling’in iç geliştirme API’si `8085`, Arapça’nın Vite geliştirme API’si `1112` kullanır.

## 2. Yerelde açma ve hesap değiştirme

İvme için `Ivme Baslat.bat`, Wrestling için `start.ps1`, Arapça için `Arapca Baslat.bat`, PrepExpert için `start-sat.bat` kullan. Yerel uygulamalar sırasıyla `ivme_local`, `wrestling_club_local`, `arapca_local` ve `sat_local` veritabanlarına yazar. Portlar yalnız bu bilgisayardan erişilir.

Wrestling, Arapça ve PrepExpert ilk yerel açılışta bir öğrenci hesabı kullanır. Üstteki düğmeler projedeki rollere geçer. Yetki denemeleri için ayrı yerel hesaplar oluşturulur. Üretim profili mevcut kullanıcı hesabıyla oturum açmayı gerektirir.

## 3. Değişikliği yayımlama

1. Projeyi yerel `test` dalında test et ve yayına girecek dosyaları VS Code’da Stage et.
2. Docker Desktop açıkken proje kökündeki `Yayinla.bat` dosyasına çift tıkla. İvme’nin düğmesi `Ivme Yayinla.bat`. Diğer üç düğme bu çalışma alanındaki ortak `deploy/project_release.py` betiğini çağırır.
3. Betik dosyaları commit eder, aynı commit’ten Linux imajı oluşturur, GitHub `production` dalını günceller ve imajı SSH üzerinden VPS’ye gönderir. Sunucu yeni konteynerlerin sağlık kontrolünü tamamladıktan sonra çalışan sürümü kaydeder. `--committed` yalnız son commit’i kullanır.

Her proje `/srv/<proje>` altında kendi ortam dosyalarını, kalıcı veritabanı volume’unu, sürümlerini ve yedeklerini tutar. Veri dosyaları ve ilk yedek özel SSH aktarımıyla gider. Rutin yayın mevcut PostgreSQL volume’unu kullanır. İlk taşıma için `--restore` ve doğrulanmış döküm gerekir.

## 4. Veri kapsamı

Wrestling ve Arapça’nın hesapları ve çalışma kayıtları PostgreSQL ile taşınır. Kullanıcılar yeni sunucuda tekrar giriş yapar. PrepExpert’in uygulaması, hesapları ve yayımlanabilir içerik paketi taşınır. Dondurulmuş Bank 1 ve kişisel haklarla sınırlı aktarımlar yerel kalır. Wrestling’in aile kayıt e-postaları için üretim SMTP ayarları gerekir.
