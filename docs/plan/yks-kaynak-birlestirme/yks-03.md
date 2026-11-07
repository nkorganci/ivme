# YKS-03 — Kesin PDF kopyası ve aktarım kapsamı

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-03 / 15.03**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-02 geçerli tam envanter.

**Araç/model:** Kesin karşılaştırmada kod; yalnız belirsiz benzerlik adayında BGE-M3/Qwen.

**İlgili mevcut tarif:** [Kaynak kapsamı ve kabul](../../islemler/pdf-kapsam-uzlastirma.md).

## Girdiler

- İçerik hash'leri, bütün kaynak yolları ve mevcut banka/sayfa bağları.
- İşlenme kararlarının kanıt/sürüm kimlikleri.

## Yapılacaklar

1. Aynı hash'li dosyaları tek kaynak kimliğine bağla; bütün kökenleri koru.
2. Benzer baskı, cevap eki, bölüm PDF'si ve tam kitabı kesin kopyadan ayır.
3. Dosya bütünlüğü, sayfa incelemesi, cevap kanıtı ve banka aktarımı için ayrı ölçüler çıkar.
4. Kısmi aktarımda kalan sayfa/soru/inceleme kaydını göster; eşleşen birkaç sorudan tamlık çıkarma.
5. Yalnız aynı-bayt kopyalar için sonraki temizlik önerisi hazırla; henüz silme.

## Üretilecek kanıt ve çıktı

- Kesin kopya grupları, korunacak kaynak ve tüm alternatif yol eşlemeleri.
- Kısmi/tam/belirsiz işlenme kanıtı ve kalan kapsam raporu.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-03/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Benzer dosya otomatik silinecek gruba girmiyor.
- Tam aktarım kararı yalnız tüm kapsama ait geçerli kanıtla veriliyor.
- Tekrar tespiti soru bankasını veya kaynak dosyalarını değiştirmiyor.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

İşlenmiş benzersiz PDF silinmez; tarihsel soru ID'leri birleştirilmez.

## Başarısızlık ve geri dönüş

Yalnız aday raporu sürümü değişir; özgün baytlar ve canlı DB korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.03 / YKS-03** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
