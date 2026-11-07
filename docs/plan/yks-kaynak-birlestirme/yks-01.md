# YKS-01 — Başlangıç kaydı, yedek ve geri dönüş — BITTI

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-01 / 15.01**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-00 doğrulanmış; kapsam ve gerçek çalışma kimliği mevcut.

**Araç/model:** Yedek/durum araçları ve ajan; model çıkarımı yok.

**İlgili mevcut tarif:** [Veri kaynakları](../../mimari/veri-kaynaklari.md), [işletim](../../islemler/uygulama-calistirma-ve-yayin.md).

## Girdiler

- Canlı ivme katalog/banka kimlikleri; pipeline ogm_ders; kaynak kökleri.
- Öğrenci/öğretmen geçmişi ve eşzamanlı yazan süreçler; güncel disk bütçesi.

## Yapılacaklar

1. Güncel katalog, kaynak, soru, cevap, görsel ve geçmiş ilişkilerini sürümüyle kayda al; eski raporu güncel DB sayısı sayma.
2. DB ve geri üretilemeyen karar/kanıt/görseller için yedek al; gizli ayarları rapora yazma.
3. Ayrılmış ortamda geri yüklemeyi doğrula; canlı veriyi eski yedekle ezme.
4. Dosya ve DB yazıcılarını kaydet; gereken geçişte checkpoint'te bekletme ve yeniden başlatma tarifini hazırla.
5. Dört kökün toplam/tekil boyutunu ve çalışma/backup alanını ölç. Tam ikinci kopya sığmıyorsa aynı sürücüde oluşturma; sabit bağlantıyı yedek sayma.

## Üretilecek kanıt ve çıktı

- baseline.json, yazıcı envanteri, disk bütçesi ve yedek manifesti.
- Geri yükleme raporu ve canlı öğrenci verisini koruyan geri dönüş tarifi.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-01/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Yedek yalnız mevcut değil; geri yüklenebilirliği doğrulanmış.
- Korunacak kimlik/cevap/ilişki ölçüleri ve süreç sahiplikleri kayıtlı.
- Yedek/çalışma alanı yeterli; sırf yer açmak için kaynak silinmedi.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Kaynakları yeniden düzenleme; test kaydını ivme içine yazma; geçmiş olayları yeniden oynatma.

## Başarısızlık ve geri dönüş

Bu adım canlı içeriği değiştirmez; yalnız oluşturduğu geçici test ortamını tarife göre kapatır.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.01 / YKS-01** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
