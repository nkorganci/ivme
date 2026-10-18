# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL veritabanı ile çalışan eğitim uygulaması. Etiketleme öncelikli yapılacak işler ve açık kararlar [yaşayan yol haritasında](docs/plan/00_YOL_HARITASI.md); API ayrıntıları [mimari belgesinde](docs/API-ve-mimari.md) tutulur. Güncel iş sırası ve oturum devam noktası plan belgelerinden izlenir.

Sistemin veri akışı, tek sözlük/kimlik kuralları, önbellek, üretim/yayın doğrulamaları
ve gelecekte değişiklik yaparken izlenecek yol [kalıcı sistem rehberinde](docs/plan/00_SISTEM_REHBERI.md) açıklanır.

Bu çalışma alanındaki tek sitedir. Özgün PDF'ler `../Kaynaklar/`, veri üretimi `../veri-hatti/`, uygulamanın içe aktarma için kullandığı üretilmiş soru/görsel verisi `../icerik/data/` altındadır. Eski statik site kaldırılmıştır. Üst dizindeki `Siteyi Ac.bat` bu uygulamanın `baslat.bat` dosyasını çalıştırır.

## Mevcut özellikler

- [Öğretmen Doğrulaması](docs/OGRETMEN_DOGRULAMASI.md): 14 branş için ortak etiket sözlüğü, birden fazla branş/konu eşleşmesi, zorluk, içerik türü, beceri ve sınıf etiketleri; kaynak bazlı karar, geçmiş ve JSON dışa aktarma. OPERATOR menüsünden açılır; yerel dev görünümünde branş seçimi öğretmen moduna geçer.

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

## Yerel geliştirme

Soru, PDF, ders notu ve video için ortak etiket kapsamı, merkezi kayıtlar ve yeniden üretim
komutları [ortak etiketler kaydında](docs/ORTAK_ETIKET_KAPSAMI.md) açıklanır.

Gerekenler: Java 21, Maven, Node.js 22 veya üzeri ve PostgreSQL. Yerel veritabanı `ivme`, test veritabanı `ivme_test` adını kullanır. Var olan veriyi silen eski `veritabani-sifirla.bat` betiğini çalıştırmayın; geçiş ve yedek adımları için [güncel işletim ve yedek planını](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) okuyun.

1. `backend-baslat.bat` Spring Boot geliştirme profilini `127.0.0.1:8081` üzerinde başlatır. Ardından `frontend-baslat.bat` Vite'ı `127.0.0.1:5173` üzerinde başlatır. `baslat.bat` ikisini birlikte açar.
2. `http://localhost:5173` adresine gidin. Vite `/api` isteklerini yerel arka yüze yönlendirir. `net.ivme.dev` Cloudflare Tunnel üzerinden aynı 5173 portuna gider; uygulama kapalıysa alan adı çalışmaz.
   Geliştirme profilinde `localhost` üzerinden açıldığında, oturum yoksa `nazile` öğrenci hesabına geçici olarak otomatik giriş yapılır; kullanıcı adı ve şifre sorulmaz. Hesap adı gerekirse `YKS_DEV_OGRENCI` ile değiştirilebilir. Tünel adresinde ve üretimde bu kolaylık kapalıdır.
3. Yerel ayrıcalıklı hesaplar `ivmeadmin` ve `ivmeoperator` olarak oluşturulmuştur. Geçici parolaları yalnız yerel giriş için geçerlidir; ikisini de ayrı ayrı **Hesap → Şifre değiştir** ekranından en az 8 karakterli, farklı parolalara çevirin. Üretim açılışı bu tamamlanmadan reddedilir. Geçici hesaplarla tünelden giriş engellenir.

Gerçek sırlar, PostgreSQL yedekleri, soru CSV'leri ve görseller `veri/` gibi Git dışı konumlarda tutulur. Görsel kökü `YKS_RESIM_KLASORU` ile ayarlanır; `backend-baslat.bat` yerel `veri/resimler-pilot` varsa onu seçer.

