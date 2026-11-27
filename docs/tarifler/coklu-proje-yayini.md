# Dört proje: yerel test, yayın ve yedek rehberi

Bu dosya İvme, Wrestling, Arapça ve PrepExpert için tek rehberdir. Diğer belgeler ayrıntı için buraya bağlanır. Önce 1. bölümdeki işleri bitir. Sonra her değişiklikte 3. bölümü izle. Bir şey ters giderse 5. bölüme bak.

Her şeyin durumunu tek komutla görürsün: `D:\workspace\ivme\uygulama\Yayin Durumu.bat`. Bu ekran her proje için yerel sürümü, GitHub'ı, canlı sürümü, siteyi, commit edilmemiş dosyaları ve yedeklerin yaşını gösterir. Eksik bir iş varsa bu rehberin ilgili bölüm numarasını yazar.

**Kelimeler**

- **Commit:** Değişikliğin bilgisayarındaki kaydı. Siteyi değiştirmez.
- **Push:** Commit'leri GitHub'a gönderip yayını başlatır.
- **İmaj:** Uygulamanın sunucuda çalışan paketlenmiş hali.
- **Sunucu:** Contabo'daki VPS. Dört siteyi çalıştırır. Bağlantı adı `ivme-vps`.
- **Yerel kopya:** Gerçek verinin bilgisayarındaki yazılabilir kopyası.
- **Migration:** Veritabanının yapısını değiştiren SQL dosyası.

## 1. Şimdi yapman gerekenler

### 1.1. Yedek kopyalama görevini kur (zorunlu, bir kez)

1. PowerShell aç.
2. `cd D:\workspace\ivme\uygulama` yaz.
3. `powershell -ExecutionPolicy Bypass -File deploy/offsite-backup.ps1 -Install` çalıştır.
4. `Yayin Durumu.bat` aç. "Ivme-OffsiteBackup kurulu değil" satırı artık görünmemeli.

**Neden:** Sunucu her gece veritabanlarını yedekler, ama yedekler aynı sunucuda durur. Sunucu bozulursa veya silinirse yedekler de gider. Bu görev Windows'a girişten 10 dakika sonra ve sonra altı saatte bir çalışır. En yeni yedeği bilgisayarına indirir ve bozuk olmadığını kontrol eder. Küçük veritabanlarını deneme olarak geri yükler. Wrestling'e yüklenen dosyaları da kopyalar.

### 1.2. Commit edilmemiş işlerine karar ver

`Yayin Durumu.bat` her projede kaç dosyanın commit edilmediğini gösterir. Bu dosyalar yayına girmez. Git geçmişinde de olmadıkları için bilgisayar bozulursa kaybolurlar.

1. VS Code'da projeyi aç. Soldan **Source Control** bölümüne geç (Ctrl+Shift+G).
2. Listedeki her dosya için karar ver:
   - **Bitti ve yayına girecek:** Dosyayı stage et (`+`), mesaj yaz, **Commit** et. Sonra 3. bölümdeki 6. adımla yayımla.
   - **Henüz bitmedi:** Dokunma. Push yalnız commit edilmiş işi gönderir.
   - **İstemiyorum:** Sağ tık, **Discard Changes**. Bu işlem geri alınamaz.
3. **Dikkat:** `Yayinla.bat` **Staged Changes** listesindeki her dosyayı commit eder. Yayımlamak istemediğin bir dosya bu listede durmasın.

### 1.3. Wrestling: aile kaydı e-postasını aç

Bir aile siteden kayıt olurken herhangi bir e-posta adresini (Gmail, Outlook, okul adresi vb.) yazabilir. Site o adrese 30 dakika geçerli bir onay bağlantısı gönderir. Gönderen, kulübün Gmail hesabıdır. Sunucuda bu hesabın uygulama parolası yoksa kayıt sayfası "unavailable" hatası verir. Durumu `curl -s https://wrestling.ivme.dev/api/v1/auth/family-signup` gösterir: `"available":true` ise e-posta gönderimi açıktır.

