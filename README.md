# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL veritabanı ile çalışan eğitim uygulaması. Etiketleme öncelikli yapılacak işler ve açık kararlar [yaşayan yol haritasında](docs/plan/00_YOL_HARITASI.md); API ayrıntıları [mimari belgesinde](docs/API-ve-mimari.md) tutulur. Güncel iş sırası ve oturum devam noktası plan belgelerinden izlenir.

Sistemin veri akışı, tek sözlük/kimlik kuralları, önbellek, üretim/yayın doğrulamaları
ve gelecekte değişiklik yaparken izlenecek yol [kalıcı sistem rehberinde](docs/plan/00_SISTEM_REHBERI.md) açıklanır.

Bu çalışma alanındaki tek sitedir. Özgün PDF'ler `../Kaynaklar/`, veri üretimi `../veri-hatti/`, uygulamanın içe aktarma için kullandığı üretilmiş soru/görsel verisi `../icerik/data/` altındadır. Eski statik site kaldırılmıştır. Üst dizindeki `Ikisini de Baslat.bat` iki ortamın izleyicisini başlatır ve hazır olunca siteleri açar.

## Mevcut özellikler

- [Öğretmen Doğrulaması](docs/OGRETMEN_DOGRULAMASI.md): 14 branş için ortak etiket sözlüğü, birden fazla branş/konu eşleşmesi, zorluk, içerik türü, beceri ve sınıf etiketleri; kaynak bazlı karar, geçmiş ve JSON dışa aktarma. OPERATOR menüsünden açılır; yerel dev görünümünde branş seçimi öğretmen moduna geçer.

- **Sınavım (YKS / KPSS):** Sol menünün üstündeki seçiciyle öğrenci sınavını seçer; seçim hesapta (PostgreSQL `user_exam_tracks`) saklanır. Menüler ve ekranlar ortaktır; içerik seçilen sınava göre açılır. YKS ve KPSS Ortaöğretim hazırdır. KPSS Ortaöğretim seçiliyken Dersler, Çıkmış Sorular, Soru Çöz/Pratik, deneme ve istatistik yalnız KPSS içeriğini gösterir: 2006–2024 arasındaki 1260 ÖSYM sorusu ders/ünite/konuya bağlıdır ve 1223'ü açıktır. KPSS'de henüz olmayan bölümler (soru bankası, konu anlatımı) “henüz hazır değil” der. KPSS Ön Lisans, Lisans, A Grubu, Öğretmenlik/ÖABT ve DHBT sırayla hazırlanıyor. Ayrıntı: [API](docs/API-ve-mimari.md), [14. adım](docs/plan/14_KPSS.md).
- Sol menüdeki **Soru Çöz**, **Pratik / deneme**, **Soru Bankası** ve **AYT-TYT Çıkmış Sorular** sekmelerini bir araya getirir. Sekmeler arasında sınav/ders/konu seçimi korunur. Ders tablolarının ve soru detaylarının kullandığı `/soru-bankasi`, `/cikmis-sorular` ve eski başlatma adresleri çalışmaya devam eder.
- Öğrenci kayıt/giriş: kullanıcı adı, e-posta, cep telefonu ve en az 8 karakterli parola. E-posta ve telefon şu anda ayrıca doğrulanmaz. Oturum çerezi ve CSRF koruması vardır.
- Pratik: kaynak/sınav türü/ders/konu, yeni/önceki/yanlış/karışık soru geçmişi, sayı ve süreli/süresiz çalışma seçilerek kalıcı soru sıralı oturum açılır. Uygun soru sayısı gösterilir; yanıtlar ve durumlar oturuma bağlanır. Süre sonunda veya açık bitirme ile sonuç oluşur; Geçmişim ve Hesap ekranından oturumlara dönülür. Alt konu/soru tipi etiketleri sonraki adımdadır.
- `CIKMIS` ve `OGM` soru koleksiyonları; sınav türü, ders ve konu filtresi; soru/çözüm görseli, QR, zorluk oyu ve geri bildirim. Serbest pratikte ilk yanıt, ikinci deneme, cevabı gösterme ve atlama olayları öğrenciye özel olarak kaydedilir; doğru şık yanlış yanıtın hemen ardından açılmaz.
- Konu anlatımları: öğrenci özgün OGM PDF'lerini sınav, ders ve kaynak türüne göre arayıp site içinde açar. Eksik dosya ve yalnız video kaydı listede açıkça belirtilir. İlk doğrulanmış Noktalama İşaretleri PDF'sinden yalnız üç kaynaklı soru ile pratik/test kurucusuna geçilir; diğer aday başlıklar onaylı soru bağı sayılmaz.
- Süreli veya süresiz deneme; sınav sırasında cevap anahtarı gizli, bitiminde sonuç ve geçmiş kalıcıdır. Serbest pratikteki soru başı kayıtlar ile sınav geçmişi ayrı akışlardır; çalışma oturumu seçimi ve kişisel analiz henüz bağlı değildir.
- Çalışma önerileri ekranı onaylı soru tipi etiketli ilk denemelerden açıklanabilir ipuçları gösterir; örnek soruya geçilir veya yanlış etiket bildirilir. Gerçek etiket onayı açık iştir; taslak 50 soruluk örnek öğrenci önerisine girmez.
- `ADMIN` rolü `/yonetim` ve `/api/admin/stats` üzerinden yalnız beşlik aralıklarla gösterilen toplu gün/hafta/ay kullanım ve yakalanan beklenmeyen API hata sayılarını görür; küçük gruplar gizlenir. Etkin soru kayıtlarının koleksiyon ve TYT/AYT kapsamı ayrıca gösterilir. `OPERATOR` rolü `/icerik-bakimi` ve `/api/operator` üzerinden içerik bakımını yapar. Öğrenci yalnız kendi sınav verisini görür.
- Öğrenci Hesap ekranından mevcut şifresiyle kendi verilerini JSON olarak indirebilir veya şifre ve yazılı onayla hesabını silebilir. Ortak soru bankası ve diğer öğrenciler etkilenmez.
- Ham `activity_events` kayıtları için 90 gün saklama görevi vardır; giriş/aktiflik/çıkış olaylarının üretimi ve gösterimi henüz bağlı değildir.

