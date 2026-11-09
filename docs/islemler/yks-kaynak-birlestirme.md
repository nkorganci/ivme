# YKS birleştirme kontrolü

## Tam PDF hazırlığındaki yeni partilerden devam

Önce run içindeki `full-source-coverage/report.json`, `session-checkpoint.json`
ve adımın kendi raporu okunur. COMPLETE/PASS olan aynı girdi için model,
OCR veya bütün banka karşılaştırması yeniden çalıştırılmaz. Kaynak/araç/girdi
değişikliği varsa yalnız etkilenen parti açılır. Bunlar tam aşama kabulünden
önceki hazırlık komutlarıdır:

```powershell
# Altı açık gövde yerleşimi: anahtar → özgün kırpım → banka karşılaştırması.
..\.venv\Scripts\python.exe -X utf8 scripts/yks_istisna_anahtar.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_istisna_kirpim.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py --exceptions
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_incele.py --exceptions

# Tek sayfadaki yedi anahtardan yalnız Fizik TYT-4.
..\.venv\Scripts\python.exe -X utf8 scripts/yks_coklu_test_anahtar.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_coklu_test_kirpim.py
# Karşılaştırıcılar için --multikey kullanılır.

# Yanlış etiketli iki Edebiyat anahtarı: resmî tam gövde eşitliği zorunlu.
..\.venv\Scripts\python.exe -X utf8 scripts/yks_edebiyat_ayri_anahtar.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_coklu_test_kirpim.py --rebound
# Karşılaştırıcılar için --rebound kullanılır.

# Deneme kaynakları: özgün metin etiketi ve görünür glyph ayrı kalır.
..\.venv\Scripts\python.exe -X utf8 scripts/yks_deneme_etiket_kontrol.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_deneme_govde.py --workers 3
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py --mock
..\.venv\Scripts\python.exe -X utf8 scripts/yks_deneme_kapsam.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_deneme_cevap_farki.py

# Tamamlanan anlamlı partinin kapsamını, imlecini ve DB arşivini kaydet.
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_kapsam.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_hazirlik_checkpoint.py
& 'C:\Users\nkorg\.venvs\ogm-pipeline\Scripts\python.exe' -X utf8 scripts/yks_kanit_db.py save
```

Arşiv bağlantısı 55432'deki **mevcut ayrı pipeline instance** üzerindedir.
Kapalıysa `pipeline` dizininden pipeline Python ile yalnız
`-c "from setup_database import start_instance; start_instance()"` çağrılır;
`bootstrap`, `repair_bootstrap` veya `initdb` çalıştırılmaz. Bu yöntem yeni
cluster/kimlik bilgisi oluşturmaz. Ardından kayıt yeniden denenir. Başarılı
`save`, bütün farklı ham dosyaları DB'den geri okuyup hash'lerini sınar ve aynı
checkpoint'in ikinci yazımında 0 INSERT olduğunu doğrular. Eski arşiv sürümleri
korunur; sorgulanabilir hazırlık durumu öğretmen onayı veya soru yayını değildir.

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

Tam kaynak anahtarı/kırpım/tekrar hattında eksik aşamayı seç:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_ayri_anahtar.py --subject kimya
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_ayri_anahtar.py --subject tarih
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_ayri_anahtar_gorsel.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_buyuk_anahtar_incele.py --visual
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_kaynak_kontrol.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_soru_kirpim.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_incele.py
```

Geçerli anahtarları/görselleri yeniden okutma: 191 doğrudan ve 14 ayrı anahtarın
ikinci geçişinde yeni model çağrısı 0; ayrı kitap ikinci geçişinde OCR 0;
kırpım ikinci geçişinde 259 belge tekrar kullanıldı ve render 0. Toplam
259 kaynakta 4.846 cevap ve ilk pakette 4.667 teknik sağlam soru vardır.
Sekiz sorunlu belgenin 179 sorusu aşağıdaki ayrı düzeltme hattında hazırlandı;
diğer kaynak düzenleri ve içerik/konu/tekrar kabulü açık.
Salt sayaçların değişmesi kaynak paketinin değişmesi sayılmaz. Gerçek PDF,
anahtar, soru/görsel hash'i veya mevcut banka sürümü değişirse ilgili kanıt
yeniden doğrulanır. Hiçbir komut tam görevi BITTI yapmaz veya canlıya soru yazmaz.

Sekiz yerleşim istisnasında eski çıktıları koruyan ek hazırlık:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_kirpim_istisna.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py --repairs
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_incele.py --repairs
..\.venv\Scripts\python.exe -X utf8 scripts/yks_ortak_sekil_kirpim.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py --shared
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_incele.py --shared
..\.venv\Scripts\python.exe -X utf8 scripts/yks_cevap_nusha_incele.py
```

