# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL veritabanı ile çalışan eğitim uygulaması. Etiketleme öncelikli yapılacak işler ve açık kararlar [yaşayan yol haritasında](docs/plan/00_YOL_HARITASI.md); API ayrıntıları [mimari belgesinde](docs/API-ve-mimari.md) tutulur. Güncel iş sırası ve oturum devam noktası plan belgelerinden izlenir.

Sistemin veri akışı, tek sözlük/kimlik kuralları, önbellek, üretim/yayın doğrulamaları
ve gelecekte değişiklik yaparken izlenecek yol [kalıcı sistem rehberinde](docs/plan/00_SISTEM_REHBERI.md) açıklanır.

Bu çalışma alanındaki tek sitedir. Özgün PDF'ler `../Kaynaklar/`, veri üretimi `../veri-hatti/`, uygulamanın içe aktarma için kullandığı üretilmiş soru/görsel verisi `../icerik/data/` altındadır. Eski statik site kaldırılmıştır. Üst dizindeki `Siteyi Ac.bat` bu uygulamanın iki ortamın başlatıcısını çalıştırır.

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

## Ayrı main ve feature ortamları

| Ortam | Dal ve klasör | Adres | Veritabanı |
|---|---|---|---|
| Yerel production | `main` — `D:\workspace\ivme\uygulama-main` | http://localhost:9090 | `ivme` |
| Geliştirme | `feature/ivme-yol-haritasi` — `D:\workspace\ivme\uygulama` | http://localhost:9091 | `ivme_dev` |

Geliştirmeyi `uygulama` klasöründe yapın. `main` ayrı bir Git worktree'sidir;
kaynakları, derleme çıktıları, görselleri ve PDF katalog kopyası ayrıdır.
`ivme_dev`, kurulum anındaki `ivme` verisinin bağımsız kopyasıdır; bundan sonraki
öğrenci kayıtları ve DB göçleri ortamlar arasında otomatik eşitlenmez.
Özgün `Kaynaklar/ogm-materyal` PDF arşivi iki ortam tarafından yalnız okunur.

`iki-ortami-baslat.bat` iki ortamın izleyicisini gizli başlatır. İzleyiciler
uygulama kapalıysa açar ve yalnız kendi worktree'sindeki kaynak değişince o
ortamı yeniler. Herhangi bir ortamı hemen derleyip açmak için o klasörde
`yeniden-baslat.bat` veya `baslat.bat` kullanılır. Windows başlangıcındaki
`IVME - Otomatik Guncelleme.lnk` iki izleyiciyi birlikte açar.

`yerel-ortam.ps1` port, DB ve çerez adlarını daldan belirler; üst süreçten kalan
başka bir ortamın DB/port ayarlarını kullanmaz. Gereken özel yerel kimlik ve
kaynak yolları Git dışındaki `.codex/local-environment.json` ile verilebilir.
Oturum ve CSRF çerezleri ayrıdır; iki localhost sekmesi birbirinin girişini bozmaz.
Cloudflare tüneli doğrudan main'in `http://localhost:9090` adresini kullanır;
5173 için ek giriş açılmaz. Feature yalnız yerel 9091 adresinden açılır.
İki yerel ortam mevcut otomatik giriş davranışını koruyan Spring `dev` profilini
kullanır; production burada main dalındaki sabit yerel uygulamayı belirtir.
Gerçek HTTPS dağıtım ayarları aşağıdaki üretim paketi bölümündedir.

Gerekenler: Java 21, Maven, Node.js 22 veya üzeri ve PostgreSQL. Testler yalnız
`ivme_test` veritabanını kullanır. İçerik bakım betiklerinin varsayılan DB'si de
dala göre seçilir; `--database ivme` açıkça ana veriyi seçer. Gerçek veriyi silen
`veritabani-sifirla.bat` çalıştırılmaz.

İsteğe bağlı Vite geliştirme akışı: feature klasöründeki `backend-baslat.bat`
API'yi 8082'de, `frontend-baslat.bat` ön yüzü 9091'de açar. Önce o ortamın paketli
uygulaması/izleyicisi durdurulmalıdır; normal kullanımda iki ortam da paketli
uygulama ve kaynak izleyicisiyle çalışır.

