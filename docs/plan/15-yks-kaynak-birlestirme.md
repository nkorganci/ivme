# 15. Adım — YKS kaynaklarını MEBİ düzeninde birleştir

Bu plan dört kaynak arşivini `D:\workspace\ivme\Kaynaklar\YKS` altında
birleştirir. Tercih edilen ders/ünite/konu düzeni MEBİ'dir. Uygulamadaki mevcut
kaynak, konu ve soru kimlikleri ile öğrenci/öğretmen geçmişi korunur.

**Son kullanıcı talimatı:** hazırlık kaydedilince YKS-00'dan başla ve doğrulanmış
ön koşullar üzerinden diğer adımlara devam et; her adımda yeniden onay isteme.
Bu talimat zincirin uygulanmasını yetkilendirir; doğrulama/geri alma sınırlarını
kaldırmaz. Planın yazılmış olması, işlemlerin yapılmış olduğu anlamına gelmez.
İleride yalnız belirli bir adım istenirse o sınırı uygula. Dosyayı görüntülemek
tek başına yeni işlem isteği değildir.

## Seçilen adımı çalıştıracak ajana

1. `git status --short`, [AGENTS.md](../../AGENTS.md), [devir](../devam.md) ve
   [tek görev tablosundaki](../gorev-durumu.md) seçilen `YKS-XX` satırını oku.
   Kullanıcının ilgisiz değişikliklerini koru; başka açık işe otomatik dönme.
2. Bu belgenin ortak kurallarını ve **yalnız seçilen adımın görev dosyasını** oku.
   Görev dosyası girdileri, ön koşulları, modeli, işlemleri ve kabulü belirtir.
3. Ön koşulun durumunu yalnız "tamam" sözüyle kabul etme: ilgili raporun girdi
   hash'lerini, kapsamını ve sürümünü kontrol et. Eksik ön koşulu sessizce
   çalıştırılmış sayma. Tüm zincir talimatında gerekli önceki işi sırasıyla yürüt;
   güvenli ilerleme mümkün değilse nedenini ve gereken önceki adımı bildir.
4. Runtime durum dosyası varsa `runId`, adım/alt aşama, imleç ve çıktı hash'lerini
   doğrula. Yoksa yapılmamış sayma; mevcut proje kanıtlarını araştır. Tamamlanan
   işi yalnız değişen girdi/hata gerekçesiyle yeniden aç.
5. Seçilen işi yap; her önemli alt parti, kesinti veya doğrulama sonunda görev
   tablosunu ve ilgili açık planı aynı çalışma içinde güncelle.
6. Sonraki ajana tek somut işlem bırak: kapsam + çıktı/kanıt + gerçek doğrulama +
   kalan iş + sonraki komut veya açık doğal dil görev talimatı.
7. Yalnız belgeler kaydedilmişken aşamayı, runner'ı, DB geçişini veya modeli çalışmış
   gibi gösterme. Hangi yürütücünün gerçekten mevcut olduğu `ivme.py yks plan`
   çıktısından doğrulanır; görev dosyasının bulunması yürütücünün varlığı değildir.
8. Bütün kabul koşulları geçen adımın bu plandaki ve görev dosyasındaki başlığına
   **— BITTI** ekle; görev tablosuna **TAMAMLANDI — BITTI** ve kanıtı yaz.
   Biten görev/başlık silinmez. Kısmi veya yalnız pilot işi bitmiş sayma.
   Değişen girdiyle yeniden açılırsa BITTI kaldırılır ve gerekçe kaydedilir.

**Adım seçme örneği:**

> YKS-04 adımını uygula. Önce bu planı, YKS-04 görev dosyasını ve mevcut görev
> durumunu oku. Ön koşulları doğrula. Her önemli ilerlemede kanıtı ve kalan işi
> güncelle. Tamamlanan adımı BITTI işaretle; son kullanıcı talimatındaki devam
> kapsamını uygula.

## Kapsam ve korunacaklar