`--repairs` yedi belge/150 soruyu, `--shared` tek belge/29 soruyu ayrı
klasörlerde karşılaştırır; ilk 4.667 soruluk geçerli işi yinelemez. Ortak
şeklin iki soruda da kaynak pikselleri korunur; komşu soru içeriği eklenmez.
Beş basılı cevap nüshası farkı mevcut bankayı otomatik düzeltmez; eski ve yeni
basılı soru numaraları ayrı tutulur. Her adımın çalışma sayacı ve kalan işi
ilgili `progress.json` içindedir.

Üç karşılaştırma tamamlandı: 4.846 soruda 2.910 mevcut aday, 1.863 içerik/görsel
incelemesi ve 73 fark (68 Matematik–Geometri kapsamı, 5 cevap nüshası).
YKS-07/08/09/10 kalite profilleri sırasıyla 43/21/14/18 test PASS; gerçek
yalıtılmış aktarımın daha önce geçen dört backend senaryosu yeniden çalıştırılmadı.

Bütün kaynaklarda kalan işi ve Denemeler genişlemesini takip et:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_deneme_anahtar.py --visual
..\.venv\Scripts\python.exe -X utf8 scripts/yks_govde_istisna_incele.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_kapsam.py
```

İlk komut uzun çalışabilir; aynı okuyucu çalışıyorsa ikinci süreç başlatma.
`full-mock-keys/progress.json` belge imlecidir; kesintide aynı komut geçerli ham
OCR/model kanıtlarını yeniden kullanır. Anahtar uyuşması tek tek soru/branş/dar
konu veya aktarım kabulü değildir. Son komut `full-source-coverage/` altında
4.086 kaynak ve 67.277 sayfanın kalan işini JSONL ve okunabilir CSV olarak yazar.
Deneme okuyucusu çalışırken alınan rapor tamamlanan belge kapsamının anlık
görüntüsüdür; girdi yazım sırasında değişirse rapor reddedilir ve yeniden alınır.
Altı gövde istisnasındaki 94 sorunun bağımsız anahtar ve piksel/konu incelemesi açık.

Eski tamamlanmış aktarımın güncel kanıtı için (yalnız gerçek girdi değişince):

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_mevcut_aktarim_kontrol.py
```

`existing-transfer-reuse/report.json` 190 belgede 10.662 mevcut bağlantıyı
doğruladı; 27 belge incelemede. Eski/yeni görsel yollarını metin değiştirerek
eşitlemez: gerçek dosyaların hash'lerini karşılaştırır. Sağlayıcı kaydında
basılı cevap, fiziksel sayfa/numara ve güncel resmî API cevabı tekrar okunur.
Mevcut soru ID/cevap/geçmiş değiştirilmez; geçerli denetimi baştan çalıştırma.

