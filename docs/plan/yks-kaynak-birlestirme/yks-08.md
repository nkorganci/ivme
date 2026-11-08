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
