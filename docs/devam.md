# İvme devir notu

Yalnız yarım işin devam noktası ve sıradaki görev tutulur. Açık iş tanımı [yol haritasında](plan/README.md), teknik kaynaklar [belge dizininde](README.md); geçmiş `git log` ve `veri/` raporlarındadır. Yeni kullanıcı talimatı sıradaki görevin önüne geçer.

## Şimdi

| Alan | Değer |
|---|---|
| Güncelleme | 29 Ekim 2026 — Codex |
| Etkin görev | `12.01` — TYT/AYT PDF–soru uzlaştırması ve hash tabanlı kalıcı kapsam kaydı |
| Sıradaki görev | `12.01` — kullanıcının PDF envanterindeki bütün sütunları içerik ve aktarım kanıtıyla denetleme isteğine devam |
| Yarım iş | Son uzlaştırma ve içerik okumaları yayımlandı: 217 PDF tam aktarılmış, 3 PDF'de aktarılacak soru yok; pratik ve envanter 80.230 soruda eşit. Yedi rehberin türü ve `pdf:512` Geometri projeksiyonu DB'de düzeltildi; eski Matematik etiketi kanıtta korunur. Sağlayıcı PDF'lerindeki 17 soru tam görsel okumayla çözüldü (`provider-content-review.json`); `sb-15976` ve `sb-15980` için kaynak PDF gerçekten ilk harfleri kesiyor, tam banka soruları korunuyor. Bu iki hata `sourceContentIssues` içindedir; boş kaynak gövdesi nedeniyle karantinadaki 23 eski kayıttan ayrıdır. `raw-verified-links.json` 245 bağ, 87 çözülmüş dil incelemesi ve bitmiş 20.530 sayfalık raster önbelleği korunmalı; yeni OCR kuyruğu sıfır, 640 sonuç hâlâ görsel okuma ister. Bankadaki 21 eski sorunun kaynak bağı açık. Önceki sunu model önerilerini yeniden çalıştırma. Yedek `../yedekler/pdf-accept-20261029-093837.dump`; kimlik/doğrulama `veri/pdf-source-registry/last-backup.json` içinde. |
| Sıradaki komut | `reconciliation.json` / `providerPrintCheck.textReviewNumbers` içindeki sonraki açık soruların tam PDF gövdesini banka görseliyle karşılaştır; mevcut sağlayıcı ve bütün-belge okumalarını tekrarlama. Sağlayıcı uyarılarının çoğu gerçek görsel sorulardır; boş metni boş soru sayma. 26 bekleyen sunu kartının gerekçesi `slide-content-review.json` içinde. Açık uçlu Soru/Cevap ve kaynakça başlıklarını çoktan seçmeli soru sayma. Yeni karar varsa ilgili açık okuma betiği ve uzlaştırma ile yayımla; bankaya soru eklenirse önce bütün banka karşılaştırmasını tazele. |

## Kullanıcı değerlendirmesi bekleyen iş

Akıllı Öğretmen kavrayış demosu: fizik, matematik ve geometriden beşer farklı ünite (15 içerik)
`ornek-veri/ogretim-pilotu/` altında ve DB'dedir; hepsinde benzetme, usta gözü, soru radarı, aha
cümlesi, sağlama ve animasyonlu görsel var. Kullanıcı demoyu beğenirse aynı yaklaşım diğer sorulara
[öğretim tasarımı rehberiyle](icerik/akilli-ogretmen-ogretim-tasarimi.md) yayılır. Doğrulama/aktarım:
`python scripts/ivme.py ogretim dogrula`, sonra `ogretim aktar`. [Tarif](islemler/ogretim-icerigi.md).

İnteraktif Öğrenme (`/interaktif-ogrenme`): 9 derste 25 ünite (fizik 3, matematik 3, geometri 3,
kimya 2, biyoloji 2, Türkçe 3, tarih 3, coğrafya 3, edebiyat 3); her ünitede genel laboratuvar,
sınav soruları ve kalıplar. Kullanıcı deneyip geri bildirim verecek; düzeltmeler ve yeni üniteler
[İnteraktif öğrenme rehberiyle](icerik/interaktif-ogrenme.md) yapılır. İlerleme şimdilik tarayıcıda.
