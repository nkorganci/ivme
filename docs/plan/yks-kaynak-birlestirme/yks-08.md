# YKS-08 — Bankadaki ve yeni partideki soru tekrarları

**3 Adım Türkçe sürüm tekrar işi — BITTI (kabul değildir):** 1.397 ham
kartın mevcut DB'de 1.309 bağlantı, 86 aday ve iki inceleme kaydı var. 1.227
aynı görsel/cevap/sürüm bağı ve 80 eski inceleme sözleşmesi doğrulandı; iki
eski bağ ek inceleme ister. 88 bekleyen iş aynı eski kimlikle sürer; ikinci
soru kuyruğu oluşturulmadı. Yeni nüshadaki değişen gövde `3a-tyt-turkce-09-07`
ve anahtar `3a-tyt-turkce-81-01` ayrı kaldı. Sonuncunun bankadaki E cevabı
korunur; eski E/yeni D satırları native, konum sırası ve bağımsız Qwen ile
okundu. 180/330 DPI tam sayfa farkının yalnız bu iki beyan edilen bölgeye
düştüğü de doğrulandı. Kanıt `source-page-equivalence/3adim-turkce/incremental-reuse.json`.

**Partiler arası karşılaştırma — BITTI (aday taraması):** 313 PDF'nin 11.510
hazır sorusu bir arada karşılaştırıldı. 11.412 soruda beş seçenek ayrıştı;
98 biçim istisnası onaylanmadı. Tam kök/seçenek içeriği eşleşen 36 çiftin
35'i görsel inceleme, biri basılı doğru seçenek içeriği çelişkisi ister.
Harfler seçenek permütasyonundan ayrı tutulur; matematikte büyük/küçük harf,
işlem, sayı ve olumsuzluk silinmez. `cross-source-candidates/` sonuçları
benzerlikten otomatik tekrar/yeni soru kabulü üretmez.

**Sekiz eski deneme anahtarı incelemesi — BITTI:**
`yks_deneme_cevap_nusha.py` altı kaynak/banka soru görseli çiftini gerçek
görüntülerden okunan sabit hash'lerle bağlar. Eski kitabın gövdesindeki gerçek
deneme numarası kullanılır; örneğin düzleştirilmiş test sırası 11, basılı
6. deneme yerine geçmez. Sekiz eski soru gövdesi güncel PDF'de ham kaynak
metniyle tam eşit, sekiz anahtar native/Qwen okumasında uyuşur.

Yedi bağda eski anahtar bankadaki cevabı destekler; yeni basılı nüsha farklıdır.
`md-ayt-sozel-21-39` için eski Sözel kitabı ve yeni deneme **C**, banka **D**;
aynı görünen Eşit Ağırlık kitabı ise **D** basar. Bu gerçek kaynak çelişkisi
ve banka–kendi kaynağı farkıdır; bütün eski cevap/ID/geçmiş korunur. Yeni soru
oluşturulmaz veya öğretmen kararı uydurulmaz. Kanıt:
`full-mock-comparison/old-printed-key-review/report.json`. Teknik incelemenin
bitmesi cevap düzeltme/yayın kabulü değildir.

**Yeni tam banka karşılaştırma alt işi — BITTI:** 270 taramanın 5.061 sorusu
ve 41 denemenin 5.863 sorusu, güncel 80.230 etkin YKS sorusunun tüm görsel ve
metinleriyle karşılaştırıldı. Taramalarda 3.036 mevcut aday/1.948 içerik
incelemesi/77 fark; denemelerde 1.458 mevcut aday/3.855 içerik incelemesi/
447 ortak bölüm alt ders incelemesi/63 kapsam-cevap farkı/40 basılı aralık
istisnası var. Bunlar aktarım kabulü değildir; bütün eski ID/cevaplar korunur.

`yks_deneme_kapsam.py` branşları her kitapçığın gerçek basılı soru aralıklarına
bağlar. Matematik/Geometri ve AYT Felsefe Grubu tek başına dar ders kabulü
vermez. 333642091490… AYT Fen'in sayfa41 yönergesinde TYT 20 soru aralıkları
basılıdır; 40 soru için sınav dağılımından varsayımsal aralık üretilmedi.