Yeni konu özeti/kitap PDF'leri için geçerli keşfi yeniden çıkarma. Yeni girdi
veya eksik kanıt varsa sıra:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_yeni_pdf_soru_kesfi.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_yeni_pdf_sinav_kapsami.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_kapsam.py
```

1.012 PDF'nin ikinci geçişi tamamen önbellektir. **Daima `scoped-report.json`**
çıktısını kullan: Ortak klasöründeki 14 YDT PDF'nin 1.118 bölgesi TYT/AYT
kuyruğundan ayrıldı; kalan dört belgede 2.069 aday cevap/tekrar/konu kanıtı bekler.
Gövde ve anahtarın basılı sınav başlıkları birlikte kanıttır; yalnız klasör adı
veya soruda geçen YDT sözcüğüyle kapsam atanmaz. Arşivden dosya silinmez.

Kullanıcının maliyet tercihi: toplu PDF işi yerel Python/PyMuPDF ve önbellekli
OCR ile yürür; yerel Ollama yalnız kural/OCR uyuşmazlığı ve konu adayı için
kullanılır. API ajanının rolü gerekli kod düzeltmesi ve kısa istisna incelemesidir;
belge başına sohbet/ajan döngüsü veya uzun ham çıktı yüklemesi yapılmaz.
OpenCV yalnız sınır/yerleşim adayına yardımcıdır; cevap veya soru bütünlüğü
onayı vermez. PaddleOCR ayrı ortamda zor örneklerle karşılaştırılacak bir
seçenektir; henüz kurulmadı ve mevcut OCR hattının yerine geçirilmedi.
Formül/şekil özgün kırpım olarak kalır; OCR ile yeniden çizilmez. Değişmeyen
başarılı kanıt tekrar işlenmez, belirsiz sonuç otomatik aktarılmaz.

**Güncel kullanıcı önceliği:** doğruluk, kalite ve kontroller maliyetten önce
gelir. Güvenilirliği azaltacak araç/model değişimi veya kontrol azaltımı yoktur.

İşlem kanıtı veritabanı arşivi — ayrı `ogm_ders.yks_evidence` şeması:

```powershell
C:\Users\nkorg\.venvs\ogm-pipeline\Scripts\python.exe -X utf8 scripts/yks_kanit_db.py status
C:\Users\nkorg\.venvs\ogm-pipeline\Scripts\python.exe -X utf8 scripts/yks_kanit_db.py save
C:\Users\nkorg\.venvs\ogm-pipeline\Scripts\python.exe -X utf8 scripts/yks_kanit_db.py verify
C:\Users\nkorg\.venvs\ogm-pipeline\Scripts\python.exe -X utf8 scripts/yks_kanit_db.py roundtrip
```

`save` her batch sonunda bütün işlem dosyalarının ve 4.086 kaynağa ait native
sayfa/OCR önbelleğinin ham baytlarını hash adresli saklar. Aynı hash bir kez
yazılır; değişen dosya yeni sürümdür. Manifest, kaynak durumu ve sorgulanabilir
sayfa/anahtar/soru kartı/tekrar/nüsha/aday kayıtları tek transaction'da eklenir.
Eksik/çelişkili okuma da özgün durumuyla saklanır; onaya dönüştürülmez.
Kaynak PDF'ler ve büyük eski DB/medya yedekleri tekrar DB içine kopyalanmaz;
özgün konum/hash ve doğrulanmış yedek referansları korunur. Özel yerel ayarlar
ve kaynak checkout'ları arşive alınmaz. Uygulama `ivme` soru/öğrenci/katalog
tablolarına bu komutlarla yazılmaz.

`verify` arşivdeki her farklı dosyanın ham baytlarını geri okuyup hash ve kayıt
sayılarını denetler; Windows bağlantı tamponunu aşmamak için bir dosyayı ikili
biçimde getirir. Aynı checkpoint ikinci kez kaydedildiğinde yeni ekleme 0'dır.
`roundtrip` JSON, sıkıştırılmış sayfa, özgün soru görseli ve vektör dosyasını
`veri/yks-restored/` içinde yeni dosyalara geri yükler ve hash karşılaştırır.
Mevcut dosya veya özgün arşiv üzerine yazılmaz. Tek dosya geri alma:
`yks_kanit_db.py restore --checkpoint <sha> --path <manifest-yolu> --destination <veri/yks-restored/yeni-dosya>`.

SQL değişirse `yks_kanit_db_prova.py` önce geçici `ivme_test` içinde üç gerçek
SQL senaryosunu `ivme.py test YksEvidenceArchiveTest` üzerinden çalıştırır.
Geçerli üç test ve eski dört aktarım testinin ham XML/log kanıtları ayrı
korunur; salt kayıt/geri okuma için eski DB provasını tekrarlama.

Denemelerin tam anahtar taraması tamamlandı: 46 belge, 42 kaynak/5.988 cevap;
ikinci geçiş 0 OCR/model. 21 belgede native/render uyarıları için
`pdf-on-tarama/mock-decoding/report.json` okunur. Yeniden render yalnız ilgili
PDF/renderer/girdi değişince: `yks_deneme_render_kontrol.py` (2.327 sayfa).

İki raster Edebiyat anahtarı ve 40 sorunun ayrı hattı da tamamlandı:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_raster_anahtar_incele.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_raster_soru_kirpim.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py --raster
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_incele.py --raster
```

Geçerli 4.846 eski karşılaştırmayı yineleme. Raster çıktısı 16 mevcut aday,
20 içerik/görsel incelemesi ve cevapları aynı olan 4 Edebiyat–Türkçe branş
farkıdır. Toplam 4.886 sorunun kanıtı ve deneme çözümleme uyarıları yeni
`yks_tam_kapsam.py` kapsamına ve sonraki DB checkpoint'ine dahil edilir.

