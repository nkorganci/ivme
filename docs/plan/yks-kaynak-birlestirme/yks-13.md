# YKS-13 — Kesin kopya temizliği ve son kapanış

**Güncel kullanıcı kuralı:** Hatalı/eksik/uyuşmayan/bulunamayan adayları
`EXCLUDE_NO_RETRY` ile ele; onarım, eksik kanıt arama veya tekrar model/OCR
yapma. Elenenler öğrenci ekranına ve aktarım paketine girmez. Eski açık
istisnalar düzeltilecek bekleyen iş değildir; yalnız kanıtlı seçili küme ve
gerekçeli dışlamalarla ilerle. Güncel seçim `verified-source-selection/`;
önce YKS-07 tamamlanır, diğer aşamalar sonra yürütülür.

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-13 / 15.13**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-12 partileri ve tüm kapsam/uyum kabulleri doğrulanmış; kalan belirsizlikler açık; yeni yedek ve yazıcı kontrolü.

**Araç/model:** Hash/referans araçları ve ajan son inceleme; model silme kararı vermez.

**İlgili mevcut tarif:** [PDF arşivi ve veri sahipliği](../../mimari/veri-kaynaklari.md), [devir](../../devam.md).

## Girdiler

- Kesin aynı-bayt kopya grupları, korunan dosya ve bütün legacy referanslar.
- Güncel işleme/aktarım raporu, yedek/geri alma kanıtı ve aktif süreçler.

## Yapılacaklar

1. Silinecek her kopyada korunan dosyanın SHA-256/okunabilirlik ve bütün referans karşılığını yeniden kanıtla.
2. Önce geri alınabilir temizlik manifesti hazırla; yalnız adı açık doğrulanmış hedefleri işle. Recursive delete/move öncesi gerçek mutlak yol sınırını kontrol et.
3. Tekrarlanan fiziksel baytları kaldır; tekil işlenmiş PDF, kanıt, cevap dosyası, müfredat veya geçmişi silme.
4. Eski kaynak kökünü ancak bütün dosyalar açıklanmış ve writer/okuyucu bağı çözülmüşse emekliye ayır; kökleri körlemesine silme.
5. PDF/soru/konu/deneme/pratik, eski bağlantı, öğrenci/öğretmen geçmişi ve servis edilen sürümü tekrar kontrol et.
6. Son envanter ve açık soruları yaz; görev tablosu/teknik sözleşmeler/deviri güncelle. Her kapanmış adımı BITTI tut; tamamlanmamış kapsamı kapatma.

## Üretilecek kanıt ve çıktı

- Temizlik ve korunan içerik manifesti, son envanter/kalite/geri alma raporu.
- Gerçek yeni/tekrar/anahtarsız/belirsiz toplamlar ve tek sonraki işlem veya tamamlanma.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-13/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Her silinen bayt için okunabilir aynı içerik, köken/işleme kanıtı ve legacy çözümleme mevcut.
- Kırık referans/kimlik veya sessizce bırakılmış girdi yok.
- Açık kabul varsa genel iş KISMI; bütün koşullar geçtiyse BITTI ve kanıtı kayıtlı.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Benzer dosya veya benzersiz işlenmiş kaynak silinmez; canlı DB eski yedekle ezilmez.

## Başarısızlık ve geri dönüş

Temizlik manifesti ve doğrulanmış bağımsız yedekten dosyalar geri konur; öğrenci/öğretmen kayıtları geriye döndürülmez.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.13 / YKS-13** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
