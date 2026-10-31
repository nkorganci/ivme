# Öğrenme kayıtlarının güvenilirliği

TAS-01 / 12.05, mevcut öğrenme olay günlüğünü ve bağımsız pratik kayıtlarını korur.
Öğrenci kayıtlarının kaynağı PostgreSQL'dir. Referans günü **2026-10-31**;
mevcut DB geçmişi aynen korunur, eksik eski kayıtlar tamamlanmaz.
Ara V90 yalnız teknik başlangıç tablosu ekledi; V91 bu kullanılmayan tabloyu kaldırır.
Öğrenme/cevap/hesap/diğer çalışma tablolarında silme veya geçmiş filtreleme yoktur.
Hazırlanan veri temizleme betiği çalıştırılmadan kaldırılmıştır.

## Kayıt ve onay sözleşmesi

- İstemci olay kimliğini ve bütün istek gövdesini ilk gönderimde sabitler. Yeniden
  deneme ve sayfa yenileme aynı kimlik/gövdeyi kullanır; yeni çözüm yeni kimlik alır.
- Güncel istemci öğrenme okuma/yazma isteklerinde `expectedUserId` gönderir.
  Controller bunu oturumdaki kullanıcıyla karşılaştırır; farklıysa 409 döner.
  Yetki kaynağı daima oturumdur. Alan eski istemcilerle uyumluluk için opsiyoneldir.
- `LearnService`, olay/pratik durumunu okumadan önce `users` satırını kilitler.
  `AttemptService` de aynı kilidi kullanır. Aynı kullanıcının eşzamanlı cevapları
  sırayla işlenir; cevap, etiket anlık kayıtları ve öğrenme olayı aynı transaction'dadır.
- Aynı kullanıcı/olay kimliğinin tekrarı özgün kaydı ve `seq` değerini döndürür.
  İstek gövdesi değişirse 409 oluşur. Sunucunun eklediği sonuç alanları karşılaştırma
  dışıdır; banka şıkkı ve JSON sayıları normalize edilir, zaman/bağlam korunur.
- `/events` toplu isteği atomiktir. Bir geçersiz olay bütün o isteği geri alır.
  İstemci 400/404/409/413/422 durumunda grubu bölerek hatalı olayı ayırır; geçerli
  olayları gönderir, reddedileni kimliği/nedeniyle korur. Otomatik döngü reddedileni
  atlar; **Şimdi dene** özgün gövdeyle yeniden dener. Başarısız kayıt sessiz silinmez.
- İstemci yalnız gönderdiği kimliklerden, pozitif `seq` ile onaylananları kuyruktan
  çıkarır. Eksik onay, 401, kesinti ve 5xx kalan kuyruğu korur.

## Tarayıcı ve ekran davranışı

`LearnOutbox`, `ivme:konu-ogrenme:giden:<userId>:v3:<eventId>` anahtarıyla her olayı
ayrı saklar. Sekmeler ortak bir dizi üzerine yazmaz. Eski v1/v2 bekleyenler bu kullanıcının tarayıcısı yeni sürümü açınca silinir ve
sunucuya gönderilmez. Eski pratik seti taslakları da atılır. Yeni v3 olaylarda 500
sınırı yoktur; bozuk JSON korunur ve görünür hata olur. Başka cihazın tarayıcı
belleğine uzaktan erişilmez; temizlik o cihazda yeni sürüm açıldığında gerçekleşir. Gönderimler 50 olaylık
parçalardır; banka cevapları kendi puanlama uç noktasından geçer. Yeniden deneme
bağlantı dönüşünde, 30 saniyelik döngüde veya kullanıcı isteğiyle yapılır.

Kota/izin hatasında olay bellekte kalır ve uyarı görünür. Bellek kullanıcıya göre
ayrıldığı için uygulama içi gezinme ve hesap değişimi taslağı düşürmez. Bekleyen kayıt
varken tarayıcıdan ayrılmada uyarı istenir. **Depolama kullanılamıyorsa tarayıcının zorla
kapatılmasına karşı kalıcılık garantisi yoktur**; bu durum sunucu kaydı gibi sunulmaz.

İlerleme/ustalık/günlük sayaçlar yalnız sunucunun onayladığı olaylardan türetilir.
Bekleyen kayıt sayısı ve hata görünürdür; kayıt sonuçlanana kadar çalışma düğmeleri
kilitlenir, yeniden deneme düğmesi açık kalır. Ders/bölüm/set tamamlama ekranı onay
bekler. Ders sorusunun yerel doğru/yanlış geri bildirimi kalıcı kayıt anlamına gelmez.
Banka sonucu kayıp yanıttan sonra yeniden okunabilir; onay gelince soru devam eder.

