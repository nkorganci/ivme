# Kaynaklı ders notları

Öğrenciye `/kaynakli-ders-notlari/:subjectId` ekranında sunulan konu rehberlerinin
nasıl üretildiğini, hangi kurallarla yayımlandığını ve nasıl doğrulandığını anlatır.
Kaynak taraması ve araştırma arşivi [kaynaklı soru analizinde](soru-analizi.md),
kalan not kapsamı [12.02'de](../plan/12-icerik-ve-yayin.md) tutulur.

## Ne sunulur?

Ders → kategori → konu → soru kalıbı seçilir. Her kalıpta kökü tanıma, düşünme mantığı,
püf noktası, çeldirici ve özgün düşünme provası bulunur; ardından konuya ait genel çözüm
sırası ve özgün alıştırma gelir. Yanıttan sonra öğrenci hatasının türüne göre kavrama,
soru köküne veya uygulama adımlarına döner. Tek yanıttan konunun bilindiği sonucu çıkarılmaz.
Özgün mini örnekler kurumların sınav sorusu gibi sunulmaz. Eski `?baslik=` bağlantısı,
o başlığın rehberi hazırsa doğrudan rehberi açar. “Analiz ve çalışma planı” TYT/AYT kaynak
gruplarını ve temel PDF'lerini gösterir; hazır olmayan konuya sahte içerik eklenmez.

Güncel kapsam yayımlanmış `frontend/public/kaynakli-notlar.json` dosyasındadır
(`lessonCount`, `patternCount`, `exampleCount`, `groups`). Bütün rehberler `teacher_pending`,
araştırma arşivinde `DRAFT` durumundadır; kaynak kontrolü öğretmen onayı değildir. Geniş
başlığa giriş rehberi bütün dar alt konuların, sanatçıların veya eserlerin tamamlandığı
anlamına gelmez.

## Yayın kuralları

- Girdiler: `ornek-veri/kaynakli-ders-notlari.json`, `ornek-veri/kaynakli-notlar/*.json`,
  `ornek-veri/kaynakli-arastirma-gozlemleri.json`; çıktı `frontend/public/kaynakli-notlar.json`.
- Sayfalar 1 tabanlı fiziksel PDF sayacıdır. Ham soru/PDF tam metinleri öğrenci JSON'una
  kopyalanmaz.
- Örnek soru etkin ve doğru ders/sınavda olmalı; kaynak ve CSV cevapları eşleşmeli; iptal,
  ders uyuşmazlığı veya `excludeFromGuides` notu taşımamalı. Halen dışlanan örnekler:
  `mt-tyt-turkce-02-25` (Fiilde Çatı etiketine rağmen cümlede anlam görevi) ve
  `3a-tyt-biyoloji-16-02` (görsel D'yi destekliyor, anahtar B; özgün anahtar/öğretmen
  incelemesi 12.01'de açık). Banka cevabı veya etiketi değiştirilmez.
- Her rehber iki koleksiyondan (çıkmış + OGM) örnek taşır. Çıkmış soru eşleşmesi
  bulunamayan rehber `past_question_not_found` ve açıklamayla yayımlanabilir (şu an Fiilde
  Çatı); bu, resmî arşivde hiç sorulmadığı iddiası değildir. Örnek sayısı `rehber × 2`
  varsayımıyla hesaplanmaz.
- Sözel Mantık için doğrulanmış kaynak dayanağı yoktur; hazır gösterilmez.
- AYT Türkçe görünen adı mevcut `ayt-edebiyat` grubunu “Türkçe / Edebiyat” adıyla açar;
  ayrı bir Türkçe soru grubu oluşturulmaz.

## Yeniden üretim ve doğrulama

```powershell
python -X utf8 scripts/kaynakli_etiket_sayisal.py --check
python -X utf8 scripts/analiz_kaynakli_sorular.py --check
python -X utf8 scripts/yayinla_kaynakli_etiketler.py --check
python -X utf8 scripts/yayinla_kaynakli_notlar.py --check
python -X utf8 testler/source-data-test.py
python -X utf8 testler/source-observations-test.py
python -X utf8 scripts/kaynakli_arastirma_db.py --write
python -X utf8 testler/source-research-db-test.py
```

Proje Python ortamında (`..\.venv`) `pymupdf` bulunmalıdır. Betikler Git dışı `veri/sorular-tum.csv` ve
`veri/sorular-ogm.csv` dosyalarını okur; yoksa görsellere dokunmadan yeniden üretilir:
`node ornek-veri/ornek_uret.mjs --tum --csv-only` ve `node ornek-veri/ogm_uret.mjs` (`ornek-veri/` içinden). Not değişince önce
`scripts/yayinla_kaynakli_notlar.py --write`, ardından araştırma arşivini güncel tutmak için
`kaynakli_arastirma_db.py --write` çalıştırılır. Ön yüz değişikliğini izleyici yayımlar;
ekran `node testler/source-labels-ui.mjs` veya
`python scripts/ivme.py sayfa /kaynakli-ders-notlari/<ders>` ile denetlenir.

`source-data-test.py` kaynak veri kurallarını, `source-observations-test.py` checksum/gözlem
regresyonlarını (açıklamasız eksik karşılaştırma ve çelişkili örneğin geri alınması
reddedilir), `source-research-db-test.py` arşiv kapsamını, JSON eşitliğini, öğretmen onayı
sınırını, Türkçe aramayı ve bozuk kaynak karakterinin kayıpsız geri çağrılmasını doğrular.
Güncel arşiv sürümü `kaynakli_arastirma_db.py --status` çıktısındadır.