Eski kabulün farklı görsel yolu/numarasız slide sözleşmesi için ayrı ek kontrol:
`..\.venv\Scripts\python.exe -X utf8 scripts/yks_incelenmis_aktarim_kontrol.py`.
`reviewed-transfer-reuse/report.json` 95 ek bağlantıyı doğruladı; iki kaynak
tamamıyla eklenerek toplam 192 kaynak/10.724 bağlantıya çıktı, 25 kaynak açık.
Kısmi belgelerdeki ek doğrulama tam kaynak kabulü sayılmaz. Özgün paket,
görsel ve inceleme dosyaları hash'leriyle DB arşivine dahil edilir.

İki yeni Din kitabının tamamlanan alt hattı:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_din_kitap_anahtar.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_din_kitap_govde.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_tara.py --din-books
..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_tekrar_incele.py --din-books
```

647 anahtar hücresi 647 soru değildir: 643 gövde, 586 bağlı soru, tamamı
dışarıda tutulan iki testte 57 gövde vardır. Başarılı anahtar/model/kırpım ve
banka karşılaştırmasını tekrar yapma. Kaynak, paket veya girdi hash'i değişirse
yalnız ilgili işi yeniden aç.

3 Adım Türkçe nüshaları için `yks_sayfa_esitligi.py` 281 eşit sayfanın önbelleğini
kullanır; `yks_turkce_nusha.py` yalnız değişen iki sayfayı kontrol eder, eski
tamamlanan/pending kimlikleri ve özgün inceleme sözleşmelerini korur. Yeni
nüsha anahtarını eski soru cevabının üzerine yazmaz. Özetteki tek cevapsız
sorunun tam belge incelemesi `yks_ozet_belge_incele.py`; eski denemelerin sekiz
basılı anahtar farkı `yks_deneme_cevap_nusha.py` ile kayıtlıdır.

Yeni partiler eklendiğinde `yks_partiler_arasi_tekrar.py` kaynaklar arası
adayları günceller; düşük benzerlik NEW, eşit metin de grafik eşitliği sayılmaz.
Sonra `yks_tam_kapsam.py`, ilgili kalite profilleri, `yks_hazirlik_checkpoint.py`
ve pipeline Python ile `yks_kanit_db.py save` çalışır. Tam adım kabulü olmayan
hazırlığa BITTI yazma; tamamlanan alt işleri ayrıca belirt.

Eski işin tamamını kapsayan uzlaştırma ve geniş konu sırası:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_kismi_kaynak_aktarimlari.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_cikmis_aktarim_kaniti.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_soru_konu_adaylari.py --subject din --scope full
..\.venv\Scripts\python.exe -X utf8 scripts/yks_konu_icerik_incele.py --subject din --scope full
..\.venv\Scripts\python.exe -X utf8 scripts/yks_konu_anlam_kontrol.py --subject din --scope full
```

İlk iki iş tamamlandıysa yeniden başlatma; `all-prior-occurrences/report.json`
ve `booklet-prior-reuse/report.json` geçerli kanıtı verir. İlk araç yalnız tam
kitapları değil, bütün 1.179 eski kaynağın bağlantı/adayı/incelemesini korur.
Özgün kayıt başına kanıt ve imleç saklanır; semantik `VERSION` değişmediğinde
yalnız çıktı/izinli kanıt yolu düzeltmesi tamamlanan 80 bin görseli tekrar
hash'lemez. Kaynak/öğrenci/soru sürümü değişirse ilgili önbellek reddedilir.

`--scope full` ayrı `full-question-topics/` altında çalışır; biten pilotu
ezmez. Kaynak kökü ve gerçek konu PDF alıntısı olan eski Qwen cache'leri yeniden
kullanılır. Büyük model lease'i Qwen ve GPT-OSS'u sıraya koyar. Soru-cevap
çıkarımı veya dar konu kararını embedding benzerliği vermez. Devam komutundan
önce çalışan aynı işi kontrol et; ikinci ağır modelle yarışma.

DB arşivi artık özgün ham kaynak paketlerini, bütün eski locator kayıtlarını
ve model/text kimliği doğrulanmış 1.024 boyutlu BGE önbelleklerini de içerir.
Çalışan yerel modelin raporu RUNNING kalır; rapordaki tamamlanmış satırların
immutable ham cevap cache'leri aynı snapshot'a ayrıca alınır. Tamamlanmamış
iş tamamlanmışa çevrilmez, yayın/öğretmen kararı oluşturulmaz.

