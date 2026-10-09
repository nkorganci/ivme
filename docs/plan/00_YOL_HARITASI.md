# İvme — yaşayan ürün ve uygulama yol haritası

| Alan | Değer |
|---|---|
| Güncelleme | 2026-10-09 |
| Durum | Yaşayan plan; yalnız adım kayıtlarında doğrulanan işler tamamlanmış sayılır. |
| Tek kaynak | Bu dosya ürün kapsamı; [12_NUMARALI_IS_LISTESI.md](12_NUMARALI_IS_LISTESI.md) küçük işlerin güncel durum kaynağıdır. `D:\workspace\Computer General\ivme projesi yapilacak olanlar\` kolay erişim kopyası her adımda eşitlenir. |
| Kod deposu | `D:\workspace\ivme\uygulama` → `https://github.com/nkorganci/ivme`, çalışma kolu `feature/ivme-yol-haritasi` |
**İlgili belgeler:** [numaralı iş listesi ve yeni oturum kuralı](12_NUMARALI_IS_LISTESI.md), [sıradaki 07.06 görev dosyası](17_07_06_SURELI_PRATIK.md), [uygulama README](../../README.md), [mevcut API/mimari](../API-ve-mimari.md), [çalışma ilkeleri](01_BEST_PRACTICES.md), [kaynak ve referanslar](02_REFERANSLAR.md), [mevcut durum](04_MEVCUT_DURUM.md), [veritabanı geçişi](05_VERITABANI_GECISI.md), [tünel ve UI provası](08_TUNEL_VE_UI_PROVASI.md), [soru denemeleri](09_SORU_DENEMELERI.md).

## Ürün amacı ve ilk sınır

Öğrenci bir konuyu öğrenir, seviyesine uygun soruları çözer, her denemesinden geri bildirim alır ve hangi alt beceriyi tekrar çalışacağını görür. TYT/AYT ilk içerik kümesidir; sınav türü, ders, konu, alt konu ve soru tipi veriyle tanımlanır. TUS, DUS, dil ve diğer sınavlar sonraki içerik paketleri olarak eklenir. İlk kullanım yaklaşık 50 kişi; tasarım ve veri modeli daha büyük kullanım için genişletilebilir olmalı, ilk sürümde dağıtık sistem kurulmaz.

İndirilen eğitim materyalleri için hedeflenen kullanım kişisel ve ticari olmayan çalışmadır.

**2026-10-08 tarihli başlangıç envanteri (tarihsel):** `uygulama/` içinde React/Vite, Java/Spring Boot, PostgreSQL/Flyway; soru bankası ve çıkmış sorular; süreli sınav, geçmiş, QR, öğrenci giriş/kayıt ve yönetim ekranı var. Mevcut API belgesi beş temel tabloyu tanımlar. Soru bankasında tek tek cevap denemeleri ve çalışma süresi kalıcı olarak saklanmıyor; sınav sonuçları saklanıyor. Yönetim ekranında şu anda soru düzenleme, geri bildirim ve içe alma da bulunuyor. Bunlar yeni istekle hizalanacak. Yaklaşık 80 bin soru dosyası/iş hattı var; bütünlük, erişim ve cevap eşleşmesi doğrulanmadan "yayındaki soru" sayısına katılmayacak. Çalışma ağacında bu plandan önce başlamış, commit edilmemiş kod değişiklikleri mevcut; her adım bunları sahiplenmeden ayrı inceleyecek.

### Her AI/insan çalışma oturumunun değişmez akışı

