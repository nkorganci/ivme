# 13.04 — OGM konu PDF'si artımlı kataloğu

**Durum:** BITTI (yerel katalog üretimi) · **Tarih:** 2026-10-09 · **Girdiler:** [OGM öğrenci akışı](15_OGM_PDF_VE_KONU_SORU_BAGI.md), [12.05 kaynak bağı denetimi](26_12_05_OGM_KAYNAK_KONU_BAGI.md).

## Kapsam ve kayıt

`scripts/ogm-konu-pdf-katalog.py`, `veri-hatti/ogm-indirme/katalog.json` içinden yalnız dört öğrenme içeriği ailesini alır: MEBİ Konu Özeti, Konu Anlatımı (Video + PDF), Konu Özetleri ve Ders Anlatım Sunuları. Adında “konu” geçen soru bankası/pekiştirme testi, deneme ve tarama testi bu allowlist'e girmez. Her kayıt: sabit göreli yol kaynak kodu, katalog id, tür, sınav, ders, varsa sınıf, başlık, göreli PDF yolu, dosya SHA-256/boyutu, PDF sayfa sayısı, durum ve varsa **aday** konu kodu taşır. Kaynak yolunun izinli kök dışına çıkışı ve PDF olmayan dosya reddedilir. Tam PDF dosyaları Git'e eklenmez; çıktı Git dışı `uygulama/veri/ogm-konu-pdf-katalog/entries/` içindedir.

Girdi parmak izi katalog alanları, dosya SHA-256'sı, taksonomi ve betik sürümünü kapsar. `--resume` eşleşen kaydı atlar; yeni/değişen PDF yeniden işlenir. Kaynak silinirse `missing_file`, PDF yolu olmayan içerik `video_only` olur. `candidate_title_match` konu kodu yalnız TYT Türkçe başlığı 10.01 alt konu adıyla birebir eşleştiğinde üretilir; içerik/sayfa doğrulaması değildir ve 13.05'te “Bu konudan soru çöz” bağı için kullanılamaz. Çok konu içeren PDF'lerde `topic_code=null` kalır. Öğrenciye açılacak PDF ekranı 13.05 işidir.

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogm-konu-pdf-katalog.py --sample --resume
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogm-konu-pdf-katalog.py --limit 2236 --resume
```

## 2026-10-09 kontrolü

| İçerik türü | Kayıt |
|---|---:|
| Ders anlatım sunusu | 1.101 |
| Konu özeti | 1.037 |
| Video destekli konu anlatımı | 80 |
| MEBİ konu özeti | 18 |
| **Toplam** | **2.236** |

2.234 PDF bulundu ve PyMuPDF ile açılıp sayfa sayısı okundu. `KARBON KİMYASINA GİRİŞ` (katalog id `121`) yalnız video; PDF'ye dönüştürülmedi. `GAZ YASALARI VE GAZLARDA KİNETİK TEORİ` sunusunun (id `2088`) katalog yolu var, yerel PDF eksik; `missing_file` kaydıdır. Dokuz TYT Türkçe başlığı aday alt konu koduna eşleşti; 2.227 kayda konu kodu tahmin edilmedi. Ayrı sınav/ders/sınıf alanları kaynak katalogdan korundu, `TYT-AYT` ortak içerik tek sınava zorlanmadı.

**Test:** Altı kayıtlık tür örneği dört mevcut PDF, bir video-only, bir eksik dosya; `--resume` 6/6 atladı. İlk 50 PDF 50/50 atlandı. Tam 2.236 katalog girdisi için ikinci çalıştırma 2.236/2.236 atladı; işleme hatası yok. `python -W error` ile geçti. Öğrenci UI'si ve canlı veritabanı değişmedi. 13.05'te PDF erişim API'si yalnız `available` ve kanonik kaynak yolu doğrulanmış kaydı açmalı; başlık adayını onaylı soru bağı gibi sunmamalı.
