# Kaynak kaydı: PDF çıkarma, kanıt paketi, uzlaştırma, yerel model

Bu tarif mevcut PDF araçlarını anlatır; 16.02–16.03 tek tablolu **kaynak kaydını** ve silme/taşıma kurallarını getirir (bkz. [16. adım](../plan/16-ogrenme-kalitesi.md)). Kaynak PDF'ler okunur; değişiklik yalnız 16.03 onaylı betiğiyle yapılır. Kural: **önbellek → metin katmanı → OCR → yerel model → büyük AI**; tam sayfa ekran görüntüsü AI'ya verilmez; bulut modeli PDF taramaz.

## Sayfa ve metin katmanı

```powershell
python scripts/ivme.py pdf sayfalar "<pdf>" --metinsiz          # metni olmayan sayfa (OCR gerekir)
python scripts/ivme.py pdf sorular "<pdf>" [--metinsiz|--sayfa 3-6|--kirp veri/pdf-kirp/<ad>]
```

`scripts/pdf-metin.py` soru başına numara, sayfa, `bbox`, metin, `gorselGerekli` verir; numara geriye dönünce yeni `bolum` başlar; "12. C" satırları `cevapAnahtari`, "58.–60. soruları cevaplayınız" `ortakOncul`; `summary.bolumler` eksik/tekrar numarayı gösterir. `gorselGerekli` metin örtüldükten sonra bölgede koyu mürekkep kalmasıyla belirlenir. Önbellek `veri/pdf-metin-onbellek/` (PDF SHA-256). Metinsiz sayfalar için `scripts/pdf-page-ocr.py`, `pdf-readability-fallback.py`.

## PDF kanıt paketi (TAS-07)

PDF'i sayfa/blok/şekil düzeyinde izlenebilir, sürümlü, yeniden işlenmeyen kanıta çevirir; model çağrılmaz, OCR yalnız metinsiz sayfada. Çıktı `veri/pdf-kanit/<hash[:2]>/<hash>/` (Git dışı; silinirse aynı komutla yeniden üretilir): `kaynak.json`, `sayfalar/NNNN.json`, `gorseller/<sha16>.png`, `ozet.json`, `calisma.json`.

```powershell
python scripts/ivme.py pdf kanit olustur "<pdf|yol|hash>" [--sayfa 3-5] [--ocr] [--ocr-konum]
python scripts/ivme.py pdf kanit toplu --klasor <klasör> [--ilk N] [--workers 2]
python scripts/ivme.py pdf kanit dogrula|goster|ozet <pdf|hash> [--sayfa 12]
python scripts/ivme.py pdf kanit karar <pdf|hash> --sayfa 3 --durum OUT_OF_SCOPE --inceleyen <ad> --not "<gerekçe>"
python -X utf8 testler/pdf-kanit-test.py
```

