# İvme devir notu

Yalnız yarım işin devam noktası ve sıradaki görev tutulur. Açık iş tanımı [yol haritasında](plan/README.md), teknik kaynaklar [belge dizininde](README.md); geçmiş `git log` ve `veri/` raporlarındadır. Yeni kullanıcı talimatı sıradaki görevin önüne geçer.

## Şimdi

| Alan | Değer |
|---|---|
| Güncelleme | 29 Ekim 2026 — Codex |
| Etkin görev | `12.01` — TYT/AYT PDF–soru uzlaştırması ve hash tabanlı kalıcı kapsam kaydı |
| Sıradaki görev | `07.02` — tahmini etiketlerin gerçek kaynak/ünite/sınıf kontrolü |
| Yarım iş | Pratik ve envanter 80.229 YKS sorusunda eşit: Mini 04'ten 33, sunulardan 125 yeni soru kabul edildi; kaynakta da boş 23 kayıt geçmiş silinmeden karantinada. Sunulardaki 73 ve eski çıkarımlardaki 33 eş soru mevcut bankaya bağlandı; Türkçe/edebiyatta noktalama veya sözcük aralığı farkı bulunan 87 eski bağ ek incelemeye çekildi. 178 PDF tam doğrulandı; 21 eski banka sorusu kaynaksız, diğer PDF'lerde açık adaylar ve kaynak/konu/varyant sorunları sürüyor. Sunuların model taraması tamamlandı; aynı önerileri baştan çalıştırma. Kabul sonrası soru/katalog yedeği `../yedekler/pdf-accept-20261028-141419.dump`; son kaynak inceleme kararları bundan sonra güncellendi. Güncel yedek yolu `veri/pdf-source-registry/last-backup.json` içindedir. |
| Sıradaki komut | `..\.venv\Scripts\python.exe -X utf8 scripts/pdf_text_duplicate_candidates.py` (yeni banka ile karşılaştırmayı tazele; ardından `reconciliation.json` açık kaynakları ve `slide-content-review.json` gerekçelerini çöz) |

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
