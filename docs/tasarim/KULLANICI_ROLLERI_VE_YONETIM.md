# Kullanıcı rolleri, erişim ve site yönetimi tasarımı

Belge sürümü: `kullanici-yonetimi-tasarim-v1`. Durum: `YALNIZ_TASARIM`. Bu belge
önerilen hedefi tarif eder; belgenin bulunması veya yol haritasına bağlanması uygulama
yetkisi vermez. Bugün çalışan kullanıcı yönetimi
[sistem rehberinde](../plan/rehber/09_kullanici-yonetimi.md) anlatılır ve aşağıdaki 1. bölümde
özetlenir; buradaki diğer yönetim, ilişki, bildirim ve hesap mutasyonu aşamaları ayrıca
uygulama talimatı bekler. Mevcut hesaplar, roller, öğrenci gelişimleri, öğretmen kararları
ve ilişkili geçmiş korunur.

## Önerilen temel yaklaşım

İvme için **dört ana kullanıcı rolü** yeterlidir: öğrenci, veli, öğretmen ve site
yöneticisi. Anne ve baba aynı veli rolünü kullanır; her biri kendi hesabıyla
girer. Bir velinin birden fazla çocuğu, bir öğrencinin birden fazla velisi ve
öğretmeni olabilir. Aynı kişi hem öğretmen hem veli olduğunda tek hesapta iki
rol taşıyabilir; girişten sonra görünümünü seçer.

Erişim kararı iki soruyu birlikte cevaplamalıdır: **Bu kişinin rolü ne? Bu
öğrenciyle onaylı bağlantısı var mı?** Sadece öğretmen veya veli olmak hiçbir
öğrenciyi görmeye yetmez. Site yöneticisi ise ayrıca tanımlanmış yönetim
yetkileriyle bütün öğrencileri inceleyebilir. Bu yetki modelini mevcut Spring
Security, PostgreSQL ve oturum yapısı içinde kurmak başlangıç için yeterlidir;
ayrı kimlik servisi veya mikroservis projesi açmak gerekmez.

Mevcut **OPERATOR** içerik bakımı görevi korunmalıdır. Öğrenci takibi yapan
öğretmen ile soru/PDF doğrulayan içerik operatörü farklı sorumluluklardır.
Dolayısıyla ürünün dört ana rolüne ek olarak mevcut teknik içerik yetkisi
yaşamaya devam eder. Öğretmen hesabı açılması otomatik OPERATOR yetkisi vermez.

## 1. Mevcut uygulamanın durumu

| Alan | Bugün çalışan davranış | Önerilen gelişme |
|---|---|---|
| Kullanıcı rolleri | `USER`, `ADMIN`, `OPERATOR`, `TEACHER`, `PARENT`; hesapta tek rol. Site yöneticisi ayrı `users.site_manager` yetkisidir | Gerektiğinde çoklu rol ve ayrı içerik bakım izni |
| Öğrenci | `USER` kendi çalışmalarına erişir | Bu sahiplik korunur; ek roller yeni erişim kurallarıyla çalışır |
| Yönetici | Site yöneticisi tüm rollerin listesini, sayılarını, son girişi, ölçülmüş etkin süreyi ve ülke kodunu görür; `/api/admin/stats` toplu ve yuvarlanmış istatistik verir | İlişkiler, gerekçeli bireysel inceleme ve ayrıntılı hesap yönetimi |
| Veli ve takip öğretmeni | Roller ve yerel test hesapları var; onaylı öğrenci bağlantısı ve takip ekranları yok | Veli–çocuk ve öğretmen–öğrenci ilişkileri |
| Giriş ve kayıt | Kullanıcı adı veya e-posta ve parola; sunucu oturumu. Yeni kayıt `approved=false` oluşur ve site yöneticisi onaylar | Tek giriş sayfası korunur; rol sunucudan belirlenir |
| İletişim | Kayıtta e-posta ve telefon zorunlu; sahipliği doğrulanmıyor | Yeni davet/veli bağlantılarında doğrulanmış iletişim ve ilişki onayı |
| Hesap durumu | Engelle/aç (`enabled`), kayıt onayı, açık oturumların iptali; kendi hesabını ve son yöneticiyi koruma | Açıklamalı duraklatma ve arşivleme |
| Kullanım kaydı | `LOGIN`/`LOGOUT` olayları `activity_events` içinde 90 gün; `last_login_at`, `active_seconds`, `last_login_country_code` hesapta | Son giriş ve son gerçek öğrenme etkinliği ayrı gösterilir |
| Hesap silme | Site yöneticisi kullanıcı adıyla onaylı kalıcı silme yapar; öğrenci kendi verisini dışa aktarıp silebilir. İşlemler `account_audit` kaydında | Yeni ilişkiler eklenirken sahiplik ve silme etkileri yeniden ele alınır |

Dayanaklar: [rol tanımı](../../backend/src/main/java/com/hedefyks/user/Role.java),
[hesap modeli](../../backend/src/main/java/com/hedefyks/user/User.java),
[oturumdaki kullanıcı](../../backend/src/main/java/com/hedefyks/user/AppUserDetails.java),
[erişim kuralları](../../backend/src/main/java/com/hedefyks/config/SecurityConfig.java),
[giriş kaydı](../../backend/src/main/java/com/hedefyks/progress/LoginActivity.java),
[olay saklama](../../backend/src/main/java/com/hedefyks/config/ActivityRetention.java),
[API sözleşmesi](../API-ve-mimari.md) ve
[içerik öğretmeninin mevcut yetkileri](../OGRETMEN_DOGRULAMASI.md).

