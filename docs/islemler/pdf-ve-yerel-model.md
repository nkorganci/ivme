# PDF'den soru çıkarma ve yerel model

Sıra her zaman aynıdır: **önbellek → metin katmanı → OCR → yerel model → büyük AI**.
Tam sayfa ekran görüntüsü AI'ya verilmez.

## 1. Sayfa ve metin katmanı

```powershell
python scripts/ivme.py pdf sayfalar "<pdf>" --metinsiz       # hangi sayfada metin yok (OCR gerekir)
python scripts/ivme.py pdf sorular "<pdf>" --metinsiz        # soru numaraları, bölümler, cevap anahtarı
python scripts/ivme.py pdf sorular "<pdf>" --sayfa 3-6       # metinle birlikte
python scripts/ivme.py pdf sorular "<pdf>" --kirp veri/pdf-kirp/<ad>
```

`scripts/pdf-metin.py` her soru için numara, sayfa, konum (`bbox`), metin ve
`gorselGerekli` verir. Soru numarası geriye dönünce yeni test bölümü (`bolum`) başlar;
“12. C” satırlarından oluşan sayfalar `cevapAnahtari` olarak ayrı okunur; “58.–60. soruları
… cevaplayınız” `ortakOncul` türündedir. `summary.bolumler` eksik/tekrar numaraları gösterir;
önce bunlar düzeltilir. `gorselGerekli`, metin satırları örtüldükten sonra bölgede koyu
mürekkep (şekil/tablo/grafik) kalmasıyla belirlenir; açık gri filigran sayılmaz. `--kirp`
yalnız bu sorular için PNG üretir. Sonuçlar PDF SHA-256'sıyla
`veri/pdf-metin-onbellek/` altında önbelleğe alınır. Özgün PDF değiştirilmez.

Metin katmanı olmayan sayfalar için `scripts/pdf-page-ocr.py` (önbellekli Türkçe OCR) ve
`scripts/pdf-readability-fallback.py` kullanılır.

## 2. Yerel model (Ollama)

```powershell
python scripts/ivme.py ollama durum
python scripts/ivme.py ollama gorsel veri/pdf-kirp/x.png "Bu soruda hangi şekil var? JSON: {\"sekil\":\"\",\"guven\":\"LOW|MEDIUM|HIGH\"}" --json
python scripts/ivme.py ollama toplu girdi.jsonl --sablon sablon.txt --sema sema.json --cikti cikti.jsonl
```

Varsayılan model `qwen3.5:9b` (görsel destekli; `OLLAMA_MODEL` ile değişir). Sunucu kapalıysa
`ollama serve` kendiliğinden başlatılır. `toplu` her satırı şablondaki `{alan}` yerlerinden
doldurur, `--sema` ile JSON Schema'ya uygun yanıt ister ve her isteği
`veri/ollama-onbellek/` altında saklar; yarıda kalırsa aynı komut yalnız eksikleri işler.

Kullanım sınırı: yerel model sonucu **aday**dır. Konu adayları kayıtlı kategori
kimliklerinden seçtirilir (izinli liste şablona verilir); yeni konu adı ürettirilmez.
`guven` düşük veya kurallarla çelişen kayıtlar Claude/Codex ya da öğretmen incelemesine
ayrılır. Öğretmen onayı veya kesin etiket olarak yazılmaz.
