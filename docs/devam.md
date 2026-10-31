# İvme devir notu

Önce AGENTS.md ve bu not okunur. Tamamlanan keşifleri veya soru bankasını baştan üretme.
Ayrıntı: [öğretim sözleşmesi](icerik/konuyu-ogrenelim.md).

## Güncel görev kapsamı

Referans günü 31 Ekim 2026: **mevcut kaydedilmiş DB verisi korunur**. Eski
kaydedilmemiş olayları, tarayıcı kuyruklarını veya logları yeniden gönderme/tamamlama
yok. Eski v1/v2 öğrenme kuyrukları atılır; yeni v3 olayları onaya kadar korunur.
Hesaplar, diğer çalışmalar ve içerikler kalır. Kullanıcının son düzeltmesi önceki
silme yorumunu geçersiz kılar. Veri silme betiği hiç çalıştırılmadı ve kaldırıldı.

TAS-01 / 12.05 tamamlandı. TAS-02–12'nin kapsamı da bu referans kuralıyla
güncellendi; bu oturumda hepsinin uygulaması istenmedi. Güncel kanıt
[görev tablosunda](gorev-durumu.md) ve
[kayıt sözleşmesinde](mimari/ogrenme-kayit-guvenilirligi.md).

Son kodda 12 backend, 9 kuyruk, masaüstü/mobil 10 kayıt kabulü ve tam
10 bölümlük temel-kavramlar ders/ustalık akışı geçti. Yerel izleyici yeni sürümü
sundu; kaynak/paket parmak izi aynı, çalışan sayfa denetimi hatasız.
Referans DB karşılaştırması: 95 öğrenme olayı ve 402 pratik kaydının tam satır
hash'leri aynı; 7 hesap ve 83.481 soru korunuyor. Kanıtlar
veri/ui-denetim/kayit-guvenilirligi/db-baseline.json ve db-after.json.
V90 yalnız teknik işaret tablosu eklemişti; V91 bu kullanılmayan tabloyu kaldırdı.
Öğrenci verisi silinmedi; eski tarih filtresi yok. Plan/commit öncesi kontroller geçti.

TAS-01'de kalan somut iş yok. Sıradaki görev kullanıcı tarafından seçilir;
yeni görevde ilk komut `git status --short`, ardından yalnız ilgili görev satırı.
TAS-02 sağlık ve izleme temeli kodlandı: Actuator liveness/readiness + DB,
öğrenme/pratik yazma metrikleri, dış webhook alarm/iyileşme betiği. Geçici DB'de
12 ilgili backend testi, dış betikte 4 test geçti; yerel sunulan sağlık uçları
200/UP, kapalı uçlar anonim isteğe 401 döndü. Gerçek öğrenci DB'si değiştirilmedi.
Gerçek dış alarmın etkinliği henüz kanıtlanmadı. Sonraki somut adım: ayrı bir
izleyici makinesinde HTTPS site adresi ve webhook ile
`scripts/dis-saglik-izle.py` betiğini her dakika çalıştırıp test ortamı
kesintisi/iyileşmesinde gelen bildirimi doğrulamak. Kurulum tarifi
[sağlık ve izleme](islemler/saglik-ve-izleme.md) dosyasında.

TAS-03 / 12.07 tamamlandı: öğrenme ekranlarında ders/ünite/konu adı ve rozet DB
kataloğundan kimlikle okunuyor; bölüm sınav kapsamı (`@bolum … AYT`) destekleniyor ama
henüz hiçbir bölüm işaretlenmedi (kaynak kanıtlı işaretleme TAS-08). Kanıt görev tablosunda.

TAS-04 / 12.08 tamamlandı: ders içi soru ve not alıştırması sunucu cevap anahtarıyla
puanlanıyor; Konu takibi banka/pratik/deneme, açık pratik, ders alıştırması ve kart
tekrarını tek sözleşmeyle ayrı sütunlarda sayıyor. Eski DB kayıtları yeniden
puanlanmadı. `.ders` veya `kaynakli-notlar.json` cevabı değişirse
`node scripts/cevap-anahtari.mjs` aynı commit'te çalıştırılmalı. Bu kapsamda açık iş
yok.

TAS-05 / 12.09 tamamlandı: konu testi, çıkmış sorular ve tip alıştırması yeni sekmede
sunucuda kurulan ortak PRATIK oturumunu açar (`POST /api/konu-ogrenme/practice-sets`,
V93); sayılar gerçek setle aynı (12 / 52), görsel baytı aynı kitapçık kopyaları bir sette
bulunmaz (`scripts/ortak-set-tani.mjs --yaz` banka değişince çalıştırılır). Ortak
ekrandaki cevaplar `GET /api/konu-ogrenme`'de motor olayı olarak okunur. Bu kapsamda
açık iş yok.

TAS-06 / 12.10 tamamlandı: kişisel zorluk etiketi (mevcut `feedback.difficulty_vote`) ve tekrar
tercihi (V94 `student_question_preferences`) yalnız öğrenciye aittir; gizlenen sorular otomatik
pratik havuzundan, motor setlerinden ve öneri örneğinden çıkar, bekleyen “tekrar göster” öne
alınır; Soru Çöz & Pratik'te kişisel süzgeçler ve sıfırlama vardır. Cevap geçmişi, denemeler ve
sabit kitapçık değişmez. Bu kapsamda açık iş yok.

TAS-07 / 12.11 tamamlandı: `pdf_kanit_paketi.py` sürümlü PDF kanıtını oluşturur;
`pdf_kanit_pilot.py` sabit 10 matematik kaynağının 52 sayfasını iki geçişte ölçtü.
Altı kategori mevcut, 10/10 paket bütünlüğü geçti; ikinci geçişte yeni düzen,
kırpım ve OCR üretilmedi, model/dış çağrı yapılmadı. Gerçek PDF'lerde görülen
sayfa dışına taşan bbox ve yinelenen kimlik düzeltildi; eski paketlerin etkilenen
sayfaları onarıldı. `veri/pdf-kanit/pilot-matematik/rapor.json` yeniden üretilebilir
rapordur; özgün `Kaynaklar/` ve öğrenci DB'si değişmedi. Birim testleri ve plan/
kontrol sonucu görev tablosunda. TAS-07'de açık iş yok; sonraki somut içerik adımı
TAS-08'de seçilmiş ana kaynak için iddia → blok/sayfa kanıt paketi oluşturmak.
Ek denetimde 16 paketteki 179 eski sürüm sayfası yenilendi: bütünlük 16/16,
eski sürüm 0. Bir matematik tablosu sayfası `OCR_UNREADABLE` kalır; özgün
kırpım korunur ve ilgili konu seçilirse TAS-08'de görselden incelenir.
Sıradaki komut: `git status --short`, ardından TAS-08 görev satırı ve §10.

Push istenmedi. Diğer açık içerik işi [12.02](plan/12-icerik-ve-yayin.md) kapsamında
kalır; kayıt görevi için dersleri veya soru bankasını baştan üretme.