`yks_deneme_cevap_farki.py`, altı kaynak sorusu/sekiz mevcut banka bağındaki
cevap farkını kaynak/anahtar/görsel/banka damgalarıyla ayrı kaydetti.
`full-mock-comparison/answer-conflict-queue.json` eski basılı anahtar ve iki
görselin gerçek incelemesini bekler; bu aşamada banka hatası veya farklı basılı
nüsha kararı verilmedi. Mevcut cevaplar ve öğrenci geçmişi değiştirilmez.

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

## Mevcut araçlardan devam

`yks_soru_pilotu.py` kaynak cevap kanıtlı 12 sorunun kırpımını ve güncel bütün
YKS bankasına metin/görsel karşılaştırmasını hazırlar. `yks_pilot_tekrar_kabul.py`
tam içerik, seçenek, sayı, güncel kayıt sürümü, görsel hash'i ve iki basılı cevap
okuması eşleşmeden eski kanonik soruyu kullanmaz. `soru-pilotu/` raporlarını oku;
eski soruya yeni kodla INSERT üretme. `exact-reuse-report.json` üretim bankasına
hiçbir yazım yapmaz ve diğer PDF'lerin taramasını tamamlamış sayılmaz.

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

## 387 soruluk karşılaştırmadan devam

`yks_pilot_tekrar_tara.py` bütün 80.230 güncel banka metin/görselini kullanır;
önceki vektör önbelleği hash ile doğrulanıp tekrar kullanılır.
`yks_pilot_tekrar_incele.py` tam metin adayında cevap, özgün kayıt sürümü ve
ortak DB'nin kontrollü `subject_ids/exam_ids` kapsamını karşılaştırır.
Eski görünen `questions.subject=Felsefe` alanı psikoloji/sosyoloji/mantık
kimliklerinin yerine geçmez. `controlled-repeat-review.json` 268 kaynak
eşleşme adayı ve 119 içerik/görsel incelemesi tutar. Bunlar yeni soru kabulü
veya öğretmen kararı değildir; kategori/görsel kabulü ayrıca tamamlanır.

Dar konu incelemesinin ön adayı için `yks_soru_konu_adaylari.py --subject din`
yalnız kayıtlı MEBİ yapraklarını kaynak metniyle sıralar. 33 Din sorusu için
86 önceki konu embedding'i tekrar kullanıldı, 33 yeni soru vektörü hesaplandı.
`question-topics/din/topic-candidates.json` skorları karar/onay değildir; soru
kökü ve seçenek bağlamı okunmadan kategori ataması yapılmaz.

İlk içerik denemesinde yalnız başlıklarla getirilen ilk sekiz adayın Kadirilik ve
Alevilik-Bektaşilik için doğru yaprağı dışarıda bıraktığı görüldü. Bu nedenle
`yks_soru_konu_adaylari.py` artık aynı sınav/branş içindeki ilk sekiz BGE adayına,
gerçek konu PDF metni ile **yalnız soru kökü** üzerinden bulunan ilk dört adayı
ekler. Bu genişletmede 119 geçerli embedding yeniden kullanıldı, yeni embedding
hesaplanmadı. Seçeneklerdeki çeldiriciler PDF aday aramasına girmez.

`yks_konu_icerik_incele.py --subject din` yerel Qwen'e yalnız izinli kimlikleri,
özgün soru kökü satırlarını ve kısa gerçek MEBİ PDF alıntılarını verir. Sonuçta
bir soru satırı ve seçilen konunun kendi PDF alıntısı zorunludur. Sınav/branş
dışı kimlik, var olmayan satır veya başka konuya ait PDF alıntısı reddedilir.
Önceki geçerli kaynak/PDF bağlı okumalar aday listesi genişlese de, kaynakları
değişmemişse tekrar kullanılır. İlk sekiz okuma bu şekilde korundu; kalan parti
`question-topics/din/content-topic-review.json` imlecinden ilerler. Bunlar otomatik
adaylardır; kategori yayını, yeni soru kabulü veya öğretmen onayı değildir.

## Sınırlı pilot kapısı — VERIFIED

