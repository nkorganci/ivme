# Zamanlı video kanıtı ve ipucu pilotu (TAS-11)

Hat sağlayıcı kimliğini, erişim sonucunu, zamanlı metni, seçilmiş kareyi ve
koşullu ipucu adayını aynı sürümlü pakette tutar. Öğrenci DB'sine yazmaz.
Görev tanımları `video-hatti/gorevler/`, ipucu girdileri `video-hatti/ipuclari/`,
küçük üretilmiş manifestler `video-hatti/yayin/` altındadır. Ham medya, altyazı,
checkpoints ve kareler Git dışında `veri/video-hatti/` içinde kalır.

## Komutlar

```powershell
python scripts/ivme.py video liste "https://www.youtube.com/playlist?list=PLYh67QmhXVyA" --erisim
python scripts/ivme.py video edin mert-hoca-tek-cift --erisim
python scripts/ivme.py video calistir mert-hoca-tek-cift
python scripts/ivme.py video kontrol mert-hoca-tek-cift
python scripts/ivme.py video paket mert-hoca-tek-cift
python scripts/ivme.py video durum
```

`calistir` varsayılan çevrimdışıdır. `--erisim` yalnız önbelleği olmayan kamuya
açık metni dener; mevcut `video-content-probe.py` ve erişim önbelleği kullanılır.
Eski boş/başarısız sonuçlar otomatik tekrar edilmez. `--erisim-yenile` bilinçli
tek yeniden erişimdir. `edin` de başarısız edinimi tekrar döngüsüne sokmaz.
`kontrol` yazmadan görev/kod, kaynak dosyaları ve çıktı hash'lerini denetler;
`paket` aynı kanıtın küçük manifestini üretir. `durum` bütün görevlerin kanıtını kontrol eder.

Çıkış: `0` teknik paket hazır (öğretmen incelemesi bekleyebilir), `3` kaynak veya
ipucu girdisi eksik, `1` girdi/kanıt/araç/test hatası, `2` komut kullanımı hatası.

Liste çıkarımı ilk kamuya açık yanıtla sınırlıdır (`FIRST_PUBLIC_RESPONSE_ONLY`);
RSS yedeği de kısmidir (`RSS_RECENT_ENTRIES_ONLY`). İlk 100 satır tam liste sayılmaz.
Yeni `lockupViewModel` ve eski playlist render biçimleri aynı sağlayıcı kimliğinde
tekilleştirilir. Liste başlığı yalnız aday konu seçimidir; içerik okunduğu anlamına gelmez.

## Kaynak ve araçlar

Kullanıcıdan gelen `.vtt`, `.srt`, `.json`/`.json3` veya izin beyanlı yerel medya
görevde `transcript`/`media` yoluyla gösterilebilir. `usage.status` ve gerekçe
zorunludur; kaynak lisansı veya yeniden yayın izni uydurulmaz. `PUBLIC_AUTO_CAPTIONS`
otomatik metindir, formül doğruluğu veya öğretmen onayı değildir.

İsteğe bağlı kamuya açık edinim için:

```powershell
..\.venv\Scripts\python.exe -m pip install -r video-hatti/requirements.txt
```

`yt-dlp` sürümü sabittir; kurulu Python modülü komut satırındaki eski sürüme
tercih edilir. Node.js ve mevcut ffmpeg/ffprobe PATH'te bulunmalı. Edinim yalnız
görevdeki en çok üç videoyu alır; kullanıcı hesabı/çerez/proxy kullanmaz. Süreç
sayısı ölçülür; aracın iç HTTP isteği sayısı ölçülmüş gibi yazılmaz. Eski
2026.03.17 sürümü medya 403 verdi; pilot 2026.10.26 ve Node ile başarılı oldu.
Altyazı mevcutken ASR yapılmaz. Yeniden edinimde dosya hash'leri uyuşursa indirme yoktur.

