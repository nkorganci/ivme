# 14.02 — AI taslağı ve inceleme ekranı pilotu

**Durum:** SIRADAKI (yerel insan inceleme ekranı hazır; AI taslak pilotu açık) · **Tarih:** 2026-10-09 · **Girdi:** [14.01 geçici kabul kararı](51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md).

Kullanıcının tek tek manuel inceleme isteği için `scripts/etiket-inceleme-sunucusu.py` yerel ekranı eklendi. Yalnız `127.0.0.1:8765` üzerinde çalışır; 200 sorunun gerçek kaynak WebP görselini checksum kontrolüyle açar, kaynak konu önerisini açıkça **taslak** olarak gösterir, inceleyen kimliğiyle izinli taksonomi kodu ve gerekçeyi CSV'ye kaydeder. Belirsiz/ret kararında neden zorunludur. Onayda etiket ve soru içindeki kanıt zorunludur. Yazım yerel `ornek-veri/altin-ornek-inceleme-200.csv` dosyasına atomik yapılır; veritabanı, öğrenci API'si veya yayın akışı değişmez.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe scripts\etiket-inceleme-sunucusu.py
```

Tarayıcıda `http://127.0.0.1:8765` açılır. İnceleyen kimliği girilir; her soru görseli okunur, etiket ve gerekçe seçilip kaydedilir. Karar sonrası `scripts/altin-ornek-kuyrugu.py --check` ile bütünlük yeniden doğrulanır. Kaydedilen insan kararı yeniden `--write` veya `--provisional` ile üretilmez.

**Doğrulama:** Yerel sunucuda sayfa, 200 satırlık API ve gerçek görsel isteği HTTP 200 döndü; eksik etiket/kanıtlı onay isteği HTTP 400 ile reddedildi. `scripts/etiket-inceleme-smoke.py` geçici CSV kopyasında geçersiz onayı reddetti ve geçerli onayı kaydetti; gerçek CSV 200 geçici/0 insan onayında kaldı. Fiziksel cihazda görsel kontrolü yapılmadı; yerel masaüstü/telefon tarayıcı görünümü ve kayıt etkileşimi ayrıca kabul edilecek.

**Açık:** Sürümlü gerçek AI taslağı, güven/belirsizlik/kanıt alanları, model çıktısının izinli taksonomiye doğrulanması ve insan kuyruğuna bağlanması henüz uygulanmadı. Bugünkü kaynak konu önerisi AI sonucu diye raporlanmaz. Gerçek insan onayı 14.01'de 0/200 olduğundan doğruluk/ölçek kararı 14.03'e geçmez.