1. Önce [numaralı iş listesindeki](12_NUMARALI_IS_LISTESI.md) `SIRADAKI` numarayı, o işin görev dosyasını, ilgili kodu ve `git status` çıktısını oku. Yalnız bu alt işe veya kullanıcının araya eklediği yeni önceliğe çalış. Bir işi gereksiz yere yeniden başlatma.
2. Adımı başlatırken aşağıdaki özet/kapsam/kabul ölçütlerini gözden geçir; yeni fikir geldiyse önce bu dosyada kararı ve bağımlılıkları güncelle. Kapsam büyürse küçük, bitirilebilir alt işe böl.
3. İlgili UI ekranını kullanıcı açısından kontrol et: masaüstü ve dar ekran; boş, yükleniyor, hata, başarılı, erişim yok durumları; klavye kullanımı. Kullanıcının beğenmediği kararları aynı adımda düzelt, gerekirse kabul ölçütünü güncelle.
4. Yalnız o adımla ilgili anlamlı testleri çalıştır; veri göçünde geri dönüş/yedek; güvenlikte yetki ve sızıntı testleri. Sonucu ve eksikleri aşağıdaki adım kaydına yaz.
5. `00_YOL_HARITASI.md`, gerekirse `01_BEST_PRACTICES.md`, API belgesi ve README'yi aynı değişiklikte güncelle. Kaynak PDF/örnek/araştırma dosyaları `02_REFERANSLAR.md` üzerinden ayrı tutulur.
6. İlgili dosyaları açıkça `git add` et ve feature branch'te commit oluştur. **Kullanıcının son kararı gereği tüm işler bitip kullanıcı yorum verene kadar GitHub'a push yapma.** Commit, UI kontrolü, test ve kalan riskleri kaydet; sırları stage etme. Nihai push için yalnız `ivme` uzak deposunu kullan.

**Alt iş kayıt şablonu:** `No`; `Durum: BITTI | SIRADAKI | YAPILACAK | KULLANICI`; `Tarih`; `Karar/değişiklik`; `UI kontrolü`; `Test`; `Yerel commit`; `Sonraki bağımlılık`. `BITTI` yalnız ilgili alt işin kanıtlanmış kapsamı için yazılır. Kararlar değişince eski satırı silme; kısa tarihli notla neden değiştiğini yaz. Öncelik sırası bu plana göre değişebilir.

## Kabul edilmiş ürün tanımları

- **Soru çözme olayı:** Her cevap gönderimi ayrı `attempt` kaydıdır. İlk deneme, yeniden deneme ve doğru cevabı gösterme ayrı olaylardır. Ana başarı istatistiği *ilk deneme* üzerinden hesaplanır; yeniden deneme öğrenme etkinliğidir. Boş bırakma, sınav bittiğinde ayrıca kaydedilir.
- **Çalışma süresi:** Soru açma ile gönderim arasındaki *aktif* süre yaklaşık ölçülür. Sekme arka plana geçtiğinde, pencere kapandığında veya belirlenen boşta kalma eşiği aşılınca sayaç durur. Sunucu zamanı olay sırasını doğrular; istemci süresi kusursuz ölçüm diye sunulmaz.
- **Soru sayıları:** Toplam = erişilebilir, etkin ve koleksiyona atanmış tekil sorular; çözülen = öğrencinin en az bir kez cevapladığı tekil sorular; kalan = toplam − çözülen. Tekrar denemeler ayrıca sayılır. Filtre bazında toplam/çözülen/kalan aynı kuralla hesaplanır.
- **Zorluk:** Öğrencinin `kolay/orta/zor` oyu, içerik editörünün etiketi ve gerçek ilk deneme başarı oranı ayrı tutulur. Yetersiz örneklemde "veri az" gösterilir; kolaylık oyu tek başına nesnel zorluk değildir.
- **Aktif kullanım:** Giriş zamanı tek başına aktif süre sayılmaz. Etkileşim veya sınırlı aralıklı heartbeat ve görünür sekme koşulu gerekir. Öğrenci yalnız kendi hareketlerini görür; yönetici yalnız toplu kullanıcı ve kullanım sayıları görür. Birey listesi/tekil davranış gözetimi yönetim paneline konmaz.
- **Sınav doğruluğu:** Zamanlı denemede cevap/ipuçları teslim edilene kadar gizli; serbest pratikte öğrenci açıkça isterse cevap gösterilir. Yanlış sonrası tekrar deneme sayısı ürün ayarıdır, geçmiş ilk deneme sonucu değişmez.
- **Öğrenme önerisi:** “50 Türkçe sorusunda şu soru tiplerinde zorlanıyorsun” yalnız yeterli ve çeşitli veri varsa söylenir; öneri soru tipi → önkoşul alt konu → ilgili ders notu → hedefli tekrar dizisi verir. Bu eğitim amaçlı bir ipucudur, kesin tanı değildir.

## Uygulama sırası

### Adım 1 — Envanter, ürün sözleşmesi ve Git düzeni

