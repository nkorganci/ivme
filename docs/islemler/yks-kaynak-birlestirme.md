# YKS birleştirme kontrolü

[Plan ve görev dosyaları](../plan/15-yks-kaynak-birlestirme.md) gerçek iş kapsamını,
[görev tablosu](../gorev-durumu.md) tamamlanma kanıtını belirler.

```powershell
python scripts/ivme.py yks plan
python scripts/ivme.py yks durum
python scripts/ivme.py yks baslat
python scripts/ivme.py yks adim YKS-00 --resume
python scripts/ivme.py yks dogrula YKS-00
python scripts/ivme.py kalite calistir YKS-00
```

`plan`/`durum` salt okunurdur; `baslat` mevcut run varsa onu korur. `adim` yalnız
uygulanmış yürütücü ve doğrulanmış ön koşullarla çalışır. `--scope pilot` yalnız
YKS-07–10 içindir; tam yayılım pilot kabulünü atlayamaz. `--resume` aynı giriş
kimliğinde geçerli işi yeniden yapmaz; imleç yalnız aynı giriş için kullanılır.

Kontrol verisi Git dışında `veri/yks-birlestirme/<runId>/` içindedir. `current.json`
seçili run'ı gösterir; `state.json` atomik güncellenir, `events.jsonl` revizyon ve
işlem izini tutar. Her deneme ayrı `yks-xx/<scope>/attempt-NNNN/` altında kalır.
Eksik/değişmiş çıktı ve girdi hash'i doğrulamayı eskitebilir. OS kilidi süreç
ölümünde bırakılır; PID dosyasını silerek ikinci writer başlatılmaz.

YKS-00 yalnız kontrol aracını sınar; kaynak tarama/taşıma, DB ve model işi yapmaz.
Başka bir görev dosyasının bulunması yürütücüsünün mevcut olduğu anlamına gelmez;
`yks plan` çıktısındaki `implemented` alanı kontrol edilir.

Kabul geçince görev ve plan başlığında **BITTI**, durum tablosunda
**TAMAMLANDI — BITTI** tutulur. Pilot kabulü bütün adımı bitirmez. Kalan gerçek
iş ve tek sonraki komut devirde güncellenir.


## Bağımsız, geri alınabilir hazırlık

YKS-02/03 doğrulanınca özgün kaynaklara yalnız okuma yapan araçlar aşağıdadır.
Bunların PASS sonucu YKS-04–10 anlamsal/pilot kabulünün yerine geçmez.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pdf_on_tarama.py --workers 3
..\.venv\Scripts\python.exe -X utf8 scripts/yks_cevap_on_tarama.py
python scripts/yks_arsiv_hazirla.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_anahtar_pilotu.py --prepare-only
..\.venv\Scripts\python.exe -X utf8 scripts/yks_anahtar_pilotu.py
```

Ön tarama, mevcut PDF gözlem önbelleğini içerik hash/sürümüyle kullanır. Hiçbir
metin anahtarı bulunmayan belgeyi anahtarsız ilan etmez; OCR/görsel inceleme
bekler. Qwen pilotu yalnız basılı anahtar kırpımını okur, soruları çözmez; model
digest, kırpım, istem ve seçeneklerle önbelleklenir, pipeline model kilidini paylaşır.

Arşiv hazırlığı büyük immutable kaynakları aynı diskte hardlink ile yerleştirir;
bu yedek değildir. Operasyonel metadata kopyalanır. Katalog/hazirlanan-yollar.json
PREPARED kalır; çalışan kaynak kökü, soru bankası ve öğrenci kayıtları değişmez.
Eski tam-kök taramaları hazırlanan YKS ağacını ortak gezerle dışlar. Java ve Python
çözümleyiciler aktif projeksiyon verilmediğinde özgün dosya erişimini korur.
Bir hedef/hash hatası, başka dosyaya sessiz dönüşe izin vermez. Gerçek etkinleştirme
ve özgün yolların tasfiyesi yalnız YKS-11/YKS-13 kabulünden sonra yapılır.


Eksik OCR ve soru/tekrar pilotu da bağımsız kanıt üretir:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_ocr_on_tarama.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_cevap_on_tarama.py --with-ocr
..\.venv\Scripts\python.exe -X utf8 scripts/yks_soru_pilotu.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_tekrar_kabul.py
```

OCR, geçerli kaynak/sayfa/model önbelleğini kullanır; yalnız eksik sayfayı okur.
On iki soruluk pilotta basılı anahtar, kaynak kırpımı ve güncel tam banka metin/görsel
karşılaştırması birlikte gerekir. `exact-reuse-report.json` yalnız eski soruyu
kullanma kanıtıdır; yeni soru aktarma veya öğretmen onayı vermez. Üretim bankasına
hiçbir pilot aracı yazmaz. Mevcut kabul edilmiş PDF paketleri ve soru kodları korunur.

YKS-04 kabulü sonrasında bakım ve arayüz projeksiyonu canlı dosyaları değiştirmeden
hazırlanır:

```powershell
node scripts/yks-curriculum-import.mjs
node --test testler/yks-navigation.test.mjs testler/yks-maintenance.test.mjs
C:\Users\nkorg\.venvs\ogm-pipeline\Scripts\python.exe -X utf8 testler/yks-pipeline-navigation-test.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_konu_adaylari.py
```

`yol-uyumluluk/maintenance-candidate.json` bütün eski tanımları ve kapsam dışı
kimlikleri korur; `curriculum-identities-candidate.json` gezinme görünümüdür.
Excel dağılım verisi olarak kalır; MEBİ ana kaynak etkinse Excel üreticisi bu
ağacı değiştiremez. BGE yalnız belirsiz eski kapsamlar için eşleme önerisi verir;
skorlar onay veya otomatik kimlik birleştirmesi değildir. Geçerli vektörler
model digest ve tam girdi metniyle yeniden kullanılır.

Arşiv gezinmesi için `python scripts/yks_arsiv_gezinti.py`, ardından
`node testler/yks-archive-navigation-ui.mjs` ve
`python scripts/ivme.py yks adim YKS-06 --resume` kullanılır.
Bu kabul fiziksel hazırlık/gezinme içindir; soru ve canlı yayın kapılarını kapatmaz.
