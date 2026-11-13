# 15. Adım — MEBİ Soru Çöz & Pratik 2 — SURUYOR (tam arşiv)

**Güncel canlı kabul:** 10.034 soru; ana görev **SURUYOR**, bütün arşiv kabulü açık.

**Tamamlanan ilk geçiş (ana görevin kapanışı değildir):** yalnız `D:\workspace\mebi-yks` kaynaklarında
doğrulanabilen soru/cevap/konu paketlerinin aktarımı ve kalanların açık nedenlerle
ayrı inceleme kategorilerine ayrılması. Kullanıcının son talimatı gereği
uyuşmayan içerikte aynı başarısız model çağrısı tekrarlanmadı. İlk okumada
bulunamayan cevaplar için farklı yerel OCR ve kaynak kimliğiyle sınırlı
kurtarma geçişi uygulandı; cevap tahmini yapılmadı.

**Sınır:** bütün arşivdeki basılı soruların tamamının çıkarıldığı veya aktarıldığı
kanıtlanmadı. İlk geçiş sonunda `4.791` soru yayımlandı; `21.353`
ayrı aday kodu incelemede. Bu sayılar tüm arşivin tekil soru toplamı değildir.
İnceleme kuyruğu bu geçişin ayrı teslimidir; öğretmen tarafından çözülmüş sayılmaz.

**046–052 alt partileri — BITTI:** 77+139+289+96+40+35+18 = 694 yeni
soru kabul edildi; her partide INSERT_ONLY, tekrar0 INSERT, mevcut kimliklerin
korunması, katalog ve canlı masaüstü/mobil kontrolü PASS. 051–052 için 53
sorunun özgün native metni tek tek incelendi; ana tablodaki mevcut Tarih,
Psikoloji ve Sosyoloji konuları kaynak alıntısı ve gerekçeyle bağlandı. Mevcut
özgün gövde ve iki basılı cevap kanıtı kullanıldı; bu iki pakette yeni model
çağrısı/öğretmen onayı0. Dört konu inceleme sınırı testi PASS. Kanıtlar:
`verified-source-batch-046`–`052/bank-acceptance.json`,
`reviewed-native-question-expansion/`, `reviewed-native-question-2-expansion/`.
Bu alt partiler tam arşiv kapanışı değildir.

**053 — BITTI:** 22 TYT Biyoloji ve26 AYT Mantık sorusu özgün metinden mevcut konuya bağlandı;48 INSERT/0 UPDATE, tekrar0 INSERT ve katalog/canlı PASS. 054 — BITTI:37 Edebiyat INSERT/0 UPDATE, tekrar0 INSERT, katalog/canlı PASS; toplam9.890. 055 — BITTI:26 AYT Biyoloji INSERT/0 UPDATE, tekrar0 INSERT, katalog/canlı PASS; toplam9.916. 051–055 toplam164 kaynak metni incelemeli soru; yeni model çağrısı0. Kaynak içerik şüphelileri `KAYNAK_ICERIK_TUTARLILIGI` altında gerekçe ve özgün görselle ayrıca teslim edilir; öğrenciye aktarılmaz.

**056–058 — BITTI:** 23 Edebiyat +29 Psikoloji +38 Sosyoloji =90 yeni
soru; her partide INSERT_ONLY/0 UPDATE, tekrar0 INSERT, katalog ve canlı
masaüstü/mobil PASS. Son toplam10.006 (5.450 TYT/4.556 AYT).
051–058de toplam254 özgün metin konu incelemesi kabul edildi. 056da7 native
ve16 mevcut başarılı görsel gövde makbuzu yeniden kullanıldı; yeni model
çağrısı/öğretmen onayı0. Taranmış iki Edebiyat kaynağının40/40 cevap-gövde işi
BITTI;23ü aktarıldı,16 konu+1 içerik incelemesi açık. Okunup konuya bağlanamayan
056/057/058 kayıtları paketlerin `remaining-topic-review.json` dosyalarındadır.
Altı kaynak içerik şüphesi `KAYNAK_ICERIK_TUTARLILIGI` ihracında gerekçelidir.
Altı yardımcı kanıt işi çalışır; tam arşiv kapanışı hâlâ açık.