1. Kulüp için yeni, ücretsiz bir Gmail hesabı aç (kişisel hesabını kullanma). Aileler e-postada gönderen olarak "Wylie Lions Wrestling Club" adını görür.
2. Bu hesapta **2 Adımlı Doğrulama**yı aç. Uygulama parolası ancak o zaman oluşturulabilir.
3. Aynı hesapla `https://myaccount.google.com/apppasswords` adresinde "Wrestling" adıyla bir uygulama parolası oluştur. Google 16 harflik bir parola gösterir. Bu, hesabın normal parolası değildir.
4. VS Code terminalinde `cd D:\workspace\wrestling` ve `python deploy/configure-production-gmail.py` çalıştır. Önce kulüp Gmail adresini yaz. Sonra 16 harfi yapıştır ve Enter'a bas. Parola yazarken görünmez, bu normaldir.
5. Betik ayarı sunucuya yazar, Wrestling'in API'sini yeniden başlatır ve sonunda "Done" yazar. Yukarıdaki `curl` komutu artık `"available":true` göstermeli.
6. Kayıt sayfasında kendi e-postanla dene. Bağlantı gelmeli. Gelmezse spam klasörüne bak.

**Neden:** Uygulama parolası gizlidir. Betik onu yalnız şifreli SSH bağlantısıyla sunucudaki ayar dosyasına yazar, bilgisayara veya GitHub'a kaydetmez. Sunucu ayar dosyaları yedeklenmediği için parolayı bir parola yöneticisinde de sakla. Parola çalınırsa Google hesabından silip yenisini oluştur ve 3. adımı tekrarla. Kötüye kullanıma karşı aynı IP'den 30 dakikada en çok 8, aynı adrese saatte en çok 3 e-posta gönderilir. Kişisel Gmail hesapları günde birkaç yüz e-posta gönderebilir, bu da bir kulüp için yeterlidir.

### 1.4. Wrestling: canlı yönetici girişini kontrol et

1. `ssh ivme-vps cat /srv/wrestling/config/first-admin` komutu sunucunun ilk yönetici parolasını gösterir.
2. `https://wrestling.ivme.dev/admin` adresinde `admin@club.local` ve bu parolayla giriş yap.
3. **Admin → Users** bölümünden kendine yeni bir parola ver.

**Neden:** Taşıma sırasında herkesin bildiği geliştirme parolası rastgele bir parolayla değiştirildi. Bu parolayı yalnız sunucu bilir. Kendi parolanı verdikten sonra siteyi yönetmek için sunucuya bağlanman gerekmez. Parolayı daha önce değiştirdiysen bu adımı atla.

### 1.5. Sunucu güvenliği (önerilir)

Contabo'nun Ubuntu kurulumu root kullanıcısıyla SSH girişine izin verir (`PermitRootLogin yes`). Parola girişi kapalı olduğu için şu an yalnız anahtarla girilebiliyor. Aşağıdaki ayar bunu kalıcı yapar. İleride biri parola girişini yanlışlıkla açsa bile root parolayla giremez. `no` seçme: `ivme-deploy` hesabının yönetici (sudo) yetkisi yoktur. Root kapanırsa sunucuya yönetici olarak yalnız Contabo'nun web konsolundan girebilirsin.

1. Root olarak bağlan (`ssh root@SUNUCU_IP` veya Contabo konsolu). Bu pencereyi kapatma.
2. `printf 'PermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/10-ivme.conf` çalıştır. Ubuntu bu klasördeki dosyaları alfabe sırasıyla okur ve ilk değeri kullanır. `10-` adı mevcut `50-cloud-init.conf` dosyasından önce gelir.
3. `sshd -t && systemctl reload ssh` çalıştır.
4. `sshd -T | grep -i permitrootlogin` çıktısı `without-password` olmalı. Bu, `prohibit-password` ile aynı ayardır.
5. Yeni bir pencerede root olarak tekrar bağlanmayı dene. Bağlanabiliyorsan eski pencereyi kapat.

SSH bağlantısı sık kopuyorsa (5.2), root penceresinde `journalctl -u ssh --since today | grep -c "Invalid user"` çalıştır. Sonuç yüzlerce ise internetteki botlar parola deniyor demektir. Sunucu aynı anda açılan çok sayıda yarım bağlantıyı reddeder. Bu senin bağlantını da koparabilir. `apt install fail2ban` bu adresleri bir süre engeller. Kurulumdan sonra `fail2ban-client status sshd` ile çalıştığını doğrula.

## 2. Sistem nasıl çalışır

