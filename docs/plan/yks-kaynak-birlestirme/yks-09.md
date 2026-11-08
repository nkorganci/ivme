# YKS-09 — Özgün kırpım ve kaynaklı soru kabul paketi

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Geniş kaynak kuyruğunda süren inceleme

`full-question-topics/din/` 1.099 Din sorusunu gerçek MEBİ yapraklarının PDF
içeriğine göre sıralar. 1.185 embedding tekrar kullanım denemesinde yeni çağrı
0; ilk genişlemede eksik 1.066 vektör yerel BGE ile bir kez üretildi. Deneme
sorusunun branşı yalnız basılı tek ders aralığından alınır; birleşik
Matematik/Geometri, Felsefe grubu ve yanlış basılı AYT Fen aralıkları otomatik
alt derse dönüşmez. Sayı uyuşmazlığı bulunan iki Din testi kuyrukta yoktur.

Yerel Qwen kaynak okuması 1.099/1.099 tamamlandı: 245 kaynak satırına bağlı,
710 açık kaynak incelemeli öneri, 128 yanıt incelemesi ve 16 uygun konu yok.
`yks_konu_icerik_incele.py --subject din --scope full` tekrar çalıştırılmaz;
önceden biten 33 pilot okuması aynen yeniden kullanılır. Her yeni sonuçta
soru kökü satırı ve gerçek konu PDF alıntısı bağlanır; geçersiz satır/alıntı,
yetersiz kapsam ve açık kaynak incelemesi ayrı kalır. Model çıktısı soru
kabulü değildir. Ham cache ve RUNNING imleci dosya/DB snapshot'ında korunur;
aynı girdi yeniden modele verilmez. Sonraki bağımsız kontrol GPT-OSS ile
`yks_konu_anlam_kontrol.py --subject din --scope full --from-reviewed-images`
ile yalnız görselleri gerçekten okunmuş 37 kaynak kodunda tamamlandı: 20 destek,
9 konu önerisi yok/geçersiz, 5 yetersiz alıntı, 3 geçersiz bağımsız yanıt.
25 yeni GPT-OSS çağrısı yapıldı, üç pilot cache tekrar kullanıldı. Bu seçimin
tamamlanması bütün 1.099 sorunun semantik kabulü değildir; `inputQuestions`,
`selectedQuestions` ve `entireInputSelected` alanları ayrımı korur. Model lease
nedeniyle Qwen bitmeden ikinci ağır modeli başlatma. Pilot 3 soru/12 eski ID
ve dört gerçek DB testi değişmedi; onları yeniden üretme.

## İki modelin destek kararının son kaynak kontrolü

`actual-topic-support-challenges.json` dört açık kaynak incelemesi içerir.
İbn Sina/el-Kanun sorusunu güncel sağlık hükümlerine bağlayan öneri kapsam
çelişkisidir; cömertlik sorusunun genel Kur’an-kavramları alıntısı ve mülkiyet
sorusunun çalışma/infak alıntısı doğrudan dayanak olarak yeterli değildir.
Bu üç model-destekli öneri incelemede kalır. Ahiretin ebedîliği sorusu için
aynı gerçek MEBİ PDF'nin ilk paragrafı ek kanıt olarak doğrulandı. Ham model
kararları değiştirilmedi; iki modelin anlaşması otomatik kategori kabulü değildir.

`bank-image-text-supplement.json` metni eksik tek banka sorusunun (`sb-83612`)
gerçek görselinden okunmuş karşılaştırma ekidir. Yalnız bu soru önceki 1.094
Din sorusuyla karşılaştırıldı, ek kesin eşleşme yok. İlk toplu raporun beş
kaynak istisnası tarihsel olarak korunur; onların güncel sürümü
`din-question-amendments/` altındadır. Banka metni/cevabı değiştirilmez.

## Kimya kontrollü konu pilotunun gerçek sonucu

BGE ile 1.030 soru için aynı sınav/ders yaprak sırası tamamdır (73 cache,
1.030 yeni yerel vektör). İlk 12 Qwen metin okuması: 6 kaynak alıntısına
bağlı öneri, 4 açık incelemeli öneri, 2 uygun konu yok. Bütün 1.030 okundu
sayılmaz. `--allow-partial-primary` ile yalnız bu 12'sinin bağımsız denetimi
3 destek, 7 geçersiz/yetersiz yanıt ve 2 öneri yok sonucu verdi. `inputQuestions=1030`,
`availablePrimaryQuestions=12`, `selectedQuestions=12`, `entireInputSelected=false`.