**Hızlı geçiş tasarımı — pilot ve iki hızlı tarama BITTI; istisna/konu kabulü SURUYOR:** mevcut kırpımlar
tekrar üretilmez; anahtarı olan bütün sorular çıkarım listesinde tutulur.
MEBİ klasörü/kataloğu ders–ünite–konu için ilk kaynaktır. Karma denemelerde
basılı ders aralıkları kullanılır; ana tabloya kesin bağ yoksa ayrı etiket
kuyruğu korunur. 1.573 PDF yolu için kaynak hiyerarşisi dizini hazır;
442 yol mevcut ana konu kimliğine kontrollü bağlandı (soru sayısı değildir).

Eski Pratik kitap profilleriyle, PDF clipping sınırlarına uyan özgün görünür
nesne kontrolü devreye alındı. 2×/2,5× ölçek farkı mevcut PNG'ler korunarak
hesaba katılır. 16 PDF/128 aday pilotunda108 profil+9 native geçti,11 görsel
istisna kaldı;322,16sn, yeni kırpım/model/DB yazımı0. Beş özgün görsel gerçekten
okundu;12 sınır testi PASS. İlk tam tek-test hızlı geçişi1.886 adayı19,2sn'de
sınıflandırdı:782 önceki görsel+627 native+356 yeni profil kanıtı hazır,
121 istisna ayrı. Tek-test istisna geçişi de BITTI:1.886/1.886 cevap/gövde kanıtı hazır (903 mevcut/yeni görsel,627 native,356 profil); konu kabulü ayrıdır.
Deneme hızlı geçişi5.482 adayı1.148,4sn içinde tamamladı:3.635 profil+491 native+719 eski görsel=4.845 kanıtlı gövde;634 yeni görsel istisna ve3 korunmuş eski inceleme açık.
7.368 mevcut PNG hash/mtime ve iki paket manifesti değişmedi.
Kaynak etiket geçişi8.571 kayıt kodunda263 kesin ana tablo eşleme adayı,8.308 açık etiket incelemesi üretti; bunlar yeni soru toplamı değildir.
MEBİ tam kaynak adları ve ana tablo ders/ünite/konu kimlikleri ayrı saklanır; TYT/AYT kapsamı değişirse önbellek etiketi kabul edilmez.
Bu gövde/etiket sayıları yayın değildir; ana görev açık.
Kanıt: `fast-profile-transition/`, `source-folder-labels/index.json`,
`single-test-pending-evidence/fast-pass-result.json`.

**059 — BITTI:** MEBİ basılı tek-test başlıklarından8 TYT Matematik ve20 AYT
Edebiyat sorusu mevcut ana tablo ders–ünite–konu kimliklerine bağlandı.
28 INSERT/0 UPDATE, tekrar0 INSERT, katalog ve masaüstü/mobil canlı okuma PASS;
toplam10.034 (5.458 TYT/4.576 AYT). Yeni kırpım/model çağrısı/öğretmen onayı0.
Kanıt: `source-heading-profile-expansion/`, `verified-source-batch-059/bank-acceptance.json`.
Bu parti tam arşiv/konu kabulünü kapatmaz.

## Güncel kullanıcı talimatı ve açık kapsam

**Güncel PDF tekrar kuralı:** mevcut Soru Çöz & Pratik'te
kullanılmış aynı PDF yeniden aktarılmaz. Önce dosya kimliği, farklı hashlerde
sayfa sayısı ve ilk üç sayfanın bilgisi/küçük özgün önizlemesi karşılaştırılır.
Bu, kullanıcının istediği hızlı belge eşdeğerliği kuralıdır; tüm sonraki
sayfaların byte eşitliği iddia edilmez. Soru metni/görseli/embedding'i üzerinden
banka karşılaştırması kapalıdır. Eski “aynı soru iki bankada olabilir” izni yeni
işler için bu talimatla sınırlandı. Mevcut kimlikler ve tamamlanan aktarım
geçmişi korunur; önceden kullanılan PDF'de soru soru eksik arama yapılmaz.
Kısmi eski aktarım notu kaynak kararıyla saklanır.

