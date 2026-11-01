# İvme devir notu

Önce `git status --short`, [AGENTS.md](../AGENTS.md) ve yalnız ilgili açık görev okunur.
Referans günü 31 Ekim 2026: mevcut DB kayıtları korunur; geçmiş kaydedilmemiş
olay/kuyruk/loglar yeniden oynatılmaz. Özgün kaynak arşivi yalnız okunur.

## Şimdi

| Görev | Durum ve sıradaki somut adım |
|---|---|
| TAS-11 / 12.15 | Teknik pilot tamamlandı: kullanıcının Mert Hoca listesinden iki tek–çift videosu, 2194 segment, altı kare, iki matematik kontrolü yapılmış ipucu ve ders değişiklik önerisi. Öğretmen iki ipucunu incelemeli. [Tarif](islemler/video-kanit-hatti.md). |
| TAS-10 / 12.14 | Uygulandı; 17/17 backend testi, masaüstü/mobil bildirim UI testi ve yerel sunulan sürüm doğrulandı. Brevo seçildi; gerçek gönderim için doğrulanmış gönderen ve Git dışı API anahtarı bekleniyor. [Kurulum](islemler/kayit-bildirimleri.md). |
| TAS-09 / 12.13 | Tamamlandı: içerik hattı, bölme pilotu taşındı, EBOB–EKOK ikinci konu hattan geçti. Açık: iki konunun öğretmen incelemesi (insan girdisi). |
| TAS-08 / 12.12 | Kaynaklı pilotun otomatik kabulü geçti; öğretmen sekiz bölüm/dört soru inceleme kararını kaydetmeli, ardından gerçek öğrenciyle bağımsız aktarım gözlemi yapılmalı. Kabul biçimi [pilot kaydında](icerik/tas08-pilot-kabul.md#kalan-kabul). |
| TAS-02 / 12.06 | Dış makinede webhook/zamanlayıcı kurulumu ve gerçek kesinti/iyileşme bildirimi açık; [işletim tarifi](islemler/saglik-ve-izleme.md). |

## TAS-11 devam noktası

Tamamlanan: `scripts/video_hatti.py`, `ivme.py video`; görev/ipucu girdileri ve
küçük kanıt manifesti `video-hatti/` altında. İki video ve ham JSON3, sürümlü
paket/kare/öneriler `veri/video-hatti/` içinde Git dışında. Edinim için
`video-hatti/requirements.txt` (yt-dlp 2026.10.26) ve Node kullanıldı; eski sistem
yt-dlp değiştirilmedi. İlk playlist yanıtındaki 100 video tam liste sayılmadı.

Doğrulama: 14 hat, 4 erişim/playlist ve 3 matematik testi; iki videoda 2194 segment,
altı kare ve iki ipucu. İkinci çalıştırma beş aşamayı kullandı; sıfır ağ, decode,
ASR/model; yeniden edinim sıfır süreç. İpuçları `PENDING`, matematik
`SCRIPT_CHECKED`; öğretmen/öğrenci kabulü uydurulmadı. UI veya sunucu kodu değişmedi.

Kalan somut iş: öğretmen `video-hatti/ipuclari/mert-hoca-tek-cift.json` içindeki
iki ipucunu kaynak kareleriyle incelesin; uygun olanı TAS-09 üzerinden sürümlü ders
değişikliği olarak ele al. Agent'ın matematik/görsel kontrolü öğretmen kararı değildir.
Kaynak ve kod değişmediyse yeniden indirme/çıkarım yapma.

Sıradaki komut: `python scripts/ivme.py video durum mert-hoca-tek-cift`; ardından
`veri/video-hatti/mert-hoca-tek-cift/inceleme.md` ve manifestteki `.oneriler.md`
dosyasını aç. İçerik girdisi değişirse `video calistir`, ardından `video paket`
ile kanıtı güncelle. Push/dış yayın istenmedi.

## TAS-10 devam noktası

Tamamlanan: kayıtla atomik V95 outbox, Brevo HTTP göndericisi, kalıcı lease/retry,
yönetimde bildirim sayıları/ayrıntı/yeniden deneme ve gizli anahtar girişli yerel
kurulum betiği. Mevcut hesaplardan bildirim üretilmedi; gerçek DB outbox boş.
Alıcı `nkorganci@gmail.com`, Git dışı `.codex/local-environment.json` içinde.
Doğrulanmış gönderen ve Brevo API anahtarı henüz yok; gerçek e-posta gönderilmedi.

Doğrulama: 17/17 backend testi (atomiklik/rollback, eşzamanlı claim, lease devralma,
retry sınırı, sahte sağlayıcı ve rol/CSRF); masaüstü/mobil beş bildirim durumu ve
başarısız işi tekrar deneme geçti (`veri/ui-denetim/kayit-bildirimi.json`).
İzleyici derledi; V95 uygulandı, Windows PowerShell ile kaynak/paket parmak izi ve
HTTP/yerel sürüm eşleşti. Genel yönetim sayfasının eski
`/api/preferences/sidebar-rail` 403 sorunu kapsam dışında; UI raporunda ayrı gösterilir.

Kalan tek somut iş: Brevo'da göndereni doğrula, API anahtarını yerelde gir ve yeni
kayıttan doğru alıcı kutusuna ulaşma kabulünü yap. Sıradaki komut (göndereni değiştir):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/kayit-bildirimi-ayarla.ps1 -Recipient "nkorganci@gmail.com" -Sender "dogrulanmis@example.com" -ManagementUrl "https://net.ivme.dev/yonetim"
.\yeniden-baslat.ps1
```

Tarif: [kayıt bildirimleri](islemler/kayit-bildirimleri.md). Eski hesapları ve olayları
tekrar oynatma; gerçek alıcı kabulü olmadan TAS-10'u tamamlandıya çevirme.

## TAS-09 devam noktası

Tamamlanan kapsam ve kanıt [görev tablosunda](gorev-durumu.md) ve [içerik hattı tarifinde](islemler/icerik-hatti.md).
İki konu `REVIEW_REQUIRED`: `python scripts/ivme.py icerik durum`. Öğretmen kararı yalnız insan tarafından
`icerik karar` ile girilir; sonra `icerik calistir <kavram>` kanıtı yeniler. Yeni konu: görev tanımını kopyala ve
tarifteki “Yeni konu” adımlarını izle. Kapsam dışı bulgu: mobilde açık karalama paneli çözümü örtüyor ve
formüller panelin içinden görünüyor (`veri/ui-denetim/konu-ogrenme/mobil-pilot-*.png`); ayrı UI işi.

## TAS-08 devam noktası

Tamamlanan kapsam: sekiz bölüm/11 kaynak iddiası, tam MEB kitap paketi; iki rehberli
ve iki bağımsız sorunun kaynaklı çözümü. Ortak PRATIK ekranında çözüm cevaptan sonra
açılır. Çözüm başlığındaki yıl alanı düzeltildi. Sahte API'nin eksik alanları ve
kayıt onayı beklenmeden tıklayan UI testi düzeltildi. Pilot girdi değişiklikleri
commit öncesi otomatik denetlenir.

Doğrulama: kaynak/hash kontrolü ve 20 Node testi; masaüstü/mobil sekiz bölümün
kaynakları, üç anlatım düzeyi ve sorgulamaları; iki açıklamalı soru; temel kavramlarda
12 test/52 çıkmış soru akışı geçti. Ekranlar `veri/ui-denetim/konu-ogrenme/` altında.
Tam ders akışı da masaüstü/mobil geçti: sekiz bölüm, 28 ders olayı, altı ustalık sorusu.
Yerel izleyici yeni sürümü sundu; Windows PowerShell ile kaynak/paket parmak izi
ve HTTP/yerel sürüm eşleşti. Giriş sonrası canlı konu/soru sayfaları hatasız.
`ivme.py plan`, staged 11 dosyada `ivme.py kontrol` ve `git diff --cached --check` geçti.
Testler sahte API kullanır; gerçek öğrenci cevapları veya geçmiş DB olayları yazılmadı.

Açık karar: öğretmen ve öğrenci gözlemi olmadan `teacherApproved` ve
`studentTransferObserved` değiştirilmez; TAS-08 tamamlandı sayılmaz. İki aktarım
sorusu yalnız rakam koşullarını ölçer; bütün konuya ustalık kanıtı değildir.

Sıradaki komut: `git status --short`; sonra `docs/icerik/tas08-pilot-kabul.md`
içindeki kalan kabul ölçütlerini kullan. Kaynak değişmediyse arşivi ve bankayı
baştan üretme. İçerik değişirse `python scripts/ivme.py icerik calistir bolme-bolunebilme`
ile kanıtı, ilgili UI/Node kontrolüyle davranışı doğrula.

Yerel `main` commit'i yapılır; push istenmedi. Diğer açık işler
[görev tablosu](gorev-durumu.md) ve [yol haritasında](plan/README.md).