## Tek main ortamı

Tek uygulama `D:\workspace\ivme\uygulama` klasöründe `main` dalındadır.
Yerel adresi `http://localhost:1010`, tek kalıcı uygulama veritabanı `ivme`dir.
Üst dizindeki `Ivme Baslat.bat` uygulamayı açar; Windows başlangıç kısayolu
`yerel-baslat.ps1` ile kaynak izleyicisini gizli başlatır. Kod değişiklikleri
bu klasörde yapılır ve doğrudan main uygulamasına yansır.

`yerel-ortam.ps1` yalnız main/1010/ivme ayarlarını seçer. Özel yerel kimlik ve
kaynak yolları Git dışındaki `.codex/local-environment.json` ile verilebilir.
Özgün `Kaynaklar/ogm-materyal` PDF arşivi yalnız okunur. Cloudflare tüneli
doğrudan `http://localhost:1010` adresini kullanır; 5173 için ek giriş açılmaz.
Yerel uygulama otomatik giriş davranışı için Spring `dev` profilini korur.
Gerçek HTTPS dağıtım ayarları aşağıdaki üretim paketi bölümündedir.

Gerekenler: Java 21, Maven, Node.js 22 veya üzeri ve PostgreSQL. Otomatik testler
gerçek `ivme` veritabanında çalıştırılmaz; test için ayrı geçici veritabanı gerekir.
Gerçek veriyi silen `veritabani-sifirla.bat` çalıştırılmaz.

İsteğe bağlı Vite akışında `backend-baslat.bat` API'yi 8081'de,
`frontend-baslat.bat` ön yüzü 1010'da açar. Önce paketli uygulama/izleyici
durdurulmalıdır; normal kullanımda paketli uygulama ve kaynak izleyicisi çalışır.

