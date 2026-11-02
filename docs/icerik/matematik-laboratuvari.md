# Matematik Laboratuvarı — MAT-LAB-01

Kullanıcı onaylı ilk pilot Sayı Kümeleri ve Temel Kavramlar içindeki tek–çift
çıkarımıdır. Mevcut 12.02 öğretim kapsamına bağlıdır; yeni bir müfredat oluşturmaz.

Akış: tahmin → koşulu koruyarak dene → karşı örnek / genel gerekçe → yeni soruya
aktar. a + 2b = 17 başlangıcının toplam, katsayı ve sayı kümesi değişiklikleri ayrı
senaryolardır. Denemek ispat değildir; gerekçe adımı olmadan aktarım tamamlanmaz.
Konu sayfası ve mevcut tek–çift keşfi aynı laboratuvara bağlantı verir.

Pilot alıştırmaları özgündür. Keşif, ders tamamlanması veya bağımsız ustalık
puanı üretmez; gerçek sorular mevcut ortak pratik ekranında çözülür. Deney durumu
yalnız açık sayfada tutulur; sayfa yenilenince sıfırlanır. Öğretmen onayı ve gerçek
öğrenciyle öğrenme etkisi ölçümü ayrıca gereklidir.

## Uygulama ve kabul

Uygulandı: dört koşul sekmesi, tahmin kapısı, eşitliği koruyan kaydırıcı, son dört
örnek, gerekçe kontrolü, üç özgün aktarım sorusu ve mevcut ortak pratiğe bağlantılar.

Adres: `/konuyu-ogrenelim/laboratuvar/temel-kavramlar`. Tek–çift bölümündeki mevcut
görsel anlatım korunur; bu alana ayrıca geçilir. Farklı derslerde ortak aşamalar
korunabilir; matematiksel model konuya göre seçilmelidir. İlk pilot yalnız tek–çifttir.

Teknik kabul tamamlandı:

- `python scripts/ivme.py kalite calistir MAT-LAB-01`: 5 matematik testi geçti.
- `node --test testler/konu-ogrenme-derin.test.mjs`: 30 mevcut ders kontrolü geçti.
- `npm run build`: başarılı. UI için ayrı çıktı `veri/ui-denetim/laboratuvar-dist`.
- `IVME_TEST_DIST` bu dizini gösterirken
  `node testler/konu-ogrenme-ui.mjs --laboratuvar temel-kavramlar`: masaüstü/mobil
  dört senaryo, yanlış gerekçe, negatif değer, klavye kaydırıcısı, koşula uyan karşı
  örnek, sekmeler arası durum, üç aktarım sorusu, ipucu özeti ve yenileme geçti.
  Laboratuvar öğrenci ilerleme olayı üretmedi; konsol/istek hatası ve yatay taşma yok.
- Yerel izleyici son sürümü sundu. Windows PowerShell kaynak/paket parmak izi,
  HTTP `app-version.txt` ve derleme sürümü eşleşti; canlı masaüstü/mobil görünüm geçti.
- `python scripts/ivme.py plan`, `python scripts/ivme.py kontrol` ve Git boşluk
  kontrolü geçti. Kalite profilinin TAP raporu ve profil kayıt testi güncellendi.

Yerel kanıtlar `veri/ui-denetim/konu-ogrenme/laboratuvar-rapor.json`,
`laboratuvar-canli.json`, `laboratuvar-surum.json` ve aynı dizindeki
`*-laboratuvar-*.png` görüntüleridir. Dosya hash'leri
[kabul manifestinde](../../testler/kanit/matematik-laboratuvari.json) tutulur.
Kaynak ağacında önceden bulunan diğer değişiklikler bu görevin commit'ine alınmaz.

İlgili içerik düzeltmesi: sabit toplamda maksimum çarpım kuralı negatif gerçek
sayılar serbest bırakılınca da geçerlidir; aşağı yönde sınırsızlaşan minimumdur.

## Sonraki kabul

Kullanıcı görsel akışı dener; öğretmen görevleri ve geri bildirimleri inceler.
Öğrencilerle mevcut anlatıma karşı eşit süreli başlangıç/son test ve bir hafta
sonra görülmemiş soruyla aktarım ölçülür. Yardımsız doğruluk, gerekçe ve ipucu
ihtiyacı değerlendirilmeden öğrenme etkisi kanıtlandı denmez; diğer konulara
yaygınlaştırma ayrı karardır. Mevcut kanıtı yeniden çalıştırmadan denetlemek için:
`python scripts/ivme.py kalite durum MAT-LAB-01`.
