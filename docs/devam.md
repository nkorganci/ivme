# İvme devir notu

**Güncel canlı kabul:** 8.802 soru; ana görev **SURUYOR**, bütün arşiv kabulü açık.

Önce `git status --short`, [AGENTS.md](../AGENTS.md) ve yalnız ilgili açık görev okunur.
Referans günü 31 Ekim 2026: mevcut DB kayıtları korunur; geçmiş kaydedilmemiş
olay/kuyruk/loglar yeniden oynatılmaz. Özgün kaynak arşivi yalnız okunur.

## Şimdi

**ÖNCE GÜNCEL PDF KURALI:** soru metni/görseli/embedding'i ile banka tekrarı
karşılaştırması YAPMA. Kullanıcı sayfa sayısı ve ilk sayfalar aynıysa PDF'yi
tekrar almamamızı istedi. Dosya kimliği hızlı ilk kapı; hash farklıysa ilk üç
sayfanın tam metin/boyut ve küçük özgün önizlemesiyle hızlı eşdeğerlik.
Mevcut Soru Çöz & Pratik'te kullanılan PDF'nin tamamını atla; kısmi aktarım
notu olsa da soru bazında eksik arama başlatma. YKS çıkmışlar kullanıcıya göre
zaten mevcut, tekrar alınmaz. Önceki “iki bankada aynı soru olabilir” izni yeni
işler için bu kuralın gerisindedir; eski kimlik/kayıt silme veya birleştirme yok.

**Kalıcı varsayılan:** `scripts/mebi-pratik2-pdf-policy.json`.
`mebi_pratik2_pdf_tekrar_kapisi.py`:1.473 PDF/510 eski banka PDF referansı;
61 eşleşen belge atlandı,1.412 eşleşmeyen belge yeni soru sayısı değildir.
`pdf-reuse-check/decisions.json` her PDF'nin kararı; kararsız PDF'den yeni iş
başlamaz. Kapı11 test PASS (farklı metadata/aynı önizleme, farklı şekil,
sayfa sayısı, matematik sembolü, boş kapak, kaynak atlanınca model açılmaması).
Aktif tekrarsızlık kontrolü yalnız belge düzeyinde; soru görüntüsü parmak izi
karşılaştırması da kapalıdır. Yeni PDF'deki cevap/kırpım doğrulaması korunur.

**Aktif iş MEBI-PRACTICE-2 tam kaynak kapsamı SURUYOR.** Kullanıcı tekrar
“devam et” beklemiyor. Alt parti/inceleme teslimi ana planın kapanışı değildir.
`veri/mebi-pratik-2/20261111-source-inventory` asıl kök; canlı kabul imleci
`archive-continuation-progress.json`; aday geçişi `*/progress-current.json`.
Bütün arşiv soru paydası ve kesin ETA bilinmiyor. Kaynak `D:\workspace\mebi-yks`
salt okunur; eski banka/öğrenci kayıtları korunur. Test üretim DB'sine yazmaz.

**Yeni kural sonrası durum:**025'in500 sorusu talimat değişmeden önce
katalog/canlı kabulü geçti; mevcut8.581 kayıt korunur. Dört Dörtlük kalan
4.016 adayın PDF'leri atlandı ve026–034 boş-source PASS; kurtarma49 adayı035'te
atlandı. Yeni büyük deneme/çıkmış kitaplarının eski bankadaki aynı PDF'leri
doğrulandı; bunlar için yeni kırpım/işlem başlatma.
`remaining-positive-layout-cues/report.json` PDF kapısından SONRA güncellendi:
100 kaynak/851 hazırlanmadığı sanılan sayfa. 14 ortak PDF'nin ilk üç sayfası
YDT etiketli; TYT/AYT'ye zorla eşleme. Eski generic-book keşfindeki beş kitap
mevcut bankayla aynı PDF; tekrar hazırlama. Tekil crop kaynağı önce bu census'a
katılmadığı için yeni `individual-tarama-crops` bundan sonraki census'ta sayılır.