**Güncel kullanıcı kararı — yalnız doğrulanabilir içerik:** Hatalı, eksik,
uyuşmayan veya bulunamayan soru/cevap/konu için onarım ve tekrar inceleme
yapılmaz. Aday `EXCLUDE_NO_RETRY` ile seçili kümeden çıkarılır; öğrenci
ekranına, yayın kataloğuna veya aktarım paketine konmaz. Bunları düzeltmek
YKS-07–13 kapanış koşulu değildir: kapsam, kanıtlı kabul + gerekçeli dışlama
ile kapatılır. Yeni açık kaynak bir kez incelenir; kanıt tamamlanamıyorsa
sonraki kaynağa geçilir. Daha önce kayıtlı banka kimlikleri/öğrenci geçmişi
korunur; eski gözlem dosyası kabul kuyruğu değildir. Bütün kaynaklardaki
bütün soruları kurtarmaya çalışma. Eski metinlerdeki “istisna bekler/onar”
yönlendirmeleri bu kullanıcı kararıyla yeniden deneme işi olmaktan çıkar.

Çalışma kuralı `scripts/yks-secim-politikasi.json`; güncel filtrelenmiş çıktı
`verified-source-selection/` olur. Kaynak/gövde/cevap kanıtı tek başına yeni
soru veya konu kabulü değildir; tekrar ve kontrollü konu kapıları sürer.

Kaynaklar:

- `D:\workspace\mebi-yks`
- `D:\workspace\ivme\Kaynaklar\mufredat`
- `D:\workspace\ivme\Kaynaklar\ogm-materyal`
- `D:\workspace\ivme\Kaynaklar\yks-cikmis-sorular`

Hedef: `D:\workspace\ivme\Kaynaklar\YKS`.

Yalnız TYT, AYT ve kanıtlı TYT–AYT ortak içerikler kapsamdadır. KPSS, LGS, YDT
ve yurt dışı sınav verileri değiştirilmez. Kaynaklarda kapsam dışı dosya varsa
nedeniyle kayda alınır; sessizce silinmez. MEBİ dışındaki kaynak kökenleri kaybolmaz.

PDF, video, ses, ZIP, Excel, HTML çözüm dizini ve ilişkili kanıtlar envantere girer.
ZIP üyeleri güvenli sınırlar içinde incelenir; kaynak HTML/JS çalıştırılmaz.
Geçici indirmeler, üretilmiş dizin görünümleri ve tekrar bağlantılar yeni kaynak
sayılmaz. Hedef arşiv tarayıcının girdisine yeniden dahil edilmez.

**Değişmezler:**

- Aynı baytlı PDF tek fiziksel kaynak; farklı kökenler/yollar çoklu referanstır.
- Soru bankasında kayıt bulunması PDF'nin bütün sorularının alındığının kanıtı değildir.
- İşlenmiş benzersiz PDF kaynak kanıtıdır; sırf işlenmiş olduğu için silinmez.
- Cevap kanıtı olmayan soru **bankaya alınmaz**. Anlatım/özet belgesi bu nedenle
  kaynak arşivinden çıkarılmaz.
- Kaynak cevap anahtarı ile AI'nın ürettiği çözüm farklıdır. Video veya model cevabı
  eksik anahtarın yerine geçmez. Ayrı resmî anahtar aynı test/kitapçıkla doğrulanır.
- Öğrenci kayıtları, soru kod/ID'leri, geçmiş cevaplar, kitapçık sıraları ve öğretmen
  kararları korunur. Yeni model kararı öğretmen onayı olarak kaydedilmez.
- Üretilmiş JSON elle düzeltilmez; üreticisi ve sürümlü yayın akışı değiştirilir.
- Üretim DB'sinde test yapılmaz. Mevcut test tarifi yalnız geçici `ivme_test` kullanır.
- Kaynak arşivinin salt okunur kuralı hazırlıkta sürer. Bu plana özgü fiziksel geçiş
  yalnız kullanıcı ilgili adımı seçtiğinde, YKS-11/YKS-13 kapsamı ve geri alma
  kanıtıyla yapılır; genel silme/taşıma iznine dönüştürülmez.

## Mevcut sistemin kullanılacak parçaları

