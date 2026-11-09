# YKS-12 — Yalnız yeni ve cevaplı soruları yayımlamak

**Güncel kullanıcı kuralı:** Hatalı/eksik/uyuşmayan/bulunamayan adayları
`EXCLUDE_NO_RETRY` ile ele; onarım, eksik kanıt arama veya tekrar model/OCR
yapma. Elenenler öğrenci ekranına ve aktarım paketine girmez. Eski açık
istisnalar düzeltilecek bekleyen iş değildir; yalnız kanıtlı seçili küme ve
gerekçeli dışlamalarla ilerle. Güncel seçim `verified-source-selection/`;
önce YKS-07 tamamlanır, diğer aşamalar sonra yürütülür.

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-12 / 15.12**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-11 etkin ve doğrulanmış; YKS-09 paketleri güncel; her partiden önce banka snapshot'ı yenilenmiş.

**Araç/model:** Mevcut doğrulanmış kabul/aktarım araçları; toplu model çağrısı yok.

**İlgili mevcut tarif:** [İçe aktarma](../../islemler/soru-ice-aktarma.md), [atomik kabul](../../islemler/pdf-kapsam-uzlastirma.md).

## Girdiler

- Cevap/görsel/kategori kanıtı tam yeni soru paketleri.
- Güncel banka ve backup, kaynak konumu bağları, bekleyen paketler.

## Yapılacaklar

1. Küçük belirli partiler seç; banka değiştiyse yalnız tekrar/kabul kontrolünü yenile.
2. INSERT_ONLY davranışı ve mevcut atomik kabul araçlarını kullan; soru başlığını eşleştirerek UPSERT etme.
3. Aynı sorunun yeni kaynak konumunu mevcut soru ID'sine bağla; aynı parti iç tekrarları da engelle.
4. Her partide beklenen yeni soru sayısı, doğru cevap/görsel, dolu konu/sınav ilişkisi ve doğru pratik havuzunu doğrula.
5. Yeniden çalıştırma sıfır yeni kayıt üretmeli. Başarısız parti geri alınır; başarılı önceki partiler tekrar işlenmez.
6. Kaynak bazında kabul/yeni/tekrar/anahtarsız/belirsiz sayaçlarını güncelle; kalan adayı tam aktarım diye kapatma.

## Üretilecek kanıt ve çıktı

- Parti kabul/DB işlem raporları, yeni kodlar ve mevcut soruya ek kaynak bağları.
- Banka/pratik görünürlüğü, idempotence ve geçmiş korunması kanıtı.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-12/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Yayınlanan her soru anahtar ve özgün kırpım kanıtlı; önceden mevcut soru yeniden eklenmedi.
- Parti başına beklenen/gerçek delta aynı; eski cevap ve öğrenci ilişkileri korunuyor.
- Tekrar çalıştırma sıfır yeni soru ve kaynak-konum çoğalması üretiyor.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Anahtarsız soruya model cevabı atama, eski soruları/cevapları toplu güncelleme veya geçmişi silme yok.

## Başarısızlık ve geri dönüş

Yalnız başarısız partinin atomik işlemi geri alınır. Öğrenci bağı oluşmuş yeni soruyu silme; geçmişi koruyan telafi/erişim kararı kullan.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.12 / YKS-12** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
