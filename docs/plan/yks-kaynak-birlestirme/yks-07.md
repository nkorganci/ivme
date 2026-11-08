# YKS-07 — PDF/sayfa incelemesi ve cevap anahtarı

**Tam belge okuması — BITTI:** `e33b5672c0fb…` Edebiyata Giriş özetinin
iki sayfası bütünüyle görsel okundu. Tek soru panelinde kaynak cevabı/çözüm
veya işaretli seçenek yoktur; beş seçeneğin kaynak rengi de aynıdır. Soru yeni
alıma uygun değildir, özet belge korunur. Bu sonuç yalnız bu iki hash bağlı
PDF sayfasına aittir; başka kaynaktaki anahtarın yokluğu veya sorunun bankada
bulunmadığı söylenmez. Kaynak klasörünün genel konusu soruya otomatik taşınmaz.
Kanıt `new-source-discovery/explicit-document-review.json`.

**Din kitabı anahtar/gövde alt işi — BITTI (teknik hazırlık):** 22 bölümün
647 basılı cevap hücresi native/Qwen ile bağımsız doğrulandı. Kaynakta 643
soru gövdesi var; 20 bölümde 586 soru-cevap bağı ve özgün RGB kırpımı tamdır.
AYT test5 gövde25/anahtar27 ve TYT test10 gövde32/anahtar34 uyuşmazlıkları
nedeniyle bu iki testteki **57 gövdenin tamamı** aktarım dışında; ilk cevaplar
bile onaylanmadı. Dört fazla hücre için soru üretilmedi. TYT test1'de basılı
26/25 yer değişimi görsel okundu; cevaplar fiziksel sıra yerine basılı numaraya
bağlandı. Çıkmış soru konu şeritleri özgün görsele dahil, soru metninden ayrı
kanıttır; dar konu onayı sayılmaz. `new-book-keys/din/`, `new-book-bodies/din/`
ve `new-book-comparison/din/`: 586 soru bütün güncel bankayla karşılaştırıldı;
henüz yeni soru kabulü yok. Yeni OCR çağrısı 0.

**3 Adım Türkçe sayfa eşitliği — BITTI; soru sürüm incelemesi sürüyor:** İki
283 sayfalık nüshanın 281 sayfasında tam native metin ve 180/330 DPI RGB
pikselleri birebir aynıdır. Yalnız sayfa30 soru7 gövdesi ve sayfa280'deki
Yazım Kuralları-1 / **3. Adım / soru1** cevap hücresi değişmiştir (eski E,
yeni D); iki gerçek görsel okunmuştur. 2. Adım satırına yanlış bağlanmaz.
`source-page-equivalence/3adim-turkce/` kanıtı eski tamamlanan/pending işlemleri
sayfa bazında tekrar kullanmak içindir; iki PDF'nin eşitliği veya cevapların
toplu kabulü değildir. Eski kaynak/ID/cevap korunur, değişen iki bölge ayrı
incelenir. Önceki 1.397 ham kartın hepsi canlı bankada sayılmaz.

**Kalıcı parti kaydı — BITTI:** PostgreSQL `ogm_ders.yks_evidence` checkpoint
`e531f3e7ca39ae556768f520a0e4dd7bf4430d3c38d3bfa66f25d3b9eb43f7d4`
4.086 kaynak, 192.461 sorgulanabilir kayıt, 66.385 dosya konumu ve 65.746
farklı ham dosya içerir. 1.730.284.557 baytın tamamı geri okunup SHA-256
eşitliği doğrulandı; aynı checkpoint ikinci yazımında yeni INSERT 0.
Kalite 105/52/17/18 = 192 test PASS. Yalnız pilot 07–10 tekrar VERIFIED;
tam aşamaların veya canlı geçişin kabulü verilmedi.

