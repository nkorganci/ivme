# YKS-06 — Tek düzenli YKS arşivini hazırlamak

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-06 / 15.06**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-05 okuyucu uyumu, YKS-03 tekilleştirme ve güncel disk bütçesi.

**Araç/model:** Dosya/katalog araçları; model yok.

**İlgili mevcut tarif:** [Ana plan hedef düzeni](../15-yks-kaynak-birlestirme.md).

## Girdiler

- Dört kökün korunmuş envanteri, sahip dosya konumu, eski yol haritası.
- Yeni konu düzeni ve YKS-01 yedek/alan raporu.

## Yapılacaklar

1. Dersler, ortak kapsam, kitaplar, denemeler, taramalar, müfredat ve katalog hedef düzenini hazırla.
2. Çok konulu kitap için tek fiziksel konum seç; konu görünümlerini sayfa aralığına bağla.
3. Kaynak kökenlerini koru; işlenmiş/işlenmemiş için ikinci PDF veya ikinci konu oluşturma.
4. Aynı sürücüde alanı aşan tam ikinci kopya oluşturma. Geçici hardlink immutable kalsın; yedek diye sayma.
5. Aşama manifestini her parti sonrası güncelle; kaynak/hedef mutlak yollarını hedef içinde kaldığı yönünden doğrula.
6. Hazırlık dizinini arşiv taramasından hariç tut; canlı okuyucular henüz eski kökü kullanabilsin.

## Üretilecek kanıt ve çıktı

- Hazırlanmış YKS düzeni/dizin, her kaynak için doğrulanmış hedef manifesti.
- Eski-yeni yol ve köken eşlemesi; hash/alan/bütünlük raporu.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-06/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Her girdi korunmuş hedef veya açık gerekçeli istisnada.
- Aynı içerik gereksiz kategorilere yeniden kopyalanmıyor.
- Canlı dosya kökü değişmeden hazırlık düzeni test edilebiliyor.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Bu aşamada eski kaynak köklerini silme/taşıyarak boşaltma veya DB yayınlama yok.

## Başarısızlık ve geri dönüş

Hazırlık sürümü devre dışı bırakılır; özgün kaynaklar ve kanıtları korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.06 / YKS-06** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