**Özet:** Mevcut kodu kaybetmeden çalışılabilir temel belirle. **Yapılacak:** Uygulama, statik eski site ve Python veri hattını ayrı envanterle; mevcut özellik/eksik tablosu oluştur; 80 bin kaydın kaynağını ve kapsamını say; eski `yks_hazirlik` ile istenen `ivme` DB geçişini karar kaydına al; varsayılan `origin` ile yeni `ivme` uzak deposunu açıkça ayır; çalışma ağacındaki eski değişiklikleri ayrı gözden geçir. **UI kontrolü:** Mevcut ana sayfa, soru, sınav, geçmiş ve yönetim ekranlarını ekran görüntüsü veya kısa kontrol listesiyle doğrula. **Bitti sayılır:** Tek sayfalık gerçek durum ve hangi özelliklerin zaten çalıştığı belli; plan dosyaları feature branch'te yerel commit edilmiş; eski değişiklikler korunmuş. **Durum:** BITTI (2026-10-08). **Kayıt:** [envanter ve UI kontrol listesi](04_MEVCUT_DURUM.md); çalışan tarayıcı kontrolü 2. adımın göç doğrulamasına bırakıldı. Eski kod değişiklikleri korunuyor.

### Adım 2 — Veritabanı adı ve veri modeli

**Özet:** Kalıcı öğrenci ilerlemesinin şemasını kur. **Yapılacak:** Yerel PostgreSQL'de `ivme` veritabanını oluştur; pgAdmin oturumu ile PostgreSQL rol kimliğini ayrı doğrula; mevcut `yks_hazirlik` verisi varsa önce yedek ve göç kararı al; uygulama bağlantısını ortam değişkeninden `ivme`ye geçir; Flyway ile `attempts`, `study_sessions`, `session_questions`, `question_feedback`, `goals`, `activity_events`, soru taksonomisi/önkoşul ilişkileri için gerekli en küçük tabloları ekle. Kullanıcı/soru/oturum dış anahtarları, tekil kısıtlar ve sorgu indeksleri tasarla. **UI kontrolü:** Eski giriş, soru ve geçmiş verisi kaybolmadan çalışmalı; yeni kayıt için boş durum anlaşılır olmalı. **Bitti sayılır:** Temiz kurulum ve mevcut veri göçü denenmiş, geri yükleme denenmiş, tablo yapısı API belgesinde. **Durum:** BITTI (2026-10-08). **Kayıt:** [geçiş, şema ve doğrulama](05_VERITABANI_GECISI.md). Mevcut `feedback` tablosu soru oyu için yeniden kullanıldı. Kaynak/hedef sayıları eşit; ayrı test DB'sinde masaüstü/telefon UI kontrolü ve 27 test geçti. Eski hesabın `root/root` girişi yeni kopyada kabul edilmedi; gerçek hesap şifresi değiştirilmeden sonraki güvenlik adımında çözülecek.

### Adım 3 — Tasarım sistemi ve ekran prototipleri

**Özet:** Profesyonel, sakin ve okunabilir bir öğrenci arayüzü tasarla. **Yapılacak:** Menü haritası, masaüstü/tablet/telefon düzeni, tipografi, renk/kontrast, boş-hata-yükleniyor durumları, form bileşenleri, erişilebilir odak/klavye akışı; ana sayfa, konu sayfası, soru çözme, test kurma, ilerleme, hesap ve yönetim için düşük maliyetli prototip. Soru ekranı: solda soru görseli, altında şıklar; sağda `Karalama`, `QR/Çözüm`, `Konu notu/İpucu` sekmeleri; dar ekranda sağ panel altta veya sekmeyle açılır. **UI kontrolü:** En az bir büyük ve bir telefon ekranında soru okunabilirliği, şık tıklama, klavye ve tasarım onayı. **Bitti sayılır:** Onaylı ekran sözleşmesi ve bileşen listesi; kod değişimleri küçük parçalar halinde yapılabilir. **Durum:** BITTI (2026-10-08). **Kayıt:** [ekran sözleşmesi](06_TASARIM_SOZLESMESI.md) ve [etkileşimli soru prototipi](../prototip/soru-ekrani.html) 1280/390 px kontrolünden geçti; kullanıcı yerleşim ve mor vurguyu onayladı. Gerçek uygulamaya aktarım ilgili işlev adımlarında yapılacak.