`yks_pilot_kabul_secimi.py` gerçek kırpımları okunan AYT Din tarama 8'in
1, 2 ve 4. sorularını iki modelin konu desteği ve özgün basılı anahtarıyla
yalnız yalıtılmış provaya seçer. Önceki 12 Tarih sorusu mevcut kimlikleriyle
yeniden kullanılır. `python scripts/ivme.py yks adim YKS-08 --scope pilot --resume`
bu **15 soruluk kapsamı** doğrular; diğer 372 aday açıkça ertelenir.
`yks-08/pilot/attempt-0005/bounded-duplicate-pilot-acceptance.json` kanıttır.
Tam arşiv yürütücüsü kabul edilmedi; bu aşamanın tamamına BITTI yazılmaz.

İkinci bağımsız kök/seçenek karşılaştırması 80.230 bankayı taradı, 80.229
kullanılabilir metin ve bir bozuk OCR (`sb-83612`) buldu. Eski karşılaştırmada
sondaki boşluk kısa OCR'ı 30 karakter eşiğinden geçiriyordu; `.strip()`
kontrolü ve regresyon testi düzeltildi. Banka yeniden karşılaştırıldı,
önbellek yalnız bu değişiklik için yenilendi. Fizik sorusunun gerçek görseli
elektroskop kapsamındadır ve yalnız üç yeni Tasavvuf sorusundan farklı diye
okunmuştur; bu, genel banka metni onarımı veya diğer adayların kabulü değildir.

Kaynak/PDF alıntısının varlığı anlamsal doğruluk sayılmaz. Qwen'in Rifailik
sorusunu Din–Bilim İlişkisi'ne bağlayan önerisi yanlış bulundu; kaynaklar
değiştirilmeden açık incelemede kaldı. `yks_konu_anlam_kontrol.py` yerel
GPT-OSS ile bu ilişkiyi bağımsız sorgular. Eksik/uyuşmayan kanıt yayına girmez.

## Tam tarama sorularının tekrar ön incelemesi

`yks_tam_tekrar_tara.py` tam anahtar fazından gelen teknik kapsamı sağlam
4.667 kaynak sorusunu güncel bütün YKS banka metni/görseliyle karşılaştırır.
Sekiz sorunlu belgenin 179 sorusu kabul dışında kalır. Önceki banka metin
vektörü yeniden kullanılır; görsel pHash aday taraması NumPy ile yapılır.
Tam bayt/normalize görüntü eşitliği, 64 bit Hamming uzaklığı, 12 bit eşiği ve
aday sırası önceki tek tek döngüyle regresyonda aynıdır. Aynı pHash tek başına
aynı soru sayılmaz. Yeni model/OCR/embedding veya soru yazımı yapılmaz.

`full-question-comparison/comparison-report.json` tamamlandıktan sonra
`yks_tam_tekrar_incele.py` mevcut kayıt sürümü, basılı kaynak cevabı ve
kontrollü `subject_ids/exam_ids` kapsamını denetler. Kaynak paket/cevap
değişikliği eski karşılaştırmayı geçersiz kılar; salt çalışma sayacı değişikliği
tekrar OCR/kırpım yapılmasına neden olmaz. Tam konu/görsel kabulü ayrıca gerekir.

Tam ilk partide 2.823 mevcut tam metin/cevap/kontrollü kapsam adayı, 1.772
içerik/görsel incelemesi ve 72 farklılık bulundu. 68'i genel Matematik kaynak
başlığı ile mevcut Geometri alt branşıdır; bunlar bankanın yanlış etiketli
olduğunu kanıtlamaz. Dört cevap farkında eski kitapların basılı anahtarları
bankadaki harfi, yeni ayrı testler başka harfi destekler. Düzeltilen 150 soru
ayrıca `--repairs` ile karşılaştırıldı: 63 mevcut aday, 86 içerik/görsel
incelemesi ve bir ek cevap nüshası farkı. Ortak şekilli 29 soru `--shared` ile
ayrı karşılaştırıldı: 24 mevcut aday, 5 içerik/görsel incelemesi. Üç partinin
toplamı 4.846 soru: **2.910 mevcut aday, 1.863 içerik/görsel incelemesi,
73 kapsam/cevap farkı** (68 Matematik–Geometri, 5 basılı cevap nüshası).
Geçerli karşılaştırmalar tekrarlanmaz; bu sonuç kesin tekrar/yeni soru kabulü değildir.

