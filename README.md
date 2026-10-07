# Hedef YKS — YKS hazırlık web uygulaması (MVP)

Soru bankası, süreli deneme sınavı, sonuç/geçmiş, geri bildirim ve basit yönetim ekranı olan, tarayıcıdan kullanılan bir YKS hazırlık sitesi.
Hedef: 10–50 kişilik ilk deneme; mimari 5.000+ kullanıcıya yeniden yazmadan büyüyebilecek kadar temiz tutuldu (aşırı mühendislik yok).

```
Tarayıcı ──► React (Vite)  ──/api──►  Spring Boot (REST, Spring Security)  ──►  PostgreSQL (Flyway göçleri)
 5173 (dev)                              8081                                      yks_hazirlik
                                           └──► Soru görselleri: yerel klasör (ileride R2/S3)
```

| Katman | Teknoloji |
|---|---|
| Ön yüz | React 19, Vite, JavaScript, react-router, düz duyarlı CSS |
| Arka yüz | Java 21, Spring Boot 3.5, Spring MVC + Security, JPA/Hibernate, Flyway, Maven |
| Veritabanı | PostgreSQL 18 (5 tablo: `users`, `questions`, `exams`, `exam_questions`, `feedback`) |

## Hızlı başlangıç (geliştirme)

Gerekenler: **JDK 21** (`C:\Tools\jdk-21`; başka yerdeyse `JAVA_HOME_YKS` ortam değişkeniyle göster), Maven, Node ≥ 22, çalışan PostgreSQL.

1. **Veritabanı (bir kez):** `veritabani-sifirla.bat` — `root/root` rolünü ve boş `yks_hazirlik` (+ test) veritabanını oluşturur. Tabloları bu betik değil, arka yüz açılırken **Flyway** kurar; pgAdmin'de elle tablo oluşturmak gerekmez.
2. **Çalıştır:** `baslat.bat` (arka yüz + ön yüz + tarayıcı) ya da ayrı ayrı `backend-baslat.bat` ve `frontend-baslat.bat`.
3. Tarayıcı: <http://localhost:5173>. İlk açılışta 50 örnek soru otomatik yüklenir (`ornek-veri\sorular.csv`).

**Geliştirme yöneticisi:** kullanıcı `root`, şifre `root` — yalnız `dev` profilinde (`application-dev.yml`) vardır. Üretimde kullanılmaz (aşağıya bak). Diğer kullanıcılar `/kayit` sayfasından kendi adı ve şifresiyle kayıt olur (e-posta doğrulaması, Google/Apple girişi, MFA yok).

## Özellikler

- Kayıt / giriş / çıkış; roller `USER` ve `ADMIN`; şifreler BCrypt ile saklanır; başlıklar kullanıcı adına göre kişiselleşir.
- **Soru bankası:** sınav türü (TYT/AYT) → ders → konu filtresi; soru görseli, A–E seçimi, cevabı kontrol et, önceki/sonraki soru, video çözüm bağlantısı.
- **Soru değerlendirme:** Kolay/Orta/Zor oyu + 5 yıldız (kullanıcı başına soru başına tek kayıt), "sorun bildir" ve genel görüş formu. Sorularda sabit bir zorluk alanı yoktur; zorluk yalnızca kullanıcı oylarından görünür.
- **Sınav:** filtreye göre rastgele soru, süre sınırı (ya da süresiz), otomatik kayıt (sayfa kapansa da sürer), soru gezgini, süre dolunca otomatik bitirme. Sınav sırasında doğru cevap istemciye **hiç gönderilmez**.
- **Sonuç ve geçmiş:** doğru / yanlış / boş, yüzde, net (D − Y/4), süre, ders bazında kırılım; her kullanıcının sınav geçmişi.
- **Geçmişin doğruluğu:** sınav gönderilirken o anki doğru cevap `exam_questions.correct_answer`'a, sayılar `exams` satırına yazılır. Yönetici bir sorunun doğru cevabını sonradan değiştirse de eski sonuçlar değişmez (testle doğrulanır).
- **QR:** her sorunun kalıcı adresi `{YKS_SITE_ADRESI}/soru/{kod}`; soru sayfasında QR gösterilir (`GET /api/questions/{id}/qr`, anında üretilir, saklanmaz). Adres açılınca giriş sonrası o soruya dönülür.
- **Yönetim** (`/yonetim`, yalnız ADMIN): kullanıcı/soru sayıları, bildirilen sorular, geri bildirimler (çözüldü işaretle), soru görüntüleme + doğru cevap ve künye düzenleme, toplu soru içe aktarma.