PDF kapısı BITTI:1.473 benzersiz PDF/509 mevcut banka PDF referansı;
62 aynı PDF atlandı.1.411 eşleşmeyen PDF,1.411 soru kitabı veya yeni soru
iddiası değildir. `pdf-reuse-check/decisions.json`, kalıcı varsayılan
`scripts/mebi-pratik2-pdf-policy.json`;13 PDF kapısı testi PASS.
YKS çıkmış sorularını kullanıcı zaten mevcut bildirdi; bunlar tekrar alınmaz.
Yeni büyük deneme kitaplarının da mevcut banka PDF kayıtları eşleşti;
önceki ham keşiflerinden yeni kırpım/aktarım başlatılmaz.


**Kalıcı yürütme talimatı:** tekrar “devam et” bekleme. Kullanıcı bütün
cevaplı arşivi Pratik2’ye aktarmayı istiyor; çalışma/context/token sınırına
kadar sürdür. Bağlam yenilenince aynı kanıt/imleçten devam et. Alt parti,
envanter veya incelemeye ayırma ana görevin kapanışı değildir. Gerçek
çözülemeyen kusurları ayrı tut; diğer kaynak/soruların aktarımını bırakma.
Sınır gelirse çalışan süreçler ve sonraki komut devirde kalır; BITTI yok.


Bütün arşivdeki cevaplı sorular işlenip aktarılmadan ana plan kapanmaz.
Önceki BITTI kararı erken kapanıştı; yalnız ilk geçişin kanıtları korunur.
İnceleme listesine konmak, bir soru veya kaynak düzeninin işlenmiş olduğu
anlamına gelmez.17.508 konu/ders adayı,3.823 gövde ve22 kimlik/düzen adayı
ile henüz soru sınırları çıkarılmamış kaynaklar aktif çalışma kapsamındadır.
Gerçek çözülemeyen kusurlar gerekçeli ayrılır; cevap ve konu tahmini yapılmaz.

Sıra: basılı kitap bölümlerini mevcut konu tablosuna bağla →henüz okunmamış
anahtar/gövde kabulü →deneme alt ders/konu eşlemesi →kalan PDF düzenleri ve
paket içerikleri →sıralı INSERT_ONLY/canlı kabul →tam arşiv kapsama kabulü.
Eski kapanış makbuzu ilk geçiş tarihçesidir; tam kabul değildir.

## Aktif tam arşiv işleri

-045 **BITTI**:140 sınav kapsamı kaydı INSERT/0 UPDATE; kaynak, tekrar0,
  katalog ve canlı masaüstü/mobil PASS. Toplam9111;46 ve sonrası canlı tabloda.

[Canlı paket ve BITTI tablosu](soru-bankasi-pratik-2/aktif-paketler.md)
gözetmen tarafından kabul makbuzlarıyla otomatik güncellenir. Kullanıcının
tekrar “devam et” demesi beklenmez. Bilinen paket zincirinin kapanışı,
ana arşiv/ince konu/öğretmen kabulünün kapanışı değildir.

- Native-görsel sayfa ayrımı **BITTI (alt iş)**:421 sayfanın361'i eski-PDF
  nedeniyle yeniden işlenmez; kalan60 sayfanın54'ü özgün2x tam beyaz piksel ve
  boş nesne kontrolüyle,4'ü gerçek görsel okumayla boş. Diğer2 sayfa Edebiyat
  basılı anahtarıdır.58 boş sayfa soru/anahtar yokluğu için yalnız kendi sayfası
  kapsamında kanıtlı; bütün PDF için yokluk iddiası yok. `empty-original-pages/`;
 2 güvenlik testi PASS.
- İki taranmış Edebiyat anahtarında40 cevap/40 özgün gövde **BITTI (hazırlık)**:
  gerçek agent okuması+önbellekte bağımsız Tesseract; ilk tabloda5.E ve test-1
  başlığı birer sınırlı5x bölgeyle kurtarıldı.17 satır ve23 kelime kutusu kırpımı;
  12 native/28 görsel,40 ince konu bekler. Yayın0, öğretmen onayı0; yeni soru
  toplamı iddiası yok. `scanned-literature-pending-evidence/`;3 anahtar testi PASS.
-044 kabulü **BITTI**:169 INSERT/0 UPDATE, kaynak/katalog/canlı PASS; toplam
 8971.045→050 yayın işleri sürer. Kaynak kanıtı yardımcılarının tamamı050
  sonrasına alınarak hazır aktarım partilerine model önceliği verildi; kaydedilmiş
  soru/anahtar makbuzları korunur. Beş gözetmen testi PASS.

