# 10.01 — Soru tipi, beceri, alt konu ve önkoşul taksonomisi

**Durum:** BITTI (sürümlü taslak ve örnek veri) · **Tarih:** 2026-10-09 · **Sonraki:** 12.05 kaynak/konu kimliği denetimi; 10.02 öneri hesabı için ayrıca onaylı etiket ve 08.03 gerekir.

## Karar

`ornek-veri/taksonomi-tyt-turkce-v1.json` sabit kodlu örnek taksonomidir: `EXAM → SUBJECT → TOPIC → SUBTOPIC → SKILL → QUESTION_TYPE` ebeveyn zinciri ve beceriler arası `prerequisites[]` bağı vardır. Görünen ad değişebilir; kod kimliktir. Bir soruda ileride birden fazla beceri/tip etiketi bulunabilir. Önkoşul, derse erişim engeli veya öğrencinin kesin eksiği değil, incelemeye açık öğrenme sırası önerisidir. V1, TYT Türkçe için 26 düğüm (3 ana konu, 7 alt konu, 7 beceri, 7 geniş soru tipi) ve 3 önkoşul bağı içerir. Başka ders/sınav için bu küçük örnek doğrudan çoğaltılmaz.

Mevcut V5 şeması `taxonomy_nodes` (ebeveyn, tür, kod, ad), `question_taxonomy` (soru–düğüm, kaynak) ve `taxonomy_prerequisites` (beceri–önkoşul) tablolarını içerir. Ancak `question_taxonomy` inceleme durumu tutmaz ve test envanterinde tablolar boştu. Bu örnekteki **önerilmiş** soru etiketleri `HUMAN` veya `AI_REVIEWED` diye DB'ye yazılmıyor; öğrenci filtresi ve öneri hesabında kullanılmıyor. Onay/yayın iş akışı 14.01 ve ilgili filtre işinin girdisidir.

## 50 soruluk gerçek kaynak örneği

`ornek-veri/turkce-taksonomi-ornek-50.csv` mevcut `veri-hatti/ogm-yks-cikmis/ham/sorular_son.json` dosyasından deterministik seçilir. Kaynak SHA-256: `a3caab72e8be97bf33c307e56214ca272defe5bd4e700034e21306a8db448386`. Yalnız mevcut görseli ve tek A–E cevabı olan kayıtlar seçilir; sabit konu kotasında yıllar sırayla dolaşılır. Dosyada gerçek `question_code`, kaynak konu/yıl/görsel, alt konu, beceri, geniş soru tipi ve `label_status=proposed` bulunur. Kodlar, soru görseli ve kaynak metnine iz sürmeyi sağlar; CSV öğrenci içe alma dosyası değildir.

| Kaynak konu | Örnek sayısı | Örnek soru |
|---|---:|---|
| Paragrafta Anlam | 10 | `TYT-0100` |
| Paragrafın Yapısı | 8 | `TYT-0062` |
| Sözcükte Anlam | 8 | `TYT-0001` |
| Cümlede Anlam | 8 | `TYT-0034` |
| Yazım Kuralları | 6 | `TYT-0300` |
| Noktalama İşaretleri | 5 | `TYT-0318` |
| Cümlenin Ögeleri | 5 | `TYT-0347` |

Yıllar: 2018: 8, 2019–2022: 7'şer, 2023: 5, 2024–2025: 4'er, 2026: 1. Yedi konunun birer kaynak metni gözle kontrol edildi ve geniş türle uyumluydu. Diğer 43 kaydın ayrıntılı soru tipi insan tarafından tek tek doğrulanmadı; kaynak `konu` etiketinden yapılan eşleme bütün satırlarda `topic_only_mapping` inceleme nedeni taşır. Paragraf ana düşünce/çıkarım gibi daha dar tipler bu kayıtlardan tahmin edilmez. Bu 50 kayıt, 10.02'de az veri ve kategori kırılımını sınamak için **örnek dağılım** sağlar; model doğruluğu veya öğrencinin zayıf alanı hakkında sonuç değildir.

## Tekrar üretme ve kontrol

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe scripts\uret-turkce-taksonomi-ornegi.py --check
```

Betik ebeveyn tür sırasını, benzersiz kodları, ebeveyn/önkoşul döngüsüzlüğünü, yedi kota toplamını, 50 benzersiz gerçek soru kodunu, tek cevap ve görsel varlığını doğrular; CSV kaynaklardan farklıysa hata verir. `--write` yalnız örnek CSV'yi yeniden üretir. Kontrol `python -W error` ile geçti. Kullanıcı UI'si ve canlı veritabanı değişmedi; bağımlı işlerde etiket onayı ve görüntü üzerinden daha dar tip ayrımı gerekir.
