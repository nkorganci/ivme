# YKS-07 — PDF/sayfa incelemesi ve cevap anahtarı

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-07 / 15.07**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-02/03 envanter ve kapsam; pilot için YKS-06 hazırlık erişimi. Tam arşiv için ayrıca YKS-10.pilot kabulü.

**Araç/model:** Önce mevcut önbellek/PyMuPDF/OCR; gereken kırpımda Qwen; Gemma yalnız pilot yarar gösterirse.

**İlgili mevcut tarif:** [PDF kanıt hattı](../../islemler/pdf-kanit-hatti.md), [PDF/model sırası](../../islemler/pdf-ve-yerel-model.md).

## Girdiler

- Her benzersiz PDF ve ZIP PDF üyesi, önceki sayfa/çıkarım önbellekleri.
- Test/bölüm/kitapçık kimlikleri, açık cevap tablosu ve ayrı resmî anahtar ilişkileri.

## Yapılacaklar

1. Önce temsilî pilot alt partisini seç; bütün ders/biçim risklerini örnekle. Ana görevi KISMI tut.
2. Geçerli önbelleği kullan; metin katmanı ve sayfadaki raster/vektör soru panellerini değerlendir. Gerekli sayfa/bölgede OCR yap.
3. Soru, test sınırı, ortak öncül, yeniden başlayan numara, anahtar ve basılı/fiziksel sayfayı ayrı kaydet.
4. Aynı PDF veya aynı test/kitapçıkla doğrulanmış ayrı resmî anahtarı bağla. AI çözümü/video tek başına anahtar sayılmaz.
5. Okunamayan/belirsiz sayfayı soru yok diye kapatma; kaynaksız cevabı yeni soru adayı yapma. Anlatım/özet PDF'sini koru.
6. YKS-10.pilot geçince seçilen tam çalışma kapsamında aynı işlerden devam et; geçerli pilot işini tekrar yapma.

## Üretilecek kanıt ve çıktı

- Sayfa kapsam/okunabilirlik raporu, kaynaklı soru ve anahtar gözlemleri.
- Pilot veya tam kapsam ayrı imleçleri; eksik/anahtarsız/belirsiz listeleri.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-07/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Pilot çıktısı tam arşiv sonucu diye sunulmuyor.
- Tam kapsamda her benzersiz PDF ve fiziksel sayfa gerekçeli durumda.
- Anahtar var/yok/belirsiz ayrımı ve soru–test–cevap konumu kanıtlı.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Bankaya yayın yok; bütün PDF görsellerini gereksiz bulut modeline verme.

## Başarısızlık ve geri dönüş

Kaynak baytları korunur; yalnız yeni gözlem sürümü kullanılmaz. Eski geçerli OCR tutulur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Mevcut araçlardan devam

`yks_pdf_on_tarama.py`, `yks_ocr_on_tarama.py` ve `yks_cevap_on_tarama.py
--with-ocr` mevcut içerik/sayfa/model önbelleğini kullanır. Çıktılar
`pdf-on-tarama/` altındadır; kaynakta yazım yoktur. Metinde anahtar bulunmaması,
anahtarın yokluğu değildir. `yks_anahtar_pilotu.py` yalnız bir basılı anahtar
kırpımını yerel Qwen'e okutmuş kanıtı kullanır; model digest/istem/kırpım hash'i
uyuşuyorsa yeniden model çağırma. Tek kaynak pilotunu tam YKS-07 kabulü sayma.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.07 / YKS-07** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.

## Kaydedilmiş devam noktası

