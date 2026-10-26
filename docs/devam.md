# İvme devir notu

Yalnız yarım işin devam noktası ve sıradaki görev tutulur. Açık iş tanımı [yol haritasında](plan/README.md), teknik kaynaklar [belge dizininde](README.md); geçmiş `git log` ve `veri/` raporlarındadır. Yeni kullanıcı talimatı sıradaki görevin önüne geçer.

## Şimdi

| Alan | Değer |
|---|---|
| Güncelleme | 25 Ekim 2026 — Claude |
| Etkin görev | — |
| Sıradaki görev | `07.02` — tahmini etiketlerin gerçek kaynak/ünite/sınıf kontrolü |
| Yarım iş | Yok |
| Sıradaki komut | `python scripts/ivme.py durum --hizli` |

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
