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