- Kalın numara yerleşimi **BITTI (hazırlık)**:kalan27 kaynağa tek sınırlı
  alternatif;17 kaynakta339 basılı numara/anahtar bağı.301 özgün gövde
  (137 satır/164 kelime kutusu),40 kontrollü konu adayı050 ve261 konu
  incelemesi.38 geometri adayı ve10 bağlanamayan kaynak gerekçeli ayrı;
  aynı başarısız kaynağı döngüde onarma yok. Native gövde9/40 ve27/261;
 2 numara/anahtar sınırı testi PASS.050,049'u bekleyen gerçek worker;
  ayrı kanıt worker'ı050 sonrasını bekler. `bold-number-expansion/`.
- Kaynak ders dizini ve açık ders adı karşılıkları, ince konu iddiası olmadan
  gövde doğrulamasında kullanıldı. Donmuş paket değiştirilmedi; eski547
  makbuz korundu,80 ek tek-test native gövdesi model çağrısı0 ile doğrulandı;
 1.259 görsel yolda.8 native güvenlik testi PASS. `sourceSubjectEvidence`
  yalnız ders kanıtıdır; konu/yayın/öğretmen onayı değildir.
- PDF hızlı kapısına metinsiz tarama desteği eklendi: hash/native metin
  farklı veya boşken sayfa sayısı ve ilk üç bütün sayfanın küçük görüntüsü
  karşılaştırılır. Boş ilk sayfalar eşdeğerlik oluşturmaz.13 kapı testi PASS;
  ek gerçek arşiv önizleme geçişi **BITTI**:820 PDF önizlemesi,61 dosya
  kimliği ve bir farklı-hashli tarama eşleşmesi; toplam62 atlama.283 sayfalık
  TYT Türkçe3 Adım kitabı ilk3 özgün sayfasıyla yakalandı. Önbellek
  `pdf-reuse-check/sampled-page-previews.json`, son karar `decisions.json`.
-14 ortak PDF'nin basılı `YDT • İNGİLİZCE` kimliği belgelendi; TYT/AYT
  bankasına zorlanmaz. Karma TYT/AYT başlığı bulunan PDF bu kararla atlanmaz.
  Güncel olumlu yerleşim ipuçları42 kaynak/250 sayfa; bu soru toplamı veya
  diğer sayfalarda soru yokluğu kanıtı değildir.

- Karma konuda yerel model denemesi **BITTI (başarısız pilot; toplu kabul yok)**:
  12 temsil adayı seçildi,8 okuma oluştu; altısı gerçekten incelendi. Model
  üç açık yanlış ana konu, bir komşu-konu belirsizliği ve bir gereksiz ret
  üretti; bu örnekler toplu konu onayına yeterli değildir. Doğru metin alıntısı
  tek başına doğru konu kanıtı sayılmadı. Yeni soru/öğretmen onayı/yayın0.
  Yalnız pilot worker durduruldu; ana arşiv/model/uygulama süreçleri korundu.
  Aynı istem tekrar çalışmaz. `controlled-topic-model-pilot/report.json`,
  `agent-calibration-review.json`;3 mekanik öneri sınırı testi PASS.
  Kaynak başlığıyla kanıtlı aktarım sürer; karma sorular incelemede kalır.

- Tekil tarama yerleşimi hazırlığı **BITTI (alt iş, aktarım değildir)**:
  PDF kapısından geçen 71 kaynakta mevcut basılı-test okuyucusu denendi;
  44 kaynakta 911 native numara/anahtar adayı bulundu. 378 özgün kırpım
  hazır; 539 geometri/bağlam kaydı gerekçeli ayrı incelemede. 77 doğrudan
  kontrollü konu, 139 ek basılı başlık içerme eşlemesi; kalan 162 ince konu
  incelemesindedir. Yeni soru/tekrar iddiası yok, soru banka karşılaştırması0.
  Kanıtlar `individual-tarama-expansion/preparation-report.json`,
  `individual-tarama-topic-expansion/topic-evidence.json`.
