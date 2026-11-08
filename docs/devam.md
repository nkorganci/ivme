# İvme devir notu

Önce `git status --short`, [AGENTS.md](../AGENTS.md) ve yalnız ilgili açık görev okunur.
Referans günü 31 Ekim 2026: mevcut DB kayıtları korunur; geçmiş kaydedilmemiş
olay/kuyruk/loglar yeniden oynatılmaz. Özgün kaynak arşivi yalnız okunur.

## Şimdi

| Görev | Durum ve sıradaki somut adım |
|---|---|
| YKS-07.full / YKS-08.full | **DEVAM EDİYOR; tüm zincir yetkili.** Run `20261107t212333-f17dbdba`; YKS-00–06 BITTI, 07–10 pilot VERIFIED. Tam anahtar: **259 belge / 4.846 cevap** güncel PDF/ham bağımsız okumadan doğrulandı. İlk 4.667 + ayrı yerleşim onarımı 150 + ortak şekil desteği 29 sorunun teknik kaynak görselleri ve tüm 80.230 YKS bankasıyla karşılaştırması hazır; geçerli çıktıları yeniden üretme. Üç `full-question-*-comparison/controlled-repeat-review.json` toplamı **2.910 mevcut metin/cevap/kapsam adayı; 1.863 içerik/görsel incelemesi; 73 fark**. 68 fark genel Matematik başlığı ile kontrollü Geometri branşıdır; otomatik yeniden etiketleme yok. Beş gerçek okunmuş görsel çiftinde eski/yeni basılı anahtar farklı: TYT Biyoloji05/19 D→A, AYT Biyoloji17/12 E→D, Fizik09/05 A→C, Edebiyat09/20 E→A; eski Fizik13/27 C→yeni13/30 E. `yks_cevap_nusha_incele.py` eski basılı numarayı özgün kayıttan alır; banka/geçmiş değişmez, otomatik tekrar birleştirme yok. **Şimdi:** `yks_tam_deneme_anahtar.py --visual` 46 Denemeler PDF’sinde çalışıyor; aynı işi ikinci süreçle başlatma, `pdf-on-tarama/full-mock-keys/progress.json` imlecini oku. `yks_govde_istisna_incele.py` altı belgede 94 gövdeyi hazırladı, anahtar kabulü açık. `yks_tam_kapsam.py` 4.086 PDF/67.277 sayfanın bütün kalan işini `full-source-coverage/` JSONL/CSV dizinine çıkardı; denemeler bittiğinde kapsamı yenile. `yks_mevcut_aktarim_kontrol.py` önceden tamamlanmış 217 kaynağı kontrol etti: 190 belge/10.662 bağlantı güncel ID/sürüm/basılı ve resmî API cevabı/gerçek görsel hash’i ile doğrulandı; 27 belge incelemede. Geçerli eski aktarımı tekrar üretme. Sonra 77 tarama istisnası, diğer PDF düzenleri ve dar konu/görsel/tekrar kabulü. Kalite 07/08/09/10: 52/28/14/18 PASS (112 otomatik test); gerçek geçici DB dört senaryo PASS kanıtı yeniden doğrulandı, değişmeyen prova tekrarlanmadı. Canlı banka/yayın aynı; tam 07–10 BITTI değil. Kullanıcının dört derin dosyasını koru. |
| PHYS-INTERACTIVE-02 / 12.02 | **Yeni laboratuvar teknik olarak hazır, kullanıcı değerlendirmesi bekleniyor.** Sekiz deney İnteraktif Öğrenme `MotionLab` motorunda; hazır durumlar, senkron grafikler, oynatma/adım/hız, sürükleme/klavye, kutu/patenci/tren ve anlık kuvvet/rejim paneli var. Node 20/20, yalıtılmış ve canlı masaüstü/mobil UI geçti; izleyici başarılı, 1010 `index-6F9UL8ET.js`. Sıradaki iş kullanıcıyla görünümü değerlendirmek; başka konuyu başlatma. Kabul: `python scripts/ivme.py kalite calistir PHYS-PILOT-01`; [pilot sözleşmesi](icerik/fizik-hareket-kuvvet-pilot.md#etkileşimli-deneylerin-ikinci-tasarımı). |
| PHYS-PILOT-01 / 12.02 | **Teknik pilot hazır; kullanıcı denemesi bekleniyor.** `/konuyu-ogrenelim/fizik/hareket-kuvvet`, haritada aynı TYT katalog kimliğinden açılır. 8 bölüm/24 düzey/16 örnek/6 aktarım; 9 kaynak sayfası. Ham yerel model metni yerine açık kaynak düzeltmesi `physics/hareket-kuvvet.editorial.json` ve `scripts/fizik-pilot-ollama.py --curate` ile paketlendi. Node 10/10, yalıtılmış ve canlı masaüstü/mobil UI geçti; 1010 `index-7tia0ppd.js`. Kabul komutu: `python scripts/ivme.py kalite calistir PHYS-PILOT-01`; [sınırlar ve devam](icerik/fizik-hareket-kuvvet-pilot.md). Kullanıcı değerlendirmeden diğer konulara geçme. Başlangıçtaki `derin/sayma-permutasyon*`, `derin/index.js`, `derin/cizimler.jsx` kullanıcı çalışmasıdır, bu commit'e dahil edilmez. |
| MAT-TYT / 12.02 | **Etkin iş (kullanıcı kararı 2026-11-02): önce TYT konu içerikleri, lablar en son.** Takip: [matematik konu listesi](icerik/matematik-konu-listesi.md); TYT 29/32 bitti (son: `ikinci-derece-denklemler`); sıradaki konu `sayma-permutasyon` — `node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` ilk 🟡 TYT satırını söyler. 4 bölümlük dersler önceki örneklerdeki gibi derinleştirilir: 8 bölüm (eski kimlikler korunur, yeni `s1b`…), her bölümde `::duzey` ve `::sorgula`, ≥20 gerekçeli örnek, 3 `::tamamla`, `derin/<ders>.js` + `-cizim.jsx` ile 4 keşif ve `DERIN` listesi, ≥3 görseli okunmuş çıkmış (`WORKED_EXAMS`) + özgün benzer soru, `pdfAnlatim` sayfaları okunup `pdfOkundu`’ya yazılır, iki kaynaklı video protipi (`scripts/video-altyazi.py puf/kare/alinti`, `python scripts/video-protip-ekle.py <tanım>`). Problem kategorisinin (TYT-0648–0747) görsel sınıflaması `veri/gecici/lab/problemler.md`’de (Git dışı); derste çözülen soru lab gerçek soru setinden çıkarılır, ilgili `testler/lab-<konu>.test.mjs` geçmeli. |
| MAT-LAB-02 / 12.02 | **Beklemede (TYT içerikleri bitince).** Ortak lab motoru hazır ([standart §Ortak lab motoru](icerik/matematik-laboratuvari.md#ortak-lab-motoru-mat-lab-02)); TYT 16/32 TEKNİK HAZIR: `temel-kavramlar` … `kar-zarar` (konu listesindeki ilk 16 TYT satırı). Kalan ilk lab `hareket-problemleri`; yöntem lab standardında, kanıt `testler/kanit/lab/`. Kontrol: `python scripts/ivme.py kalite calistir MAT-LAB-02`. |
| MAT-LAB-01 / 12.02 | Tek–çift pilotu teknik olarak hazır; artık Temel Kavramlar labının ilk hedefi (`/konuyu-ogrenelim/laboratuvar/temel-kavramlar`), tamamlanınca görseli okunmuş dört tek–çift ÖSYM sorusuna geçer. Öğretmen/öğrenci aktarım gözlemi ayrıdır. Kanıt: `python scripts/ivme.py kalite durum MAT-LAB-01`. |
| TAS-11 / 12.15 | Teknik pilot ve protip UI: iki ipucu Temel Kavramlar konu sayfasında ve `s2`/`s2b` bölümlerinde “Öğretmen kontrolü bekliyor” etiketiyle kullanılır. Kullanıcı bu görünürlüğü istedi; öğretmen incelemesi engel değildir. Uzun vadeli hedef tüm uygun video/konu içerikleridir; yaygınlaştırma [12.15'te](plan/12-icerik-ve-yayin.md#1215--tas-11-video-kanıt-ve-ipucu-pilotu). |
| TAS-10 / 12.14 | Uygulandı; 17/17 backend testi, masaüstü/mobil bildirim UI testi ve yerel sunulan sürüm doğrulandı. Brevo seçildi; gerçek gönderim için doğrulanmış gönderen ve Git dışı API anahtarı bekleniyor. [Kurulum](islemler/kayit-bildirimleri.md). |
| TAS-09 / 12.13 | Tamamlandı: içerik hattı, bölme pilotu taşındı, EBOB–EKOK ikinci konu hattan geçti. Açık: iki konunun öğretmen incelemesi (insan girdisi). |
| TAS-08 / 12.12 | Kaynaklı pilotun otomatik kabulü geçti; öğretmen sekiz bölüm/dört soru inceleme kararını kaydetmeli, ardından gerçek öğrenciyle bağımsız aktarım gözlemi yapılmalı. Kabul biçimi [pilot kaydında](icerik/tas08-pilot-kabul.md#kalan-kabul). |
| TAS-02 / 12.06 | Dış makinede webhook/zamanlayıcı kurulumu ve gerçek kesinti/iyileşme bildirimi açık; [işletim tarifi](islemler/saglik-ve-izleme.md). |

## Son kapanan iş: YD-01–05

Yurt dışı soruları, Dersler'in üç bölümü ve istatistikler, yıl/kitapçık/oturum
seçimi, MEB oranlı deneme/pratik ve ortak soru ekranı tamamlandı. 28 kitapçık,
2.554 etkin soru, 6 iptal; iki PDF okumasıyla cevap/seçenek farkı sıfır. 36 cevap
eşlemesi ve 100 sorunun beş seçeneği düzeltildi; kaynaklar ve öğrenci kayıtları korundu.
Tekrar işlem [tarifindedir](islemler/yurt-disi-sorular.md). Python 3/3, Node 17/17,
geçici DB arşiv/pratik 21/21, puanlama 4/4 ve son kişisel tercih regresyonu
14/14; UI 24 kabul geçti.
`veri/yurt-disi/` ve `veri/ui-denetim/yurt-disi/` raporları kanıttır.
Bu kapsamda açık iş yok. Yeni istekte ilk komut `git status --short`.

## Önceki kapanan iş: DENEME-02

TYT ve AYT net hücrelerinde sayısal değeri eşit kalan `3` → `3,` gibi ara
girişler artık metni eski değere döndürmez. Yeni deneme ekleyip `3,25` ve
negatif net yazma, odak, kayıt ve yenileme masaüstü/mobil tarayıcıda geçti;
önceki sürümde aynı test `3,` yerine `3` okuyarak hatayı doğruladı.
Node deneme testleri 15/15 geçti. Raporlar `veri/ui-denetim/deneme-tablolari/`:
`rapor.json`, `virgul-surum.json`. İzleyici derledi; Windows PowerShell 5.1
kaynak/paket parmak izi, HTTP sürümü ve servis edilen assetler eşleşti.
Gerçek öğrenci DB'sine test kaydı yazılmadı; bu kapsamda kalan iş yok.
Sıradaki komut: `git status --short`; yeni hata/girdi yoksa testleri tekrarlama.

## Önceki kapanan iş: ADMIN-01

Yönetim tablosundaki **Hesabına gir**, seçilen etkin/onaylı öğrencinin gerçek
principal ve yetkileriyle oturumu açar. Yöneticiye dönüş, hesap bandı (sınav
ekranı dahil), denetim izi ve eski sekmeden yanlış hesaba yazma koruması eklendi.
Mevcut öğrenci verilerine müdahale edilmedi; yeni göç yok.

Geçici DB'de `StudentImpersonationTest,AuthTest,SecurityHardeningTest` 28/28 PASS.
`node testler/admin-student-account-ui.mjs --live`: API bellekte masaüstü/mobil
iki öğrenciye geçiş, program yazma, yenileme, hesap/sınav yolunda bant ve dönüş,
başarısız geçiş/dönüşten kurtarma geçti. Rapor ve ekran görüntüleri:
`veri/ui-denetim/admin-ogrenci/`. Gerçek öğrenci DB'sine test kaydı yazılmadı.
İzleyici son paketi sundu; Windows PowerShell kaynak/paket parmak izi ve
HTTP/yerel sürüm + asset eşleşti (`surum.json`); plan ve commit kontrolü geçti.

Bu kapsamda kalan iş yok. Yeni talepte ilk komut `git status --short`;
geçerli testleri yalnız ilgili kod/girdi değiştiğinde yeniden çalıştır.
Sözleşme: [yönetici öğrenci oturumu](sozlesmeler/api.md#yönetici-adına-öğrenci-oturumu).

## TAS-12 devam noktası

Teknik temel tamamlandı: `ivme.py kalite plan|calistir|durum TAS-XX`, on iki görev
profili, kaynak/komut/log hash'li kanıt, kesintide rapor, XML tabanlı backend sonucu
ve pre-commit regresyonları. [Tarif](islemler/test-ve-devir.md),
[sürümlü kanıt](../testler/kanit/tas12.json). 26/26 araç testi ve geçici `ivme_test`
üzerinde TopicAnswerContractTest 2/2 geçti; olmayan sınıf sıfır test/çıkış 1 ile
reddedildi. Gerçek öğrenci DB'sine test yazılmadı; uygulama kodu değişmedi.

Bu teknik kapsamda kalan iş yok. Sıradaki kontrol:
`python scripts/ivme.py kalite durum TAS-12`. Yeni işte ilgili TAS profilini seç;
geçerli kanıtı sebepsiz tekrarlama. Diğer görevlerin dış ortam/insan kabulleri
yukarıdaki tablodadır; bu test geçişi onları kapatmaz. Yerel main commit'i yapılır.

## TAS-11 devam noktası

Tamamlanan: `scripts/video_hatti.py`, `ivme.py video`; görev/ipucu girdileri ve
küçük kanıt manifesti `video-hatti/` altında. İki video ve ham JSON3, sürümlü
paket/kare/öneriler `veri/video-hatti/` içinde Git dışında. Edinim için
`video-hatti/requirements.txt` (yt-dlp 2026.10.26) ve Node kullanıldı; eski sistem
yt-dlp değiştirilmedi. İlk playlist yanıtındaki 100 video tam liste sayılmadı.

Doğrulama: 14 hat, 4 erişim/playlist ve 3 matematik testi; iki videoda 2194 segment,
altı kare ve iki ipucu. İkinci çalıştırma beş aşamayı kullandı; sıfır ağ, decode,
ASR/model; yeniden edinim sıfır süreç. İpuçları `PENDING`, matematik
`SCRIPT_CHECKED`; öğretmen/öğrenci kabulü uydurulmadı. Ek protip UI kabulü:
masaüstü/mobil konu ve ilgili iki ders bölümü; etiket, koşul, açılır açıklama,
zamanlı video bağlantıları, ilgisiz konu/bölümde gizleme, taşma ve hatasız açılış.
Rapor `veri/ui-denetim/konu-ogrenme/protip-rapor.json`; gerçek öğrenci DB'sine yazılmaz.
İzleyici son sürümü sundu; canlı öğrenci görünümü masaüstü/mobil hatasız
(`protip-canli.json`). Windows PowerShell kaynak/paket parmak izi ve HTTP/yerel
sürüm eşleşti (`protip-surum.json`); build ve commit kontrolü geçti.

Ürün kararı: kullanıcı mevcut ipuçlarını **şimdi protip olarak** kullanmak ve
uzun vadede yöntemi bütün uygun video/konulara uygulamak istiyor. Öğretmen kontrolü
etiketi görünür; inceleme protipi gizleme gerekçesi değildir. Öğretmen onayı ayrı
insan kararıdır. Kalan yaygınlaştırma kapsamı 12.15'te; ilk 100 satırın dışındaki
liste kapsamı ve konu grupları aşamalı tamamlanır. Kaynak değişmediyse yeniden çıkarma.

UI: `http://localhost:1010/konuyu-ogrenelim/konu/temel-kavramlar#video-protips`.
`video-hatti/protips.json` hedef konu/bölüm ve başlıkları tanımlar; `video protips`
kanıttan öğrenci izdüşümünü üretir, `video protips --kontrol` güncelliğini denetler.
Sıradaki komut: `python scripts/ivme.py video protips --kontrol`. Yeni kaynak
işlenecekse 12.15 kapsamından bir konu grubu seç; mevcut kanıtı baştan üretme.
Ana ders değişikliği TAS-09'dan geçer. Push/dış yayın istenmedi.

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
