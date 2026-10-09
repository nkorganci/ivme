# 12.02 — Soru kaynak ve kanıt sözleşmesi (v1)

**Durum:** BITTI · **Girdi:** [12.01 envanteri](21_12_01_PDF_PNG_ENVANTERI.md) · **Sonraki uygulama:** 12.03 pilotu. Bu belge mevcut CSV/DB alanlarının üstüne kurulacak iç üretim kaydını tanımlar; bugün öğrenci API'sine yeni alan açmaz.

## Kimlik ve kaynak

Bir kayıt **tek uygulama sorusunu** temsil eder. `question_code`, mevcut `questions.code` ve QR adresiyle aynı, değişmez kimliktir. Aynı sorunun yeni kırpımı veya düzeltilen cevabı bu kimliği değiştirmez; `record_version` artar. Kaynak kitabın/PDF'nin kimliği soru kimliğinden ayrıdır. Aynı sorunun iki kitapta baskısı varsa `anchors` içinde ayrı kanıt bulunur; yalnız benzer metin otomatik tekilleştirme kararı vermez.

| Alan | Tür / kural |
|---|---|
| `schema_version` | Sabit `1`. Tanınmayan sürüm reddedilir. |
| `question_code`, `record_version` | Boş olmayan kalıcı kod; 1'den başlayan tam sayı. Aynı kod+sürüm tekrar işlendiğinde aynı kayıt/çıktı üretilir. |
| `sources[]` | En az bir kaynak nesnesi: sabit `id`, `kind`, `relative_path`, `sha256`, `size_bytes`. Görünen kitap/ders adı kimlik olarak kullanılmaz. Örnek id: `ogmck:TYT`, `ogm:dd-ayt-matematik-145`. Aynı soru iki baskıdaysa ikisi de ayrı kaynak nesnesidir. |
| `sources[].kind` | `original_pdf`, `generated_pdf` veya `html_snapshot`. Soru Bankası HTML'den üretilen PDF, özgün indirilmiş PDF gibi gösterilmez; onun HTML anlık görüntüsü ayrıca kaynak olur. |
| `sources[].relative_path` | İzinli kaynak köküne göre `/` ayraçlı göreli yol; mutlak yol, `..`, bağlantıyla kök dışına çıkış reddedilir. Öğrenci yanıtına konmaz. |
| `sources[].sha256`, `sources[].size_bytes` | Kaynak dosyanın ham baytları üzerinden küçük harfli 64 haneli SHA-256 ve pozitif boyut. Kaynak değişirse yeni sürüm/inceleme gerekir. |
| `anchors[]` | En az bir kaynak konumu. Her öğe `source_id`, `page` (PDF'de 1 tabanlı), `rect_pt` (`[x0,y0,x1,y1]`, PDF noktası, sayfanın kendi koordinatları), `role` (`question`, `shared_stem`, `answer_key`, `solution`) taşır. HTML'de sayfa/kırpım `null`, bunun yerine sabit `element_id` kullanılır. Çok sayfalı/ortak parça ayrı anchor olur. |

## Soru, görsel ve cevap

| Alan | Tür / kural |
|---|---|
| `image` | `relative_path`, `sha256`, `width_px`, `height_px`, `render_version`. WebP/PNG üretilen görselin **kendi** SHA-256'sı kaynak PDF checksum'ından ayrıdır. Kırpım değişirse checksum ve render sürümü değişir. |
| `stem` | `raw_text`, `normalized_text`, `method` (`pdf_text`, `ocr`, `html`, `manual`), `confidence` (0–1 veya `null`). Formül/şekil bilgisi kayboluyorsa yalnız metin yeterli sayılmaz; görsel zorunlu kalır. Okunamayan metin uydurulmaz, `null` kalır. |
| `choices` | A–E anahtarlı nesne; her şık için `raw_text`, `normalized_text` veya `null`. Şık görsel ise metin `null`, görseldeki konum/anchor korunur. Sadece `ABCDE` işaretinin varlığı şık metni sayılmaz. |
| `answer` | `choice` (`A`–`E` veya `null`), `evidence_kind` (`publisher_key`, `printed_solution`, `reviewer` veya `null`), `evidence_anchor` ve `reviewer_id` (gerektiğinde). PDF cevap anahtarındaki satır veya çözümlü sayfa kanıtı kaydedilmeden otomatik onay yoktur. Çelişen kaynaklar `null` cevap ve inceleme nedeni üretir. |
| `review` | `status` (`draft`, `needs_review`, `approved`), `reasons[]`, `reviewed_at`, `reviewer_id`. OCR düşük güveni, eksik şık, çelişen cevap, PDF/görsel uyuşmazlığı ve çoklu cevap açık nedenlerdir. |

`approved` için kaynak dosyası, sayfa/HTML konumu, görsel dosyası ve checksum'ları doğrulanmalı; soru ile A–E şıkları görselde eksiksiz, `answer.choice` tek ve kanıtlı olmalıdır. Çok cevaplı kayıt bugünkü uygulama modeline yayınlanmaz. `needs_review` ve `draft` öğrenci ithalatına gönderilmez. Kaynak soru anahtarı sonradan düzeltilirse yeni sürüm yayınlanır; eski öğrenci `question_attempts.correct_answer` ve sınav sonucu yeniden yazılmaz.

### Sentetik örnek (gerçek soru değildir)

```json
{
  "schema_version": 1,
  "question_code": "ORNEK-1",
  "record_version": 1,
  "sources": [{"id": "pilot:kitap-1", "kind": "original_pdf", "relative_path": "pilot/kitap-1.pdf", "sha256": "<64 haneli gerçek özet>", "size_bytes": 12345}],
  "anchors": [
    {"source_id": "pilot:kitap-1", "page": 3, "rect_pt": [31, 64, 273, 351], "role": "question", "element_id": null},
    {"source_id": "pilot:kitap-1", "page": 8, "rect_pt": [30, 55, 280, 90], "role": "answer_key", "element_id": null}
  ],
  "image": {"relative_path": "pilot/ORNEK-1.webp", "sha256": "<64 haneli gerçek özet>", "width_px": 1200, "height_px": 900, "render_version": 1},
  "stem": {"raw_text": "2 + 2 kaçtır?", "normalized_text": "2 + 2 kaçtır?", "method": "pdf_text", "confidence": null},
  "choices": {"A": {"raw_text": "1", "normalized_text": "1"}, "B": {"raw_text": "2", "normalized_text": "2"}, "C": {"raw_text": "3", "normalized_text": "3"}, "D": {"raw_text": "4", "normalized_text": "4"}, "E": {"raw_text": "5", "normalized_text": "5"}},
  "answer": {"choice": "D", "evidence_kind": "publisher_key", "evidence_anchor": 1, "reviewer_id": null},
  "review": {"status": "draft", "reasons": [], "reviewed_at": null, "reviewer_id": null}
}
```

Örnekteki checksum yer tutucuları yalnız belge gösterimidir; gerçek kayıtta kabul edilmez. `evidence_anchor` 0 tabanlı `anchors` indisidir ve `answer_key`/`solution` rolüne bakmalıdır. `anchors[].source_id`, `sources[].id` içinde bulunmalıdır.

## Bugünkü hatla eşleme ve 12.03 pilot kapısı

| Bugünkü alan | V1 kaydı / eksik |
|---|---|
| `ogm-yks-cikmis/ham/sorular.json`: `kitap`, `sayfa`, `parcalar`, `metin`, `secenekler`, `gorsel` | Kaynak ve soru anchor'ına başlangıç. `parcalar` PDF noktası; 1 tabanlı sayfa. `secenekler` çoğu kayıtta yalnız `ABCDE`, şık metni ayrıca ayrıştırılmalı/gözden geçirilmeli. |
| `ham/sorular_son.json`: `cevaplar`, `cevap_kaynaklari`, `cevap_kanitlari`, `kitaplar` | Tek cevaplı kayıtta cevap ve kanıt başlangıcı. Birden çok kaynak/baskı için her iddia kendi anchor'ına bağlanmalı. |
| `ogm-sorular` ara kayıtları: PDF kimliği/sayfa/parça, `cevaplar`, `cevap_notu`; son karttaki `pd`, `sy`, `cev`, `dg` | Kaynak ailesine göre eşleme; HTML'den üretilen Soru Bankası PDF'sinde HTML anlık görüntüsü kökeni korunmalı. Son kartın yalnız `pd/sy` alanı kırpımın bütün geometrisini kanıtlamaz. |
| `uygulama/veri/*.csv` ve `questions` tablosu: `code`, `source`, `topic`, `image`, `correct_answer` | Öğrenciye dönük izdüşüm. Sayfa, kırpım, metin/şık kanıtı ve SHA-256 yok; dosya adından tahmin edilip doldurulmaz. |

12.03 pilotu her iki hattan en az birkaç farklı ders/kaynak ailesi seçip gerçek checksum, anchor ve cevap kanıtını üretmeli; sentetik örneğin yer tutucularını gerçek veri sanmamalı. Kaynak dosyasının değişmesi, eksik şık/cevap, çoklu cevap, OCR belirsizliği ve örnekte görülen fazla boş kırpım inceleme kuyruğuna girmeli. Bu sözleşme veri tabanı göçü veya toplu import çalıştırmaz; uygulama tarafı ancak pilot kanıtıyla bağlanır.