[Veri kaynakları](../mimari/veri-kaynaklari.md) ve
[ortak etiket sözleşmesi](../sozlesmeler/ortak-etiketler.md) temel sözleşmelerdir.

- Çalışma anında tek konu/kaynak kaydı ortak PostgreSQL kataloğudur:
  `learning_catalog.current_run/current_categories/current_items/current_assignments`.
- Mevcut yapı Excel'in ilk `KONULAR` sayfasından üretilir. MEBİ yapısına geçişte
  üreticiler ve projeksiyonlar da uyarlanır; eski Excel bir sonraki üretimde yeni
  yapıyı ezemez. Dağılım verisi, `excelRowId` ve tarihsel kaynak kanıtı korunur.
- Dosya kimliği ve işlenme ilişkilerinde mevcut `pdf_sources`, konum ilişkileri,
  `pdf_archive` ve `veri/pdf-source-registry` kullanılır. İkinci bağımsız kaynak
  kataloğu veya öğretmen karar deposu açılmaz.
- [PDF kanıt hattı](../islemler/pdf-kanit-hatti.md),
  [yerel PDF/model tarifi](../islemler/pdf-ve-yerel-model.md),
  [kapsam uzlaştırma](../islemler/pdf-kapsam-uzlastirma.md) ve
  [soru kabulü](../islemler/soru-ice-aktarma.md) genişletilir.
- `pipeline/catalog_reference.py` yayımlanmış uygulama kataloğunu okur;
  `pipeline/core.py` ve çeşitli uygulama/üretim betikleri eski kaynak yollarına
  bağlıdır. Hepsi YKS-05 bağımlılık haritasında değerlendirilir.
- Mevcut işlevler/önbellekler tekrar kullanılır. Baseline sayıları eski raporlardan
  canlı DB sayısı diye alınmaz; YKS-01 sırasında kaynağı ve sürümüyle yeniden okunur.

## Hedef dosya düzeni

```text
Kaynaklar/YKS/
  Dersler/<Ders>/<TYT|AYT|TYT-AYT Ortak>/<Ünite>/<Konu>/
    Konu Ozetleri/
    Ders Notlari/
    Videolar/
    Sesli Ozetler/
    Testler/
  Kitaplar/
  Denemeler/<TYT|AYT>/<Yil>/<Deneme>/
  Taramalar/<TYT|AYT>/<Ders>/<Konu>/
  Mufredat/
  Katalog/
  index.html
```

Çok konulu kitabın tek fiziksel sahibi `Kitaplar` gibi bir konumdur; konu
görünümleri aynı belgenin ilgili sayfalarına bağlanır. Bir dosya her kategoriye
kopyalanmaz. Yollar insan tarafından anlaşılır; uygulama kimliği dosya adı değildir.

Eski yol/katalog kimliği → kaynak kimliği → geçerli fiziksel konum eşlemesi tutulur.
Bir adın değişmesi kaynak hash'ini, soru ID'sini veya konu kimliğini değiştirmez.
Geçici sabit bağlantı yedek değildir; paylaşılan baytlar değiştirilemez kabul edilir.
Windows reparse-point/döngü/gerçek yol ve erişim güvenliği kontrolleri korunur.

## Model ve maliyet kararı

| İş | Ana araç/model | Sınır |
|---|---|---|
| Hash, envanter, ZIP üyeleri, kesin dosya karşılaştırması | Python; model yok | Benzer ad silme kanıtı değildir |
| Metin/sayfa/kırpım | PyMuPDF ve mevcut OCR | Önce geçerli önbellek, sonra yalnız eksik bölge |
| Konu ve benzer soru adayları | `bge-m3:latest` | Yalnız aday; skor doğruluk/onay olasılığı değildir |
| Gerekli soru/anahtar kırpımı ve eşleme önerisi | `qwen3.5:9b` | Kaynakla doğrulanır, cevap uydurmaz |
| Basit görsel ön eleme | `gemma3:4b`, yalnız pilot yarar gösterirse | Her sayfayı iki modele zorunlu okutma yok |
| Zor metinsel tutarsızlık | `gpt-oss:20b`, yalnız eskalasyon | Görsel okuyamaz; doğrulanmış metin gerekir |
| Entegrasyon, test, istisna ve devir | Görevi yürüten Codex/Claude ajanı | Gerçekte kullanılan model kaydedilir |

