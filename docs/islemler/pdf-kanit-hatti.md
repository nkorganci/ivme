# PDF kanıt paketi (TAS-07)

Bir PDF'i sayfa/blok/şekil düzeyinde **izlenebilir, sürümlü ve yeniden işlenmeyen** kanıta çevirir. Özgün PDF yalnız okunur. Model çağrılmaz; OCR yalnız metin katmanı olmayan sayfada ve istenirse çalışır. Soru çıkarımı ve banka uzlaştırması ayrı hattır ([pdf-ve-yerel-model](pdf-ve-yerel-model.md), [pdf-kapsam-uzlastirma](pdf-kapsam-uzlastirma.md)); bu paket onları değiştirmez, aynı kaynak hash'ini ve OCR önbelleğini kullanır.

```powershell
python scripts/ivme.py pdf kanit olustur "<pdf|yol|hash>" [--sayfa 3-5] [--ocr] [--ocr-konum]
python scripts/ivme.py pdf kanit toplu --klasor ogm-materyal/Matematik [--ilk N] [--workers 2]
python scripts/ivme.py pdf kanit dogrula <pdf|hash>      # bütünlük: hash, bbox, kırpım dosyası, yarım dosya
python scripts/ivme.py pdf kanit goster <pdf|hash> --sayfa 12   # tek sayfanın birleşik görünümü
python scripts/ivme.py pdf kanit ozet <pdf|hash>
python scripts/ivme.py pdf kanit karar <pdf|hash> --sayfa 3 --durum OUT_OF_SCOPE --inceleyen <ad> --not "<gerekçe>"
python scripts/ivme.py pdf kanit pilot [--yaz]           # matematik pilotu (seçim scripts/pdf_kanit_pilot.py)
python -X utf8 testler/pdf-kanit-test.py                 # sentetik PDF'lerle birim testleri
```

Çıktı `veri/pdf-kanit/<hash[:2]>/<hash>/` altındadır (Git dışı, silinirse aynı komutla yeniden üretilir): `kaynak.json` (kimlik, sayfa sayısı, otomatik konu **adayları**), `sayfalar/NNNN.json`, `gorseller/<sha16>.png`, `ozet.json`, `calisma.json`. Ajan bütün PDF'i değil, `goster` ile gereken sayfayı ve kırpımı okur.

## Sayfa kaydı

