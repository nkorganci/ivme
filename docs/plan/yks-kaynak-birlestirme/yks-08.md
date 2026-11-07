# YKS-08 — Bankadaki ve yeni partideki soru tekrarları

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-08 / 15.08**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-07 ilgili pilot/tam çıktısı, YKS-04 konu kimlikleri ve güncel banka snapshot'ı.

**Araç/model:** Kesin hash/metin/seçenek araçları; BGE-M3 aday, Qwen belirsiz görsel karşılaştırma.

**İlgili mevcut tarif:** [Kapsam ve tekrar kabulü](../../islemler/pdf-kapsam-uzlastirma.md).

## Girdiler

- Cevap kanıtı olan soru adayları; canlı banka, ham çıkarımlar ve bekleyen paketler.
- Kaynak sayfa/bbox, özgün görsel, tam kök/seçenek ve cevaplar.

## Yapılacaklar

1. Mevcut banka, önceki ham aday/kabul paketleri ve yeni parti içinde karşılaştır.
2. Tam görsel hash'i ve kaynak kimliğini kullan; metin normalizasyonunda sayı/formül/noktalama/seçenek anlamını kaybetme.
3. Seçenek sırası değiştiyse içerik/harf eşlemesini doğrula; aynı konu veya pHash/BGE skoru tek başına tekrar değildir.
4. Aynı soruya yeni kaynak konumu bağlamayı öner; eski soru ID'sini/cevabını ve geçmişini silme/değiştirme.
5. Sonucu mevcut/yeni/varyant/belirsiz/cevap eksik diye ayır. Banka değişmişse yalnız karşılaştırma kanıtını yenile.
6. Pilot ve tam kapsamı ayrı doğrula; yeni partinin kendi iç kopyalarını da say.

## Üretilecek kanıt ve çıktı

- Banka snapshot'ına bağlı tekrar/eşleme ve yeni soru aday paketi.
- Varyant, cevap uyuşmazlığı ve belirsiz bağ inceleme listesi.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-08/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Mevcut soru yeni kodla yeniden eklenmeye aday değil.
- Benzer ama farklı soru atılmıyor; seçenek permütasyonu ve cevap uyuşmazlığı açık.
- Kaynak/soru geçmişi korunuyor ve kanıt güncel bankaya bağlı.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Bu adım soru INSERT/UPSERT yapmaz; eski kopya soru ID'lerini geriye dönük birleştirmez.

## Başarısızlık ve geri dönüş

Aday eşleme sürümü kullanılmaz; canlı banka/yanıtlar değişmez.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.08 / YKS-08** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