**03.02 erişilebilir bileşen denetimi (2026-10-09):** [Ortak erişilebilirlik temeli](18_03_02_ERISILEBILIR_BILESEN_DENETIMI.md) klavye/odak davranışı, 16 px temel yazı ve 44 px hedefleri kaydeder. Her gerçek ekran kendi adımında ayrıca doğrulanır.

### Adım 4 — Güvenlik, gizlilik ve yönetici kapsamı

**Özet:** Site paylaşılmadan önce erişim ve veri sınırlarını düzelt. **Yapılacak:** Sadece öğrenci ve toplu istatistik gören yönetici yetkileri; mevcut yönetim soru düzenleme/ithalat/geri bildirim bölümlerini ürün rolünden çıkarıp yerel bakım işine taşıma veya ayrı operatör yetkisi tasarlama; her API'de nesne düzeyi kullanıcı sahipliği; oturum/CSRF, giriş hızı, güvenli çerez, gizli anahtar/şifre yönetimi; oturum/etkinlik verisi için saklama ve silme kararı; yedekleme; görsel yolu doğrulama; tünel arkasındaki gerçek IP başlıklarını sadece güvenilen vekilden kabul etme. Geliştirme için paylaşılan basit kimlik bilgileri internet sürümünde kullanılmaz. **UI kontrolü:** Öğrenci başka öğrencinin verisini veya yönetimi göremez; yönetici yalnız izinli toplu veriyi görür; hatalar bilgi sızdırmaz. **Bitti sayılır:** Yetki/kimlik/CSRF ve negatif senaryo testleri geçer; internete açma kontrol listesi tamamdır. **Durum:** ACIK (2026-10-08). **Kayıt:** [yetki ayrımı ve açık güvenlik işleri](07_GUVENLIK_YETKI.md). İlk alt işte ADMIN yalnız toplu istatistik, OPERATOR içerik bakımı API'si kullanır. Tünel üzerinden üretim yayını için diğer güvenlik maddeleri açık.

### Adım 5 — Bilgisayarda çalıştırma ve `net.ivme.dev` paylaşımı

**Özet:** Önce tek bilgisayarda kararlı çalıştır, ardından Cloudflare Tunnel ile deneme grubuna aç. **Yapılacak:** React üretim çıktısını Spring Boot üzerinden `/` ve `/api` aynı kökende, kullanıcının çalışan tünel hedefi olan `http://localhost:5173` portunda sun; `cloudflared` ile uygulamanın denetimli başlatılması; PostgreSQL ve uygulama portlarının yalnız yerel dinlemesi; HTTPS dış erişim, güvenli cookie, sabit QR adresi; bilgisayar uyku/yeniden başlama senaryosu; yedek ve geri yükleme. Geliştirme Vite sunucusu aynı portu yalnız yerel çalışmada kullanır; paylaşımda üretim paketi kullanılır. İlk kapalı pilot için gerekirse Cloudflare Access davet listesi ekle; halka açık kayıt daha sonra ürün kararıdır. **UI kontrolü:** Yerel ve başka cihazdan giriş, soru görseli, QR, oturum, çıkış, telefon görünümü. **Bitti sayılır:** Tünel üzerinden uçtan uca akış ve yeniden başlatma testi geçmiş; erişim sınırı belgelenmiş. **Durum:** ACIK (2026-10-09). **Kayıt:** [20/20 masaüstü ve mobil E2E ile gerçek tünel üretim paketi provası](08_TUNEL_VE_UI_PROVASI.md) geçti. Gerçek DB'deki geçici yetkili parolalar ve kalıcı yeniden başlatma denetimi açık.

### Adım 6 — Soru başına çözüm deneyimi