Konu PDF listesi için önce `D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogm-konu-pdf-katalog.py --limit 2236 --resume` çalıştırılır. Geliştirme profili katalog ve kaynak kökünü `backend/` çalışma dizinine göre bulur. Üretimde `YKS_KONU_PDF_KATALOGU` ve `YKS_OGM_PDF_KAYNAGI` yolları `uretim.ayarlar.bat` içinde tanımlanır; kaynak PDF'ler ve üretilen katalog Git dışıdır. Katalog yeniden üretildikten sonra API'nin yeni kayıtları okuması için arka yüz yeniden başlatılır.

## Soru verisi

İçe aktarma CSV/JSON içindir; `code`, `exam_type`, `subject`, `image`, `correct_answer` zorunludur. İsteğe bağlı `topic`, `year`, `source`, `choice_count`, `solution_url`, `active`, `bank` (`CIKMIS`/`OGM`) ve `solution_image` alanları vardır. Dosya önce bütünüyle doğrulanır; bir hata varsa uygulanmaz. Operatör ekranı varsayılan olarak yalnız ön izleme yapar; `INSERT_ONLY` mevcut soruları değiştirmez, `UPSERT` günceller.

Kaynak veri mevcutsa `node ornek-veri/ornek_uret.mjs --tum` çıkmış sorular için, `node ornek-veri/ogm_uret.mjs` OGM için Git dışı CSV ve görsel düzeni hazırlar. Betikler `../icerik/data/` altındaki korunmuş çıktıları okur. OGM betiği görselleri `veri/resimler-pilot/ogm` altına bağlar; `--kopyala` bağlantı yerine kopyalar. Büyük CSV için uygulamayı bir kez `YKS_IMPORT_DOSYASI=<CSV yolu>` ortam değişkeniyle başlatın; varsayılan mod `INSERT_ONLY`'dir. İçe alma bitince değişkeni kaldırın. Görsel dosyaları ayrı yedeklenir; veritabanı yedeğine dahil değildir.

Soru görsellerinin beyaz dış kenarları `python scripts/soru-gorsellerini-kirp.py` ile topluca kırpılır. Ön izleme için `--dry-run --limit 100`, yeniden üretmek için `--force` kullanılabilir. Betik `veri/sorular-tum.csv` ve `veri/sorular-ogm.csv` içindeki soru görsellerini işler; kırpılmış kopyalar `veri/resimler-pilot/kirpilmis/` altında aynı göreli yola yazılır. Uygulama varsa bu kopyayı, yoksa özgün dosyayı sunar. Kaynak görseller, CSV/etiketler ve bunlara bağlı hash değerleri değiştirilmez. Kaynak görseller yeniden üretilirse `--force` ile kırpılmış kopyalar da yenilenmelidir.

## Üretim paketi ve tünel

Kullanıcının mevcut Cloudflare rotası `net.ivme.dev` → `http://localhost:5173`'tür. Paylaşım için Vite geliştirme sunucusu yerine React çıktısını içinde taşıyan Spring Boot paketini **aynı 5173 portunda** çalıştırın:

1. `uretim.ayarlar.ornek.bat` dosyasını Git dışında kalacak `uretim.ayarlar.bat` olarak kopyalayın; veritabanı, görsel klasörü, `YKS_SITE_ADRESI=https://net.ivme.dev`, `YKS_COOKIE_SECURE=true` ve `PORT=5173` ayarlarını doldurun. Üretimde `root/root` kullanmayın. Sınırlı rolün kurulumu [12.03 yayın işinde](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) açıklanır; `YKS_FLYWAY_ETKIN=false` ancak yetkili göç tamamlandıktan sonra kullanılmalıdır.
2. Önce iki ayrıcalıklı hesabın geçici parolasını yerelde değiştirin. `uretim-derle.bat` paketi derler; `uretim-calistir.bat` gereken durumda yeniden derleyip tek Java süreci olarak başlatır. Sunucu yalnız `127.0.0.1` üzerinde dinler.
3. Yerel ve tünel adresinde giriş, çıkış, soru görseli, QR, CSRF çerezi, mobil görünüm ve yeniden başlatma kontrolünü yapın. Servis kapalıyken Cloudflare 502 yanıtı beklenir. Vite kaynak dosyaları tünel üzerinden uzun süre önbelleğe alınabildiğinden paylaşılan sitede derlenmiş paketi kullanın. Normal tarayıcıda eski sürüm kalırsa `net.ivme.dev` için sert yenileme veya site önbelleğini temizleme yapın; sorun sürerse eklentileri bu site için kapatıp deneyin.

