# Kaynaklı ders notları: durum ve devam kaydı

14 Ekim 2026. Güncel öğretim kapsamı ve devir noktaları. Ayrıntılı kaynak izi ve yeniden kullanma komutları [araştırma hafızasında](KAYNAKLI_SORU_ANALIZI.md) kayıtlıdır.

## Güncel kapsam

- **68.944 etkin yerel soru referansı**, **22** sınav/ders grubu, **1.215** özgün kaynak etiketi. Kimlik kümeleri eşit, boş birincil etiket sıfır. Etiketler bağımsız pedagojik alt konu veya sınavda çıkma olasılığı değildir.
- **55.126** kayıt ek inceleme işaretli; **12** olası ders uyuşmazlığı ve **2** iptal soru etiket dizininde korunur. Soru bankasının konu, cevap veya puanlama davranışı bu çalışma kapsamında değiştirilmez.
- **49 rehber / 117 soru kalıbı**, **97 örnek bağı / 96 farklı kaynak soru**, **146 farklı PDF sayfa dayanağı**. Bütün rehberler `teacher_pending`, veritabanında `DRAFT` durumundadır. Kaynak kontrolü öğretmen onayı değildir.
- 13 dersin dizininde **180 başlık**, rehbere bağlı **53 başlık** vardır. Geniş başlığa giriş rehberi hazırlanması bütün dar alt konuların, sanatçıların veya eserlerin tamamlandığı anlamına gelmez.
- TYT Türkçe: **16 rehber / 17 hazır başlık / 18 dizin başlığı**. Sözcükte Yapı ve Fiilde Çatı eklendi. Anlatım teknikleri/düşünceyi geliştirme yolları ortak rehberdir. Sözel Mantık doğrulanmış dayanak bekler.
- AYT Edebiyat: **16 rehber / 17 dizin başlığı**. Temel kavramlar/metin türleri ortak rehberdir. Söz sanatları, akımlar, dönemler, roman-hikâye, tiyatro, öğretici metinler ve yazar-eser bağları giriş düzeyinde işlendi. Ayrıntılı alt konu genişletmeleri açıktır.
- TYT Tarih, Coğrafya, Felsefe, Din Kültürü, Biyoloji ve Kimya'da **ikişer rehber** vardır. Bu devamda Atatürk İlkeleri, Atmosfer/İklim, Varlık Felsefesi, Bilgi/İnanç, Hücre ve Periyodik Sistem eklendi. Bu branşların kalan AYT konuları açık iştir.
- Seçilmiş anlatım arşivi **25 OGM PDF / 3.027 sayfa**; metinsiz/kısa veya görsele bağımlı **9.230 kayıt** ayrıca inceleme bekler. Bağımsız ÖSYM arşiv tamlık denetimi yapılmış değildir.

## 13 Ekim diliminde yapılanlar

1. Önceki `33e023c` commit'i, devir notları ve PostgreSQL arşivi okunarak devam edildi. Değişmeyen PDF metinleri yeniden çıkarılmadan kayıtlı sayfalardan geri çağrıldı.
2. **23 yeni rehber / 60 kalıp** eklendi. Ders → kategori → konu → kalıp akışında kavram ayrımı, çözüm adımları, çeldirici ve özgün düşünme provası sunulur. Yanıt sonrası kavram, kök veya yönteme dönülür. Özgün mini örnekler kurumların sınav sorusu gibi sunulmaz.
3. Eski `?baslik=` bağlantısı artık hazırlanmış konuya aitse rehberi açar. Mobil dizin ve konu/ders değişiminde yanıt sıfırlama korunur.
4. Fiilde Çatı PDF ve uygun OGM sorusuna dayanır; yerel çıkmış soru eşleşmesi bulunamadığı kaynak bölümünde açıklanır. Bu, resmî arşivde hiç sorulmadığı iddiası değildir. Eksik karşılaştırma yalnız durum ve açıklamayla yayımlanabilir; diğer 48 rehberin iki koleksiyon şartı korunur.
5. **10 checksum bağlı gözlem** sürümlendi. Dört yeni soru görselinde alt çizgi/sütun ilişkileri; Edebiyat PDF 39 s. 26 ve 137'deki iki tablo incelendi. Önceki iki görsel notu korunur. Kaynak değişirse eski gözlem geçerli sayılmaz.
6. `mt-tyt-turkce-02-25`, Fiilde Çatı etiketine rağmen cümlede anlam görevi ister. `3a-tyt-biyoloji-16-02` görselindeki I/II/III öncülleri D'yi desteklerken yerel anahtar B'dir. İkisi rehber örneklerinden dışlanır; banka cevabı veya etiketi değiştirilmez. Özgün anahtar/öğretmen incelemesi açıktır.
7. `incele_kaynakli_arastirma.py` soru, konu veya PDF sayfasını metin, görsel yolu, checksum, cevap kaydı ve gözlemlerle geri çağırır. Konu araması kaynak etiketine göredir; kendi başına pedagojik doğrulama değildir. Her koleksiyona ayrı örnek sınırı uygulanır.
8. PDF önbelleği yeni atıf verilen sayfalarda eksik vektör çizim kontrolünü tamamlar. Yalnız görüntüden okunan iki sayfa `ASSISTANT_REVIEWED` olur; çizim tespiti tek başına görsel inceleme değildir.