**Özet:** Her sorunun tüm denemelerini güvenilir biçimde tut. **Yapılacak:** İlk yanıt, tekrar dene, cevap göster, atla; doğru/yanlış, seçilen şık, sunucu zamanı, aktif süre, ders/konu/alt konu/soru tipi, kaynak, oturum kimliği; tekrar gönderme ve ağ kopması için idempotency; cevap değiştiğinde eski kayıtların korunması; bireysel kolay/orta/zor geri bildirimi. Karalama soru ve kullanıcı bazında saklanır; büyük çizimler gerekirse dosya deposunda. QR yalnız sorunun giriş gerektiren adresine gider. **UI kontrolü:** Yanlış sonrası tekrar, cevap gösterme izni, sekmeler, mobil karalama ve kayıt başarısızlığı. **Bitti sayılır:** Yenileme/giriş/başka cihaz sonrası deneme geçmişi doğru; istemci doğru cevabı izin verilmeden alamaz. **Durum:** ACIK (2026-10-09). **Kayıt:** [kayıtlı pratik, karalama ve açık oturum işleri](09_SORU_DENEMELERI.md); V10/test DB'sinde 44 test geçti, 2 atlandı; masaüstü/mobil 26/26 E2E geçti. Gerçek DB V9 ve çalışan site korunuyor; V10 yeniden başlatmada uygulanır.

### Adım 7 — Seçilebilir çalışma ve deneme oturumları

**Özet:** Öğrenci hangi soruyu, kaç tane ve hangi sürede çözeceğini kurar. **Yapılacak:** Sınav türü/koleksiyon/ders/konu/alt konu/soru tipi, sayı, süreli/süresiz, yalnız yeni/yalnız önceki/karışık, önceden yanlışlarım seçimi; eşleşen ve kalan soru sayısı; yeterli soru yoksa açık uyarı; rastgele ama tekrarlanabilir oturum sırası; otomatik kayıt, süre bitişi, boş sorular ve sonuç. Pratik ile gerçek deneme kuralları ayrı; sonuçlar sonradan cevap anahtarı değişse de sabit. **UI kontrolü:** Kurulum, başlatma, ara verme/geri gelme, süre bitişi ve sonuç. **Bitti sayılır:** Her seçenekle çalışan en az bir anlamlı uçtan uca senaryo; aynı soru yanlışlıkla oturumda iki kez gelmez. **Durum:** ACIK (2026-10-09); [aday sayıları](10_SORU_KAPSAMI.md), [sınavda dört seçim modu](11_SINAV_SORU_SECIMI.md), kalıcı süresiz pratik, [pratikte dört seçim modu](16_07_05_PRATIK_SECIMI.md), [süreli pratik](17_07_06_SURELI_PRATIK.md) ve [pratik geçmişi](19_07_07_PRATIK_GECMISI.md) eklendi. Alt konu/soru tipi için doğrulanmış etiketler ve gerçek cihaz provası açıktır.

### Adım 8 — Öğrenci ilerleme ve kullanım panosu

**Özet:** Günlük, haftalık, aylık ve tüm zamanların somut ilerlemesini göster. **Yapılacak:** Tekil çözülen ve toplam deneme, doğru/yanlış/boş, ilk deneme başarı oranı, aktif süre, ders/alt konu/soru tipi kırılımı, toplam/çözülen/kalan, zaman çizelgesi, oturum/deneme geçmişi; gün/hafta/ay tarih aralıklarının kullanıcının saat dilimiyle tutarlı hesaplanması; aktivite ve oturum süresinin ayrı gösterimi; boş veri ve az veri mesajı. **UI kontrolü:** Dönem filtresi, grafik ile tablo eşleşmesi, telefonda okunabilirlik. **Bitti sayılır:** Ham olaylardan hesaplanan örnek senaryolarla panel sayıları bire bir uyuşur. **Durum:** ACIK (2026-10-09); [filtreli toplam/çözülen/kalan sayıları](10_SORU_KAPSAMI.md) eklendi, dönem panosu açık.

### Adım 9 — Hedef ve çalışma ritmi

**Özet:** Öğrenci günlük/haftalık/aylık soru, test ve deneme hedefleri koyar. **Yapılacak:** Hedef periyodu, soru/test/deneme sayısı, tamamlanma koşulu, ders tercihi, geçmiş hedeflerin saklanması, kaçırılan günlere yargılayıcı olmayan öneri; soru çözüm tekrarları ve tekil sorular hedefte ayrı tanımlanır. **UI kontrolü:** Hedef oluştur/düzenle/durdur, bugünkü durum ve haftalık görünüm. **Bitti sayılır:** Aynı oturum iki kez sayılmaz; zaman dilimi değişimi ve gün sonu sınırı tutarlı. **Durum:** YAPILACAK.

