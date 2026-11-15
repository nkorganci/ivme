# Hareket v2 içerik devri — 16.04

İçerik taslağı hazırdır; ürün kabulü değildir. Araç kutusu ve sekiz durak son Claude commitinden
(`8a59fe6`) korunmuştur. Ölçme içeriğini GPT-6 Astra tamamladı; Fable veya Opus çalıştırıldığı iddia edilmez.
İlk oturum içerikte durdu. Kullanıcı sonraki talimatla kod aşamasını GPT-6.1 Sol ile yetkilendirdi.

## İçerik dosyaları

- `frontend/src/learn/konu/paketler/arac-kutusu-fizik.js`: yedi ön koşul mikro dersi.
- `frontend/src/learn/konu/paketler/fizik-hareket.v2.js`: sekiz durak; v1 yeniden kullanım bağları ve ölçme paketi.
- `frontend/src/learn/konu/paketler/fizik-hareket.v2.olcme.js`: Y1–Y13 için tanı, deney yönergesi,
  açıklama, gecikmeli sınama; 10 ön/10 son test; 12 tip tanıma ve 12 alıştırma;
  10 karma soru, 13 tekrar kartı. Sorular özgündür; ÖSYM sorusu veya öğretmen onaylı soru değildir.
- Kaynak çerçevesi `fizik-hareket.harita.md`; bu oturum PDF taramadı, yeni soru edinmedi.

## Sonnet için uygulama sınırı

1. V2 henüz kataloğa bağlı değildir. V1'i silmeden şema v2 ve yeni alanların bileşenlerini ekle.
2. Deney yönergelerini hareket stüdyosuna bağla; yönerge metni çalışan deney değildir.
3. Bölümler serbestçe açılır; basamak içi ölçütler ve ölçüm kayıtları korunur.
4. `secenekler` dizilerinde doğru seçenek başta yazılmıştır. Kalıcı seçenek kimliğiyle karıştır;
   cevap ve gerekçeyi seçimden önce gösterme. Test bütün cevaplar kaydedilmeden geri bildirim açmasın.
5. Ön test tanı döngüleriyle ortaktır; son test ayrı yüzeylidir ve derste gösterilmez. İki seçenekli
   maddeler öğretmen denetiminde değerlendirilir; şans etkisi nedeniyle tek başına öğrenme kanıtı değildir.
6. Tip tanıma ve düzeyli set aynı senaryoları kullanır: öğretim alıştırmasıdır, görülmemiş aktarım değildir.
   Tip tanıma turunda sayısal cevabı veren gerekçeyi açma; set sonrası göster.
7. TYT-0910/0912/0913, v1'den devralınan ipucu/çözümlerden ayrılmadan bağımsız ÖSYM ölçümü sayılamaz.
   Kaynak görseli ve basılı anahtarı yeniden doğrulanmadan yeni çözüm veya kabul üretme.
   Daha önce gören öğrenci için bir hafta sonraki görülmemiş soru koşulu ayrıca sağlanmalıdır.
8. Yeni iki tipin banka sayıları `null`; sıklık uydurulmadı. Yeni kaynak görselleri `null` olan
   kayıtlarda yer tutucu/onaylı görüntü üretme; mevcut kaynak kanıtına bağla.
9. Opus ayrı oturumda önce kendi cevaplarını üretir; rubrik, kaynak ve öğretmen kabulü sonra gelir.
   Normalize kazanç hedefi ölçüm değildir; ön=100 için normalize kazanç hesaplanmaz.

## Kontrol

İçerik içe aktarımı, eksik v1 bağları, soru seçenekleri, Y kodları, araç kutusu ve 12 tip kapsamı
yerel Node denetimiyle kontrol edilir. Depo denetimleri: `python scripts/ivme.py plan` ve
`python scripts/ivme.py kontrol`. Bu denetimler öğretmen onayı veya bağımsız fizik denetimi değildir.

Sonuç: 8 durak, 7 mikro ders, 13 yanılgı, 12 tip, 10+10 test maddesi, 10 karma soru ve
13 tekrar kartı bağları geçti. İçe aktarılan içerikte 153 seçenekli soru nesnesi (yeniden kullanılanlar
dahil) tek doğru ve gerekçe yönünden kontrol edildi; örnek sayısal sonuçlar bağımsız aritmetikle
karşılaştırıldı. `plan` ve altı değişen dosya için `kontrol` geçti. Ekran kabulü yapılmadı;
uygulama hâlâ v1'i servis eder.

