# TYT/AYT PDF kapsamını uzlaştırma

Bu işlem yalnız `Kaynaklar/ogm-materyal`, `yks-cikmis-sorular` ve `mufredat`
altındaki YKS PDF'lerini okur. KPSS klasörleri ve öğrenci geçmişi kapsam dışıdır.
Kaynak dosyalar değiştirilmez. Kaynak hash'i veya çıkarıcı sürümü değişmedikçe
sayfa okuması ve model istekleri önbellekten kullanılır.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_scan.py --workers 4
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-inventory.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_ocr.py --workers 4
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_duplicates.py --publish
..\.venv\Scripts\python.exe -X utf8 scripts/question_image_ocr.py --workers 4 --publish
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_slide_questions.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_discovery.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py --publish
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_text_duplicate_candidates.py
```

Sonuçlar `veri/pdf-source-registry/` altındadır. `report.json` banka kaynağını
tekil soru koduyla sayar; PDF satırlarındaki sayıların toplamı ayrı PDF'lerdeki
aynı soruyu tekrar sayabilir. `discovery.json` ders notları dahil hesaplanmamış
soru bölgelerini, OCR önbelleği metinsiz/bozuk sayfaları saklar. Keşif, OCR,
TF-IDF veya görsel benzerlik sonucu tek başına banka aktarımı değildir.

**Görselde kalan içerik.** Dolu metin katmanı, PDF'nin bütün yazısının okunduğunu
göstermez. Konu özetlerinin soru panelleri ve bazı sunuların tüm gövdesi bitmap
veya vektör biçimindedir; yalnız başlık metni 25 karakter eşiğini aşabilir.
Bu içerikler için mevcut hash/model önbelleğini kullanarak devam et:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_summary_ocr.py --workers 4
$env:OMP_THREAD_LIMIT='1'
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_summary_ocr.py --include-slides --workers 8
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_discovery.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py --publish
```

Yoğun konu özetleri 300 dpi, daha büyük yazılı sunu gövdeleri 144 dpi okunur.
Gövdesi tam metin olan sayfanın yalnız tekrarlanan başlık şeridi için OCR
tekrarlanmaz. Çıktı kaynak/model/çıkarıcı sürümüne bağlıdır; soru bölgelerinde
OCR satır konumları kullanılır. Birkaç seçenek harfi okunan veya tam bölgelere
ayrılamayan panel keşfin belirsiz sayfa listesinde kalır. OCR sonucu ne soru
aktarımı ne konu/öğretmen onayıdır. Tam doğrulanmış PDF'ler yeniden işlenmez.

`pdf_page_dispositions.py`, görsel olarak okunmuş cevap anahtarı ayraçları ve
kullanılmamış kareli not sayfalarını kaynak, fiziksel sayfa, özgün metin, OCR ve
render hash'ine bağlar. Yalnız bu sayfanın okunabilirlik engelini kaldırır;
gerçek soru adayı veya aktarım eksiğini kapatamaz.

**Sağlayıcı PDF'sindeki görsel soru.** `providerPrintCheck.textReviewNumbers`
metin katmanı eksik soruları da içerir. Sıfır metin, boş soru değildir.
`pdf_provider_content_review.py`, tek tek okunmuş tam PDF kırpımını banka
görseliyle, basılı soru numarasıyla ve PDF/API/banka cevaplarıyla birlikte
doğrular. Karar iki görselin, kaynak sayfasının ve banka damgasının hash'ine
bağlıdır; genel benzerlik otomatik kabul edilmez.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_provider_content_review.py --preview
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py --publish
```

`VERIFIED` okuma yalnız ilgili sorunun metin karşılaştırma engelini kapatır.
`PDF_STEM_TRUNCATED`, özgün PDF'deki eksik harfleri `sourceContentIssues`
olarak tutar. Banka görseli tam olduğunda soru karantinaya alınmaz; cevap,
öğrenci geçmişi ve özgün PDF korunur. Bu PDF'nin tam aktarım sonucu verilmez;
envanterde kaynak hatası ve kesin sayfa/soru konumu görünür. Kaynak görünümü
onarılırsa eski hash'e yazılmış okuma yeni PDF'ye taşınamaz.

**Bütün belgenin soru içermediğinin okunması.** `pdf_document_content_review.py`
yalnız bütün fiziksel sayfaları için açık içerik notu yazılmış, hash'i değişmemiş
belgeleri kapatır. Dosya adı, sıfır banka kaydı veya OCR'da seçenek bulunmaması
bu kararı üretemez. Mevcut soru/aday bağı, okunmamış sayfa veya kaynak sorunu
varsa okuma bunları silemez. Kaydedilmiş karar, sonraki tam uzlaştırmada da korunur.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_document_content_review.py --publish
```

