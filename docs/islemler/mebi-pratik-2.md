# MEBİ Pratik 2: aktarım ve inceleme

Öğrenci, yan menüde **Soru Çöz & Pratik 2** bölümünden sınav/ders/konu seçer.
Bu banka yalnız `D:\workspace\mebi-yks` kaynaklarını kullanır. Güncel miktar
ekrandaki sayaçtan ve `verified-source-batch-*/bank-acceptance.json`
makbuzlarından okunur. Eski Pratik bankası ayrı kalır.

## Kabul sırası

1. Özgün kaynak hash'i, basılı test/bölüm/adım kimliği ve soru numarasını bağla.
2. Beş seçenek ve tam gövdeyi özgün PDF piksellerinden kırp; devam/ortak
   paragraf kanıtı yoksa ayrı incelemeye al.
3. Basılı cevabı native okuma ve bağımsız görsel okumayla karşılaştır.
4. Kaynak başlığı veya açık soru kökü kanıtını ana tablonun mevcut kategori
   kimliğine bağla. Kanıtsız model konu önerisini yayımlama.
5. Son aktarım kapısında gövde ve anahtarı özgün PDF'den yeniden karşılaştır.
6. Yalnız Pratik 2 içinde tam RGB/gövde ve aynı cevap eşleşmesini kaynak
   tekrarı olarak kaydet. Eski banka karşılaştırması veya yenilik şartı yoktur.
   Eski soru kimlikleri birleştirilmez ve silinmez.
7. En fazla100 satırlık atomik INSERT_ONLY partileri al, ikinci ön izlemeyi
   sıfır delta ile doğrula, sürümlü katalog yayımla, canlı masaüstü/mobil
   sayaç ve özgün görsel hash'lerini kontrol et.

## Gerekçeli inceleme kuyruğu

Kanıt kökü `veri/mebi-pratik-2/20261111-source-inventory/`.

| Dosya/katman | Anlamı |
|---|---|
| `teacher-review-export/current/question-candidates.csv` | Soru bazında kalan karar; kaynak, sayfa, görsel, cevap ve neden |
| `teacher-review-export/current/by-reason/*.csv` | Aynı adayların gerekçelerine göre ayrılmış öğretmen listeleri |
| `teacher-review-export/current/source-group-reviews.json` | Soru sayısı bilinmeyen test/bölüm grubu |
| `archive-disposition/source-review.csv` | Bütün dosyaların gerekçeli inceleme yolu |
| `archive-disposition/pdf-page-decisions.jsonl` | Her PDF sayfasının sonucu ve ham işaretleri |
| `review-index.sqlite3/candidate_decisions` | Güncel tekil aday kodu ve karar |
| `review-index.sqlite3/source_dispositions` | Güncel kaynak dosyası kararı |
| `review-index.sqlite3/native_signals` | Ham numara/anahtar işaretleri; doğrulanmış soru değildir |
| `verified-source-batch-*/exact-duplicate-evidence.json` | Aynı piksel ve cevaba bağlanan ek kaynak konumu |
| `verified-source-batch-*/final-source-acceptance.json` | Son özgün piksel kapısının kabul/istisna kayıtları |

Kategoriler: **cevap anahtarı doğrulaması**, **soru gövdesi bütünlüğü**,
**konu/ders eşleştirmesi**, **kaynak/görsel kanıtı**, **belge düzeni ve soru
kimliği**. İlk okumada cevap bulunamaması doğrudan vazgeçme nedeni değildir.
Aynı basılı test/bölüm/adım kimliğiyle kaynak içi diğer anahtar konumu ve
mevcut kanıt kontrol edilir; bir farklı yerel OCR yöntemiyle sınırlı kurtarma
geçişi yapılır. Aynı başarısız istem döngüde tekrarlanmaz. Yine doğrulanamayan
incelemeye ayrılır; açıkça çelişen cevap tahminle seçilmez.
Bu kayıtlar öğrenci listesine ve otomatik pratik havuzuna girmez. Öğretmen
kararı ancak gerçekten verilirse ayrıca kaydedilir.