Yerel `localhost` adresinde oturum yoksa etkin `student` hesabıyla otomatik giriş
vardır; giriş ve kayıt ekranlarında bu kolaylık kapalıdır. Tünelden otomatik giriş
yapılmaz. Yerel uygulamada üst çubuktaki admin/öğrenci/öğretmen/veli düğmeleri
test hesapları arasında tek tıkla geçer; parola kimlikleri PostgreSQL'de BCrypt
olarak saklanır. Yeni kayıtlar yönetici onayına kadar sisteme giremez. Yerel
hesapların hazırlanması ve güvenlik sınırları [sistem rehberindedir](docs/plan/00_SISTEM_REHBERI.md#site-yöneticisinin-kullanıcı-yönetimi).
Görseller `veri/resimler-pilot`, PDF kataloğu `veri/ogm-konu-pdf-katalog/entries`
klasöründen okunur. Büyük kaynaklar, DB yedekleri ve sırlar Git'e alınmaz.

Tamamlanan değişiklikler yerel `main` dalına commit edilir. Git push açık
kullanıcı talimatıyla yapılır. Git kodu günceller; öğrenci veritabanını değiştirmez.

Site yöneticisi `Yönetim → Kullanıcılar` ekranında öğrenci, öğretmen, veli,
yönetici ve içerik operatörü kategorilerini, boş kategoriler dahil, görür.
Engelleme/engel kaldırma ve onayla silme bu ekrandadır. Silme hesabı listeden
kaldırıp girişini kapatır; geçmiş çalışma ve inceleme kayıtları korunur.
Site yöneticisi kendi hesabını kapatamaz; işlemler `account_audit` kaydına alınır.

Kod değişikliklerinden sonra kaynak izleyicisi uygulamayı yeniden derler.
Gerektiğinde `yeniden-baslat.bat` doğrudan çalıştırılır; Git push ayrı bir adımdır.

## Soru verisi

İçe aktarma CSV/JSON içindir; `code`, `exam_type`, `subject`, `image`, `correct_answer` zorunludur. İsteğe bağlı `topic`, `year`, `source`, `choice_count`, `solution_url`, `active`, `bank` (`CIKMIS`/`OGM`) ve `solution_image` alanları vardır. Dosya önce bütünüyle doğrulanır; bir hata varsa uygulanmaz. Operatör ekranı varsayılan olarak yalnız ön izleme yapar; `INSERT_ONLY` mevcut soruları değiştirmez, `UPSERT` günceller.

Kaynak veri mevcutsa `node ornek-veri/ornek_uret.mjs --tum` çıkmış sorular için, `node ornek-veri/ogm_uret.mjs` OGM için Git dışı CSV ve görsel düzeni hazırlar. Betikler `../icerik/data/` altındaki korunmuş çıktıları okur. OGM betiği görselleri `veri/resimler-pilot/ogm` altına bağlar; `--kopyala` bağlantı yerine kopyalar. Büyük CSV için uygulamayı bir kez `YKS_IMPORT_DOSYASI=<CSV yolu>` ortam değişkeniyle başlatın; varsayılan mod `INSERT_ONLY`'dir. İçe alma bitince değişkeni kaldırın. Görsel dosyaları ayrı yedeklenir; veritabanı yedeğine dahil değildir.

Soru görsellerinin beyaz dış kenarları `python scripts/soru-gorsellerini-kirp.py` ile topluca kırpılır. Ön izleme için `--dry-run --limit 100`, yeniden üretmek için `--force` kullanılabilir. Betik `veri/sorular-tum.csv` ve `veri/sorular-ogm.csv` içindeki soru görsellerini işler; kırpılmış kopyalar `veri/resimler-pilot/kirpilmis/` altında aynı göreli yola yazılır. Uygulama varsa bu kopyayı, yoksa özgün dosyayı sunar. Kaynak görseller, CSV/etiketler ve bunlara bağlı hash değerleri değiştirilmez. Kaynak görseller yeniden üretilirse `--force` ile kırpılmış kopyalar da yenilenmelidir.

## Üretim paketi ve tünel

Yerel main adresi `http://localhost:1010`'dır. Cloudflare'da `net.ivme.dev` tünel hedefini `http://localhost:1010` olarak ayarlayın; yerel ve uzak erişim aynı main uygulamasına ulaşır. Paylaşım için React çıktısını içinde taşıyan Spring Boot paketini çalıştırın:

1. `uretim.ayarlar.ornek.bat` dosyasını Git dışında kalacak `uretim.ayarlar.bat` olarak kopyalayın; veritabanı, görsel klasörü, `YKS_SITE_ADRESI=https://net.ivme.dev`, `YKS_COOKIE_SECURE=true` ve `PORT=1010` ayarlarını doldurun. Üretimde `root/root` kullanmayın. Sınırlı rolün kurulumu [12.03 yayın işinde](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) açıklanır; `YKS_FLYWAY_ETKIN=false` ancak yetkili göç tamamlandıktan sonra kullanılmalıdır.
2. Önce iki ayrıcalıklı hesabın geçici parolasını yerelde değiştirin. `uretim-derle.bat` paketi derler; `uretim-calistir.bat` gereken durumda yeniden derleyip tek Java süreci olarak başlatır. Sunucu yalnız `127.0.0.1` üzerinde dinler.
3. Yerel ve tünel adresinde giriş, çıkış, soru görseli, QR, CSRF çerezi, mobil görünüm ve yeniden başlatma kontrolünü yapın. Servis kapalıyken Cloudflare 502 yanıtı beklenir. Vite kaynak dosyaları tünel üzerinden uzun süre önbelleğe alınabildiğinden paylaşılan sitede derlenmiş paketi kullanın. Normal tarayıcıda eski sürüm kalırsa `net.ivme.dev` için sert yenileme veya site önbelleğini temizleme yapın; sorun sürerse eklentileri bu site için kapatıp deneyin.

Yerel çalıştırma ve izleyici düzeni yukarıdadır.
`yeniden-baslat.ps1` 1010 portunda dönüşümlü JAR klasörlerine derler,
HTML/asset ve `app-version.txt` sürümünü doğrular. Çalışan uygulama hata halinde
önceki pakete döner. İzleyici durumu `backend/target/live-watch.status`, hatalar
`live-watch.log` ve `application.stderr.log` dosyalarındadır. Açık tarayıcı yeni
`app-version.txt` değerini görünce sayfayı yeniler.

Üretimde `YKS_SITE_ADRESI` geçerli HTTPS adresi ve güvenli oturum çerezi zorunludur; geçici parolalı ayrıcalıklı hesap varsa uygulama açılmaz. [Yayın öncesi kalan işler](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) açık maddeleri listeler.

## Doğrulama

- Arka yüz: `./testler/backend-test.ps1` geçici `ivme_test` veritabanını kurar, `mvn test` çalıştırır ve test bitince veritabanını kaldırır. Gerçek `ivme` üzerinde test çalıştırma.
- Ön yüz: `cd frontend; npm run build`.
- Yerel Chrome uçtan uca: `node testler/e2e.mjs [çıktı klasörü] [--mobil]`. Test yeni kullanıcı ve geri bildirim oluşturur; yalnız yerel adreste çalışır. Ayrıcalıklı ekranlar ancak ilgili `YKS_E2E_YONETICI*` veya `YKS_E2E_OPERATOR*` ortam değişkenleri verilirse denenir.

**Git:** Tek yerel ve uzak geliştirme dalı `main`; doğru uzak depo `ivme` adıdır. Push yalnız açık kullanıcı talimatıyla yapılır.

Kaynaklı ders notları ve 53.019 etkin sorunun etiket dizini `/kaynakli-ders-notlari` altında bulunur. Konu/alt konu için 21 rehber, 44 soru kalıbı ve akıllı çalışma yönlendirmesi vardır. Kapsam ve testler [notlar kaydında](docs/KAYNAKLI_DERS_NOTLARI.md), PostgreSQL'deki yeniden kullanılabilir araştırma arşivi [analiz kaydında](docs/KAYNAKLI_SORU_ANALIZI.md) açıklanır; tüm müfredat analizi tamamlanmış sayılmaz.