| Alan | İçerik |
|---|---|
| Kimlik | `pageIndex` fiziksel sayfa (1 tabanlı), `printedLabel` PDF'deki basılı sayfa etiketi (yoksa `null`); ikisi ayrıdır |
| Koordinat | `pt`, sol üst başlangıç, y aşağı, **sayfa dönüşü uygulanmış** görüntü uzayı; kırpım aynı uzayda alınır. PyMuPDF metin/çizim/görsel konumunu dönmemiş uzayda verir, kayıt öncesi dönüştürülür |
| Blok | kararlı `id` (kaynak+sayfa+konum+metin hash'i), `kind` (`TEXT`/`EQUATION`), `role` (`body`/`heading`/`caption`/`figureLabel`), `order` (okuma sırası; iki sütunda sol sonra sağ), `bbox`, metin ve hash, `source` (`TEXT_LAYER`/`OCR`) |
| Denklem | `containsMath`, `mathScore`, `mathRisks` (`MINUS_VARIANTS`, `PRIVATE_USE_GLYPH`, `REPLACEMENT_OR_CID_GLYPH`, `SUPERSCRIPT_SPANS`, `STACKED_SHORT_LINES`, `OCR_MATH_UNRELIABLE`), `verification.state = UNVERIFIED` |
| Tablo | `bbox`, satır/sütun, başlık, hücre metni, hücre hash'i; yalnız çizgili tablo aranır |
| Şekil | `bbox`, kaynak (`raster`/`vector`/`ink`), özgün gömülü görselin SHA-256'sı, yakın kısa etiketler, başlık (`Şekil/Resim/Grafik/Tablo/Figure N`), **alt metin adayı** (`CANDIDATE_UNREVIEWED`), kırpım dosyası + hash + piksel boyutu + dpi |
| Sayfa görüntüsü | 72 dpi gri görüntü hash'i ve mürekkep oranı; boş sayfa ve insan kararı bu hash'e bağlanır |
| OCR | önbellek başvurusu (`reference`) ve/veya satır konumlu `lines` |
| `disposition` | `overall`, ayrı üç ölçü (`text`, `figures`, `equations`), `questions = NOT_ASSESSED`, `reasons`, `notes` |

**Tamlık ölçüleri ayrıdır.** `text` = çıkarılabilen metin alındı mı; `figures` = bulunan her şeklin kırpımı var mı; `equations` = en az bir denklem adayı **hiçbir zaman makine tarafından doğrulanmış** olmaz (`UNVERIFIED`); soruların kabulü bu paketin konusu değildir. `overall`: `COMPLETE` (metin ve şekil çıkarımı tamam; denklem doğrulaması ayrı), `PROBLEM` (`OCR_PENDING`, `OCR_UNREADABLE`, `TEXT_LAYER_UNRELIABLE`, `FIGURE_CROP_MISSING`), `TRULY_BLANK` (metin yok **ve** görüntü boş; render hash'iyle belgeli), `OUT_OF_SCOPE` (yalnız insan kararı). Metinsiz sayfa otomatik boş sayılmaz; görüntüsünde mürekkep varsa OCR bekler. 1–24 karakterli kısa metin sayfası (ayraç, başlık), OCR de başka metin bulamadıysa `SHORT_TEXT_PAGE` notuyla tamam sayılır.

`notes` bilgi içindir, sorun değildir: `RASTER_CONTENT_TEXT_NOT_READ` sayfada büyük bir gömülü görsel var ve içindeki yazı OCR ile okunmadı (kırpım korunur); `TABLE_DETECTION_ERROR`.

## Aşamalar ve yeniden işlememe

Her aşamanın kimliği `kaynak hash'i + sayfa + çıkarıcı sürümü + parametre hash'i` (+ bir önceki aşamanın çıktı hash'i). Anahtar ve çıktı hash'i eşleşiyorsa aşama okunur ve **tekrar hesaplanmaz**; eşleşmiyorsa yalnız o aşama (ve ona bağlı olanlar) yenilenir.

| Aşama | Girdi anahtarı | Parametre/sürüm değişince |
|---|---|---|
| `layout` | PDF baytları, sayfa, `LAYOUT_VERSION`, PyMuPDF sürümü, `LAYOUT_PARAMS`, belge düzeyi tekrarlayan görsel (logo/filigran) kümesi | blok, tablo, şekil bölgeleri yenilenir; kırpımlar bağlı olduğundan yeniden alınır |
| `crops` | layout (+ OCR) çıktı hash'i, `CROP_VERSION`, `CROP_PARAMS` (dpi, kenar payı) | yalnız PNG'ler; `layout` yeniden çalışmaz |
| `ocr` | kaynak, sayfa, `OCR_VERSION`, parametreler, `tur.traineddata` hash'i | yalnız satır konumlu OCR |

Katalog adı, ders/konu eşlemesi veya sonradan eklenen istem bu anahtarlarda yoktur: değişmeleri PDF'i yeniden render etmez. Paket tamamsa ve sürümler/kararlar değişmediyse `olustur` sayfalara hiç girmez (`skippedPack`). `calisma.json` ve komut çıktısı `layoutBuilt/Reused`, `cropsBuilt/Reused`, `ocrBuilt/Reused`, `repaired`, `modelCalls`, `externalCalls` sayar. Sayfa dosyası yarım/bozuksa eksik sayılır ve yalnız o sayfa yeniden üretilir; her yazma atomiktir (`.tmp` → değiştir), paket başına süreç kilidi vardır (`.kilit`; 30 dakika dokunulmazsa devralınır). Aynı baytlı dosya farklı klasörde olsa tek pakettir.

## OCR sırası

Metin katmanı → mevcut paylaşımlı OCR önbelleği ([pdf_ocr_cache](pdf-kapsam-uzlastirma.md); yeni OCR yazılmaz, yalnız okunur) → paket içi satır konumlu yerel OCR (`--ocr` önbellek yoksa, `--ocr-konum` zorla). Satır konumlu OCR çıktısı denklem sembollerinde güvenilir değildir (`OCR_MATH_UNRELIABLE`); taranmış sayfada şekil bölgesi OCR metni örtüldükten sonra kalan mürekkep bileşeninden bulunur. Güçlü model çağrısı bu hatta yoktur: belirsiz formül/şekil için kırpım `goster` ile alınıp ilgili görev kapsamında incelenir.

## İnsan kararı ve yedek

Yeniden üretilebilir paket ile **yeniden üretilemeyen karar** ayrıdır. `karar` komutu kararı `veri/content-labels/pdf-kanit-kararlar/<hash>.json` içine yazar (mevcut yedek betiği `content-labels` dizinini kapsar). Karar, sayfanın 72 dpi görüntü hash'ine bağlıdır; sayfa değişirse karar uygulanmaz (`STALE_RENDER_HASH`). `karar` yalnız `OUT_OF_SCOPE`, `TRULY_BLANK`, `COMPLETE` yazar; denklem doğrulaması karar olarak yazılamaz.

## Sınırlar

- Tekrarlayan görsel (logo/banner) hesaplamada ayrılır; tekrarlayan vektör süsler `ozet.json` → `repeatedFigures` ile **işaretlenir**, silinmez.
- Çizgisiz (hizalamayla kurulmuş) tablo aranmaz; hücre içeriği blok metninde kalır.
- Matematik soruları ve çözümü bu paketin dışındadır: soru kabulü `pdf_question_accept.py`, konu bazlı kaynak paketi TAS-08'dir. Konu eşlemesi yalnız `kaynak.json` içindeki otomatik adaydır, öğretmen onayı değildir.
- Metin katmanı, şekil ve denklem sembolü doğruluğu **kaynak/hesapla bağımsız denetlenmeden** doğru sayılmaz; `UNVERIFIED` kaydı bunu görünür tutar.

## Pilot

`pilot --yaz` matematik kaynaklarından sabit bir örneklemi (dijital metin, iki sütun, çizgili tablo, grafik, yoğun denklem, taranmış sayfa) iki kez işler; ikinci geçişte OCR çalıştırılamaz hale getirilir. Rapor `veri/pdf-kanit/pilot-matematik/rapor.json`: kaynak/sayfa sayısı, kategori başına sayfa ve örnek kimlikleri, aşama sayaçları, paket doğrulaması ve kabul ölçütleri. Pilot başka bir ders için çoğaltılırken yeni şekil/terim türleri ayrıca örneklenir; örneklem `scripts/pdf_kanit_pilot.py` içindeki `SPEC` listesidir.

Matematik pilotunun sabit örneklemi **10 kaynak / 52 sayfa**: dijital metin 44, iki sütun 16, çizgili tablo 1, şekil/grafik 48, yoğun denklem 9, metin katmanı olmayan OCR sayfası 3 (kategoriler örtüşebilir). İlk geçişte 52 düzen, 4 kırpım ve 3 OCR aşaması üretildi; kalan aşamalar mevcut sürümlü çıktılardan kullanıldı. İkinci geçişte düzen/kırpım/OCR üretimi 0, model ve dış çağrı 0; 10 paketin bütünlük denetimi geçti. Bu sayılar çıkarımın izlenebilirliğini ölçer; denklem sembollerinin, şekil yorumunun ve konu eşlemesinin uzman doğruluğunu kanıtlamaz. `kanit-layout-v2` görünür sayfa dışına taşan metin kutularını kırpar ve üst üste binen aynı kimlikli öğeleri ayırır. Eski paketlerin yalnız etkilenen sayfaları yeniden işlenebilir; yeni sürümdeki hızlı atlama önce paket bütünlüğünü denetler. Aynı baytlı kaynak başka arşiv yolunda görülürse yeni yol mevcut paketin `kaynak.json` kaydına eklenir.
