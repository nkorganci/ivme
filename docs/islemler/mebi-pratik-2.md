# MEBİ Pratik 2: aktarım ve inceleme

Öğrenci, yan menüde **Soru Çöz & Pratik 2** bölümünden sınav/ders/konu seçer.
Bu banka yalnız `D:\workspace\mebi-yks` kaynaklarını kullanır. Güncel miktar
ekrandaki sayaçtan ve `verified-source-batch-*/bank-acceptance.json`
makbuzlarından okunur. Eski Pratik bankası ayrı kalır.

## Kabul sırası

1. Özgün kaynak hash'i, basılı test/bölüm/adım kimliği ve soru numarasını bağla.
2. Beş seçenek ve tam gövdeyi özgün PDF piksellerinden kırp; devam/ortak
   paragraf kanıtı yoksa ayrı incelemeye al.
3. Basılı cevabı native okuma ve bağımsız görsel okumayla karşılaştır.
4. Kaynak başlığı veya açık soru kökü kanıtını ana tablonun mevcut kategori
   kimliğine bağla. Kanıtsız model konu önerisini yayımlama.
5. Son aktarım kapısında gövde ve anahtarı özgün PDF'den yeniden karşılaştır.
6. Yalnız Pratik 2 içinde tam RGB/gövde ve aynı cevap eşleşmesini kaynak
   tekrarı olarak kaydet. Eski banka karşılaştırması veya yenilik şartı yoktur.
   Eski soru kimlikleri birleştirilmez ve silinmez.
7. En fazla100 satırlık atomik INSERT_ONLY partileri al, ikinci ön izlemeyi
   sıfır delta ile doğrula, sürümlü katalog yayımla, canlı masaüstü/mobil
   sayaç ve özgün görsel hash'lerini kontrol et.

## Gerekçeli inceleme kuyruğu

Kanıt kökü `veri/mebi-pratik-2/20261111-source-inventory/`.

| Dosya/katman | Anlamı |
|---|---|
| `teacher-review-export/current/question-candidates.csv` | Soru bazında kalan karar; kaynak, sayfa, görsel, cevap ve neden |
| `teacher-review-export/current/by-reason/*.csv` | Aynı adayların gerekçelerine göre ayrılmış öğretmen listeleri |
| `teacher-review-export/current/source-group-reviews.json` | Soru sayısı bilinmeyen test/bölüm grubu |
| `archive-disposition/source-review.csv` | Bütün dosyaların gerekçeli inceleme yolu |
| `archive-disposition/pdf-page-decisions.jsonl` | Her PDF sayfasının sonucu ve ham işaretleri |
| `review-index.sqlite3/candidate_decisions` | Güncel tekil aday kodu ve karar |
| `review-index.sqlite3/source_dispositions` | Güncel kaynak dosyası kararı |
| `review-index.sqlite3/native_signals` | Ham numara/anahtar işaretleri; doğrulanmış soru değildir |
| `verified-source-batch-*/exact-duplicate-evidence.json` | Aynı piksel ve cevaba bağlanan ek kaynak konumu |
| `verified-source-batch-*/final-source-acceptance.json` | Son özgün piksel kapısının kabul/istisna kayıtları |

Kategoriler: **cevap anahtarı doğrulaması**, **soru gövdesi bütünlüğü**,
**konu/ders eşleştirmesi**, **kaynak/görsel kanıtı**, **belge düzeni ve soru
kimliği**. İlk okumada cevap bulunamaması doğrudan vazgeçme nedeni değildir.
Aynı basılı test/bölüm/adım kimliğiyle kaynak içi diğer anahtar konumu ve
mevcut kanıt kontrol edilir; bir farklı yerel OCR yöntemiyle sınırlı kurtarma
geçişi yapılır. Aynı başarısız istem döngüde tekrarlanmaz. Yine doğrulanamayan
incelemeye ayrılır; açıkça çelişen cevap tahminle seçilmez.
Bu kayıtlar öğrenci listesine ve otomatik pratik havuzuna girmez. Öğretmen
kararı ancak gerçekten verilirse ayrıca kaydedilir.