Dosya/sayfa/ham gözlem/test grubu/adayı/aktarılmış soruyu birbirine ekleyip
“toplam soru” diye sunma. Aynı soru birden fazla kaynakta bulunabilir.

## Devam ve güncelleme

Tam arşiv görevi, inceleme listesi hazırlanarak kapatılamaz. Önceki
`archive-closeout.json` yalnız ilk geçiş kanıtıdır; plan üreticisi bu
makbuzdan ana BITTI çıkarmayı reddeder. Kullanıcı tekrar “devam et” demeden
çalışma/context/token sınırına kadar yürüt; yeni bağlamda imleçten sürdür.

Tam arşiv genişleme sırası (aynı çalışan işi tekrar başlatma):

```powershell
python scripts/mebi_pratik2_arsiv_basliklari.py
python scripts/mebi_pratik2_arsiv_kabul.py --chunk-size 200 --publish
python scripts/mebi_pratik2_sozcuk_kirpim.py
python scripts/mebi_pratik2_arsiv_kabul.py --package-dir word-boundary-expansion --first-batch 19 --wait-for curated-chapter-expansion/pass-result.json --chunk-size 200 --publish
python scripts/mebi_pratik2_arsiv_izle.py --watch
```

Başlık paketi oluşturulunca değişmez; tekrar hazırlama yerine kabul
worker'ını mevcut makbuzlardan devam ettir. İlk genişleme007–018; sözcük
yerleşimi019+partileridir. Sözcük yerleşimi yeni özgün piksel kanıtıdır;
önceki başarısız kırpım/okuma korunur. Bunların tamamı tam arşivin alt
işidir. Model/konu önerisi tek başına kabul edilmez; kontrollü kaynak başlığı,
bağımsız basılı anahtar, tam gövde, son piksel ve canlı kapılar zorunludur.

Çalışan modeli veya aktarımı yeniden başlatma; ilgili
`progress-current.json` ve `continuation-progress.jsonl` üzerinden izle.
Bekleyen aktarım ve kabul sırası `docs/devam.md` içinde gösterilir.

Tamamlanmış kanıt manifestiyle yeni parti:

```powershell
python scripts/mebi_pratik2_arsiv_partisi.py --acceptance <goreli-kabul-json> --batch-dir verified-source-batch-NNN --after-batch verified-source-batch-ONCEKI
```

Başarılı makbuzlar tekrar çalıştırılmaz; hata veren bağımlılık sonraki adımı
başlatmaz. Kaynak kabulü ve üretim alımı ayrı makbuzlardır.

Güncel kuyruk ve dosya/sayfa matrisi:

```powershell
python scripts/mebi_pratik2_guncel_kuyruk.py
python scripts/mebi_pratik2_arsiv_kararlari.py
```

Tam arşivde gerekçeli karar kaydı tamamlanması, bütün basılı soruların
çıkarıldığı veya öğretmen tarafından onaylandığı anlamına gelmez. Kapanış
raporu aktarılan kapsamı ve ertelenen incelemeyi ayrı gösterir.

## Matrisler, çözümlü sorular ve native metin boşlukları

```powershell
python scripts/mebi_pratik2_gorsel_sayfa_ocr.py
python scripts/mebi_pratik2_gorsel_sayfa_ocr.py --enrich-words
python scripts/mebi_pratik2_dort_dortluk.py
python scripts/mebi_pratik2_dort_dortluk_kirpim.py
python scripts/mebi_pratik2_arsiv_kabul.py --package-dir four-square-expansion --first-batch 25 --wait-for word-boundary-expansion/pass-result.json --chunk-size 500 --publish
python scripts/mebi_pratik2_anahtar_kimlik_kurtarma.py --wait-and-publish
```

Mevcut çalışanları tekrar başlatma. Matrisler sütun numarası, basılı test ve
A/B varyantıyla bağlanır; boş hücre harfleri kaydırmaz. Çözümlü sorunun
öğrenci görseli Çözüm’den önce kesilir, basılı Cevap: ayrı kanıttır.
İlk okuma OCR ise ikinci bağımsız yöntem görsel modeldir. Başlık/adım
hatasında kaynaktan yapılan agent görsel okuması ayrı yöntem olarak yazılır;
insan öğretmen onayı üretilmez, eski başarısız makbuz silinmez.