### Adım 10 — Zayıf alan ve soru tipi analizi

**Özet:** Tekrar edilen yanlışlardan çalışılacak alt konuyu öner. **Yapılacak:** Taksonomide soru → beceri/soru tipi → alt konu → önkoşul eşleşmesi; ilk deneme doğruluğu, süre, tekrar ve son dönem ağırlığı; az veride belirsizlik; 50 Türkçe sorusu örneği için paragraf, anlam, dil bilgisi gibi *gerçek etiketlere* göre kırılım; öneri bağlantısı ve yeniden ölçüm. Algoritma önce şeffaf kural ve SQL ile başlar; AI yalnız içerik etiketleme/öneri metni için kullanılır. **UI kontrolü:** “Neden bunu öneriyoruz?” ve “Şimdi çalış” akışı; öğrencinin yanlış etiket bildirebilmesi. **Bitti sayılır:** Bilinen örnek veri setinde beklenen öneriler çıkar; yanlış pozitifler gözden geçirilir. **Durum:** YAPILACAK.

### Adım 11 — Yöneticiye yalnız toplu kullanım istatistiği

**Özet:** Ürün yöneticisi kaç kişinin kullandığını ve sistem sağlığını görür. **Yapılacak:** Toplam kayıtlı kullanıcı, seçilen dönemde aktif kullanıcı, günlük/haftalık/aylık oturum, soru çözüm hacmi, içerik kapsamı ve temel hizmet hataları; küçük gruplardan birey çıkarılamaması için uygun eşik/yuvarlama; anonim toplu ölçüm. İçerik bakım araçları öğrenci ürününün yönetim ekranında görünmez. **UI kontrolü:** Yalnız toplu sayılar; kişi adı, e-posta, tekil cevap veya ayrıntılı oturum yok. **Bitti sayılır:** ADMIN dışı erişim reddedilir, panelde bireysel veriye dönüş yolu yoktur. **Durum:** YAPILACAK.

### Adım 12 — PDF soru hattını üretim kalitesine taşıma

**Özet:** Var olan yaklaşık 80 bin soruyu görsel ve metin olarak izlenebilir biçimde işle. **Yapılacak:** Mevcut Python hattını önce değerlendir; PDF sayfası/koordinat, soru kırpımı, şık, cevap anahtarı, çözüm/QR, kaynak sürümü ve checksum ile tekil `question_id` eşleştir; gömülü metin varsa çıkar, taramada OCR uygula, formül/şekil şüphelilerini inceleme kuyruğuna at; yinelenenleri işaretle; orijinal PDF ve soru görselini sakla. Web için çözünürlüğe göre optimize edilmiş görsel, AI için aranabilir metin ve gerektiğinde özgün kırpım birlikte kullanılır. 80 bin sorunun tamamını ilk gün AI'ya göndermeden önce küçük örneklemde kalite ve birim maliyeti ölç. **UI kontrolü:** Kırpım, şıklar, doğru cevap ve çözüm bağı her kaynak türünde örneklenir. **Bitti sayılır:** Tekrar çalıştırılabilir, durup devam eden aktarım; hata raporu ve kaynak sayfasına iz sürme. **Durum:** YAPILACAK.

### Adım 13 — OGM konu PDF'leri ve iç bilgi tabanı

**Özet:** OGM konu anlatımlarını sitede özgün PDF olarak aç; sorularla doğrulanmış konu kimliği üzerinden bağla. **Yapılacak:** Yerel OGM kataloğundaki konu PDF'lerini sınıflandır, artımlı metadata kaydı oluştur, öğrenciye filtrelenebilir “Konu anlatımları” bölümü ve güvenli PDF görüntüleyici ver. Gelecekteki AI ipuçları için PDF sayfası/başlık/konu/sürüm ve metin/OCR parçalarını yalnız iç bilgi tabanında tut; bu parçalar öğrenci için PDF'nin yerine geçmez. **UI kontrolü:** PDF masaüstü/telefonda açılır; aynı konunun doğrulanmış sorularına geçiş ve boş durum nettir. **Bitti sayılır:** Örnek kaynaklarda doğru PDF, doğru konu bağı ve yetki/yol güvenliği sınanır. **Durum:** YAPILACAK. [OGM alt işleri](15_OGM_PDF_VE_KONU_SORU_BAGI.md).