Bu artımlı yayın yalnız incelenmiş kaynak satırını değiştirir; ortak katalogda
biçim değişmesi gerekiyorsa tam uzlaştırma ister. Aynı kararın tekrarı sıfır kaynak
günceller. İçerik okuması kanıt panelinde görünür; öğretmen onayı ayrı kalır.

V85–V88 yerel Flyway üzerinden uygulanmış olmalıdır. Kayıtları tek işlemde yayımla:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py --publish
```

`--reuse --publish` son uzlaştırma girdisini yeniden hesaplamadan yayımlar;
yalnız banka ve kaynaklar bu girdiden sonra değişmediyse kullanılır. Yayın
`questions`, cevaplar, öğretmen kararları ve öğrenci tablolarını değiştirmez.
PDF'de anlatım ve sorular birlikte bulunmuşsa ortak katalogdaki makine biçimi
de `KARMA` olur. Bu değişiklik bütün ilgisiz kaynakları ve ilişkileri kopyalayan
yeni bir katalog sürümünde yayımlanır; mevcut öğretmen kararı korunur.
NUL içeren PDF metninin özgün UTF-8 bytes'ı base64 ile korunur; okunabilir
DB alanındaki değiştirme karakteri içerik onayı sayılmaz.

Mini Deneme 04 için `pdf_candidate_labels.py`, yayımlanmış kategori
kimliklerinden yerel Ollama önerileri üretir. Öneriler kaynak okumasından
ayrı tutulur; yüksek model güveni doğruluk veya öğretmen onayı değildir.
Yanlış sınav/ders kapsamına zorlanan konu önerisi kabul edilmez.

`pdf_slide_questions.py` aynı soru metnini taşıyan soru/cevap slaytlarını
eşleştirir. Vektör rengi ve görünen kırmızı pikseller aynı tek seçeneği
göstermelidir; yalnız cevapsız sayfa kırpılır. Paketler içerik hash'ine bağlıdır.
`pdf_slide_review_proposals.py` kalan adayları yerel Ollama ile, kontrollü
TYT/AYT konusu ve mevcut banka adayları bakımından inceler. Çıktı yalnız
öneridir; doğrulanmamış banka kodu aktarım kararı olamaz.

`pdf_slide_compare.py` modelin seçtiği tek banka adayıyla yetinmez; benzerlik
listesindeki adayların tam kökünü, beş seçeneğini ve eşlenen cevabını karşılaştırır.
Satır/sınav başlığı farkları ayrı tutulur. Görsel veya altı çizili sözcük gerektiren
sorular bu metin kapısından geçmez. `pdf_slide_link_review.py` açık kaynak/banka
okumalarını iki metin, iki görsel, cevap ve paket hash'ine bağlar; içerik değişirse
eski okuma geçmez. `pdf_raw_compare.py` aynı sıkı kapıyı eski dil/tarih çıkarımlarına
uygular. Benzer konu veya modelin yüksek güveni tek başına bağ oluşturmaz.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_slide_compare.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_slide_link_review.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_raw_compare.py
```

Bu üç komut banka sorusu oluşturmaz. Değişmemiş kaynak ve canlı banka damgası
yeniden denetlendikten sonra bağlar `pdf_source_reconcile.py --publish` ile DB'ye
alınır. Daha önce kabul edilmiş konumlar yeniden model işlemine sokulmaz.

Dil sorularında sözcük sınırları ve noktalama korunur. `pdf_raw_compare.py`
yalnız özgün PDF'deki U+00AD satır bölme işaretiyle kanıtlanan parçaları
birleştirir; sözlüğe veya benzer banka metnine bakarak boşluk silemez.
Gerçek noktalama/sunum farkları iki tam soru görseli okunarak ayrı kanıta
bağlanır. Bu açık okumaları `pdf_raw_content_review.py` üretir; aynı sözcükler
veya konu tek başına kaynak bağı olamaz.