Görselsiz bazı gövdelerin yerel kaynak kanıtı:

```powershell
python scripts/mebi_pratik2_native_govde.py --package-dir <paket-dizini>
```

Bu kısayol kaydedilmiş başarılı/başarısız görsel okumayı değiştirmez.
Özgün piksel eşitliği, bütün native sözcük kutuları, doğru soru numarası,
beş seçenek, grafik/şekil ve dış bağlam yokluğu birlikte aranır. Kanıt
makbuzuna model çağrısı0 yazılır; kalanlar normal görsel incelemeye gider.

### 3 Adım deneme kaynak kimliği keşfi

`python scripts/mebi_pratik2_uc_adim_deneme.py` dört deneme kitabında basılı
adım/deneme/test bölümü/soru numarasını eşler. Döndürülmüş adım başlığının
metin kutusu ilk/son cevap satırını kapsamaz; özgün PDF vektöründeki dikey
tablo şeridi sınır olarak kullanılır. Boş cevap hücresi sonraki harfleri
kaydırmaz. Çıktı `three-step-mock-discovery/`; keşif aktarım kabulü değildir.
`python testler/mebi-pratik2-three-step-mock-test.py` kimlik/boş hücre
ve eksik vektör şeridi sınırlarını denetler.

`python scripts/mebi_pratik2_native_govde.py --audit-existing` eski CPU
gövde makbuzlarını tam native satır/sözcük sınırını da isteyen V2 ile
denetler. Zayıf türetilmiş makbuz arşivlenir ve gerçek görsel okuma yolu
korunur; özgün kaynak ve soru kaydı silinmez. Yayımlanmış başarısız kanıt
varsa makbuzları değiştirmeden görsel inceleme gerektiren raporla durur.

### Devam eden yeni deneme ve üst başlık geçişleri

- `python scripts/mebi_pratik2_uc_adim_deneme_kirpim.py`:özgün soru görüntüsü,
  adım/deneme/bölüm kimlikli anahtar kırpımı ve yalnız açık soru-komutu konu bağı.
  İnce konusu bilinmeyenler `three-step-mock-crops/` içinde ayrı gerekçeli kalır.
- `python scripts/mebi_pratik2_uc_adim_deneme.py --output-dir three-step-mock-discovery-v2`
  ve `python scripts/mebi_pratik2_uc_adim_deneme_kirpim.py --discovery-dir three-step-mock-discovery-v2 --output-dir three-step-mock-additional-crops --package-dir three-step-mock-additional-expansion --additional-only`
  girintili sağ Fen sütunu kanıtını ayrı sürümde çıkarır; sıradaki/önceki sağlam
  soru kodları veya görüntüleri yeniden yazılmaz.
- `python scripts/mebi_pratik2_dort_dortluk.py --output-dir four-square-discovery-v4`
  üstte başlayan soru metnini kitap bölüm başlığından ayırır.
  `python scripts/mebi_pratik2_dort_dortluk_kirpim.py --discovery-dir four-square-discovery-v4 --output-dir four-square-header-crops --package-dir four-square-header-expansion --additional-only`
  yalnız yeni/düzeltilmiş fiziksel gövdeleri ayrı üretir; önceki aday kodu
  korunur, sıraya alınmış kod tekrar kabul edilmez. Aynı grup ve aynı görsel
  hashindeki bağımsız anahtar makbuzu tekrar OCR/model çağrısı olmadan kullanılır.
-041:`three-step-mock-expansion`172 aday;042–043:`four-square-header-expansion`867
  aday. `mebi_pratik2_arsiv_kabul.py --package-dir <ad> --first-batch <ilk> --wait-for <önceki>/pass-result.json --chunk-size 500 --publish`.
  Bunlar mevcut kabul kapılarını geçmeden soru aktarılmış sayılmaz.