### Adım 14 — AI ile soru etiketleme pilotu

**Özet:** Eksik kategori, soru tipi ve önkoşul bilgisini kontrollü tamamla. **Yapılacak:** 200–500 dengeli örnek soru için insan etiketli altın veri; modelin yalnız mevcut taksonomiden seçim yapması ve `emin değilim` diyebilmesi; `question_id`, kaynak, model/sürüm, güven puanı, önerilen etiket, kanıt ve inceleme durumunu saklama; düşük güvenli veya çelişkili örnekleri insan kuyruğuna alma; batch işleme, önbellek ve birim maliyet raporu. 80 bin soruya ölçekleme kararı pilot doğruluğuna bağlı. **UI kontrolü:** Bakım aracında öneri/kanıt/onay/red ve kaynak görseli; öğrenciye onaysız etiket gitmez. **Bitti sayılır:** Ders/soru tipi bazlı ölçülmüş doğruluk, maliyet ve yanlış sınıflandırma analizi. **Durum:** YAPILACAK.

### Adım 15 — Kaynaklı ipucu ve öğrenme desteği

**Özet:** Öğrenci çözdükten sonra kısa püf noktası, yanlış nedeni ve ilgili notu görür. **Yapılacak:** Onaylı soru etiketi + onaylı ders notu parçası + çözümden kısa açıklama üret; her öneriye kaynak sayfası ve içerik sürümü bağla; yanlış cevap/hayal ürünü bilgi tespiti için editör kontrolü; maliyet için yalnız seçili sorularda önceden üretme ve saklama; özel öğrenci verisini harici modele göndermeden önce açık ürün kararı. Öğrenci kendi başına çözmeden yanıtı sızdıran ipucu gösterilmez; pratikte isteğe bağlı, sınavda teslim sonrası. **UI kontrolü:** Kısa, anlaşılır, kaynağa dönen ipucu; “yararsız/hatalı” bildirimi. **Bitti sayılır:** Pilot konu setinde öğretmen/uzman incelemesi, fayda geri bildirimi ve hata oranı raporu. **Durum:** YAPILACAK.

### Adım 16 — Pilot, bakım ve büyüme kararı

**Özet:** Yaklaşık 50 kullanıcıyla gerçek kullanımı ölç, ardından darboğaza göre büyüt. **Yapılacak:** Davetli pilot, performans/erişilebilirlik, kritik akış testleri, veritabanı ve görsel yedeğinin geri yüklenmesi, gözlemlenebilirlik, içerik şikayet süreci; sorgu planı, indeks ve görsel önbelleği. Gereksinim oluşursa dosyaları nesne depolamaya, oturumu ortak depoya, işleri kuyruğa taşı; gerekmeden mikroservis/vektör veritabanı ekleme. Yeni sınav türü için veri paketi ve taksonomi sözleşmesi kullan. **UI kontrolü:** Pilotun en sık kullandığı akışlarda hızlı ve anlaşılır deneyim; mobil ve düşük bağlantı. **Bitti sayılır:** Pilot bulguları öncelik sıralı yeni adımlara dönüşür, belge ve Git geçmişi güncel. **Durum:** YAPILACAK.

## İlk iş paketi ve karar kapıları

**Sıradaki planlı iş:** 12.04 tekrar çalıştırılabilir toplu iş ve hata raporu; [12.03 metin/OCR pilotu](23_12_03_METIN_OCR_PILOTU.md) girdidir. 04.07'nin yetkili rol kurulumu beklenirken bağımsız kaynak işi sürer. Tamamlanan ve açık tüm alt işler [numaralı listede](12_NUMARALI_IS_LISTESI.md) tutulur. Kullanıcı fikriyle öncelik değişirse liste ve ilgili görev dosyası tarihli kararla güncellenir.

