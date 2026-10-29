# Kanıt ve onay

[Mimari dizini](README.md) · Ne zaman okunur: Sayfa/zaman aralığı, güven, öğretmen onayı.

## Kanıt, konum, güven ve onay

`Dersler > PDF envanteri` denetimi `scripts/pdf-bank-audit.py` ile üretilir.
İlk aktarımda PDF kimliği mevcut katalogdan, soru kökeni `veri/content-labels/source-inventory.json`
kaydından, bankada bulunma ve kaynak damgası ana `questions` tablosundan gelir.
Soru bağı gösterilen PDF'lerin fiziksel SHA-256'sı doğrulanır.
`pdf-bank-audit.json.gz` ilk aktarım ve geri izleme için sürümlü bir anlık kayıttır.
İlk anlık kaydın satırları `learning_catalog.pdf_audit_rows`, denetim
zamanı ve banka damgası `learning_catalog.pdf_audit_state` içindedir. İlk aktarım
`scripts/pdf-bank-audit-publish.py` ile mevcut anlık kayıttan yapılır; PDF'ler yeniden
okunmaz. Satır güncellemesi aynı katalog kimliğinde DB kaydını değiştirir.
Envanterdeki her PDF satırı görüntüleyicide açılır: konu kataloğunda yoksa `TopicPdfService`
`PdfReviewLabels` kaydından tanımlar. Açılamayan PDF
genel bir hata yerine kendi nedeniyle gösterilir: arşivde, dosya yok (`missing_file`), dosya
değişmiş (`changed_file`), yalnız video (`video_only`) veya envanterde olmayan numara.
Envanter sütunları dar genişliklerle gösterilir; uzun hücreler satır içinde
sarmalanır. Kanıt düğmesi ayrıntıyı tablonun altında açar ve görünür konuma getirir.

V85 sonrasında çalışma kaynağı `learning_catalog.pdf_sources` içindeki tekil
SHA-256 kimliğidir. `pdf_source_files` fiziksel yolları, `pdf_source_catalog`
eski katalog kimliklerini aynı kaynağa bağlar. `pdf_source_pages` her fiziksel
sayfanın metin/çıkarım kanıtını; `pdf_question_occurrences` kaynak konumunu ve
bankadaki soru kodunu saklar. `question_source_registry` yalnız TYT/AYT banka
sorularının kökenini, `question_content_fingerprints` tekrar karşılaştırmasının
kanıtını tutar. Böylece dosya, katalog kaydı, soru konumu ve tekil banka sorusu
ayrı sayılır; aynı dosya tabloda bir satır olur. Eski anlık kaydın toplamı canlı
banka sayısı olarak kullanılmaz. KPSS kayıtları bu denetime katılmaz.

