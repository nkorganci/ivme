# 15. Adım — MEBİ Soru Çöz & Pratik 2 — SURUYOR (tam arşiv)

**Güncel canlı kabul:** 8.802 soru; ana görev **SURUYOR**, bütün arşiv kabulü açık.

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

PDF kapısı BITTI:1.473 benzersiz PDF/510 mevcut banka PDF referansı;
61 aynı PDF atlandı.1.412 eşleşmeyen PDF,1.412 soru kitabı veya yeni soru
iddiası değildir. `pdf-reuse-check/decisions.json`, kalıcı varsayılan
`scripts/mebi-pratik2-pdf-policy.json`;11 PDF kapısı testi PASS.
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

- PDF kapısı önce uygulanır: Dört Dörtlük kalan4.016 adayın ait olduğu
  PDF'ler zaten mevcut; yeniden model/kırpım/aktarım yapılmadan atlandı.
  Kurtarma49, ek konu grubunda2.257, yeni denemelerde172, başlık grubunda867
  eski-PDF adayı da bu kurala tabidir; atlama yeni soru yayını değildir.
- Sürekli gözetmen çalışan işleri korur; durmuş hazırlanmış paket işini en
  fazla3 kez makbuzdan sürdürür. Kabul edilmiş paket yeniden yazılmaz.
- Basılı FELSEFE/TYT-AYT ve tam bölüm başlığıyla80 kaynak sorusunda140
  sınav kapsamı adayı045 için hazır; konu veya cevap tahmini yapılmadı.
-1.886 ek tek-test adayı `single-test-pending-evidence/` kuyruğunda;044 sonrası
  kaynak kanıtı işi hazır. Bu sayı doğrulanmış/yayımlanmış soru sayısı değildir.

- Başlık bağlı2.390 adayın kaynak kabulü BITTI:2.313 kabul/77 inceleme;007–018
  canlı kapıları geçti. Bu tamamlanan alt geçiş sonunda canlı banka7.094 oldu.
- Sözcük sınırlarıyla3.114 yeni gövde;1.005 aday019–024 alt geçişi BITTI:989 kaynak kabulü/16 inceleme;
  987 yeni yayın ve2 kesin aynı-kapsam kaynak bağı.
- Dört Dörtlük15 kitapta matris ve açık Cevap: bağlaması yapıldı;13.843 kırpım,
  konu bağı hazır4.516 aday025–034 zincirinde sırada. Diğerleri aktif konu/yerleşim işi.
- Beş Fizik tablosundaki14 anahtar grubu ayrıca agent görsel okumasıyla doğrulandı;
  gerçek anahtar-inceleme adayları035’te gövde/alım kapısından geçecek.
- Native metni olmayan421 sayfanın özgün görüntü OCR’ı tamamlandı;110 sayfada
  metin okundu,311 sonuç “soru yok” kabulü değildir. Sonraki yerleşim işi açık.
- Ek kontrollü alt başlık eşlemeleriyle2.478 aday036–040 zincirinde sırada.
- Dört3 Adım denemede4.917 özgün kırpım/172 konu bağlı aday041 için hazır;
  ek girintili sütun geçişinde87 yeni kırpım incelemede. Bunlar alım değildir.
- Üstte başlayan soru/bölüm başlığı ayrımı V4 ile12.919 matris ve5.422 açık
  çözümlü gövdeyi bağladı;3.470 ek kırpım/867 konu bağlı aday042–043 için hazır.
- Native V2 denetimi BITTI:907 kanıtın577'si tam satır sınırını geçti,330'u
  gerçek görsel yola döndü. Yayımlanmış başarısız kayıt0; ana plan kapanmadı.
- İnce konusu açık23.879 hazırlanmış adayın anahtar/gövde kanıtı,042–043
  sonrası ayrı işte tamamlanacak. Bu kanıt işi konu veya yayın onayı üretmez.
-78 ZIP/12.249 sayfanın metin karşılık keşfi tamamlandı; eşleşen metin sayfası
  piksel/soru kabulü değildir. Eksik/ambiguous sayfalar ayrı kayıttadır.
- Dört3 Adım deneme kitabı, kalan konu/gövde düzenleri ve paket kaynakları
  bütün arşiv kapsamı içinde; bu alt işler bitince ana görev kapanmaz.

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
