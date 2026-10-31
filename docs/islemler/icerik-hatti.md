# Kaynaklı konu içerik hattı (TAS-09)

Bir konunun ders/çözüm içeriğini ana kaynak kanıtına bağlayan, aşama hash'li ve kaldığı
yerden devam eden tek komut. Bölme–bölünebilme pilotu (TAS-08) bu hatta taşındı; ikinci
konu EBOB–EKOK aynı ölçütlerle hattan geçti. Yaklaşım: [inceleme §11](../tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#11-tas-09-ve-tas-12-tekrarlanan-işleri-agent-iş-akışına-dönüştürme).

## Komutlar

```powershell
python scripts/ivme.py icerik durum [kavram]          # aşama tablosu; neyin yeniden çalışacağı
python scripts/ivme.py icerik calistir <kavram>       # eksik/girdisi değişen aşamaları sırayla çalıştırır
python scripts/ivme.py icerik calistir <kavram> --yeniden dogrula   # tek aşamayı zorla
python scripts/ivme.py icerik kontrol [kavram]        # yazmadan: yayımlanan kanıt girdilerle güncel mi
```

Çıkış kodu: `0` tamam (öğretmen incelemesi bekliyor olabilir), `3` agent veya insan girdisi
bekleniyor, `1` girdi/kanıt/test hatası, `2` kullanım hatası. Hat model çağırmaz.

## Dosyalar

| Yer | Görev |
|---|---|
| `icerik-hatti/gorevler/<kavram>.json` | Elle yazılan görev tanımı: ana kaynak (URL, sha256, yerel yol, sayfalar), iddia → blok kimlikleri, bölüm → iddia + not, kaynaklı sorular (bölüm, `guided`/`independent`, incelenen görsel sha256), `testScope`, konu testleri |
| `icerik-hatti/kararlar/<kavram>.json` | Yalnız insan kararı/gözlemi; içerik hash'ine bağlıdır, içerik değişince geçersizleşir |
| `icerik-hatti/yayin/<kavram>.json` | Yayın manifesti: durum, çıktı/ders hash'i, doğrulama, inceleme, aşama anahtarları, önceki sürüm ve geri dönüş komutu |
| `frontend/src/learn/content/kanit/<kavram>.json` ve `index.js` | Üretilmiş kanıt ve kayıt modülü; elle düzenlenmez. Sorgular `content/evidence.js` içinde |
| `veri/icerik-hatti/<kavram>/` (Git dışı) | Kontrol noktası `durum.json`, aşama çıktıları, `gorev-taslak.md` agent görev paketi |
| `scripts/icerik_hatti.py`, `scripts/icerik-hatti-ders.mjs` | Hat ve tarayıcı ayrıştırıcısıyla ders okuyucu |

## Aşamalar

| Aşama | Ne yapar | Durur |
|---|---|---|
| `kaynak` | Ana PDF'yi (yoksa indirip hash'le) TAS-07 kanıt paketine işler | Hash farkı, sayfa hatası |
| `kanit` | İddia bloklarını (bbox, metin hash'i), soru kaydını, görsel/kitapçık hash'ini toplar | Eksik blok/sayfa; görsel incelenmemiş (`imageSha256` yok) → `WAITING` |
| `taslak` | Dersi ve çözümleri şablona göre denetler: bölüm sırası, her bölümde üç düzey + sorgula + iki gerekçeli örnek, rehberli soru doğru bölümde, bağımsız soru derste yok, çözümde ne/neden, check/tip/mistake, cevap anahtarı | Eksik varsa görev paketini yazar → `WAITING` (3) |
| `derle` | Kanıt JSON'unu ve kayıt modülünü üretir; değişmeyen dosya yazılmaz | Kuru kontrolde fark |
| `dogrula` | `icerik-hatti.test.mjs`, biçim testi, ortak set seçimi testi ve görevdeki konu testleri | Test hatası |
| `inceleme` | İnsan kararlarından `teacherApproved`/`studentTransferObserved` | Asla otomatik onay yok |
| `paket` | Yayın manifesti; dış yayın/push ayrı kullanıcı talimatı ister | — |

Her aşama girdi anahtarını ve belirleyici çıktısının hash'ini saklar. Aynı girdide atlanır;
yeniden çalışan aşama aynı çıktıyı verirse sonrakiler atlanır. Kesintide (süreç ölse bile)
yalnız kontrol noktası yazılmamış aşama yeniden çalışır; ölü sürecin kilidi devralınır.

## Agent iş akışı (Claude veya Codex)

1. `python scripts/ivme.py icerik calistir <kavram>`; `3` dönerse `veri/icerik-hatti/<kavram>/gorev-taslak.md` paketini oku.
   Paket eksikleri, iddia metinlerini, soru görsel yollarını ve cevap anahtarını taşır; PDF'yi yeniden okuma.
2. Soru çözümünü özgün görseli açmadan yazma; sonucu konu testinde bağımsız taramayla sına.
   Kitapta olmayan genişletmeyi bölüm notunda “özgün türetim” diye yaz.
3. Komutu yeniden çalıştır; yalnız değişen aşamalar çalışır. Manifest ve kanıt farkını incele, commit et.
4. Öğretmen kararı/öğrenci gözlemi yalnız insan tarafından girilir; agent bu komutları kendi başına çalıştırmaz:
   `icerik karar <kavram> --rol ogretmen --inceleyen "..." --karar KABUL|DUZELTME --not "..." [--bolumler ..] [--sorular ..]`,
   `icerik gozlem <kavram> --gozlemci "..." --sorular KOD --ilk-deneme DOGRU|YANLIS|BOS --yardim YOK|IPUCU|COZUM --not "..."`.

Yeni konu: görev tanımını kopyala, `primarySource.pages` ve bölümleri doldur, `calistir` ile paketi kur,
`veri/pdf-kanit/<sha2>/<sha>/sayfalar/NNNN.json` bloklarından iddiaları seç. Bağımsız soru konu
bankasında değilse `WORKED_EXAMS` kaydı eklendikten sonra `node scripts/konu-ogrenme-banka.mjs`
(DB salt okunur) ve `node scripts/ortak-set-tani.mjs --yaz` ile banka yenilenir; diğer bankalardaki farkı incele.

## Doğrulama

```powershell
..\.venv\Scripts\python.exe -X utf8 testler/icerik-hatti-test.py   # 9 test: devam, kesinti, kilit, değişen kapsam, kuru kontrol, insan kararı
node --test testler/icerik-hatti.test.mjs                         # derlenmiş her görevin kanıt/ders/çözüm/test seti tutarlılığı
python scripts/ivme.py ui konu-ogrenme-ui <kavram> --duzey                 # bölüm kaynakları ve üç düzey, masaüstü/mobil
python scripts/ivme.py ui konu-ogrenme-ortak-set-ui --pilot <kavram>       # açıklamalı aktarım seti, çözüm cevaptan sonra
```

UI betikleri için önce `IVME_TEST_DIST` ile ayrı derleme kullan ([pilot kabulü](../icerik/tas08-pilot-kabul.md#tekrarlanabilir-denetim)).