### Konu beklerken cevap/gövdeyi eksik bırakmama

`python scripts/mebi_pratik2_konu_bekleyen_kanit.py --prepare` henüz
sıraya alınmamış hazırlanmış gövdeleri ve düzeltilmiş son kanıtı sabit
`all-source-evidence/chapter-packages.json` paketine alır. Mevcut kabul/publisher
kodları tekrar edilmez. `python scripts/mebi_pratik2_native_govde.py --package-dir all-source-evidence`
yalnız tam özgün piksel/satır/sözcük/grafiksiz bağımsız native alt kanıtı
çıkarır. `python scripts/mebi_pratik2_konu_bekleyen_kanit.py --wait-for four-square-header-expansion/pass-result.json`
yayın sırasının ardından anahtar/gövde kanıtını işler. Her adayın son kaydı
`candidate-evidence/`; konu açıkken öğrenciye/yayına gitmez. Makbuzlar
sonraki konu kabulünde tekrar OCR/model harcamamak için aynı hashle kullanılır.

Eski yüklenmiş worker görsel-inceleme işaretini native kanıt sanarsa taze
`mebi_pratik2_son_piksel_kapisi.validate_legacy_shortcut` yalnız bu adayı
V2/ilk gerçek görsel okuma ile değerlendirir; eski makbuz tarihsel kalır.
Bilinmeyen/başarısız gövde yayına girmez. `legacy-body-review/` önceki
başarısız modeli tekrar etmez, aynı kaynak hashini tekrar kullanır.

`python scripts/mebi_pratik2_cevrimdisi_sayfalar.py --output-dir offline-page-correspondence-v2`
çevrimdışı kitapların literal metin sayfalarını PDF sayfalarına bağlar.
JavaScript yalnız JSON string-array olarak okunur, çalıştırılmaz. Tam metin
ve sözcük-frekans eşliği farklı durumlardır; ikisi de özgün soru pikseli veya
tam soru kapsamı kanıtı değildir. Boş/kısa/tekrarlanan/eşleşmeyen sayfa açık
inceleme kaydıdır; ZIP sırf metni eşleşti diye elenmez.

### Süreç kesilince kullanıcıdan tekrar devam beklememe

`python scripts/mebi_pratik2_zincir_gozetmeni.py` yalnız mevcut zincir durumunu
okur. `--watch` çalışan işlerin OS kilidine dokunmadan durmuş, bağımlılığı kabul
edilmiş işi makbuzdan sürdürür; en fazla3 başlangıç ve60sn geri çekilme vardır.
Gözetmen uygulama/model worker'ını sonlandırmaz. Gizli ayrı süreçle çalıştırma
tercih edilir; durum/log `chain-supervisor/`. OS/oturum kapanırsa gözetmenin de
başlatılması gerekir; işletim sistemi başlangıç görevi kurulmadı.

`python scripts/mebi_pratik2_tek_test_bekleyen.py` tekil testlerin kabul edilmiş
veya sıraya alınmış kodlarını dışarıda tutup kalan sağlam geometrili adayları
sabit `single-test-pending-evidence` paketine bağlar. Cevap/gövde kanıt işi
`mebi_pratik2_konu_bekleyen_kanit.py --package-dir single-test-pending-evidence --wait-for full-mock-expansion/pass-result.json`.
Konu belirsizliği kaynak/cevap başarısızlığı ile aynı karar değildir; ikisi de
ayrı gerekçeli saklanır ve kesin kabul olmadan yayın yapılmaz.

### Basılı ortak sınav kapsamı ve tek-test makbuzu

`python scripts/mebi_pratik2_ortak_felsefe.py` yalnız basılı FELSEFE,
TYT/AYT TARAMA ve açık bölüm başlığını mevcut tam konu satırına bağlar.
Din/siyaset/sanat alanı ve AYT bilim felsefesi dışında başlık tahmini yoktur.
Soru kodu TYT için korunur; aynı basılı kapsamın AYT karşılığı -AYT koduyla,
aynı kaynak/key/piksel kanıtıyla ayrı mevcut AYT satırına gider.045 partisi
044 sonrası; mevcut INSERT_ONLY/katalog/canlı kapıları geçmeden yayın yok.
`--subject-overlay` sadece220 derssiz inceleme adayında basılı FELSEFE ve
ortak sınav kimliğini düzeltir; konu onayı veya öğrenci yayını üretmez.