```
1. Bilgisayar  test dalında commit et, sonra git push
2. Bilgisayar  push kontrolü imajı derler ve testleri çalıştırır
               (hata varsa burada durur; GitHub ve site değişmez)
3. Sunucu      test edilmiş imaj sunucuya yüklenir
4. GitHub      production dalı bu commit'e ilerler
5. Sunucu      en geç bir dakika içinde yedek alır ve yeni sürümü başlatır
6. Sunucu      sağlıklıysa yeni sürüm canlı olur; değilse eski sürüm geri gelir
```

Dört kural her şeyi açıklar:

1. **Yerel işlem canlıya gitmez.** Bilgisayardaki uygulama yalnız yerel kopyaya yazar. Denemelerin gerçek üyelerin ve öğrencilerin kayıtlarını bozamaz. Bu yüzden yerelde veritabanına eklediğin içerik de canlıya gitmez. Canlıda olması gereken veri ya bir migration dosyasıyla kodla birlikte gider, ya da canlı sitenin yönetici ekranından girilir. İvme'nin soruları kendi [aktarım tarifiyle](soru-aktarma.md) gider.
2. **Commit serbest, push yayındır.** Commit bilgisayarda kalır, istediğin kadar yapabilirsin. Push yayını başlatır.
3. **Test geçmeyen kod GitHub'a gitmez.** Push önce sunucudakiyle aynı Linux imajını derler ve testleri çalıştırır. Hatalı kod siteye ulaşmadan durur. Sunucu da yalnız bu kontrolden geçmiş imajı çalıştırır.
4. **Veri kaybolmaz.** Her yayından önce ve her gece yedek alınır. Yedeklerin kopyası bilgisayarında durur. Yeni sürüm sağlıksızsa eski sürüm geri gelir. Tek sınır şudur: eski sürüme dönmek veritabanı değişikliğini geri almaz. Bu yüzden 3. bölümdeki migration kuralları önemlidir.

## 3. Her değişiklikte izlenecek adımlar (dört projede aynı)

1. **Docker Desktop'ı aç** ve tamamen açılmasını bekle. Yerel veritabanı ve push kontrolü Docker içinde çalışır.
2. **Gerçek veriyi tazele (isteğe bağlı).** Önce projenin yerel uygulamasını kapat (4. bölümde "Kapat" satırı). Sonra proje klasöründe `Refresh local test data.bat` dosyasına çift tıkla. Yerel kopya, yenilediğin andaki canlı veridir ve kendiliğinden güncellenmez. Uygulama açıksa betik hemen durur ve hiçbir şeyi değiştirmez. Başarılı yenilemede önceki kopya `saved_<proje>_<zaman>` adıyla saklanır. Bu eski kopyalar zamanla disk kaplar.
3. **Uygulamayı başlat** (4. bölümde "Başlat" satırı).
4. **Kodu değiştir ve tarayıcıda dene.** Üstteki hesap düğmeleri ayrı yerel test hesaplarıyla farklı rolleri açar.
5. **Commit et.** VS Code'da Source Control bölümünde dosyaları stage et, mesaj yaz, Commit'e bas. Sol alt köşede dal adı `test` olmalı.
6. **Yayımla.** Proje klasöründe `git push` çalıştır. Ya da `Yayinla.bat` dosyasına çift tıkla. Bu dosya stage edilmiş dosyaları commit eder, sonra push eder. Push, derleme ve testler yüzünden birkaç dakika sürer. Pencereyi kapatma. Hata çıkarsa 5.1 ve 5.2'ye bak.
7. **Doğrula.** `Yayin Durumu.bat` aç. Projenin satırında `TAMAM` görmelisin. `BEKLİYOR` görürsen bir dakika sonra tekrar bak. Push bittikten sonra bilgisayarı kapatabilirsin. Kalan işi sunucu kendisi yapar.

**Migration kuralları (veritabanı yapısı değişiyorsa)**