Kurulu model ve digest'leri çalıştırmadan önce doğrulanır; model adı tek başına
önbellek kimliği değildir. Yerel Ollama bulut API tokenı tüketmez; zaman/RAM/GPU
maliyeti vardır. Tüm PDF'ler buluta verilmez. Yalnız gerekli kısa metin/kırpım ve
izinli kategori adayları modele gider; kısa şemalı JSON istenir.

Mevcut `pipeline/model_runtime.py` model kilidiyle uyum sağlanır: tek ağır model,
embedding ve üretim ayrı partiler. GPU/CPU/bellek ve disk sınırları pilotta ölçülür;
mevcut daha sıkı disk koruması gevşetilmez. Geçerli embedding/OCR/model çıktıları
yeniden üretilmez. Yeni model veya dış servis kurulması bu plan kaydıyla yapılmaz.

## Devam, kanıt ve durum sözleşmesi

**İnsan tarafından tutulan tek güncel durum** [görev tablosudur](../gorev-durumu.md).
Bu belge ve adım dosyaları gereksinimleri tutar; tamamlanma tablosunu kopyalamaz.
[Devir](../devam.md) yalnız etkin iş, kalan tek işlem ve kanıtı taşır.

YKS-00'da kurulacak runtime kayıtları:
`uygulama/veri/yks-birlestirme/<run-id>/state.json`, olay günlüğü ve raporlar.
Bunlar işlem imlecidir; DB kataloğunun, kaynak kayıtlarının veya öğretmen
kararlarının yerine geçmez. Mevcut pipeline iş kayıtlarına referans verilir.

Her adım/alt parti şu alanları taşır:

```json
{
  "schemaVersion": 1,
  "runId": "<gercek-calisma>",
  "stageId": "YKS-07",
  "scope": "pilot",
  "status": "PENDING",
  "inputSnapshot": {
    "sourceManifestSha256": "<hash>",
    "catalogVersion": "<surum>",
    "bankSnapshotSha256": "<hash>"
  },
  "cursor": {
    "sourceSha256": null,
    "physicalPage": null,
    "sectionId": null,
    "questionId": null
  },
  "artifacts": [],
  "validation": {"status": "NOT_RUN", "report": null},
  "nextAction": "<tek-somut-islem>"
}
```

Bu bir şema örneğidir; çalışma başlatılmış veya dosya oluşturulmuş değildir.

- Runtime durumları: `PENDING/RUNNING/VERIFIED/REVIEW_REQUIRED/FAILED/STALE`.
  Belge durumları görev tablosunun mevcut sözlüğünü kullanır. Pilotun doğrulanması
  tam arşiv aşamasını `TAMAMLANDI` yapmaz.
- Her çıktı atomik yazılır; kaynak/işlem kilidi, sahip süreç ve kesinti kurtarması
  vardır. Başarısız/yarım işlem başarı diye raporlanmaz; sonsuz retry yapılmaz.
- Anahtarlar aşamaya özeldir: ham çıkarım = içerik hash'i/sayfa/çıkarıcı;
  OCR = ayrıca OCR model/sürümü; sınıflama = kategori sürümü/prompt/model digest'i;
  tekrar kabulü = güncel banka anlık görüntüsü. Yol/ad değişmesi OCR'ı yenilemez.
- Banka değişirse yalnız ilgili karşılaştırma/kabul kanıtı eskir. Konu değişirse
  yalnız ilgili eşleme eskir. Model/girdi değişikliği eski öğretmen kararını uydurma
  onayla yenilemez.
- Dosya bütünlüğü, sayfa tamlığı, cevap kanıtı ve banka aktarımı ayrı ölçülür.
  `n soru bulundu`, `m soru kabul edildi`, `k sayfa okunamadı` ayrı sayaçlardır.
