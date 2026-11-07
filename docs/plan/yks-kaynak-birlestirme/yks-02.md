# YKS-02 — Dört kaynak ve ZIP üyelerinin envanteri — BITTI

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-02 / 15.02**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-01 başlangıç kaydı/yedek/disk bütçesi doğrulanmış.

**Araç/model:** Python/hash/ZIP araçları; model yok.

**İlgili mevcut tarif:** [PDF kapsamı](../../islemler/pdf-kapsam-uzlastirma.md), [veri kaynakları](../../mimari/veri-kaynaklari.md).

## Girdiler

- Ana plandaki dört açık kaynak kökü; MEBİ katalog/envanterleri.
- Mevcut pdf_sources, pdf-source-registry, pipeline pdf_paths ve kaynak sürümleri.

## Yapılacaklar

1. Yalnız dört kökü tara; hedef YKS ve hazırlık/çıktı dizinlerini tekrar girdi yapma.
2. PDF/video/ses/Excel/ZIP/HTML dahil her girdinin boyut, yol, köken ve içerik SHA-256 kimliğini kaydet.
3. URL kimliğini içerik hash'i yerine kullanma; mevcut hardlink/reparse-point kimliklerini ve döngüleri ayır.
4. ZIP üye adını, sınırlı boyutunu, kökenini ve PDF içerik kimliğini güvenli oku; ZIP slip ve sınırsız açılımı engelle; HTML/JS çalıştırma.
5. Mevcut çıkarım/aktarımı içerik kimliğiyle bağla; bozuk, eksik, yarım ve kapsam dışı girdileri gerekçeleriyle tut.

## Üretilecek kanıt ve çıktı

- Sürümlü birleşik dosya/ZIP üye envanteri ve hash/köken eşlemeleri.
- Kapsam, erişim, bozuk/yetersiz girdi raporu.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-02/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Başlangıçtaki her girdi korunmuş kayıt veya açıklanmış kapsam dışı durumda.
- Aynı fiziksel hardlink ve ZIP dışındaki aynı içerik tekrar yeni kaynak sayılmıyor.
- Hiçbir kaynak taşınmadı veya silinmedi.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Dosya adından tekrar kararı veya bütün PDF'ler işlenmiş varsayımı yapma.

## Başarısızlık ve geri dönüş

Yeni envanter sürümü etkinleştirilmez; eski kaynak/kanıtlar korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.02 / YKS-02** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
