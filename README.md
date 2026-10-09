# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL veritabanı ile çalışan eğitim uygulaması. Ürün sırası, tamamlanan işler ve açık kararlar [yaşayan yol haritasında](docs/plan/00_YOL_HARITASI.md); API ayrıntıları [mimari belgesinde](docs/API-ve-mimari.md) tutulur. TYT/AYT dışındaki sınavlar, soru başı denemeler, çalışma hedefleri ve akıllı öneriler planlıdır; henüz çalışan özellik sayılmaz.

## Mevcut özellikler

- Öğrenci kayıt/giriş: kullanıcı adı, e-posta, cep telefonu ve en az 8 karakterli parola. E-posta ve telefon şu anda ayrıca doğrulanmaz. Oturum çerezi ve CSRF koruması vardır.
- Süresiz pratik: kaynak/konu ve sayı seçilerek kalıcı soru sıralı oturum açılır; yanıtlar ve soru durumları oturuma bağlanır, önceki/sonraki soru sırası korunur; sayfa yenileme ve tekrar girişten sonra son açık oturuma dönülür. Dört pratik seçim modu ve süreli pratik sonraki adımlardır.
- `CIKMIS` ve `OGM` soru koleksiyonları; sınav türü, ders ve konu filtresi; soru/çözüm görseli, QR, zorluk oyu ve geri bildirim. Serbest pratikte ilk yanıt, ikinci deneme, cevabı gösterme ve atlama olayları öğrenciye özel olarak kaydedilir; doğru şık yanlış yanıtın hemen ardından açılmaz.
- Süreli veya süresiz deneme; sınav sırasında cevap anahtarı gizli, bitiminde sonuç ve geçmiş kalıcıdır. Serbest pratikteki soru başı kayıtlar ile sınav geçmişi ayrı akışlardır; çalışma oturumu seçimi ve kişisel analiz henüz bağlı değildir.
- `ADMIN` rolü `/yonetim` ve `/api/admin/stats` üzerinden yalnız toplu sayıları görür. `OPERATOR` rolü `/icerik-bakimi` ve `/api/operator` üzerinden içerik bakımını yapar. Öğrenci yalnız kendi sınav verisini görür.
- Ham `activity_events` kayıtları için 90 gün saklama görevi vardır; giriş/aktiflik/çıkış olaylarının üretimi ve gösterimi henüz bağlı değildir.

## Yerel geliştirme

Gerekenler: Java 21, Maven, Node.js 22 veya üzeri ve PostgreSQL. Yerel veritabanı `ivme`, test veritabanı `ivme_test` adını kullanır. Var olan veriyi silen eski `veritabani-sifirla.bat` betiğini çalıştırmayın; geçiş ve yedek adımları için [veritabanı kaydını](docs/plan/05_VERITABANI_GECISI.md) okuyun.

1. `backend-baslat.bat` Spring Boot geliştirme profilini `127.0.0.1:8081` üzerinde başlatır. Ardından `frontend-baslat.bat` Vite'ı `127.0.0.1:5173` üzerinde başlatır. `baslat.bat` ikisini birlikte açar.
2. `http://localhost:5173` adresine gidin. Vite `/api` isteklerini yerel arka yüze yönlendirir. `net.ivme.dev` Cloudflare Tunnel üzerinden aynı 5173 portuna gider; uygulama kapalıysa alan adı çalışmaz.
3. Yerel ayrıcalıklı hesaplar `ivmeadmin` ve `ivmeoperator` olarak oluşturulmuştur. Geçici parolaları yalnız yerel giriş için geçerlidir; ikisini de ayrı ayrı **Hesap → Şifre değiştir** ekranından en az 8 karakterli, farklı parolalara çevirin. Üretim açılışı bu tamamlanmadan reddedilir. Geçici hesaplarla tünelden giriş engellenir.

Gerçek sırlar, PostgreSQL yedekleri, soru CSV'leri ve görseller `veri/` gibi Git dışı konumlarda tutulur. Görsel kökü `YKS_RESIM_KLASORU` ile ayarlanır; `backend-baslat.bat` yerel `veri/resimler-pilot` varsa onu seçer.