**İncelenmiş soru kabulü.** Mini Deneme 04 kaynak okuması
`pdf_mini_review.py` ile ayrı kanıtta tutulur. Cevap seçenekleri farklı sıradaysa
harf eşlemesi korunur; var olan sorunun cevap harfi değiştirilmez.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_backup.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_mini_review.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_accept.py
```

Varsayılan kabul komutu salt okunur hazırlıktır. Kaynak hash'i, bütün soru
çapaları/sayfalar, iki cevap okuması, bütün banka ile karşılaştırma, görsel
hash'i ve ortak v2 etiket doğrulaması birlikte geçmelidir. `--publish --backup
<dump>` kabulü ve mevcut bankaya bağları tek işlemde kaydeder. Yeniden
çalıştırma aynı kaynak/karar için yeni soru oluşturmaz. Yeni soru yayınında
`categoryIds`, `subjectIds`, `examIds` ve DB ilişki dizileri dolu olmalıdır;
etiketin yalnız JSON ilişkilerinde bulunması pratik havuzuna katılmaya yetmez.

**Ders sunusu kabulü.** Model önerisinden ayrı içerik okuması
`pdf_slide_source_review.py` ile üretilir. Doğru sınav, ders ve Excel ilk sayfasındaki
konu/ünite birlikte kesinleşmeden yeni soru kabul edilmez. Aynı kaynaktaki yeni
sorular ve başka PDF'deki tekrarları tek işlemde yayımlanabilir:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_slide_source_review.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_slide_accept.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_slide_accept.py --publish --backup <dump>
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-inventory.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_duplicates.py --publish
..\.venv\Scripts\python.exe -X utf8 scripts/question_image_ocr.py --workers 4 --publish
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py --publish
```

Kabul dosyası genişletilirse önceki konumların içerik ve kategori kararları aynı
kalmalıdır; yalnız yeni kararlar işlenir. Aynı dosyanın tekrar kabulü sıfır soru
ekler. Yeni sorular kendi aralarında da karşılaştırılır. Kaynak anahtarındaki
düzeltme, özgün harfi ve bağımsız gerekçeyi saklar; mevcut banka cevabını sessizce
değiştiremez. Desteklenen sıra düzeltmesi numaralı maddeleri, istenen rolleri ve
tek doğru seçenek sırasını doğrudan kaynak metninde sınar. Diğer kaynak hataları,
çeldirici varyantları ve kesin konu karşılığı olmayan adaylar DB'de incelemede kalır.
Eski YGS/LYS/ÖSS/ÖYS üniversite sınavı örnekleri YKS ders kapsamındadır; açık MSÜ,
KPSS ve diğer sınav etiketleri bu kabulde dışarıda tutulur.

`--quarantine-confirmed-empty` yalnız ayrı kayıtlı banka görseli, tam PDF
konumu/kırpımı ve sağlayıcı HTML gövdesi birlikte boş olan kaydı seçimlerden
çıkarır. Soru ve öğrenci geçmişi silinmez. Karar
`learning_catalog.question_source_issues` içinde kalır; ilgili PDF tam
sayılmaz. Küçük ama dolu görseller `pdf_small_question_ocr.py` ile yalnız OCR
için büyütülebilir; görselin özgün bytes'ı değiştirilmez.

Doğrulama:

```powershell
..\.venv\Scripts\python.exe -X utf8 testler/pdf-source-registry-test.py
node testler/resource-intake.mjs
python scripts/ivme.py test PdfSourceRegistryTest
python scripts/ivme.py ui pdf-bank-audit-ui
```

Son UI kontrolü, pratik havuzu ile envanterin aynı YKS banka toplamını
göstermesini, dosya kopyalarının tek satır olmasını, tamlık koşullarını ve
kanıt panelinin görünürlüğünü ve farklı masaüstü genişliklerinde kaydırma
gerekmemesini denetler. Geçici DB testi atomik kabulü, tekrar çalıştırma
engelini, karantinayı, dolu sınav/konu dizilerini ve KPSS kaydının korunmasını
sınar.

Envanterin ana tablosunda aktarım bilgisi üç sütundur: **Bankada kayıtlı soru**
PDF'ye doğrulanmış bağlı pratik sorularını, **Kontrol bekleyen kayıt** henüz
incelenmesi gereken soru/sayfa bölgelerini, **Aktarım durumu** tamlık sonucunu
gösterir. Bekleyen kayıt sayısı kesin eksik soru sayısı değildir. Soru/sayfa
kayıtları varsa kendi birimiyle sayılır; tam dökümü olmayan belgelerde **Belge:
N sayfa** fiziksel PDF'nin boyutunu belirtir, eksik soru sayısını değil.
Aktarım sütunu gerekli eşleştirme, cevap/etiket, görsel veya kaynak metni
incelemesini açıkça adlandırır; yalnız tamlık kanıtı olan satır tamamlanır. Önceki işlem etiketi,
soru durumu ve bütün sorular alındı sütunları bu tek durum sütununda birleştirilir.
Dosyanın açık/arşivde/eksik olması ayrı **Dosya durumu** sütunundadır. Planlanan
çıkarım veya arşiv incelemesi tamamlanma sonucu değildir; **İncele** panelinde
açıklanır. **Bilgileri yenile** güncel DB sayılarını tekrar okur.
