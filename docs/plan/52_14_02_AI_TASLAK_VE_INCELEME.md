# 14.02 — AI taslağı ve inceleme ekranı pilotu

**Durum:** BITTI (yedi soruluk gerçek yerel model pilotu ve inceleme ekranı) · **Tarih:** 2026-10-09 · **Girdi:** [14.01 geçici kabul kararı](51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md) · **Sonraki:** [14.03 ölçüm ve ölçek kararı](53_14_03_DOGRULUK_MALIYET_OLCEK.md).

Kullanıcının tek tek manuel inceleme isteği için `scripts/etiket-inceleme-sunucusu.py` yerel ekranı eklendi. Yalnız `127.0.0.1:8765` üzerinde çalışır; 200 sorunun gerçek kaynak WebP görselini checksum kontrolüyle açar, kaynak konu önerisini açıkça **taslak** olarak gösterir, inceleyen kimliğiyle izinli taksonomi kodu ve gerekçeyi CSV'ye kaydeder. Belirsiz/ret kararında neden zorunludur. Onayda etiket ve soru içindeki kanıt zorunludur. Yazım yerel `ornek-veri/altin-ornek-inceleme-200.csv` dosyasına atomik yapılır; veritabanı, öğrenci API'si veya yayın akışı değişmez.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe scripts\etiket-inceleme-sunucusu.py
```

Tarayıcıda `http://127.0.0.1:8765` açılır. İnceleyen kimliği girilir; her soru görseli okunur, etiket ve gerekçe seçilip kaydedilir. Karar sonrası `scripts/altin-ornek-kuyrugu.py --check` ile bütünlük yeniden doğrulanır. Kaydedilen insan kararı yeniden `--write` veya `--provisional` ile üretilmez.

## Yedi soruluk görsel AI taslağı

Bu Codex oturumunda yedi kaynak konudan birer gerçek soru görseli incelendi. `ornek-veri/ai-etiket-pilot-7.json` dosyası önerilen izinli soru tipini, görsel checksum'ını, kısa görsel kanıtı, öznel güveni ve `abstain` durumunu sürüm 1 şemasında tutar. `TYT-0001` için paragraf boşluk doldurma ile bağlamda sözcük anlamı sınırı belirsiz görüldüğünden model etiket seçmedi. Diğer altı taslak mevcut geniş tiplerle eşleşti. Bu dosya **AI taslağıdır**; 200 satırlık insan onayı CSV'sine yazılmaz. Ekran taslağı ve gerekçeyi gösterir, fakat insanın etiket alanını otomatik seçmez.

Girdi talimatı `visual-allowed-types-v1`: “Kaynak soru görselini oku; yalnız `tyt-turkce-v1` QUESTION_TYPE kodlarından birini seç. Kök ve şıklardaki ayırt edici kanıtı kısa yaz. Sınıf sınırı belirsizse etiket yerine `abstain=true` ver. Cevap anahtarını değiştirme.” Model ailesi GPT-6 olarak kayıtlıdır; bu sohbet oturumunda tam checkpoint/sürüm kimliği verilmediği için `model_version=null` açık bırakılmıştır. Güven puanı kalibre edilmiş olasılık değildir. Aynı işi yeniden üretilebilir batch çağrısıyla çalıştırma ve maliyet ölçme hâlâ açıktır.

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe -W error scripts\ai-etiket-pilot-denetle.py
```

Denetim yedi benzersiz soru, yedi kaynak konu, izinli kod, checksum, güven aralığı ve tek çekimser taslağı doğruladı; doğruluk hesaplamaz çünkü henüz insan altın etiket yoktur.

## Yerel model batch hazırlığı

Kullanıcının yerel model tercihiyle `scripts/ollama-etiket-pilotu.py` yalnız `127.0.0.1:11434` adresindeki Ollama'ya konuşur. Kurulu **görsel giriş destekleyen** model adını `--model` ile alır; `/api/tags` model digest'ini kaydeder, gerçek görsel checksum'ını yeniden doğrular, `/api/generate` isteğinde görseli ve izinli taksonomi JSON şemasını gönderir. `temperature=0`, `think=false` ve `stream=false` kullanır. Kaynak konuyu modele vermez. Çıktıda izinli kod, çekimserlik, kısa kanıt ve güven doğrulanır; düşük güven, çekimserlik ve kaynak konu çatışması inceleme nedeni olur. Her soru sonucu `veri/ai-etiket-pilot/` altında Git dışı dosyaya atomik yazılır; aynı model digest'i, istek özeti ve görsel tekrar çalıştırıldığında önbellekten kullanılır. Prompt/output token sayısı ve işlem süresi kaydedilir; yerel elektrik/donanım maliyeti para tutarı olarak uydurulmaz.

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe -W error scripts\ollama-etiket-pilotu.py --model qwen3.5:4b
```

