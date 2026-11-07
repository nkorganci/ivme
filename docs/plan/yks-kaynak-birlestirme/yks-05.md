# YKS-05 — Eski/yeni yollar ve katalog üreticilerinin uyumu

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-05 / 15.05**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-03 dosya kimlikleri ve YKS-04 konu eşlemesi doğrulanmış.

**Araç/model:** Ajan kod geliştirme ve otomatik test; Ollama yok.

**İlgili mevcut tarif:** [API sözleşmesi](../../sozlesmeler/api.md), [ortak etiketler](../../sozlesmeler/ortak-etiketler.md).

## Girdiler

- Kaynak hash/kimliği, eski yollar, katalog ID'leri ve aday taksonomi.
- TopicPdfService/PdfReviewLabels, scriptler, veri-hatti üreticileri ve pipeline/core.py.

## Yapılacaklar

1. Kaynak kimliği → fiziksel konum ve eski referans → aynı kimlik çözümlemesini merkezi hale getir.
2. Uygulama, veri-hatti, soru/kanıt araçları, Excel/taksonomi üreticileri ve pipeline okuyucu/yazıcı bağımlılıklarını listele ve uyumlu kıl.
3. Eski URL, göreli PDF yolu, kaynak scope'u, video/ses ve ZIP iç bağlantılarını koru.
4. Gerçek yol, izinli kök, ../, symlink/reparse-point ve erişim kontrollerini yeni düzende test et; junction'ı tek çözüm sayma.
5. Projeksiyon üretimini sürümlü ortak DB akışıyla tutarlı yap; eski Excel üreticisi MEBİ ağacını ezmesin.
6. Yol değişikliği kaynak hash'i/OCR/embedding anahtarını gereksiz değiştirmesin.

## Üretilecek kanıt ve çıktı

- Bağımlılık ve uyumluluk haritası; merkezi çözümleme kodu/testleri.
- Eski/yeni referans eşdeğerliği ve güvenlik regresyon raporu.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-05/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Eski ve yeni kimlik aynı doğru dosya/bölüme ulaşıyor.
- İzinsiz kök/geçiş açılmıyor; yanlış dosyaya sessiz fallback yok.
- Canlı dosya kökü ve katalog henüz kesilmedi/değiştirilmedi.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Öğrenci geçmişi ve mevcut soru/görseller taşınmaz; canlı kaynak cutover yapılmaz.

## Başarısızlık ve geri dönüş

Uyumlu eski okuyucu/ayar geri seçilebilir; aday yol haritası korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.05 / YKS-05** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
