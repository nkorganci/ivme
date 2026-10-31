# Sağlık ve izleme

## Uçlar ve sınırlar

- `GET /actuator/health/liveness`: oturum gerektirmez; süreç yanıtını ölçer, DB'yi ölçmez.
- `GET /actuator/health/readiness`: oturum gerektirmez; uygulamanın hazır durumunu ve DB bağlantısını ölçer. DB erişimi kesilirse 503/DOWN beklenir. Yanıtta bileşen ayrıntıları gizlidir.
- `GET /actuator/metrics` ve `/actuator/metrics/{ad}`: yalnız ADMIN oturumu. Diğer Actuator uçları kapalıdır.
- Readiness `SELECT 1` düzeyinde bağlantı kontrolüdür; yazma/commit, disk, katalog doğruluğu veya yedekten geri dönüş garantisi değildir. Liveness DB arızasında yeniden başlatma döngüsü yaratmaz.

`ivme.record.write` timer'ında `operation=learn_profile|learn_events|learn_bank_answer|learn_practice_set|practice_answer`, `result=success|failure`, `count`, `totalTime` ve p95 süre bulunur. Ölçüm servis çağrısı ve transaction dönüşünü kapsar. Kullanıcı/soru/olay kimliği etiket değildir. Bellek içi metrikler yeniden başlatmada sıfırlanır; uzun süreli tarih için dış metrik toplayıcı gerekir. Genel HTTP 5xx ve süre için Actuator `http.server.requests`, havuz için `hikaricp.*` metrikleri kullanılabilir. `ServiceErrorMetrics` DB'ye yazılamayınca uyarı logu üretir; DB hatası ayrıca `GlobalExceptionHandler` tarafından loglanır ve öğrenciye kayıt başarısızlığı döner.

## Dış uyarı

`scripts/dis-saglik-izle.py` uygulama sunucusu dışında, ayrı bir makinede her dakika çalıştırılır. Gerekenler: dışarıdan erişilen HTTPS adresi, aynı makinede kalıcı bir durum dosyası, JSON `{"text":"..."}` kabul eden webhook. Webhook adresi yalnız ortam değişkeninde tutulur. Örnek çağrı:

```powershell
$env:IVME_ALERT_WEBHOOK = '<gizli-webhook-adresi>'
python scripts/dis-saglik-izle.py --url https://net.ivme.dev --state C:\izleme\ivme-state.json
```

Windows Task Scheduler veya cron işlemi bu komutu her dakika çalıştırır. Betik 3 ardışık DOWN'da alarm, 2 ardışık UP'ta iyileşme gönderir; tekrarları tekilleştirir ve başarısız webhook gönderimini sonraki kontrolde yeniden dener. `--state` dosyasını yalnız izleyici hesabı yazabilir. Webhook yoksa yalnız stdout'a yazar; bu, etkin dış uyarı sayılmaz. Betiğin kendisi veya dış makine durursa ikinci bir uyarı yolu gerekir.

Kurulum kabulünde uygulama durdurularak veya test ortamında DB bağlantısı kesilerek 3 kontrol sonunda alarm; düzeltilince 2 kontrol sonunda iyileşme bildirimi doğrulanır. Üretim `ivme` DB'si üzerinde kesinti deneyi yapılmaz. Dış makine/sağlayıcı kurulmadan yalnız betik testinin geçmesi üretim alarmı kanıtlamaz.