Varsayılan ilk deneme her yedi kaynak konudan bir soru seçer. `--all` 200 soruyu işler; insan altın veriyle kalite denetimi geçmeden çalıştırılmaz. Model yükleme/kurulum bu iş tarafından otomatik yapılmaz. Kullanılan `images`, JSON şemalı `format` ve süre/token alanları [Ollama generate API](https://docs.ollama.com/api/generate), model `digest` alanı [Ollama list models API](https://docs.ollama.com/api/tags) sözleşmesine dayanır.

Batch dosyası üretildikten sonra inceleme ekranı `--draft-file veri/ai-etiket-pilot/URETILEN_DOSYA.json` ile açılır. Ekran her AI taslağının soru kodu, görsel checksum'ı ve izinli taksonomiyle uyumunu denetler; eşleşmeyen taslağı göstermez. Varsayılan artık aşağıdaki gerçek yerel model pilotudur.

`scripts/ollama-etiket-smoke.py` sahte yerel HTTP uç noktasıyla yedi görsel isteği, model digest'i, çıktı doğrulaması ve ikinci çalıştırmada önbellek kullanımını doğruladı. Bu, gerçek yerel modelin kalite/performance kanıtı değildir.

**Doğrulama:** Yerel sunucuda sayfa, 200 satırlık API, yedi AI taslağı ve gerçek görsel isteği HTTP 200 döndü; eksik etiket/kanıtlı onay isteği HTTP 400 ile reddedildi. `scripts/etiket-inceleme-smoke.py` geçici CSV kopyasında geçersiz onayı reddetti ve geçerli onayı kaydetti; gerçek CSV 200 geçici/0 insan onayında kaldı. Ekran JavaScript'i `node --check` ile geçti. Fiziksel cihazda görsel kontrolü yapılmadı; yerel masaüstü/telefon tarayıcı görünümü ve kayıt etkileşimi ayrıca kabul edilecek.

## Gerçek yerel model sonucu ve kapanış

Kullanıcı Ollama `0.40.2` ve görsel yetenekli `qwen3.5:4b` modelini kurdu. Model digest'i `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04`; model 4.2B parametreli Q4_K_M sürümüdür. `think=false`, `temperature=0`, izinli JSON şeması ve yedi kaynak görseliyle gerçek batch çalıştırıldı. Ham çıktı Git dışı `veri/ai-etiket-pilot/` altında; küçük pilot kanıtı `ornek-veri/ai-etiket-qwen35-pilot-7.json` olarak ayrıca korundu. `scripts/ollama-etiket-denetle.py` yedi benzersiz soru ve görsel checksum'larını, model/istek özetlerini, izinli kodları ve ölçüm alanlarını doğruladı.

Yedi taslak, sıfır API hatası; kaynak konu eşlemesiyle **iki çatışma** (`TYT-0062`, `TYT-0001`), sıfır çekimserlik. Yedi güven değeri de `0.95` olduğundan güven alanı ayırt edici görünmüyor. `TYT-0100` etiket kodu eşleşse de gerekçedeki soru yönü görseldeki “gönderme yapılmamıştır” ifadesini doğru aktarmıyor. Bu gözlem gerçek insan altın etiketi veya doğruluk ölçümü değildir. Toplam model süresi 207,2 saniye; ilk yükleme/istek 180,2 saniye, sonraki altı istek toplam yaklaşık 27 saniye. Prompt 10.588, çıktı 718 token. Para tutarı hesaplanmadı; yerel GPU kullanımı ölçüldü. Ayrıntılı değerlendirme [14.03 kaydında](53_14_03_DOGRULUK_MALIYET_OLCEK.md).

İnceleme ekranında gerçek batch dosyası HTTP 200 ile açıldı. Masaüstü 1280×900 görüntüsü okunaklıydı. İlk dar ekran kontrolünde yatay taşma görüldü; uzun checksum kısaltılıp panel metni sarıldı. CDP ile gerçek 390×844 CSS görünümünde `innerWidth=bodyWidth=htmlWidth=390` doğrulandı; görsel ve karar alanları dar ekranda okunaklıydı. Geçerli kararın geçici CSV'ye yazılması, eksik gerekçeli kararın reddi test edildi. Kullanıcının kendi cihazındaki kabulü 14.01 manuel incelemesinde yapılacaktır.

14.02 yalnız **yedi soruluk taslak ve inceleme ekranı pilotu** için bitti. 200 soruya ölçekleme veya doğruluk sonucu çıkarılmadı; bu karar 14.03'te insan etiketleriyle verilecek.

**Sonraki kullanıcı kararı:** 2026-10-09'da 200 sorunun AI ile ön incelenmesi istendi. Bu, 14.03'te ayrı `ai_` notları olarak yürütülür; önceki yedi soruluk pilotun kapsamını veya insan altın etiket koşulunu geriye dönük değiştirmez.
