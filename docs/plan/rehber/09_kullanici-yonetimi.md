# Sistem rehberi — Site yöneticisinin kullanıcı yönetimi

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Hesap, rol, onay, silme.

## Site yöneticisinin kullanıcı yönetimi

`users.site_manager`, mevcut ADMIN rolünden ayrı açık yetkidir; yalnız bunu
taşıyan hesap `ROLE_SITE_MANAGER` alır. `GET /api/admin/accounts` tüm rollerin
sayfalı listesini, `/summary` sıfır olan roller dahil sayıları döndürür.
Kategori bilgisi boş eski USER hesapları öğrencidir. Yalnız liste alanları
DTO'ya alınır; parola/hash/telefon ve çalışma içeriği gönderilmez.

Yönetim sayfasında kullanıcılar tek tabloda listelenir; kayıt tarihi yerel gün/ay/yıl,
son giriş zamanı `users.last_login_at`, toplam ölçülmüş etkin süre `users.active_seconds`
ve son bilinen ülke `users.last_login_country_code` alanlarından gelir. Ön planda ve
son 90 saniyede etkileşim olan sekme en çok 90 saniyelik etkinlik aralıkları gönderir;
sunucu toplamı artırır. Bu ölçüm değişiklikten sonra başlar; eski etkin süre uydurulmaz.
Ülke yalnız Cloudflare vekilinden hem `CF-Connecting-IP` hem `CF-IPCountry` gelirse
kaydedilir; ham IP saklanmaz. Başlık yoksa ülke bilinmiyor olarak kalır.

Engelleme/açma `enabled` alanını değiştirir. Silme, hesabı `users` tablosundan
ve bağlı özel kayıtları veritabanından kalıcı olarak kaldırır; başka kullanıcıların
kayıtları ve ortak soru/kaynak içeriği korunur. Kullanıcıya bağlı inceleme kararları
da kaldırılır. `account_audit` işlem kaydı kalır, silinen kullanıcıya ait FK alanı
`NULL` olur.
Silme kullanıcı adıyla açık onay ister. Yönetici kendi hesabını kapatamaz;
son yönetici korunur. Yönetim yazmaları transaction advisory lock ile sıralanır,
hedef satır kilitlenir ve işlem `account_audit` tablosuna aynı transaction'da
yazılır. `AccountStatusFilter` her API isteğinde hesabın etkinliğini denetler;
engelli veya silinmiş hesabın eski oturumu da geçersiz kılınır.

Kayıt herkese açıktır ama `approved=false` oluşturulur; hesap kategorisi ve rolü
yalnızca kayıt formundan belirlenir. Onay bekleme durumu ancak hesaba ait doğru
parolayla giriş denemesinden sonra açıklanır. `/api/admin/accounts?approved=false`
ve kullanıcı özetindeki `pending` sayacı başvuruları listeler.
`PATCH /api/admin/accounts/{id}/approval`, yalnız `ROLE_SITE_MANAGER` ve CSRF
belirteciyle onay verir; onay, engellenmiş hesabın engelini kaldırmaz.
`account_audit` onayı kaydeder. Hesabın güncel `approved` alanı yeni girişi ve
eski oturumların devamını denetler.

`dev` profiline bağlı `/api/auth/dev-accounts` ve `/api/auth/dev-switch/{role}`
yalnız doğrudan loopback isteklerinde `student`, `teacher`, `parent` ve `admin`
test hesaplarını açar. Uç noktalar proxy başlıklarından ve CF tünelinden gelen
istekleri reddeder; POST ayrıca CSRF belirteci gerektirir. Rol, adla eşleşen
hesaptan sunucuda belirlenir ve geçiş önceki hesabın oturumunu kapatır.
Öğretmen ve velinin öğrenci bağlantısı/takip hizmetleri henüz sunulmaz. Main'deki
normal hesaplar local test hesaplarına kendiliğinden dönüştürülmez.

Mevcut yerel rol hesapları `ivme` içinde saklanır; değişiklikler yönetim
ekranındaki yetki ve kayıt akışına tabidir.