- Her önemli ilerlemede görev tablosu + ilgili plan + gerekirse devir aynı oturumda
  güncellenir. Tamamlanan işin kanıtı kaybolduysa önce mevcut çıktılar araştırılır.
- Belge değişikliklerinde mevcut `python scripts/ivme.py plan`; commit öncesi
  `python scripts/ivme.py kontrol` kullanılır. Bunlar içerik/DB geçişinin kabulü değildir.

## Pilot ile tam arşivin sırası

```text
YKS-00 → 01 → 02 → 03 → 04 → 05 → 06
07.pilot → 08.pilot → 09.pilot → 10.pilot
07.tam   → 08.tam   → 09.tam   → 10.son
11 → 12 → 13
```

Pahalı toplu çıkarımdan önce 07/08/09'un yalnız temsilî pilot alt partisi hazırlanır.
YKS-10 pilotu bu partiyle sınar; başarılı pilot tam arşiv genişlemesinin ön koşuludur.
Bu, tamamlanmamış tam arşiv görevini atlamak değildir: her alt kapsam ayrı kaydedilir.
YKS-11 öncesinde tam kapsam kanıtı ve YKS-10 son geçiş kabulü gerekir.
Seçilen adım için gereken önceki alt parti eksikse ajan bunu açıkça kaydeder.
Tüm zincir talimatında önce gerekli alt partiyi tamamlar; tek adım talimatında
diğer aşamayı kendiliğinden çalıştırmaz.

**Mevcut giriş:** `python scripts/ivme.py yks plan|durum|baslat|adim|dogrula`.
`plan`/`durum` iş başlatmaz; `baslat` kontrol kaydı oluşturur. `adim YKS-00 --resume`
araç testlerini kanıtlar; `dogrula YKS-00` hash'leri denetler. Diğer aşamalar için
`yks plan` çıktısındaki `implemented` alanını kontrol et; olmayan yürütücü reddedilir.
[Gerçek komut tarifi](../islemler/yks-kaynak-birlestirme.md).

## 15.00 — YKS-00: devam altyapısı — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-00.md). Kontrol kaydı, OS kilidi,
imleç, hash doğrulaması, bağımsız pilot/tam kapıları ve eski girdiye devam engeli
kuruldu. 14/14 araç testi, gerçek run, ikinci geçişte reuse ve hash doğrulaması geçti.
Kanıt: `veri/yks-birlestirme/current.json` ve `veri/kalite/YKS-00/`.

## 15.01 — YKS-01: baseline, yedek ve geri dönüş — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-01.md). Güncel sistemin korunacak
kimlikleri ve geri yükleme kanıtı alınır; bu aşama kaynak temizliği değildir.

## 15.02 — YKS-02: dört kaynak envanteri — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-02.md). Tüm dosyalar ve ZIP üyeleri,
kökenleri ve içerik kimlikleriyle kapsanır; hedefe kendini yeniden taratma engellenir.

## 15.03 — YKS-03: dosya tekrarı ve işlenme ayrımı — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-03.md). Kesin kopya, benzer belge,
aynı soru ve kısmi aktarım ayrı kararlardır. Henüz dosya silinmez.

## 15.04 — YKS-04: MEBİ konu ağacı ve eski kimlikler — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-04.md). MEBİ tercih edilen konu düzeni
olur; mevcut kimlikler, ortak kapsam ve diğer sınav katalogları korunur.

## 15.05 — YKS-05: eski ve yeni referansları çözme — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-05.md). Tüm okuyucu/üreticiler,
güvenli kaynak çözümleme ve katalog projeksiyonları geçişe hazırlanır.

## 15.06 — YKS-06: birleşik arşivi hazırlama — BITTI

[Adım görevini aç](yks-kaynak-birlestirme/yks-06.md). Hedef düzen ve manifest
hazırlanır; canlı okuyucuların kökü değiştirilmez.

## 15.07 — YKS-07: PDF, sayfa ve cevap kanıtı

**Durum: KISMI. Aşağıdaki BITTI ifadeleri alt işlere aittir; tam arşiv kabulü açık.**