## Tamamlanan ek partiler ve sürüm düzeltmeleri

Aşağıdaki çıktılar varsa ve girdi hash'leri değişmemişse tekrar çalıştırılmaz:

- `yks_partiler_gorsel_incele.py`: 36 çiftin gerçek 72 görseli, 35 tekrar ve bir cevap çelişkisi.
- `yks_bekleyen_tekrar_kontrol.py` + `yks_bekleyen_gorsel_incele.py`: 5.303 eski pending kimliği ve C/A farklı matematik nüshaları.
- `yks_kimya_soru_nushasi.py`: 63 Kimya kaynağında soru düzeyinde 180/330 DPI kontrolü.
- `yks_kimya_kismi_anahtar.py` + `yks_kimya_kismi_dogrula.py`: 18 native/OCR tam uyumlu anahtardan yalnız 150 eş soru.
- `yks_tam_tekrar_tara.py --chemistry-parts` + `yks_tam_tekrar_incele.py --chemistry-parts`: yalnız bu 150 sorunun banka karşılaştırması.
- `yks_partiler_arasi_tekrar.py --chemistry-parts`: geniş sonuç `expanded-with-chemistry/` içinde; okunmuş eski 36 çift raporu ezilmez.
- `yks_kismi_incelenmis_aktarim.py`: 28 eski kabul kanıtı daha; eksik tek eski rapor hash'ine bağlı 127 bağ bekler.
- `yks_mevcut_gorsel_incele.py`: altı kaynak/banka görsel eşleşmesi; farklı TYT/AYT ilişkisi ayrı tutulur.
- `yks_din_istisna_incele.py`: beş istisna, dört ayrı düzeltilmiş sürüm ve kaynakta aynı D/E seçeneği bulunan bir dışlama.
- `yks_tam_tekrar_tara.py --din-amendments` + `yks_tam_tekrar_incele.py --din-amendments`: yalnız bu dört yeni sürümün karşılaştırması.
- `yks_banka_metin_eki.py`: metinsiz tek banka sorusunun gerçek görselinden karşılaştırma eki; eski 80 bin karşılaştırmayı yinelemez.
- `yks_konu_destek_istisna.py`: iki model desteklese de üç konu önerisini kaynak incelemesinde tutar, bir gerçek PDF alıntısı ekler.