**Deneme gövdesi alt işi — BITTI (teknik hazırlık):** `yks_deneme_govde.py`
46 kaynağın tamamını kaydetti. Dört kimlik/anahtar istisnası ve zlib bozukluğu
olan bir PDF dışarıda; 41 sağlam denemenin **5.863 sorusu** dört ayrı basılı
bölüm kimliğiyle, eksiksiz numara sırası ve özgün RGB piksel kanıtıyla hazır.
Konu/branş, görsel anlam ve tekrar kabulü bu sonuçtan ayrıdır. Kapak/yönergeler
ayrı gözlem olarak korunur; bunlara soru yokluğu veya içerik onayı yazılmaz.

Sayfa aşan 35–36 ortak paragrafı iki soruya aynı özgün bölgeden bağlanır.
Sütun başında devam eden satır/şekiller önceki sol soruya eklenir. İki kimya
formülünde `CH3` ve karbonil `O` doğru sonraki sorunun üst bölgesine alındı;
bu parçalar önceki sorunun görselinden çıkarıldı. Alternatif Din/Felsefe
yönergesi ayrı kaynak bölgesi olarak ilgili sorulara bağlanır. Altı sorunlu
bölgenin özgün görüntüleri ajan tarafından okundu; bir boş bölüm sayfası ve
başlıksız bir geometri sayfası kaynak hash'iyle açık kanıta bağlandı. Çıktı
`full-mock-bodies/`; üç yerel PDF süreci, yeni OCR/model 0, canlı soru yazımı 0.

**Edebiyat ayrı anahtar alt işi — BITTI:** AYT-3 ve AYT-12'nin yanlış
numaralı özgün anahtarları korundu. Resmî kitaptaki doğru testin bütün gövde
sayfaları native metin ve hem 180 hem 330 DPI RGB olarak birebir eşit;
kitabın doğru anahtarında 40 cevap bağımsız Qwen okumalarıyla uyuştu.
Test-3'te yalnız görsel olarak okunmuş yayın başlığı şeridi dışarıdadır;
hiçbir native soru satırı atılmaz. Test-12'nin önceki 144 DPI karşılaştırmasındaki
66 kenar pikseli farkı eski kanıtta kalır; iki yeni çözünürlükte tam eşitlik
ayrıca kanıtlandı. Çıktılar `rebound-literature-keys/` ve
`full-question-rebound-crops/`. Toplam **270 tarama / 5.061 cevap**, 66 açık
tarama istisnası. Yeni 40 sorunun banka kontrolü 39 mevcut aday/1 inceleme;
genel tarama karşılaştırması 3.036 mevcut aday/1.948 içerik incelemesi/77 fark.

**Çoklu anahtar alt işi — BITTI:** Fizik TYT-4'ün yedi test içeren son
sayfasında yalnız basılı test-4 bölgesi seçildi. 41 cevap native/Qwen okumasında
eşit; gövdede 1–41 tam sıra, beş seçenek, özgün kırpım pikselleri ve sıfır açık
satır PASS. `full-key-scan/multi-test-key/` ve `full-question-multikey-crops/`
kanıttır. Toplam 268 tarama kaynağı / 5.021 cevap; 68 tarama istisnası kalır.

**Etiket incelemesi alt işi — BITTI:** 21 uyarılı denemeden 20'sinin 30
sayfasında yalnız ActualText/parent-tree etiket uyarısı var. Görünen glyph
konumları `TEXT_IGNORE_ACTUALTEXT` ile ayrı kaydedildi; önceki alternatif
metin korunur, özgün 150 DPI render hash'i birebir eşittir. Kaynak PDF
onarılmadı; semantik metin/gövde kabulü verilmedi. `mock-tag-review/` çıktısı
gövde çıkarıcısına gerekli bayrağı gösterir. f8bbb5b413ae… sayfa29 zlib
bozulması açık kalır; görüntünün okunur görünmesi veri tamlığı kanıtı değildir.