Bugünkü ADMIN bütün öğrenci ekranlarına erişen bir üst rol değildir. Yeni
bireysel erişim, mevcut toplu istatistik sözleşmesinden ayrı, açıkça verilen ve
kaydı tutulan bir yönetim yetkisi olmalıdır. Mevcut ADMIN/OPERATOR hesaplarını
geçiş sırasında topluca geniş yetkili yapmak önerilmez.

## 2. Khan Academy ve IXL'den alınacak uygulamalar

- Khan Academy, veli ile çocuğun öğretmen/koç bağlantısını ayrı yönetir; veli
  çocuk hesabındaki koçları görebilir ve kaldırabilir. İvme için çıkarım:
  öğretmen yetkisi öğrenciyle kurulan görünür ve iptal edilebilir bağlantıya
  dayanmalı. [Khan Academy: çocuk hesabında koç yönetimi](https://support.khanacademy.org/hc/en-us/articles/202263004-How-do-I-add-or-remove-coaches-on-a-child-account).
- Khan Academy'nin güncel öğretmen raporları etkinlik, beceri, ödev sonucu ve
  soru yanıtı gibi farklı ayrıntılara iner. İvme için çıkarım: öğretmen önce
  öğrenci listesini ve özetini, ardından seçtiği öğrencinin eğitim ayrıntısını
  görmeli. [Khan Academy: güncel öğretmen raporları](https://support.khanacademy.org/hc/en-us/articles/38554738905997-What-teacher-reports-are-available-on-Khan-Academy-Reimagined).
- IXL'in yönetici rehberi merkezi öğrenci/öğretmen listeleri, arama/filtreleme,
  öğrenci erişimini kaldırma/yeniden etkinleştirme ve öğretmen hesabından ayrı
  genel raporlar tanımlar. İvme için çıkarım: tek yönetim merkezinde hesap
  yönetimi ve eğitim takibi birlikte bulunmalı, yetkileri ayrı olmalı.
  [IXL: yönetici başlangıç rehberi](https://www.ixl.com/materials/userguides/IXLQuickStart_Administrator.pdf).
- OWASP, en az yetkiyi, her istekte kontrolü ve rolün yanında ilişki/özellik
  bilgisini kullanmayı önerir. İvme için çıkarım: öğrenci kimliği URL'de
  değiştirilerek başka öğrenciye erişilememeli; aynı kontrol görsel, PDF,
  rapor ve dışa aktarımda da uygulanmalı.
  [OWASP: yetkilendirme rehberi](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

Bu kaynaklar yön gösterir; aşağıdaki veli görünürlüğü, hesap durumları,
bildirim eşikleri ve sekiz aşama İvme'ye özel tasarım önerileridir. Başka
platformlarda aynı ayrıntıların bulunduğu iddia edilmez.

## 3. Roller ve görünürlük

Buradaki “her şeyi görme”, öğrencinin eğitim verilerinin tamamını ifade eder:
ilerleme, çalışma planı, pratik/deneme geçmişi, kaydedilmiş yanıtlar, doğru–yanlış
ve boş sayıları, süreler, konu/ünite gelişimi, eğitim raporları ve ortak takip
notları. Parola, parola özeti, oturum anahtarı, diğer yetişkinlerin özel iletişim
bilgileri ve iç güvenlik kayıtları eğitim görünümünün parçası değildir.
Devam eden bir denemenin gizli cevap anahtarı, bu görünüm üzerinden de açılmaz.

| Yetki | Öğrenci | Veli | Takip öğretmeni | Site yöneticisi |
|---|---|---|---|---|
| Öğrencinin eğitim ayrıntısını okuma | Kendisi | Onaylı çocukları | Aktif bağlantılı öğrencileri | Bireysel inceleme yetkisiyle seçtiği öğrenci |
| Soru çözme/deneme teslim etme | Kendisi | Yok | Yok | Öğrenci adına yok |
| Kendi iletişim/parola ayarı | Var | Var | Var | Var; diğerlerinin parolasını göremez |
| Öğrencinin planını okuma | Kendisi | Çocukları | Bağlı öğrencileri | Seçtiği öğrenci |
| Plan/hedef düzenleme | Mevcut kendi planı | Başlangıçta okuma ve öneri | Bağlı öğrenciye, ayrıca tanımlı düzenleme izniyle | Açık düzenleme işlemiyle ve kayıt tutularak |
| Eğitim takip notu | Kendi/ortak notları | Çocuğun ortak notları | Bağlı öğrenci için ortak not ekleme | Ortak notları ve yönetim işlemlerini inceleme |
| Öğrenci bağlantısı kurma/bitirme | Talep; tek başına yetişkine erişim açmaz | Doğrulanmış çocuk ilişkisi kapsamında talep | Talep; kendini öğrenciye yetkilendiremez | Yetki ve gerekçeyle onaylama/sonlandırma |
| Platformdaki bütün kullanıcı adları ve kullanım istatistikleri | Yok | Yok | Yok | Hesap yönetimi yetkisiyle var |
| Hesabı duraklatma/yeniden açma/arşivleme | Yönetim işlemi yok | Yönetim işlemi yok | Yönetim işlemi yok | Öğrenci, veli ve öğretmen hesaplarında var |
| Toplu veya kurallı duyuru | Yok | Yok | Yalnız bağlı öğrencilere tanımlı iletişim izniyle | Hedef kitle seçerek var |
| İçerik doğrulama/ithalat | Yok | Yok | Otomatik verilmez | Otomatik verilmez; OPERATOR ayrıca gerekir |

“Siteyi kullanan kişi” için istenen genel kullanıcı listesi burada **siteyi
yöneten kişi** olarak yorumlanmıştır. Normal üyeler diğer üyelerin kullanıcı
adlarını, giriş tarihlerini veya çocuk bağlantılarını listeleyemez.

Çoklu rolün etkisi somut olmalı: Ayşe hem veli hem öğretmense veli görünümünde
çocuklarını, öğretmen görünümünde takip öğrencilerini görür. Arayüzde görünüm
değiştirmek ek yetki kazandırmaz. Sunucu her istekte rol, işlem ve öğrenci
bağlantısını birlikte doğrular. Bir rolün iptali diğer geçerli rolü silmez.

İlk sürümde gizli öğretmen notları veya özel mesaj sistemi eklemek gerekmez.
“Ortak takip notu” yazan kişi, notu öğrenci ve bağlı velinin de göreceğini açıkça
bilmelidir. Yöneticiye özel hesap işlem gerekçeleri ayrı yönetim kaydında tutulur.

## 4. Kullanıcılar sisteme nasıl girmeli?

**Tek giriş sayfası** kullanılmalı: kullanıcı adı veya e-posta ve parola.
Girişte “Admin olarak gir” seçmek yetki vermemeli; roller sunucudaki kayıttan
gelmeli. Tek rolü olan kişi doğrudan kendi paneline, çoklu rolü olan kişi son
seçtiği geçerli görünüme yönlenmeli. Ortak aile hesabı/parola paylaşımı yapılmamalı.

| Rol | Hesap açma ve ilk erişim |
|---|---|
| Öğrenci | Mevcut kayıt/giriş korunur. Yeni küçük yaştaki öğrenci için veli veya yönetici davetiyle kullanıcı adı ve kendi parolası oluşturulması önerilir; çocuğun kişisel telefonu/e-postası gereksiz yere zorunlu tutulmaz. Bu, mevcut kayıt şartlarından gelecekte yapılacak ayrı bir değişikliktir |
| Veli | Kendi hesabını ve iletişim adresini doğrular; çocuk bağlantısı onaylanana kadar öğrenci verisi görmez |
| Öğretmen | Yönetici davetiyle veya yönetici onaylı başvuruyla açılır; öğrencisi atanana kadar liste boştur |
| Yönetici | Genel kayıtta seçilemez. Yetkili sistem sahibi tarafından mevcut/yeni bir hesaba açık yetki ataması yapılır; ilk atama ayrıca kaydedilir |
| İçerik operatörü | Mevcut erişimini korur; öğretmen/veli olmakla otomatik kazanılmaz |

Veli ve öğretmen için parola yenileme, doğrulanmış kendi iletişim kanalından
yapılmalı. Yönetici parola öğrenmek yerine tek kullanımlık yenileme daveti
başlatabilmeli. E-posta sahipliği doğrulaması tek başına velilik veya öğretmenlik
kanıtı sayılmamalı. İlk sürümde dış kimlik sağlayıcı şart değildir; ihtiyaç olursa
Google/Microsoft girişi mevcut kullanıcı kimliği korunarak sonradan eklenebilir.

Yeni hesap yönetimi yetkilerini kullanacak yöneticide iki aşamalı doğrulama
(MFA) önerilir. Yetki verme ve kalıcı silme gibi hassas işlemlerde yeniden
doğrulama gerekir. Bu, mevcut bütün kullanıcıları zorunlu parola değişikliğine
sokmayı gerektirmez. [OWASP: kimlik doğrulama ve hassas işlem güvenliği](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### Veli–çocuk ve öğretmen–öğrenci bağlantısı

İlk sürümde en pratik yöntem, yönetici panelinden doğru kişileri seçip **kişiye
özel davet** göndermektir. Sonrasında veli ve öğretmen kendi hesaplarından
bağlantı talep edebilir; yetki aynı onay sürecinden geçer.

1. Yönetici öğrenci ile veli/öğretmen hesabını seçer; ilişki türünü ve gerekçeyi
   kaydeder. Öğretmende takip başlangıcı ve isteğe bağlı bitiş tarihi bulunur.
2. Alıcı kendi hesabıyla, kendi doğrulanmış iletişim kanalından gelen daveti
   kabul eder. Önerilen davet süresi 24 saattir; tek kullanımlı, tahmin edilmesi
   zor ve sunucuda özeti saklanan davet kullanılır.
3. Veli bağlantısında yöneticinin belirlenmiş ilişki doğrulaması tamamlanır.
   Öğrencinin “bu benim velim” demesi, aynı soyad veya aynı telefon tek başına
   yeterli değildir. Doğrulama sonucu ve yöntemi kaydedilir; gereksiz belge
   kopyası biriktirilmez. İkinci veli de ayrı doğrulanır.
4. Küçük yaştaki öğrencinin öğretmen bağlantısı, yetkili veli onayı ve yönetici
   atamasıyla etkinleşir. Yetişkin öğrenci kendi paylaşımını onaylar. Yaş/yetki
   bilgisi belirsizse bağlantı incelemede kalır; mevcut öğrenci erişimi kapanmaz.
5. Hem kabul hem gerekli onay tamamlanınca ilişki `ACTIVE` olur. Bekleyen davet
   hiçbir veri erişimi sağlamaz. İlişki durumu `PENDING`, `ACTIVE`, `REVOKED`,
   `EXPIRED` olarak izlenebilir; davetin süresi ve ilişkinin süresi ayrıdır.
6. Öğrenci/veli panelinde erişebilen kişiler gösterilir. Bağlantı kaldırıldığında
   veya süresi bittiğinde yeni istekler, raporlar ve dışa aktarımlar erişemez;
   açık ekranın yenilenmesi de reddedilir. Önceki öğretmene geçmiş öğrenci
   verisi otomatik açık bırakılmaz. Önemli ilişki değişiklikleri ilgililere bildirilir.

Mevcut kullanıcılardan yaş, veli veya iletişim bilgisi eksik olanlar topluca
kilitlenmez; yeni bir yetişkin bağlantısı açılmadan önce eksik onay tamamlanır.
Yetişkinliğe geçişte veli paylaşımı öğrencinin onayına göre yeniden değerlendirilir.
Veli yetkisi itirazlıysa ilgili bağlantı incelemeye alınır; diğer geçerli
bağlantılar ve öğrencinin geçmişi korunur.

## 5. Her panel nasıl görünmeli?

**Öğrenci:** kendi ana sayfası, ilerlemesi, çalışma planı, pratikleri, denemeleri
ve bildirimleri. Kendi hesabı dışındaki öğrenci seçicisi bulunmaz.

**Veli:** önce “Çocuklarım” kartları; çocuk seçilince aynı eğitim verilerinin
tamamı, anlaşılır özet ve ayrıntı geçişleri. Bir çocuğun seçimi diğerinin
sonuçlarına karışmaz. Hesap/parola yönetimi ile eğitim takibi ayrı kalır.

**Öğretmen:** yalnız aktif bağlı öğrencilerin listesi; öğrenci seçilince tüm
eğitim geçmişi ve gelişimi. İlk ekranda son çalışma, haftalık etkinlik ve
inceleme gerektiren durumlar bulunur. Öğretmen öğrencinin eski puanını veya
verilmiş cevabını değiştiremez; öneri ve ortak takip notu ekleyebilir.

**Yönetici:** tek bir yönetim merkezinde altı bölüm önerilir:

1. **Genel bakış:** role göre kayıtlı hesaplar, aktif/duraklatılmış/arşivlenmiş
   dağılımı, bugün/7 gün/30 gün kullanım ve müdahale bekleyen işler.
2. **Kullanıcılar:** kullanıcı adı, görünen ad, rol rozetleri, hesap durumu,
   kayıt tarihi, son başarılı giriş, son gerçek kullanım, dönemde giriş yapılan
   gün sayısı ve bağlantı özeti. Filtreler: rol, durum, tarih, hiç ölçülmemiş
   kullanım, belirlenen süredir çalışmayanlar ve eksik bağlantı.
3. **Öğrenci inceleme:** seçili öğrencinin öğrencide görünen tüm eğitim
   bölümleri; bağlı veli/öğretmenler ve müdahale geçmişiyle birlikte.
4. **Bağlantılar ve davetler:** bekleyen onay, süresi dolmuş davet, bağlantı
   ekleme/bitirme ve öğretmen değişimi.
5. **Duyurular ve kurallar:** alıcı seçimi, mesaj önizlemesi, zamanlama,
   otomatik kurallar ve gönderim/okunma sonuçları.
6. **İşlem geçmişi:** kim, ne zaman, hangi kullanıcı/öğrenci için hangi işlemi
   yaptı; önceki/sonraki durum ve gerekçe.

Kullanıcıya tıklanınca yanda özet paneli açılması; “Öğrenci görünümünü incele”,
“Bağlantıları yönet”, “Duraklat”, “Yeniden aç”, “Arşivle”, “Bildirim gönder” ve
“Parola yenileme daveti” işlemlerinin aynı yerde bulunması yönetimi kolaylaştırır.
Kalıcı silme ayrı ve korumalı bir işlem olmalı. Listeler sunucuda sayfalanmalı,
aranmalı ve filtrelenmeli; bütün kullanıcı ayrıntıları tarayıcıya indirilmemeli.
Tablolar projedeki `DataGrid.jsx` üzerinden AG Grid Community, renkler mevcut
`theme.css` değişkenleriyle uygulanır.

### Yöneticinin öğrenci gibi görmesi

Yönetici “Öğrenci görünümünü incele” dediğinde kendi oturumunda kalmalı. Ekranda
“Yönetici incelemesi — seçili öğrenci: …” bandı görünmeli. Öğrencinin parolasıyla
giriş yapılmamalı, öğrenci oturumu üretilmemeli ve öğrenci rolüne geçilmemeli.

Görünüm başlangıçta salt okunur olmalı: soru çözme, deneme gönderme, çalışma
başlatma ve ilerleme yazma kapalıdır. Yönetici incelemesi öğrencinin son girişini,
son kullanımını, öğrenme süresini veya bildirim okundu bilgisini değiştirmez.
İnceleme ayrı denetim kaydına yazılır. Yönetici planı düzenlemek isterse bunu
öğrenci adına gizli işlem olarak değil, açık yönetici işlemi olarak yapar.

Tek veri kaynağı korunur: öğrenci, veli, öğretmen ve yönetici raporları aynı
hesaplama servislerini kullanır. Ayrı kopya ilerleme tabloları veya farklı net
hesapları oluşturulmaz. Her okumada gerçek kullanıcı ve hedef öğrenci ayrılır;
sunucu erişimi doğruladıktan sonra ortak servis çalışır.

## 6. Sayımlar ve kullanım istatistikleri

**Kesin kişi sayısı** ile **role göre üyelik sayısı** ayrılmalı. Bir kişi hem
veli hem öğretmense toplam benzersiz hesapta bir, iki rolün sütununda birer kez
sayılır. Rol toplamları kişi toplamına eşit olmak zorunda değildir. OPERATOR
ayrı bakım yetkisi olarak raporlanır; davet gönderilmiş fakat hesap oluşmamış
kişiler kayıtlı kullanıcı sayılmaz. Arşivli hesaplar ayrıca gösterilir.

| Ölçüm | Tanım ve gösterim |
|---|---|
| Son başarılı giriş | Parola/kimlik doğrulamasıyla tamamlanmış gerçek giriş; otomatik oturum devamı ayrı olaydır |
| Son site kullanımı | Oturum açmış kullanıcının gerçek sayfa/işlev etkileşimi; arka plan sorguları, yönetici incelemesi ve servis kontrolleri hariç |
| Son öğrenme etkinliği | Öğrencinin gerçek soru/çalışma/deneme olayı; veli ve öğretmenin rapor okuması bunu değiştirmez |
| Giriş yapılan gün | Seçili saat diliminde en az bir başarılı giriş olan farklı gün sayısı |
| Kullanılan gün | En az bir gerçek site etkileşimi olan farklı gün sayısı; giriş yapılan günden ayrı |
| Aktif kullanıcı | Seçili dönemde gerçek site etkileşimi olan tekil hesap; eğitim etkinliği yapan öğrenci ayrıca raporlanır |
| Aktif öğrenme süresi | Mevcut doğrulanmış aktif süre ölçümü; açık sekme veya giriş–çıkış farkı değildir |
| Yakın zamanda etkin | Örneğin son 5 dakikada etkileşim; kesin “şu an çevrimiçi” iddiası taşımaz |

Önerilen tarih filtreleri bugün, son 7 gün, son 30 gün ve özel aralıktır.
Zamanlar UTC saklanır; rapor gün sınırı mevcut sistemle uyumlu olarak
`Europe/Istanbul` seçilir ve ekranda belirtilir. Kullanıcıya farklı saat dilimi
sunulursa aynı aralığın bütün grafik ve sayımları birlikte dönüştürülür.

Son giriş özeti, ham 90 günlük LOGIN olaylarının temizlenmesinden bağımsız
tutulmalı. Son kullanım özeti gerçek etkileşimlerde, örneğin en fazla 5 dakikada
bir güncellenebilir; gösterim bu yaklaşık güncelliği belirtir. Daha uzun dönem
raporu gerekiyorsa amaç ve saklama süresi tanımlanmış günlük özet tutulur.
Ham olay saklama süresi bu belgeyle değiştirilmez.

**Geçmiş uydurulmaz:** elde kalmış gerçek LOGIN olaylarından son giriş alınabilir;
ölçülmemiş eski site kullanımı veya silinmiş günler üretilemez. “Ölçüm başlangıcı”,
“bu dönem için veri yok” ve gerçek sıfır ayrı gösterilir. Yeni ölçüm öncesindeki
eksik kayıt, “bu kişi hiç girmedi” diye yorumlanmaz.

Mevcut anonimleştirilmiş `/api/admin/stats` sözleşmesi sessizce değiştirilmez.
İstenen kesin hesap sayıları ve bireysel kullanım bilgisi, yalnız yetkili yönetim
ekranında ayrı bir erişim sözleşmesiyle sunulur. İletişim ayrıntısı ihtiyaçta
açılır; kullanıcı listesinde parolalar veya oturum sırları yer almaz.

## 7. Duraklatma, arşivleme ve silme

En pratik varsayılan **duraklat ve gerektiğinde geri aç** olmalı. Kullanıcı
listesinden kaldırmak için arşivleme kullanılmalı; kalıcı silme ayrı tutulmalı.

| Hesap durumu/işlem | Giriş ve erişim | Veriye etkisi |
|---|---|---|
| `ACTIVE` — etkin | Yetkileri kapsamında kullanır | Mevcut veriler sürer |
| `PAUSED` — duraklatılmış | Yeni giriş ve mevcut oturumların kullanımı engellenir | Kimlik, parola, geçmiş ve ilişkiler korunur; yeniden açılabilir |
| `ARCHIVED` — arşivlenmiş | Giriş kapalı; varsayılan kullanıcı listesinde gizli | Veriler korunur; arşiv filtresinden bulunur ve geri alınabilir |
| Kalıcı silme talebi | Ayrı inceleme/etki gösterimi ve yeniden doğrulama | Olağan panel işlemi değildir; açıkça seçilmiş hesap ve politika kapsamında yürütülür |

Duraklatmada gerekçe, başlama zamanı ve isteğe bağlı bitiş zamanı bulunmalı.
Bitiş varsa planlı yeniden açılma görünür olmalı. Süresiz duraklatma kendiliğinden
açılmaz. İlk sürümde toplu kalıcı silme veya otomatik veri silme önerilmez.

- Veli duraklatılırsa kendi erişimi kapanır; çocuk ve diğer veli etkilenmez.
- Öğretmen duraklatılırsa öğrencilere erişimi kapanır; öğrencilerin hesapları ve
  eğitim geçmişi kalır. Yönetici gerekirse yeni öğretmen atar.
- Öğrenci duraklatılırsa öğrenci giriş yapamaz. Aktif bağlı veli/öğretmen,
  mevcut eğitim geçmişini salt okunur görür; bu öğrenci için yeni çalışma veya
  plan yazma durur. Arşivlemede standart veli/öğretmen erişimi de kapanır;
  yönetici korunmuş geçmişi inceleyebilir.
- Arşivden dönüşte eski bağlantılar otomatik erişim kazanmaz; hâlâ geçerli
  olanlar açıkça yeniden onaylanır. İçerik ve öğrenci geçmişi yeniden üretilmez.
- Çoklu rollü hesabı duraklatmak bütün hesabı kapatır. Yalnız öğretmen erişimini
  kaldırmak isteniyorsa öğretmen rolü/bağlantısı sonlandırılır; veli rolü korunur.
- Son yetkili yönetici kendisini veya son diğer yöneticiyi duraklatıp sistemi
  yönetimsiz bırakamaz. Bu kontrol eşzamanlı işlemlerde de geçerli olmalıdır.

**Oturum ayrıntısı:** bugünkü kullanıcı nesnesi `enabled` ve rol bilgisini
oturumda taşır. Sadece DB'de `enabled=false` yazmak, açılmış bütün oturumların
anında kapanacağını garanti etmez. Gelecekte durum/rol/bağlantı değişiklikleri
bütün cihaz oturumlarına uygulanmalı; sunucu her istekte güncel hesap durumunu
ve erişim sürümünü doğrulamalı. Önbellek varsa iptal mekanizması bulunmalı.
Duraklatma sırasında devam eden yazmalar da aynı kontrol ve işlem sınırına
uymalı; önceden tamamlanmış çalışmalar silinmemeli.

Kalıcı silme ileride istendiğinde önce etki özeti gösterilmeli. Veli hesabını
silmek çocuğu, öğretmeni silmek öğrenciyi veya öğrencinin eğitim geçmişini
silmemeli. İlişki, not yazarı ve denetim kayıtlarındaki kişisel alanlar açık
politika kapsamında kaldırılmalı/anonimleştirilmeli. Arşivleme kişisel verinin
silinmesi değildir. Mevcut öğrencinin kendi hesabını silme akışı bugün
değiştirilmez; yeni ilişkiler eklenmeden önce aynı silme politikası ve merkezi
servisle uyumlandırılır. Yedeklerden geri yüklemede kapanmış erişimlerin veya
silinmiş kişisel verinin yanlışlıkla yeniden açılmaması da planlanır.

## 8. Otomatik uyarılar ve duyurular

Başlangıç için az sayıda, yönetici tarafından açılıp kapatılabilen kural yeterli.
Otomatik mesajın amacı kullanıcıya yardımcı olmaktır; düşük puan veya seyrek
kullanım tek başına hesabı otomatik duraklatma/silme nedeni olmamalıdır.

| Kural | Önerilen alıcı ve davranış |
|---|---|
| Öğrenci 7 gündür öğrenme etkinliği yapmadı | Öğrenci; onaylı bildirim tercihine göre bağlı veli. Yeni ölçümden itibaren yeterli veri varsa çalışır |
| Haftalık gelişim özeti | Bağlı veli; yalnız kendi çocuğunun özeti. Öğretmen kendi öğrencilerinin panel özetini görür |
| Davet 24 saatte kabul edilmedi | Daveti başlatan kişiye/yönetici kuyruğuna bilgi; öğrenci verisi açılmaz |
| Hesap duraklatıldı veya yeniden açıldı | Etkilenen hesap; öğrencide gerektiğinde yetkili veli. Dışarıya iç yönetim notu gönderilmez |
| Bakım veya genel duyuru | Seçilen rol, bağlı öğrenci grubu veya tek kullanıcı; gönderim öncesi alıcı sayısı ve mesaj önizlemesi |

Örnek: “Son 7 günde yeni bir çalışma görünmüyor. Uygun olduğunda planına göz
atabilirsin.” Başarı hakkında suçlayıcı veya doğrulanmamış yorum üretilmez.

İlk kanal uygulama içi bildirimdir. Doğrulanmış e-posta sağlayıcısı varsa e-posta
eklenebilir; SMS/WhatsApp ilk sürüm için gerekli değildir. Dış mesajda ayrıntılı
not, soru yanıtı veya puan yerine güvenli giriş bağlantısı kullanılmalı. Girişi
kapatılmış kişiye uygulama içi bildirimin görülebileceği varsayılmaz: girişte
genel durum açıklaması ve destek yolu bulunur; mümkünse doğrulanmış dış kanala
bildirilir. Dış kanal yoksa yöneticiye “teslim edilemedi” gösterilir.

Her kuralda hedef kitle, koşul, kanal, sessiz saat, sıklık sınırı ve açık/kapalı
durumu olmalı. Öneri: aynı hareketsizlik mesajı en fazla 7 günde bir;
acil olmayan mesajlar alıcının belirlenmiş saat dilimindeki gündüz saatlerinde.
Bu eşikler ürün kararıdır ve panelden değiştirilebilir.

Gönderimler kuyruk/outbox kaydıyla izlenmeli; kural + alıcı + öğrenci + dönem
anahtarı tekrar gönderimi önlemeli. Teslimden hemen önce bağlantı ve iletişim
izni tekrar kontrol edilmeli. Bağlantısı kaldırılmış veliye bekleyen rapor
gönderilmemeli. Kuyruğa alındı, gönderildi, teslim başarısız ve uygulamada okundu
ayrı durumlar olmalı; e-posta gönderilmesi okunma kanıtı sayılmamalı.

## 9. Teknik tasarımın sınırları

Bu bölüm şema oluşturma talimatı değildir; gelecekteki uygulamanın taslağıdır.

- **Hesap:** mevcut `users.id`, kullanıcı adı, parola özeti ve kayıt tarihi
  korunur. Durum, durum gerekçesi, son giriş/kullanım ve erişim sürümü ihtiyaç
  oldukça eklenir. Mevcut `enabled=false` kayıtlar topluca açılmaz.
- **Rol atamaları:** örneğin `user_roles` ile çoklu rol; `USER` mevcut öğrenci
  rolünün uyumluluk karşılığı olarak korunur. Kullanıcı arayüzünde “Öğrenci”
  denmesi için eski DB değerini yeniden adlandırmak gerekmez. Eski `role`
  alanından yeni yapıya geçişte tek yetki kaynağı tanımlanır; birbirinden
  habersiz iki rol sistemi çalıştırılmaz. Atama yetkisi normal kayıt formuna verilmez.
- **Öğrenci ilişkileri:** veli ve öğretmen bağlantıları; öğrenci/yetişkin
  kimlikleri, tür, durum, kapsam, başlangıç/bitiş, onaylayan ve iptal bilgisi.
  Aynı ilişki yanlışlıkla iki kez etkinleşmemeli. İlk sürümde öğretmen erişimi
  kullanıcının istediği gibi tüm eğitim verisidir; ders kapsamıyla daraltma
  ileride ayrı karar olabilir.
- **Davetler ve doğrulama:** tek kullanımlık davet özeti, süre, kabul ve onay
  kaydı. Davet bağlantısında öğrenci sonucu veya kişisel ayrıntı taşınmaz.
- **İşlem geçmişi:** durum, rol, ilişki ve bildirim değişikliklerinde gerçek
  işlemi yapan kişi, hedef, zaman, gerekçe ve sonuç. Yönetici öğrenci
  incelemeleri de kaydedilir. Parola, token ve gereksiz kişisel ayrıntı loglanmaz.
- **Bildirimler ve kullanım özeti:** gerçek eğitim kayıtlarından ayrı kanal ve
  teslim bilgisi; yalnız gerekli günlük kullanım özetleri. Öğrenci ilerlemesi
  bu tablolara kopyalanmaz.

Merkezi erişim denetimi her istek için şu sırayı uygulamalı: gerçek kullanıcının
durumu → işlem yetkisi → hedef öğrenci ve ilişki → hedef hesabın durumu → alan
görünürlüğü. Liste/sayım sorguları da aynı kapsamla sınırlanır. Sonuçlar önce
geniş çekilip tarayıcıda filtrelenmez. Öğrenci kimliğini değiştirmek, farklı rol
göndermek veya açık bir dosya URL'sini kopyalamak kapsamı aşamaz.

Öğrencinin mevcut kendi verisi uçları genişletilip istemcinin gönderdiği herhangi
bir `studentId` değerine güvenilmez. Veli/öğretmen/yönetici okumaları, hedef
öğrenciyi açıkça alan ve merkezi kontrolü çağıran ayrı yetkili uçlardan ortak
servise geçer. Yazma uçları ayrıca sınırlanır; okuma izni düzenleme izni sayılmaz.
Salt okunur öğrenci görünümü için mevcut bileşenler ortak kullanılabilir;
mevcut ilerleme, ilk karşılaşma, net ve etiket anlık kayıt kuralları korunur.

## 10. Mevcut kullanıcıları koruyarak sekiz aşamada uygulama

Bu sekiz alt işin hepsi **henüz uygulanmadı**. Kullanıcı ayrıca uygulama
talimatı vermedikçe başlanmaz. İçerik alan incelemesinden bağımsız hazırlanabilir;
gerçek ortama açılış mevcut 12.03 işletim koşulları ve son kabul ile birlikte
değerlendirilir. Birleşik yetki/ilişki modeli hazır olmadan veli/öğretmen
erişimi açılmaz.

| Görev | Kapsam ve çıktı | Kabul ölçütü |
|---|---|---|
| 13.01 | Salt okunur mevcut hesap/rol/veri bağı envanteri; kapsam sözleşmesi; doğrulanmış yedek/geri dönüş ve izole test kopyası | Kimlik/rol/durum ve ilişkili geçmiş için karşılaştırma dayanağı var; mevcut hesap veya veri değişmemiş |
| 13.02 | Eklemeli rol/durum modeli, eski USER/ADMIN/OPERATOR uyumluluğu; merkezi erişim, oturum iptali, ilk yönetici atama ve denetim altyapısı | Eski hesaplar aynı girişle çalışır; kapalılar kapalı kalır; varsayılan yeni ayrıcalık yok; rol/durum iptali açık oturumda da etkili |
| 13.03 | Veli/öğretmen daveti ve onaylı öğrenci ilişkileri; mevcut silme/dışa aktarma servisinin yeni bağlantılarla uyumu | Bekleyen/süresi dolmuş/iptal edilmiş ilişki veri açmaz; ikinci veli ve çoklu öğretmen çalışır; hesap silme başka hesabı silmez |
| 13.04 | Öğrenci sahipliği korunarak veli ve öğretmen panelleri; yöneticinin salt okunur öğrenci incelemesi | Aynı öğrenci için aynı eğitim sonuçları; yabancı öğrenci ve dosyalara erişim yok; inceleme öğrenciye etkinlik/cevap yazmaz |
| 13.05 | Yönetici kullanıcı listesi, role göre sayım, arama/filtre ve giriş/kullanım ayrımı | Çoklu rollü hesap tekil toplamda bir kez sayılır; ölçümsüz geçmiş doğru belirtilir; mevcut toplu istatistik sözleşmesi korunur |
| 13.06 | Duraklatma, geri açma, arşivleme, bağlantı aktarımı ve durum bildirimi; kalıcı silme için ayrı etki akışı | Hiçbir mevcut geçmiş kaybolmaz; bütün cihazlarda erişim kesilir; diğer veli/öğrenci etkilenmez; son yönetici korunur |
| 13.07 | Uygulama içi duyuru, sınırlı otomatik kurallar ve isteğe bağlı doğrulanmış dış kanal | Önizleme/sıklık/sessiz saat ve teslim durumu doğru; mükerrer gönderim yok; iptal edilmiş bağlantıya mesaj gitmez |
| 13.08 | Ayrı test ortamında rol/ilişki/durum kabulü; veri karşılaştırması ve küçük davetli pilot; kontrollü etkinleştirme/geri dönüş | Yetkisiz erişim yok; eski kimlik/parola/sonuçlar aynı; arşivden dönüş ve yedek geri yükleme doğru; pilot bulguları ölçülmüş |

13.01–13.06 temel yönetim yeteneğini oluşturur; 13.07 otomasyonu ekler.
Gerçek kullanıcı erişimine açılmadan önce 13.08 kabulü gerekir. Takvim, mevcut
kodun ayrıntılı uygulama değerlendirmesi ve gerçek pilotla netleşir; bu belge
süre veya tamamlanmış özellik taahhüdü değildir.

Geçişler silip yeniden kurma yerine eklemeli olmalı. Eski `USER` hesaplarına
öğrenci karşılığı verilirken kullanıcı kimlikleri, kullanıcı adları, parola
özetleri ve çalışmalar değişmez. Mevcut ADMIN/OPERATOR sınırı korunur; yeni
yönetim yetkisi seçilmiş hesaba açıkça atanır. Veli/öğretmen bağlantıları soyad,
e-posta benzerliği veya tahminle doldurulmaz. Gerekli özellik anahtarları önce
kapalı açılır; yeni hesap kayıtları kabul edildikten sonra eski uygulama
sürümüne körlemesine dönülmez. Geri dönüş yeni veri ve yetki sınırlarını da korur.

### Kabul sırasında özellikle sınanacak senaryolar

1. A öğrencisi URL/API kimliğini B yapınca B'nin sonuç, plan, görsel, dosya ve
   raporuna erişemez. Sayım ve dışa aktarım da bilgi sızdırmaz.
2. Veli iki kendi çocuğunu görür; başka çocuğu ve diğer yetişkinin özel hesabını
   göremez. Öğretmen yalnız aktif bağlı öğrencileri görür.
3. Daveti kabul etmemiş, süresi dolmuş veya yetkisi iptal edilmiş yetişkin hiçbir
   yeni öğrenci isteğini kullanamaz; açık sekme ve bekleyen e-posta da sınanır.
4. Hem veli hem öğretmen olan kişinin bir rolünü iptal etmek diğer geçerli
   erişimini silmez; öğretmen görünümünden kapsam dışına çıkamaz.
5. Öğretmen/veli duraklatılınca kendi erişimi bütün cihazlarda kesilir;
   öğrenci/diğer veli kalır. Yeniden açma önceki ilerlemeyi değiştirmez.
6. Öğrenci duraklatma/arşivleme için yukarıdaki okuma/yazma ayrımı geçerlidir;
   işlemle eşzamanlı cevap isteği tutarlı sonuçlanır.
7. Yönetici öğrenci görünümünü okurken öğrenci adına LOGIN, cevap, aktif süre,
   çalışma veya okundu kaydı oluşmaz. Denetim kaydı gerçek yöneticiye aittir.
8. Eski USER/ADMIN/OPERATOR izinleri ve iletişim/giriş akışları korunur;
   yeni yetki normal kayıt, rol alanı değiştirme veya yerel kısayolla kazanılamaz.
9. Eski kullanıcı kimlikleri, kullanıcı adları, parola özetleri ve eğitim
   geçmişi satır/ilişki karşılaştırmasında korunur. Eksik eski kullanım sıfıra
   dönüştürülmez; bir hesabın silme testi başka hesabı etkilemez.
10. Aynı zamanlanmış kural iki kez çalışınca tek bildirim çıkar; aynı anda son
    yöneticileri kapatma istekleri sistemi yönetimsiz bırakamaz.

Bu doğrulamalar gelecekte yalnız izole test ortamında yapılır. Bu dokümantasyon
çalışmasında test hesabı, DB göçü, bildirim gönderimi veya gerçek kullanıcı
üzerinde test yapılmaz.

## 11. Site yöneticisinin günlük kullanım sırası

1. Genel bakıştan bekleyen davetleri, erişim sorunlarını ve destek gerektiren
   öğrencileri görür.
2. Kullanıcı listesinden rol/durum/son kullanım filtresiyle ilgili kişiyi bulur.
3. Öğrenciyi salt okunur inceleyip gelişimi ve bağlı yetişkinleri kontrol eder.
4. Gerekirse öğretmen bağlantısı düzenler, ortak takip notu veya bildirim ekler;
   erişim kapatma gerekiyorsa gerekçeli duraklatmayı kullanır.
5. İşlem geçmişinden sonucu ve bildirim teslimini doğrular. Kullanıcıyı listeden
   kaldırmak için arşivler; kalıcı silmeyi rutin temizlik olarak kullanmaz.
