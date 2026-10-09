# 12.03 — Metin katmanı, OCR ve inceleme kuyruğu pilotu

**Durum:** BITTI (beş soruluk pilot) · **Tarih:** 2026-10-09 · **Girdi:** [12.02 kaynak sözleşmesi](22_12_02_SORU_KAYNAK_SOZLESMESI.md).

## Uygulama ve sınır

`scripts/soru-metin-pilotu.py` üç çıkmış kitapçık sorusu ve iki OGM YKS Kampı kartını sabit kimliklerle **salt okunur** inceler. Kaynak PDF ve soru WebP dosyalarının SHA-256 özetlerini, PDF sayfasını, varsa kırpım dikdörtgenini, görsel boyutunu, çıkarılan metnin yöntemini ve kayıtlı metinle benzerliğini JSON olarak standart çıktıya verir. A–E şıklarının varlığını ve tek cevap alanını denetler; eksik kanıtları `review.status=needs_review` ve `reasons[]` ile kuyruğa ayırır. Bu JSON, 12.02'nin yayımlanabilir tam v1 kaydı değildir: PDF cevap anahtarı anchor'ı ve bazı soru kırpım konumları kaynak ara kayıtlarında bulunmuyor. Hiçbir kayıt `approved` üretilmez veya öğrenci veritabanına yazılmaz.

Çıkmış sorularda mevcut `parcalar` dikdörtgeninden PDF metin katmanı okunur. OGM ara kartları yalnız sayfa numarasını taşıdığı için tüm sayfanın metni soru metni kabul edilmez; izole soru WebP'sinde OCR yapılır ve PDF kırpım anchor'ı ayrıca incelemeye bırakılır. Metin katmanı boşsa da aynı OCR yoluna geçilir. Türkçe Tesseract `tur.traineddata` dosyası yerelde yoksa `ocr_required` nedeni oluşur; içerik tahmin edilmez. OCR çıktısı kanıtlı cevap veya otomatik onay değildir.

Çalıştırma (depo kökü `uygulama`):

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe scripts\soru-metin-pilotu.py > veri\pilot-12-03.json
```

PyMuPDF'nin OCR'si için [Tesseract'ın resmî Türkçe hızlı modelini](https://github.com/tesseract-ocr/tessdata_fast/blob/main/tur.traineddata) `veri/tessdata/tur.traineddata` içine koy. Bu klasör Git dışıdır. Başka konum için `IVME_TESSDATA` ortam değişkenini kullan. Pilot modelin SHA-256'sını rapora yazar; model veya kaynak değişirse sonuç yeniden incelenir. Python ortamı `D:\workspace\ivme\requirements.txt` üzerinden kuruludur.

## 2026-10-09 sonucu

| Kimlik | Yol | Kayıtlı metinle benzerlik | Kuyruk nedeni |
|---|---|---:|---|
| `TYT-0001` | PDF kırpım metni | 1.000 | Cevap anahtarı konumu yok |
| `TYT-0756` | PDF kırpım metni | 0.981 | Cevap anahtarı konumu yok; küçük metin farkı gözden geçirilecek |
| `AYT_EsitAgirlik-0189` | PDF kırpım metni | 1.000 | Cevap anahtarı konumu yok |
| `yk-matematik-tyt-test-01-01-01` | Soru WebP OCR | 0.773 | OCR, PDF soru kırpımı ve cevap anahtarı konumu incelenecek |
| `yk-matematik-tyt-test-01-01-02` | Soru WebP OCR | 0.877 | OCR, PDF soru kırpımı ve cevap anahtarı konumu incelenecek |

Beş görsel PIL ile açıldı, beş kayıtlı metinde A–E işareti ve tek cevap alanı bulundu. Benzerlik değeri normalize edilmiş karakter dizileri için `SequenceMatcher` oranıdır; **OCR doğruluk puanı değildir**. 0.99 altı farklar ayrıca kuyruğa girer. İki OGM kaydındaki fark, formül/şekil ve satır düzeni gibi içeriklerin insan tarafından kontrol edilmesi gerektiğini gösterir. Ayrı bir OCR denemesinde `TYT-0001` soru görseli raster PDF'ye çevrildi; Türkçe modelle 431 normalize karakter çıktı ve mevcut PDF metnine benzerlik 0.999 oldu. Kullanılan yerel `tur.traineddata` SHA-256: `7393381111e1152420fc4092cb44eef4237580d21b92bf30d7d221aad192c6b7`.

**Kontrol:** OCR modeli varken beş kaydın üçü `pdf_text`, ikisi `ocr`; beşi `needs_review`. Model yolu boş klasöre yönlendirildiğinde iki OGM kaydı `ocr_required` ve `method=null` ile raporlandı. `python -W error` ile uyarısız çalıştı. Bu iç veri hattı işi için kullanıcı UI'si değişmedi; 12.01'deki görsel kontrolü pilot örneklerinin okunabilirliğini kapsar.

**12.04 bağımlılığı:** Kaynak ara verisinden tam soru/cevap anchor'larını çıkarma, OCR belirsizliğini insan incelemesiyle çözme, çoklu sayfa/kaynak desteği, şık metinlerinin güvenilir ayrıştırması, tekrar çalıştırma ve hata raporu. Beş örnekten arşiv geneli kalite oranı çıkarılmaz.
