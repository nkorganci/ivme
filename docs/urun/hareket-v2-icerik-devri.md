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
3. Her basamağın geçiş ölçütünü planın merdiveninden uygula. Şu an içerik verisi ilerleme kilidi sağlamaz.
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

- Akış: ön test → AK-1…7 → sekiz durak → ilk hamle → düzeyli alıştırma → karma/gecikmeli sınama → son test.
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
ön testte ilk 15 sonraki bölüm kilitli ve cevap sonrası geri bildirim gizli.
İlk kimlik sorgusunun giriş öncesi 401’i ve favicon 404’ü dışında içerik isteği hatası yok.
Derleme, plan ve 17 dosyalık depo kontrolü geçti. Yerel izleyici v2 ön yüzünü yayımladı;
1010 üzerinden `Başlamadan önce` ekranı doğrulandı. Uzak push/dağıtım yapılmadı.