- Yeni 046 (77 aday) ve 047 (139 aday) partileri **SURUYOR / sırada**;
  bağımlılıklar 045→046→047. Tam özgün kırpım, bağımsız basılı anahtar,
  INSERT_ONLY, katalog ve canlı kabul geçmeden BITTI olmaz. 301 ilk konu
  bekleyenin 139'u ek konu paketinde de kaynak kimliğiyle temsil edilir;
  bu sayılar toplanarak tekil soru sayısı üretilmez. Yerel native gövde
  kanıtı 046'da9/77, 047'de44/139; diğerleri görsel kapıda kalır.
  Beş tekil-tarama entegrasyon/konu sınırı testi PASS.

- Sözcük kutulu tek ek geometri geçişi **BITTI (hazırlık)**: ilk 539
  kayıt içinden474 yeni özgün kırpım;289 kontrollü konu adayı048,
  185 konu incelemesi.59 soru geometri/bağlam incelemesinde, altı kayıt grup
  düzeyindedir. Böylece44 kaynağın911 native adayında852 gövde hazır;
  bunların505'i konu bağlı,347'si ince konu incelemesindedir. Bu bir aktarım
  sayısı değildir. Üç yeni kırpım gerçekten görüntülendi; gövde/seçenek kaybı
  görülmedi, sayfa altı dekor kenara dokunur. `individual-tarama-word-crops/`,
  `individual-tarama-word-expansion/agent-visual-spot-check.json`.
- Tek-test hazır kaynaklarında8 kaynağın96 adayı mevcut ana konuya yalnız
  soru başlangıcından ÖNCE basılı başlıklarla bağlandı;049 sırada.38 aynı
  gövde okuması tekrar model çağrısı yapılmadan korunur. Karma başlıklar
  tek konuya zorlanmaz. `single-test-heading-expansion/preparation-report.json`.
- 046→047→048→049 yayın işleri gerçekten başlatıldı; bağımlı kabulü bekler.
  301 ve185 konu-bekleyen kanıt işi ayrı başlatıldı; örtüşen kaynak kodları
  toplanıp tekil soru sayısı üretilmez. Yeni sekiz sınır/entegrasyon testi PASS.
- PDF kapısı BITTI:025'in talimat öncesi500 yayını korunur; kalan4.016
  Dört Dörtlük,035'te49,036–040'da2.257,041'de172 ve042–043'te867
  eski-PDF adayı yeniden işlenmeden atlandı.036–040'ın221 yeni-PDF sorusu
  canlı kabulden geçti; banka8.802 oldu. Yeni karşılaştırmalar soru düzeyinde0.
-044'ün169 konu bağlı yeni-PDF adayı kaynak/anahtar/gövde ve canlı kabulden geçti.
  Ardından045'te80 kaynak sorusuna ait140 TYT/AYT kapsam adayı var.
- Kaynak kanıtı işleri050 sonrası: `all-source-evidence`23.879 girişinin
  23.463'ü eski-PDF nedeniyle atlanır;416'sı yeni-PDF kanıtında. Ayrıca
  `full-mock-pending-evidence`5.482 ve `single-test-pending-evidence`1.886
  donmuş aday içerir. Bunlar fine-topic/yayın kabulü değildir. Sonraki konu
  paketleri aynı kaynak kodlarını kullanır; aritmetik toplam tekil soru vermez.
- Sürekli gözetmen çalışan işleri kesmez; durmuş donmuş paketi en fazla3
  kez makbuzdan sürdürür.046–049 ve iki yeni kanıt işi ayrı başlatılmıştır;
  güncel gözetmen bütün kayıtları ve050 sonrası kanıt sırasını izler.
- Native metni olmayan421 sayfa ve78 ZIP/12.249 sayfa karşılığı için önceki
  okuma kanıtları korunur. Okunamayan sayfa “soru yok” sayılmaz. Hazırlanmamış
  kaynak düzenleri ve ince konu eşlemesi açık; ana plan **SURUYOR**.

Kabul edilen güncel sayılar `archive-continuation-progress.json`;
ölçüm `progress-events.jsonl` /`archive-continuation-events.jsonl`;
uygulama komutları [işletim tarifinde](../islemler/mebi-pratik-2.md).

## İlk geçişin korunan sonucu

