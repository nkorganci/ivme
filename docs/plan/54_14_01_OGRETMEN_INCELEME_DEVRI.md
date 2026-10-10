# 14.01 — Türkçe öğretmenine inceleme devri

**Durum:** PAKET HAZIR (öğretmen kararı bekleniyor) · **Tarih:** 2026-10-09 · **İlgili işler:** [14.01 altın örnek](51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md), [14.03 doğruluk ve ölçek](53_14_03_DOGRULUK_MALIYET_OLCEK.md).

## Öğretmene verilecek dosya

`D:\workspace\ivme\uygulama\veri\ogretmen-inceleme-tyt-turkce-200.zip` çevrimdışı pakettir. 200 kaynak WebP görseli, `index.html` inceleme ekranı ve `README.md` yönergesi içerir. Paket kimliği `259b6f61db0379cc`; kaynak soru kimlikleri, görsel SHA-256 özetleri ve taksonomi sürümünden hesaplanır. Paket üreten betik `scripts/ogretmen-inceleme-paketi.py` Git'te tutulur; ZIP yerel `veri/` klasöründedir ve Git'e eklenmez.

Öğretmen ZIP'i kendi bilgisayarında klasöre çıkartıp `index.html` dosyasını tarayıcıda açar. İnternet ve uygulama hesabı gerekmez. Önce görseldeki sorunun **ölçtüğü tipi** kendi bilgisiyle seçer; cevap şıkkını çözmek zorunda değildir. Onay için izinli tip ve soru kökünden kısa gerekçe yazar. Tip sınırı belirsizse **Belirsiz**, yedi tipin dışındaysa veya kaynak sorunluysa **Reddet** seçip nedenini yazar. AI ve kaynak konu önerileri ekranın kapalı bir bölümündedir; bağımsız karar sonrası açılabilir.

Paket 63 öncelikli soruyu önce, kalan 137 soruyu sonra gösterir. Altın küme ve 14.03 doğruluk ölçümü için **200 sorunun tamamı** incelenmelidir. Öğretmen her oturum sonunda **Kararları dosyaya indir** ile JSON karar dosyasını saklar; sonraki oturumda **Önceki karar dosyasını yükle** ile devam eder. Son JSON dosyasını kullanıcıya geri verir. `localhost` sayfasının adresi öğretmenin bilgisayarında çalışmaz; gönderilecek dosya bu ZIP'tir.

## Dönen kararın kabulü

Kullanıcı karar dosyasını çalışma alanına koyduğunda önce yazmadan denetlenir, sonra açıkça aktarılır:

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogretmen-inceleme-aktar.py D:\kararlar\tyt-turkce-ogretmen-kararlari.json
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogretmen-inceleme-aktar.py D:\kararlar\tyt-turkce-ogretmen-kararlari.json --apply
D:\workspace\ivme\.venv\Scripts\python.exe scripts\altin-ornek-kuyrugu.py --check
```

Aktarım paket kimliğini, soru kodunu, görsel özetini, izinli soru tipini, gerekçeyi, öğretmen kimliğini ve UTC zamanını denetler; mevcut insan kararı varsa onu varsayılan olarak korur. `--replace` ancak öğretmenin daha önceki kararını bilinçli düzelttiği durumda kullanılır. AI sütunları korunur. Kararlar aktarılınca 14.03'te AI önerileriyle öğretmen kararları sınıf bazında karşılaştırılır; uyuşmazlıklar ve çekimserler ayrı raporlanır. O zamana kadar 0/200 insan onayı bir eksiktir, AI notlarının silinmesi gerekmez.

## Diğer dersler

Her ders için önce o derse uygun izinli soru tipleri ve kaynağa bağlı bir örneklem hazırlanır. İlgili branş öğretmeni görselleri bağımsız inceler; Türkçe tip kodları başka derse kopyalanmaz. Kullanıcı fizik branşında uzman olduğu için fizik örneklerinin insan inceleyeni olabilir. Diğer derslerin altın etiketi ilgili branş öğretmeninden alınır. Aynı kaynak kimliği, görsel özeti, gerekçe, belirsizlik ve ayrı AI taslağı ilkeleri uygulanır.

**Doğrulama:** Paket 200 görsel ve iki metin dosyasıyla üretildi; çevrimdışı HTML gerçek Edge tarayıcısında açılıp soru görseli doğrulandı. `scripts/ogretmen-inceleme-smoke.py` geçici CSV'de kuru çalıştırma, iki kararın aktarımı, tekrar aktarımda değişiklik olmaması ve bozuk görsel özetinin reddini geçti. Gerçek 200 satırlık CSV'de insan onayı hâlâ 0/200'dür.
