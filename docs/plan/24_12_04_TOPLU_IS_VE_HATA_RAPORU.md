# 12.04 — Tekrar çalıştırılabilir toplu iş ve hata raporu

**Durum:** BITTI (salt okunur, kademeli kaynak taraması) · **Tarih:** 2026-10-09 · **Girdi:** [12.03 metin/OCR pilotu](23_12_03_METIN_OCR_PILOTU.md).

## Uygulama

`scripts/soru-metin-pilotu.py` pilot modunu korur; `--batch outgoing|ogm` ile sabit sırada kaynak kayıtlarını tarar. `--limit` işlem sınırıdır. Her soru için `veri/pilot-12-04/<kaynak>/records/<kod>.json` atomik yazılır. Girdi parmak izi betiğin, kaynak PDF'nin, soru görselinin, kayıtlı metin/cevap/konumun ve varsa Türkçe OCR modelinin SHA-256 bilgisinden üretilir. `--resume` eşleşen kayıtları atlar; değişmiş girdiyi yeniden işler. Hata diğer soruları durdurmaz: `errors/<kod>.json` dosyasına tür ve kısa neden, `summary.json` içine işlenen/atlanan/hatalı sayısı ile inceleme nedenleri yazılır. Çıktı yalnız Git dışı `uygulama/veri` altında tutulabilir. İşlem kaynakları ve öğrenci veritabanını değiştirmez.

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe scripts\soru-metin-pilotu.py --batch outgoing --limit 100 --resume
D:\workspace\ivme\.venv\Scripts\python.exe scripts\soru-metin-pilotu.py --batch ogm --limit 100 --resume
```

Soru düzeyi hata varsa çıkış kodu `1` olur; çıktı dosyaları ve özet yine yazılır. `source_crop_missing`, mevcut eski taşınmış kartta kaynak PDF kırpımı bulunmadığını bildirir; soruyu onaylamaz. Her kayıt `needs_review` olarak kalır; bu toplu tarama yayın/import veya tam 12.02 v1 sözleşmesi üretmez.

## Kademeli kontrol

| Kaynak/limit | İlk tarama | Yeniden başlatma | Bulgular |
|---|---|---|---|
| Çıkmış 20 → 100 → 500 | Her basamak işlendi | Sırasıyla 20/20, 100/100, 500/500 atlandı | 500 kayıtta sıfır işlem hatası; 27 cevap ve 43 şık inceleme nedeni. |
| OGM 20 → 100 | OCR ile işlendi | 100/100 atlandı | 100 kayıtta sıfır işlem hatası; 24 şık, 82 metin farkı inceleme nedeni. OCR'nin tamamı insan incelemesinde. |
| Çıkmış tam katalog 2.592 | 2.566 kayıt çıktı, 26 kaynak kırpımı hatası | 2.566/2.566 geçerli kayıt atlandı; aynı 26 hata yine raporlandı | 26 kart eski kaynaktan taşınmış; ara `sorular.json` içinde PDF kırpımı yok. `errors/*.json` altında tek tek görülebilir. |

Tam çıkmış katalogda 27 tek cevap şartını sağlamayan, 155 şık ayrıştırması ve 432 metin farkı inceleme nedeni var; bunlar birbirinden bağımsız sayımlar ve **doğrulanmış içerik hatası oranı değildir**. Tüm 2.566 kayıtta basılı cevap anahtarı konumu eksik. OGM 100 örneğinde de 100 cevap anchor'ı ve 100 soru kırpım anchor'ı eksik; OCR sonucu doğruluk puanı değildir. `python -W error` ile betik uyarısız çalıştı; Tesseract bazı küçük görüntü parçaları için kendi uyarısını yazdı, çıktı yine üretildi.

**Açık sınır:** OGM'nin 77.533 kartının tamamı çalıştırılmadı; 100 kartlık OCR aşaması yaklaşık iki dakika sürdü. Bu hızla tüm arşivi körlemesine çalıştırmak yerine kaynak ailesi başına inceleme/performans örneği ve maliyet sınırı gerekir. Kaynak katalogu bozuk JSON ise tarama başlamadan durabilir; soru düzeyi hata ayrıştırması onu onarmaz. 26 eski kartın PDF kökeni uydurulmaz. 12.05'te kaynak/konu kimliği denetimi ve doğrulanmış PDF–soru bağı gerekiyor; bunun için önce 10.01 taksonomisi tanımlanacak. Öğrenci UI'si değişmedi.
