# Tek site düzeni — 2026-10-11

## Karar

Ürün arayüzü yalnız `uygulama/` içindeki React/Spring uygulamasıdır. Kök `Siteyi Ac.bat` bu uygulamayı başlatır. Eski statik arayüz ve ona özgü testler kaldırıldı.

## Korunan kaynaklar

- `../Kaynaklar/`: özgün PDF, kitapçık, müfredat ve ileride işlenecek belgeler.
- `../veri-hatti/`: soru/PDF verisini yeniden üreten betikler ve dondurulmuş kart eşleştirmeleri.
- `../icerik/data/`: eski statik sitenin veri klasöründen taşınan OGM/çıkmış soru görselleri, kartlar ve indeksler. Bu klasör site değildir; içe aktarma ve görsel sunumu için gereklidir.
- `../takip/`: özgün Excel planı ve doğrulanmış JSON/CSV çıktıları. Uygulama içindeki `frontend/src/data/ilerleme-plani.json` ayrı bir kopyadır; Excel güncellemesi onu otomatik yenilemez.

`ornek-veri` içe aktarma betikleri, yedek betiği ve görsel klasörü bağlantısı yeni `../icerik/data/` yoluna yönlendirildi. Eski statik sitedeki tarayıcı profili kayıtları veritabanına otomatik taşınmaz.

## Doğrulama

- `npm run build` başarılı.
- Değişen Python ve Node betiklerinde sözdizimi kontrolü başarılı.
- `takip/uret.py`: 101/101 doğrulama geçti.
- `veri-hatti/ogm-yks-cikmis/site_veri.py`: 2.592 kayıt / 2.619 soru, hata 0; yeni yolda artık dosya silinmedi.
- `uygulama/veri/resimler-pilot/ogm` bağlantısı `../icerik/data/ogm/img` konumunu gösteriyor.
