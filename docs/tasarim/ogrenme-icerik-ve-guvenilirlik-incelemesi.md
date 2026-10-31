# Öğrenme, kaynak işleme ve kayıt güvenilirliği: bulgular ve önerilen yaklaşım

**Durum: İNCELEME / UYGULAMA BEKLİYOR.** Bu belge kullanıcının paylaştığı bütün maddeleri birlikte değerlendirir. Bir uygulama talimatı, tamamlanmış düzeltme veya yeni içerik üretme izni değildir. Bu çalışma kapsamında yalnız dokümantasyon hazırlanır; uygulama kodu, öğrenci verileri, kaynak PDF'ler, modeller ve yayın değiştirilmez.

**İnceleme tabanı:** `2026-10-31`, yerel `8fe4403` commit'i. İlgili proje `D:/workspace/ivme/uygulama`dır; sohbetin başlangıç dizini olan `wrestling` değildir. Bulgular kaynak kodu, şema, mevcut test dosyaları, mimari belgeler ve dosya envanterinin salt okunur incelemesine dayanır. Canlı öğrenci hesabıyla işlem yapılmadı; kesinti/yarış testleri çalıştırılmadı; bütün PDF sayfaları ve soru görselleri okunmadı. Dolayısıyla **kodda görülen davranış**, **kullanıcının bildirdiği sorun**, **doğrulanacak risk** ve **öneri** birbirinden ayrılmıştır.

## 1. Önce okunacak kısa karar özeti

Önerilen sıra: **kayıt kaybını önle → ortak kimlikleri ve sayım kurallarını netleştir → pratik akışını birleştir → kaynaklı pilotu tamamla → üretimi otomatikleştir → ölçerek genişlet**. Testler ve temel izleme ilk aşamadan itibaren bu işlere eşlik etmelidir.

1. Öğrencinin cevaplarının kalıcı kaydı en yüksek önceliktir. Sunucu onayı olmadan “kaydedildi” denmemeli; reddedilen bir olay diğer bekleyen olayları sildirmemeli.
2. Mevcut ortak katalog, PostgreSQL olay kayıtları, soru bankası, PDF/OCR önbellekleri ve test altyapısı korunmalı. Bunların yerine sıfırdan ikinci sistem kurulmasına gerek yok.
3. “Konuyu Öğrenelim” ortak katalogdan tam bağımsız olmayan fakat ayrı başlık/ünite tanımları olan bir öğretim katmanıdır. Bu katmanın görünen müfredat adları ortak kaynağa bağlanmalı; pedagojik bölüm başlıkları ayrı anlamda korunmalıdır.
4. Konu testi/çıkmış sorular/alıştırma bağlantıları, doğrudan ortak soru çözüm ekranında **PRATIK** oturumu açmalıdır. “Konu testi (12)” ve “Çıkmış sorular (52)” gerçek oluşturulabilir setin sayısını göstermelidir.
5. Bütün cevaplar kaydedilmeli; fakat **çözülen tekil soru**, **tekrar denemesi**, **rehberli çalışma**, **örneği okuma** ve **bağımsız ustalık** aynı ölçü olmamalıdır.
6. PDF'lerde bir defalık işlemenin doğru karşılığı: **değişmeyen girdi + aynı işlem sürümü için yeniden çıkarım yapmamak**. Hatalı OCR veya değişmiş kaynak gerektiğinde yeniden incelenebilmelidir.
7. Önce mevcut `bolme-bolunebilme` pilotu üzerinden uçtan uca kalite ölçütleri tamamlanmalı; `temel-kavramlar` bildirilen sorunların regresyon örneği olmalıdır. Yeni bir pilotu sıfırdan yazmak gereksizdir.
8. pgAdmin'in açık olması gerekmez. İzlenmesi gereken PostgreSQL hizmeti, uygulamanın DB bağlantısı, işlem başarısı ve kayıtların geri okunabilirliğidir.

## 2. Mevcut durumda zaten bulunanlar ve doğrulanan boşluklar

| Alan | İncelemede görülen | Sonuç / yapılacak değerlendirme |
|---|---|---|
| Ortak müfredat | Excel `KONULAR` sayfası → kontrollü katalog → `learning_catalog.current_categories` → metadata akışı belgelenmiş | İkinci ana ders/ünite/konu listesi oluşturma. Öğretim katmanındaki bağları tamamla |
| Öğretim adları | `learn/content/units.js` elle tanımlı ünite listesi; `.ders` içinde `baslik`, `unite`, `sinav`, `kategori` | Ana katalog adları değişince bu başlıkların kendiliğinden güncelleneceği varsayılamaz |
| Öğretim kapsamı | 34 `.ders` dosyası mevcut; devir notu 12 pilot yapısında, 22 derinleştirilecek ders ve 22 eksik alt kapsam bildiriyor | Dosya sayısı salt okunur sayıldı; diğer kalite sayıları önceki devir beyanıdır, bu incelemede yeniden doğrulanmadı |
| Banka cevapları | `LearnService.bankAnswer()` sunucuda puanlıyor, `AttemptService` üzerinden bağımsız pratik kaydı ve öğrenme olayı yazıyor | “Hiç DB kaydı yok” doğru değil. Ortak oturum ve bütün alıştırma türlerinin takibi eksik kapsamdır |
| Ders içi cevaplar | `lesson_q` olayları `learning_engine_events` içinde; `correct` istemciden geliyor | Ortak konu sayımına bağlama ve sunucuda doğrulama gerekiyor |
| Konu takibi | `LearningResourceService.progress()` tamamlanmış pratik ve teslim edilmiş deneme kayıtlarını birleştiriyor | `lesson_q` ve self-check akışları bu sorguya doğrudan dahil değil; mevcut banka köprüsü ayrıca korunmalı |
| Kalıcılık kuyruğu | `LearnContext.jsx` 400 yanıtında `setOutbox([])` yapıyor; `api.js` yalnız son 500 olayı saklıyor, depolama hatasını yutuyor | Sessiz veri kaybına yol açabilecek kod yolları var; P0 |
| Kayıt bildirimi | `LessonQuestion` cevap sonrasında sunucu onayı beklemeden yerel sonucu gösteriyor; sessiz modda “Kaydedildi” yazıyor | Yerel bekleyen durum ile DB tarafından onaylanan durum ayrılmalı |
| Tekrar gönderme | Sunucuda `(user_id, client_event_id)` tekilliği var; `BankQuestion.submit()` her çağrıda yeni olay kimliği üretiyor | Yanıtı kaybolan başarılı isteğin kullanıcı tarafından tekrarı aynı işlem kimliğini korumayabilir |
| Setin devamı | `PracticePage.jsx` seti `sessionStorage` içinde tutuyor; anahtarında kullanıcı ve soru tipi (`archetype`) yok | Farklı tip seçiminde eski setin kullanılması ve aynı sekmede hesap geçişi incelenmeli; cihazlar arası set devamı garanti değil |
| Ortak pratik ekranı | Konu sayfası kendi `/calis?tur=...` rotasını açıyor; banka sorusunda ayrıca yeni sekmede `/soru/{code}` bağlantısı var | Yeni sekme bağlantısı kısmen var; doğrudan ortak PRATIK seti gereksinimi karşılanmıyor |
| 52 / 40 uyuşmazlığı | `temel-kavramlar.json`: 413 kayıt, 52 çıkmış; `pickPast()` varsayılan `limit=40`, çağıran bu sınırı değiştirmiyor | Gösterilen sayı ile açılan set uyuşmazlığı kaynak kodunda doğrulandı |
| Beş aynı soru bildirimi | İncelenen temel kavramlar bankasında yinelenen `code` veya `id` yok; seçimlerin bir kısmı kod bazında tekilleştiriyor | Kullanıcı bildirimi açık. Aynı görsel, farklı kod, eski set, render veya kaynak eşleme sorunu henüz elenmedi |
| Soru çözümü | `BankQuestion` varsa çözüm görseli ve soru tipinin genel yaklaşımını gösteriyor; bazı gerçek sorular için özel rehberler var | Her sorunun kaynaklı, adım adım çözümü olduğu sonucu çıkarılamaz; genel strateji soru çözümü yerine geçmez |
| Öğrenci zorluk oyu | `FeedbackService` kullanıcı/soru için `RATING` ve `difficultyVote` saklıyor; `QuestionService` kişisel değerlendirmeyi okuyor | Baştan aynı oylama sistemini kurma. Kişisel filtre, tekrar tercihi ve bütün ekranlara yayılım eksik |
| PDF hattı | Metin, OCR, yerel model, hash önbelleği, kaynak kabulü, iş kuyruğu ve kaynak kayıtları mevcut | Ders anlatımı/şekil/kanıt paketi üretimini bu hattın üzerine ekle |
| PDF ölçeği | `../Kaynaklar` altında 3.423 `.pdf` dosyası sayıldı | Fiziksel dosya sayısıdır; tekil kaynak, TYT/AYT kapsamı, sayfa veya işlenmiş PDF sayısı değildir |
| Testler | 68 `*Test.java` dosyası; ayrıca Node içerik/motor ve UI testleri var | Test altyapısı yok denmemeli. Kritik hata yollarının kapsanması ve otomatik çalıştırılması değerlendirilmeli |
| Sağlık/izleme | `ivme.py durum`, yerel izleyici ve DB tabanlı `ServiceErrorMetrics` mevcut; POM'da Actuator/Micrometer registry bağımlılığı bulunmadı | Çalıştırma yardımcısı, dışarıdan sürekli izleme ve uyarı sistemiyle aynı şey değil |
| Yeni kayıt bildirimi | `AuthController.register()` hesabı onay bekler halde kaydediyor; incelenen akışta e-posta gönderimi veya kalıcı bildirim işi yok | Yöneticiye bildirim ayrı iş olarak eklenmeli; adres biçim kontrolü e-posta sahipliği doğrulaması değildir |
| Agent devri | `AGENTS.md`, onu içe alan `CLAUDE.md`, `docs/devam.md`, plan dizini ve ortak CLI mevcut | Yeni kopya agent kuralları yerine mevcut giriş ve görev kapsamı kullanılmalı |

**Belge güncelliği notu:** `12-icerik-ve-yayin.md` içinde eski “33 ders” anlatımı ile daha aşağıdaki güncel “34 ders” sayımı birlikte bulunuyor. Bu, sayıların birçok belgeye elle kopyalanmasının riskini gösteriyor. Bu inceleme eski içerik görevlerini tamamlanmış saymaz veya yeniden başlatmaz.

### İncelemenin dayandığı yerel kaynaklar

- [Ortak kimlikler ve sayım](../mimari/kimlikler-ve-sayim.md), [öğrenci ilerlemesi](../mimari/ogrenci-ilerlemesi.md), [ortak etiketler](../sozlesmeler/ortak-etiketler.md).
- [Öğretim sözleşmesi](../icerik/konuyu-ogrenelim.md), [PDF ve yerel model](../islemler/pdf-ve-yerel-model.md), [metin çıkarımı](../mimari/metin-cikarimi.md), [kaynak kabulü](../mimari/kaynak-kabulu.md).
- [LearnContext](../../frontend/src/learn/LearnContext.jsx), [öğrenme API/kuyruk kodu](../../frontend/src/learn/api.js), [öğrenme servisi](../../backend/src/main/java/com/hedefyks/learn/LearnService.java), [öğrenme şeması](../../backend/src/main/resources/db/migration/V89__konu_ogrenme.sql).
- [Konu sayfası](../../frontend/src/learn/pages/ConceptPage.jsx), [öğrenme pratik ekranı](../../frontend/src/learn/pages/PracticePage.jsx), [soru seçimi](../../frontend/src/learn/engine/selection.js), [soru bileşenleri](../../frontend/src/learn/items.jsx), [soru görseli](../../frontend/src/components/QuestionImage.jsx).
- [Konu takibi sorgusu](../../backend/src/main/java/com/hedefyks/review/LearningResourceService.java), [genel ilerleme](../../backend/src/main/java/com/hedefyks/progress/ProgressService.java), [tamamlanmış pratik görünümü](../../backend/src/main/resources/db/migration/V54__completed_practice_history_and_exam_cancellation.sql).
- [Kişisel değerlendirme](../../backend/src/main/java/com/hedefyks/feedback/FeedbackService.java), [kayıt akışı](../../backend/src/main/java/com/hedefyks/auth/AuthController.java), [hata sayacı](../../backend/src/main/java/com/hedefyks/common/ServiceErrorMetrics.java), [backend bağımlılıkları](../../backend/pom.xml).

