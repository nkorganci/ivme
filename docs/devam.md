# İvme devir notu

Önce bu notu ve AGENTS.md içindeki kalıcı öğretim beklentisini oku. Önceki 33 dersin
giriş keşfini veya soru bankasını baştan üretme. Ayrıntı:
[öğretim sözleşmesi](icerik/konuyu-ogrenelim.md).

## Etkin görev

- Güncelleme: 29 Ekim 2026 — Claude.
- Bölme ve Bölünebilme pilotu tamamlandı, push edildi. Kullanıcının sonraki talimatı:
  **ilk konudan (sıra 100 `temel-kavramlar`) başlayarak** diğer dersleri aynı biçime getirmek.
- Diğer 32 dersin her bölümünde `::duzey` zaten var; eksik olan her bölümde `::sorgula`,
  bölüm başına daha fazla gerekçeli örnek, koşullu kısa yol ve gerekiyorsa bölüm keşfi.
  Sıra: `temel-kavramlar` → `sayi-basamaklari` → `ebob-ekok` → `rasyonel-sayilar` → … (`sira:` alanı).
- Dönüştürülenler `testler/konu-ogrenme-bicim.test.mjs` `YENI_BICIM` listesindedir; listede olmayan
  sıradaki ders bir sonraki iştir. Yeni bölüm keşfi/modeli ve görseli okunmuş yeni gerçek soru bu
  turda eklenmez; her bölüme sorgulama, ikinci gerekçeli örnek ve eksik adım gerekçeleri eklenir.

## Tamamlanan kapsam

- Pilot eksikleri giderildi: üstteki “Anlatımı seç” 8 bölümün yalnız birinde `::duzey`
  bulduğu için çoğu bölümde hiçbir şey değiştirmiyordu. Artık her bölümde konuya özgü
  L1/L2/L3 kutusu var; seçim kutuya kaydırır, vurgular, keşifte kelimeleri (L1) veya
  “Bir adım ileri”yi (L3) açar. L1'deki başarılı öğrenciye de üst düzey önerilir.
- Yeni `::sorgula` bloğu (Günlük hayattan sorgula, `DailyInquiry.jsx`): her bölümde bir
  günlük senaryo; puan/olay üretmez. Ayrıştırıcı ve doğrulayıcı biçimi denetler.
- `bolme-bolunebilme.ders`: 8 bölüm / 4 oturum; 24 gerekçeli çözümlü örnek,
  3 adım tamamlama, 4 yeni küçük kontrol, bölüm sonu yöntem ve hata açıklamaları.
- Eski s1–s4, ön test/kontrol/havuz ve e1/b1 kimlikleri korunur. S1b–s4b eklenir.
  Test motoru ve öğrenci DB kayıtları değiştirilmez.
- İlk kutu keşfi korunur; `division-explorations.js`, `division-models.js` ve
  `DivisionDiagram.jsx` ile 3 yeni bölüm keşfi: basamak katkısı, ortak koşul,
  kuvvetlerde kalan döngüsü. Tüm girişlerde sayısal sonuç/görsel aynı veriyle üretilir.
- Bölüm keşiflerinde `lessonId` sahipliği vardır; doğrulayıcı artık yalnız ilk keşfi
  değil derste kullanılan bütün keşiflerin formüllerini tarar.
- OGM 9. sınıf özet 09 ve 10'un ilk sayfaları görüntülenerek okundu. 2020 AYT
  `AYT_Sayisal-0014` ve 2021 TYT `TYT-0593` özgün görsellerinden çözülüp rehberlendi.
  Sonuçlar D/11 ve A/7; DB anahtarıyla eşleşiyor. Hash'ler öğretim sözleşmesinde.
- TYT-0593 görsel incelemeyle `bilesik-kural` tipine düzeltildi. Banka betikle üretildi;
  yalnız bu dersin bankası ve özet istatistiği değişti. İki çözümlü gerçek soru bağımsız
  ustalık testinden hariç; soru kodu ve özgün görüntüler korunur.
- Yöntem: somut bağlam → gerekçe → çözümlü örnek → koşullu kısa yol → öğrenci denemesi
  → gerçek soru. IES kaynak bağlantısı ve pilot dosya/komutları öğretim sözleşmesinde.

## Doğrulama ve kalan iş

- 31 Node testi geçti (içerik/KaTeX, motor, keşif, pilot; yeni: her bölümde düzey+sorgula
  ve senaryo sayılarının bağımsız hesabı).
- Ayrı paket `veri/ui-denetim/bolme-pilot-dist` ile `--duzey`, `--kesif`, `--gercek-ornek`
  ve tam ders akışı masaüstü/mobilde geçti; taşma, konsol/istek hatası yok.
- Kalan: diğer derslere aynı biçim (yukarıdaki sıra). Her ders için `::sorgula` ekle,
  sonra `node --test testler/konu-ogrenme-icerik.test.mjs` ve `--duzey <ders>` çalıştır.

## Sıradaki komut

```powershell
git status --short
python scripts/ivme.py durum --hizli
```

Devamda önce bu pilot için gelen geri bildirimi uygula. Başarılı testleri girdi değişmeden
tekrarlama. UI testleri yalnız sahte API ile; gerçek öğrenci DB'sine test cevabı yazma.
Yerel main commit'i gerekir; kullanıcı istemedikçe push/dış dağıtım yapılmaz.
