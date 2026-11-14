# Sağlık, dış uyarı ve kayıt bildirimleri

## Sağlık uçları (TAS-02)

- `GET /actuator/health/liveness`: oturumsuz; süreç yanıtını ölçer, DB'yi ölçmez (DB arızası yeniden başlatma döngüsü yaratmaz). `/readiness`: oturumsuz; hazır durumu ve DB bağlantısını (`SELECT 1`) ölçer, DB kesilirse 503/DOWN; bileşen ayrıntısı gizli. Yazma/commit, disk, katalog doğruluğu veya yedekten dönüş garantisi değildir. `/actuator/metrics[/{ad}]` yalnız ADMIN; diğer uçlar kapalı.
- `ivme.record.write` timer'ı: `operation=learn_profile|learn_events|learn_bank_answer|learn_practice_set|practice_answer`, `result=success|failure`, p95; kullanıcı/soru/olay kimliği etiket değil; bellek içidir, yeniden başlatmada sıfırlanır. Genel 5xx için `http.server.requests`, havuz için `hikaricp.*`. `ServiceErrorMetrics` DB'ye yazılamayınca uyarı logu üretir.
- **Dış uyarı:** `scripts/dis-saglik-izle.py` uygulama sunucusu dışında ayrı makinede her dakika (Task Scheduler/cron) çalışır: dışarıdan erişilen HTTPS adresi, kalıcı durum dosyası (yalnız izleyici hesabı yazar), `{"text":"..."}` kabul eden webhook (adres yalnız `IVME_ALERT_WEBHOOK` ortam değişkeninde):
  `python scripts/dis-saglik-izle.py --url https://net.ivme.dev --state C:\izleme\ivme-state.json`.
  3 ardışık DOWN'da alarm, 2 ardışık UP'ta iyileşme; tekrarları tekilleştirir, başarısız gönderimi sonraki kontrolde yeniden dener. Webhook yoksa yalnız stdout'a yazar (etkin dış uyarı sayılmaz). Kabul: uygulamayı durdurarak veya test ortamında DB bağlantısını keserek alarm ve iyileşme doğrulanır; üretim `ivme` DB'sinde kesinti deneyi yapılmaz; betik testi tek başına üretim alarmını kanıtlamaz.

## Yeni kayıt bildirimleri (TAS-10)

Herkese açık kayıt, hesapla aynı transaction'da `registration_notification_outbox` işi oluşturur (V95 yalnız boş tablo ekler; eski hesaplar için iş üretilmez; iş eklenemezse hesap da commit olmaz; sağlayıcı hatası hesabı geri almaz; hesap silinirse bildirim de silinir). Sağlayıcı Brevo HTTP API'dir (ücretsiz plan günlük 300 e-posta).

1. Brevo'da gönderen adresini doğrula (alıcıdan bağımsız), transactional gönderimi etkinleştir, **SMTP & API → API Keys**'ten API anahtarı üret (SMTP anahtarı değil; sohbete, argümana, Git'e yazma).
2. `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/kayit-bildirimi-ayarla.ps1 -Recipient "<alıcı>" -Sender "<doğrulanmış gönderen>" -ManagementUrl "https://<site>/yonetim"` (anahtar gizli sorulur, Git dışı `.codex/local-environment.json`'a yazılır), ardından `.\yeniden-baslat.ps1`.

| Ortam değişkeni | Değer |
|---|---|
| `YKS_KAYIT_BILDIRIM_ALICI` / `_GONDEREN` | Yönetici alıcı / Brevo'da doğrulanmış gönderen |
| `YKS_BREVO_API_ANAHTARI` | API anahtarı (sır deposu) |
| `YKS_KAYIT_BILDIRIM_YONETIM_ADRESI` | HTTPS yönetim bağlantısı (yerelde localhost HTTP olabilir) |
| `YKS_KAYIT_BILDIRIM_ETKIN` | Varsayılan `true`; `false` göndericiyi durdurur, işleri korur |

Eksik ayarda işler `PENDING` kalır (deneme harcanmaz); alıcı ilk denemede işe sabitlenir; gönderen/URL yeniden denemede ortamdan okunur. Gönderici 30 sn'de en çok 10 iş alır (`FOR UPDATE SKIP LOCKED`, 2 dk lease; ağ isteği transaction dışında, 10 sn zaman aşımı). Durumlar `PENDING → PROCESSING → ACCEPTED | RETRY | FAILED`; ağ hatası ve HTTP 408/429/5xx için 30 sn, 60 sn, 120 sn… en çok bir saat bekleme, on başarısız denemede veya diğer HTTP hatalarında `FAILED`; ham hata metni ve anahtar kaydedilmez. `ACCEPTED` sağlayıcı kabulüdür (teslim/okundu kanıtı değil). UUID olay anahtarı Brevo `headers.idempotencyKey` olarak gider (30 dk tekilleştirme; `duplicate_parameter` kabul sayılır); pencere dışında yinelenen e-posta mümkündür, mutlak tek gönderim garantisi yoktur. Mesaj yalnız yeni kayıt bilgisi ve yönetim bağlantısı içerir (öğrenci e-posta/telefon/kullanıcı adı/parola gönderilmez).

**Yönetim → Yeni kayıt bildirimleri** sayıları ve son 30 işi gösterir; **Yalnız onay bekleyenler** sayacı DB'den gelir; **Yeniden dene** yalnız `FAILED` işi kuyruğa alır (önce nedeni düzelt). Eski iş için `POST /api/admin/accounts/registration-notifications/{id}/retry` (CSRF), GET aynı kökte; yalnız site yöneticisi.

Doğrulama: `python scripts/ivme.py test RegistrationNotificationTest,BrevoRegistrationMailTest,RegistrationApprovalTest`, `python scripts/ivme.py ui kayit-bildirimi-ui.mjs`, `python scripts/ivme.py sayfa /yonetim --rol admin --icerir "Yeni kayıt bildirimleri"` (testler geçici DB ve loopback sahte sağlayıcı kullanır). Gerçek alıcı kabulü için yeni bir normal kayıt oluştur; panelde `ACCEPTED` ve mesaj kimliğini, alıcı kutusunda doğru bağlantıyı doğrula; eski hesapları/olayları yeniden oynatma. Bilinen ayrı bulgu: `/api/preferences/sidebar-rail` yönetici için 403 döner (yalnız `USER` izni); UI testi bu tek hatayı raporda ayırır.