- **Yeni dosya ekle, eskisini değiştirme.** İvme ve Wrestling'de sunucu, daha önce uygulanmış bir dosyanın değiştiğini görünce yayını durdurur. Arapça'da değişen eski dosya, onu önceden çalıştırmış canlı veritabanına hiç uygulanmaz.
- **PrepExpert'te her komut tekrar çalışabilmeli.** PrepExpert her yayında bütün migration dosyalarını baştan ve tek işlemde çalıştırır. Bu yüzden `CREATE TABLE IF NOT EXISTS` ve `ADD COLUMN IF NOT EXISTS` gibi komutlar kullan. Bir komut hata verirse hiçbiri uygulanmaz ve eski sürüm çalışmaya devam eder.
- **Önce ekle, sonra kaldır.** Yeni bir kolon veya tablo bir yayında eklenir. Eskisini silmek sonraki, ayrı bir yayında yapılır. Yeni sürüm sağlıksız olursa sunucu eski sürüme döner ve eski sürüm eski kolonları arar. Kolon silinmişse eski sürüm de çalışmaz.
- **Veri silen veya dönüştüren bir migration'ı önce yerel kopyada dene** ve sonucu tabloda kontrol et.

## 4. Projeye göre bilgiler

Yerel adresler yalnız bu bilgisayardan açılır. Bütün yerel kopyalar aynı PostgreSQL 18 konteynerindedir (`127.0.0.1:55432`). Her projenin kendi veritabanı ve kendi giriş hesabı vardır. Bu hesapların parolaları Windows hesabının anahtarıyla şifreli saklanır.

Arka planda çalışan bir uygulamayı kapatmak için PowerShell'de şu komutu kullan. Port numarasını tablodaki değerle değiştir:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 1012 | ForEach-Object { Stop-Process -Id $_.OwningProcess }
```

### 4.1. İvme

| | |
|---|---|
| Klasör | `D:\workspace\ivme\uygulama` |
| Başlat | `D:\workspace\ivme\Ivme Baslat.bat` |
| Yerel adres | `http://localhost:1010` (geliştirme: Vite `1110`, API `8081`) |
| Kapat | Yukarıdaki komut, port `1010,8081` |
| Canlı site | `https://net.ivme.dev` |
| Yerel veritabanı | `ivme_local` |
| Push'ta çalışan kontrol | Ön yüz derlemesi ve üç Java testi (görsel depolama, kaynak dosya bulma, konu PDF'i) |
| Migration klasörü | `backend/src/main/resources/db/migration` (Flyway, `V<sayı>__ad.sql`) |
| Yayımla | `git push` veya `Ivme Yayinla.bat` |