## Kod pilotu

Kullanıcının model tercihi GPT-6.1 Sol (yüksek): katalog artık `KonuV2` ekranını açar.
Şema `docs/semalar/konu-paketi-v2.schema.json`; saf kurallar `v2Kurallari.js`;
bloklar `v2Bloklar.jsx`; yeni iki-cisim/üç-grafik deneyleri `HareketV2Deneyi.jsx`.
V1 içerik modülü yeniden kullanım ve geriye dönük test için korunur.

- Menüde ön koşullar/araç kutusu en üsttedir; banner aynı sütun genişliğinde yalnız konu adı ve öğretmen kontrolü etiketini gösterir.
- Ön test dahil bütün bölümler önceki bölümü tamamlama koşulu olmadan açılır; bölüm içi etkinlik ölçütleri korunur.
- Son test ön test yapılmadan tamamlanabilir; bu durumda normalize kazanç hesaplanmaz.
- Testlerin cevapları kullanıcı başına v2 yerel anahtarda saklanır; v1 kayıtları taşınmaz. Son test ayrı formdur.
- Kavram kapısı mevcut içerik sorularından üç ardışık doğru ister; yanlışta seri sıfırlanır.
  Temsil soruları doğruya ulaşmadan, örnekler bütün adımlar açılmadan ileri geçmez.
  Durak çıkışındaki sınama ilk turda tamamen doğru değilse yeni tur gerekir; başarısız denemeler saklanır.
- Set için bütün tiplerin cevaplanması ve ilk denemede en az %80 gerekir; yeniden tur açıkça başlatılır.
  Bunlar öğretim alıştırmasıdır; aynı senaryonun yeniden çözümü görülmemiş aktarım sayılmaz.
- Seçenek sırası kalıcı kimlikle karışır. Ön testte geri bildirim yoktur; son testte bütün yanıtlar kaydedilince açılır.
- Çözümlü/tanıma ÖSYM 0910/0912/0913 blokları savunmalı olarak öğretim akışından ayrılır.
  Gerçek soru bağlantıları soru sayfasını açar; önce görmüş öğrenci için görülmemişlik garantisi yoktur.
- Y1 vb. için mevcut fizik deneyleri, Y2 için sıfır noktası kaydırıcısı kullanılır. Yeni deneyler
  mevcut `MotionLab/useLab` motorunda parametrelerle yeniden hesaplanır. Her yönergenin görsel davranışla
  pedagojik eşleşmesini bağımsız denetçi ayrıca incelemelidir.
- Kaynak görseli boş kayıtlara bağlantı üretilmez. Soru tiplerinin boş banka sayıları doldurulmaz.

Doğrulama komutları: `node --test testler/konu-paketi.test.mjs testler/konu-paketi-v2.test.mjs`;
`node testler/konu-paketi-v2-ui.mjs [--mobil]`; `npm run build` (frontend);
`python scripts/ivme.py plan`, `python scripts/ivme.py kontrol`.
UI taraması yalıtılmış Chrome profilinde fixture ilerleme kullanır; gerçek öğrenci ustalığı değildir.
Teknik testler öğretmen onayı/öğrenme etkisi değildir. 16.04 açık kalır: bağımsız fizik/rubrik denetimi,
kaynağın öğretmen kabulü, bütün basamak geçişlerinin pedagojik değerlendirmesi ve öğrenci ölçümü bekler.

Teknik sonuç: v1+v2 testleri 12/12; JSON Schema Draft 2020-12 doğrulaması geçti.
Masaüstü ve mobil taramada 105’er kontrol: boş ekran, yatay taşma, konsol hatası yok;
ön testte cevap sonrası geri bildirim gizli; bölümler arası kilit kullanıcı talimatıyla kaldırıldı.
İlk kimlik sorgusunun giriş öncesi 401’i ve favicon 404’ü dışında içerik isteği hatası yok.
Derleme, plan ve 17 dosyalık depo kontrolü geçti. Yerel izleyici v2 ön yüzünü yayımladı;
1010 üzerinden `Başlamadan önce` ekranı doğrulandı. Uzak push/dağıtım yapılmadı.


## Bağımsız denetim yöntemi

