# YKS-00 — Devam ve çalışma altyapısı — BITTI

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-00 / 15.00**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-DOC plan kaydı ve kullanıcının uygulama talimatı.

**Araç/model:** Görevi yürüten ajan; Ollama/model çıkarımı yok.

**İlgili mevcut tarif:** [Test/devir tarifi](../../islemler/test-ve-devir.md).

## Girdiler

Gerçek kabul: `python scripts/ivme.py kalite calistir YKS-00` 14/14 PASS;
`yks baslat`, `yks adim YKS-00 --resume` ve `yks dogrula YKS-00` başarılı.
İkinci adım çalıştırması `reused=true`; kaynak yazımı/model çağrısı sıfır.
Runtime `veri/yks-birlestirme/current.json` üzerinden bulunur. Aşağıdaki maddeler
tamamlanan işin kabul sözleşmesidir; aynı girdide yeniden geliştirme yapma.

- Ana plan, görev tablosu, devir ve kullanıcı kapsamı.
- Mevcut ivme.py, kalite profilleri ve pipeline iş/kilit sözleşmeleri.

## Yapılacaklar

1. Kaydedilmiş planı yeniden üretme; eksik görev kartı veya bağlantıyı tamamla.
2. Mevcut komut girişine YKS durum/plan/adım-doğrulama/devam araçlarını, yalnız gereken kapsamda ekle; henüz olmayan komutu varmış gibi kullanma.
3. Run kimliği, adım/alt kapsam, giriş snapshot'ı, çıktı hash'leri, imleç, olay günlüğü, süreç kilidi ve atomik durum yazımını kur.
4. Kaynak DB kayıtları ve mevcut pipeline işleriyle ilişki kur; paralel konu/kaynak doğruluk deposu oluşturma.
5. Tamamlanmış girdi aynıysa işi atlama, bozuk/yarım çıktı ve eski kanıt, kesinti/ölü kilit için anlamlı araç testlerini ekle.

## Üretilecek kanıt ve çıktı

- Gerçek kullanım/yardım komutları; çalışma durumu ve rapor şeması.
- Veri taşımadan çalışan araç testleri ve sonraki YKS-01 devam talimatı.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-00/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Var olmayan komutlar reddediliyor; durum gösterimi iş başlatmıyor.
- İkinci yürütme tamamlanmış işi çoğaltmıyor; kesinti sonrası yalnız eksik iş dönüyor.
- Kaynaklara, gerçek öğrenci DB'sine ve Ollama çıkarımına dokunulmadı.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Kaynak tarama/taşıma/silme, katalog yayını ve soru aktarımı bu adımın işi değildir.

## Başarısızlık ve geri dönüş

Yalnız bu işe ait araç/belge değişiklikleri geri alınır; oluşturulan denetim izi korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.00 / YKS-00** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
