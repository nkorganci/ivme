# Akıllı Öğretmen içeriği

İçerik dosyası: `ornek-veri/ogretim-pilotu/<branş>/<SORU-KODU>.json`
(şema `docs/semalar/ogretim-icerigi-v1.schema.json`). Her dosya bir soruya ait ipucu
basamaklarını, adım adım çözümü, kavram yanılgısı teşhislerini, çok seviyeli açıklamaları,
kavrayış katmanını (benzetme, usta gözü, soru radarı, aha cümlesi, sağlama), animasyonlu
görseli ve ikiz soruyu taşır. Nasıl yazılacağı [öğretim tasarımı rehberinde](../icerik/akilli-ogretmen-ogretim-tasarimi.md),
API ve ekranlar [API belgesinde](../sozlesmeler/api.md#akıllı-öğretmen).

```powershell
python scripts/ivme.py ogretim dogrula --offline           # yalnız dosya/şema denetimi
python scripts/ivme.py ogretim dogrula                     # DB soru bağlarıyla
python scripts/ivme.py ogretim dogrula --subject fizik
python scripts/ivme.py ogretim aktar                       # tutor_contents'e sürümlü yazar
python scripts/ivme.py ogretim kalibrasyon                 # öğretmen kararı / güven bandı özeti
python scripts/ivme.py ogretim yeniden-uretim              # açık yeniden üretim isteklerini dışa alır
```

`dogrula`, görsel parametrelerini ön yüzün şablon doğrulayıcısıyla Node üzerinden de denetler
(`scripts/ogretim-gorsel-denetle.mjs`); kavrayış katmanı eksikse `NO_INSIGHT` uyarısı verir.
Geçersiz dosya varken aktarım yapılmaz. Rapor `veri/ogretim-pilotu/` altına yazılır.
Ekran denetimi: `python scripts/ivme.py ui ogretim-dongusu-ui.py` ve
`python scripts/ivme.py sayfa /akilli-ogretmen`.

Yeni içerik eklerken soruyu önce `scripts/pdf-metin.py` / soru görseliyle doğrula; cevap
anahtarı ile çözümün sonucu eşleşmeli. Otomatik doğrulama öğretmen onayı değildir; öğrenci
görünürlüğü `YKS_OGRETIM_GORUNURLUGU` ayarına bağlıdır. Pilotun durumu ve devam noktası
`docs/devam.md` “Duraklatılmış işler” satırındadır.
