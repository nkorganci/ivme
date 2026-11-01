# Yeni kayıt bildirimleri (TAS-10)

Yeni herkese açık kayıt, hesapla aynı PostgreSQL transaction'ında
`registration_notification_outbox` işi oluşturur. Göç V95 yalnız boş tablo ekler;
eski hesaplar için iş üretilmez. Hesap onayı, öğrencinin parolası ve çalışma geçmişi
değişmez. İş eklenemezse hesap da commit olmaz. Sağlayıcı hatası ise commit edilmiş
hesabı geri almaz. Hesap silinirse bağlı bildirim de silinir.

## Brevo'yu etkinleştirme

Seçilen sağlayıcı Brevo HTTP API'dir. Ücretsiz planda günlük 300 e-posta kotası
vardır; güncel sınır [sağlayıcının plan sayfasındadır](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

1. [Brevo](https://www.brevo.com/) hesabında gönderen adresini doğrula ve
   transactional gönderimi etkinleştir. Gönderenin doğrulanması alıcı adresinden
   bağımsızdır. Kendi alan adın varsa gönderen alan adını da doğrula.
2. **SMTP & API → API Keys** altında API anahtarı oluştur; SMTP anahtarı kullanma.
   Anahtarı sohbete, komut satırı argümanına veya Git'e yazma.
3. Yerel uygulamada aşağıdaki komutu çalıştır. Göndereni Brevo'da doğruladığın
   adresle, yönetim bağlantısını kullandığın sitenin `/yonetim` adresiyle değiştir.
   Anahtar gizli girişle sorulur; diğer yerel ayarlar korunur. Değerler Git dışındaki
   `.codex/local-environment.json` dosyasına kaydedilir.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/kayit-bildirimi-ayarla.ps1 -Recipient "yonetici@example.com" -Sender "dogrulanmis@example.com" -ManagementUrl "https://siteniz.example/yonetim"
.\yeniden-baslat.ps1
```

Yerel alıcı bu oturumda kullanıcının seçtiği adres olarak hazırlandı; gerçek
gönderim için doğrulanmış gönderen ve API anahtarı henüz gerekli olabilir.
Başka kurulumda aşağıdaki çalışma ortamı değişkenlerini kullan:

| Değişken | Değer |
|---|---|
| `YKS_KAYIT_BILDIRIM_ALICI` | Yönetici alıcı e-postası |
| `YKS_KAYIT_BILDIRIM_GONDEREN` | Brevo'da doğrulanmış gönderen |
| `YKS_BREVO_API_ANAHTARI` | Brevo API anahtarı, sır deposu/çalışma ortamı |
| `YKS_KAYIT_BILDIRIM_YONETIM_ADRESI` | HTTPS yönetim bağlantısı; yerelde localhost HTTP olabilir |
| `YKS_KAYIT_BILDIRIM_ETKIN` | Varsayılan `true`; `false` göndericiyi durdurur, işleri korur |

Eksik ayarda yeni işler `PENDING` kalır; deneme sayısı harcanmaz. Kurulumdan sonra
yalnız bu sürümle oluşturulmuş işler gönderilmeye başlar; eski hesaplara tarama yoktur.
Alıcı ilk denemede işe sabitlenir; ortam alıcısının değiştirilmesi başlamış işi başka
kişiye yönlendirmez. Gönderene ve yönetim URL'sine ait ayarlar yeniden denemelerde
çalışma ortamından okunur.

## İşleyiş ve hata görünürlüğü

Gönderici her 30 saniyede en fazla 10 işi alır. `FOR UPDATE SKIP LOCKED` ve iki
dakikalık lease birden fazla sürecin aynı işi aynı anda almasını önler. Ağ isteği
transaction dışında, 10 saniye zaman aşımıyla çalışır. Süreç çökerse kalıcı lease
dolunca iş devralınır; eski çalışanın cevabı yeni lease'i değiştiremez.

Durumlar: `PENDING` → `PROCESSING` → `ACCEPTED`, `RETRY` veya `FAILED`.
Ağ/yanıt hataları, HTTP 408/429/5xx için 30 sn, 60 sn, 120 sn … en fazla bir saat
beklenir. On başarısız deneme sonunda veya diğer HTTP hatalarında iş `FAILED` olur.
Ham sağlayıcı hata metni ve anahtar kaydedilmez; yalnız sınırlı hata kodu tutulur.

**Yönetim → Yeni kayıt bildirimleri** bekleyen/başarısız/kabul edilen sayıları ve son
30 işi gösterir. E-posta çalışmasa da aynı ekrandaki **Yalnız onay bekleyenler**
sayacı DB'den gelir. **Bildirim ayrıntıları → Yeniden dene** yalnız `FAILED` işi
yeniden kuyruğa alır, deneme sayacını sıfırlar. Önce yapılandırmayı/hata nedenini
düzelt. Eski iş son 30 dışında kaldıysa yetkili oturumla
`POST /api/admin/accounts/registration-notifications/{id}/retry` kullanılabilir;
CSRF gerekir. GET aynı kökteki `registration-notifications` görünümünü verir.
Bildirim API'si yalnız site yöneticilerine açıktır.

Mesaj yalnız yeni kayıt/onay bekleme bilgisi ve yönetim bağlantısı içerir; öğrencinin
e-postası, telefonu, kullanıcı adı veya parolası sağlayıcıya gönderilmez.
`ACCEPTED` sağlayıcının kabulüdür; gelen kutusuna teslim veya okundu kanıtı değildir.
Sağlayıcı mesaj kimliği varsa saklanır.

İşin UUID olay anahtarı her istekte Brevo `headers.idempotencyKey` olarak gönderilir.
[Sağlayıcının tekilleştirme süresi 30 dakikadır](https://developers.brevo.com/docs/heterogenous-versions-batch-emails).
`duplicate_parameter` kabul olarak kaydedilir, mesaj kimliği bilinmeyebilir.
Sağlayıcı kabulünden sonra DB yazımı başarısızsa veya belirsiz timeout olursa iş
yeniden denenir; pencere dışında yinelenen e-posta mümkündür. Mutlak tek gönderim
garantisi verilmez. Yeniden deneme sırasında gönderen/URL ayarını değiştirmek de
aynı gövdeyi korumaz; böyle bir değişiklikten önce bekleyen işlerin durumunu incele.

## Doğrulama ve kalan gerçek ortam kabulü

```powershell
python scripts/ivme.py test RegistrationNotificationTest,BrevoRegistrationMailTest,RegistrationApprovalTest
python scripts/ivme.py ui kayit-bildirimi-ui.mjs
python scripts/ivme.py sayfa /yonetim --rol admin --icerir "Yeni kayıt bildirimleri"
```

DB testleri yalnız geçici `ivme_test` kullanır; sahte sağlayıcı testleri yalnız
loopback HTTP sunucusuna gider. Gerçek alıcıya ulaşma kabulü için kurulumdan sonra
yeni bir normal kayıt oluştur, panelde `ACCEPTED` ve sağlayıcı mesaj kimliğini,
alıcı kutusunda doğru yönetim bağlantısını doğrula. Mevcut hesapları veya eski
olayları yeniden oynatma. Bu adım olmadan TAS-10 gerçek gönderim kabulü tamamlanmış sayılmaz.

Canlı yönetim sayfasında önceden var olan ayrı yetki bulgusu: yan menü görünüm
tercihi `/api/preferences/sidebar-rail`, güvenlik yapılandırmasının yalnız `USER`
izni nedeniyle yönetici için 403 döner. TAS-10 API'si çalışır; genel `sayfa` denetimi
bu istek yüzünden başarısız olabilir. Bildirim UI testi bu tek hatayı raporda açıkça
ayırır; diğer başarısız istekleri kabul etmez. Ayrı görünüm tercihi işi olarak ele alınır.