Yerel `localhost` adresinde oturum yoksa `nazile` hesabıyla otomatik giriş vardır;
tünelden bu kolaylık kapalıdır. Geliştirme hesabı `YKS_DEV_OGRENCI` ile değiştirilebilir.
Görseller ortamın `veri/resimler-pilot`, PDF kataloğu `veri/ogm-konu-pdf-katalog/entries`
klasöründen okunur. Büyük kaynaklar, DB yedekleri ve sırlar Git'e alınmaz.

Geliştirmeden önce `./feature-guncelle.ps1` yerel `main` ve `ivme/main`
kodunu feature'a alır; feature değişikliklerini korur ve production worktree'sini
değiştirmez. Her tamamlanan iş yerel feature dalına commit edilir.
`./feature-guncelle.ps1 -SyncStudents` ayrıca eksik production öğrenci hesaplarını
dev'e ekler. Sadece kayıt olmayan hesaplar kopyalanır; mevcut dev hesapları,
engelleme/silme durumları ve çalışma kayıtları korunur. Production bağlantısı
salt okunurdur ve önce dev kullanıcı tablosunun Git dışı yedeği alınır.
Git pull veritabanını eşitlemez; bu işlem öğrenci çalışma geçmişini kopyalamaz.

Site yöneticisi `Yönetim → Kullanıcılar` ekranında öğrenci, öğretmen, veli,
yönetici ve içerik operatörü kategorilerini, boş kategoriler dahil, görür.
Engelleme/engel kaldırma ve onayla silme bu ekrandadır. Silme hesabı listeden
kaldırıp girişini kapatır; geçmiş çalışma ve inceleme kayıtları korunur.
Site yöneticisi kendi hesabını kapatamaz; işlemler `account_audit` kaydına alınır.

Yeni sürümü ana ortama geçirmek için feature değişiklikleri commit edilir,
`uygulama-main` klasöründe feature dalı main'e merge edilir ve main ortamının
`yeniden-baslat.bat` betiği çalıştırılır. Merge yapılana kadar geliştirme
kaynakları ana uygulamaya yansımaz. Yerel merge Git push anlamına gelmez.

## Soru verisi

İçe aktarma CSV/JSON içindir; `code`, `exam_type`, `subject`, `image`, `correct_answer` zorunludur. İsteğe bağlı `topic`, `year`, `source`, `choice_count`, `solution_url`, `active`, `bank` (`CIKMIS`/`OGM`) ve `solution_image` alanları vardır. Dosya önce bütünüyle doğrulanır; bir hata varsa uygulanmaz. Operatör ekranı varsayılan olarak yalnız ön izleme yapar; `INSERT_ONLY` mevcut soruları değiştirmez, `UPSERT` günceller.

Kaynak veri mevcutsa `node ornek-veri/ornek_uret.mjs --tum` çıkmış sorular için, `node ornek-veri/ogm_uret.mjs` OGM için Git dışı CSV ve görsel düzeni hazırlar. Betikler `../icerik/data/` altındaki korunmuş çıktıları okur. OGM betiği görselleri `veri/resimler-pilot/ogm` altına bağlar; `--kopyala` bağlantı yerine kopyalar. Büyük CSV için uygulamayı bir kez `YKS_IMPORT_DOSYASI=<CSV yolu>` ortam değişkeniyle başlatın; varsayılan mod `INSERT_ONLY`'dir. İçe alma bitince değişkeni kaldırın. Görsel dosyaları ayrı yedeklenir; veritabanı yedeğine dahil değildir.

Soru görsellerinin beyaz dış kenarları `python scripts/soru-gorsellerini-kirp.py` ile topluca kırpılır. Ön izleme için `--dry-run --limit 100`, yeniden üretmek için `--force` kullanılabilir. Betik `veri/sorular-tum.csv` ve `veri/sorular-ogm.csv` içindeki soru görsellerini işler; kırpılmış kopyalar `veri/resimler-pilot/kirpilmis/` altında aynı göreli yola yazılır. Uygulama varsa bu kopyayı, yoksa özgün dosyayı sunar. Kaynak görseller, CSV/etiketler ve bunlara bağlı hash değerleri değiştirilmez. Kaynak görseller yeniden üretilirse `--force` ile kırpılmış kopyalar da yenilenmelidir.

## Üretim paketi ve tünel