Kullanıcı commit edip durulmasını istedi. Yeniden devam talebinde önce
`veri/yks-birlestirme/current.json`, run içindeki `session-checkpoint.json` ve
`pdf-on-tarama/key-cohort/cohort-report.json` okunur.
`yks_anahtar_cohort.py` 20 ders/sınav belgesinde kaynak metnini bağımsız
kırpım OCR'ı ile karşılaştırdı; mevcut Qwen Tarih kanıtı tekrar kullanıldı.
Üç belgede 52 cevap eşleşti; 15 OCR uyuşmazlığı ve iki desteklenmeyen düzen
açık. Bunlar tahminle onaylanmaz veya anahtarsız sayılmaz. Kaynak kırpımı ve
ham OCR önbelleği aynı klasörde tutulur. Pilot ve 07 yürütücüsü henüz tamamlanmadı.

## Bağımsız görsel anahtar çözümlemesi

Kullanıcı devam talebiyle çalışma yeniden açıldı. `yks_anahtar_gorsel.py` yalnız
basılı anahtar kırpımını yerel Qwen'e verir; beklenen cevaplar isteme girmez.
Numara tekrarı, eksik okuma, kesilmiş çıktı ve kaynak/metin uyuşmazlığı kabul
edilmez. Sonuçlar model digest/istem/şema/seçenek/kırpım hash'iyle önbelleklenir.
İlk iki kaynakta tam eşleşme var; kalan kayıtların sonucu ayrı rapordadır.
Kimya örneklerinde son sayfa soruyla bittiği için doğrulanmış ek anahtar
bulunmadan sorular aktarım dışındadır; bu, tüm arşivde anahtar yokluğu değildir.

## Genişletilmiş pilot kanıtı

20 ders/sınav örneğinden 19 belgede 387 basılı cevap iki okumayla doğrulandı.
TYT Kimya tekil PDF'si anahtarsız biter; arşivdeki resmî toplu kitabın ilgili
testine ait iki soru sayfasının **tam gövde metni ve render pikselleri aynı**
olduğu için yalnız o testin ayrı anahtarı bağlandı. AYT Kimya'da aynı başlık
ve test numarası başka soru sürümü içerdiğinden anahtar aktarılmadı.
`yks_ayri_anahtar.py` bu farkı kayıt altında tutar; anahtarsızlık genellenmez.

`yks_pilot_sorular.py` v3 kesir/üs yüksekliğini soru numarası baseline'ından
ayırır; önceki soruya formül parçası taşımaz. Kaynak nüshalarından kırpılan
387 görsel, `yks_pilot_kirpim_kontrol.py` ile 97 gövde sayfasında sınandı:
açık metin satırı sıfır ve her görselin decode edilmiş RGB pikselleri özgün
PDF'nin aynı bbox render'ıyla birebir eşit. Bu teknik bütünlüktür; dar konu
onayı veya grafik anlamı kabulü değildir. 55 grafik ve 7 özel glyph kaydı
inceleme bekler. Deneme/ortak paragraf/taranmış/ZIP/permutasyon pilot kapsamı
açıkken tam YKS-07 BITTI değildir.

## Temsilî pilot kapısı — VERIFIED

`python scripts/ivme.py yks adim YKS-07 --scope pilot --resume` yalnız temsilî
pilot yürütücüsüdür. `yks-07/pilot/attempt-0002/source-key-pilot-acceptance.json`
19 taramada 387, iki denemede ayrı sekiz sütunda 291 basılı cevabı ve on gerçek
risk sınıfını doğrular. Deneme basılı test sayıları alternatif sorular dahil
TYT 125 ve AYT 166'dır; soru numaraları sütunlar arasında karıştırılmaz.
YKS-07 tam arşiv yürütücüsü kabul edilmedi; pilotun VERIFIED olması tam
YKS-07/08/09 veya YKS-10/canlı geçiş kabulü değildir.

Ortak paragraf kanıtı, taranmış sorunun mevcut OCR ile bulunması, gerçek
seçenek permütasyonunda E→B harf değişimi ve ZIP üyesinin aynı bağımsız PDF
hash'i ayrı kayıtlardır. Anahtarsız/tanımlanamayan taranmış soru kabul edilmez.
Sonraki işlem YKS-08/09 pilotunda soru/görsel/dar konu kabulüdür.