## Soru verisi

İçe aktarma CSV/JSON içindir; `code`, `exam_type`, `subject`, `image`, `correct_answer` zorunludur. İsteğe bağlı `topic`, `year`, `source`, `choice_count`, `solution_url`, `active`, `bank` (`CIKMIS`/`OGM`) ve `solution_image` alanları vardır. Dosya önce bütünüyle doğrulanır; bir hata varsa uygulanmaz. Operatör ekranı varsayılan olarak yalnız ön izleme yapar; `INSERT_ONLY` mevcut soruları değiştirmez, `UPSERT` günceller.

Kaynak veri mevcutsa `node ornek-veri/ornek_uret.mjs --tum` çıkmış sorular için, `node ornek-veri/ogm_uret.mjs` OGM için Git dışı CSV ve görsel düzeni hazırlar. OGM betiği görselleri `veri/resimler-pilot/ogm` altına bağlar; `--kopyala` bağlantı yerine kopyalar. Büyük CSV için uygulamayı bir kez `YKS_IMPORT_DOSYASI=<CSV yolu>` ortam değişkeniyle başlatın; varsayılan mod `INSERT_ONLY`'dir. İçe alma bitince değişkeni kaldırın. Görsel dosyaları ayrı yedeklenir; veritabanı yedeğine dahil değildir.

## Üretim paketi ve tünel

Kullanıcının mevcut Cloudflare rotası `net.ivme.dev` → `http://localhost:5173`'tür. Paylaşım için Vite geliştirme sunucusu yerine React çıktısını içinde taşıyan Spring Boot paketini **aynı 5173 portunda** çalıştırın:

1. `uretim.ayarlar.ornek.bat` dosyasını Git dışında kalacak `uretim.ayarlar.bat` olarak kopyalayın; veritabanı, görsel klasörü, `YKS_SITE_ADRESI=https://net.ivme.dev`, `YKS_COOKIE_SECURE=true` ve `PORT=5173` ayarlarını doldurun. Veritabanında `root/root` gibi paylaşılan kimlik bilgilerini üretimde kullanmayın.
2. Önce iki ayrıcalıklı hesabın geçici parolasını yerelde değiştirin. `uretim-derle.bat` paketi derler; `uretim-calistir.bat` gereken durumda yeniden derleyip tek Java süreci olarak başlatır. Sunucu yalnız `127.0.0.1` üzerinde dinler.
3. Yerel ve tünel adresinde giriş, çıkış, soru görseli, QR, CSRF çerezi, mobil görünüm ve yeniden başlatma kontrolünü yapın. Servis kapalıyken Cloudflare 502 yanıtı beklenir. Normal tarayıcıda gizli pencereye göre farklı sonuç görülürse yalnız `net.ivme.dev` site verisini ve eklentileri kontrol edin; kesin neden henüz belirlenmedi.

Üretimde `YKS_SITE_ADRESI` geçerli HTTPS adresi ve güvenli oturum çerezi zorunludur; geçici parolalı ayrıcalıklı hesap varsa uygulama açılmaz. [Yayın öncesi güvenlik kaydı](docs/plan/07_GUVENLIK_YETKI.md) açık maddeleri listeler.

## Doğrulama

- Arka yüz: `cd backend; mvn test` (`ivme_test` veritabanını kullanır; testler onu temizleyebilir).
- Ön yüz: `cd frontend; npm run build`.
- Yerel Chrome uçtan uca: `node testler/e2e.mjs [çıktı klasörü] [--mobil]`. Test yeni kullanıcı ve geri bildirim oluşturur; yalnız yerel adreste çalışır. Ayrıcalıklı ekranlar ancak ilgili `YKS_E2E_YONETICI*` veya `YKS_E2E_OPERATOR*` ortam değişkenleri verilirse denenir.

**Git:** Çalışma kolu `feature/ivme-yol-haritasi`; doğru uzak depo `ivme` adıdır. Kullanıcının son isteği gereği değişiklikler yerel commit edilir, tüm işler bitip yorum alınana kadar push yapılmaz.