- **Medya ayrı gider.** Soru görselleri ve PDF'ler Git'te değildir ve push ile gitmez. Çünkü GitHub deposu herkese açıktır. Yeni medya için `Ivme Medya Gonder.bat` kullan ([medya tarifi](tek-tikla-yayin.md#medya-cloudflare-ve-sonraki-projeler)).
- **Migration'lı yayın siteyi kısa süre kapatır.** Sunucu yayından önce yedeği yalnız yeni migration varsa alır, çünkü İvme veritabanı büyüktür. Bu sırada site kapalı kalır. Böyle bir yayını yoğun olmayan bir saatte yap.
- Yerel kopyaya büyük araştırma tablolarının satırları gelmez. Uygulamayı çalıştırma ayrıntıları [çalıştırma tarifindedir](calistirma-ve-yayin.md).

### 4.2. Wrestling

| | |
|---|---|
| Klasör | `D:\workspace\wrestling` |
| Başlat | PowerShell'de `.\start.ps1` (API ve ön yüz için iki pencere açar) |
| Yerel adres | `http://localhost:1011` (API `8085`) |
| Kapat | Açılan iki pencereyi kapat |
| Canlı site | `https://wrestling.ivme.dev` |
| Yerel veritabanı | `wrestling_club_local` |
| Push'ta çalışan kontrol | Java ve ön yüz derlemesi, iki hızlı birim testi (yaş grubu, adres kısa adı) |
| Migration klasörü | `backend/src/main/resources/db/migration` (Flyway) |
| Yayımla | `git push` veya `Yayinla.bat` |

- **Yerel kopyada kişisel bilgi yoktur.** Üyelerin çoğu çocuktur. Bu yüzden adlar yapaydır. Doğum tarihleri, veli iletişim bilgileri, gelişim notları ve parolalar kopyalanmaz. Kimlikler ve kulübün yapısı (gruplar, antrenmanlar, yoklama, sıklet ve üyelik planları) gerçektir.
- **Push yalnız iki hızlı test çalıştırır.** Büyük bir değişiklikten önce `cd backend` ve `.\mvnw test` ile tam testleri çalıştır (Docker gerekir).
- **Yüklenen dosyalar ayrıca yedeklenir.** Sitedeki yüklemeler (`/srv/wrestling/data/uploads`) veritabanı yedeğinde değildir. Onları 1.1'deki görev kopyalar.
- Aile kaydı için 1.3'e, yönetici girişi için 1.4'e bak.

### 4.3. Arapça

| | |
|---|---|
| Klasör | `D:\workspace\Arapca` |
| Başlat | `Arapca Baslat.bat` (sunucu arka planda çalışır) |
| Yerel adres | `http://localhost:1012` (`npm run dev` ile API `1112`) |
| Kapat | Yukarıdaki komut, port `1012,1112` |
| Canlı site | `https://arabic.ivme.dev` |
| Yerel veritabanı | `arapca_local` |
| Push'ta çalışan kontrol | `npm run build`, `npm run check:curriculum` (müfredat bütünlüğü), `npm test` |
| Migration klasörü | `server/migrations` (sıradaki numarayla, ör. `003_ad.sql`) |
| Yayımla | `git push` veya `Yayinla.bat` |

- Müfredat ve soru bankası koddaki dosyalardan üretilir. Sunucu açılışta bunları veritabanıyla eşitler. Müfredat değişikliği bu yüzden normal push ile gider.
- Yerel kopyada hesap adları yapaydır. Parolalar ve oturum bilgileri kopyalanmaz.

### 4.4. PrepExpert

| | |
|---|---|
| Klasör | `D:\workspace\PrepExpert` |
| Başlat | `start-sat.bat` |
| Yerel adres | `http://localhost:1013` |
| Kapat | Açılan pencereyi kapat veya Ctrl+C |
| Canlı site | `https://prepexpert.ivme.dev` |
| Yerel veritabanı | `sat_local` |
| Push'ta çalışan kontrol | İmaj içinde `npm run db:migrate` ve `npm test`, geçici bir PostgreSQL 18 ile |
| Migration klasörü | `kit/engine/migrations` (her yayında hepsi yeniden çalışır, 3. bölüm) |
| Yayımla | `git push` veya `Yayinla.bat` |

- **Özel içerik bilgisayarda kalır.** Bank 1, Bank 2 ve özel SAT içeriği yalnız `localhost:5432` üzerindeki kendi veritabanındadır ve yayına gitmez. Push kontrolü `private/` klasörünü, PDF'leri, `.env` dosyalarını, veritabanı ve döküm dosyalarını reddeder. Bunun nedeni telif hakları ve kişisel çalışma geçmişidir.
- Yerel kopyada hesaplar maskelidir: sahte e-posta, parola yok. Öğrenci kayıtları kopyalanmaz.

## 5. Bir şey ters giderse

### 5.1. Push bir testte durdu

Kod GitHub'a gitmedi ve site değişmedi. Hiçbir şey bozulmadı. Hata mesajının son satırlarını oku. Kodu düzelt, yeni bir commit yap ve tekrar push et. Docker Desktop kapalıysa push burada da durur. Docker'ı açıp tekrar dene.

### 5.2. Bağlantı hatası

Belirtiler "Connection closed", "kex_exchange_identification" veya "Could not read from remote repository" mesajlarıdır. Push her sunucu adımını üç kez dener. Üçü de başarısız olduysa GitHub güncellenmemiştir. Bir dakika bekle ve `git push` komutunu tekrar çalıştır. Aynı commit'i tekrar göndermek güvenlidir. Bu sık oluyorsa 1.5'in son paragrafına bak.

### 5.3. Durum ekranı "HAZIRLIK YOK" diyor

Commit GitHub'da var, ama sunucuda bu commit'in test edilmiş imajı yok. Bu genelde push kontrolü atlandığında olur (`--no-verify`). Sunucu test edilmemiş kodu bilerek çalıştırmaz. Proje klasöründe `git commit --allow-empty -m "Yeniden yayımla"` ve ardından `git push` çalıştır. Yeni commit kontrolden geçer ve sunucu onu başlatır.

### 5.4. Durum ekranı "HATA" diyor

Sunucu yeni sürümü başlattı, ama sürüm sağlık kontrolünden geçmedi. Önceki sürüm geri getirildi ve site çalışıyor. Yayından önce alınan yedek `/srv/<proje>/backup/pre-release-*.dump` dosyasındadır. Sunucu aynı commit'i kendiliğinden bir daha denemez. Hata bir migration'dan geliyorsa tekrar denemek veriyi daha da bozabilir. Önce bir insanın bakması gerekir.

1. Sunucunun ne yaptığını oku: `ssh ivme-vps journalctl -u tested-release@<proje> -n 80 --no-pager`.
2. Hatayı yerelde tekrar üret. Gerçek veriyi tazele (3. bölüm, 2. adım) ve uygulamayı aç. Migration hataları genelde burada da görünür.
3. Düzelt, yeni bir commit yap ve push et. Her yeni commit yeni bir denemedir.
4. Kod doğruysa ve sorun geçici bir sunucu hatasıysa (ör. disk doluydu), aynı commit'i tekrar denetebilirsin. `ssh ivme-vps ls /srv/<proje>/tested` ile `.failed` dosyasının adını gör. Sonra `ssh ivme-vps rm /srv/<proje>/tested/<sha>.failed` ile sil. Sunucu bir dakika içinde yeniden dener.

### 5.5. Durum ekranı "FARKLI" diyor

GitHub'daki production dalında, yerel `test` dalında olmayan bir commit var. Bu genelde GitHub web sitesinde dosya düzenlenince olur. Sunucu bu commit'i çalıştırmaz, `git push` da reddedilir. Proje klasöründe `git fetch origin production` ve `git merge FETCH_HEAD` çalıştır. İvme'de `origin` yerine `ivme` yaz. Sonra yerelde dene ve push et. Production dalını GitHub'da doğrudan düzenleme.

### 5.6. Site açılmıyor veya ayar değişti

1. `ssh ivme-vps docker ps --format "{{.Names}} {{.Status}}"` çalıştır. Projenin konteynerleri `Up` ve `healthy` olmalı.
2. Konteynerler sağlıklı ama site açılmıyorsa sorun Cloudflare tünelindedir. Root olarak `systemctl status ivme-cloudflared` ile bak.
3. Çalışan sürümü yeniden başlatmak için (ör. 1.3'teki ayar değişikliğinden sonra) aşağıdaki komutlardan birini kullan. Bu komutlar yeni kod getirmez. Sunucu kilitli bir yayın yapıyorsa komut hemen çıkar. Bir dakika sonra tekrar dene.

```sh
ssh ivme-vps 'sh /opt/ivme-release/project-server.sh wrestling "$(cat /srv/wrestling/current.sha)" release'
ssh ivme-vps 'sh /opt/ivme-release/vps.sh release "$(cat /srv/ivme/current.sha)"'
```

İlk satırda `wrestling` yerine `arapca` veya `prepexpert` yazabilirsin. İkinci satır İvme içindir.

## 6. Yedekler ve veriyi geri alma

| Yedek | Ne zaman | Nerede | Kaç tane |
|---|---|---|---|
| Günlük | Her gece: İvme 04.30, diğerleri 05.15 (Türkiye saati) | Sunucu, `/srv/<proje>/backup/daily` | 7, haftanın her günü için bir |
| Yayın öncesi | Her yayından önce (İvme'de yalnız migration varsa) | Sunucu, `/srv/<proje>/backup/pre-release-*.dump` | Son 30 günün hepsi ve her zaman en yeni 10 (İvme'de 3) |
| İlk taşıma | Bir kez | Sunucu, `/srv/<proje>/backup` | Silinmez |
| Bilgisayar kopyası | Altı saatte bir (1.1) | `D:\workspace\ivme\yedekler\contabo-gunluk\<proje>` | İvme 3, diğerleri 14 |
| Wrestling yüklemeleri | Altı saatte bir (1.1) | Aynı klasörde `wrestling\uploads` | Sunucuda silinenler burada kalır |

Her döküm SHA-256 özetiyle ve PostgreSQL arşiv listesiyle doğrulanır. Docker açıksa Wrestling, Arapça ve PrepExpert kopyaları bilgisayarda deneme olarak geri yüklenir. Kopya klasörüne yalnız senin Windows hesabın ve sistem erişir. Dosya adındaki saat, yedeğin alındığı UTC saattir. Kayıtlar `%LOCALAPPDATA%\IvmeProductionMirror\offsite-backup.log` dosyasına yazılır.

### 6.1. Silinen bir kaydı geri bulmak

1. Docker Desktop açık olsun. `cd D:\workspace\ivme\uygulama` yaz.
2. `python deploy/offsite_backup.py --inspect wrestling` çalıştır. En yeni kopya `inceleme_wrestling` adlı ayrı bir veritabanına yüklenir. Daha eski bir kopya için klasördeki dosya adını ekle: `--file wrestling-YYYYMMDDTHHMMSSZ.dump`.
3. `docker exec -it ivme-development-postgres psql -U postgres -d inceleme_wrestling` ile içine bak ve aradığın satırı bul.
4. Bulduğun bilgiyi canlı sitenin yönetici ekranından tekrar gir. Canlı veritabanına doğrudan SQL yazma, çünkü uygulama ekranı ilişkileri ve kuralları korur.
5. İş bitince `docker exec ivme-development-postgres dropdb -U postgres inceleme_wrestling` ile sil. Bu kopya maskesizdir ve gerçek kişisel bilgiler içerir.

Bütün bir veritabanını canlıda geri yüklemek nadir ve büyük bir iştir. Önce o anki durumun yedeğini al. Ardından [VPS işletimi tarifindeki](vps-yayini.md) ilk taşıma adımlarını boş bir veritabanıyla uygula.

## 7. Kurulum işleri

### 7.1. Windows görevleri

| Görev | Ne yapar | Kurulum |
|---|---|---|
| `Ivme-OffsiteBackup` | Yedekleri bilgisayara kopyalar (6. bölüm) | 1.1 |
| `Ivme-ProductionDataMirror` | Canlı hareket kayıtlarını girişte ve iki saatte bir salt okunur `production_izleme` veritabanına getirir | `powershell -ExecutionPolicy Bypass -File deploy/production-mirror.ps1 -Install` |

`production_izleme`, bilgisayardaki PostgreSQL 18'de (`localhost:5432`) durur ve yalnız okunur. Şifreler, oturum bilgileri, iletişim ve sağlık bilgileri ve soru arşivleri bu kopyaya gelmez. pgAdmin'de şu sorgularla son hareketleri görürsün:

```sql
SELECT * FROM ivme.ogrenci_cozumleri ORDER BY created_at DESC LIMIT 30;
SELECT * FROM arapca.daily_activity ORDER BY day DESC LIMIT 30;
SELECT * FROM wrestling.weekly_student_progress ORDER BY week_start DESC LIMIT 30;
SELECT * FROM prepexpert.learner_records ORDER BY updated_at DESC LIMIT 30;
SELECT * FROM ivme.sync_status;
```

Son yenileme saati her şemanın `sync_status` tablosundadır. Elle yenilemek için `Start-ScheduledTask -TaskName Ivme-ProductionDataMirror` çalıştır. Sonuç `%LOCALAPPDATA%\IvmeProductionMirror\last-sync.log` dosyasına yazılır.

### 7.2. Yeni bilgisayar

1. Git, Docker Desktop, Python 3.12 veya üstü, Node.js 24, Java 21 (İvme), Java 25 (Wrestling) ve PostgreSQL 18 kur.
2. Dört depoyu aynı yollara klonla: `D:\workspace\ivme\uygulama`, `D:\workspace\wrestling`, `D:\workspace\Arapca`, `D:\workspace\PrepExpert`. İvme'yi `git clone -o ivme ...` ile klonla. Betikler birbirini bu yollarla bulur.
3. Her depoda `test` dalını aç ve şu iki ayarı yap. İvme'de `origin` yerine `ivme` yaz. İlk ayar push kontrolünü açar. İkincisi `test` dalını GitHub'daki `production` dalına gönderir.

   ```
   git config core.hooksPath .githooks
   git config remote.origin.push refs/heads/test:refs/heads/production
   ```

4. SSH anahtarını `%USERPROFILE%\.ssh\ivme-vps` olarak koy ve `ivme-vps` adını tanımla ([örnek](tek-tikla-yayin.md#sunucunun-ilk-kurulumu)). İlk bağlantıda sunucunun parmak izini Contabo panelindekiyle karşılaştır.
5. `deploy/local.json.example` dosyasını `deploy/local.json` olarak kopyala. `ssh_host` ve `offsite_backup_dir` değerlerini gir.
6. 7.1'deki iki görevi kur. Her projede `Refresh local test data.bat` çalıştır.
7. `Yayin Durumu.bat` ile her şeyi kontrol et.

### 7.3. Yeni sunucu

1. Ubuntu 24.04 kur ve `deploy/bootstrap-ubuntu.sh` ile hazırla ([sunucunun ilk kurulumu](tek-tikla-yayin.md#sunucunun-ilk-kurulumu)).
2. `deploy/` klasörünü sunucuya kopyala ve `sudo sh install-server.sh` çalıştır. Bu betik yayın ve yedek zamanlayıcılarını kurar.
3. Her proje için ayar dosyalarını `/srv/<proje>/config` altında yeniden oluştur. Bu dosyalar yedeklenmez. Parolalar yeniden üretilir, SMTP gibi elle girilen değerler parola yöneticisinden gelir.
4. Verileri bilgisayardaki en yeni kopyadan yükle. İvme için `python deploy/release.py --restore <dosya>` ([tarif](vps-yayini.md)), diğerleri için `python deploy/project_release.py <proje> --restore <dosya>` kullan. Wrestling yüklemelerini `scp -r` ile `/srv/wrestling/data/uploads` altına geri koy.
5. Cloudflare tünel anahtarını kur ve dört adresi `Yayin Durumu.bat` ile doğrula.

## 8. Başvuru

| Proje | Yerel adres | Sunucuda | Canlı adres |
|---|---|---|---|
| İvme | `localhost:1010` | `127.0.0.1:1010` | `net.ivme.dev` |
| Wrestling | `localhost:1011` | `127.0.0.1:1011` | `wrestling.ivme.dev` |
| Arapça | `localhost:1012` | `127.0.0.1:1012` | `arabic.ivme.dev` |
| PrepExpert | `localhost:1013` | `127.0.0.1:1013` | `prepexpert.ivme.dev` |

Cloudflare'ın `ivme-contabo` tüneli HTTPS isteklerini sunucudaki bu portlara taşır. Veritabanları her projenin kendi Docker ağında kalır ve dışarı açılmaz.

| Zamanlayıcı | Nerede | Ne zaman |
|---|---|---|
| `tested-release@<proje>.timer` | Sunucu | 45 saniyede bir bekleyen aday var mı diye bakar |
| `ivme-db-backup.timer` | Sunucu | Her gece 04.30 (Türkiye saati) |
| `ivme-project-backup@<proje>.timer` | Sunucu | Her gece 05.15 (Türkiye saati) |
| `Ivme-OffsiteBackup` | Bilgisayar | Girişten 10 dakika sonra, sonra altı saatte bir |
| `Ivme-ProductionDataMirror` | Bilgisayar | Girişte, sonra iki saatte bir |

Her push hazırlığının sonunda sunucuda eski imajlar temizlenir. Çalışan sürüm, geri dönüş için en yeni dört imaj, bekleyen adaylar ve `.failed` işaretleri kalır. Yayın öncesi dökümler yalnız 30 günden eskiyse ve en yeni 10 dökümün (İvme'de 3) dışındaysa silinir. Günlük ve ilk taşıma yedekleri bu temizliğe girmez. Silinecekleri önceden görmek için `ssh ivme-vps "DRY_RUN=1 sh -s -- <proje>" < deploy/prune-server.sh` çalıştır.

| Dosya (`deploy/`) | Görevi |
|---|---|
| `status.py` | Durum ekranı (`Yayin Durumu.bat`) |
| `prepare_push.py` | Push kontrolü: derler, test eder, imajı sunucuya hazırlar |
| `local_fixture.py`, `export_fixture.py` | Yerel kopya ve maskeleme kuralları |
| `offsite_backup.py`, `offsite-backup.ps1` | Bilgisayar kopyası ve inceleme (`--inspect`) |
| `reconcile-release.sh`, `project-server.sh`, `vps.sh` | Sunucuda yayın, yedek ve geri dönüş |
| `prune-server.sh` | Sunucu temizliği |
| `install-server.sh`, `*.service`, `*.timer` | Sunucu zamanlayıcılarının kurulumu |

Bütün yayın ve yedek işleri sunucudaki `ivme-deploy` hesabıyla çalışır. Üç özel GitHub deposu için sunucunun anahtarları yalnız okuma yetkilidir.