[Adım görevini aç](yks-kaynak-birlestirme/yks-07.md). Önce pilot, YKS-10 pilot
kabulünden sonra tam arşiv incelenir. Cevapsız sorular bankaya aday olmaz.

YKS-07 temsilî pilot kapısı VERIFIED; tam arşiv açık kalır. Pilot, 19 tarama
belgesi ve iki denemenin kaynak anahtarlarıyla on gerçek risk sınıfını kapsar.
Tamamı soru/konu yayını kabulü değildir.

Son alt iş BITTI: altı yerleşim istisnasında 94 bağımsız kaynak cevabı ve tam
özgün kırpım doğrulandı; toplam 267 tarama / 4.980 cevap. Yeni 94 soruda güncel
banka karşılaştırması 50 mevcut aday ve 44 içerik incelemesi verdi. Tam arşiv
kabulü, deneme gövdeleri ve diğer kaynak düzenleri tamamlanınca kapatılır.

Yeni alt işler BITTI: Fizik çoklu anahtarında 41 ve iki Edebiyat ayrı resmî
anahtarında 40 cevap daha; toplam 270 tarama/5.061 cevap. 41 sağlam denemenin
5.863 soru gövdesi bölüm/sıra/özgün piksel bakımından hazır. Dört deneme
anahtar/kimlik sorunu ve bir bozuk PDF dışarıda; dar ders/konu/tekrar ve
diğer kaynak düzenlerinin kabulü sürdüğü için ana adım açık kalır.

Beş yeni gövde E/C/E/E/D basılı anahtarıyla ve düzeltilmiş v2 özgün
kırpımlarla teknik hazırlığa alındı; beş görsel gerçekten okundu, satır
kesilmesi sıfır. Ana kuyruk, konu/tekrar/alım kabulü değişmedi.

Yeni yerleşim alt işi BITTI (alım değildir): 75 Fizik özetinin görünür
geometrisi ve özgün sayfa görüntüleri hazır; 13 pano ve dört bütün sayfa
okundu. 39 numara dizisi yalnız aday; 35 yerleşim ve bir basılı numara hatası
bekler. Aynı PDF’de Fizik/Tarih karışımı, anahtar numaralarının gövde sanılması
ve başlığın üstüne taşan şekil ayrı risklerdir. Üç ayna sorusunun 12.052 güncel
hazırlanmış/5.303 eski pending karşılaştırması sıfır kesin metin/locator bağı
verdi; ayrışmayan metinlerde NEW kararı yok. Kanıtlar görev dosyasındadır.

Yeni YKS-07 alt partisi BITTI: 16 özetin 44 sorusu basılı anahtar ve tam
özgün kırpımla bağlandı; 15 pano/üç bireysel kırpım gerçekten okundu.
Görünür kesilme sıfır; altı native kutu kesişimi özel kanıtla korunur.
Karma Fizik/Tarih anahtarları ayrıldı, dört kaynak içerik kusuru incelemede.
Özet grubunda toplam 18 kaynak/52 gövde hazır; sıradaki 56 kaynak/162 basılı
hücre `physics-summary-bound-bodies/remaining-sources.json` içindedir.
**Kullanıcı önceliği: YKS-07 bitmeden diğer aşamalara geçilmez.** Tam arşiv
ve diğer PDF yerleşim istisnaları açık; bu parti tam kabul değildir.

## 15.08 — YKS-08: güncel bankada soru tekrarı

[Adım görevini aç](yks-kaynak-birlestirme/yks-08.md). Mevcut, yeni, varyant ve
belirsiz sorular ayrılır; eski soru kimlikleri birleştirilip silinmez.

Beş ek Fizik gövdesi için 80.230 banka, 12.052 hazırlanmış ve 5.303 eski
bekleyen kayıt karşılaştırması tamamlandı. 34 aday ilişkisi/24 banka görseli
okundu; Q5'in iki kaydı sayı/seçenek varyantı olarak ayrı tutuldu. Eski ID'ler
birleştirilmedi; NEW kabulü yok. Bu alt iş YKS-08 tam kabulü değildir.

## 15.09 — YKS-09: kaynaklı soru kabul paketi

