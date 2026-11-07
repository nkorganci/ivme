# YKS-04 — MEBİ konu ağacı ve mevcut kimlik eşlemesi — BITTI

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-04 / 15.04**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-02 envanteri ve YKS-01 güncel katalog snapshot'ı; önerilen sırada YKS-03 de okunur.

**Araç/model:** BGE-M3 aday arama, Qwen öneri, zor metinde GPT-OSS; ajan son kontrol.

**İlgili mevcut tarif:** [Ortak etiketler](../../sozlesmeler/ortak-etiketler.md), [tek veri kaynağı](../../mimari/veri-kaynaklari.md).

## Girdiler

- MEBİ ders/ünite/üst-alt konu kimlikleri ve kaynakları.
- Mevcut DB kategori kimlikleri, Excel satırları, dağılımlar, alias/counterpart ilişkileri.

## Yapılacaklar

1. Her mevcut YKS konusunu MEBİ'ye karşı 1:1, geniş/dar, birleşme/bölünme veya karşılıksız diye sınıflandır.
2. Ad/sıra değişikliğinde mevcut id'yi koru, eski adı alias yap; soru/öğrenci/öğretmen ilişkilerini kaybetme.
3. Ortak TYT–AYT içeriği tek tut; gereken eski sınav kimliklerini counterpart/uyumluluk ilişkileriyle koru.
4. MEBİ'de Matematik altında geçen geometriyi, felsefe alt alanlarını ve ortak kapsamı başlık benzerliğiyle zorla birleştirme.
5. Yeni bakım kaynağı/üretici akışını tanımla; Excel dağılım ve tarihsel kanıtını koru. KPSS/LGS/YDT/yurt dışı kategorilerini değiştirme.
6. Kesin eşleşmeyen ve mevcut onayı etkilenen kayıtları incelemeye ayır; model skoruna onay deme.

## Üretilecek kanıt ve çıktı

- Eski id → tercih edilen konu/sıra/alias/kapsam eşleme paketi ve etki raporu.
- Sürümlü aday taksonomi; yayın yapılmadan kimlik/ilişki kontrolleri.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-04/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Her eski YKS id korunmuş veya açıklanmış bir eşlemeye sahip.
- Ortak içerik çoğalmıyor; diğer sınav kimlikleri aynı kalıyor.
- Belirsiz birleşme/bölünme eski ilerlemeyi otomatik taşımıyor.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Canlı current_run yayınlama; üretilmiş JSON'u elle değiştirerek kalıcı kaynak yaratma.

## Başarısızlık ve geri dönüş

Aday sürüm etkinleştirilmez; yayımlanmış katalog ve eski kimlikler korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Mevcut araçlardan devam

`ivme.py yks adim YKS-04 --resume` güncel katalog snapshot'ı ve MEBİ ağaç adayı
üretir. Kabul edilen politika bütün eski tanım/kimlikleri aynen korur; belirsiz
kapsamı yeni bir konuya eşdeğer saymaz. `readyForPublication=false`, bu adımın
canlı yayın yapmadığını ve YKS-05–10 bağımlı kabulünü beklediğini belirtir. Branşın
kaynak ünite kuralı `scripts/yks_taxonomy.py` içindedir; bilinmeyen yeni üniteyi
zorla sınıflandırma. Eski geniş kapsamdan bütün alt başlıklara ustalık yayma.
Güncel aday ve korunan/inceleme kapsamları görev tablosu/etki raporundan okunur.
Eski onay parmak izlerini bozan salt sıra/görünüm değişikliğini kategori tanımına
yazma; ayrı MEBİ gezinme paketi ve aynı ortak DB yayın sürümü kullanılır.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.04 / YKS-04** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
