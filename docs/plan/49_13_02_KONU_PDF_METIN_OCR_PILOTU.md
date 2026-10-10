# 13.02 — Konu PDF metin/OCR pilotu

**Durum:** BITTI (dört sayfalık yerel pilot) · **Tarih:** 2026-10-09 · **Sözleşme:** [13.01 iç not biçimi](48_13_01_IC_NOT_KAYIT_BICIMI.md)

`scripts/konu-not-pilotu.py` üç mevcut OGM PDF'sinin dört fiziksel sayfasını salt okunur işler. Katalog `available` durumu, kaynak kökünün gerçek yolu, PDF uzantısı, dosya SHA-256'sı ve sayfa sayısı doğrulanır. Metin katmanı kısa ise Türkçe Tesseract ile tam sayfa OCR yapılır. Çıktı 13.01 biçiminde, tamamı `needs_review` olan iç notlar ve yöntem/uzunluk ölçüleridir. PDF metni ile OCR çıktısı otomatik onay ya da öğrenci içeriği değildir.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe -W error scripts\konu-not-pilotu.py > veri\pilot-13-02.json
```

`veri/pilot-13-02.json` ve kaynak PDF'ler Git dışıdır. Kullanılan `tur.traineddata` SHA-256: `7393381111e1152420fc4092cb44eef4237580d21b92bf30d7d221aad192c6b7`. `IVME_TESSDATA` ile başka model konumu seçilebilir; model yoksa kısa metinli sayfa `pending/ocr_required` kalır.

| Katalog / sayfa | Örnek | Yöntem | PDF metni → çıkarılan karakter | Görsel denetim |
|---|---|---|---:|---|
| 1099 / 1 | Noktalama İşaretleri | `pdf_text` | 17.857 → 17.857 | Metin katmanı var; uzun tek sayfa başlık/parça ayrımı insan kontrolü ister. |
| 1237 / 1 | Basit Formül ve Molekül Formülü I | `pdf_text` | 1.977 → 1.977 | Formül/şekil ayrı PDF sayfası referansıyla işaretlendi; metin tek başına yeterli kabul edilmedi. |
| 2138 / 2 | Fonksiyon sunusu, `y=f(x)=ax+b` başlığı | `ocr` | 96 → 504 | Görselde açık olan eşitlik OCR'de bozuldu; formül referansı ve inceleme şart. |
| 2138 / 3 | Taksi ücreti tablosu | `pdf_text` | 392 → 392 | Görselde `Yol (km)` / `Ücret (TL)` iki satırlı tablo var; çıkarılan metinde ücret satırı yok. Tablo sayfa referansı ile ayrı tutuldu. |

Formül ve tablo alanları `content.elements` içinde tür, fiziksel sayfa ve `pdf-page:N` referansı taşır. Bu referans gerçek şekil nesnesinin koordinatı değildir; insanın özgün PDF sayfasına dönmesi içindir. Pilotta görülen OCR bozulması ve eksik tablo hücreleri nedeniyle yapılandırılmış formül/tablo metni üretilmedi. Başlık olarak katalog başlığı kullanıldı; gerçek alt başlıkların ayrılması 13.03 ve daha geniş içerik incelemesinde ele alınır. `topic_code` aday ise `candidate` kalır, onaylı soru bağı sayılmaz.

**Kontrol:** Dört not kaynak checksum'ına ve sayfa sınırına bağlandı; `python -W error` çalıştı. Sayfa 2 ve 3 özgün PDF görüntüsüyle karşılaştırıldı. Öğrenci API/arayüzü değiştirilmedi; öğrenci 13.05'teki özgün PDF görüntüleyicisini kullanır. Dört sayfa arşiv geneli OCR başarımı veya AI maliyeti için örneklem değildir.