## 3. Öncelik ve bağımlılık sırası

**Hangi modeli açmalıyım?** Her `TAS-*` işi için ana model, düşünme düzeyi, alternatif ve kontrol önerisi [§19 — Göreve göre AI modeli seçimi](#19-göreve-göre-ai-modeli-seçimi) bölümündedir. Önce görev satırını, ardından yalnız o görevin teknik bölümünü oku.

Bu tablodaki `TAS-*` kimlikleri **tasarım önerisi referanslarıdır**; açık uygulama görevi veya yapılmış iş değildir. Hepsinin uygulama durumu **BAŞLANMADI**. Kullanıcı uygulama istediğinde ilgili işler mevcut numaralı plana taşınmalı; bu dosyada ikinci bir canlı görev listesi yürütülmemelidir.

| Sıra / kimlik | Öncelik | İş | Bağımlılık | Tamamlandı demek için gereken kanıt |
|---|---|---|---|---|
| 1 — TAS-01 | P0 | Kayıt onayı, kuyruk kaybı, idempotency ve hesap izolasyonu | Mevcut öğrenme/cevap akışları | Kesinti, 400, kota, çoklu sekme ve kaybolan yanıt senaryolarında kayıp/çift sayım yok |
| 2 — TAS-02 | P0 | DB erişimi, readiness, kayıt hatası ve dış alarm | TAS-01 ile birlikte | DB kesintisi görünür; yanlış başarı bildirimi yok; uygulama kapalıyken dış uyarı çalışıyor |
| 3 — TAS-03 | P1 | Tek katalog, adlar, konu bağları ve TYT/AYT kapsamı | Mevcut katalog | Bir ad düzeltmesi bütün ilgili ekranlarda aynı kimlikle görünür; geçmiş korunur |
| 4 — TAS-04 | P1 | Ortak cevap/sayım sözleşmesi ve mini alıştırma entegrasyonu | TAS-01, TAS-03 | Her giriş noktasında DB kaydı ve doğru konu satırı; tekrar ve ustalık ayrımı |
| 5 — TAS-05 | P1 | Ortak PRATIK seti, yeni sekme, doğru adet ve soru tekilliği | TAS-03, TAS-04 | Doğrudan yazılabilir çözüm ekranı; 12/52 gibi sayılar gerçek setle eşleşir |
| 6 — TAS-06 | P1 | Kişisel zorluk ve tekrar tercihleri | TAS-03, TAS-05 | Kullanıcıya özel DB kaydı, filtre, sıfırlama ve iki hesapla izolasyon |
| 7 — TAS-07 | P1 | PDF/şekil çıkarımını sürümlü kanıt paketine dönüştürme | Mevcut hat, TAS-03 | Temsilî kaynaklarda metin/şekil/denklem izlenebilir; aynı girdide gereksiz model çağrısı yok |
| 8 — TAS-08 | P1 | Mevcut öğretim pilotunu bütün kabul ölçütleriyle tamamlamak | TAS-05, TAS-07 | Ana kaynak, bölüm kapsamı, gerçek soru ve kaynaklı çözüm; bağımsız öğrenme kontrolü |
| 9 — TAS-09 | P2 | Tek komutla, kaldığı yerden devam eden içerik üretimi | TAS-08 | Pilot kalitesi korunarak ikinci konu üretilebilir; kesinti sonrası yalnız eksik aşama çalışır |
| 10 — TAS-10 | P2 | Yöneticiye yeni kayıt bildirimi | TAS-02; sağlayıcı/alıcı yapılandırması | Kayıt kalıcı, bildirim işi kalıcı; gönderim hatası tekrar denenir ve görünür |
| 11 — TAS-11 | P2 | YouTube transkript/çerçeve/ipucu pilotu | TAS-07, erişilebilir kaynak | Zamanlı kaynak, seçilmiş kare, doğrulanmış ipucu, tekrar üretmeyen önbellek |
| 12 — TAS-12 | Sürekli | Test/izleme ve Claude–Codex devir disiplini | Her aşamayla birlikte | Görev, çıktı, doğrulama ve sıradaki adım tek yerde; yalnız değişen kapsam yeniden incelenir |

P0 içerik genişletmesinden önce ele alınmalıdır. P1 bağımlılıkları kapatıldığında pilot ve üretim işi ilerler. Tahmini gün veya maliyet yazılmadı; donanım, kaynak kalitesi ve insan inceleme kapasitesi ölçülmeden güvenilir süre çıkarılamaz.

## 4. TAS-01: Öğrenci kayıtlarında güvenilir kalıcılık

### 4.1. Sorunları ayrı ele al

- **400 durumunda bütün kuyruğun silinmesi:** bir bozuk olay diğer geçerli olayları kaybettirmemeli. Reddedilen olay kimliği/nedeni ayrı tutulmalı; geçerli olaylar korunmalı. Toplu işlem atomik reddediliyorsa istemci hiçbirini onaylanmış saymamalı.
- **Son 500 kayıt sınırı:** `slice(-500)` ile eski kayıtların sessiz düşmesi uygun değil. Kapasite dolarsa görünür uyarı ve güvenli durma/yeniden deneme gerekir.
- **Depolama hatasının yutulması:** özel kip, disk/kota sorunu veya bozuk JSON görünmez olmamalı. Bellekte var olan kayıt kalıcı sayılmaz.
- **Erken başarı mesajı:** `Kaydediliyor`, `Sunucuya kaydedildi`, `Kaydedilemedi — tekrar dene` durumları ayrılmalı. Sayaçların bekleyen veriyi kullanması gerekiyorsa bunun geçici olduğu açıkça gösterilmeli.
- **Aynı işlemde farklı kimlik:** kullanıcı yeniden denediğinde ilk istek DB'ye yazılmış ama yanıtı kaybolmuş olabilir. Aynı mantıksal cevabın tekrarında aynı `clientEventId` korunmalı; yeni gerçek çözüm yeni kimlik almalı.
- **Sekmeler ve hesaplar:** kuyruk/oturum durumu kullanıcı değişiminde yeniden yüklenmeli; başka öğrencinin bekleyen olayları yeni hesapla gönderilmemeli. Çoklu sekmenin aynı depolama anahtarını ezmesi için ayrıca test gerekir.

### 4.2. Önerilen kayıt sözleşmesi

1. İstemci soru/cevap işlemi için sabit bir istek kimliği üretir.
2. Sunucu oturumdaki kullanıcıyı, içerik kimliğini/sürümünü ve cevap geçerliliğini doğrular.
3. Cevap, olay ve gerekli denetim izi aynı DB işleminde yazılır. İlk uygulama için mevcut Spring/PostgreSQL yapısı yeterlidir; yeni mesaj altyapısı gerekmez.
4. Transaction commit olduktan sonra sunucu kayıt kimliği/sürümü döner.
5. İstemci yalnız onaylanan olayları bekleyen listeden çıkarır. Aynı isteğin tekrarı aynı sonucu döndürür.
6. Aynı istek kimliği farklı soru veya cevapla gelirse eski sonucu sessizce uygulamak yerine uyuşmazlık açıkça ele alınır.
7. Kullanıcı başka cihazdan açtığında DB kaydı görünür; tarayıcı belleği kayıt kaynağı olmaz.

Kullanıcının “cache'de durmamalı” isteği için önerilen varsayılan: **sunucu kaydı tamamlanmadan cevabı kalıcı tamamlandı sayma ve kritik ilerleme adımını onaylama**. Bağlantı yokken bekleyen bir taslak tutulacaksa bu yalnız kaybı azaltan geçici mekanizmadır; “veritabanına kaydedildi” değildir. Çevrimdışı çözüm ürün özelliği olarak seçilirse ayrı senkronizasyon tasarımı gerekir. Mevcut öğretim sözleşmesinin aksine bütün uygulamayı yeni bir IndexedDB sistemine taşımak önerilmez.

**Ek doğrulama:** `LearnService.bankAnswer()` yarım bağımsız pratik turunda `SKIP`, yanlış cevapta `REVEAL` üretebiliyor. Başka ekranda devam eden çalışmaya etkisi ve çözüm gösterilmeden “gösterildi” anlamına gelip gelmediği incelenmeli. Kaydetme ve pedagojik olaylar aynı şey değildir.

**Kabul senaryoları:** istekten önce bağlantı kesilmesi; commit sonrası yanıt kaybı; aynı cevabın eşzamanlı gönderimi; toplu istekte tek geçersiz olay; 500'den fazla bekleyen olay; depolama kapalı; iki sekme; aynı sekmede hesap değişimi; DB yeniden açıldıktan sonra geri okuma. Hepsi test ortamında yürütülmelidir.

## 5. TAS-03: Tek ders–ünite–konu referansı ve sınav kapsamı

### 5.1. Kaynak sahipliği

Mevcut akış korunmalı: **yetkili müfredat girdisi → sürümlü katalog yayını → DB metadata → bütün ekranlar**. Excel değişikliğinin siteye geçmesi kontrollü içe aktarma/yayın sonrasında olur; dosya kaydedilince kendiliğinden anlık DB değişikliği varsayılmamalıdır.

`conceptId` öğretim dersinin kimliği; `categoryId` kontrollü müfredat konusunun kimliğidir. Bire bir olmak zorunda değiller: bir öğretim dersi birkaç ana konuyu, bir ana konu birkaç öğretim bölümünü kapsayabilir. Bu ilişki açıkça modellenmeli ve sürümlenmelidir.

Önerilen ayrım:

| Alan | Sahibi | Kullanım |
|---|---|---|
| Ders / ünite / resmî konu adı | Ortak katalog | Ekran başlığı, breadcrumb, filtre, rapor |
| `conceptId` / ders içeriği sürümü | Öğretim içerik modeli | İlerleme, ön koşul, tekrar ve ders dosyası kimliği |
| Pedagojik bölüm başlığı | İçerik | Örneğin “Negatif sayıya bölünce neden yön değişir?”; resmî konu adı yerine geçirilmez |
| Konu ilişkisi | Sürümlü eşleme | Ders/bölüm ↔ katalog konusu; ilişki ve kapsam kanıtı |
| Eski ad ve kimlik | Alias/yönlendirme | Eski bağlantı ve öğrenci geçmişinin korunması |

Görünen standart: **Ders › Ünite › Konu**. Birden fazla konu kapsanıyorsa gerçek konu listesi veya açık bir kapsam özeti gösterilir; rastgele tek konu adı atanmaz. Yeni konu gerekiyorsa önce yetkili ana referans güncellenir; `.ders` dosyasıyla ikinci müfredat oluşturulmaz. Sadece başlık düzeltmek için soru/konu kimliği değiştirilmez.

### 5.2. TYT/AYT rozetleri

- Konu yalnız TYT ise yalnız TYT; yalnız AYT ise yalnız AYT; her ikisiyse ikisi gösterilmeli.
- Ünite rozeti alt kapsamlarının birleşimini gösterebilir; bu, ünitenin her bölümünün iki sınava da ait olduğu anlamına gelmez.
- **Soru kaynak sınavı**, **konunun müfredat kapsamı** ve **öğretim bloğunun gerekli olduğu sınav** ayrı alanlar olmalı.
- `L1/L2/L3` anlatım derinliğidir; `L3 = AYT` veya `L1 = TYT` eşitliği kurulmaz.
- `.ders` içindeki ders seviyesindeki `sinav: TYT AYT` tek başına bölüm kapsamını karşılamaz. `::sorgula` içindeki `sinav:` ise mevcut parser'da serbest açıklama alanıdır; kontrollü sınav listesi sanılmamalı.
- Bölüm/blok için kontrollü `examScope` benzeri bir alan ve kaynak kanıtı önerilir. Ortak bölüm “TYT + AYT”, ileri bölüm “AYT”, sadece TYT hedefinde yeterli bölüm açıkça belirtilir. Kesinleşmeyen kapsam otomatik etiketlenmez.
- Hedef sınav seçimi hem anlatımı hem soru setini etkilemeli. `pickMixed()` içindeki ortak konu koşulunun farklı sınav sorularını da kabul edebilmesi özellikle gözden geçirilmeli; kaynak sınavı ile öğretim uygunluğu bilinçli ayrılmalı.

**Kabul:** bir katalog adını test ortamında değiştir; Konu takibi, harita, ders başlığı, pratik, geçmiş ve kaynak ekranlarında kimlik/ad tutarlılığını doğrula. Tarihsel etiket anlık kayıtları değişmemeli. TYT öğrencisine AYT bölümü zorunlu görünmemeli.

## 6. TAS-04: Her yerdeki çözümü Konu takibine bağlama

### 6.1. Ortak kayıt modeli

Yeni bir paralel soru geçmişi oluşturmak yerine mevcut `question_attempts`, sınav kayıtları ve öğrenme olaylarının **tek sayım sözleşmesine** bağlanması önerilir. Başlangıçta SQL görünümü/servis adaptörü yeterli olabilir. İkinci bir sayaç tablosu kullanılacaksa olaylardan yeniden üretilebilir olmalı.

Her cevap için gerekli kavramlar: `userId` (oturumdan), `clientEventId`, `questionId` veya sürümlü `learningItemId`, `sessionId`, `origin`, `context`, konu kimlikleri, içerik sürümü, seçilen cevap, sunucuda hesaplanmış sonuç, zaman, yardım/çözüm görülme durumu. İsimler öneridir; mevcut alanlar incelenmeden ikinci kez eklenmez.

**Ders içi mini soru:** bankada yoksa kararlı kimliği, sürümlü cevap anahtarı ve katalog bağıyla sunucuda tanımlanmalı. Görsel/matbu olmayan sorular da ortak çözüm ekranında sunulabilmeli. `correct=true` bilgisini doğrudan istemciden almak ortak başarı ölçümü için yeterli değildir. Kartın “bildim” öz değerlendirmesi ise ayrı kalabilir.

### 6.2. Sayım kuralları

| Olay | Kalıcı kayıt | Konu takibinde önerilen gösterim | Bağımsız ustalık |
|---|---|---|---|
| Öğrenci gerçek soruya cevap verdi | Evet | Tekil çözülen soru + deneme sonucu | Yardımsızsa uygun |
| Aynı soruyu yeniden çözdü | Evet, yeni deneme | Tekil toplam artmaz; tekrar/son sonuç ayrı | Yeni ölçüm olarak kurala bağlı |
| Ders içi mini soruya cevap verdi | Evet | İlgili konuya alıştırma sonucu; bankayla karışmayacak kaynak türü | Yardım ve bağlama bağlı |
| Rehberli soruda öğrenci adım/cevap verdi | Evet | Rehberli çalışma olarak görünür | Otomatik ustalık sayılmaz |
| Çözülmüş örneği yalnız okudu | Okuma/tamamlama olayı olabilir | İncelenen örnek; doğru cevap sayılmaz | Hayır |
| Kartta “bildim” dedi | Evet | Tekrar etkinliği | Sınav sorusu doğrusu sayılmaz |
| Açık pratikte cevap verdi | Evet, hemen | “Devam eden çalışma” ayrı gösterilebilir | Oturum kuralına bağlı |

Mevcut sistem genel tekil sayıyı ilk karşılaşma/ilk yanıt kurallarıyla hesaplıyor. Kullanıcının bütün çözümleri görmesi için bu geçmiş sessizce “son cevap” kuralına çevrilmemeli. **Tekil soru, toplam cevap denemesi, ilk sonuç, son sonuç ve devam eden oturum** açık anlamlarla sunulmalı. Öğrenci isterse hepsini aynı Konu takibi ekranından görebilir.

Çok konulu sorunun birden fazla konu satırına yazılması genel tekil toplamı çoğaltmamalıdır. Ön koşul ilişkileri başarı kazanımı sayılmamalı. Banka cevabı hem öğrenme olayında hem `question_attempts` içinde bulunuyorsa birleşimde iki kez sayılmamalı.

**Geçiş:** mevcut tarihsel kayıtlar için dry-run eşleme ve etki raporu; kaynak kimliği/cevap kanıtı olmayan eski olayları uydurma soru kimliğiyle doldurmama; eski/yeni toplamları test DB'sinde karşılaştırma; geri dönüşlü migration. Kullanıcı verisini silerek yeniden hesaplama yapılmaz.

## 7. TAS-05: Tek çözüm ekranı, yeni sekme ve gerçek soru seti

Kullanıcının 9 ve 12. maddelerinin birlikte yorumu: **bağlantıya bir kez tıklanınca yeni sekmede doğrudan ortak, karalama yapılabilen PRATIK oturumu açılır; ayrıca “Soru sayfasında aç” tıklamak gerekmez.** Ders sekmesi yerinde kalır.

### 7.1. Önerilen akış

1. Ders sayfası `conceptId`, `mode` (konu testi/çıkmış/alıştırma), sınav hedefi ve içerik sürümünü taşır.
2. Yeni sekme ortak oturum başlatma sayfasına gider. `GET` yalnız sayfayı açar; oturum yaratma kimliği sabit bir **POST** isteğiyle yapılır. Link önizleme/prefetch yüzünden oturum yaratılmaz.
3. Backend izinli, etkin, doğru konuya bağlı ve birbirinden farklı sorulardan seti oluşturur veya aynı oluşturma isteğinin mevcut setini döndürür.
4. Set türü `PRATIK`, kaynağı `KONU_OGRENME`, alt türü `TOPIC_TEST / PAST_EXAM / ARCHETYPE` benzeri bir sınıflama olur. Mevcut enum/şema incelenerek adlandırılır.
5. Soru listesi/sırası, katalog ve içerik sürümü, başlangıç/sonlandırma bilgisi DB'de saklanır. Her cevap aynı oturumla ilişkilidir.
6. Ortak ekran soru, kalem/karalama, çözüm, kişisel etiket ve geri dönüş bağlantısını sunar. Çalışma İstatistiklerim bu gerçek oturumu okur.
7. Ders motoruna tamamlanma/sonuç bağlantısı verilir; motor aynı cevapları ikinci kere üretmez.

Tarayıcı yeni sekme açmayı engellerse normal bağlantı ile aynı hedefe ulaşılabilmeli. Oluşturma hatası boş bir sekmede gizli kalmamalı. `sessionStorage` kalıcı setin yerine geçmemeli.

### 7.2. Adet ve çeşitlilik

- “12 soru” ancak 12 uygun tekil soru varsa gösterilir. Havuz küçükse gerçek sayı ve eksik kapsam açıklanır; aynı soruyla doldurulmaz.
- “52 çıkmış soru” 52 soruya erişim sağlamalıdır. Çalışma 13'erlik dört bölüme ayrılabilir; toplam 52 olduğu ve hangi bölümde olunduğu açık kalmalıdır. Gizli 40 sınırı kaldırılmalıdır.
- “Çıkmış” setine yalnız doğrulanmış sınav/yıl/oturum/test/soru konumu olan kayıt girer. Yapay üretilmiş benzer soru bu etiketi alamaz.
- Konu testinde özgün alıştırma kullanılabilir, kaynağı açık belirtilir. “TYT/AYT seviyesinde” ile “gerçek çıkmış” ayrı iddialardır.
- Aynı ID/kod tekilliğinin yanında özgün sınav konumu ve görsel hash'i denetlenmeli. Benzer metin/görsel yalnız aday tekrar kanıtıdır; farklı seçenekli varyant otomatik birleştirilmez.
- Bağımsız ustalık seti, derste çözümü gösterilmiş soruları dışarıda tutmalı; mevcut `practiceIds` yaklaşımı korunmalıdır.

### 7.3. “Beş soru aynı” için tanılama planı

Bir test hesabında etkilenen akışı aç; setin `questionId`, `code`, görüntü URL'si, yanıt içerik hash'i ve ekran sıra numarasını karşılaştır. Sonra şu ayrımı yap:

| Gözlem | İncelenecek yer |
|---|---|
| Soru ID'si gerçekten aynı | Seçim, tekilleştirme, eski setin kullanılması |
| ID farklı, görsel URL'si aynı | Görsel eşleme/URL üretimi |
| URL farklı, byte hash'i aynı | Bankaya yanlış veya tekrar kırpım aktarımı |
| ID ve görsel farklı, ekran aynı kalıyor | React state/anahtar/istek yarışı ve görüntü güncellemesi |
| Başka soru tipine tıklanınca aynı set | `storageKey` içinde `archetype` bulunmaması ve rota geçişi |

Bu incelemede kök neden kesinleştirilmedi. Üretilmiş banka JSON'unu elle değiştirmek yerine üretici/eşleme ya da UI akışındaki kanıtlanan neden düzeltilmelidir.

## 8. TAS-06: Öğrenciye özel zorluk ve tekrar tercihleri

Mevcut `feedback.difficulty_vote` kişisel zorluk için yeniden kullanılabilir. Önce DB'de kullanıcı/soru başına tekillik, eşzamanlı güncelleme ve temizleme davranışı denetlenmeli. `findMine()` sonrası kayıt yapmak tek başına eşzamanlı tekillik garantisi değildir.

Önerilen anlamlar:

- **Öğretmen zorluğu:** ortak, onaylı içerik özelliği.
- **Benim zorluk etiketim:** `KOLAY / ORTA / ZOR / işaretlenmemiş`; sadece bu öğrenci için.
- **Tekrar tercihim:** `DEFAULT / AGAIN / HIDE`; zorluktan bağımsız.
- “Tekrar gösterme” varsayılan öneri/otomatik pratikten çıkarır; soruyu silmez ve geçmişi değiştirmez. Öğrenci “Gizlediklerim” filtresinden geri alabilir. Resmî bir denemenin sabit kitapçığını kişisel tercihle değiştirmemelidir.
- “Tekrar göster” sonraki uygun kişisel tekrar kuyruğuna ekler; aynı oturumda kontrolsüz tekrar üretmez.

Ortak soru bileşeninde tercih kontrolleri; Soru Çöz & Pratik'te **Öğretmen zorluk etiketi** ve **Öğrenci zorluk etiketi** ayrı filtreler; ayrıca “Tekrar istediklerim / Gizlediklerim / İşaretlemediklerim” seçenekleri önerilir. Sunucu kullanıcıyı oturumdan belirler. Öğretmen ve diğer öğrenciler bu kişisel etiketi kendi etiketi olarak görmez.

Yeni tablo gerekirse bütün zorluk oylarını çift yazan bir model yerine mevcut kayıtla tek sahiplik seçilmelidir. Banka dışı mini sorular için de kararlı öğrenme öğesi kimliği gereklidir. Tercihler hesap dışa aktarımı/silme ve denetim kapsamına alınmalıdır.

## 9. TAS-07: Binlerce PDF için tekrar etmeyen kaynak işleme hattı

### 9.1. Mevcut hattı genişlet

Şu parçalar zaten var: `pdf-metin.py`, `pdf-page-ocr.py`, `pdf-readability-fallback.py`, `ollama-sor.py`, `pdf_source_reconcile.py`, `pdf_question_accept.py`, `pdf-ocr` önbellekleri ve `learning_catalog.pdf_work_queue`. V87 kaynak hash'i için tekillik ekliyor. Yeni iş kuyruğu tasarlamadan önce bunların sorumluluğu ve durumları incelenmelidir.

Önerilen uçtan uca hat:

```text
Özgün PDF (korunur)
  → dosya/hash envanteri ve mevcut çıktı denetimi
  → sayfa / düzen / metin / şekil bölgesi çıkarımı
  → yalnız gerekli sayfa veya bölgede OCR
  → denklem / şekil / kaynak konumu doğrulaması
  → ana katalog konularına kanıtlı eşleme
  → tekrar kullanılabilir konu kaynak paketi
  → öğretim taslağı + soruya özel çözüm
  → otomatik denetim + gerekli içerik incelemesi
  → sürümlü yayın
```

### 9.2. Hangi çıktı saklanmalı?

| Katman | Kalıcı çıktı | Neden |
|---|---|---|
| Kaynak | Kaynak kimliği, sağlayıcı/yol, SHA-256, tür, baskı/sürüm, kullanım bilgisi | Aynı kaynağın kopyalarını tanıma, özgünü koruma |
| Sayfa | Fiziksel sayfa indeksi, basılı sayfa etiketi, boyut/döndürme, kalite | Yanlış sayfa referansını önleme |
| Blok | Kararlı blok kimliği, sıralama, metin/denklem/tablo/şekil türü, bbox ve koordinat birimi | İki sütun, şekil ve açıklama ilişkisini koruma |
| Görsel | Kırpım, özgün hash, kaynak sayfa/bbox, alt metin, ilişkilendirilmiş açıklama | PDF'yi yeniden açmadan kanıtlı kullanım |
| Çıkarım | Araç/model sürümü, parametre/prompt/schema hash'i, çıktı hash'i, hata/kalite | Değişen aşamayı yeniden çalıştırma |
| Eşleme | Konu kimlikleri, ilişki türü, kaynak parçası, aday/onay ayrımı | Başlığa bakarak yanlış ders üretmeyi önleme |
| İçerik paketi | Öğrenme hedefi, terimler, tanım/örnek/şekil/kanıt blokları, soru bağları | Her agent'a bütün PDF yerine gerekli malzemeyi verme |
| İnceleme | Kim/ne zaman/hangi sürümü inceledi; gerekçe, açık hata | AI tahminini uzman onayından ayırma |

Fiziksel sayfa indeksi ile PDF'de basılı sayfa numarası ayrı saklanmalı. bbox koordinat başlangıcı, birimi ve sayfa dönüşümü açık tanımlanmalı. “Sayfa 12” tek başına tekrar üretilebilir kırpım kanıtı değildir.

### 9.3. Şekil, grafik ve denklem stratejisi

1. Metni düzgün olan PDF'yi yeniden OCR etme. Ancak metin var diye şekil, matematik sembolü ve okuma sırasının doğru olduğunu varsayma.
2. Şeklin yalnız gömülü resim nesnesini çıkarmak bazen eksik kalır: etiketler veya çizgiler ayrı PDF öğeleri olabilir. Gerekli durumda sayfa bölgesini açıklamasıyla birlikte render et. PyMuPDF sayfa görüntüsü ve bölgesel kırpım üretimini destekler. [PyMuPDF görsel çıkarma belgesi](https://pymupdf.readthedocs.io/en/latest/recipes-images.html)
3. Matematikte eksi işareti, üs, kök sınırı, kesir çizgisi, indeks ve eşitsizlik yönü ayrıca doğrulanmalı. Genel OCR güven puanı matematiksel doğruluk kanıtı değildir.
4. Özgün soru görseli kanıt olarak korunmalı. Yeniden çizim yapılırsa “öğretim için yeniden çizim” ayrı türev varlık olmalı; özgünün yerine sessizce geçmemeli.
5. Basit matematik grafikleri/şemaları mevcut SVG ve sayısal model altyapısıyla yeniden çizilmeli. Eksen, ölçek, birim, açık/kapalı nokta ve işaretler kaynakla karşılaştırılmalı.
6. Etkileşimli modelde hesap ve çizim aynı veri modelinden türemeli; sürüklenen nokta ile açıklama farklı sonuç göstermemeli. Alternatif metin, klavye ve hareket azaltma desteği bulunmalı.
7. Her sayfa veya bölge için `tamamlandı / sorunlu / kapsam dışı / gerçekten boş` ayrımı tutulmalı. Metinsiz sayfa otomatik boş kabul edilmemeli. **Metnin alınması, şekillerin alınması ve bütün soruların kabulü farklı tamlık ölçüleridir.**

### 9.4. Önbellek ve yeniden işleme

Önerilen çıkarım anahtarı:

```text
sourceSha256 + pageOrRegionId + extractorVersion + parameterHash
```

Modelle işlenen aşamalarda ayrıca `modelDigest + promptHash + schemaVersion`; içerik üretiminde ayrıca `catalogVersion + selectedEvidenceHashes + teachingTemplateVersion` bulunmalı. Tek, aşırı geniş bir anahtar yerine **aşama bazlı bağımlılık** tutulmalıdır: prompt değişince PDF render/OCR baştan yapılmamalı; katalog adı değişince aynı sayfanın metni yeniden çıkarılmamalıdır.

- Aynı kaynak hash'i farklı klasördeyse fiziksel kopya ile katalog referansı ayrılır; otomatik dosya silme yapılmaz.
- Aynı kaynak/aynı aşama tamamlandıysa çıktı doğrulanıp kullanılır. Önceki başarısız deneme nedeni ve yeniden deneme koşulu da saklanır.
- İçerik değişirse yalnız etkilenen çıktı ve ona bağlı taslak/çözümler yeniden incelenir. Eski yayın, yeni paket kabul edilmeden değiştirilmez.
- Çıktı atomik yazılmalı; yarım JSON “tamamlandı” sayılmamalı. Checkpoint ve iş sahipliğiyle aynı işi iki süreç eşzamanlı üretmemeli.
- Yeniden üretilebilir çıktı ile **yeniden üretilemeyen insan inceleme kararı/kanıtı** ayrılmalı. `veri/` içindeki Git dışı kritik kararlar için yedek ve manifest gerekir; yalnız Git geçmişi yeterli değildir.

### 9.5. Script, OCR, Ollama veya güçlü AI seçimi

| İş | İlk tercih | Bir üst aşamaya geçme nedeni |
|---|---|---|
| Sayım/hash/metadata/tekillik/kimlik eşleme | Deterministik script | Belirsizlik yalnız metin/görsel anlamındaysa |
| Dijital PDF metni ve konumları | Mevcut PDF çıkarımı | Metin katmanı bozuk/yok veya düzen çözülemiyor |
| Taranmış metin | Mevcut yerel OCR | Sembol/denklem/şekil çözümlemesi yetersiz |
| Aday konu/başlık/blok sınıflama | Kurallar + yerel model | Kaynak çelişkisi, düşük ölçülmüş kalite |
| Karmaşık soru, pedagojik açıklama, zor şekil | Güçlü model / insan incelemesi | Kanıt paketiyle sınırlı görev |
| Nihai içerik doğruluğu | Bağımsız hesap/kaynak kontrolü ve gerekli alan incelemesi | Modelin “eminim” demesi yeterli değil |

Yerel modelde şemalı çıktı biçim hatalarını azaltabilir; içerik doğruluğunu garanti etmez. Ollama JSON Schema tabanlı çıktı destekler. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)

Depodaki varsayılan model, makine için otomatik olarak en iyi seçenek kabul edilmemeli. Donanım ve kalite ölçülmedi. Aynı temsilî paket üzerinde mevcut model/kurallı yöntem/güçlü model karşılaştırılmalı: **matematik sembolü hatası, şekil eksikliği, konu eşleme hatası, insan düzeltme süresi, süre ve kaynak tüketimi**. Yerel modelin API token maliyeti olmaması, toplam maliyetinin sıfır olduğu anlamına gelmez.

Başlangıç için önerilen pilot: matematikten 10–20 kaynak ve 50–100 temsilî sayfa/bölge; dijital metin, tarama, iki sütun, tablo, grafik ve yoğun denklem örnekleri içerir. Bunlar önerilen örneklem büyüklükleridir, tamamlanmış inceleme değildir. Diğer derslere geçişte yeni şekil/terim türleri ayrıca örneklenmeli.

### 9.6. Kaynağı tekrar okumadan konu üretme

Her konu için küçük bir **kaynak paketi** hazırlanmalı: ana kaynak bölümleri, destekleyici özet, zorunlu şekiller, terimler, gerçek soru kimlikleri, çözüm kanıtları, kapsam ve açık belirsizlikler. Uzun kaynak özeti tek kanıt olarak kullanılmamalı; cümle/iddia → blok/sayfa bağlantısı korunmalı.

Önce katalog kimliği ve tam metin araması yeterli mi ölçülmeli. Anlamsal arama gerekirse mevcut veriye eklenmeli; vektör veritabanı kurmak tek başına bu sorunu çözmez. Agent bütün arşivi prompt'a koymaz; belirlenen görev için seçilmiş paket ve yalnız gerekli görselleri alır. Özetler yön bulmak içindir; matematiksel iddianın dayanağı özgün bloktur.

## 10. TAS-08: Kaliteli pilot, ana kaynak ve açıklamalı çözümler

### 10.1. Pilot seçimi ve kaynak sırası

Mevcut `bolme-bolunebilme` pilotu temel alınmalı. Ayrıca `temel-kavramlar` üzerinde tekrar soru, 52/40, ortak başlık, TYT/AYT ve pratik yönlendirme gereksinimleri doğrulanmalı. Bu iki rol yeni, paralel bir öğretim sistemi anlamına gelmez.

Kaynak sırası önerisi:

1. İlgili konunun tam ders kitabı/ana anlatımı: tanım, gerekçe, koşul ve örnekler.
2. Ayrıntılı resmî ders notu/sunu: görsel veya alternatif anlatım desteği.
3. Konu özeti: kapsam kontrolü ve tekrar; tek başına ana öğretim omurgası değil.
4. Gerçek çıkmış soru: uygulama ve aktarım; özgün sınav kaydıyla.
5. Doğrulanmış video/ipucu: ek yöntem; ana kaynağın yerine geçirilmez.

Mevcut temel kavramlar dosyasındaki kaynak satırı MEBİ/OGM özetlerini ve video notlarını içeriyor. Bu, bütün içeriğin yanlış olduğunu göstermez; **tam kaynak kapsamı ve paragraf/şekil düzeyinde kanıt zincirinin ayrıca kurulması** gerektiğini gösterir. Ana kaynak yoksa açık eksik olarak tutulmalı.

### 10.2. Her kavram için anlatım şablonu

- Hangi problemi çözüyor; öğrenci hangi ön bilgiyi bilmeli?
- Terim/sembolün sade tanımı ve küçük örneği.
- “Neden böyle?” açıklaması; kuralın gerekçesi.
- Ne değildir: karşı örnek ve sık yanlış düşünce.
- Kolay çözümlü örnek → adımları öğrenci tamamlayan örnek → gerçek sınav seviyesine aktarım.
- Gerekiyorsa etkileşimli şekil; değişen ve sabit kalan ilişki.
- Kısa yol: nerede geçerli, neden çalışır, hangi koşulda yanıltır?
- Öğrencinin bağımsız cevabı, anlamlı hata geri bildirimi ve konuya geri bağlantı.
- Bölüm/blok TYT/AYT kapsamı ve kaynak konumu.

Mevcut L1/L2/L3, günlük sorgulama, keşif ve gerekçeli örnek sözleşmesi korunmalı. Sayfa ve örnek sayısı tek başına kalite değildir. “Sıkmadan ayrıntılı” anlatım için kısa amaçlı bölümler, ilerleyen örnek zorluğu ve öğrenci etkileşimi kullanılmalı; aynı açıklama farklı kelimelerle uzatılmamalı.

### 10.3. Her gerçek sorunun çözüm kaydı

Önerilen içerik: soru kimliği ve sürümü; özgün görsel/hash; sınav/yıl/konum; konu/bölüm bağı; çözüm adımları; her adımın gerekçesi; sonuç kontrolü; koşullu kısa yol; sık hata; varsa alternatif yöntem; kaynak referansları; çözümün inceleme durumu/sürümü.

**Kaynak türünü doğru adlandır:** resmî cevap anahtarı sonucun dayanağı olabilir; kaynak kitap kuralın dayanağı olabilir; ayrıntılı çözüm uygulamanın özgün türetimi olabilir. Özgün türetim “resmî çözüm” diye sunulmamalı. Her cebir adımı için sahte dış referans üretmek yerine kullanılan ilkelerin ve sorunun gerçek kaynakları bağlanmalı; çözüm bağımsız hesapla kontrol edilmelidir.

Genel soru tipi stratejisi ile soru özelindeki çözüm ayrı gösterilmeli. Çözümü eksik soruya rastgele açıklama doldurulmaz. Tam açıklamalı pilot set, bu şartı karşılayan sorulardan oluşturulmalıdır; kapsam eksiği görünür tutulur.

Yeni bir püf noktası bulunursa doğrudan bütün ana konuyu değiştirmek yerine **kaynaklı iyileştirme önerisi → kapsam/hata kontrolü → içerik sürümü** akışı izlenmeli. Değişen bölümle ilişkili çözümler yeniden incelenir; ilgisiz dersler baştan üretilmez.

### 10.4. Pilot kabul kapısı

Pilot ancak şu kanıtlarla çoğaltılır: ana kaynak bağları tamam; bütün zorunlu şekiller okunabilir/doğru; kimlik/kapsam tutarlı; konu testi tekil ve kaynaklı; bütün pilot sorularının açıklaması mevcut; öğrencinin cevapları ortak DB/istatistiğe bağlı; kesinti testleri geçmiş; masaüstü/mobil çözüm akışı kullanılabilir; içerik inceleme durumu açık. Gerçek öğrenciyle bağımsız aktarım gözlemi ayrıca yapılır; otomatik test pedagojik başarı kanıtı değildir.

## 11. TAS-09 ve TAS-12: Tekrarlanan işleri agent iş akışına dönüştürme

### 11.1. Önce süreç, sonra agent

Bir defada “bütün dersleri yaz” komutu yerine **sürümlü öğretim şablonu + doğrulanmış kaynak paketi + küçük iş birimi + denetleyici** önerilir. Başlangıçta tek agent'ın sıralı aşamalarla çalışması yeterlidir; birçok agent kullanmak kaliteyi kendiliğinden artırmaz. Bu incelemede agent kurulmadı ve ek agent çalıştırılmadı.

İş birimi önce **bir konu**, gerekirse bir bölüm/şekil/soru çözümüdür. Aynı agent'ın önceki sohbeti hatırlaması gerekmemeli; aşağıdaki görev kaydı yeterli bağlamı sağlamalıdır:

```yaml
# Önerilen veri sözleşmesi örneği; mevcut bir komut veya dosya değildir.
taskId: content:<conceptId>:<revision>
conceptId: <korunan-ders-kimligi>
categoryIds: [<ana-katalog-kimligi>]
catalogVersion: <yayin-surumu>
inputManifest: <hashli-kaynak-paketi>
templateVersion: <ogretim-sablonu-surumu>
status: READY
stage: evidence
outputManifest: null
validation: []
openDecisions: []
nextAction: <tek-somut-adim>
```

Durumlar önerisi: `DISCOVERED → EXTRACTED → EVIDENCE_READY → DRAFTED → VALIDATED → REVIEW_REQUIRED → APPROVED → PUBLISHED`; ayrıca `FAILED / STALE`. Mevcut kuyruk durumlarıyla eşleme tasarlanmalı; bugün bu durumlar varmış gibi davranılmamalı. Teknik test geçmesi `APPROVED` değildir. Gerçek inceleme sahibi ve kanıtı olmadan onay yazılmaz.

### 11.2. Her aşamanın sınırı

| Aşama | Girdi | Çıktı | Durma koşulu |
|---|---|---|---|
| Kaynağı hazırla | Konu kimliği + manifest | Gerekli metin/şekil/soru paketi | Eksik ana kaynak, okunamayan kritik şekil |
| Taslak üret | Paket + pilot şablonu | `.ders`/çözüm/model taslağı | Kanıtsız iddia, belirsiz kapsam |
| Doğrula | Taslak + mevcut testler | Şema/hesap/tekillik/atıf raporu | Yanlış cevap, eksik referans, bozuk kimlik |
| İncele | Sadece açık riskler ve ilgili kanıt | Gerekçeli karar | Gerçek uzman kararı gerekiyorsa bekleyen durum |
| Yayın paketi hazırla | Kabul edilmiş çıktı | Manifest + fark + geri dönüş bilgisi | Kimlik/geçmiş bozulması veya eksik kabul |

Gelecekte tek CLI komutu bu aşamaları seçebilmeli; **şu anda var olmayan bir komut kullanıcıya çalışırmış gibi verilmemeli**. Mevcut `scripts/ivme.py` genişletilebilir. İlk gerçek otomasyon, pilotu bir başka konuda aynı kaliteyle tekrar edebildiğini göstermelidir.

### 11.3. Claude ve Codex için ortak hafıza

Mevcut düzen korunur:

- `AGENTS.md`: kısa, kalıcı kurallar ve hangi belge ne zaman okunur.
- `CLAUDE.md`: mevcut `@AGENTS.md` yönlendirmesi; ikinci kural kopyası yok.
- `docs/README.md`: görev türüne göre belge dizini.
- `docs/plan/`: yalnız yetkilendirilmiş açık uygulama işleri ve kabul ölçütleri.
- `docs/devam.md`: etkin iş, son çıktı/kanıt, kalan somut adım ve gerekli komut; bütün geçmiş değil.
- Sürümlü manifest/raporlar: tamamlanan işin kanıtı; Git dışındaki kritik kararlar da yedekli.
- `git log`: tamamlanmış kod/belge değişikliklerinin geçmişi.

**Bu belgenin rolü:** bulgu ve yaklaşım referansı. Yeni kullanıcı talimatı eski devirdeki “matematik içeriğine devam” komutunun önüne geçer. Bu inceleme sonrası yalnız “devam et” ifadesinde hangi işin kastedildiği son kullanıcı bağlamından belirlenmeli; bu belgedeki öneriler kendiliğinden uygulamaya dönüşmemelidir.

Uygulama ayrıca istendiğinde kısa görev örneği:

```text
İvme'de inceleme belgesindeki TAS-01'i uygula.
AGENTS.md ve ilgili kayıt akışını oku; mevcut kimlikleri ve öğrenci verisini koru.
Kabul senaryolarını geçici test DB'sinde doğrula; kalan işi devir notuna yaz.
```

İçerik işi ayrıca istendiğinde:

```text
İvme'de yetkilendirilmiş sıradaki matematik konusuna devam et.
Devir notu ve görev manifestini kullan; değişmeyen kaynakları yeniden çıkarma.
Pilot standardı ve kaynak kanıtıyla yalnız eksik aşamayı tamamla.
```

**Okuma bütçesi:** başlangıçta ortak kurallar + etkin görev + ilgili sözleşme + küçük manifest. Bütün `docs/`, bütün PDF'ler veya bütün banka JSON'ları yüklenmez. Değişen kaynak/araç/kural varsa ilgili inceleme yenilenir. “Tekrar etme” ilkesi yeni hatayı veya değişmiş girdiyi görmezden gelmek değildir.

## 12. TAS-11: YouTube'dan zamanlı metin, soru karesi ve ipucu

Bu mümkün bir iş akışıdır; her YouTube videosu için otomatik altyazı indirme garantisi yoktur. Resmî `captions.download` yöntemi videoyu düzenleme yetkisi gerektirir; rastgele herkese açık videonun altyazısına genel erişim varsayılmamalıdır. [YouTube captions.download](https://developers.google.com/youtube/data/reference/rest/v3/captions/download)

Önerilen sıra:

1. Sağlayıcı video kimliği ve mevcut transkript/başarısız erişim önbelleğini kontrol et; mevcut `video-content-probe.py` yaklaşımını tekrar kurma.
2. Erişilebilir veya kullanıcı tarafından sağlanmış zamanlı altyazı varsa onu kullan. Eksik/hatalı altyazıyı açık durumla işaretle.
3. İşlenmesine uygun ses/video dosyası mevcutsa yerel konuşma tanıma uygula. `faster-whisper` bunun için değerlendirilebilecek yerel bir uygulamadır; donanıma göre pilot ölçüm gerekir. [faster-whisper deposu](https://github.com/SYSTRAN/faster-whisper)
4. Ses yazısı formül ve şekli tam taşımaz. İlgili zaman aralıklarından, soru/tahta değiştiğinde seçilmiş kareler çıkar; aynı kareyi tekrar saklama.
5. Kare + zamanlı metin + konu kimliği üzerinden ipucu adayı çıkar. Başlık veya thumbnail'dan öğretilen kuralı uydurma.
6. İpucu kaydı: video kimliği, başlangıç/bitiş, özgün metin/kare referansı, konu, koşul, örnek, karşı örnek ve inceleme durumu.
7. Doğrulanan ipucu ana derse sürümlü değişiklik önerisi olur. Önce küçük bir konuda 2–3 video ile kalite/maliyet değerlendirilir.

Karede eksik kalan soru tamamlanmış soru diye yayımlanmamalı; uygun özgün soru kaynağı varsa onunla bağlanmalı. Kaynak kullanım durumu manifestte tutulmalı; erişilemeyen materyal için sürekli başarısız istek döngüsü kurulmamalı. Bu görev kapsamında video indirilmedi veya transkripsiyon yapılmadı.

## 13. TAS-02: pgAdmin yerine doğru sağlık ve kayıt denetimi

**pgAdmin bir yönetim arayüzüdür; PostgreSQL sunucusu değildir.** pgAdmin kapalıyken DB hizmeti çalışabilir ve uygulama kayıt yapabilir. PostgreSQL/bağlantı/izin/disk problemi varsa pgAdmin'in açık olması da kayıt başarısını sağlamaz.

Önerilen katmanlar:

| Kontrol | Ölçtüğü şey | Ölçmediği şey |
|---|---|---|
| Liveness | Uygulama süreci yanıt veriyor | DB yazma başarısı |
| Readiness | Uygulama gerekli DB/katalogla hizmet verebiliyor | Her öğrenci cevabının commit olması |
| Gerçek kayıt metriği | Yazma başarı/hata/gecikme ve sunucu onayı | Tek başına yedekten geri yükleme |
| Sınırlı sentetik yazma/okuma | Teknik kontrol kaydının commit sonrası okunması | Bütün işlevlerin doğruluğu |
| Dış erişim kontrolü | Ağ/HTTPS/tünel/uygulama erişimi | İçerik veya pedagojik kalite |
| Yedek geri yükleme provası | Kurtarma yapılabilirliği | Kesintisiz hizmet |

Spring Boot 3.5 Actuator sağlık uçları ve erişim sınırlandırması sağlayabilir. Liveness ile readiness ayrı tasarlanmalı; DB kesintisi liveness üzerinden sürekli yeniden başlatma döngüsü oluşturmamalıdır. Bu entegrasyon mevcut uygulamaya öneridir; şu anda kurulmuş olduğu iddia edilmez. [Spring Boot 3.5 Actuator](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html)

`SELECT 1` bağlantıyı sınar, yazma/commit/disk başarısını kanıtlamaz. Sentetik yazma yapılacaksa ayrı teknik alan, sınırlı izin, temizlik ve sıklık kullanılmalı; gerçek öğrenci cevabı yaratılmamalıdır. Kaydetme anındaki başarısızlık öğrenciye doğrudan görünmelidir.

DB kesildiğinde aynı DB'ye yazan hata sayacı da çalışamayabilir. `ServiceErrorMetrics` hata yazma hatasını logluyor; buna ek olarak uygulama dışı izleyici ve DB'den bağımsız log/uyarı yolu gerekir. Makine tamamen kapanırsa yalnız o makinedeki izleyici uyarı gönderemez.

Yedek için mevcut `ivme-yedek-al.ps1` ve yalıtılmış geri yükleme yaklaşımı korunmalı. Aynı disk yedeği mevcut kullanıcı tercihidir; disk kaybını karşılamaz. İleride kurtarma hedefleri ve ayrı ortam kopyası ayrıca değerlendirilmelidir. Bu inceleme yedek ayarını değiştirmez.

## 14. İzleme ve log tasarımı

Başlangıçta yeni ve ağır bir altyapı yerine mevcut hata/denetim kayıtlarına tamamlayıcı, ölçülü izleme önerilir. Önce bağımsız erişim kontrolü, kayıt hataları, DB havuzu ve yedek durumu; ihtiyaç ölçülürse merkezi metrik/log/trace altyapısı.

| Alan | Önerilen ölçüm | Uyarı amacı |
|---|---|---|
| Kayıt güvenilirliği | Yazma hatası, p95 kayıt süresi, onaysız olay sayısı/yaşı | Öğrenci kaydının gecikmesi veya kaybolması |
| API | 5xx oranı, p95 süre, timeout | Hizmet bozulması |
| DB | Bağlantı havuzu bekleme, bağlantı hata sayısı, kilit/deadlock, disk alanı | Kayıt kapasitesinin tükenmesi |
| İçerik hattı | Bekleyen/başarısız iş, en eski iş yaşı, cache isabeti, tekrar işleme oranı | Aynı işi tekrar yapma ve kuyruk tıkanması |
| İçerik kalitesi | Eksik kaynak/şekil/çözüm, yanlış eşleme, tekrar soru | Öğrenciye hatalı içerik sunma |
| Bildirim | Bekleyen e-posta, deneme sayısı, kalıcı hata, teslim sonucu | Yeni kayıtların fark edilmemesi |
| Yedek | Son başarılı yedek, boyut, geri yükleme kanıtı | Kurtarma boşluğu |

Log alanları: zaman, ortam/sürüm, request/trace ID, işlem, anonimleştirilmiş kullanıcı referansı, session/event ID, sonuç ve hata kodu. Parola, token, tam kişisel iletişim bilgisi veya öğrenci serbest metni normal loga yazılmaz. Metrik etiketi olarak her kullanıcı/soru ID'sini kullanmak yerine sınırlı kategori tutulur; ayrıntı gerektiğinde log/denetim kaydından bulunur.

Uyarılarda tekilleştirme, bekleme süresi, önem seviyesi ve iyileşme bildirimi olmalı. İlk eşikler pilotta ölçülür; “readiness birkaç kontrol boyunca başarısız”, “onaysız kayıt yaşı kabul edilen süreyi aşıyor” gibi kurallar açıkça tanımlanır. Her uyarının kısa müdahale tarifi ve sorumlusu bulunur. Salt dashboard hazırlamak yeterli değildir.

## 15. TAS-10: Yeni kayıtta yöneticiye bildirim

Mevcut hesap onayı korunarak **kayıt + kalıcı bildirim işi** aynı transaction içinde oluşturulmalı. İş kaydı commit sonrasında gönderici tarafından işlenir. Kayıt başarılı olup e-posta geçici hata verirse öğrenci hesabı geri alınmaz; bildirim tekrar denenir.

Önerilen küçük çözüm: mevcut PostgreSQL içinde outbox tablosu ve kontrollü arka plan işi. İlk adımda ayrı mesaj sunucusu zorunlu değil. Bildirim kaydında benzersiz olay anahtarı, tür, kullanıcı referansı, durum, deneme sayısı, sonraki deneme zamanı, hata kodu ve gönderim kimliği tutulur.

- Alıcı yönetici adresi ve e-posta sağlayıcısı çalışma ortamından alınır; sırlar repo'ya yazılmaz.
- İçerik: yeni kayıt ve onay bekleme bilgisi + yönetim ekranı bağlantısı; parola ve gereksiz kişisel veri yok.
- Ağ hatasında artan bekleme, kalıcı hatada görünür başarısız durum ve kontrollü yeniden deneme.
- Sağlayıcı kabulü, alıcının gelen kutusuna teslim ve alıcının okuması aynı durum değildir.
- E-posta gönderildi fakat DB durum güncellemesi başarısız olduysa tekrar gönderim olasılığı tasarlanmalı; destekleniyorsa sağlayıcının idempotency anahtarı kullanılmalı. Mutlak “exactly once e-posta” vaadi verilmemeli.
- Yönetim panelinde okunmamış/yeni kayıt sayısı e-posta çalışmasa da görünmeli.

**Kabul:** bir gerçek kayıt işlemi bir bildirim işi oluşturur; transaction geri alınırsa gönderilmez; sağlayıcı kesintisinde iş kaybolmaz; yeniden başlatma sonrası devam eder; örnek bildirim doğru alıcıya ulaşır. Sağlayıcı/alıcı ayarı gerektiğinde uygulama aşamasında alınır; bu plan için bilgi istemek gerekmez.

## 16. Test stratejisi: var olanı tamamla

68 backend test dosyasının bulunması ve önceki devirdeki test sonucu güncel bütün davranışların doğrulandığı anlamına gelmez. Bu incelemede uygulama testleri yeniden çalıştırılmadı. Mevcut [doğrulama tarifi](../islemler/dogrulama.md) ve `python scripts/ivme.py test` üzerinden **geçici `ivme_test`** sınırı korunmalıdır.

| Test türü | Öncelikli senaryo | Neden |
|---|---|---|
| Unit / saf fonksiyon | Tekil seçim, 12/52 sınırı, sınav kapsamı, hesap ve çizim değişmezleri | Hızlı ve belirgin hata yakalama |
| DB entegrasyonu | Commit/rollback, aynı istek eşzamanlı, kişisel tercih izolasyonu, konu sayımı | Mock ile görünmeyen transaction/SQL davranışı |
| Servis/API akışı | Ders mini sorusu → DB → Konu takibi; banka cevabı → ortak pratik | Modüllerin birlikte çalışması |
| Sözleşme/şema | Konu kimliği, içerik sürümü, kaynak/bbox, çözüm referansı | Sessiz format/kimlik ayrışması |
| E2E | Ders bağlantısı → yeni sekme → PRATIK → cevap → istatistik → yeniden giriş | Kullanıcı isteğinin bütünü |
| Hata enjeksiyonu | DB kapalı, commit sonrası yanıt kaybı, 400, timeout, yerel kota | Sessiz kayıp ve çift kaydı önleme |
| İçerik regresyonu | Bilinen doğru soru/şekil/çözüm paketi | Model/prompt değişince kalite kaybını bulma |
| Görsel/erişilebilirlik | Mobil şekil, taşma, klavye, renk dışı sonuç bildirimi | Öğrenme ekranının kullanılabilirliği |
| Migration/geri dönüş | Eski kimlik/ilerleme korunması, eski/yeni toplam | Öğrenci geçmişini kaybetmeme |
| Bildirim | Fake SMTP/sağlayıcı, retry, rollback, yinelenen gönderim | Kayıt ve mail bağımsız güvenilirliği |
| Performans | Olay geçmişi büyümesi, geniş set, havuz sorgusu, içerik işi | Kullanıcı sayısı/veri büyümesindeki sınır |
| Kurtarma | Ayrı test ortamına yedek geri yükleme ve geri okuma | Yedeğin gerçekten kullanılabilirliği |

Özellikle `LearnService.state()` bütün öğrenme olaylarını döndürüyor, istemci bunlardan durumu tekrar türetiyor. İlk aşamada sayfa/yanıt büyüklüğü ölçülmeli; büyüme gerektirirse artımlı okuma ve sürümlü snapshot değerlendirilir. Kanıt olmadan altyapı yeniden yazılmaz.

CI önerisi: değişen kapsam için hızlı kontroller; ilgili DB entegrasyon testi; kritik akışlar için E2E; zamanlanmış geniş içerik/performans/geri yükleme denetimleri. Mevcut pre-commit `ivme.py kontrol` plan/kural kontrolüdür; tam test paketiyle eş tutulmamalı. Bilinen hatalar listesi yeni hatayı gizlememeli. UI'da sahte API kullanılmışsa gerçek DB entegrasyon kanıtı ayrıca aranmalıdır.

## 17. Kullanıcının bütün maddelerinin karşılıkları

Başlangıçtaki `01` ve `02` ile sonraki `1–20` ayrı tutuldu; toplam 22 isteğin hiçbiri kaybolmamalı.

| Kullanıcı maddesi | Karşılık | Öneri / bulgu referansı |
|---|---|---|
| 01 — Her konu için tekrar prompt yazmama | Görev manifesti, ortak öğretim şablonu, kaldığı yerden devam | TAS-09, §11 |
| 02 — 1000+ PDF, şekiller, OCR/model, tekrar okumama | Mevcut hattı aşama hash'leri ve kanıt paketleriyle genişlet | TAS-07, §9 |
| 1 — Pilot, sonra agent | Mevcut bölme pilotunu uçtan uca tamamla; sonra çoğalt | TAS-08/09, §10–11 |
| 2 — Tek ders/ünite/konu referansı | Öğretim katmanını ortak katalog kimlik/adlarına bağla | TAS-03, §5 |
| 3 — Doğru TYT/AYT rozetleri | Konu ve bölüm kapsamını ayır | TAS-03, §5.2 |
| 4 — Her yerde çözülenler Konu takibinde | Ortak olay/sayım sözleşmesi ve mini soru kaydı | TAS-04, §6 |
| 5 — Kişisel zorluk/tekrar tercihi | Mevcut oy kaydı + kişisel filtre/tekrar politikası | TAS-06, §8 |
| 6 — Ünite + konu adı, tek ana kaynak | Katalog sunumu ve öğretim başlığı ayrımı | TAS-03, §5.1 |
| 7 — Anlatımın TYT/AYT bölümleri | Kontrollü blok kapsamı; düzeyle karıştırmama | TAS-03/08, §5.2, §10 |
| 8 — YouTube metni, soru karesi, pratik ipucu | Erişim kontrollü zamanlı metin/kare pilotu | TAS-11, §12 |
| 9 — Sorular yeni sekmede pratikte açılsın | Doğrudan ortak çözüm ekranı | TAS-05, §7 |
| 10 — Aynı soru tekrarı / gerçek konuya ait çıkmış | Kimlik+görsel+resmî konum tanılaması; bildirim açık | TAS-05, §7.2–7.3 |
| 11 — Özet yerine ana anlatım | Tam kaynağı omurga, özeti destek yap | TAS-07/08, §9–10 |
| 12 — Hazır PRATIK seti, doğru adet, kaynaklı çözüm, geri besleme | 52/40 düzeltmesi, ortak set, sürümlü çözümler | TAS-05/08, §7, §10.3 |
| 13 — pgAdmin/health, kayıt kaybolmasın | DB hizmeti, transaction onayı, dış alarm | TAS-01/02, §4, §13 |
| 14 — Integration ve diğer testler | Mevcut testlerin kritik risklerle tamamlanması | TAS-12, §16 |
| 15 — Monitoring | Uygulama/DB/kayıt/içerik/bildirim/yedek ölçümleri | TAS-02/12, §14 |
| 16 — Yeni kayıtta e-posta | Transactional outbox + panel bildirimi | TAS-10, §15 |
| 17 — Basitten gerçek sınav seviyesine | Örnek → tamamlatma → bağımsız aktarım | TAS-08, §10.2 |
| 18 — Terim, neden, örnek, yanlış algı | Kavram şablonu ve karşı örnek | TAS-08, §10.2 |
| 19 — Eski agent/devirleri oku, tekrar iş yapma | Mevcut kurallar incelendi; hash/manifest ve seçici okuma | TAS-09/12, §2, §11 |
| 20 — Yapılan/kalan görünür olsun; Claude + ChatGPT | Tek canlı plan, kısa devir, kanıtlı tamamlanma | TAS-12, §3, §11.3 |

## 18. Uygulama talimatı geldiğinde ilk somut paket

Önerilen ilk paket **TAS-01 + TAS-02'nin asgari sağlık/kayıt görünürlüğü**dür. İçeriği: kuyruk kaybı yollarını kapatma, sunucu onayı göstergesi, aynı cevabın tekrarında aynı istek kimliği, kullanıcı/sekme izolasyonu ve DB kesintisinin görünür olması. Bunlar geçici DB üzerinde doğrulanmadan çok sayıda yeni ders veya PDF işi başlatılmamalıdır.

Sonrasında TAS-03/04/05 ile kimlik, sayım ve ortak çözüm ekranı birleştirilir. PDF kanıt paketi mevcut pilot için hazırlanır; ancak pilot kabulünden sonra toplu üretim ölçeklenir. Diğer derslere genişleme mimaride mümkün tutulur; mevcut matematik uygulama kapsamı kullanıcı yeni talimat vermeden kendiliğinden genişletilmez.

**Bu inceleme sonunda yapılan:** kaynak kodu/belge incelemesi, salt okunur dosya sayımı, yöntemlerin resmî teknik belgelerle kontrolü, bu tasarım belgesi ve bulunabilirlik bağlantıları. **Yapılmayan:** kod düzeltmesi, DB migration/veri yazımı, PDF/OCR/model çalıştırması, e-posta gönderimi, agent kurulumu veya yayın. Uygulama kabul kutularının hiçbiri tamamlandı işaretlenmemiştir.

## 19. Göreve göre AI modeli seçimi

**Model bilgisi kontrol tarihi:** `2026-10-31`. Aşağıdaki model adları ve genel yetenek konumlandırmaları resmî OpenAI/Anthropic belgelerinden kontrol edildi. **İvme görevlerine yapılan atamalar ise bu projenin risklerine göre öneridir; modeller bu repo üzerinde karşılaştırmalı çalıştırılmadı.** Bir modelin diğer sağlayıcıdaki modelden matematik, Türkçe veya Spring konusunda kesin daha iyi olduğu iddia edilmiyor.

Kullanıcının önceliği kaliteli sonuçtur. Bu nedenle kritik işlerde güçlü model ve bağımsız kontrol öneriliyor; dosya sayımı, OCR, hash ve test çalıştırma gibi deterministik işler yine uygun araçla yapılıyor. “En pahalı modeli bütün PDF'lere gönder” yaklaşımı kalite veya izlenebilirlik sağlamaz.

### 19.1. Kısa seçim rehberi

| Yapacağın iş | İlk açılacak model / araç | Önerilen başlangıç |
|---|---|---|
| Veri kaybı, transaction, yarış koşulu, kimlik taşıma, sistem tasarımı | **GPT-6 Astra** | `xhigh`; kaynak kodu ve kabul senaryolarıyla |
| Tanımı belirli, çok dosyalı uygulama geliştirme ve test yazımı | **GPT-6.1 Sol** | `high` |
| Ekran, PDF şekli/kırpımı, grafik etiketi, görsel karşılaştırma | **GPT-6.1 Terra** | `high`; zor matematiksel yorum Astra'ya |
| Küçük belge düzenleme, hazır veriden alan çıkarma, ön sınıflama | **GPT-6 Luna** | `medium`; sonuç şema/kuralla doğrulanır |
| Kaynaklı öğretim anlatımı ve pilotun bütünlüğünü değerlendirme | **Claude Opus 5.5** | `high`; matematik için ayrı hesap/kaynak kontrolü |
| Claude ortamında tanımı belirli uygulama geliştirme | **Claude Sonnet 5.5** | `high`; zor mimari sorun Opus'a |
| PDF metni/OCR/hash/tekillik ve mevcut testler | **Mevcut script/OCR/test araçları** | Bu işler için LLM çağrısı varsayılan değil |
| Video sesini zamanlı metne dönüştürme | **Mevcut altyazı, yoksa uygun yerel ASR** | §12'deki hat; konuşma tanımayı metin modeliyle karıştırma |

Bu tablo pratik görev dağılımıdır. Saf kalite önceliğinde ve süre/maliyet kısıtı yoksa karmaşık OpenAI işlerini Astra ile yürütmek uygun başlangıçtır; Sol/Terra/Luna önerileri belirli aşamaları daha verimli yürütmek içindir. OpenAI'nin rehberi de model seçimini aynı görev ve girdilerle karşılaştırarak doğrulamayı önerir. [OpenAI model seçimi](https://developers.openai.com/api/docs/guides/model-selection)

### 19.2. Model adları, sürümleri ve roller

“ChatGPT” ürün/çalışma ortamı adıdır; görev kaydında modelin tam adı kullanılmalıdır. **Sol 6 ile Sol 6.1 aynı sürüm değildir.** Aşağıdaki API kimlikleri belirsizliği önlemek içindir; model seçicisindeki etiketler ve erişilebilir ayarlar kullanılan ürüne göre değişebilir. Hesabındaki abonelik, kota veya Claude erişimi bu incelemede sorgulanmadı.

| Model | Tam model kimliği | Resmî konumlandırma ve bu plan için kullanım |
|---|---|---|
| GPT-6 Astra | `gpt-6-astra` | Karmaşık muhakeme/kodlama için en yetenekli OpenAI modeli olarak sunuluyor. Kritik tasarım ve zor hata çözümü için öneri. [Model belgesi](https://developers.openai.com/api/docs/models/gpt-6-astra) |
| GPT-6.1 Sol | `gpt-6.1-sol` | Karmaşık kodlama ve araçlı işlerde daha düşük maliyetli güçlü seçenek. Belirli kapsamlı geliştirmede ana çalışma modeli önerisi. [Model belgesi](https://developers.openai.com/api/docs/models/gpt-6.1-sol) |
| GPT-6 Sol | `gpt-6-sol` | Kodlama/agent işleri için önceki Sol sürümü; resmî sayfa yeni sürüm olarak 6.1'e yönlendiriyor. Mevcut erişimin buysa kullanılabilir; 6.1 gibi kaydetme. Yeni çalışma için burada 6.1 öneriliyor, otomatik sürüm değişikliği yapılmıyor. [Model belgesi](https://developers.openai.com/api/docs/models/gpt-6-sol) |
| GPT-6.1 Terra | `gpt-6.1-terra` | Görsel muhakeme, bilgisayar kullanımı ve açık yazım odaklı. PDF şekli/ekran incelemesine uygun aday; “sadece frontend modeli” değildir. [Model belgesi](https://developers.openai.com/api/docs/models/gpt-6.1-terra) |
| GPT-6 Luna | `gpt-6-luna` | Dar kapsamlı, yüksek hacimli işler için verimli seçenek. Hazır metnin yapılandırılması/ön elemesi; kritik doğruluk kararının tek sahibi yapılmıyor. [Model belgesi](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| Claude Opus 5.5 | `claude-opus-5-5` | Uzun süren agent kodlaması ve bilgi işleri için sunuluyor. Bu planda karmaşık Claude işleri, öğretim taslağı ve farklı sağlayıcıyla inceleme adayı. [Model belgesi](https://platform.claude.com/docs/en/models/opus-5-5/overview) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Hız ve yetenek dengesi. Bu planda günlük uygulama ve şablonu oturmuş içerik üretimi için Claude alternatifi. [Model belgesi](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) |

Claude tarafında Opus'u “mutlak en üst model” diye adlandırmamak gerekir: resmî katalog ayrıca **Claude Fable 5.1** (`claude-fable-5-1`) modelini zorlu muhakeme ve uzun iş akışları için konumlandırıyor. Kullanıcının saydığı Opus/Sonnet seçenekleri bu planın ana Claude yoludur; **erişimin varsa ve Opus yüksek düşünme düzeyinde pilot ölçütünü karşılayamıyorsa** Fable değerlendirilebilir. Yeni abonelik veya erişim gereksinimi varsayılmıyor. [Anthropic model kataloğu](https://platform.claude.com/docs/en/models/overview), [Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview)

### 19.3. Her görev için uygulanabilir model ataması

Tabloda **ana seçim**, göreve başlarken açılacak modeldir. “Alternatif” aynı iş için başka ortamda çalışabileceğin seçenektir; iki modelin aynı dosyalarda eşzamanlı değişiklik yapması istenmiyor. “Kontrol” kritik değişiklikten sonra ayrı, salt okunur inceleme aşamasıdır. Bağımsız model kontrolü test/kanıt/öğretmen incelemesinin yerine geçmez.

| Görev | Ana seçim ve düşünme düzeyi | Alternatif / verimli uygulama yolu | Gerekçe ve kontrol |
|---|---|---|---|
| **TAS-01 — kayıt güvenilirliği** | **Astra `xhigh`** | Claude'da **Opus 5.5 `high`**; tasarım ve hata senaryoları kesinleşirse dar düzeltmeleri Sol `high` yapabilir | Kuyruk kaybı, kaybolan yanıt, idempotency ve hesap izolasyonu birlikte ele alınmalı. Astra yazarsa Opus, Opus yazarsa Astra kritik farkı inceler; yarış/commit testleri zorunlu |
| **TAS-02 — sağlık ve izleme temeli** | **Sol 6.1 `high`** | **Sonnet 5.5 `high`** | Mevcut Spring/DB yapısına sınırlı entegrasyon. Liveness/readiness tasarımını ve DB kesintisinde alarm yolunu Astra `high` inceler. Tüm işletim mimarisi değişecekse baştan Astra |
| **TAS-03 — katalog ve kimlik birliği** | **Astra `xhigh`** | **Opus 5.5 `high`**; kabul edilmiş eşleme tasarımının uygulanması Sol `high` | Eski kimlik/ilerleme korunması ve çoktan çoğa kapsam riski. Başlıkları Luna'ya topluca yeniden yazdırma. Diğer sağlayıcıyla migration/etki incelemesi |
| **TAS-04 — ortak cevap ve konu sayımı** | **Astra `xhigh`** | **Opus 5.5 `high`** | Aynı cevap iki yerde kayıtlıyken çift sayım, ilk/son sonuç ve rehberli/bağımsız ayrımı. Bağımsız kontrol ve gerçek PostgreSQL entegrasyon testi |
| **TAS-05 — ortak PRATIK ve doğru setler** | **Sol 6.1 `high`** | **Sonnet 5.5 `high`**; ekran/görsel tanılama **Terra `high`** | Rota, oturum, seçim ve UI birlikte değişir. TAS-04 sözleşmesi hazır olmalı. Set/olay sınırını Astra, görsel tekrar/karalama akışını Terra ve E2E kontrol eder |
| **TAS-06 — kişisel zorluk/tekrar** | **Sol 6.1 `high`** | **Sonnet 5.5 `high`** | Tanımı belirli DB/API/UI işi. İki öğrenciyle izolasyon ve eşzamanlı kayıt testleri; yeni yetki/kimlik tasarımı çıkarsa Astra'ya yükselt |
| **TAS-07 — PDF/şekil kanıt hattı** | Hattın kodu: **Sol 6.1 `high`**; çıkarım: **script/OCR** | Kod için **Sonnet 5.5 `high`**; şekil/yerleşim incelemesi **Terra `high`** | Her PDF'yi güçlü modele okutma. Metin sınıflama Luna/yerel model ile aday olarak yapılabilir. Belirsiz formül veya kaynak çelişkisi Astra `xhigh`; nihai kabul kaynak/hesap incelemesiyle |
| **TAS-08 — kaliteli öğretim pilotu** | Anlatım ve bütünlük: **Opus 5.5 `high`** | Tek OpenAI yolunda **Astra `high`**, zor çözümde `xhigh` | Opus seçimi Türkçede kanıtlanmış üstünlük iddiası değil, yazım ve bağımsız kontrolü ayırma önerisi. Matematiği Astra özgün soru üzerinden bağımsız çözer; şekilleri Terra; uygulama entegrasyonunu Sol yapabilir |
| **TAS-09 — içerik üretimini otomatikleştirme** | **Sol 6.1 `high`** | **Opus 5.5 `high`** | Manifest, checkpoint, sürüm ve yeniden başlatma kodu. Yayın/yeniden işleme tasarımını Astra inceler. Her içerik adımı kendi modeline yönlenir; bütün aşamaları tek modelle yapma zorunluluğu yok |
| **TAS-10 — kayıt e-postası** | **Sol 6.1 `high`** | **Sonnet 5.5 `high`** | Kalıcı bildirim işi, retry ve sağlayıcı hataları. Transaction/outbox sınırı için Astra `high` incelemesi; kısa e-posta şablonu Luna `medium` olabilir |
| **TAS-11 — video/transkript/ipucu** | Altyazı/ASR + kareler için **Terra `high`** | Hattın kodu **Sol/Sonnet `high`**; anlatımı düzenleme **Opus `high`** | Metin modelleri ses tanıma yerine geçirilmez. Luna yalnız zamanlı metinden aday bölümleri çıkarır; matematiksel ipucunun koşullarını Astra doğrular |
| **TAS-12 — test, devir ve kalite** | Test tasarımı **Astra `high`**; test kodu **Sol `high`** | Claude'da **Opus `high` → Sonnet `high`** | Testleri script çalıştırır. Terra ekran/şekil incelemesi yapar. Luna mevcut kanıttan kısa devir/rapor taslağı çıkarabilir; yapılmamış testi geçmiş veya işi tamamlanmış sayamaz |

**İlk paket için doğrudan seçim:** TAS-01'i **GPT-6 Astra / Extra high (`xhigh`)** ile aç; Claude kullanacaksan **Opus 5.5 / `high`** seç. Bu işler tamamlandıktan sonra tanımı net uygulama işleri için **GPT-6.1 Sol / `high`** veya **Sonnet 5.5 / `high`** yeterliliğini testlerle değerlendir. Şu an yalnız belge güncellendi; görevler başlatılmadı.

### 19.4. Düşünme düzeyi nasıl seçilmeli?

OpenAI model sayfalarında Astra ve Sol 6.1 için `low / medium / high / xhigh / max`; Terra 6.1 ve Luna için bunlara ek `none` belgeleniyor. Ancak kullanılan uygulamanın seçicisi bu ayarların hepsini sunmayabilir. Tablo önerileri arayüzde mevcut olduğu ölçüde uygulanır; prompt'a “Astra ol” yazmak model seçmek değildir. [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

Bu proje için başlangıç önerisi:

- **`medium`:** girdisi hazır, dar kapsamlı düzenleme ve sınıflama.
- **`high`:** çoğu kodlama, kaynaklı içerik ve görsel inceleme işi.
- **`xhigh`:** veri tutarlılığı, migration, zor matematik, belirsiz kök neden veya çelişkili kaynak.
- **`max`:** `high/xhigh` ile çözülemeyen belirli zor alt problem için ölçerek; her görevin varsayılanı değil.

Claude effort ayarı ayrı bir sağlayıcı ayarıdır; aynı `high` etiketi aynı düşünme miktarı anlamına gelmez. Opus 5.5'in belgelenen varsayılanı `medium`, Sonnet 5.5'in `high`dır; bu planda kritik işler için Opus'a `high` **bilinçli öneri** olarak yazıldı. Arayüz farklı düşünme seçenekleri gösteriyorsa mevcut seçeneği ve gerçek model sürümünü görev kaydına geçir; varsayılanın otomatik olarak `high` olduğunu sanma. [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort)

Düşünme düzeyi, araç yetkisi ve bağlam kalitesi ayrı şeylerdir. Kaynak görseli verilmeyen güçlü model eksik şekli güvenilir biçimde tamamlayamaz; repo/test araçlarına erişmeyen sohbet modeli dosyayı gerçekten değiştirmiş veya testi çalıştırmış sayılmaz.

### 19.5. İçerik üretiminde aşama bazlı model zinciri

TAS-07/08/09 için önerilen zincir; aşamalar sırayla yürütülebilir, eşzamanlı agent kurulumu gerekmez:

```text
Mevcut PDF/metin/OCR scriptleri
  → Luna / yerel model: yalnız aday yapılandırma ve ön eleme
  → Terra: gerekli şekil/kırpım ve görsel kaynak kontrolü
  → Opus: kanıt paketinden öğretim taslağı
  → Astra: zor matematik ve karşı örneklerin bağımsız kontrolü
  → Sol: kabul edilen içeriği mevcut .ders/model/test yapısına yerleştirme
  → Script/testler + gerekli insan incelemesi
```

Her aşamada model çağrısı zorunlu değildir. Dijital metin ve basit tablo script ile doğru çıkıyorsa Luna/Terra aşaması atlanabilir. Tek sağlayıcı istenirse Opus yazım aşamasını Astra veya pilotta yeterli bulunan Sol üstlenebilir; Claude ile kodlamada Sol yerine Sonnet kullanılabilir. Kaynak/öğrenci gizliliği sınırları model değişince gevşetilmez.

**Bağımsız matematik kontrolü:** ikinci modele önce özgün soru, şekil ve koşulları ver; birinci modelin cevabını doğru kabul etmesini isteme. Kendi çözümü ve araçla hesap sonucu elde edildikten sonra karşılaştır. İki modelin aynı sonucu söylemesi kanıt değildir; ikisi de aynı eksik kaynağa veya aynı yanlış varsayıma dayanabilir. Uyuşmazlıkta kaynak/hesap ve gerekirse alan uzmanı kararı aranır.

**Kod incelemesi:** ikinci modele görev gereksinimi, gerçek diff, ilgili kod ve test çıktısını ver; “onayla” yerine kayıp kayıt, çift sayım, yetki sızıntısı ve atlanmış hata senaryosu ara. Ayrı modelin bütün projeyi yeniden yazmasına gerek yoktur. Kritik inceleme tamamlanmadan yalnız üretici modelin “bitti” mesajı kabul kanıtı olmaz.

### 19.6. Ne zaman daha güçlü modele geçmeli?

| Gözlem | Önerilen sonraki adım |
|---|---|
| Eksik PDF sayfası/görsel, yanlış dosya veya araç erişimi yok | Önce girdiyi/erişimi düzelt; daha güçlü model eksik kanıtı oluşturamaz |
| Luna/yerel model şemayı tutturuyor ama konu/terim anlamında yanılıyor | Temsilî örnek ve izinli kategori listesiyle Sol; görselse Terra |
| Terra görseli okuyor ama eşitsizlik/ölçek/özel durum belirsiz | Özgün kırpım + gerekli komşu bağlam + hesap kontrolüyle Astra `xhigh` |
| Sol/Sonnet aynı hatayı ikinci dar denemede çözemiyor | Denenen yaklaşım/başarısız testleri kısa devirle Astra/Opus'a aktar; baştan tüm incelemeyi yaptırma |
| Görev kimlik taşıma, transaction veya birçok sayım kuralını değiştiriyor | Başlangıçtan Astra/Opus; düşük modelde başarısızlık bekleme |
| Opus yüksek düşünmede zor uzun görevin kabul ölçütünü karşılamıyor | Daha küçük görev/girdi kontrolü; erişim varsa Fable 5.1 ile aynı örneği karşılaştır |
| Model sonucu iyi ama bütün süreç pahalı | Önce bağlamı küçült, önbellek ve deterministik aşamaları kullan; sonra aynı örnekte daha ekonomik modeli dene |

Modelin kendi verdiği “%95 eminim” gibi bir sayı tek başına yönlendirme eşiği olamaz. Yükseltme kararı şema hatası, yanlış hesap, kaynak eksikliği, başarısız test veya insan düzeltme gereksinimi gibi gözlenebilir kanıtlara dayanmalı.

### 19.7. En iyi modeli bu projede nasıl doğrulayacağız?

Bu bölüm bir ölçüm planıdır; sonuçları henüz yoktur. İlk pilot için aynı küçük görev paketini aday modellere aynı kaynaklarla ver; değerlendirme hedefini ve beklenen sonucu önceden belirle. Aşağıdaki sayılar başlangıç önerisidir:

| Paket | Temsilî içerik | Başarı ölçüsü |
|---|---|---|
| Kod | 3–5 hata/özellik örneği; bir yarış/rollback ve bir katalog/sayım vakası | Gerçek testler, korunmuş kimlik/geçmiş, gereksiz değişiklik yok |
| PDF/görsel | 20–30 zor sayfa/bölge; tarama, tablo, üs/kök, grafik | Atlanan şekil/sembol, yanlış bbox/kaynak, insan düzeltme süresi |
| Matematik | 10–20 soru; konuya özgü farklı koşul/yanılgı | Doğru sonuç, geçerli gerekçe, özel durum ve bağımsız hesap |
| Anlatım | Aynı konunun 2–3 bölümü | Terim açıklığı, örnekten kurala geçiş, kaynak doğruluğu, kapsam ve gerçek öğrenci aktarımı |

P0 işlerinde veri kaybı, kullanıcılar arası sızıntı ve çift kayıt **kabul etmeme nedeni** olmalı; iyi yazım puanı bunları telafi etmemeli. Kritik matematik hatası veya sahte kaynak da aynı şekilde ele alınmalı. Az sayıda örnekte başarı genel doğruluk garantisi değildir; sadece sonraki pilot için seçim kanıtıdır.

Ölçülecek toplam maliyet: model kullanımı + yeniden deneme + başarısız iş + insan düzeltmesi + süre. API token fiyatını ChatGPT/Claude abonelik kotasıyla aynı şey sayma. Bu belgede sabit fiyat veya görev başına süre vaadi yoktur. Model/prompt sürümü değiştiğinde yalnız ilgili küçük değerlendirme paketi yeniden çalıştırılır; bütün arşiv tekrar işlenmez.

### 19.8. Model seçimini görev kaydına ve devir notuna bağlama

§11'deki önerilen manifest şu alanlarla genişletilebilir; **bu örnek çalıştırılan bir yapılandırma değildir**:

```yaml
modelPlan:
  taskId: TAS-01
  stage: implement
  primary:
    provider: openai
    model: gpt-6-astra
    effort: xhigh
  review:
    provider: anthropic
    model: claude-opus-5-5
    effort: high
    mode: read-only
  actualModel: null       # calisma basladiginda gercek model
  actualEffort: null
  inputManifestHash: null
  promptVersion: null
  validationReport: null
  escalationReason: null
```

Agent çalışmaya başlarken seçilen model bu öneriden farklıysa mevcut modeli ve farkın etkisini belirtmeli; başka modele geçtiğini iddia etmemelidir. Kullanıcı manuel olarak model değiştirip aynı görev kaydından devam edebilir. Bu plan mevcut oturumun modelini değiştirmez, otomatik API çağrısı veya ek agent başlatmaz.

Model değiştirilirken kısa devir paketi yeterlidir: **task ID, aşama, mevcut commit/diff, girdi/çıktı manifesti, geçen/başarısız testler, açık sorun ve tek sonraki adım**. Önceki bütün konuşmayı ve PDF arşivini tekrar göndermek gerekmez. Çalışma aynı dosyada sürüyorsa bir model yazmayı bitirip farkı kaydettikten sonra diğeri incelemelidir.

### 19.9. Modeli seçtikten sonra kullanılacak kısa görev girdisi

Model uygulamanın seçicisinden seçilir. Aşağıdaki örnek ancak uygulama ayrıca istendiğinde kullanılmalıdır:

```text
İvme'de TAS-01'i uygula.
Model önerisi: GPT-6 Astra, xhigh. Mevcut model farklıysa belirt.
AGENTS.md, inceleme belgesinin §4 ve §19 bölümleri ile ilgili kodu oku.
Mevcut öğrenci verisini ve kimlikleri koru; geçici ivme_test üzerinde doğrula.
Kayıp yanıt, aynı istek tekrarı, kuyrukta geçersiz olay ve hesap geçişini kapsa.
Sonucu gerçek diff/test kanıtı ve kısa devir notuyla teslim et.
```

İkinci modelde kontrol örneği:

```text
TAS-01 değişikliğini yalnız incele; kod değiştirme.
Gereksinimleri, gerçek diff'i ve test raporunu kullan.
Kayıp kayıt, çift sayım, transaction ve hesap izolasyonu açıklarını ara.
Her bulguyu dosya/işlev ve tekrar üretme senaryosuyla yaz.
Test edilmemiş durumu geçti kabul etme; sorun bulamazsan inceleme sınırını belirt.
```

**Bu ekin sonucu:** TAS-01–12 için model/araç önerisi, düşünme düzeyi, alternatif, kontrol ve yükseltme koşulları belirlendi. Henüz model karşılaştırması, içerik üretimi, kod düzeltmesi veya agent kurulumu yapılmadı.