Dosya/sayfa/ham gözlem/test grubu/adayı/aktarılmış soruyu birbirine ekleyip
“toplam soru” diye sunma. Aynı soru birden fazla kaynakta bulunabilir.

## Devam ve güncelleme

Tam arşiv görevi, inceleme listesi hazırlanarak kapatılamaz. Önceki
`archive-closeout.json` yalnız ilk geçiş kanıtıdır; plan üreticisi bu
makbuzdan ana BITTI çıkarmayı reddeder. Kullanıcı tekrar “devam et” demeden
çalışma/context/token sınırına kadar yürüt; yeni bağlamda imleçten sürdür.

Tam arşiv genişleme sırası (aynı çalışan işi tekrar başlatma):

```powershell
python scripts/mebi_pratik2_arsiv_basliklari.py
python scripts/mebi_pratik2_arsiv_kabul.py --chunk-size 200 --publish
python scripts/mebi_pratik2_sozcuk_kirpim.py
python scripts/mebi_pratik2_arsiv_kabul.py --package-dir word-boundary-expansion --first-batch 19 --wait-for curated-chapter-expansion/pass-result.json --chunk-size 200 --publish
python scripts/mebi_pratik2_arsiv_izle.py --watch
```

Başlık paketi oluşturulunca değişmez; tekrar hazırlama yerine kabul
worker'ını mevcut makbuzlardan devam ettir. İlk genişleme007–018; sözcük
yerleşimi019+partileridir. Sözcük yerleşimi yeni özgün piksel kanıtıdır;
önceki başarısız kırpım/okuma korunur. Bunların tamamı tam arşivin alt
işidir. Model/konu önerisi tek başına kabul edilmez; kontrollü kaynak başlığı,
bağımsız basılı anahtar, tam gövde, son piksel ve canlı kapılar zorunludur.

Çalışan modeli veya aktarımı yeniden başlatma; ilgili
`progress-current.json` ve `continuation-progress.jsonl` üzerinden izle.
Bekleyen aktarım ve kabul sırası `docs/devam.md` içinde gösterilir.

Tamamlanmış kanıt manifestiyle yeni parti:

```powershell
python scripts/mebi_pratik2_arsiv_partisi.py --acceptance <goreli-kabul-json> --batch-dir verified-source-batch-NNN --after-batch verified-source-batch-ONCEKI
```

Başarılı makbuzlar tekrar çalıştırılmaz; hata veren bağımlılık sonraki adımı
başlatmaz. Kaynak kabulü ve üretim alımı ayrı makbuzlardır.

Güncel kuyruk ve dosya/sayfa matrisi:

```powershell
python scripts/mebi_pratik2_guncel_kuyruk.py
python scripts/mebi_pratik2_arsiv_kararlari.py
```

Tam arşivde gerekçeli karar kaydı tamamlanması, bütün basılı soruların
çıkarıldığı veya öğretmen tarafından onaylandığı anlamına gelmez. Kapanış
raporu aktarılan kapsamı ve ertelenen incelemeyi ayrı gösterir.

## Matrisler, çözümlü sorular ve native metin boşlukları

```powershell
python scripts/mebi_pratik2_gorsel_sayfa_ocr.py
python scripts/mebi_pratik2_gorsel_sayfa_ocr.py --enrich-words
python scripts/mebi_pratik2_dort_dortluk.py
python scripts/mebi_pratik2_dort_dortluk_kirpim.py
python scripts/mebi_pratik2_arsiv_kabul.py --package-dir four-square-expansion --first-batch 25 --wait-for word-boundary-expansion/pass-result.json --chunk-size 500 --publish
python scripts/mebi_pratik2_anahtar_kimlik_kurtarma.py --wait-and-publish
```

Mevcut çalışanları tekrar başlatma. Matrisler sütun numarası, basılı test ve
A/B varyantıyla bağlanır; boş hücre harfleri kaydırmaz. Çözümlü sorunun
öğrenci görseli Çözüm’den önce kesilir, basılı Cevap: ayrı kanıttır.
İlk okuma OCR ise ikinci bağımsız yöntem görsel modeldir. Başlık/adım
hatasında kaynaktan yapılan agent görsel okuması ayrı yöntem olarak yazılır;
insan öğretmen onayı üretilmez, eski başarısız makbuz silinmez.