- Sayfa kaydı: `pageIndex` fiziksel (1 tabanlı) ve `printedLabel` ayrı; koordinat `pt`, sol üst başlangıç, sayfa dönüşü uygulanmış uzay; blok `id` (kaynak+sayfa+konum+metin hash'i), `kind` TEXT/EQUATION, `role`, `order` (iki sütunda sol sonra sağ), `bbox`, `source` TEXT_LAYER/OCR; denklem `mathScore`/`mathRisks`, `verification.state=UNVERIFIED`; yalnız çizgili tablo aranır; şekil kırpımı hash ve dpi ile, alt metin `CANDIDATE_UNREVIEWED`; 72 dpi sayfa görüntü hash'i insan kararına bağlanır.
- Tamlık ölçüleri ayrı: `text`, `figures`, `equations` (makine tarafından asla doğrulanmış olmaz), `questions=NOT_ASSESSED`. `overall`: `COMPLETE`, `PROBLEM` (`OCR_PENDING`, `OCR_UNREADABLE`, `TEXT_LAYER_UNRELIABLE`, `FIGURE_CROP_MISSING`), `TRULY_BLANK` (metin yok ve görüntü boş; render hash'iyle), `OUT_OF_SCOPE` (yalnız insan). Metinsiz sayfa otomatik boş sayılmaz; 1–24 karakterli ve OCR'ı başka metin bulmayan sayfa `SHORT_TEXT_PAGE` ile tamam. Notlar bilgidir: `RASTER_CONTENT_TEXT_NOT_READ`, `TABLE_DETECTION_ERROR`.
- Aşama anahtarı `kaynak hash'i + sayfa + çıkarıcı sürümü + parametre hash'i` (+ önceki çıktı hash'i); eşleşirse hesaplanmaz. `layout` (`LAYOUT_VERSION`, PyMuPDF, parametreler, tekrarlayan logo kümesi), `crops` (`CROP_VERSION`, dpi, kenar payı; yalnız PNG), `ocr` (`OCR_VERSION`, `tur.traineddata` hash'i). Katalog adı, konu eşlemesi ve istem anahtarda yoktur (değişmeleri PDF'i yeniden işlemez). `calisma.json` `layoutBuilt/Reused`, `cropsBuilt/Reused`, `ocrBuilt/Reused`, `repaired`, `modelCalls`, `externalCalls` sayar; yarım sayfa dosyası yalnız o sayfayı yeniden üretir; yazma atomik, paket başına `.kilit` (30 dk sonra devralınır); aynı baytlı dosya tek paket.
- OCR sırası: metin katmanı → paylaşımlı OCR önbelleği (yalnız okunur) → paket içi satır konumlu yerel OCR; OCR denklem sembolünde güvenilmez (`OCR_MATH_UNRELIABLE`); belirsiz formül/şekil için kırpım `goster` ile alınıp görev kapsamında incelenir.
- İnsan kararı `veri/content-labels/pdf-kanit-kararlar/<hash>.json`'a yazılır ve sayfanın 72 dpi hash'ine bağlıdır (değişirse `STALE_RENDER_HASH`); yalnız `OUT_OF_SCOPE`, `TRULY_BLANK`, `COMPLETE`. Sınırlar: tekrarlayan vektör süsler `repeatedFigures` ile işaretlenir; çizgisiz tablo aranmaz; soru kabulü `pdf_question_accept.py`, konu bazlı kaynak paketi TAS-08'dir; konu eşlemesi yalnız otomatik adaydır.
- Pilot: `pilot --yaz` (matematik, 10 kaynak/52 sayfa, `scripts/pdf_kanit_pilot.py` `SPEC`) iki geçişte aşama yeniden üretmediğini ölçer; rapor `veri/pdf-kanit/pilot-matematik/rapor.json`; uzman doğruluğu kanıtlamaz.

## TYT/AYT PDF kapsamını uzlaştırma

Yalnız `Kaynaklar/ogm-materyal`, `yks-cikmis-sorular`, `mufredat` YKS PDF'leri okunur (KPSS ve öğrenci geçmişi kapsam dışı); kaynak hash'i/çıkarıcı sürümü değişmedikçe önbellek kullanılır.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_scan.py --workers 4
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-inventory.py
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_reconcile.py [--publish | --reuse --publish]
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_source_ocr.py --workers 4
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_duplicates.py --publish
..\.venv\Scripts\python.exe -X utf8 scripts/question_image_ocr.py --workers 4 --publish
..\.venv\Scripts\python.exe -X utf8 scripts/pdf_question_discovery.py
```

Sonuçlar `veri/pdf-source-registry/` (`report.json` tekil soru koduyla sayar; PDF satır toplamı aynı soruyu tekrar sayabilir; `discovery.json` hesaplanmamış soru bölgeleri). Keşif, OCR, TF-IDF veya görsel benzerlik tek başına banka aktarımı değildir. V85–V88 Flyway uygulanmış olmalı; yayın `questions`, cevaplar, öğretmen kararları ve öğrenci tablolarını değiştirmez; anlatım+soru birlikte bulunan PDF `KARMA` olur (yeni katalog sürümü, öğretmen kararı korunur); NUL içeren metin base64 korunur.

- **Görselde kalan içerik:** dolu metin katmanı tüm yazının okunduğunu göstermez (özet soru panelleri, sunu gövdeleri bitmap). `pdf_summary_ocr.py --workers 4` (özetler 300 dpi; `--include-slides` ile `OMP_THREAD_LIMIT=1`, 144 dpi); okunan değer aktarım veya onay değildir. `pdf_page_dispositions.py` cevap anahtarı ayraçlarını ve kullanılmamış kareli not sayfalarını hash'e bağlar (yalnız okunabilirlik engelini kaldırır).
- **Sağlayıcı PDF'sindeki görsel soru:** `providerPrintCheck.textReviewNumbers` metni eksik soruları da içerir (sıfır metin boş soru değildir). `pdf_provider_content_review.py --preview` tam PDF kırpımını banka görseli, basılı numara ve PDF/API/banka cevabıyla doğrular; karar iki görselin, kaynak sayfanın ve banka damgasının hash'ine bağlıdır; `PDF_STEM_TRUNCATED` özgün PDF eksik harfini `sourceContentIssues`'a yazar (banka görseli tamsa karantina yok). `pdf_document_content_review.py --publish` yalnız tüm sayfaları için açık içerik notu yazılmış, hash'i değişmemiş belgeyi "soru içermiyor" kapatır; dosya adı, sıfır banka kaydı veya OCR'da seçenek yokluğu bunu üretemez. `--quarantine-confirmed-empty` banka görseli, PDF konumu ve sağlayıcı HTML'i birlikte boş olan kaydı seçimden çıkarır (`question_source_issues`; soru/geçmiş silinmez, PDF tam sayılmaz). Küçük dolu görseller `pdf_small_question_ocr.py` ile yalnız OCR için büyütülür.
- **Slayt ve ham karşılaştırma:** `pdf_slide_questions.py` aynı soru metnini taşıyan soru/cevap slaytlarını eşler (vektör rengi ve kırmızı pikseller aynı tek seçeneği göstermeli; yalnız cevapsız sayfa kırpılır); `pdf_slide_compare.py`, `pdf_slide_link_review.py`, `pdf_raw_compare.py`, `pdf_raw_content_review.py` aday köklerini, beş seçeneği ve cevabı iki metin/iki görsel/paket hash'ine bağlayarak karşılaştırır (benzer konu veya yüksek model güveni bağ kurmaz; U+00AD satır bölme işareti dışında sözcük birleştirilmez; görsel/altı çizili sözcük gerektiren soru metin kapısından geçmez); `pdf_slide_review_proposals.py` yerel Ollama önerisidir. Bu komutlar banka sorusu oluşturmaz; bağlar `pdf_source_reconcile.py --publish` ile DB'ye alınır.
- **İncelenmiş kabul:** `pdf_source_backup.py` → `pdf_mini_review.py` → `pdf_question_accept.py` (varsayılan salt okunur hazırlık; `--publish --backup <dump>` tek işlemde kaydeder; kaynak hash'i, tüm çapalar/sayfalar, iki cevap okuması, tüm banka karşılaştırması, görsel hash'i ve v2 etiket doğrulaması birlikte geçmeli; yeniden çalıştırma yeni soru oluşturmaz; yeni soruda `categoryIds`, `subjectIds`, `examIds` ve DB ilişki dizileri dolu olmalı). Ders sunusu: `pdf_slide_source_review.py` → `pdf_slide_accept.py [--publish --backup <dump>]` (doğru sınav, ders ve Excel ilk sayfası konu/ünite birlikte kesinleşmeden kabul yok; kabul dosyası genişlerse önceki kararlar aynı kalır; anahtar düzeltmesi özgün harfi saklar, mevcut banka cevabını sessizce değiştirmez; eski YGS/LYS/ÖSS/ÖYS örnekleri YKS kapsamındadır, MSÜ/KPSS dışarıda). Mini Deneme 04 için `pdf_candidate_labels.py` Ollama önerisi doğruluk değildir.
- Doğrulama: `testler/pdf-source-registry-test.py`, `node testler/resource-intake.mjs`, `python scripts/ivme.py test PdfSourceRegistryTest`, `python scripts/ivme.py ui pdf-bank-audit-ui`. Envanter tablosunda **Bankada kayıtlı soru**, **Kontrol bekleyen kayıt** (kesin eksik sayısı değil) ve **Aktarım durumu** ayrı sütundur; "Belge: N sayfa" fiziksel boyuttur; Dosya durumu ayrı sütundur; planlanan çıkarım tamamlanma sonucu değildir.

## YKS kaynak birleştirme (kapalı)

15. adım (YKS-00–13) **BITTI**: seçili doğrulanabilir kapsamda yeni soru kabulü yoktur (NEW0); `EXCLUDE_NO_RETRY` politikası `scripts/yks-secim-politikasi.json`'dadır (kaynak onarma, eksik anahtar/şekil arama, tekrar OCR/model yapılmaz; dışlananlar yayına girmez; `selected-yks08-comparison/` dışlamaları `selected-yks07-acceptance/` girdisinden üstündür). YKS-11 etiketi ve geri dönüş yedeği, YKS-12 boş INSERT_ONLY kararı, YKS-13 konum doğrulaması kayıtlıdır; öğrenci/soru/geçmiş parmak izi değişmedi. `python scripts/ivme.py yks durum|plan` kapalı hattın kaydını okur; yeniden çalıştırılmaz. 100 bin yeni soru istenirse dışlananları açmadan ayrı kaynak edinimi projesi tanımlanır. Hazırlık arşivi 55432'deki mevcut pipeline instance'ındadır; kapalıysa yalnız `setup_database.start_instance()` çağrılır (`bootstrap`/`repair_bootstrap`/`initdb` çalıştırılmaz).

## Yerel model (Ollama)

```powershell
python scripts/ivme.py ollama durum
python scripts/ivme.py ollama gorsel <png> "<istem>" --json
python scripts/ivme.py ollama toplu girdi.jsonl --sablon sablon.txt --sema sema.json --cikti cikti.jsonl
```

Varsayılan `qwen3.5:9b` (`OLLAMA_MODEL` ile değişir; sunucu kapalıysa `ollama serve` başlatılır); `toplu` her satırı şablondan doldurur, JSON Schema'ya uygun yanıt ister, her isteği `veri/ollama-onbellek/`'te saklar. Sonuç **adaydır**: konu adayları kayıtlı kategori kimliklerinden seçtirilir (yeni konu adı üretilmez); düşük güven veya kural çelişkisi insan/Claude/Codex incelemesine ayrılır; öğretmen onayı veya kesin etiket olarak yazılmaz. pgvector ve embedding altyapısı [çalıştırma tarifindedir](calistirma-ve-yayin.md#pgvector-postgresql-18-yalnız-localhost5432ivme).