Yerel main adresi `http://localhost:9090`'dır. Cloudflare'da `net.ivme.dev` tünel hedefini `http://localhost:9090` olarak ayarlayın; yerel ve uzak erişim aynı main uygulamasına ulaşır. Paylaşım için React çıktısını içinde taşıyan Spring Boot paketini çalıştırın:

1. `uretim.ayarlar.ornek.bat` dosyasını Git dışında kalacak `uretim.ayarlar.bat` olarak kopyalayın; veritabanı, görsel klasörü, `YKS_SITE_ADRESI=https://net.ivme.dev`, `YKS_COOKIE_SECURE=true` ve `PORT=9090` ayarlarını doldurun. Üretimde `root/root` kullanmayın. Sınırlı rolün kurulumu [12.03 yayın işinde](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) açıklanır; `YKS_FLYWAY_ETKIN=false` ancak yetkili göç tamamlandıktan sonra kullanılmalıdır.
2. Önce iki ayrıcalıklı hesabın geçici parolasını yerelde değiştirin. `uretim-derle.bat` paketi derler; `uretim-calistir.bat` gereken durumda yeniden derleyip tek Java süreci olarak başlatır. Sunucu yalnız `127.0.0.1` üzerinde dinler.
3. Yerel ve tünel adresinde giriş, çıkış, soru görseli, QR, CSRF çerezi, mobil görünüm ve yeniden başlatma kontrolünü yapın. Servis kapalıyken Cloudflare 502 yanıtı beklenir. Vite kaynak dosyaları tünel üzerinden uzun süre önbelleğe alınabildiğinden paylaşılan sitede derlenmiş paketi kullanın. Normal tarayıcıda eski sürüm kalırsa `net.ivme.dev` için sert yenileme veya site önbelleğini temizleme yapın; sorun sürerse eklentileri bu site için kapatıp deneyin.

Yerel main/feature çalıştırma ve izleyici düzeni yukarıdaki ortam tablosundadır.
`yeniden-baslat.ps1` kendi ortamının portunda dönüşümlü JAR klasörlerine derler,
HTML/asset ve `app-version.txt` sürümünü doğrular. Çalışan uygulama hata halinde
önceki pakete döner. İzleyici durumu `backend/target/live-watch.status`, hatalar
`live-watch.log` ve `application.stderr.log` dosyalarındadır. Açık tarayıcı yeni
`app-version.txt` değerini görünce sayfayı yeniler.

Üretimde `YKS_SITE_ADRESI` geçerli HTTPS adresi ve güvenli oturum çerezi zorunludur; geçici parolalı ayrıcalıklı hesap varsa uygulama açılmaz. [Yayın öncesi kalan işler](docs/plan/12_KALAN_ICERIK_VE_YAYIN.md) açık maddeleri listeler.

## Doğrulama

- Arka yüz: `cd backend; mvn test` (`ivme_test` veritabanını kullanır; testler onu temizleyebilir).
- Ön yüz: `cd frontend; npm run build`.
- Yerel Chrome uçtan uca: `node testler/e2e.mjs [çıktı klasörü] [--mobil]`. Test yeni kullanıcı ve geri bildirim oluşturur; yalnız yerel adreste çalışır. Ayrıcalıklı ekranlar ancak ilgili `YKS_E2E_YONETICI*` veya `YKS_E2E_OPERATOR*` ortam değişkenleri verilirse denenir.

**Git:** Geliştirme kolu `feature/ivme-yol-haritasi`, yerel production kolu `main`; doğru uzak depo `ivme` adıdır. Kullanıcının son isteği gereği değişiklikler yerel commit edilir, tüm işler bitip yorum alınana kadar push yapılmaz.

Kaynaklı ders notları ve 53.019 etkin sorunun etiket dizini `/kaynakli-ders-notlari` altında bulunur. Konu/alt konu için 21 rehber, 44 soru kalıbı ve akıllı çalışma yönlendirmesi vardır. Kapsam ve testler [notlar kaydında](docs/KAYNAKLI_DERS_NOTLARI.md), PostgreSQL'deki yeniden kullanılabilir araştırma arşivi [analiz kaydında](docs/KAYNAKLI_SORU_ANALIZI.md) açıklanır; tüm müfredat analizi tamamlanmış sayılmaz.
