# YKS-09 — Özgün kırpım ve kaynaklı soru kabul paketi

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

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
