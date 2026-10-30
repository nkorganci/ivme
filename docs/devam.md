# İvme devir notu

Önce bu notu ve AGENTS.md içindeki kalıcı öğretim beklentisini oku. Önceki 33 dersin
giriş keşfini veya soru bankasını baştan üretme. Ayrıntı:
[öğretim sözleşmesi](icerik/konuyu-ogrenelim.md).

## Etkin görev

- Güncelleme: 29 Ekim 2026 — Codex.
- Kullanıcının son kapsamı: **yalnız Bölme ve Bölünebilme Kuralları** için sıfırdan,
  mantığını öğreten, günlük örnekli ve gerçek soru seviyesine hazırlayan pilot.
- Diğer dersleri bu standarda yaymak, kullanıcının pilotu değerlendirmesinden sonra.
  Önceki temel-kavramlar s2–s5 genişletmesi otomatik sıradaki görev değildir.

## Tamamlanan kapsam

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

- 29 Node testi geçti: mevcut içerik/KaTeX, 298 sayısal soru, motor, keşif modelleri;
  pilot için tüm rakam çiftleri, yeni modellerin girişleri, iki gerçek soru ve dışlama.
- Ayrı Vite paketi başarılı: `veri/ui-denetim/bolme-pilot-dist`.
- Dört keşif ve iki gerçek örnek masaüstü/mobilde geçti; taşma, konsol/istek hatası yok.
- Sekiz bölümlük öğrenme/ustalık akışı masaüstü/mobilde geçti. Son eklemede eski e1
  eşleştirme kontrolü de korundu; içerik testleri tekrar geçti.
- Son pakette e1 dahil 8 bölüm / 28 ders olayı / 6 ustalık sorusu masaüstü ve mobilde
  geçti. Canlı salt okuma sayfa denetimleri de geçti; taşma/konsol/istek hatası yok.
  Sonuçlar araç çıktılarında; ekranlar `veri/ui-denetim/konu-ogrenme/` altında.
- Plan denetimi ve 17 staged dosya için commit öncesi kontrol geçti.
- Kullanıcıdan içerik değerlendirmesi beklenir; başka konuya kendiliğinden geçme.

## Sıradaki komut

```powershell
git status --short
python scripts/ivme.py durum --hizli
```

Devamda önce bu pilot için gelen geri bildirimi uygula. Başarılı testleri girdi değişmeden
tekrarlama. UI testleri yalnız sahte API ile; gerçek öğrenci DB'sine test cevabı yazma.
Yerel main commit'i gerekir; kullanıcı istemedikçe push/dış dağıtım yapılmaz.
