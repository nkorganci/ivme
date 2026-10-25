# İçerik üretimi

[Mimari dizini](README.md) · Ne zaman okunur: Derleme, izleyici, yeniden başlatma, yedek.

## Üretim ve yeniden başlama

`scripts/content-label-refresh.py` kaynak envanteri, sözlük projeksiyonu,
PDF çıkarımı, etiket üretimi, denetim ve isteğe bağlı yayını sırayla çalıştırır.

| Seçenek | Gerçek davranış |
|---|---|
| `--dry-run` | Komut planını yazdırır; üretim, OCR veya DB yayını yapmaz |
| `--check` | Mevcut yerel çıktıların güncel girdilerle tutarlılığını kontrol eder; yeniden OCR/üretim/yayın yapmaz; denetim raporu yazabilir |
| `--resume` | Girdi imzası ve çıktı hash'i aynı olan tamamlanmış aşamaları yeniden kullanır; DB envanteri ve son denetimler tekrar kontrol edilir |
| `--limit N` | Yeni PDF metin çıkarımını fiziksel kaynak sayısıyla sınırlar; diğer kaynakları envanterden düşürmez; yayınla birleşmez |
| `--ocr-pages N` | İlk sayfa taramasından sonra en fazla N yeni sayfada yerel OCR yapar ve başlıkları yeniden eşler; `--check` veya `--publish` ile birleşmez |
| `--publish` | Bütün üretim/denetimlerden sonra etiket sürümünü atomik yayımlar; uygulama dağıtımı veya Git push değildir |
| `--database` | Yayın hedefini seçer: `ivme` veya `ivme_test`; üretim girdisinin hangi kaynaklardan toplandığını değiştirmez |

`veri/content-labels/workflow.json` devam kaydıdır. Bir aşama başarısızsa sonraki
aşamalara geçilmez. `--resume` çıktısı dışarıdan değiştirilmiş veya girdisi değişmiş
aşamayı geçerli saymaz. Etiket hatası önceki yayımlanmış sürümü silmez.

`content-label-preview.py` aday sürümü yayımlanmış kayıtlarla salt okunur
karşılaştırır; eklenen/silinen/değişen kimlikleri ve değişen alanların sayılarını
`previews/` altına yazar. Kaynak ve ilişki sürümü değişebilir; soru/cevap veya
öğrenci geçmişi yazılmaz. Önizleme kendi başına yayın veya içerik doğruluk onayı
değildir. Gerçek öğretmen kararlarının yeniden kullanılabilirliğini API'nin
kaynak ve kategori anlık kaydı denetimi belirler.

PDF sayfa çıkarımı `scripts/pdf-topic-locations.py` ile yapılır.
`pdf-page-cache/<hash>-<extractorVersion>.json` kaynak çıkarımını saklar;
sözlük/alias değişimi PDF'yi tekrar OCR yapmak yerine mevcut sayfaları yeniden eşler.
Başlık sayfaları `HEADING_ANCHORS_ONLY` ve tahmini konum olarak sunulur.
`pagesNeedingOcr` işlenmemiş sayfaları görünür tutar. Önbellek varlığı tam içerik
incelemesi değildir. Çıkarım yöntemi değişirse çıkarım sürümü değiştirilir.

`pdf-page-ocr.py --limit N --workers 2` yalnız yetersiz metin katmanlı sayfalarda
yerel Türkçe OCR çalıştırır; `--check` önbelleği inceler. Limit verilmezse kalan
sayfalar işlenir. Başarılı her sayfa hemen kaydedilir; kesintiden sonra yeniden
çalıştırma bunları atlar. `pdf_ocr_cache.py` anahtarı PDF hash'i + fiziksel sayfa +
çıkarıcı sürümü + OCR model hash'idir; sözlük değişikliği yeniden OCR gerektirmez.
`pdf-topic-locations.py` bu metni tekrar eşler; OCR başlığını yalnız tahmini
sayfa dayanağı sayar. İşlenmemiş sayfa ile OCR sonrası okunamayan/boş sayfa ayrı
sayılır. OCR formülün, şeklin veya tam konu aralığının doğrulanması değildir.

Video envanteri `scripts/video-source-inventory.py` ile hem müfredattaki hem OGM
kataloğundaki referanslardan üretilir. `video-cache/` sağlayıcı kimliğine göre
genel erişim metadatasını saklar. Aynı video için konu bazında ikinci ağ isteği
gerekmez. Oynatma listesi tek video gibi değerlendirilmez ve tek süre verilmez.
Sağlayıcıdan gelen HTTP 429 silinmiş video değildir; `RATE_LIMITED` erişimi
doğrulanamamış olarak kalır. Süre ve açıklama bölümleri tam transkript veya görüntü
incelemesi sayılmaz; bölümden üretilen zamanlar tahminidir. Kaynak URL'sinin sabit
kalması video içeriğinin değişmediğini kanıtlamaz. `--refresh` yeniden erişim
kontrolü içindir; sıradan üretim korunmuş metadata önbelleğini kullanır.