ASR isteğe bağlıdır: `faster-whisper` paketi ve görevde `asrModel` ile yerel model
dizini gerekir. `local_files_only=True`, CPU/int8, Türkçe dil ve VAD kullanılır;
model kendiliğinden indirilmez. Model dosyaları/sürümü girdiye dahildir. Bu pilotta
ASR çalıştırılmadı; donanım kalite/süre kabulü henüz ölçülmedi. Uygulama yöntemi
[faster-whisper belgesindedir](https://github.com/SYSTRAN/faster-whisper#usage).
Resmî altyazı API'si genel kamu erişimi varsayımı değildir:
[YouTube yetki şartı](https://developers.google.com/youtube/data/reference/rest/v3/captions/download).

## Zaman ve kare doğruluğu

Aralıklar başlangıç dahil/bitiş hariç saniyedir. Sırasız, boş, negatif, NaN veya
video süresini aşan anlamlı altyazı reddedilir. JSON3'ün satır sonu kontrol
olayları metin değildir. Son altyazının görüntülenme süresi video sonunu en çok
üç saniye aşarsa bitiş video sonuna kısaltılır; sayı ve politika kanıtta tutulur,
ham JSON3 dosyası korunur. Daha büyük taşma reddedilir. Pilotun iki videosunda
ikişer son satır düzeltildi; bunlar matematik ipucu aralıklarının dışındadır.

`frameSeconds` en çok 24 seçilmiş zaman taşır. Seçilmemişse ilk 24 metin
aralığının orta noktaları yalnız adaydır. ffprobe yerel medyanın süresini kaynakla
karşılaştırır; kırpılmış dosyaya tam video zamanları bağlanmaz. PNG ve piksel
hash'iyle aynı kare tek dosyada tutulur; küçük tahta değişiklikleri silinmez.
Kare metin taşısa bile soru bütünlüğü kendiliğinden onaylanmaz.

## İpucu ve ders değişiklik önerisi

Girdi bir listedir: `id`, `providerId`, `startSeconds`, `endSeconds`, `quote`,
`frameSeconds`, `rule`, `condition`, `example`, `counterexample`, `rationale`.
Alıntı o aralıktaki metinde bulunmalı; kareler de aynı aralıkta olmalıdır.
Kanıt hash'i kaynak/kare/koşul/metinle bağlıdır. `agentSourceReview` yalnız
agent'ın görsel inceleme notudur; öğretmen onayı veya bağımsız uzman incelemesi değildir.

Görevdeki `verificationTests` yalnız `testler/*.py` betikleridir; başarı
`SCRIPT_CHECKED` olur. Bu kayıt yalnız betikteki dar matematik kapsamını doğrular.
Girdide yazılmış `teacherApproved` kullanılmaz; üretilen bütün ipuçları `PENDING`
kalır. Eksik soru başka ayrıntılar uydurularak banka sorusuna dönüştürülmez.

Her sürüm `veri/video-hatti/<görev>/surumler/<hash>.json` ve `.oneriler.md`
dosyalarını üretir. Öneri hedef dersin mevcut hash'ini de taşır; dersi değiştirmez.
Öğretmen kaynağı, bütün soruyu ve gerekçeyi inceleyince uygun içerik
[TAS-09 hattından](icerik-hatti.md) sürümlü ders değişikliği olarak ele alınır.

## Önbellek ve kabul

Aşamalar `asamalar/<kimlik>/<girdi-hash>.json` içinde atomik yazılır. Kaynak,
çıkarıcı kodu, araç/model ve çıktı hash'leri kontrol edilir. Kesintide tamamlanan
aşama korunur; bozulmuş kare yeniden çıkarılır. Yaşayan süreç kilidi uzun ASR
süresi nedeniyle devralınmaz; ölmüş sahip devralınabilir. Değişmeyen aşamalar,
matematik denetimi dahil tekrar çalışmaz.

```powershell
..\.venv\Scripts\python.exe -X utf8 testler/video-hatti-test.py
..\.venv\Scripts\python.exe -X utf8 testler/video-content-probe-test.py
..\.venv\Scripts\python.exe -X utf8 testler/tek-cift-video-pilot-test.py
```

Teknik kabul: 14 hat testi (gerçek küçük videodan decode/aynı kare/onarım dahil),
4 erişim/playlist ayrıştırma testi ve 3 pilot matematik testi. İki gerçek videoda
2194 segment, altı kare, iki ipucu ve ders değişiklik önerisi üretildi. İkinci
geçişte beş aşama önbellekten, sıfır decode/ASR/model/ağ çağrısı; edinim de sıfır
yeni süreç. Makineye özgü süre ve güncel hash küçük
[pilot manifestindedir](../../video-hatti/yayin/mert-hoca-tek-cift.json).
Öğretmen onayı, öğrenci kazanımı ve bütün playlistin işlenmesi bu kabul değildir.