Görselsiz bazı gövdelerin yerel kaynak kanıtı:

```powershell
python scripts/mebi_pratik2_native_govde.py --package-dir <paket-dizini>
```

Bu kısayol kaydedilmiş başarılı/başarısız görsel okumayı değiştirmez.
Özgün piksel eşitliği, bütün native sözcük kutuları, doğru soru numarası,
beş seçenek, grafik/şekil ve dış bağlam yokluğu birlikte aranır. Kanıt
makbuzuna model çağrısı0 yazılır; kalanlar normal görsel incelemeye gider.

### 3 Adım deneme kaynak kimliği keşfi

`python scripts/mebi_pratik2_uc_adim_deneme.py` dört deneme kitabında basılı
adım/deneme/test bölümü/soru numarasını eşler. Döndürülmüş adım başlığının
metin kutusu ilk/son cevap satırını kapsamaz; özgün PDF vektöründeki dikey
tablo şeridi sınır olarak kullanılır. Boş cevap hücresi sonraki harfleri
kaydırmaz. Çıktı `three-step-mock-discovery/`; keşif aktarım kabulü değildir.
`python testler/mebi-pratik2-three-step-mock-test.py` kimlik/boş hücre
ve eksik vektör şeridi sınırlarını denetler.

`python scripts/mebi_pratik2_native_govde.py --audit-existing` eski CPU
gövde makbuzlarını tam native satır/sözcük sınırını da isteyen V2 ile
denetler. Zayıf türetilmiş makbuz arşivlenir ve gerçek görsel okuma yolu
korunur; özgün kaynak ve soru kaydı silinmez. Yayımlanmış başarısız kanıt
varsa makbuzları değiştirmeden görsel inceleme gerektiren raporla durur.

### Devam eden yeni deneme ve üst başlık geçişleri

- `python scripts/mebi_pratik2_uc_adim_deneme_kirpim.py`:özgün soru görüntüsü,
  adım/deneme/bölüm kimlikli anahtar kırpımı ve yalnız açık soru-komutu konu bağı.
  İnce konusu bilinmeyenler `three-step-mock-crops/` içinde ayrı gerekçeli kalır.
- `python scripts/mebi_pratik2_uc_adim_deneme.py --output-dir three-step-mock-discovery-v2`
  ve `python scripts/mebi_pratik2_uc_adim_deneme_kirpim.py --discovery-dir three-step-mock-discovery-v2 --output-dir three-step-mock-additional-crops --package-dir three-step-mock-additional-expansion --additional-only`
  girintili sağ Fen sütunu kanıtını ayrı sürümde çıkarır; sıradaki/önceki sağlam
  soru kodları veya görüntüleri yeniden yazılmaz.
- `python scripts/mebi_pratik2_dort_dortluk.py --output-dir four-square-discovery-v4`
  üstte başlayan soru metnini kitap bölüm başlığından ayırır.
  `python scripts/mebi_pratik2_dort_dortluk_kirpim.py --discovery-dir four-square-discovery-v4 --output-dir four-square-header-crops --package-dir four-square-header-expansion --additional-only`
  yalnız yeni/düzeltilmiş fiziksel gövdeleri ayrı üretir; önceki aday kodu
  korunur, sıraya alınmış kod tekrar kabul edilmez. Aynı grup ve aynı görsel
  hashindeki bağımsız anahtar makbuzu tekrar OCR/model çağrısı olmadan kullanılır.
-041:`three-step-mock-expansion`172 aday;042–043:`four-square-header-expansion`867
  aday. `mebi_pratik2_arsiv_kabul.py --package-dir <ad> --first-batch <ilk> --wait-for <önceki>/pass-result.json --chunk-size 500 --publish`.
  Bunlar mevcut kabul kapılarını geçmeden soru aktarılmış sayılmaz.