Yerelde çalışan uygulamayı başlatmak için `yeniden-baslat.bat` dosyasını çalıştırın. Aynı işlem PowerShell'de `./yeniden-baslat.ps1` ile yapılabilir. Betik yeni paketi dönüşümlü iki klasörden birinde üretir, 5173'teki kendi Vite/JAR sürecini değiştirir ve sunulan sürümü doğrular. Ardından arka planda kaynak izleyicisini başlatır: ön yüz veya arka yüz kaynakları değişince yeniden derleyip yayımlar; sunucu kapanırsa tekrar başlatmayı dener. Açık sayfalar yeni sürümü yaklaşık 5 saniyede algılayıp yeniler. Kaydedilmemiş form varsa tarayıcı çıkış uyarısı gösterir. 8081'de çalışan ayrı arka yüz sürecine dokunulmaz. İzleyici durumu ve hataları `backend/target/live-watch.status` ile `backend/target/live-watch.log` dosyalarındadır.

Otomatik güncelleme sürekli etkin tutulur. Kullanıcının Windows başlangıç klasörüne `IVME - Otomatik Guncelleme.lnk` kuruludur; oturum açıldığında `canli-izle.ps1` gizli başlar. İzleyici aynı depo için tek süreç çalıştırır. Uygulama değişikliklerinden sonra gereken derleme/yeniden başlatma yapılır ve gerçek sunulan sürüm doğrulanır.

Üretimde `YKS_SITE_ADRESI` geçerli HTTPS adresi ve güvenli oturum çerezi zorunludur; geçici parolalı ayrıcalıklı hesap varsa uygulama açılmaz. [Yayın öncesi kalan işler](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) açık maddeleri listeler.

## Doğrulama

- Arka yüz: `cd backend; mvn test` (`ivme_test` veritabanını kullanır; testler onu temizleyebilir).
- Ön yüz: `cd frontend; npm run build`.
- Yerel Chrome uçtan uca: `node testler/e2e.mjs [çıktı klasörü] [--mobil]`. Test yeni kullanıcı ve geri bildirim oluşturur; yalnız yerel adreste çalışır. Ayrıcalıklı ekranlar ancak ilgili `YKS_E2E_YONETICI*` veya `YKS_E2E_OPERATOR*` ortam değişkenleri verilirse denenir.

**Git:** Çalışma kolu `feature/ivme-yol-haritasi`; doğru uzak depo `ivme` adıdır. Kullanıcının son isteği gereği değişiklikler yerel commit edilir, tüm işler bitip yorum alınana kadar push yapılmaz.

Kaynaklı ders notları ve 53.019 etkin sorunun etiket dizini `/kaynakli-ders-notlari` altında bulunur. Konu/alt konu için 21 rehber, 44 soru kalıbı ve akıllı çalışma yönlendirmesi vardır. Kapsam ve testler [notlar kaydında](docs/KAYNAKLI_DERS_NOTLARI.md), PostgreSQL'deki yeniden kullanılabilir araştırma arşivi [analiz kaydında](docs/KAYNAKLI_SORU_ANALIZI.md) açıklanır; tüm müfredat analizi tamamlanmış sayılmaz.
