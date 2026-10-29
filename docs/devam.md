# İvme devir notu

Yalnız yarım işin devam noktası ve sıradaki görev tutulur. Açık iş tanımı [yol haritasında](plan/README.md), teknik kaynaklar [belge dizininde](README.md); geçmiş `git log` ve `veri/` raporlarındadır. Yeni kullanıcı talimatı sıradaki görevin önüne geçer.

## Şimdi

| Alan | Değer |
|---|---|
| Güncelleme | 29 Ekim 2026 — Codex |
| Etkin görev | `12.01` — TYT/AYT PDF–soru uzlaştırması ve hash tabanlı kalıcı kapsam kaydı |
| Sıradaki görev | `12.01` — kullanıcının PDF envanterindeki bütün sütunları içerik ve aktarım kanıtıyla denetleme isteğine devam |
| Yarım iş | Canlı pratik ve envanter 80.230 YKS sorusunda eşit; yayımlanmış tam PDF sayısı 201. 21 eski banka sorusu kaynaksız, kaynakta da boş 23 kayıt karantinada. `raw-verified-links.json` 245 bağ içeriyor; 87 dil incelemesi özgün U+00AD kanıtı ve sekiz açık görsel okumayla çözüldü. Bunları yeniden model incelemesine sokma. Yeni raster taraması bitti: 20.530 sayfa önbellekte, yeni OCR kuyruğu sıfır; 640 OCR sonucu ayrıca görsel okuma gerektiriyor. Bu sayı banka aktarımının tamamlandığı anlamına gelmez. Son tam uzlaştırma JSON'u henüz yayımlanmadı: kodun son açık uçlu soru/kaynakça ayrımı değişikliğinden önce üretildi, `--reuse --publish` kullanma. Yedi rehberin türü ve Geometri kaynak projeksiyonu son uzlaştırma/yayınla alınacak. Önceki sunu model önerilerini yeniden çalıştırma. Yedek `../yedekler/pdf-accept-20261029-093837.dump`; kimlik/doğrulama `veri/pdf-source-registry/last-backup.json` içinde. |
| Sıradaki komut | Tarif sırasıyla `pdf_source_reconcile.py`, `pdf_question_discovery.py`, ardından `pdf_source_reconcile.py --publish`; yalnız mevcut önbellekleri kullan. Açık uçlu Soru/Cevap bölümleri ve kaynakçadaki Sorular başlığı, çoktan seçmeli soru eksikliği sayılmamalı; bunun regresyon testi var. Sonra bekleyen konumları cevap, görsel, banka tekrarı ve kontrollü konuyla incele; 26 sunu kartının gerekçesi `slide-content-review.json` içinde. Yeni soru alınırsa banka karşılaştırmasını tazele. |

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