`yks_cevap_nusha_incele.py` görseli gerçekten okunmuş beş soru çiftini ve iki
basılı anahtar sürümünü kaydeder. Eski Fizik soru 27, yeni nüshada 30'dur;
eski anahtara yeni soru numarasıyla bakılmaz. Basılı numara özgün kayıt
kanıtından alınır. Nüsha uyuşmazlığında banka cevabı/geçmiş değiştirilmez,
eski soru yeni kodla eklenmez ve otomatik tekrar birleştirmesi yapılmaz.
Kanıt: `full-question-comparison/answer-edition-conflicts.json`.

## Önceden tamamlanmış kaynakların güncel tekrar kullanımı

`yks_mevcut_aktarim_kontrol.py` 217 eski tamamlanmış kaynağın özgün PDF hash'ini,
10.833 kayıtlı bağlantıyı, etkin YKS soru sürümünü ve gerçek görselleri kontrol
etti. Eski `data/ogm/img` referansı yeni sunum yolu ile metin olarak eşit
değildir; bu fark ancak **iki gerçek görsel dosyasının bayt hash'i eşitse**
geçilir. Dosya adının benzemesi yeterli değildir.

OGM sağlayıcı sorularında yeni bir AI cevabı üretilmez: özgün PDF'nin basılı
numarası/fiziksel sayfası/anahtarı taze okunur; saklanan ve güncel resmî API
cevabı ile mevcut banka cevabı aynı olmalıdır. Aynı sağlayıcı kimliği için
çelişen iki API cevabından keyfî seçim yapılmaz. Raw paketlerde iki kayıtlı
okuma ve güncel cevap korunur. Öğretmen veya yeni anlamsal kabul yazılmaz.

`existing-transfer-reuse/report.json`: **190 belge / 10.662 mevcut bağlantı**
bu denetimden geçti; **27 belge** eksik/farklı kanıt yüzünden incelemede kaldı.
Bu kaynakların mevcut soru kimlikleri korunur ve yeniden içe aktarılmaz.
Raporun banka snapshot'ı üç yeni kaynak karşılaştırmasıyla aynıdır.

Raster anahtar genişlemesinin 40 sorusu ayrıca bütün 80.230 bankaya karşı
karşılaştırıldı: 16 mevcut metin/cevap/kapsam adayı, 20 içerik/görsel incelemesi,
4 branş farkı. Dördünün de **cevabı aynı**; Edebiyat başlıklı kaynak içindeki
soruların mevcut kontrollü kategorisi Türkçe/Sözcükte Anlam'dır. Bu farklar
cevap nüshası çatışması değildir; mevcut branş otomatik ezilmez.

Dört karşılaştırma toplamı **4.886 soru / 2.926 mevcut aday / 1.883 içerik
incelemesi / 77 fark**: 68 Matematik–Geometri, 4 Edebiyat–Türkçe kapsamı,
önceden doğrulanmış 5 basılı cevap nüshası. Yeni veya kesin tekrar kabulü yok.

`yks_incelenmis_aktarim_kontrol.py` önceki 27 inceleme kaynağını kendi eski
kanıt sözleşmesiyle tekrar denetledi. Eski raw görsel yolu yerine kayıtlı
slide paketi, dosya hash'i, dondurulmuş içerik incelemesi, soru sürümü ve
güncel gerçek görsel kullanılır. Numarasız slayta soru numarası uydurulmaz;
kaynak hash'i + fiziksel sayfa + özgün kart kimliği kanıttır. Renkli cevapta
vektör rengi ve render pikselleri tekrar uyuşmalıdır.

95 ek bağlantı doğrulandı; iki belgenin 62 bağlantısı tamamen kapandı.
Tam belge bazında toplam **192 kaynak / 10.724 mevcut bağlantı**, kalan
**25 kaynak** eksik eski inceleme veya desteklenmeyen kanıt nedeniyle açık.
Diğer 33 ek doğrulanmış bağlantı kısmi belgeler içinde ayrıca saklıdır;
bu belgeler tamamen bitmiş sayılmaz. Yeni model/soru/öğretmen kararı yok.
