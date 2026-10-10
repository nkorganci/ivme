# 13.01 — Kaynaklı iç not kayıt biçimi

**Durum:** BITTI (sözleşme ve katalog örneği) · **Tarih:** 2026-10-09

İç notun v1 JSON sözleşmesi [şemada](sema/ic-not-v1.schema.json), mevcut katalog 1099'a dayanan ve metin uydurmayan [örnek kayıtta](sema/ic-not-v1.ornek.json) bulunur. Bu adım not çıkarımı ya da öğrenciye metin yayınlama değildir. Öğrenci 13.05'teki yetkili API'den özgün PDF'yi görmeye devam eder; iç kayıtlar `/api/topic-pdfs` yanıtlarına eklenmez.

## Alanlar ve iz sürme

| Alan | Kural |
|---|---|
| `source.catalog_id`, `source.source_code`, `source.pdf_sha256` | 13.04 katalog girdisindeki değerlerle birebir eşleşir. Yalnız `available` ve SHA-256 doğrulanmış PDF işlenir; yol öğrenciye veya iç not kaydına kopyalanmaz. |
| `pages.start/end` | PDF'nin fiziksel, **1 tabanlı** sayfa numarasıdır. `1 ≤ start ≤ end ≤ page_count`; basılı sayfa etiketi değildir. Parça başlık ve sayfa sınırını aşarsa bölünür. |
| `heading_path` | PDF'de görülen üst başlıktan alt başlığa sıralı dizidir; tahmin edilmiş başlık gerçek başlık diye yazılmaz. |
| `topic.code/status` | Taksonomi kodu yoksa `null/unverified`. Katalogdaki `candidate_title_match` ancak `candidate` olur; onaylı soru/PDF bağı yerine geçmez. `verified` için ayrıca insanın sayfa/konu kanıtı gerekir. |
| `content.text/method/elements` | Henüz çıkarılmadıysa `null/pending/[]`. Sonraki pilot `pdf_text`, `ocr` veya `manual` seçer. Formül, şekil ve tablo ayrı `elements` referansıyla ve sayfayla korunur; belirsiz görsel düz metne uydurulmaz. |
| `review.status/version` | İlk kayıt `draft/1`. Metin düzeltmesi veya insan onayı sürümü artırır; `approved` dışında kalan parça öğrenci ipucuna kaynak olamaz. Kaynak PDF değişirse yeni checksum ve yeni not kimliği gerekir. |

`note_id`, NFC normalleştirilmiş `catalog_id|pdf_sha256|start|end|heading_path` dizgesinin UTF-8 SHA-256 özetinin ilk 32 küçük harfli hex karakteriyle `ogm-note:` öneki kullanılarak hesaplanır. Başlık zinciri `/` ile birleştirilir; örnek `1099|f316…dbf4|1|1|NOKTALAMA İŞARETLERİ` kaydını gösterir. Aynı kaynak ve bölüm tekrar işlendiğinde kimlik değişmez. `review.version` kimlik girdisi değildir. Şema yapıyı doğrular; katalog eşleşmesi, sayfa üst sınırı, bölüm kimliği ve onay kanıtı iş hattında ayrıca doğrulanır.

## Sonraki işin sınırı

13.02 az sayıdaki PDF üzerinde gerçek metin katmanı/OCR, formül ve tablo kalitesini ölçüp bu sözleşmeye kayıt üretecek. 13.03 kaynaklı pasaj araması ve doğru PDF sayfasına dönüşü denetleyecek. İç not deposu veya öğrenciye metin sayfası bu adımda açılmadı.

**Kontrol:** Şema ve örnek JSON ayrıştırıldı; örnekteki katalog id, kaynak kodu, PDF özeti ve sayfa üst sınırı yerel 13.04 girdisiyle karşılaştırıldı. Öğrenci PDF arayüzünde değişiklik yoktur.
