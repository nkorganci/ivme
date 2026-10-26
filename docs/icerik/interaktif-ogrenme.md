# İnteraktif Öğrenme

Akıllı Öğretmen'den bağımsız bölüm (`/interaktif-ogrenme`). Her ünite tek bir **laboratuvar**
etrafında kurulur: öğrenci değerleri kendisi verir ya da sürükler; grafik, denklem ve sonuç
canlı değişir. TYT–AYT soruları aynı laboratuvara aktarılarak çözülür. İçerik ön yüzdedir;
sunucu tarafı yalnız SPA yönlendirmesi (`SpaForwardController`) ve soru görselleridir. İlerleme
pilot olarak tarayıcıda, kullanıcıya özel anahtarla tutulur (`interactive/progress.js`).

## Yapı

| Parça | Yer |
|---|---|
| Ders ve ünite kaydı (künye + tembel yükleme) | `frontend/src/interactive/registry.js` |
| Giriş sayfası (yöntem + ders sekmeleri) / ünite sayfası | `pages/InteractiveLearning.jsx`, `pages/InteractiveUnit.jsx` |
| Ortak ünite kabuğu: Laboratuvar · Sınav soruları · Kalıplar · Çıkmış sorular | `interactive/shell/ModuleUnit.jsx` |
| Ortak araçlar: grafik (`Plot`), kaydırıcı/alanlar, ifade motoru, geometri | `interactive/kit/` |
| Üniteler (her biri `{ Lab, initial, intro, questions, tips }` dışa aktarır) | `interactive/units/<ders>/<ünite>.jsx` |
| Saf hesap çekirdekleri (node ile test edilir) | `interactive/units/<ders>/*.js`, `interactive/kit/*.js` |
| Fizik · Hareket (kendi stüdyosu, görevleri ve kalıp haritası) | `interactive/motion/` |
| Ünite → çıkmış soru kodları (üretilir) | `interactive/pastQuestions.json` ← `scripts/interaktif-cikmis-sorular.py` |

`Lab` kontrollü bileşendir: `({ value, onChange })`. Kabuk tek durum tutar; sınav sorusundaki
"Soruyu laboratuvara aktar" düğmesi `initial` üzerine sorunun `setup` alanını yazar.

## Sınav sorusu biçimi ve akışı

```js
{ id, title, exam: 'TYT' | 'AYT', topic, stem, statements?, ask?, choices: { A..E }, answer,
  setup,        // laboratuvar durumu (initial üzerine yazılır)
  build,        // öğrencinin kendisi kuracaksa hangi değerleri gireceği
  look,         // laboratuvarda neye bakacağı (aktardıktan sonra görünür)
  explanation, rule }
```

Akış: **tahmin et** (şık seç) → **laboratuvarda kur** (kendin ya da aktar) → **gözle** →
**sonucu göster** (açıklama + kalıp). `MathText` `x^2`, `v_0`, `v_y` yazımlarını üst/alt simgeye
çevirir; alt simge yalnız rakam, `{…}` ya da tek harf için çalışır (`A_bb` dokunulmaz).

## İçerik kuralları

- Laboratuvar bir ünitedeki **her soru tipini** kurabilecek kadar genel olmalı: tek soruya
  özel çizim değil, değer girilebilen model (ör. devre ağacı, PV = nRT'de bilinmeyen seçimi,
  Punnett için gen/baskınlık seçimi).
- Sınav soruları özgündür; çıkmış sorulara bağlantı `Çıkmış sorular` sekmesinden verilir.
  Her sorunun sayısal cevabı `testler/interaktif-motorlar.test.mjs` içinde motorla sağlanır.
- Tarih ve edebiyat verisinde yalnız kesin, ders kitabı düzeyindeki bilgiler kullanılır;
  yaklaşık gösterimler ekranda belirtilir (ör. Millî Mücadele haritasındaki işgal tarihleri).
- Renkler yalnız `theme.css` değişkenleri; tablo gereken yerde `DataGrid` (düz `<table>` yok).
- JSX metninde ve çift tırnaklı JSX niteliklerinde `\'` yazılmaz (ters bölü olduğu gibi görünür);
  kesme işareti doğrudan yazılır.

## Yeni ünite ekleme

1. `units/<ders>/<ünite>.jsx` yaz; hesaplar ayrı `.js` dosyasında olsun.
2. `registry.js` içine künye satırı (`subject`, `id`, `exam`, `title`, `topics`, `summary`, `load`).
3. `scripts/interaktif-cikmis-sorular.py` içindeki `UNIT_TOPICS` eşlemesine konuları ekle ve betiği çalıştır.
4. Motor ve cevap sağlamasını `testler/interaktif-motorlar.test.mjs` dosyasına ekle.
5. Denetim: `node --test testler/interaktif-motorlar.test.mjs testler/interaktif-hareket.test.mjs`,
   sonra `node testler/interaktif-uniteler-ui.mjs <ders>/<ünite>` (her soruyu açar, aktarır,
   cevaplar; konsol hatası ve mobil taşmayı raporlar). Hareket ünitesi için `node testler/interaktif-ogrenme-ui.mjs`.