Hesap değişiminde provider kullanıcı anahtarıyla yeniden kurulur. Önceki isteklerin
gecikmiş sonuçları yeni ekranı değiştirmez. Pratik seti anahtarı kullanıcı, tür,
konu, sınav, gün ve soru tipini içerir; tip değişimi yeni ekran durumu açar.
Sunucudaki cevaplar cihazlar arasında okunur; pratik setinin kendisini cihazlar
arasında sürdürmek TAS-05 kapsamındadır.

## Bağımsız pratik ve pedagojik olay

Öğrenme ekranı aynı sorunun başka ekrandaki yarım bağımsız pratik turunu `SKIP` ile
kapatmaz: 409 verir, öğrenci o turu tamamladıktan sonra bekleyen cevabı tekrar yollar.
Yanlış banka cevabı, mevcut tek cevaplı öğrenme akışında doğru şıkkı döndürdüğü için
`REVEAL` ile turu tamamlar. Bu, çözüm görselinin açıldığına dair bir kanıt değildir.
Ders içi soruların sunucuda puanlanması ve ortak konu sayımı TAS-04'te kalır.

## Doğrulama kanıtı

| Komut / çıktı | Kanıt |
|---|---|
| `node --test testler/konu-ogrenme-kayit.test.mjs` | 9 test: 650 olay, kayıp yanıt, atomik 400 ayrıştırma, eksik onay, kapalı depolama, iki sekmenin ortak depoya yarışan yazımı, hesap izolasyonu/geç yanıt, banka retry, eski kuyruk atma/yeni bozuk JSON koruma |
| `python scripts/ivme.py test LearnFlowTest,LearnReliabilityTest,AttemptTest` | Geçici `ivme_test` üzerinde 12 test: mevcut eski DB kaydının korunması ve görünürlüğü, eşzamanlı aynı cevap/olay, farklı gövde, geri okuma, hesap sahipliği, pratik turu, olay insert hatasında rollback ve DB bağlantısı kaybından kurtarma |
| `node testler/konu-ogrenme-kayit-ui.mjs` | Masaüstü/mobil 10 kabul: eski kuyruğun gönderilmeden atılması/DB geçmişinin kalması, onay öncesi kilit/bildirim, commit sonrası kayıp banka yanıtı ve reload, kota + uygulama içi gezinme, aynı sekmede hesap geçişi |
| `node testler/konu-ogrenme-ui.mjs temel-kavramlar` | Masaüstü/mobil 10 bölüm, ön/son test, ders tamamlama, 6 soruluk ustalık, takip/ayarlar; taşma, konsol/istek hatası yok |
| `npm run build`; son değişiklikler için `npx vite build` | Üretim ön yüz paketi oluştu; mevcut büyük parça uyarıları sürüyor |

Backend raporları `backend/target-tests/surefire-reports/`, tarayıcı raporları
`veri/ui-denetim/kayit-guvenilirligi/report.json` ve
`veri/ui-denetim/konu-ogrenme/` altındadır. Test kaynakları bu değişiklikle sürümlenir.
UI testleri sahte API kullanır; gerçek öğrenci DB'sine cevap yazmaz. DB kesintisi
geçici test DB'sindeki transaction bağlantısını sonlandırarak uygulanır; öğrenci
PostgreSQL hizmeti kapatılmaz. Yeniden bağlantı, rollback, tekrar gönderim ve geri
okuma test edilir; bütün PostgreSQL hizmetinin stop/start işletim testi değildir.

İlk backend koşusu sayısal JSON tür eşitliği hatasını yakaladı; normalizasyon sonrası
son kapsamda 12 test geçti. Mevcut uçtan uca testin sabit gecikmeleri, yeni sunucu onayı kilidini
bekleyecek şekilde güncellendi; ardından tam ders akışı geçti.

Son yerel doğrulama: izleyicinin sunduğu paket parmak izi kaynakla eşleşti;
`python scripts/ivme.py sayfa /konuyu-ogrenelim` geçti. Referans ve sonuç DB
karşılaştırmasında 95 öğrenme olayı ile 402 pratik kaydının tam satır hash'leri aynı;
7 hesap, 83.481 soru ve profil sayısı da değişmedi. Yerel kanıtlar
`veri/ui-denetim/kayit-guvenilirligi/db-baseline.json` ve `db-after.json` içindedir.
`python scripts/ivme.py plan`, `python scripts/ivme.py kontrol` ve `git diff --check`
geçti. Öğrenci geçmişi silinmedi, yeniden üretilmedi veya gizlenmedi.