- Canlı banka: **4.791 soru**, `MEBI_PRACTICE_2`, yan menü **Soru Çöz & Pratik 2**.
- Etkin katalog: `labels-v1-b5fca4abb818b9467a4a6582`.
- Eksik cevap, boş kategori veya katalogda görünmeyen kabul edilmiş soru: **0**.
- Önceki86.035 soru kimliği/cevabı/güncelleme fingerprint'i aynı.
- Kaynak koruma:4.816 dosya /82.845.852.415 bayt tam SHA-256 kontrolü PASS;
  kaynak yazımı/silme0, yeni envantersiz dosya0.
- Dosya/sayfa kararı:4.816/4.816 dosya,27.614/27.614 PDF sayfası; kayıtsız0.
- Öğretmen onayı üretilmedi; öğrenci DB'sine test cevabı yazılmadı.
- Ek kaynak tekrarı:21; yalnız aynı
  RGB pikselleri ve basılı cevap eşleşir, eski soru ID'si birleştirilmez/silinmez.

| Kabul edilmiş parti | Eklenen soru |
|---|---:|
| `publication-preparation` | 21 |
| `verified-source-batch-001` | 536 |
| `verified-source-batch-002` | 546 |
| `verified-source-batch-003` | 2.190 |
| `verified-source-batch-004` | 165 |
| `verified-source-batch-005` | 497 |
| `verified-source-batch-006` | 836 |

İlk okumada uyuşmayan **90 cevap grubunun
90'ı** farklı yerel OCR ile kurtarıldı.
Gövde incelemesinden 836 aday geçti; bu ara aday
sayısı son piksel/tekrar kapısından sonraki aktarım sayısıyla karıştırılmaz.
Kaynak kimliği, piksel, cevap ayrımı ve küçük parti güvenliği için 24
ilgili Python regresyon testi PASS.

## Genel yürütme kuralı

Yetkilendirilmiş planın bir alt partisi bitince final yanıtla durup tekrar
“devam et” isteme. Kabul kapıları geçtikçe sonraki adıma aynı çalışma içinde
geç. Çalışan servisi/incelemeyi gereksiz yere durdurma. Ara ilerlemeyi beş
dakikada veya her%10'da kanıt dosyasına yaz; gerçek ölçüm yoksa kesin süre
veya genel ilerleme yüzdesi verme. Yalnız gerçek kullanıcı kararı gerektiren
engelde dur. Ana BITTI için bütün cevaplı arşivin soru kapsamı ve
aktarımı kabul edilmelidir; yalnız ilk geçiş veya inceleme teslimi yetmez.

## Adımlar ve kabul kanıtları

### 15.01 — Salt-okunur kaynak envanteri — BITTI

4.816 kaynak tam SHA-256 ile envantere alındı. Kaynak dışına çıkılmadı;
özgün arşiv taşınmadı/silinmedi. `inventory.json`, `final-source-integrity.json`.

### 15.02 — Sayfa ve cevap kapsama matrisi — SURUYOR (tam arşiv)

1.573 PDF/27.614 sayfa native metin/koordinat taraması;1.048 HTML/78 ZIP
içerik keşfi tamamlandı. Her dosya/sayfa için sonuç veya inceleme nedeni var.
Ham102.185 gövde işareti/49.567 anahtar işareti doğrulanmış soru sayılmaz.
Yerel gövdesi bulunmayan quiz bağlantıları, görsel okuma sayfaları ve karma
test/bölüm düzenleri kabul edilmeden ayrı kaydedildi.
`full-pdf-coverage.json`, `package-content-report.json`, `archive-disposition/`.

### 15.03 — Özgün soru ve cevap kırpımları — SURUYOR (tam arşiv)

Tek-test taramalarında3.305,3 Adım kitaplarında11.011, derleme taramada2.322
gövde kırpımı hazırlandı;41 denemenin5.863 önceki gövde/anahtar kanıtı güncel
MEBİ köküyle uzlaştırıldı. Gruplar örtüşebilir; sayılar toplanıp tekil soru
toplamı diye sunulmaz. Kesilen satır/seçenek, eksik ortak paragraf, özgün
piksel farkı veya bağımsız anahtar uyuşmazlığı ayrı inceleme nedenidir.
Her yeni aktarım öncesi özgün PDF'den yeniden piksel karşılaştırması yapıldı.
`three-step-all-bodies-v2/`, `compiled-tarama-crops/`,
`full-mock-source-reuse/report.json`, `verified-source-batch-*/final-source-acceptance.json`.