**Karar gerektiren noktalar:** İlk pilotun Cloudflare Access ile davetli mi yoksa uygulama kaydıyla açık mı olacağı; yeni sınav taksonomisinin ilk örneği; ders notu ve AI içeriğini kimin onaylayacağı. Ham etkinlik olayları için 90 günlük saklama kararı alındı; diğer veriler için silme/dışa aktarma akışı ayrıca tasarlanacak. Bu kararlar ilgili adıma gelince somut ekran/veri örnekleriyle alınır.

### 2026-10-08 — Kayıt ve ilk giriş önceliği

Kullanıcı isteğiyle kayıt akışı Adım 4'ten önce uygulamaya alındı: yeni öğrenci kullanıcı adı, şifre, e-posta ve cep telefonu girer; mevcut öğrenci ilk girişte eksik iletişim bilgisini Hesap ekranında tamamlar. İletişim bilgisi değişikliği mevcut şifreyi ister. Numara biçimi doğrulanır ve standart biçimde saklanır; SMS/e-posta gönderimi olmadığı için adres/numara sahipliği doğrulanmış sayılmaz ve hesap kurtarmada kullanılmaz. Yeni şifreler en az 8 karakterdir; mevcut BCrypt depolaması için 72 UTF-8 bayt sınırı uygulanır. Ayrıntılı sözleşme ve kontrol listesi [kayıt notunda](03_KAYIT_VE_ILETISIM.md); genel güvenlik, DB adı ve tünel adımları açık kalır.

### 2026-10-08 — Yerel yetkili hesaplar ve etkinlik saklama

Yönetici adı `ivmeadmin`, ayrı içerik operatörü adı `ivmeoperator` olarak belirlendi. Kullanıcının seçtiği ortak geçici parola yalnız yerel `ivme` veritabanında BCrypt ile tutulur; üretim, parola değiştirme işareti olan yetkili hesapla başlamaz. Ham etkinlik olayları 90 gün sonra otomatik silinir. Gerçek uygulama verisi, doğrulama ve açık işler [Adım 4 güvenlik kaydında](07_GUVENLIK_YETKI.md). Gelecekte kullanıcıya soru sorulursa **Soru 1**, **Soru 2** biçiminde belirgin numaralandırılır.

### 2026-10-09 — Parola alt sınırı

Kullanıcının yeni kararıyla kayıt, Hesap ekranından parola değiştirme ve üretimde yapılandırmayla yeni yönetici oluşturma için alt sınır **8 karakter** oldu. BCrypt 72 UTF-8 bayt üst sınırı, geçici ayrıcalıklı parola engeli, CSRF ve giriş hızı koruması sürer. [04.10](12_NUMARALI_IS_LISTESI.md) kapsamında kayıt ve değiştirme sınır testleri eklenir.

### 2026-10-09 — OGM konu PDF'si ve soruya geçiş

`Kaynaklar/ogm-materyal` içine yeni ve mevcut soru bankaları ile konu anlatımları girecek. Öğrenci konu anlatımını **yalnız özgün PDF olarak** açacak. Menüde “Konu anlatımları” alanından PDF'ye, oradan doğrulanmış aynı konunun sorularına/pratik veya teste geçecek; sayı, geçmiş modu ve mevcutsa zorluk tercihi kullanıcıya kolay anlaşılır biçimde sunulacak. OGM katalog ve soru kartı hattı ilk referanstır; ad benzerliği tek başına konu eşlemesi sayılmaz. İşler [12.05, 13.04–13.05 ve 07.08–07.09](12_NUMARALI_IS_LISTESI.md) olarak eklendi; [uygulama kabulü](15_OGM_PDF_VE_KONU_SORU_BAGI.md) ayrı tutulur. Bu karar alınırken sıradaki 07.04 çalışması korunmuştur.

### 2026-10-09 — Codex iş/model eşlemesi

Kullanıcının token tasarrufu isteğiyle açık her alt işe model ve çaba önerisi [numaralı listeye](12_NUMARALI_IS_LISTESI.md) yazıldı. Başlangıç varsayılanı sıradaki 07.06 için GPT-6 Luna · Medium; güvenlik, veri göçü ve çok katmanlı işler Sol'a; bütünsel pilot denetimi Astra'ya ayrıldı. Repo `.codex/config.toml` sonraki yeni oturumda varsayılanı uygular. Aktif oturum modelini dosya güncellemesi değiştirmez; geçiş Codex'in `/model` seçicisiyle yapılır.
