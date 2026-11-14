# Konu paketi: kaynaklı içerik hattı, öğretim içeriği ve video

Öğretim kuralları [öğretim standardında](../urun/ogretim-standardi.md); veri sözleşmesi [şemalarda](../semalar/learning-resource-v2.schema.json). Yeni konu paketi üretimi 16.07'de bu hat üzerine kurulur.

## Kaynaklı konu içerik hattı (TAS-09)

Bir konunun ders/çözüm içeriğini ana kaynak kanıtına bağlayan, aşama hash'li, kaldığı yerden devam eden tek komut (bölme–bölünebilme ve EBOB–EKOK bu hattan geçti). Hat model çağırmaz.

```powershell
python scripts/ivme.py icerik durum [kavram]
python scripts/ivme.py icerik calistir <kavram> [--yeniden dogrula]
python scripts/ivme.py icerik kontrol [kavram]      # yazmadan: yayımlanan kanıt girdilerle güncel mi
```

Çıkış: `0` tamam (öğretmen incelemesi bekleyebilir), `3` agent/insan girdisi bekleniyor, `1` girdi/kanıt/test hatası, `2` kullanım hatası.

| Yer | Görev |
|---|---|
| `icerik-hatti/gorevler/<kavram>.json` | Elle yazılan görev: ana kaynak (URL, sha256, yol, sayfalar), iddia → blok, bölüm → iddia + not, kaynaklı sorular (bölüm, `guided`/`independent`, incelenen görsel sha256), `testScope`, konu testleri |
| `icerik-hatti/kararlar/<kavram>.json` | Yalnız insan kararı/gözlemi; içerik hash'ine bağlı, içerik değişince geçersiz |
| `icerik-hatti/yayin/<kavram>.json` | Yayın manifesti (durum, hash'ler, aşama anahtarları, önceki sürüm, geri dönüş komutu) |
| `frontend/src/learn/content/kanit/<kavram>.json` + `index.js` | Üretilmiş kanıt ve kayıt modülü; elle düzenlenmez (`content/evidence.js`) |
| `veri/icerik-hatti/<kavram>/` (Git dışı) | `durum.json` kontrol noktası, aşama çıktıları, `gorev-taslak.md` agent paketi |

Aşamalar: `kaynak` (ana PDF'yi TAS-07 kanıt paketine işler; hash/sayfa hatasında durur) → `kanit` (iddia blokları, soru, görsel/kitapçık hash'i; görsel incelenmemişse `WAITING`) → `taslak` (bölüm sırası, her bölümde üç düzey + sorgula + iki gerekçeli örnek, rehberli soru doğru bölümde, bağımsız soru derste yok, çözümde ne/neden, cevap anahtarı; eksikse görev paketi yazar, çıkış 3) → `derle` → `dogrula` (`icerik-hatti.test.mjs`, biçim, ortak set, konu testleri) → `inceleme` (insan kararından `teacherApproved`/`studentTransferObserved`; asla otomatik onay) → `paket` (dış yayın/push ayrı talimat). Her aşama girdi anahtarını ve çıktı hash'ini saklar; aynı girdide atlanır; kesintide yalnız yazılmamış aşama yeniden çalışır, ölü sürecin kilidi devralınır.

Agent akışı: `calistir`; `3` dönerse `gorev-taslak.md`'yi oku (PDF'yi yeniden okuma); soru çözümünü özgün görseli açmadan yazma, konu testinde bağımsız tarayarak sına; kitapta olmayan genişletmeyi "özgün türetim" diye işaretle; komutu yeniden çalıştır. Öğretmen kararı/öğrenci gözlemi yalnız insan girdisidir: `icerik karar <kavram> --rol ogretmen --inceleyen "…" --karar KABUL|DUZELTME --not "…"`, `icerik gozlem <kavram> --gozlemci "…" --sorular KOD --ilk-deneme DOGRU|YANLIS|BOS --yardim YOK|IPUCU|COZUM --not "…"`. Yeni konu: görev tanımını kopyala, `primarySource.pages` ve bölümleri doldur, `veri/pdf-kanit/<sha2>/<sha>/sayfalar/NNNN.json` bloklarından iddia seç; bağımsız soru bankada yoksa `WORKED_EXAMS` kaydından sonra `node scripts/konu-ogrenme-banka.mjs` ve `node scripts/ortak-set-tani.mjs --yaz`.

Doğrulama: `..\.venv\Scripts\python.exe -X utf8 testler/icerik-hatti-test.py`, `node --test testler/icerik-hatti.test.mjs`, `python scripts/ivme.py ui konu-ogrenme-ui <kavram> --duzey`, `python scripts/ivme.py ui konu-ogrenme-ortak-set-ui --pilot <kavram>`. UI betikleri için ayrı derleme: `IVME_TEST_DIST` ortam değişkeni (`npm run build -- --outDir $env:IVME_TEST_DIST`); testler sahte API kullanır, gerçek DB'ye yazmaz.

## Akıllı Öğretmen içeriği

`ornek-veri/ogretim-pilotu/<branş>/<SORU-KODU>.json` ([şema](../semalar/ogretim-icerigi-v1.schema.json)): bir soruya ait ipucu basamakları, adım adım çözüm, kavram yanılgısı teşhisleri, çok seviyeli açıklama, kavrayış katmanı (benzetme, usta gözü, soru radarı, aha, sağlama), animasyonlu görsel ve ikiz soru.

```powershell
python scripts/ivme.py ogretim dogrula [--offline] [--subject fizik]   # şema (+ DB soru bağları, görsel parametreleri Node ile)
python scripts/ivme.py ogretim aktar                                   # tutor_contents'e sürümlü yazar; geçersiz dosya varken yazmaz
python scripts/ivme.py ogretim kalibrasyon | yeniden-uretim
```