### 15.04 — Konu kimliği ve paketleme — SURUYOR (tam arşiv)

Yalnız ana tablodaki mevcut TYT/AYT-ders-ünite-konu kimlikleri kullanıldı.
Basılı bölüm başlığı veya açık soru kökü kanıtı olmayan genel konu uydurulmadı.
Konu belirsizleri diğer nedenlerden ayrı tutuldu; sahte öğretmen onayı yok.
`teacher-review-export/current/`, `review-index.sqlite3/candidate_decisions`.

### 15.05 — Temsilî pilot ve arayüz — BITTI

İlk21 soru pilotuydu. Ayrı banka/yan menü `/pratik-2`, mevcut soru/pratik
bileşenleriyle çalışır. Geçici DB'de9 pilot/izolasyon testi ve son rota/facet
regresyonları geçti. Canlı masaüstü/mobil sayaçlar ve özgün görsel HTTP hash'leri
parti bazında PASS; öğrenci liste API'sinde doğru cevap ifşa edilmedi.
Altı gerçek eksik-seçenek negatif kontrolü PASS. Öğretmen onayı çıkarsanmadı.
`pilot-ui-report.json`, `pilot-live-read-report.json`,
`verified-source-batch-*/live-bank-read-report.json`.

### 15.06 — Kademeli aktarım — SURUYOR (tam arşiv)

Tam DB yedeği doğrulandı. En fazla100 satırlık atomik INSERT_ONLY partileri,
ikinci ön izlemede0 INSERT/0 UPDATE, mevcut soru fingerprint'i ve sürümlü
katalog bütünlüğüyle kabul edildi. Sıra:ilk21 pilot,536 ek pilot dışı soru,
546 başlık eşlemesi,3 Adım,deneme dil-soruları,derleme tarama ve farklı OCR
ile sınırlı cevap kurtarma. Belirsizler
bu aktarımın parçası değildir. `verified-source-batch-*/bank-acceptance.json`.

### 15.07 — Kapanış ve inceleme teslimi — SURUYOR (tam arşiv)

Her yerel dosya ve PDF sayfasının durumu kayıtlıdır. Kabul edilen bütün
partilerin canlı kabulü geçti. Çözümlenmeyenler kaynaksız arka plan kaydı
olarak bırakılmadı; aşağıdaki gerekçeli listelerde korunur. Tam arşivin
tekil soru sayısı bilinmediği için genel “%100 soru çıkarımı” veya kesin
kalan öğretmen inceleme süresi verilmez. Ana kanıt:`archive-closeout.json`.

## İnceleme kategorileri ve kullanım

`veri/mebi-pratik-2/20261111-source-inventory/teacher-review-export/current/`
altında `question-candidates.csv/json`, `by-reason/*.csv` ve
`source-group-reviews.json` bulunur. CSV'de özgün PDF yolu, sayfa, soru
görseli, varsa cevap/anahtar görseli ve bekleme nedeni vardır.

Kategoriler:cevap anahtarı doğrulaması;gövde bütünlüğü;konu/ders eşleştirmesi;
kaynak/görsel kanıtı;belge düzeni ve soru kimliği. Dosya/sayfa düzeyi
inceleme:`archive-disposition/source-review.csv`, `pdf-page-decisions.jsonl`.
Ham gözlemler `review-index.sqlite3/native_signals` içinde ayrı tutulur.
İnceleme kayıtları öğrenci ekranına ve pratik havuzuna girmez.

Güncel sayılar:`archive-closeout.json`, `teacher-review-export/current/report.json`.
Tekrar işlem ve öğretmen karar sınırları:[işletim tarifi](../islemler/mebi-pratik-2.md).
Yerel model Qwen3.5:9b yalnız basılı anahtar/gövde incelemesi için kullanıldı;
cevap üretmedi. Envanter/hash/numara/koordinat/piksel/aktarımı Python ve
PostgreSQL yaptı. Model çıktısı tek başına yayın veya öğretmen onayı değildir.