`kimya-topic-pilot-actual/report.json` 6, 7, 8. soruların gerçek görsellerini ve
kayıtlı İş Sağlığı ve Güvenliği PDF'sinin 6/7. sayfalarını bağlar. Sorular araç
kullanımı, araç adlandırma ve gerekli araç seçimini ölçer. Çevre kimyası,
ayırma teknikleri ve homojen-heterojen karışımlar şeklindeki model seçimleri
uygun değildir; 7. soruda bağımsız modelin desteği de bunu değiştirmez.
Doğru MEBİ yaprağına üç yayımlanmamış düzeltme adayı kaydedildi; cevap,
soru veya kategori yazılmadı. Eski model çıktıları korunur. Toplu metin okumasına
geçmeden üç gerçek örnekte görsel okuma değerlendirildi: Qwen 1/3 doğru
konu üretti; iki yanıt uygunsuzdu ve cevap üreten yanıt ayrıca reddedildi.
`kimya-topic-vision-pilot/` ham cevapları korur; bu sonuç bütün Kimya için
güvenilirlik kanıtı değildir ve toplu sınıflandırmaya genişletilmez.
Kalan 166 Kimya kaydı da özgün resmî kitap locator’ından eski ID’ye bağlandı;
yeni soru değildir.

## Ajanın başlangıç talimatı

Seçilen görev **YKS-09 / 15.09**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-08 ilgili kapsamın güncel karşılaştırması ve YKS-07 cevap kanıtı.

**Araç/model:** Qwen gerekli kırpımda; GPT-OSS yalnız doğrulanmış zor metinde; ajan istisna kontrolü.

**İlgili mevcut tarif:** [Soru kabulü](../../islemler/pdf-kapsam-uzlastirma.md), [kaynak sözleşmesi](../../sozlesmeler/ortak-etiketler.md).

## Girdiler

- Yalnız yeni ve kaynak cevap kanıtlı soru adayları.
- Özgün soru/anahtar sayfası, kategori izinli listesi ve mevcut kabul araçları.

## Yapılacaklar

1. Soru kökü, tüm seçenekler ve şekillerin tamamını özgün PDF'den kırp; AI ile yeniden çizme veya eksik içerik tamamlama.
2. PDF hash'i, fiziksel sayfa, basılı numara, test/bölüm, bbox, görsel hash'i ve cevap konumunu pakete koy.
3. İki cevap okumasını bağımsız kaynak okumasıyla karşılaştır; aynı model yanıtının tekrarı bağımsız kontrol değildir.
4. Dolu categoryIds/subjectIds/examIds ve v2 ilişki kanıtını hazırla; model önerisini öğretmen onayı yazma.
5. Kesik/eksik/yanlış kapsamlı/uyuşmayan adayları incelemede tut; kaynak anahtarındaki hata sessiz banka cevap değişikliği yaratmasın.
6. Pilot ve tam paketleri sürümle; eski kabulün değişmeyen konumunu yeniden üretme.

## Üretilecek kanıt ve çıktı

- Yayınlanmamış kabul paketleri ve iki cevap okuma raporu.
- Kaynak/görsel/kategori/banka sürümüyle bağlanmış açık sorunlar.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-09/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Her yayın adayı tam özgün görsel, geçerli kaynak cevabı ve doğru ilişkiler taşıyor.
- Anahtarsız veya mevcut soru kabul paketine yeni soru olarak girmiyor.
- Paket hazırlama canlı banka yayını veya öğretmen onayı sayılmıyor.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Canlı yayın yok; yeni cevap/şık/görsel uydurma yok.

## Sınırlı üç soru paketinin yürütücüsü

`python scripts/ivme.py yks adim YKS-09 --scope pilot --resume` yalnız
YKS-08'in 12 eski + üç yeni soruluk kabulünü kullanır. Yeni pakette AYT Din
tarama 8'in 1, 2 ve 4. soruları vardır. İlk iki soru **Tasavvufi Düşüncenin
Oluşumu**, dördüncü **Tasavvufi Düşüncenin Ahlaki Boyutu** yaprağına bağlanır.
Sonuncusu MEBİ'nin yeni konu kimliklerinden biridir; eski bir geniş konuya
otomatik yayılmaz. Önceki 12 Tarih kimliği CSV'ye yeni soru olarak girmez.

`yks-pilot-package.mjs` mevcut `learning-resource-contract.mjs` doğrulayıcısını
kullanır. Kaynak cevap/iki okuma/anahtar konumu, görsel hash'i, beş tam seçenek,
kayıtlı sınav/branş, bağımsız konu desteği ve gerçek soru/PDF alıntısı zorunludur.
CSV ve v2 ilişkiler sürümlü `yks-09/pilot/attempt-NNNN/` dizinine yazılır.
Özgün görsel baytları aynen kopyalanır; öğretmen durumu PENDING, güven LOW,
kapsam CANDIDATE kalır. Bunlar yalıtılmış prova girdisidir; üretim yayını değildir.

Kalan somut iş: YKS-10'da gerçek INSERT_ONLY ön izleme/aktarım/ikinci çalıştırma,
eski soru ve geçmiş koruması, dar kategori kimlikleri, kaynak açılması ve geri
alma kontrolü. Diğer 372 pilot adayı ile tam arşiv bu kabulün dışında kalır.

## Başarısızlık ve geri dönüş

Yalnız aday paket sürümü kullanılmaz; kaynaklar ve banka aynı kalır.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.09 / YKS-09** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