## Yönetici şifresini değiştirme

- **Arayüzden (en kolay):** yöneticiyle giriş yap → sağ üstte kullanıcı menüsü → **Hesap** → mevcut + yeni şifre.
- **Üretimde ilk kurulum:** yönetici yalnız `YKS_ADMIN_SIFRE` ortam değişkeni verilirse oluşturulur (en az 10 karakter; kaynak kodda gerçek şifre yoktur). Hesap bir kez oluştuktan sonra bu değişken şifreyi **ezmez**; kaldırabilirsin.
- **Şifre unutulursa:** yeni bir yönetici adıyla aç: `YKS_ADMIN_KULLANICI=yeniyonetici` ve `YKS_ADMIN_SIFRE=...` vererek arka yüzü yeniden başlat (hesap yoksa oluşturulur); sonra eski yöneticiyi `UPDATE users SET role = 'USER' WHERE username = '...'` ile düşürebilirsin.

## Soruları ekleme ve güncelleme (içe aktarma)

Yönetim → **İçe aktar** (ya da `POST /api/admin/import`). Dosya **CSV** (UTF-8; ayraç `,` `;` veya sekme otomatik) ya da **JSON** (nesne dizisi). Örnek: `ornek-veri\sorular.csv`.

| Sütun | Zorunlu | Açıklama |
|---|---|---|
| `code` | ✓ | Tekil, kalıcı kimlik (örn. `TYT-0001`); QR adresi buna bağlıdır, sonradan değiştirilmez |
| `exam_type` | ✓ | `TYT` veya `AYT` |
| `subject` | ✓ | Ders |
| `image` | ✓ | Resim klasörüne göre göreli yol (örn. `TYT/turkce/TYT-0001.webp`) |
| `correct_answer` | ✓ | `A`–`E` |
| `topic`, `year`, `source`, `solution_url`, `choice_count` (4–5, varsayılan 5), `active` (varsayılan true) | | isteğe bağlı (bilinmeyen sütunlar uyarıyla yok sayılır) |

Davranış: önce **tüm satırlar doğrulanır**; eksik zorunlu alan, geçersiz değer, dosya içi tekrar eden kod gibi her hata satır numarasıyla raporlanır ve **tek hata bile varsa hiçbir şey yazılmaz**. Varsayılan ekran "deneme çalıştırması"dır (dryRun) — rapora bakıp "Gerçekten içe aktar" denir. Modlar: `INSERT_ONLY` (yalnız yeni kodlar eklenir, var olan sorulara dokunulmaz — varsayılan) ve `UPSERT` (var olanlar güncellenir; doğru cevap değişirse uyarı verilir). Resim dosyası bulunamazsa **uyarı** verilir (görseller sonradan kopyalanabilir). ~30.000 soruluk dosya tek seferde yüklenebilir (en çok 20 MB; gerekirse parçala).

Tek bir soruyu düzeltmek için Yönetim → Sorular → Düzenle yeterlidir.

## Görseller

Görseller veritabanına **konmaz**; `questions.image` yalnızca göreli yolu tutar, kök klasör `YKS_RESIM_KLASORU` (dev: `ornek-veri\resimler`). Örn. Windows'ta `D:\yks-resimler` ayarla, 30.000 görseli alt klasörlerle kopyala, CSV'deki `image` sütununa göreli yolu yaz. Klasör dışına çıkan yollar (`..`) reddedilir.
İleride Cloudflare R2 / S3'e geçiş: `storage/ImageStorage` arayüzünün yeni bir gerçeklemesini yaz (dosyayı okumak yerine imzalı adrese yönlendir ya da akıt); veritabanı, API ve ön yüz değişmez.

## Yapılandırma (ortam değişkenleri)

| Değişken | Anlamı | Dev varsayılanı |
|---|---|---|
| `YKS_DB_URL`, `YKS_DB_KULLANICI`, `YKS_DB_SIFRE` | PostgreSQL bağlantısı | `localhost:5432/yks_hazirlik`, `root`, `root` |
| `YKS_SITE_ADRESI` | QR kodların işaret ettiği genel adres | `http://localhost:5173` |
| `YKS_RESIM_KLASORU` | Soru görselleri kök klasörü | `../ornek-veri/resimler` |
| `YKS_ADMIN_KULLANICI`, `YKS_ADMIN_EPOSTA`, `YKS_ADMIN_SIFRE` | İlk yönetici (şifre ≥ 10 karakter, üretimde zorunlu değil ama ilk kurulumda gerekir) | `root`, `root@localhost`, `root` |
| `YKS_COOKIE_SECURE` | HTTPS arkasında `true` | `false` |
| `PORT` | Sunucu portu | `8081` |