**Devam eden hazırlanmış zincir, önce PDF filtresi:**
- `reviewed-topic-expansion`:2.478 içinden2.257 eski-PDF atlandı;221 yeni-PDF
  adayı036–040 kapılarında. Kabul edilmiş makbuzlar tekrar yazılmaz.
- `three-step-mock-expansion`172 ve `four-square-header-expansion`867 adayın
  PDF'leri mevcut;041–043 boş-source kabulüyle atlanacak, tekrar model yok.
- `full-mock-expansion`169 yeni-PDF adayı044;188 gerçek çift anahtar grubu/
  220dpi kaynak/basılı kimlik PASS. `dual-exam-philosophy-expansion`140 kapsam
  adayı/80 soru045; basılı FELSEFE/TYT-AYT/tam bölüm başlığı,30 native V2.
- `all-source-evidence`23.879 içinden23.461 eski-PDF atlanır;418 yeni-PDF
  adayının cevap/gövde kanıtı kalır. `full-mock-pending-evidence`5.482 ve
  `single-test-pending-evidence`1.886 yeni-PDF adayı ayrı kanıt/kategorileme
  işinde. Bunlar yayın değildir; ince konu/gövde/cevap belirsizi ayrı kalır.
- Tek-test1.886/1.886 aynı numara/harf/hash bağımsız makbuzu AGREES; yeni model0.
  547 native V2 gövde kanıtı hazır; kalan1.339 gerçek görsel yolunda.

**Yeni tekil tarama zinciri (hazırlık BITTI, aktarım açık):**
- `individual-tarama-expansion`:44 kaynak/911 native adaydan378 kırpım;
  77 kontrollü konu adayı046; 539 geometri/bağlam kaydı ayrı incelemede.
- `individual-tarama-topic-expansion`:basılı başlıkların açık içerme kuralları
  ve kaynak ders klasörüyle139 ek konu adayı047; kalan162 konu incelemesi.
  301 ilk inceleme adayı139'la örtüşür; sayıları tekil soru diye toplama.
- 046 native9/77,047 native44/139; beş entegrasyon/konu sınırı testi PASS.
- 046 publisher PID44528,047 PID14088 ve301 evidence PID38412 gerçekten
  başlatıldı; loglar `chain-supervisor/individual-tarama*.log`/`.err.log`.
  046,045'i;047 ve evidence046'yı bekler. Çalışan41468 gözetmeni yeni kodu
  henüz yüklememiştir; bu üç iş ayrı başlatıldı. Yeniden başlatılan gözetmen
  yeni kayıtları da kapsar, çalışanları kesmez. Uygulama/model servisi durmadı.
- Komutlar: `python scripts/mebi_pratik2_tek_tarama_ek.py` ve
  `python scripts/mebi_pratik2_tek_tarama_konu.py` mevcut donmuş paketleri korur.
  Yeni çıktılar öğretmen onayı veya yeni soru kabulü değildir.

**Sürekli gözetmen:** `mebi_pratik2_zincir_gozetmeni.py --watch` yeniden
PDF kurallı sürümle başlatıldı; PID/durum `chain-supervisor/current.json`.
İşçi logları `.log`, beş dakikada/değişimde events.jsonl. Çalışan writer'ı
kesmez; durmuş işi kabul edilmiş bağımlılıktan en fazla3 kez sürdürür.
User'ın yeni kuralına uymayan eski kuyruk worker'ları politika yenilenirken
kapatıldı; uygulama/model servisleri durdurulmadı, tamamlanan025 korunmuştur.
OS/oturum kapanırsa gözetmeni yeniden başlat; Windows başlangıç görevi yok.

