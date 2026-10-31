# TAS-08: bölme ve bölünebilme pilotunun kabulü

Durum: **otomatik teknik kabul geçti; öğretmen incelemesi ve öğrenci aktarım gözlemi açık**.
Bu kayıt [12.12](../plan/12-icerik-ve-yayin.md#1212--tas-08-kaynaklı-öğretim-pilotu)
ve [öğretim sözleşmesinin](konuyu-ogrenelim.md) ekidir. Pilotun çoğaltılmasına
pedagojik onay vermez. Gerçek öğrenci DB'sine test cevabı yazılmaz.

## Kaynak ve kapsam

Ana kaynak, MEB Matematik 9 tam ders kitabının Denklemler ve Eşitsizlikler bölümüdür
(2017–23 programı; fiziksel PDF sayfaları 88–96, 106–107). Bu sürüm güncel müfredat
ilanı değildir. Sınav kapsamı ortak katalogdaki TYT/AYT konu kimliklerinden gelir;
kitap, matematiksel tanım ve gerekçelerin kaynağıdır. Pilotun sekiz bölümü de ortak
temeldir; gerçek AYT örneği kullanılması bölümü yalnız AYT kapsamına geçirmez.

`icerik-hatti/gorevler/bolme-bolunebilme.json` seçilmiş 11 iddianın blok kimliklerini, bölüm bağlarını
ve incelenmiş soru görsellerinin hash'lerini tutar. TAS-09 [içerik hattı](../islemler/icerik-hatti.md)
TAS-07 paketini doğrulayarak `frontend/src/learn/content/kanit/bolme-bolunebilme.json`
çıktısını üretir: kitap hash'i, fiziksel sayfa, blok/bbox/metin hash'i, bölüm,
soru görseli ve kaynak kitapçık hash'i, sınav/yıl/arşiv konumu, çözüm hash'i/sürümü.
Üretilmiş JSON elle değiştirilmez. Kaynak bağlantıları her bölümde açılabilir.

2/5/10/25 kuralları, kalanlarla işlemler ve kuvvet döngüsü gibi genişletmeler
pakette özgün türetim olarak belirtilir; kitaptan birebir alınmış anlatım sayılmaz.
Etkileşimli şekillerin sayıları `bolme-pilot.test.mjs` içinde bağımsız hesapla sınanır.

| Rol | Soru | Kaynak / bölüm | Çözüm kontrolü |
|---|---|---|---|
| Rehberli | AYT_Sayisal-0014 | 2020 AYT, s1b | Bütün rakam çiftleri, bölme eşitliği ve kalan sınırı; D · 11 |
| Rehberli | TYT-0593 | 2021 TYT, s3b | İki yerleşim ve bütün rakam çiftleri; A · 7 |
| Bağımsız aktarım | TYT-0592 | 2020 TYT, s1b | Bütün üç basamaklı sayılar; 936−213=723, A |
| Bağımsız aktarım | TYT-0597 | 2024 TYT, s2b | Bütün üç basamaklı sayılar; tek aday 621, çarpım 12, B |

Sonuçlar mevcut cevap anahtarıyla karşılaştırılır; ayrıntılı çözümler İvme'nin
özgün türetimidir. `teacherApproved=false`, `studentTransferObserved=false`.
Kaynak/hesap kontrolü öğretmen onayı yerine geçmez.

## Teknik kabul ve sınırlar

| Ölçüt | Kanıt / sonuç |
|---|---|
| Ana kaynak, bölüm ve çözüm güncelliği | `ivme.py icerik kontrol bolme-bolunebilme`: 8 bölüm, 11 iddia, 4 kaynaklı soru; hash kontrolü geçti |
| Matematik, şekil ve soru tekilliği | `tas08-pilot.test.mjs`, `bolme-pilot.test.mjs`, `konu-ogrenme-ortak-set.test.mjs`: 20/20 geçti |
| Sekiz bölümün arayüzü | `konu-ogrenme-ui.mjs bolme-bolunebilme --duzey`: masaüstü/mobil, üç düzey, yanlış/doğru geri bildirim ve kaynak sayfaları; taşma/konsol/istek hatası yok |
| Bağımsız aktarımın ortak çözüm ekranı | `konu-ogrenme-ortak-set-ui.mjs --pilot`: masaüstü/mobil; cevap öncesi ve ilk yanlışta çözüm saklı, doğru cevaptan sonra adımlar/kaynak açılır; okumak yeni cevap üretmez; yeniden çalışınca çözüm saklanır |
| Temel kavramlar regresyonu | Aynı UI betiğinin normal modu: masaüstü/mobil, 12 test/52 çıkmış soru, yeni sekme bağlantıları, hata ve aynı istekle yeniden deneme geçti |
| Tam ders akışı | `konu-ogrenme-ui.mjs bolme-bolunebilme`: masaüstü/mobil sekiz bölüm, 28 ders olayı ve mevcut altı soruluk ustalık akışı; hata/taşma yok. Bu, geniş havuzun içerik onayı değildir |
| Yerel sunum | İzleyici yeni paketi sundu; izleyiciyle aynı Windows PowerShell ortamında kaynak/yayımlanan paket parmak izi eşit, HTTP ve yerel `app-version.txt` aynı. Oturum açıldıktan sonra canlı konu ve TYT-0597 sayfalarında hata/taşma yok |
| DB kaydı, konu sayımı ve kesinti | Değişmeyen ortak PRATIK ve öğrenme sözleşmesinin TAS-01/04/05 test kanıtı geçerlidir; [görev tablosu](../gorev-durumu.md). Bu çalışmadaki UI testleri bellekte sahte API kullanır; yeni gerçek DB testi sayılmaz |

Konu testi yalnız **iki açıklamalı bağımsız aktarım sorusu** seçer. Öğrencinin
gizlediği veya bankada bulunmayan soru yerine incelemesiz soru eklenmez; görünen
adet gerçekten kurulabilecek adettir. Bu iki soru rakam koşullarını ölçer;
11 kuralı, bileşik bölenler ve kalan döngülerinin bağımsız ölçümü tamamlanmış değildir.
Geniş çıkmış soru havuzu ve mevcut ustalık akışı bu dört soruluk incelemenin
dışındadır. Rehberli sorular mevcut `practiceIds` ile ustalık seçiminden dışlanır.

Arayüz kabulünde iki test kurulum hatası giderildi: sahte soru yanıtına gerçek
API'deki `helpfulness` ve karalama durumu eklendi; düzey seçiminin kayıt onayı
beklenmeden kilitli sorgulama düğmesine tıklanması engellendi. Uygulamadaki çözüm
kaynak satırı API'nin `year` alanını okur; kaynak metni ile bağlantı aralıklı gösterilir.

Genel canlı sayfa denetiminde giriş öncesi isteklerin 401 yanıtları ilk çalıştırmayı
başarısız gösterdi. Giriş tamamlandıktan sonra aynı sayfalar salt okunur denetlendi;
konsol/istek hatası yok. Sunum parmak izi izleyicinin kullandığı Windows PowerShell
ile hesaplanır; farklı PowerShell sürümlerinin dosya sıralaması aynı varsayılmaz.

## Tekrarlanabilir denetim

```powershell
python scripts/ivme.py icerik kontrol bolme-bolunebilme
node --test testler/tas08-pilot.test.mjs testler/bolme-pilot.test.mjs testler/konu-ogrenme-ortak-set.test.mjs
```

Yerel kaynak eksikse veya bilinçli içerik değişikliği yapıldıysa `python scripts/ivme.py icerik calistir bolme-bolunebilme`
kaynağı indirir/paketler ve yalnız değişen aşamaları çalıştırır; kanıt ve manifest farkı incelenir.
Commit denetimi pilot girdileri değiştiğinde `icerik-hatti.test.mjs` ve konu testlerini çalıştırır.

İzleyicinin paketini değiştirmeden UI denetimi:

```powershell
Push-Location frontend
node node_modules/vite/bin/vite.js build --outDir ../veri/ui-denetim/tas08-dist
Pop-Location
$env:IVME_TEST_DIST = Join-Path (Get-Location) 'veri/ui-denetim/tas08-dist'
python scripts/ivme.py ui konu-ogrenme-ortak-set-ui --pilot
python scripts/ivme.py ui konu-ogrenme-ui bolme-bolunebilme --duzey
python scripts/ivme.py ui konu-ogrenme-ortak-set-ui
```

## Kalan kabul

Sıradaki somut adım: öğretmen, sekiz bölümün kaynak bağlarını ve dört özgün soru
görseli/çözümünü inceleyerek düzeltme veya kabul kararını kaydeder. Ardından daha
önce bu çözümleri görmemiş öğrenciyle TYT-0592 ve TYT-0597 üzerinden gözlem yapılır.
Öğrenci önce ipucu/çözüm açmadan kendi gerekçesini yazar; ilk cevap, seçtiği yöntem,
takıldığı adım ve yardım alıp almadığı kaydedilir. Sonradan gösterilen çözümle gelen
doğru cevap bağımsız başarı sayılmaz. Kimlik gerektirmeyen gözlem özeti yeterlidir.

Kabul kaydında inceleyen kişinin rolü, içerik sürümü/hash'i, incelenen bölüm/soru,
bulgu ve karar bulunmalıdır. Öğrenci gözleminde ilk deneme ile yardım sonrası sonuç
ayrı tutulmalıdır. Bu girdiler olmadan kabul alanları `true` yapılmaz ve TAS-08
tamamlandı sayılmaz. İki soruluk gözlem bütün konuya genellenmez; tüm konu için
bağımsız ölçüm istenirse eksik soru tipleri ayrıca kaynaklı çözümlerle genişletilir.