**Yeni tamamlanan alt iş — BITTI:** Altı açık gövde istisnasının 94 basılı
cevabı native kaynak ile bağımsız Qwen anahtar kırpımı okumasında tam uyuştu.
`yks_istisna_anahtar.py` kaynak hash'i, basılı sınav/test/branş ve açıkça
incelenmiş gövde istisnasını yeniden bağlar. `yks_istisna_kirpim.py` 94 soruda
özgün RGB piksel eşitliği ve sıfır açık gövde satırı sağladı. İki sütun devamı
yalnız özgün bölgeler ve beyaz aralıkla birleştirilir; yan sorunun gövdesi alınmaz.
Çıktılar `full-key-scan/body-exception-keys/` ve `full-question-exception-crops/`;
toplam 267 tarama kaynağı / 4.980 cevap. Banka karşılaştırması ve içerik/dar konu
kabulü ayrıdır; tam YKS-07 henüz BITTI değildir.

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
pilot yürütücüsüdür. `yks-07/pilot/attempt-0007/source-key-pilot-acceptance.json`
19 taramada 387, iki denemede ayrı sekiz sütunda 291 basılı cevabı ve on gerçek
risk sınıfını doğrular. Deneme basılı test sayıları alternatif sorular dahil
TYT 125 ve AYT 166'dır; soru numaraları sütunlar arasında karıştırılmaz.
YKS-07 tam arşiv yürütücüsü kabul edilmedi; pilotun VERIFIED olması tam
YKS-07/08/09 veya YKS-10/canlı geçiş kabulü değildir.

Ortak paragraf kanıtı, taranmış sorunun mevcut OCR ile bulunması, gerçek
seçenek permütasyonunda E→B harf değişimi ve ZIP üyesinin aynı bağımsız PDF
hash'i ayrı kayıtlardır. Anahtarsız/tanımlanamayan taranmış soru kabul edilmez.
Sonraki işlem YKS-08/09 pilotunda soru/görsel/dar konu kabulüdür.

## Tam arşivin ilk anahtar fazından devam

