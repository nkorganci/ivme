# İvme — ekran sözleşmesi, taslak (2026-10-08)

Bu belge 3. adımın karar ve kontrol listesidir. [Etkileşimli soru ekranı prototipi](../prototip/soru-ekrani.html) sentetik içerikle hazırlanmıştır; gerçek soru veya öğrenci verisi içermez. Prototip ürün API'sine bağlı değildir.

## Gezinme ve ekranlar

| Ekran | Ana görev | Birincil eylem / durum |
|---|---|---|
| Ana sayfa | Bugünkü hedef, devam eden çalışma, son sonuç, önerilen tekrar | `Çalışmaya devam et`; veri yoksa ilk 10 soruluk pratik çağrısı |
| Konular / Soru bankası | Sınav → ders → konu → alt konu/soru tipi; toplam/çözülen/kalan | Filtrele ve soru aç; filtre sonucu 0 ise düzenleme önerisi |
| Soru çözme | Solda soru görseli, **altında şıklar ve yanıt**; sağda `Karalama`, `QR/Çözüm`, `Konu notu/İpucu` sekmeleri | Yanıtla; yanlışsa tekrar dene veya cevabı göster; kaydetme hatasında seçim korunur |
| Test kur | Kaynak, konu, sayı, süreli/süresiz, yeni/önceki/yanlış/karışık | Eşleşen/kalan sayı ve açık yetersiz soru uyarısı; başlat |
| İlerleme | Gün/hafta/ay/tümü; doğru/yanlış/boş, tekil soru, aktif süre ve zayıf alan | Grafik ve erişilebilir tablo aynı sayıları kullanır; az veri açıklaması |
| Hedefler | Günlük/haftalık/aylık soru/test/deneme hedefi | Oluştur, düzenle, durdur; iki kez sayım yok |
| Hesap | E-posta/telefon, şifre, oturum ve veri tercihleri | Mevcut şifreyle kritik değişiklik; açık hata/başarı bildirimi |
| Yönetici | Yalnız toplu kullanıcı ve kullanım istatistiği | Kişi listesi/tekil soru geçmişi yok; içerik bakımı ayrı yerel araçta |

## Görsel dil ve davranış

- Ürün adı arayüzde **İvme**. TYT/AYT ayrı içerik koleksiyonudur; tüm ürünün adı değildir. İlk prototip mevcut mor vurguyu (`#4f46e5`) kullanır. Açık arka plan, beyaz içerik kartı, koyu metin; başarı/uyarı/hata rengi yalnız anlam taşıdığı yerde.
- Temel metin en az 16 px; açıklama en az 14 px; denetim hedefi en az 44 px. Soru görseli kendi oranıyla ve en az ekrana sığdırılabilir biçimde gösterilir. Yakınlaştırma metni bulanıklaştırmamalı; kaynak görsel kalitesini ayrıca kontrol et.
- Masaüstünde içerik genişliği en çok yaklaşık 1440 px; soru sütunu esnek, yardımcı panel 300–360 px. Telefon ve dar tablette tek sütun: önce görsel ve şıklar, sonra yardımcı sekmeler. Yatay kaydırma yok. Soru ekranında sabit alt çubuk şıkları örtmemeli.
- Her ekranda yükleniyor, boş, hata, başarı ve yetkisiz durum için kısa mesaj + uygun yeniden dene/geri dön eylemi. Form hatası ilgili alanın yanında; sunucu hatasında girilmiş veri kaybolmaz.
- Klavye: görünür odak, sekmelerde ok tuşları/Enter, A–E şık seçimi yalnız metin alanı dışındayken, `Enter` gönderimi, mobilde de aynı işlevler. Renk tek bilgi kaynağı değil. Animasyon azaltma tercihi uygulanır.
- `Karalama` soru başına taslak olarak yerelde başlar; hesaplar arasında kalıcılık 6. adımda açılır. QR oturum gerektiren kalıcı soruya gider. Not/ipuçları kaynak ve yayın durumuyla gösterilir; sınavda teslim öncesi cevap sızdırılmaz.

## Bugünkü arayüzden ayrılan kararlar

Mevcut çalışan arayüzde şıklar soru görselinin altındaki içerik akışı yerine alt sabit çubuktadır; sağ panel katlanan bölümler içerir ve karalama/konu notu yoktur. Yönetici ekranı soru düzenleme/ithalat ve bireysel bildirimleri de gösterir. Bu farklar prototipte hedef akış olarak çizildi; gerçek kod değişimi 4., 6., 7. ve 11. adımlarda API/yetkiyle birlikte yapılacak. Mevcut kullanıcı değişiklikleri otomatik olarak bu tasarımın parçası sayılmaz.

## İnceleme ve kabul

Prototip yerel dosya olarak açılır. Masaüstünde 1280 px, telefonda 390 px; görsel/şık okunabilirliği, sekme ve karalama etkileşimi, klavye odağı ve taşma kontrol edilir. Ana sayfa, test kurma, ilerleme, hesap ve yönetici ekranları bu sözleşmeye göre küçük kod parçalarıyla ele alınır. Kullanıcı farklı bir düzen/renk/öncelik isterse bu dosyada tarihli karar eklenir; 3. adım onay/uygulama kontrolünden sonra tamamlanır.
