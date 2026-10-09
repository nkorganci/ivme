# Kayıt ve iletişim bilgisi sözleşmesi

**Tarih:** 2026-10-08. Bu not [yol haritasındaki](00_YOL_HARITASI.md) öncelikli kayıt işinin sözleşmesidir; mevcut [API belgesinin](../API-ve-mimari.md) kimlik ve hesap bölümünü bu alanlar için günceller.

## Öğrenci akışı

1. `/kayit`: kullanıcı adı (3–30), e-posta, cep telefonu, şifre ve şifre tekrarı istenir. Yeni şifre en az 15 karakter, en fazla 72 UTF-8 bayttır; boşluk ve parola yöneticisi kullanılabilir. Şifre tekrarı yalnız tarayıcıda kontrol edilir ve sunucuya gönderilmez.
2. Telefon Türkiye için `05xx xxx xx xx` veya `+905xxxxxxxxx`, diğer ülkeler için `+` ülke kodlu numara olarak alınır; boşluk/noktalama çıkarılarak E.164 biçiminde saklanır. Biçim doğrulaması numara sahipliğini kanıtlamaz. Telefon benzersiz hesap anahtarı değildir.
3. Kayıt sonrası mevcut oturum açma akışı kullanıcı adı veya e-posta + şifre ile işler. Telefonla giriş ve telefon/e-posta üzerinden şifre kurtarma bu sürümde yoktur. Arayüz, doğrulama mesajı gönderilmediğini açıkça söyler.
4. Eski öğrenci hesabında telefon boşsa girişten sonra `/hesap` ekranına yönlendirilir. Öğrenci e-posta ve telefonu mevcut şifresiyle kaydeder, sonra geldiği sayfaya döner. Yönetici için telefon zorunlu değildir. Sunucuda telefon alanı eski kayıtlar için boş kalabilir.

## Veri ve API

| İstek | Veri / yanıt |
|---|---|
| `POST /api/auth/register` | `{username,email,phone,password}` zorunlu; telefon biçimi ve yeni şifre sınırları sunucuda doğrulanır; 201 `UserDto` |
| `POST /api/auth/login`, `GET /api/auth/me` | `UserDto = {id,username,email,role,contactComplete}`; telefon bu genel yanıtta yok |
| `GET /api/account/contact` | Oturum sahibine `{email,phone}`; başkasının bilgisine erişim yok |
| `PUT /api/account/contact` | `{email,phone,currentPassword}`; şifre doğrulanır, e-posta tekilliği ve telefon biçimi kontrol edilir; `{email,phone}` döner |
| `PUT /api/account/password` | `{currentPassword,newPassword}`; yeni şifre en az 15 karakter/en fazla 72 UTF-8 bayt |

Flyway `V4__user_contact.sql` sütunu ekler; önceki `V3__soru_koleksiyonu.sql` göçü sürüm sırasına dahildir. Telefon yalnız veritabanında ve hesap sahibinin iletişim API yanıtında bulunur. İstek nesnelerinin log metninde şifre/telefon/e-posta maskelenir. `contactComplete`, kullanıcının telefon girmesi anlamına gelir; iletişim bilgisinin doğrulandığı anlamına gelmez.

## Kontrol

- Yeni kayıt: alanlar zorunlu; geçersiz telefon/çok kısa veya BCrypt sınırını aşan şifre reddedilir; düz şifre saklanmaz.
- Eski hesap: giriş çalışır; hesap ekranında telefon tamamlanır; yanlış mevcut şifre reddedilir; kullanıcı yalnız kendi iletişim verisini görür.
- Kayıt, giriş, iletişim güncelleme ve şifre değiştirme CSRF korumasına tabidir. Log metninde parola görünmez.
- Masaüstü ve telefonda form alanları, hata mesajları, `tel` ve parola yöneticisi otomatik doldurma akışı kontrol edilir.

**Açık sınır:** E-posta/SMS gönderim ve sahiplik doğrulaması için henüz hizmet yapılandırılmadı. Bu bilgiler doğrulanmış iletişim kanalı veya ikinci faktör olarak kullanılmaz.

**Doğrulama (2026-10-08):** Mevcut çalışma ağacında 27 Java testi ve React üretim derlemesi; yalnız bu commit'in temiz checkout'unda 18 Java testi ve React üretim derlemesi geçti. Kayıt ekranı masaüstü ve 390 px mobil cihaz emülasyonunda incelendi; mobilde yatay taşma yok. Canlı tünelde uçtan uca giriş yapılmadı.