YKS-10/pilot gerçek DB provasını geçti. Tam 07 yürütücüsü henüz kabul edilmez;
önce aşağıdaki kanıt hazırlayıcıları kullanılır:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_anahtar_taramasi.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_anahtar_gorsel.py
```

İlk araç bütün 4.086 PDF envanterinden, MEBİ tarama konumundaki 336 tekil
PDF'yi seçer; aynı PDF'nin OGM kanonik yolunu ve MEBİ alias'ını ikinci kaynak
saymaz. 19 pilot kaynak okuması korunur. Native/OCR fazı tamamlandı:
42 belgede 778 cevap doğrulandı; 197 OCR uyuşmazlığı, 93 desteklenmeyen/ayrı
anahtar düzeni, üç test kimliği çelişkisi ve önceden bilinen bir farklı Kimya
sürümü açık. Diğer **3.750 PDF düzeni** bu okuyucunun dışında ve açık kalır.

İkinci araç yalnız soru numarası ve beş seçeneği tam, test/branş kimliği sağlam
191 anahtar kırpımını Qwen'e okutur. Beklenen cevaplar isteme girmez. İlk beş
okuma kaynakla tam uyuştu; kalan imleç
`pdf-on-tarama/full-key-scan/visual-resolution-report.json`, birleşik kaynak
kanıtı `resolved-key-scope-report.json` içindedir. `--limit` yalnız yeni çağrıyı
sınırlar; `--cached-only` yeni model çağrısı yapmaz. Native faz ikinci geçişi
336 önbellek/0 yeni OCR; görsel ikinci geçişi 0 yeni model ile doğrulandı.
İstatistik/imleç değişikliği sağlam kaynak kanıtını eskitemez; basılı cevap
veya gövde kanıtı değişirse önceki okuma yeniden kullanılmaz.

**Somut kaynak çelişkileri:** Edebiyat AYT 12'nin soru sayfaları 12, anahtarı
11; Edebiyat AYT 3'ün soruları 3, anahtarı 2; Din TYT 9'un soruları 9,
anahtarı 8 basılıdır. Anahtar sayfası native ve bağımsız OCR'da aynı farklı
kimliği taşıyor. Bunların cevapları aktarım dışında tutulur; kaynak hatası
sessizce düzeltilmez veya doğru test olduğu varsayılmaz. Ayrı resmî anahtar
ancak tam soru gövdesi metin/piksel eşitliğiyle bağlanabilir.

## 259 kaynakta 4.846 cevabın ve kırpımların hazırlanması

191 görsel anahtarın tamamı native basılı metinle uyuştu. Kimya ve Tarih
resmî toplu kitaplarında kaynak sorularının **bütün sayfaları** metin ve RGB
piksel eşitliğiyle karşılaştırıldı. Kimya'da 71 kaynaktan sekizinin gövdesi tam
eşit; 63'ünde metin veya yerleşim farkı açık tutuldu. Metin aynı olsa bile
soru işaretlerinin/formüllerin konumu ve şekil farklılığı varsayılmadı.
Tarih'teki 17 gövdenin tamamı eşit. OCR uyuşmazlığı olan 14 ayrı anahtar
Qwen'e yalnız gerçek kırpımıyla okutuldu ve metinle uyuştu; ikinci geçiş yeni
model çağrısı yapmadı. Büyük 61 cevaplı Fizik testi için 60 kayıt sınırı
genişletildi; yinelenen/eksik/basılı sırası bozuk numara düzeltilmeden reddedilir.

`yks_tam_kaynak_kontrol.py` bütün geçerli cevapları güncel kaynak PDF ve ham
bağımsız okuma dosyalarından tekrar doğrular: **259 belge, 4.846 basılı cevap**.
Girdi ve model önerisini doğruluk deposu sanmaz; anahtar değişmişse aktarım durur.

`yks_tam_soru_kirpim.py` bu 259 kaynağı 1.259 gövde sayfasında inceledi.
4.846 görsel özgün PDF bbox render'ıyla RGB eşittir; önceki 387 pilot kırpımı
yeniden üretilmedi. **251 belgede 4.667 soru** teknik kapsamı geçti; sekiz
belgede 179 soruya ait satır/şekil kapsamı incelemesi açık. 714 soruda grafik
veya özel glyph kaydı vardır; teknik piksel eşitliği içerik/konu onayı sayılmaz.
İkinci geçiş 259 dokümanı, sıfır yeni kırpım/piksel render'ıyla yeniden kullandı.
Kırpım raporu `full-question-crops/progress.json` içindedir. Bütün arşivin
tamamlandığı veya bu soruların bankaya eklendiği anlamına gelmez.

## Sekiz yerleşim istisnasının ayrı düzeltilmesi

`yks_kirpim_istisna.py` eski paketleri değiştirmeden yedi belge/150 soruyu
ayrı kırpımlara hazırladı. Sütunu aşan tablo kenarları, tam genişlikte tabloyu
izleyen iki soru sütunu ve formülün büyük font kutusu ele alındı. Gerçek soru
numaralarının tam sırası, beş seçenek, satır kapsamı ve kaynak RGB pikselleri
yeniden kontrol edilir. Başlık genişliği tek başına tam sayfa sorusu sayılmaz.

Kalan Coğrafya testinin 4 ve 5. soruları aynı 1985/2023 nüfus piramitlerini
kullanıyor. `yks_ortak_sekil_kirpim.py` ortak bölgeyi kaynak PDF'den bir kez
aldı ve iki soruya aynı `contextId` ile bağladı. Her soru için şekil + kendi
soru bölgesi yalnız özgün pikseller ve beyaz aralıkla tek görselde yer alır;
5. soruya 4. sorunun metni/seçenekleri eklenmez. Her parça ve birleşik görsel
piksel düzeyinde doğrulandı; iki sonuç gerçek kaynaktan ayrıca görsel okundu.
Bu belgenin 29 sorusu `full-question-shared-context/` paketinde teknik olarak
hazırdır. Teknik onay, dar konu/cevap nüshası kabulü veya öğretmen onayı değildir.

## Bütün PDF kapsamı ve Denemeler genişlemesi

`yks_tam_kapsam.py` mevcut 4.086 PDF / 67.277 sayfa gözlemini tekrar OCR/render
yapmadan birleştirir. `full-source-coverage/sources.jsonl`, `sources.csv` ve
`report.json` her belgenin anahtar/soru/önceki aktarım kanıtını ve kalan işini
gösterir. Eski VERIFIED aktarım kaydı yeni soru kabulü sayılmaz; native metinde
anahtar sinyali olmaması da anahtar yokluğu değildir. Çalışan deneme okuyucusunun
tamamlanan belgeleri zaman damgalı bir kapsam görüntüsüdür, tam faz kabulü değil.

`yks_tam_deneme_anahtar.py --visual` Denemeler sidebarındaki **46 tekil PDF**
için devam eder. Deneme numarası dosya adından atanmaz: basılı gövde/anahtar ve
sınav kimliği uyuşmalı; dört bölümde yeniden başlayan numaralar ayrı kimliktir.
TYT 25 Sosyal / AYT 46 Sosyal-2 basılı alternatif soruları içerir; 120/160'a
zorlanmaz. Bağımsız TUR OCR uyuşmazlığında yalnız anahtar kırpımı Qwen'e gider;
beklenen cevaplar isteme eklenmez. Pilotun gerçek ham okumaları tekrar kullanılır.
Her belge atomik önbelleğe ve `full-mock-keys/progress.json` imlecine yazılır.
Gövde/branş/dar konu ve tek tek soru kabulü bu anahtar çalışmasından ayrıdır.

`yks_govde_istisna_incele.py` altı tarama belgesindeki 94 sorunun gövde dizisi
ve istisnalarını kaynakla hazırladı. Biyoloji AYT11 soru15'in E seçeneği ve
Matematik AYT5 soru1'in D/E seçenekleri sağ sütunun başında devam eder; ayrı
özgün bölgeler kaydedilir. Matematik gövdesindeki `S(B)`/`EKOK(A,B)` ve Din
eşleştirme tablosundaki A/B/C/D etiketleri gerçek seçeneklerle karıştırılmaz.
İstisna yalnız kaynağı açıkça okunmuş soru kimlikleri için geçerlidir; anahtar,
tam görsel ve içerik kabulü hâlâ gerekir. Çıktı `diagnostic-body-exceptions/`.

Ek kaynak okumasında Edebiyat AYT1 ve AYT14'ün anahtarı raster görüntüdedir;
boş native metin boş sayfa değildir. Türkçe TYT5 anahtarında 33 gerçekten iki
kez basılmış, 34 yoktur; 34'ün cevabı tahminle atanmaz. Fizik TYT4 son sayfası
yedi farklı testin anahtarını içerir; bütün sayfa tek testin anahtarı sayılmaz.

## Yeni kaynakların soru bölgesi keşfi ve basılı sınav kapsamı

**Alt iş — BITTI:** Daha önce incelenmemiş, Deneme/Tarama dışında kalan 1.012
PDF için `yks_yeni_pdf_soru_kesfi.py` soru bölgelerini taradı. İlk geçişte
3.187 aday bölge; ikinci geçişte 1.012 önbellek, sıfır yeni çıkarım/OCR/model/render.
19 sayfa görsel/okunabilirlik incelemesinde kalır. 994 belgede bölge bulunmaması
anahtarsızlık veya hiç soru yokluğu diye onaylanmaz.

**Alt iş — BITTI:** `yks_yeni_pdf_sinav_kapsami.py` gerçek gövde başlığı ve
basılı anahtar başlığını birlikte kontrol etti. Sağlayıcının `Ortak / MEBİ YKS
Denemeleri` dizinindeki 14 PDF aslında YDT İngilizcedir. 1.118 aday bölge TYT/AYT
kuyruğundan ayrıldı; özgün arşiv ve bağlantılar korundu. Canlı geçişten önce bu
dosyaların katalogdaki Ortak kapsamı da düzeltilmelidir; soru bankasına alınmaz.

Kullanılacak çıktı `new-source-discovery/scoped-report.json` olur; ham keşif
raporu filtrelenmiş TYT/AYT kuyruğu sayılmaz. Dört kaynakta **2.069 aday** kaldı:
iki Din tarama kitabı (302/339), 3 Adım TYT Türkçe (1.427) ve Edebiyata Giriş
özeti (1). Bunlar kaynaklı cevap/gövde/tekrar/dar konu kabulünü bekler; keşif
soru kabulü veya yeni soru sayısı değildir. YKS-07 tam faz BITTI değildir.

## Kalıcı işlem kanıtı arşivi

**Alt iş — BITTI (ilk checkpoint):** Kullanıcının açık DB kayıt talebiyle
`ogm_ders.yks_evidence` ayrı işlem arşivi kuruldu. 46.089 dosya referansı,
45.656 farklı ham dosya / 737.137.348 bayt; 4.086 kaynak durumu ve 78.696
sorgulanabilir işlem kaydı saklandı. Bütün farklı ham dosyalar DB'den geri
okundu, SHA-256 eşitliği PASS; aynı checkpoint ikinci yazımında 0 yeni ekleme.
JSON, GZip sayfa, WEBP kaynak kırpımı ve NPZ dosyası gerçekten yeni dizine
geri yüklendi, hash'leri eşit. Kaynaklar, soru bankası ve öğretmen kararları
değiştirilmedi. Bu ilk checkpoint çalışan denemelerin ara durumunu saklar;
deneme işi bittiğinde kapsam yenilenir ve yeni checkpoint eklenir.

Veri kaybı olmadan NUL/bozuk model yanıtı/özel formül glyph'i ham `bytea`
olarak korunur; sorgu JSONB'sindeki karakter uyarlaması ham kanıtın yerine
geçmez. Hatalı hash/FK, aynı kayıt tekrar denemesi ve yarım transaction geri
alma geçici ivme_test içinde üç gerçek testten geçti. İlk toplu geri okumada
Windows socket tampon sınırı görüldü; tek dosya/binary okuma düzeltildi ve
bütün arşivin geri okuması geçti. Veritabanı arşivi soru kabulü değildir.
Devam ve geri alma komutları [işlem tarifinde](../../islemler/yks-kaynak-birlestirme.md).

## Tam deneme anahtarı ve raster anahtar genişlemesi

**Alt iş — BITTI:** 46 denemenin anahtar düzeni incelendi; 42 belgede toplam
5.988 basılı cevap iki okumayla uyuştu. Üç AYT gövdesinde iki farklı deneme
numarası basılı; bir AYT PDF son anahtar sayfası yerine soru ile bitiyor.
Dört kaynak aktarım dışında kalır. İkinci geçiş 46 belgeyi yeniden kullandı,
yeni OCR/model çağrısı 0; eski pilot çıktıları değişmedi.

**Alt iş — BITTI (çözümleme taraması):** `yks_deneme_render_kontrol.py` 46
PDF'nin 2.327 sayfasını native ve 150 DPI RGB render ile taradı. 25 belge
uyarısız, 20 belgede ActualText konumlandırma/etiket ağacı uyarısı, bir
belgede gerçek zlib akış hatası var: `f8bbb5b413ae…`, 2026-09-21 TYT Deneme1,
fiziksel sayfa29. Uyarılar soru kabulünden önce çözülmelidir; sağlam anahtar
gövdeyi onaylamaz. 21 uyarılı belge dört anahtar istisnasını da içerir;
bu kümeler toplanıp 25 sorunlu belge diye sayılmaz.

**Alt iş — BITTI:** Edebiyat AYT1/14 raster anahtarları, gerçekten açılmış
kaynak görüntüsü ve bağımsız yerel Qwen okumasıyla 20+20 cevapta uyuştu.
`yks_raster_anahtar_incele.py` beklenen cevapları yerel model istemine vermez.
Basılı gövde sınav/test/ders kimliği ve 1–20/beş seçenek dizisi ayrıca kontrol
edilir. `yks_raster_soru_kirpim.py` yalnız bu iki kaynağın 40 yeni kırpımını
hazırladı: satır açığı 0, kaynak RGB eşitliği PASS. İlk 4.846 soru yeniden
çıkarılmadı. Toplam tarama anahtarı **261 belge/4.886 cevap**, açık istisna 75.
Yeni karşılaştırma `full-question-raster-comparison/` içindedir.
