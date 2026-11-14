# MEBİ kaynakları: kalıcı kayıt ve kapanış

**BITTI.** Yeni soru arama, çıkarım, OCR/model veya aktarım yapılmaz.
Kullanıcının mevcut sorularla devam etme kararı eski tam arşiv talimatını iptal
etti. `scripts/mebi-pratik2-lifecycle.json` kapalıdır; eski yazıcı/gözetmen ve
plan üreticileri yeniden çalıştırılamaz. Plan ve aktif paket panosu kaldırıldı.

## Ana soru bankası

11.026 mevcut soru V102 ile aynı kimlik/kod, cevap, görsel, zaman damgası,
kaynak bağlantısı ve ders–ünite–konu ilişkisiyle OGM ana bankasına taşındı.
Soru ekleme/silme ve öğrenci geçmişi yazımı yoktur. Pratik2 menüsü ve ikinci
banka seçeneği kaldırıldı; ana soru/pratik ekranının formatı korunur.
`/pratik-2` sorgu/hash'iyle `/soru-bankasi`na yönlenir; eski banka ve kaynak
belirteçleri uyumludur. Eski katalog sürümleri ve inceleme kayıtları korunur.

Kalıcı transfer günlüğü `learning_catalog.question_bank_transfers` tablosunda,
kabul/yedekler `veri/mebi-pratik-2/main-bank-transfer/` altındadır.
`acceptance.json`:bütün soru içeriği, ilişkiler ve24 korunacak tablo hash PASS.
`live-acceptance.json`:masaüstü/mobil,23 sınav–ders örneği ve kaynak görseli,
eski rota/filtre ve tek banka seçeneği PASS.3 geçici-DB testi de geçti.
Yedekler `before-transfer.dump` (uygulama tabloları) ve
`current-catalog.jsonl.gz` (gzip içinde PostgreSQL COPY TEXT/JSONB satırları).
Eski kataloglar yerinde saklanır; `.partial-preserved` yarım yedektir.

## PDF kimliği ve kaynak kategorileri

`veri/mebi-pratik-2/pdf-closeout/manifest.json`:1.573 PDF yolu/1.473 tekil
SHA-256; bütün yolların dosya hash'i, boyutu ve fiziksel sayfa sayısı doğrulandı.
Dosya türü ve kaynak klasör hiyerarşileri kayıtlıdır.449 yolun mevcut ana konu
kimliği canlı katalogda doğrulandı. Diğer1.124 yolda kaynak kategorisi korunur;
karma kitap veya kesin tek konu bağı olmayan PDF'ye dar konu uydurulmaz.
Bu durumlar kapalı metadata kaydıdır; soru bulma/etiketleme görevi oluşturmaz.
Kaynak kategori adları ve ana tablonun ders–ünite–konu adları ayrı tutulur.
Ana konu bağı öğretmen onayı değildir; mevcut soruların etiketleri değiştirilmedi.

Bu manifest `learning_catalog.source_audits` tablosunda, mevcut katalog sürümünün
`inventory_audit.mebiPdfCloseout` alanına kaydedildi. Manifest SHA-256'sı,
özgün envanter/klasör dizini hash'leri, bütün dosya yolları ve doğrulama sonucu
birlikte saklanır. Önceki denetim alanları korunur; öğrenci kataloğu/yayını değişmez.
Kabul: `veri/mebi-pratik-2/pdf-closeout/acceptance.json`. Aynı sürümlü kayıt için
`python scripts/mebi_pratik2_pdf_kapanis.py` mevcut DB makbuzunu yeniden kullanır;
soru keşfi, OCR, model, kırpım veya soru/öğrenci yazımı yapmaz.

## Korunan kaynak ve inceleme kanıtları

`veri/mebi-pratik-2/20261111-source-inventory/` altında:

- `inventory.json`, `final-source-integrity.json`:özgün kaynak kimlikleri.
- `pdf-reuse-check/decisions.json`:önceden kullanılan62 PDF için belge kararı;
  soru bazında banka karşılaştırması yapılmaz.
- `source-folder-labels/index.json` ve `history/`:kaynak hiyerarşisi/ana kategori kanıtı.
- `verified-source-batch-*/`:tamamlanan soru kabulü ve özgün bağlantılar.
- `teacher-review-export/current/`:7.343 yayınlanmamış aday ve gerekçeleri;
  kaynak arşivi korunur, yeni soru alımı başlatılmaz.

Özgün `D:\workspace\mebi-yks` ve mevcut PNG/PDF/kaynak bağlantıları silinmez,
taşınmaz veya yeniden üretilmez. Tam arşivdeki her sorunun çıkarıldığı iddia
edilmez; kullanıcı kalan çıkarımı iptal etmiştir. Bu kapanıştan açık iş kalmadı.