Geniş Qwen 1.099 soruda tamamdır. Bağımsız GPT-OSS'un `--scope full
--from-reviewed-images` çalışması yalnız seçilmiş 37 sorudadır ve tamamlandı;
yeniden model çağırma. `entireInputSelected=false` bütün kapsamın bittiği
iddiasını engeller. Düzeltilen q24'ün eski konu okuması geçersizdir; aynı
koda sahip sürümler birbiri yerine sessizce kullanılmaz.

Yeni anlamlı parti sonrası yalnız kapsam birleştirmesi ve değişen kalite
profili çalışır. Sonra pilot kanıt referansları yenilenir; dört gerçek DB testi
değişmediyse tekrarlanmaz. `yks_hazirlik_checkpoint.py` güncel imleci yazar,
pipeline Python ile `yks_kanit_db.py save` ham baytları ve kayıtları DB'ye
sürümleyip geri okur. Tam adımların açık kabulü sürerken BITTI yazılmaz.

## Kimya OCR istisnalarının tamamlanan ek hattı

`yks_kimya_gorsel_anahtar.py` 42/42 anahtarı aynı özgün 330 DPI kırpımda
Qwen ile tamamladı. `yks_kimya_gorsel_soru.py` yalnız iki DPI gövdesi eşit
392 ek soruyu hazırladı; `--verify-only` güncel PDF/ham cevap/görsel kanıtını
OCR/model tekrarı olmadan doğruladı. `yks_tam_tekrar_tara.py --chemistry-visual`
ve `yks_tam_tekrar_incele.py --chemistry-visual` yalnız ek 392 soruyu bankayla
karşılaştırdı. `yks_kimya_eski_kimlik.py` bütün 542'de 376 eski kanonik ID'yi
aynı resmî kitap/sayfa/numara ve iki DPI eşitlik zinciriyle doğruladı; 166 bekler.

`yks_partiler_arasi_tekrar.py --chemistry-visual` ayrı
`expanded-with-visual-chemistry/` raporunda 12.052 soruyu birleştirir.
`yks_kirpim_geometri_kontrol.py` aynı rapordaki bölgeleri güncel dört sürümle
sınar; ortak şekiller korunur, eski q24 hatası yakalanıp güncelde temizdir.
`yks_ek_bekleyen_tekrar.py` yalnız ek 546 sürümü arşivlenmiş eski 5.303 pending
kaydıyla karşılaştırır; ilk 11.510 kaynağı veya eski PDF metinlerini yinelemez.

Bu çıktılar tamamsa komutları yineleme. Kimya konu sırası ayrı
`full-question-topics/kimya/` altındadır. 1.030 soruda BGE sıralaması tamam;
`yks_konu_icerik_incele.py --subject kimya --scope full --limit 12` ilk kontrollü
kaynak okumasıdır. Önce çalışan süreci ve ham cache'i kontrol et; şekil/formül
anlamı eksik metin veya model anlaşması yeni soru/konu kabulü sayılmaz.

## Metnin kaçırdığı kimlikler ve bütün hazırlık kuyruğu

`yks_kimya_eski_kimlik.py --by-official-locator` ilk 376 kanıtı ezmeden kalan
166 soruyu aynı resmî kitap/fiziksel sayfa/basılı numaradan ve güncel kontrollü
kimya/sınav kapsamından eski ID'ye bağladı. Toplam 542/542; bu işi yineleme.

`yks_tarama_eski_kimlik.py` 3.036 tarama adayında tamam: 1.779 kesin resmî
native+180/330 DPI/önceki kanonik bağ, 1.257 kaynak farkı incelemesi. Kutu,
piksel, test başlığı, basılı numara veya eski cevap farkında kabul verilmez.
İlk kesintideki 191 ham sonuç tekrar kullanıldı; ikinci tam geçiş 3.036 cache,
0 yeni karşılaştırmadır. Per-soru ham kanıt hash'leri rapora bağlıdır. Değişen
girdi yoksa tekrar çalıştırma.

`yks_soru_kabul_kuyrugu.py` 12.052 güncel sürümü tek kaynak/ID/engel görünümüne
birleştirir. Bu çıktı kalıcı banka yazımı veya tam adım kabulü değildir.
Kimya üç gerçek görsel için `yks_gorsel_konu_pilotu.py` aynı aday listesi ve
PDF alıntılarıyla 1/3 konu eşleşmesi verdi; ikinci çağrı ham cache'i kullandı,
0 yeni model. Yanlış konu/cevap üreten çıktı reddedilir; bütün Kimya'ya yayma.
Eski kategori/cevap ve öğretmen durumuna yazım yapılmadı.

Tamamlanan deneme kimlik alt işleri aynı betiğin ayrı klasörleridir:
`yks_tarama_eski_kimlik.py --mocks` (1.458), `--mocks --combined` (447),
`--mocks --source-exceptions` (103). Bunları değişmeyen girdide tekrar
render etme. 389 çoklu eski ID vakasında bütün kaynak ve öğrenci geçmişi
korunur; fiziki soru eşitliği mevcut iki ID'yi silme/birleştirme izni vermez.

`yks_deneme_ders_gorsel_incele.py` yanlış TYT aralığı altındaki 40 özgün
sorunun gerçek görsel okumasını sabit hash'lere bağladı. 39 ders açık,
nanoteknoloji13 iki kayıtlı ders PDF'siyle ortak kapsam incelemesinde. Yeni
konu modeli veya cevap üretimi yapılmadı. `yks_soru_kabul_kuyrugu.py` güncel
kimlikleri ve bu ders incelemesini birleştirir; `yks_tam_kapsam.py` her PDF'ye
yalnız ilgili soru durumlarını ekler. Tam adım kabulü/publikasyon vermez.

Tamamlanan ayrı sınır incelemeleri `yks_tarama_eski_kimlik.py --region-union`
ve `--mocks --region-union` ile üretildi. 450 tarama adayının 103'ü iki özgün
tam kutuyu kapsayan, komşu soru içermeyen bölgede native+180/330 DPI tam
eşitlik gösterir; 347 tarama ve 74 deneme istisnası bekler. İlk ana raporlar
korunur; ham cache algoritmanın kendi hash'ine de bağlıdır. Aynı girdide bu
işleri yeniden render etme. Bu kanıt hazırlanmış eski kırpımı veya konuyu
onaylamaz; birleşik kuyrukta yalnız eski ID'yi tekrar eklememe kararıdır.

`yks_kayitli_anahtar_kesfi.py` tüm 4.086 PDF'nin mevcut native/OCR okumalarını
karşılaştırdı; tekrar OCR/model çalıştırmaz. `saved-key-signal-discovery/`
85 açık başlık ve 775 satır içi cevap sinyalini eski ID/pending/hazır soru
kapsamından ayırır. Başlık bulunmaması cevap yoktur kanıtı değildir. 85'in
içindeki dört açık deneme istisnası ve Türkçe sürümü önceki kanıtlarıyla sürer.

`yks_fizik_ozet_anahtar.py` yalnız 75 Fizik özetinin özgün anahtar bölgelerini
yerel Tesseract/Qwen ile okur. Önce çalışan süreci ve `report.json` imlecini
kontrol et; aynı ağır modeli iki kez başlatma. Eski dar tablo bölgesi silinmez,
düzeltilen bölge kendi bbox/hash'iyle ayrı kayıttır. Soruları çözmez, beklenen
harfleri model istemine koymaz. Uyuşan bölge listesi bütün soru gövdelerine
bağlanmış cevap sayılmaz; eksik/çelişkili okumalar incelemede kalır.

`yks_fizik_ozet_pilotu.py --compare-bank` üç gerçek görseli okunmuş ayna
sorusunu hazırladı ve bütün bankayla karşılaştırdı. Geçerli paket/karşılaştırma
yeniden üretilmez. `physics-summary-discovery/` ana 12.052 kümesinden ayrı
açık pilottur; özgün banka görselleri ve dar konu incelenmeden ana kuyruğa
veya canlı bankaya katma. Kaynak PDF ve eski soru/öğrenci verisi değişmez.

75 anahtar bölgesinin son kanıtı `physics-summary-effective-key-regions/`
altındadır: 74 sıralı bölge/214 hücre; bir **1,2,4** basılı numara kusuru.
`yks_fizik_ozet_anahtar_incele.py --record`, gerçekten okunan sekiz görüntü
(44 kırpım) ve iki bütün sayfanın sabit hash'lerine bağlıdır; öğretmen kaydı
değildir. Native başlık istisnası yalnız `--native-heading-retry` ile ayrı
üç kaynakta çalıştı; asıl 75 sonuç ezilmedi. Bunları tekrar modele okutma.
`yks_fizik_ozet_anahtar_uzlastir.py` yalnız kanıtları birleştirir. Sonraki iş
74 kaynakta bütün soru gövdelerini sayıp basılı numaralarla birebir bağlamak,
kusurlu kaynağı bekletmek ve banka/görsel/konu kontrollerini tamamlamaktır.

Üç ayna sorusunun ek okumaları da tamamdır: `yks_fizik_ozet_banka_incele.py`
24 aday ilişkisi/23 gerçek görselin farklı olduğunu saklar; düşük benzerlik
ve bu sınırlı ret listesi NEW değildir. Arşiv bu 23 banka görselini de özgün
hash'leriyle alır. `yks_fizik_ozet_konu_incele.py` MEBİ özellikler/özel ışınlar
yaprağının dört gerçekten okunmuş sayfasını ve basılı cevap tutarlılığını
korur. Hazırlık konu desteği vardır, öğretmen/yayın/alım yoktur. Bu okumaları
yineleme; üç soruyu diğer 12.052 hazırlanmış ve 5.303 eski pending kayıtla
ayrı ek partide karşılaştır. Ana eski raporları veya mevcut kimlikleri ezme.


## Fizik özetlerinin gövde yerleşiminden devam

`physics-summary-body-discovery/report.json` 75 özgün sayfa ve kayıtlı OCR'la
native geometriyi; `physics-summary-layout-actual-review/report.json` 13
panonun ve dört bütün sayfanın gerçek yerleşim okumasını saklar. Bu kayıtlar
soru içeriği veya alım onayı değildir. Kaynak/girdi değişmedikçe görüntüleri
yeniden üretme. Yerleşim keşfi tekrarında 75 cache hit ve sıfır render/OCR/model
beklenir. Farklı ders panelleri aynı fiziksel sayfada bulunabilir (`17cc07…`).

`yks_fizik_ozet_bes_govde.py` yalnız `66d6cd9275fd…` kaynağının gerçekten
okunmuş beş gövdesini v2 tam kırpım/anahtar bağına hazırlar. Satır bbox'ının
ortasından geçen kesme sınırı reddedilir; native satır kapsamı ve özgün RGB
eşitliği birlikte kontrol edilir. Eski `physics-summary-five-body-preparation/`
kesik sürümdür; kullanma, kanıt olarak koru. Güncel v2 beş görselin de hash'i
gerçek görsel okumasına bağlıdır. Q4 ifade/Roma işaretleri ayrıca incelenir.
Bu görseller için native bozuk metinden transkript uydurulmadı.

Sıradaki iş diğer 72 sıralı özet/206 basılı hücre için tam gövde, numara ve
kırpım bağıdır. Başlığın üstüne taşan şekiller, çok sütunlu panel ve kaynak
vurguları korunmalı; 1–2–4 hatalı anahtarda yeniden numaralandırma yapılmamalı.
Yeni geometri regresyonu: `python testler/yks-summary-body-geometry-test.py`.


Bu partide gerçek görsel okuması **sistem Python / PyMuPDF 2.0** ile yapıldı.
Önceki arşiv kabul araçları proje `.venv` / PyMuPDF 1.28.2 kullanır. Sürüm
farkı piksel/yerleşim hash'ini değiştirebilir; önceki kanıtı yanlış sürümle
yeniden üretme. Yeni geometri keşfi kayıtlı renderer değişirse yazmadan durur;
beş gerçek kırpımın yeniden doğrulanması 2.0 gerektirir. Yeni keşif/görsel
araçları için `python scripts/yks_fizik_ozet_govde_kesfi.py`,
`python scripts/yks_fizik_ozet_yerlesim_incele.py` ve
`python scripts/yks_fizik_ozet_bes_govde.py`; mevcut tam kapsam raporu için
`..\.venv\Scripts\python.exe -X utf8 scripts/yks_tam_kapsam.py` kullanılır.
Bu ayrım yeni ortam veya model kurulumu gerektirmez.


## Beş Fizik gövdesinin tekrar ve konu incelemesi

`yks_fizik_bes_soru_tekrar.py` proje `.venv` ile çalışır; yeni metinler gerçek
v2 görüntüden okunmuş karşılaştırma ekidir. Kaynaktaki eksik Roma işaretleri
düzeltilmez. `--compare-bank` yalnız bu beş yeni gövdeyi bütün güncel bankaya
karşı tarar; eski 12.052 sorunun banka taraması tekrarlanmaz. Bayraksız komut
kaydedilmiş banka adaylarını ve vektör önbelleğini kullanır. Önceki pending
kanıtları doğrulanmış arşivin dondurulmuş baseline kopyasına bağlıdır; yeni
arşiv kaydı yapılması bu eski kaynak kökenini geçersiz kılmaz.

`yks_fizik_bes_soru_gorsel_incele.py` gerçekten açılmış dört panoda 34 ilişki /
24 banka görüntüsünü hash'le doğrular. Sayısal varyantta aynı fizik sonucu veya
farklı doğru harfi soru kimliği eşitliği değildir. `yks_fizik_bes_soru_konu.py`
Hareket Kavramları yaprağını gerçek MEBİ PDF'nin ilgili dört sayfasına bağlar;
yalnız konu desteğidir, öğretmen/kategori/NEW/alım kabulü değildir.

Üç komutun tamamında proje `.venv` Python'u kullanılır. Beş yeni regresyon:
`..\.venv\Scripts\python.exe -X utf8 testler/yks-five-summary-comparison-test.py`.

### YKS-07 özgün özet gövdeleri

Kayıtlı 16 gerçek sayfanın bölge/numara okumalarını hazırlamak için proje
renderer'ı kullanılır (PyMuPDF 1.28.2):

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yks_fizik_ozet_govde_bagla.py
..\.venv\Scripts\python.exe -X utf8 scripts/yks_fizik_ozet_kirpim_incele.py
python scripts/ivme.py kalite calistir YKS-07
```

44 gövde `physics-summary-bound-bodies/` altında ana 12.052'den ayrı tutulur.
İkinci komut yalnız gerçekten okunmuş sabit görüntü hash kümesini kabul eder;
yeni kaynak görüntüsünü otomatik okunmuş saymaz. Altı native geometri
kesişimi açık ve soru bazlı hash ile sınırlıdır. Yeni sınır eski kırpımı
üzerine yazmaz. Kaynak kusurları, karma dersler ve numara boşluğu korunur;
PDF metninden eksik sembol tamamlanmaz. `remaining-sources.json` kalan
56 sıralı özet/162 basılı hücreyi listeler; diğer arşiv düzenlerini kapatmaz.
