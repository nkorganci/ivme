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

Genişletilmiş anahtar/soru pilotu:

```powershell
python scripts/yks_anahtar_gorsel.py --limit 2
..\.venv\Scripts\python.exe -X utf8 scripts/yks_ayri_anahtar.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_kaynaklari.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_sorular.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_kirpim_kontrol.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_tekrar_tara.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_tekrar_incele.py
```

`--limit` yalnız yeni yerel görsel model çağrısını sınırlar; mevcut geçerli
transkripsiyonlar tekrar kullanılır. İstem beklenen cevapları içermez. Ayrı
anahtar, yalnız aynı test numarasına bakılarak bağlanmaz: bütün soru gövdesi
metni ve çizim pikselleri aynı olmalıdır. Sürüm farkı dışarıda tutulur.
Kırpım kontrolü kaynak RGB piksellerini ve gövde satırı kapsamını doğrular;
formül/üs taşması veya değiştirilmiş görsel reddedilir. Tekrar ön incelemesi
tam banka kapsamında çalışır; aday benzerlik yeni soru/öğretmen onayı değildir.

Temsilî ek riskler ve pilot kapısı:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_deneme_anahtar_pilotu.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_ortak_paragraf_pilotu.py
python scripts/yks_secenek_degisimi.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_taranmis_zip_pilotu.py
python scripts/yks_pilot_riskleri.py
python scripts/ivme.py kalite calistir YKS-07
python scripts/ivme.py kalite calistir YKS-08
python scripts/ivme.py yks adim YKS-07 --scope pilot --resume
```

Geçerli çıktıları tekrar üretme; komutları yalnız eksik/değişen kanıt için seç.
Deneme sütunlarının her birinde numara yeniden başlayabilir. Alternatif din ve
felsefe soruları özgün sayıda tutulur. Tek anahtar listesine düzleştirilmez.
YKS-07 yürütücüsü şimdilik yalnız `--scope pilot` kabulünü uygular; tam arşiv,
dar konu/görsel kabulü ve üretim yayını ayrı kapılarda kalır.

Sınırlı yeni soru paketi ve konu denetimi:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_soru_konu_adaylari.py --subject din
..\.venv\Scripts\python.exe -X utf8 scripts/yks_konu_icerik_incele.py --subject din
..\.venv\Scripts\python.exe -X utf8 scripts/yks_soru_yenilik_kontrol.py --subject din
..\.venv\Scripts\python.exe -X utf8 scripts/yks_konu_anlam_kontrol.py --subject din
..\.venv\Scripts\python.exe -X utf8 scripts/yks_pilot_kabul_secimi.py
python scripts/ivme.py kalite calistir YKS-09
python scripts/ivme.py yks adim YKS-08 --scope pilot --resume
python scripts/ivme.py yks adim YKS-09 --scope pilot --resume
```

Her komut yalnız eksik/değişen kanıt için seçilir; çalışan yerel model işini ikinci
kez başlatma. Qwen kaynak kökü satırı ve gerçek konu PDF alıntısıyla öneri yapar;
ayrı GPT-OSS önerinin gerçek alıntıyla desteklenip desteklenmediğini sorgular.
Bu makinede GPT-OSS'nin ilk GPU denemesi HTTP 500 verdi; geçerli deneme
`num_gpu=0`, 4.096 bağlamla CPU üzerinde yapılır. Başarısız deneme kabul değildir.
Her iki modelde digest/istem/şema/seçenek/kaynak hash'i önbelleğe girer.

`bounded-pilot-selection.json` yalnız gerçek görseli okunan AYT Din tarama 8'in
1, 2 ve 4. sorularını, 12 eski Tarih kimliğinin yeniden kullanımıyla birleştirir.
3. sorunun seçilmiş kısa PDF alıntısı bağımsız okumaya yetersiz geldi; otomatik
olarak pakete alınmaz. 372 diğer aday ertelenir. `stage_09.py` yalnız üç yeni
sorunun kayıpsız özgün görselini, basılı kaynak cevaplarını, CSV'yi ve ortak v2
sözleşmeli konu ilişkilerini sürümlü pilot dizinine hazırlar. Öğretmen durumu
PENDING kalır; canlı katalog/DB/görsel köküne yazmaz. Tam arşiv veya canlı
INSERT_ONLY kapıları ayrı işlerdir.

Yalıtılmış prova yalnız eksik/değişen gerçek kanıt için
`..\.venv\Scripts\python.exe -X utf8 scripts/yks_izole_prova.py` ile çalışır.
Geçerli prova için `yks_izole_kanit.py` ve `ivme.py kalite calistir YKS-10`
yeniden DB kurmadan kanıtı doğrular. Formal pilot kapısı:
`python scripts/ivme.py yks adim YKS-10 --scope pilot --resume`.

Pilot geçtikten sonra tam arşivin tek tarama anahtarı düzeni
`yks_tam_anahtar_taramasi.py` ile işlenir. Çıktı `full-key-scan/progress.json`;
336 belge tamam, diğer 3.750 PDF düzeni açık. Görsel uyuşmazlık partisi
`yks_tam_anahtar_gorsel.py [--limit N | --cached-only]` ile devam eder. Sağlam
pilot/OCR/görsel okumalarını yeniden üretme; test kimliği çelişkisini veya
eksik gövdeyi modelin aynı cevabı okumasıyla geçerli sayma.