[Adım görevini aç](yks-kaynak-birlestirme/yks-09.md). Özgün kırpım, iki cevap okuması,
kontrollü etiket ve güncel banka karşılaştırmasıyla paket hazırlanır; yayın yapılmaz.

Beş ek Fizik sorusunun kayıtlı Hareket Kavramları yaprağına kaynak desteği,
altı sayfalık MEBİ PDF'nin dört gerçekten okunmuş sayfasıyla hazır. Q4 kaynak
ifade işaretleri ve bütün NEW/alım kontrolleri açık; kategori yayını yapılmadı.

## 15.10 — YKS-10: pilot ve geçiş kabulü

[Adım görevini aç](yks-kaynak-birlestirme/yks-10.md). Önce küçük temsilî pilot,
sonra tam arşiv geçiş kabulü; gerçek öğrenci DB'sine test yazılmaz.

## 15.11 — YKS-11: kaynak ve konu kataloğu geçişi

[Adım görevini aç](yks-kaynak-birlestirme/yks-11.md). Doğrulanmış fiziksel düzen,
uyumlu okuyucular ve sürümlü DB kataloğu kontrollü etkinleştirilir.

## 15.12 — YKS-12: yalnız yeni soruların aktarımı

[Adım görevini aç](yks-kaynak-birlestirme/yks-12.md). Küçük atomik partiler,
güncel tekrar kontrolü ve INSERT_ONLY davranışıyla kabul edilir.

## 15.13 — YKS-13: kesin kopya temizliği ve kapanış

[Adım görevini aç](yks-kaynak-birlestirme/yks-13.md). Kanıtlanmış kopyalar en son
temizlenir; benzersiz özgün kaynaklar ve bütün geçmiş korunur.

## Çift kontrol ve son kabul

Birinci kontrol otomatik bütünlük ve bağımsız kaynak karşılaştırmasıdır; ikinci
kontrol özgün kanıt ve gerçek uygulama davranışıdır. Aynı LLM yanıtının tekrarı
bağımsız kontrol sayılmaz.

| Kabul | Gerekli kanıt |
|---|---|
| Kaynak kaybı yok | Her başlangıç kaydı için korunmuş içerik hash'i/konum veya doğrulanmış aynı-bayt kopya eşlemesi |
| Referans kaybı yok | Eski katalog/yol/ID ve yeni kimlikten aynı doğru dosyaya erişim |
| Konu kimliği kaybı yok | Tüm eski YKS kimlikleri ve korunan diğer sınav kayıtları |
| Yeni soru güvenilir | Kaynak kırpımı, geçerli anahtar, iki okuma, dolu konu/sınav bağları |
| Tekrar yok | Güncel bankaya ve yeni partiye karşı karşılaştırma; yeniden çalıştırmada sıfır yeni kayıt |
| Geçmiş korunuyor | Öğrenci, öğretmen ve eski soru kayıtları için doğrulanmış değişmezler |
| Gerçek kullanım | PDF/soru/konu, pratik, deneme, filtreler ve eski bağlantıların masaüstü/mobil kontrolü |
| Kesinti kurtarılıyor | Yarım parti/atomik yazma/ölü kilit/yeniden başlatma kanıtı |
| Geri dönüş çalışıyor | Ayrılmış ortamda eski okuyucu/katalog uyumluluğu ve geri alma provası |

Canlı trafik varken bütün DB'yi eski yedeğe döndürüp yeni öğrenci kayıtları silinmez.
Geri dönüş öncelikle sürümlü katalog/okuyucu ve uyumlu yol çözümlemesidir. Yeni
soruya öğrenci bağı oluşmuşsa bu soru geri alma adıyla silinmez; ilişkileri
koruyan telafi yöntemi uygulanır. Eksik kanıt/okunamayan sayfa/belirsiz cevap
gizlenmez; kalan kapsam kapanmamışsa iş `KISMI` kalır.

Bu belge uygulama, içerik doğruluğu veya öğretmen kabulünün yapılmış olduğunu
iddia etmez. Gerçek sonuçlar görev tablosu ve sürümlü raporlara işlenir.