`python scripts/mebi_pratik2_tek_test_bekleyen.py --prime-keys`1.886 hazır
tek-test adayında aynı hash/numara/cevabın önceki bağımsız makbuzunu indeksler.
Kaynak veya model yeniden üretilmez; cevap uyuşmazlığı ayrı kalır.

### Kullanıcının PDF düzeyinde hızlı tekrar kuralı (güncel)

`python scripts/mebi_pratik2_pdf_tekrar_kapisi.py` mevcut Pratik bankasının
PDF kayıtlarını okur; soruların metnini/görselini karşılaştırmaz. Dosya kimliği
ilk kapıdır; hash farklıysa sayfa sayısı ve ilk üç sayfanın tam bilgisi/boyutu,
metin nesnesi sırası farklı olabilen adaylarda sözcük çokluğu ve küçük özgün
sayfa önizlemeleri birlikte kullanılır. Boş/genel kapak tek başına kaynak
kimliği değildir. Sonraki sayfaların aynı olduğu byte ispatı iddia edilmez;
bu kullanıcı tarafından seçilmiş hızlı belge eşdeğerliğidir.

`pdf-reuse-check/existing-practice-pdf-index.json` salt-okunur banka kaynak
anlık kaydı; `decisions.json` kaynak kararı. Kalıcı varsayılan
`scripts/mebi-pratik2-pdf-policy.json`; session override olmasa da PDF kapısı
etkindir. Kullanıcı YKS çıkmışları zaten mevcut bildirdiği için yeniden alım
yapılmaz. Eski bankada aynı PDF kullanılmışsa kaynak bütünü atlanır; eski
kapsam durumu INCOMPLETE ise not korunur, soru bazında eksik arama yapılmaz.
Yeni kaynak hazırlığı ayrıca güncel PDF kayıtlarını ucuz toplu sorguyla kontrol
eder. Kaynak kararı yoksa yeni iş başlamaz.

Kural altında `mebi_pratik2_kesin_piksel_tekrari.select_new` soru karşılaştırması
çalıştırmaz; yalnız kapalı olduğuna dair0-karşılaştırma makbuzu yazar. Normal
INSERT_ONLY kimlik koruması ve yeni kaynağın cevap/özgün piksel kabulü devam
eder. Önceden kabul edilen paketler değişmez; yeni boş kaynak partisi
SKIPPED_EXISTING_PDF_SOURCE_BATCH ile kapanır, yayın sayısı0 olur.


## Tekil taramalarda ortak basılı-test okuyucusu

PDF kapısı tamamlandıktan sonra `python scripts/mebi_pratik2_tek_tarama_ek.py`
komutuyla kalan tekil kaynakları aynı test/numara/anahtar okuyucusundan geçir.
Kırpımlar `individual-tarama-crops`, ilk kontrollü konu paketi
`individual-tarama-expansion`, belirsizler `individual-tarama-pending-evidence`
altındadır. `python scripts/mebi_pratik2_tek_tarama_konu.py` basılı tek-konu
başlıklarını mevcut ana konu satırlarına açık içerme kurallarıyla bağlar;
karma başlığa tek konu atamaz. Kaynak dersini opak dosya adından çıkarmaz.
Donmuş ilk paketler değiştirilmez; ek konu paketi ayrı makbuzdur.
046 ve047 için mevcut arşiv kabul komutlarını sırasıyla045 ve046 bağımlılığıyla
kullan; hazırlık raporunu aktarım kabulü sayma. Gerekçeli sorular ve grup
istisnaları güncel inceleme dışa aktarımına katılır.