Kavrayış katmanı eksikse `NO_INSIGHT` uyarısı; rapor `veri/ogretim-pilotu/`. Yeni içerikte soruyu önce `scripts/pdf-metin.py`/görselle doğrula; cevap anahtarı ile çözüm sonucu eşleşmeli. Otomatik doğrulama öğretmen onayı değildir; öğrenci görünürlüğü `YKS_OGRETIM_GORUNURLUGU` ayarına bağlıdır. Ekran: `python scripts/ivme.py ui ogretim-dongusu-ui.py`, `sayfa /akilli-ogretmen`.

## Zamanlı video kanıtı ve protip (TAS-11)

Hat sağlayıcı kimliğini, erişim sonucunu, zamanlı metni, seçilmiş kareyi ve koşullu ipucu adayını aynı sürümlü pakette tutar; öğrenci DB'sine yazmaz. Görevler `video-hatti/gorevler/`, ipucu girdileri `video-hatti/ipuclari/`, küçük manifestler `video-hatti/yayin/`; ham medya/altyazı/kare Git dışında `veri/video-hatti/`.

```powershell
python scripts/ivme.py video liste "<playlist-url>" --erisim
python scripts/ivme.py video edin|calistir|kontrol|paket <görev> [--erisim]
python scripts/ivme.py video protips [--kontrol]      # öğrenci izdüşümü frontend/src/learn/content/video-protips.json
python scripts/ivme.py video durum
```

Çıkış `0` hazır, `3` kaynak/ipucu girdisi eksik, `1` hata, `2` kullanım. `calistir` çevrimdışıdır; `--erisim` yalnız önbelleği olmayan kamuya açık metni dener, başarısız edinim otomatik tekrarlanmaz (`--erisim-yenile` bilinçli tek yeniden erişim). Liste çıkarımı ilk kamuya açık yanıtla (`FIRST_PUBLIC_RESPONSE_ONLY`), RSS yedeği son kayıtlarla (`RSS_RECENT_ENTRIES_ONLY`) sınırlıdır; ilk 100 satır tam liste sayılmaz; liste başlığı yalnız aday konu seçimidir.

- Kaynak: kullanıcıdan `.vtt/.srt/.json3` veya izin beyanlı yerel medya (`usage.status` ve gerekçe zorunlu; lisans/yeniden yayın izni uydurulmaz). `PUBLIC_AUTO_CAPTIONS` otomatik metindir. Edinim `video-hatti/requirements.txt`'teki sabit `yt-dlp` (2026.10.26; 2026.03.17 medya 403 verdi), Node ve ffmpeg/ffprobe ister; görevdeki en çok üç video; hesap/çerez/proxy yok; altyazı varken ASR yapılmaz; ASR isteğe bağlı (`faster-whisper`, yerel model dizini, CPU/int8, Türkçe, VAD; model kendiliğinden inmez).
- Zaman: aralık başlangıç dahil/bitiş hariç saniye; sırasız/boş/negatif/NaN/süreyi aşan altyazı reddedilir; son altyazı sonu video sonunu ≤3 sn aşarsa kısaltılır (politika kanıtta), fazlası reddedilir. `frameSeconds` en çok 24 seçilmiş zaman; ffprobe yerel medya süresini kaynakla karşılaştırır; kare metin taşısa da soru bütünlüğü onaylanmaz.
- İpucu girdisi: `id`, `providerId`, `startSeconds`, `endSeconds`, `quote`, `frameSeconds`, `rule`, `condition`, `example`, `counterexample`, `rationale`; alıntı o aralıkta bulunmalı. `verificationTests` yalnız `testler/*.py` (başarı `SCRIPT_CHECKED`); girdideki `teacherApproved` kullanılmaz, ipuçları `PENDING` kalır. Kullanıcı talimatıyla ipuçları **protip olarak UI'da** "Öğretmen kontrolü bekliyor" etiketi, koşul, örnek/gerekçe/karşı örnek ve zamanlı video bağlantısıyla gösterilir (`/konuyu-ogrenelim/konu/temel-kavramlar#video-protips`; derste `s2`/`s2b`); öğretmen onayı yazılmaz; iç inceleme/transkript/yol paketlenmez.
- Yeni protip: video görevini tamamla → `video paket` → `video-hatti/protips.json`'a konu/bölüm yerleşimi → `video protips` → konu UI kontrolü (`node testler/konu-ogrenme-ui.mjs temel-kavramlar --protip`, ayrı `IVME_TEST_DIST`). Aşamalar `asamalar/<kimlik>/<girdi-hash>.json` içinde atomik; değişmeyen aşama (matematik denetimi dahil) tekrar çalışmaz; yaşayan süreç kilidi devralınmaz.
- Matematik konuları için: konu–video eşlemesi `scripts/matematik-konu-listesi.json`; `python scripts/video-konu-gorevi.py <ders> [video-kimliği …]` → `video edin <ders>-video --erisim` (tek tek, beklemeli) → `scripts/video-altyazi.py puf|kare|alinti`. Kareyi açıp soruyu ve formülü doğrulamadan ipucu yazma; ipucunu `testler/video-ipucu-<ders>-test.py` ile tüm olasılıkları tarayarak sına; `frameSeconds`'a yalnız incelenen kareleri yaz.
- Testler: `..\.venv\Scripts\python.exe -X utf8 testler/video-hatti-test.py`, `video-content-probe-test.py`, `tek-cift-video-pilot-test.py`. Öğretmen onayı, öğrenci kazanımı ve tüm playlistin işlenmesi bu kabul değildir. Yaygınlaştırma kapsamı [12.15](../plan/12-icerik-ve-yayin.md#1215--tas-11-video-kanıt-ve-ipucu-pilotu).