## 14 Ekim: eksik sayısal derslerin eklenmesi

- Menüye **TYT Fizik, AYT Matematik, AYT Fizik, AYT Kimya, AYT Biyoloji** eklendi. Her birinin sınava özel konu dizini, OGM PDF bağlantıları, bir ilk rehberi, kalıpları ve özgün alıştırması vardır. Hazırlanmamış konular kaynak incelemesinde gösterilir.
- AYT Türkçe isteği mevcut `ayt-edebiyat` kaydına **Türkçe / Edebiyat** görünen adıyla bağlandı. Özgün kaynak dersi Türk Dili ve Edebiyatı olarak korunur; ayrı bir sahte Türkçe soru grubu oluşturulmaz.
- İlk rehberler: fiziksel nicelikler/SI, fonksiyon girdisi ve parabol, vektörler, kuantum sayıları/elektron dizilimi, impuls iletimi. Beş rehberde **13 yeni kalıp ve 10 kaynak örnek bağı** vardır.
- TYT Fizik 4.103, AYT Matematik 6.834, AYT Fizik 4.988 olmak üzere **15.925** yeni referans eklendi. Kimya ve Biyoloji AYT kaynakları zaten arşivdeydi; yeniden kopyalanarak ayrı grup oluşturulmadı.
- Yeni referanslar `scripts/kaynakli_etiket_sayisal.py` ile `ornek-veri/etiketler/sayisal-kapsam.csv` dosyasına üretilir. Konular kaynak CSV'den alınır; bütün kayıtlar inceleme bekler. Kaynak JSON kimliği ve CSV kodu birlikte izlenir. Bu, 15.925 sorunun tek tek çözüldüğü iddiası değildir.
- **7 yeni görsel gözlem**, eski 10 notla birlikte toplam **17** olarak saklanır. Kesir, yön şeması, kareli vektör çizimi, sinir tepkisi grafiği, orbital yerleşimi ve köklü seçenekler görüntüden doğrulandı.
- `3a-ayt-fizik-56-04` kaynak metnindeki tek NUL karakter PostgreSQL metin/JSON alanlarına doğrudan yazılamaz. Özgün UTF-8 metin base64 ve SHA-256 ile kayıpsız korunur, okunabilir sütunda bozuk karakter açıkça yer tutucudur; görsel inceleme bayrağı vardır. Geri çağırma aracı özgün metni checksum kontrolüyle yeniden verir. Karakterin hangi fizik sembolü olduğu tahmin edilmez.
- TYT Matematik bu isteğin kapsamına eklenmedi. Dizinin tamamı bağımsız resmî müfredat tamlık denetimi değildir.

## Yeniden üretim ve doğrulama

Girdiler `ornek-veri/kaynakli-ders-notlari.json`, `ornek-veri/kaynakli-notlar/*.json` ve `ornek-veri/kaynakli-arastirma-gozlemleri.json`; öğrenci çıktısı `frontend/public/kaynakli-notlar.json`. Sayfalar 1 tabanlı PDF sayacıdır. Örnekler etkin ve doğru ders/sınavda olmalı, kaynak ve CSV cevapları eşleşmeli; iptal, ders uyuşmazlığı veya dışlama notu taşımamalıdır. Ham soru/PDF tam metinleri öğrenci JSON'una kopyalanmaz.