`Bütün sorular alındı: Evet` için kaynak soru dökümü, bağımsız sayfa kontrolü,
bütün konumların banka bağı ve değişmemiş soru damgaları birlikte gerekir.
Aday, belirsiz görsel, okunamayan sayfa veya açıklanmamış çıkarıcı sorunu
varken tamlık verilmez. Arşivde bulunmak tek başına tamlık kanıtı değildir.
Metin/görsel benzerliği yeni soru kabulü veya otomatik birleştirme değildir.
Ders notunda çoktan seçmeli soru kanıtı bulunduğunda içerik biçimi `KARMA`
olur; özgün dosya adı korunur ve envanterde anlatım ile sorular birlikte belirtilir.
[İşlem tarifi](../islemler/pdf-kapsam-uzlastirma.md) tekrar çalıştırma sırasını verir.
Yeni soru veya PDF yayını sonrasında kapsam denetimi gerektiğinde üretici yeniden
çalıştırılıp kayıtlar ayrıca yayımlanır. Bu bağ aynı PDF'deki bütün soruların
çıkarıldığını kanıtlamaz. Çevrim içi OGM Soru Bankası kartlarının belirli okul
PDF'siyle bağı yoksa PDF otomatik olarak eksik veya tamamlanmış sayılmaz.
V75 `learning_catalog.pdf_work_queue` kullanıcının soru çıkarma veya silme
incelemesi seçimini PDF katalog kimliği ve kaynak hash'iyle tutar. Seçim bankaya
soru eklemez, kaynak PDF'yi silmez, yayımlanmış kaynak sürümünü değiştirmez.
Silme/çıkarım ancak ilgili kaynak ve cevap doğrulamasından sonra ayrı kabul
işlemidir.
Mini Deneme Test 04'ün numara konumu diğer testlerden kaydığı için
`scripts/pdf-question-candidates.py` yalnız bu kaynak hash'ini kabul eder,
ortak veri hattı koduna dokunmadan 60 aday WebP/metin/iki cevap okumasını
`veri/content-labels/pdf-extraction/mini-test-04` içinde hazırlar. Paketin ilk
`CANDIDATE_NOT_IN_BANK` işareti çıkarım anını anlatır; güncel banka durumu
`pdf_question_occurrences` kaydındadır. Aday API'si paket/görsel hash'ini
denetler ve her kartın mevcut banka durumu ile karşılık kodunu ekler.
`pdf_question_accept.py` kaynak/kırpım/iki cevap okuması/kontrollü konu ve
güncel tekrar denetimini geçen paketi tek işlemde kabul eder; mevcut soruya
yeni kod vermez. Seçenek permütasyonu mevcut cevabı değiştirmeden korunur.
V88'in `question_source_issues` kaydı, üç ayrı kaynak kontrolünde boş olduğu
doğrulanan gövdeyi pratikten ayırma nedenini tutar. Soru ve geçmişleri silinmez;
ilgili PDF, kaynak onarılmadan tam kabul edilmez.

[Ortak kaynak v2 şeması](../semalar/learning-resource-v2.schema.json) ve
[temsili örnekler](../semalar/learning-resource-v2.ornek.json) veri sözleşmesidir.
Üretim ve yayın kabulü `scripts/learning-resource-contract.mjs` ve
`scripts/learning-resource-check.mjs` ile denetlenir. V38'in ilişki indeksi
korunur; ayrıntılar mevcut `items.data` JSON'undaki ilişkilerdedir.
V42 `current_relation_details` görünümü bunları SQL'e açar.

Bir ilişkide `sourceVersion`, `categoryFingerprint`, aday/kesin kapsam,
gerekçeli `LOW/MEDIUM/HIGH`, kanıt, konum durumu ve ayrı inceleme vardır.
`ITEM_ONLY` eski kaynak düzeyi kanıtıdır; konuya özel `RELATION` kanıtı veya
tam içerik okuması sayılmaz. `NOT_MEASURED` OCR okunabilirliği ölçülmediğini belirtir.
Yüksek güven de öğretmen onayı değildir. Otomatik çıktı öğretmen adı veya onayı üretmez.

PDF fiziksel sayfaları 1 tabanlıdır ve iki uç dahildir. Video başlangıcı dahil,
bitişi hariç saniye aralığı kullanır; süre aşılmaz. Kesintili bölümler ayrı aralıktır.
Konum `MISSING`, `NOT_APPLICABLE`, `ESTIMATED` veya `VERIFIED` olur ve neden taşır.
Sabit soru kodunun veya not bölümünün doğrulanması destek PDF'sinin doğrulandığı
anlamına gelmez. Notun destek sayfaları, notun kendi bölümü ve asıl örnek sorunun
kaynağı ayrı tutulur. İçindekiler sayfası anlatım sayfası sayılmaz; bir başlık
sayfası bulunması bütün PDF'nin konu aralığının tamamlandığı anlamına gelmez.

`system.kapsam-incelemesi` başarı hesabına girmez. Ders biliniyor, dar konu
bilinmiyorsa genel kapsam düşük güven ve nedenle korunur. Sayfa/dakika veya
kanıtsız zorluk uydurulmaz; zorluk `BELIRLENMEDI` kalabilir.