Kullanıcı denetim modelini GPT-6.1 Sol extra high olarak değiştirdi. Yazan oturumun dışında,
önce anahtarı görmeden kendi cevaplarını üreten ayrı denetçi kullanılır. Model adı raporda açık yazılır;
Opus denetimi yapıldığı veya öğretmen onayı alındığı söylenmez.

`node scripts/konu/denetim_paketi.mjs [çıktı-dizini]` mevcut içerikten iki dosya üretir:
`01-kor-sorular.json` ve `02-karsilastirma.json`. İlk dosyada doğru seçenek bayrakları,
cevabı ima eden seçenek kimlikleri, gerekçeler ve hatalı adım işaretleri yoktur; seçenek sırası değişir.
Gerçek soru metni/görseli yoksa denetçi `SOURCE_REQUIRED` der; çözüm uydurmaz.
`manifest.json` hedef commit, soru sayısı ve kör dosyanın SHA-256 değerini kaydeder.
Çıktı varsayılan olarak işletim sisteminin geçici dizinindedir; kaynak dosyaları veya DB değiştirilmez.

Birinci aşama: yalnız kör dosya → denetçinin cevapları kalıcı dosyaya yazılır.
İkinci aşama: kendi cevapları → karşılaştırma anahtarı → içerik/kod → 14 ölçütlü rubrik ve
geçiş/yenileme/yanlış cevap/masaüstü-mobil denetimi. Rapor kaynak commitini ve açık kusurları belirtir;
24/28 altı veya herhangi bir ölçütte 0, yayın kabulü sayılmaz. Kapsama girmeyen kaynak/insan ölçümü
ayrı kalır. Redaksiyon denetimi: `node --test testler/konu-denetim-paketi.test.mjs`.


## Denetim sonrası düzeltme

İlk bağımsız Sol extra high denetimi `468087f` için **19/28, FAIL** verdi.
[Rapor ve düzeltme matrisi](../islemler/hareket-v2-denetim.md) F01–F08 bulgularını izler.
Denetçi 153 kör maddeden 143 kesin çözülebileni anahtarla uyumlu buldu; 8 kökü netleştirme önerdi,
iki kaynak kırpımını ayrıca çözdü. Resmî anahtar/öğretmen kabulü kapanmadı.

Kullanıcı talimatıyla düzeltmeler: her tipte ilk doğru, kalıcı soru/tur durumu,
tahmin → deney → açıklama/gerekçe sırası, ayrı kavram/çıkış havuzları, hareket haritası ve çizgi adları,
tip kartları ve karma tip seçimi, eksik koşullu kökler, Y4/Y5/Y10’a özgü deneyler.
Örneklerde beş aşamalı öğrenci notları alınır; bunlar anlamsal doğruluk olarak otomatik onaylanmaz.
Durak çıkışındaki iki farklı sorunun ilk tur doğruları geçişi belirler; çözümü açmak tek başına yetmez.

Önceki `:v2` pilot verisi silinmez. Bozuk ilk-deneme kayıtlarını kabul saymamak için yeni ölçüm
`:v2:r2` anahtarındadır; her soru ve tur bu kullanıcı anahtarının içindedir.
Yanlışlık, seçim, gerekçe aşaması, kısmi sınıflama ve mikro ders aşaması yenilemede korunur;
açıkça yeni tur başlatmak eski tur kanıtını silmez. Öğrenciye önceki kaydın korunduğu bildirilir.
`testler/konu-paketi-v2-regresyon-ui.mjs [--mobil]` gerçek etkileşimlerle bu regresyonları sınar.
Yeni 24 kavram sorusu ayrı kör kontrolden geçirildi; öğretmen onayı yerine geçmez.


### Her durakta iki nicel doğru

Ara yeniden denetim F04'te nicel kapsam eksiği buldu. `fizik-hareket.nicel.js` her durak
başına iki ayrı yeni soru (toplam16) içerir. `nicel-kontrol` basamak4 kapısı iki ilk doğru olmadan
ilerlemez. Örnek notları doğruluk puanı değildir. Kabul anahtarı `:v2:r3` oldu; eski v2/r2
kayıtları korunur, otomatik kabul taşınmaz. Şema bu havuzu zorunlu tutar; veri ve UI testleri
kavram/örnek/çıkış sorularından ayrı olduğunu denetler. Yeni16 soru ayrıca kör çözdürülür.