```powershell
python -X utf8 scripts/kaynakli_etiket_sayisal.py --check
python -X utf8 scripts/analiz_kaynakli_sorular.py --check
python -X utf8 scripts/yayinla_kaynakli_etiketler.py --check
python -X utf8 scripts/yayinla_kaynakli_notlar.py --check
python -X utf8 testler/source-data-test.py
python -X utf8 testler/source-observations-test.py
python -X utf8 scripts/kaynakli_arastirma_db.py --write
python -X utf8 testler/source-research-db-test.py
```

Proje Python ortamında `pymupdf` bulunmalıdır. Not değişince önce yayın betiğini `--write` ile çalıştırın; ardından `frontend/` içinde `npm run build`, kökte `node testler/source-labels-ui.mjs` çalıştırın.

Güncel doğrulamalar:

- Envanter, etiket ve not denetimleri geçti: 68.944 kimlik, 49 rehber ve 97 örnek bağı.
- **15** kaynak veri ve **3** checksum/gözlem regresyon testi geçti. Eksik karşılaştırmayı açıklamasız yayımlama ve çelişkili örneği geri alma reddedilir.
- `npm run build` geçti; mevcut ortak paket boyutu uyarısı sürer.
- Gerçek tarayıcıda **1280 ve 390 px**: 22 etiket grubu, 13 ders, **49 rehber / 117 kalıp**, bütün düşünme provaları, doğru/yanlış yanıt akışı, filtre, sayfalama, yeniden deneme, eski başlık bağlantısı ve yatay taşma kontrolü geçti. Sandbox içindeki Chrome/Edge CDP bağlantısı yanıt vermedi; yetkili dış çalıştırma başarılı oldu.
- Araştırma arşivi kontrol seti **9 test**: kapsam, JSON eşitliği, öğretmen onayı sınırı, Türkçe arama, görsel gözlemler, çelişkili kayıt, PDF tablo incelemesi, atıf sayfalarında çizim kontrolü ve bozuk kaynak karakterinin kayıpsız geri çağrılması. Güncel aktarım kimliği `veri/source-research/last-run.json` içindedir.
- Backend'in 11 adres yönlendirme testi önceki dilimde geçti; bu devamda backend adres kodu değiştirilmedi.

Tarayıcı testi derlenmiş ön yüz ve yalıtılmış API yanıtları üzerindedir; canlı görsel/PDF API akışının uçtan uca testi değildir. Canlı servis yeniden başlatılmaz, diğer bekleyen uygulama göçleri çalıştırılmaz. Araştırma PostgreSQL `source_research` şemasında saklanır; öğrenci tablolarına yazılmaz.

## Sonraki çalışma

1. Sözel Mantık için uygun soru/anlatım dayanağını doğrulayın. Fiilde Çatı için çıkmış örnek eşleştirmesi açıktır.
2. Tarihte İlk Uygarlıklar/İlk Türk Devletleri; Coğrafyada konum/Dünya hareketleri; Felsefede akıl yürütme/ahlak; Din'de din-ahlak; Biyolojide bileşikler/madde geçişleri; Kimyada etkileşimler/maddenin hâlleriyle devam edin. AYT kapsamını ayrı sınav gruplarıyla açın.
3. Edebiyatta dar alt konuları genişletin. Şiir Bilgisi rehberinin mevcut ahenk odağı, bütün nazım biçimlerinin ve türlerinin bağımsız rehberlerinin tamamı değildir.
4. Biyoloji cevap çelişkisini özgün kitapçık/anahtarla ve öğretmenle doğrulayın. Etiket uyuşmazlıklarını ve iptal sorularını bankaya aktarmak ayrı veri düzeltme işidir.
5. ÖSYM arşiv tamlığı, 9.230 kaydın görsel incelemesi ve gerçek branş öğretmeni onayı açıktır. Yerel Türkçe 2018–2026 arşivi yılda 34 kayıttır; 40 soruluk testin bütünü değildir.

Yalnız bu işe ait dosyalar yerel commit'e alınır; diğer bekleyen değişiklikler dahil edilmez. Push yapılmaz.
