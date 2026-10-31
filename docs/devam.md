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

Push istenmedi. Diğer açık içerik işi [12.02](plan/12-icerik-ve-yayin.md) kapsamında
kalır; kayıt görevi için dersleri veya soru bankasını baştan üretme.