Satır kutusunun sütunları birleştirdiği adaylara yalnız bir ek geometri geçişi:
`python scripts/mebi_pratik2_tek_tarama_sozcuk.py`. Yeni kırpımlar eski PNG ve
makbuzları değiştirmez. `individual-tarama-word-expansion`048, belirsizleri
`individual-tarama-word-pending-evidence` altındadır. Başka kaynak/konu için
`python scripts/mebi_pratik2_tek_test_baslik.py` soru başlangıcından önceki
basılı başlıkları okur; `single-test-heading-expansion`049'u hazırlar. Aynı
kaynak/görsel/hash için mevcut başarılı veya başarısız gövde okumaları korunur;
yeni öğretmen onayı üretilmez. Doğrudan anahtarı doğrulanmış soru sayılmaz.


Karma konular için `mebi_pratik2_konu_model_pilotu.py` yalnız24'e kadar
kaynak/anahtar/native gövdesi doğrulanmış soruda yerel öneri denemesidir.
Model önerisi, geçerli kategori ve birebir kaynak alıntısı olsa da kabul veya
öğretmen onayı değildir. Mevcut `controlled-topic-model-pilot` kalibrasyonu
başarısız; komut aynı istemi tekrar model çağırmadan atlar. Bu sonuçtan toplu
kategorileme/yayın başlatma. Başarısızlığın kaynak metinli gerçek örnekleri
`agent-calibration-review.json` içindedir; anahtar cevapları değiştirilmedi.


Kalan numara bağlama hatalarında bir sınırlı alternatif:
`python scripts/mebi_pratik2_kalin_numara.py`. Yalnız özgün PDF'deki kalın
basılı numara span'ları soru başlangıcı olur; normal numaralı örnek ve anahtar
hücresi soru sayılmaz. Tekrarlanan kalın numara/uyuşmayan anahtar yine ayrılır.
`bold-number-expansion`050 ve `bold-number-pending-evidence` ayrıdır; kaynak
ve eski kırpımlar değişmez. Yeniden komut yalnız donmuş paketin güncel özetini
üretir. Native gövde için ders aliası/dizini kaynak kanıtı olarak kullanılabilir;
`sourceSubjectEvidence` ince konu/öğretmen onayı değildir.

PDF tekrar kapısı hash/native metin dışındaki taramalar için de aynı sayfa
sayısı+ilk üç bütün sayfanın küçük görüntülerini kullanır. Saf boş örnek
sayfalar eşleşme oluşturmaz. Önbellek `sampled-page-previews.json` dosyasında;
kararlar bütün geçiş sonunda atomik yenilenir. Bu hâlâ belge düzeyindeki hızlı
kuraldır, bütün sonraki sayfaların aynılığı veya soru bazında karşılaştırma değildir.


Görsel-inceleme işaretli sayfalar için `python scripts/mebi_pratik2_bos_sayfa_kaniti.py`
yalnız native metin/görsel/çizim/not yokken ve özgün2x görüntü tamamen beyazken
boşluk kanıtı verir. Gerçek agent okumaları `empty-original-pages/agent-page-review.json`
üzerinden, görüntü hash'i doğrulanarak ayrı görünür; bütün PDF'de soru yokluğu
iddiası yoktur. Taranmış iki Edebiyat anahtarı:
`python scripts/mebi_pratik2_taranmis_edebiyat_anahtar.py`. Anahtarın agent okuması
önbellek Tesseract numara/harf ve test kimliğiyle tam uyuşmalıdır; bir eksik hücre
ve bir başlık için kaydedilmiş sınırlı bölge okuması kullanılabilir.40 soru
`scanned-literature-pending-evidence` altında ince konu/bağımsız gövde bekler.
Yeni öğretmen onayı veya otomatik konu yayını yoktur. Kaynak/kırpım değişmez.

Gözetmen bütün yardımcı kanıt işlerini en son donmuş yayın paketinin (050)
sonrasına koyar. Böylece model kaynağında hazır yayınlar önceliklidir. Yeni yayın
paketi eklenirse bağımlılık testini çalıştır; tamamlanmış makbuzları koru.