**Sonraki somut iş:** yeni PDF adaylarının kapılarını izle; hazırlanmamış
kaynak araştırmasına başlamadan PDF kararını uygula. Sıradaki kategorileme,
cevap/gövde doğrulanmış yeni kaynaklarda mevcut ana konu satırına dayanır.
İnce konu açıkken öğrenciye ders altında gösterme tercihi yanıtlanmadı;
sıkı konu kapısı korunur. Bozuk/belirsiz gerçek içerik gerekçeli ayrı tutulur,
aynı başarısız istem döngüsü yok. Önceki source/key/pixel ve model makbuzlarını
aynı hashte kullan; öğretmen onayı veya sorunun bankada olmadığı kararı uydurma.

| Görev | Durum ve sıradaki somut adım |
|---|---|
| YKS-08.full → YKS-10.full | **YKS-08, YKS-09 ve YKS-10 TAMAMLANDI — BITTI / seçili sıfır-yeni-soru zinciri.** `selected-yks08-full-acceptance/` 12.266 kaynağı tek son kararda kapattı: 3.697 eski kimlik,36 locator ve üç pilot korunur;8.530 dışlama;4.383 gövde adayında olumlu yenilik kabulü yok,NEW0. `selected-yks09-empty-package/` boş/yayımlanmamış pakettir. `selected-yks10-zero-transfer/` 80.230 banka kaydını salt-okunur doğruladı; üretim soru/katalog/öğrenci DB yazımı, ID birleşmesi ve cutover0; yalıtılmış `ivme_test` pilotunun dört testi ve ikinci INSERT0 kanıtı geçerli. Runtime full08/full09/full10 VERIFIED; kalite raporları sırasıyla `20261109T043139-674c5e0a`, `20261109T043422-2bb1e297`, `20261109T043736-6baf5948`. **Sıradaki:** YKS-11 yalnız katalog/kaynak geçişidir ve soru sayısını artırmaz. 100 bin yeni soru hedefi isteniyorsa önce farklı, geniş kaynak edinimi + çıkarım kapsamı kararlaştırılmalı; dışlanan adayları tekrar açma. |
| YKS-07.full → YKS-08.full | **YKS-07 TAMAMLANDI — BITTI / seçili doğrulanabilir kapsam; runtime VERIFIED.** Run `20261107t212333-f17dbdba`, `yks-07/full/attempt-0002/selected-full-source-acceptance.json`.4.086 PDF/67.277 sayfa,12.266 gözlem:4.383 piksel+iki basılı cevap okuması adayı;3.697 eski kimlik,36 ikincil locator ve üç pilot korunur;4.147 dışlama/yeniden deneme yok. Etkin girdi `selected-yks07-acceptance/source-candidates.json`.75 Fizik özeti bitti, kalan0/0; özet/eksik kaynak onarımı/tekrar OCR/model yok. YKS-07 kalite39 kontrol/163 test PASS (`20261109T033804-47678fc9`); YKS-08 22 kontrol/92 test PASS (`20261109T035055-6130b9cd`). Kalıcı DB arşivi `3c14dc2f96f0eec7…`:279.087 kayıt/80.328 farklı dosya/2.242.518.174 bayt; tam hash geri okuması ve ikinci kayıt0 INSERT PASS. **YKS-08 geçişi hazır:**80.230 canlı banka/görsel damgası eşit;4.354 karşılaştırma kullanıldı,29 kanıtsız aday atlandı.4.383 girişte olumlu içerik/yenilik kabulü yok: yeni alım EXCLUDE_NO_RETRY,NEW0;3.736 eski kimlik/ikincil locator/pilot gözlemi korunur. `selected-yks08-comparison/` alım kararı07 kaynak adayından üstündür. **Sıradaki:** mevcut/varyant/belirsiz ayrımı ve üç yalıtılmış pilot sınırını tam08 kabul kaydında dondur; kaynak/model/OCR veya banka karşılaştırmasını yeniden çalıştırma.07 kabulü soru içeriği/dar konu veya üretim alımı/yayın değildir;08–13 ayrıca tamamlanacak. Son komut `..\.venv\Scripts\python.exe -X utf8 scripts/yks07_secili_kapsam.py --accept`; değişmeyen kabulü tekrarlama. Öğrenci DB/özgün arşiv/eski ID korunur. |
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