`dev` profili (`backend-baslat.bat` bunu seçer) yukarıdaki varsayılanları sağlar. Profil seçilmeden çalıştırılırsa hiçbir varsayılan yoktur; eksik değişken uygulamayı başlatmaz — kazara `root/root` ile yayın yapılamaz.

## Veritabanı

- Göçler: `backend\src\main\resources\db\migration\` (`V1__sema.sql` ilk şema, `V2__soru_zorluk_kaldir.sql` soru zorluk alanını kaldırır). Değişiklik gerekirse **yeni** dosya ekle (`V3__aciklama.sql`); eski göç dosyalarını düzenleme.
- Sıfırdan kurulum: `veritabani-sifirla.bat` → `backend-baslat.bat` (Flyway tabloları kurar, dev'de örnek veri yüklenir). `spring.flyway.clean-disabled=true` olduğundan uygulama kendi kendine veritabanını silemez.
- Hibernate `ddl-auto=validate`: tablolar yalnız göçlerle oluşur, şema ile kod uyuşmazsa uygulama açılmaz.
- Yedek: `pg_dump -U root -h localhost yks_hazirlik > yedek.sql`.

## Test

- Arka yüz (15 test: kimlik, yetki, sınav akışı ve geçmişin korunması, geri bildirim, içe aktarıcı): `cd backend && mvn test` (`yks_hazirlik_test` veritabanı gerekir; test her çalışmada onu temizler, yalnız `*_test` adlı veritabanına izin verir).
- Tarayıcıda uçtan uca (kayıt → soru çöz → sınav → sonuç → geçmiş → geri bildirim → yönetim, masaüstü ve mobil): arka ve ön yüz açıkken `node testler\e2e.mjs [çıktı klasörü] [--mobil]` (Chrome gerekir; ekran görüntülerini klasöre yazar).

## Üretim / arkadaşlarla paylaşma

1. `uretim.ayarlar.ornek.bat` dosyasını `uretim.ayarlar.bat` olarak kopyala ve doldur (veritabanı şifresi, site adresi, resim klasörü, yönetici şifresi ≥ 10 karakter). Bu dosya `.gitignore`'dadır; gerçek şifreler depoya girmez. Üretimde veritabanı için `root/root` kullanma.
2. `uretim-calistir.bat` — gerekirse paketi derler (`uretim-derle.bat`: ön yüz jar'ın içine konur, tek dosya `backend\target\hedef-yks.jar`) ve **tek süreç** olarak çalıştırır: API + arayüz, `http://localhost:8081`. Profil verilmez; eksik ortam değişkeni varsa uygulama başlamaz.
3. Bilgisayarını dışarı açmadan arkadaşlara göstermek için HTTPS tünel (örn. Cloudflare Tunnel veya ngrok) ile `localhost:8081`'i yayınla; `YKS_SITE_ADRESI` tünel adresi olmalı (QR için). Kalıcı yayın için bir VPS/PaaS + yönetilen PostgreSQL yeterlidir.

## Güvenlik notları ve bilinen sınırlar (MVP)

- Oturum çerezi `HttpOnly` + `SameSite=Lax`; CSRF koruması açık (`XSRF-TOKEN` çerezi → `X-XSRF-TOKEN` başlığı); `/api/admin/**` yalnız ADMIN; kullanıcılar yalnız kendi sınavını görür.
- Oturumlar sunucu belleğinde: arka yüz yeniden başlayınca herkes yeniden giriş yapar (devam eden sınavlar veritabanında olduğu için kaybolmaz).
- Giriş denemesi sınırlaması (rate limit) ve e-posta doğrulaması yoktur.
- Soru bankasında tek tek çözümlerin kaydı tutulmaz (yalnız sınav sonuçları); istatistik sonraki adımdır.

## 5.000+ kullanıcıya büyürken (şimdi gerekmez)

Spring Session (JDBC/Redis) ile ortak oturum + birden çok sunucu · giriş/API hız sınırı · görseller için R2/S3 + CDN (`ImageStorage`) · bağlantı havuzu ve indeks ayarı (`questions` filtre indeksi hazır) · soru çözüm kayıtları tablosu ve istatistik · bildirimler için e-posta/kanal entegrasyonu.

## GitHub'a yükleme

`.gitignore` hazırdır (`node_modules`, `dist`, `target`, derlenmiş `static`, `.env`, `uretim.ayarlar.bat`). Gerçek şifreler ve 30.000 soruluk resim klasörü depoya girmemelidir (depoda yalnız 50 örnek görsel vardır).
