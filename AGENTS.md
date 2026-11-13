# İvme: Claude ve Codex çalışma kuralları

Bu dizin tek İvme uygulamasıdır: React/Vite, Spring Boot, PostgreSQL. Claude `CLAUDE.md` üzerinden bu dosyayı içe alır. Görevle ilgisiz belgeleri baştan yükleme; [belge dizininden](docs/README.md) ilgili sözleşmeyi seç.

## Başlangıç ve devir

- **Kesintisiz yetkili plan yürütme:** Kullanıcı bir planın tamamını bitirmeyi
  istediğinde her alt parti sonunda final yanıtla durup tekrar “devam et”
  isteme. Yetkili kapsamda bağımlılıklar ve doğrulamalar geçtikçe sonraki
  adıma aynı çalışma içinde geç; ara sonuçları commentary ve kanıt dosyalarına
  kaydet. Yalnız gerçek kullanıcı kararı/yeni yetki gerektiren somut engelde
  veya kullanıcı durdurduğunda dur. Tamamlanmayan işi BITTI gösterme; çalışan
  arka plan işlemini tüm zincir kendiliğinden sürecekmiş gibi sunma. Her adımın
  kabulü geçince planı/görev tablosunu BITTI güncelle, plan bütünü geçince ana
  başlığı da BITTI yap. Bu kural güvenlik ve veri koruma sınırlarını kaldırmaz.

- Önce `git status --short` ile kullanıcı değişikliklerini koru. Devam isteniyorsa [devir notunu](docs/devam.md), yalnız ilgili açık işi ve gerekli rehber bölümünü oku. Yeni kullanıcı talimatı, devirdeki sıradaki görevin önüne geçer.
- İşe başlamadan [görev durum tablosundaki](docs/gorev-durumu.md) ilgili kimliği kontrol et. Her önemli görev/alt adım tamamlandığında veya kısmi ilerleme, engel, başarısız doğrulama olduğunda tabloyu ve ilgili plan/teknik belgeyi **aynı çalışma içinde, oturum sonunu beklemeden** güncelle: tamamlanan kapsam, çıktı/kanıt, doğrulama ve kalan tek somut adım. Tamamlanan satırı silme; ayrıntılı geçmişi kopyalama. Kanıtı/girdisi değişmeyen tamamlanmış işi tekrar yapma; yeniden açılacaksa değişen girdi veya hata nedenini kaydet. Bu kural hem Claude hem Codex için geçerlidir.
- Öğrenme, PDF üretimi, ortak pratik, kayıt güvenilirliği veya izleme işleri için [bulgular ve yaklaşım incelemesine](docs/tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md) bak. Göreve göre model/düşünme düzeyi ve alternatifler §19'dadır; mevcut modeli farklı bir modelmiş gibi sunma. Belge öneridir; yalnız inceleme talebini uygulama yetkisi sayma, ilgili bölümü oku.
- Devirde yalnız yarım işin konumu, sonraki komut ve açık karar tutulur; geçmiş işler `git log` ve sürümlü raporlardadır. Görev sonunda devir notunu gerekiyorsa güncelle ve tamamlanan değişikliği yerel `main` dalına commit et. Kullanıcı istemedikçe push yapma.
- Tekrarlanan komutları `python scripts/ivme.py` ve [işlem tariflerinden](docs/islemler/README.md) seç. İş ikinci kez elle kuruluyorsa betik veya kısa tarif ekle; çıktı/hash önbelleğini kullan.

## Veri ve ürün sınırları

- **Pratik 2 cevap kurtarma (son kullanıcı talimatı):** ilk okumada cevap
  bulunamaması tek başına vazgeçme nedeni değildir. Aynı basılı test/bölüm/adım
  kimliğiyle başka anahtar konumunu ve mevcut kaynak kanıtını kontrol et;
  gerekirse farklı bir yerel okuma yöntemiyle bir sınırlı kurtarma geçişi yap.
  Aynı başarısız istemi döngüde tekrarlama. Gerçek uyuşmazlık/eksik gövde/konu
  belirsizliği giderilemezse gerekçeli inceleme kategorisine ayır; cevap tahmini
  ve sahte öğretmen onayı yoktur. Bu güncel talimat, Pratik2 için önceki ilk
  başarısızlıkta EXCLUDE_NO_RETRY yaklaşımının önüne geçer; eski YKS projesinin
  kapalı kararlarını veya öğrenci kayıtlarını değiştirmez.

- Kalıcı DB `ivme` içindeki öğrenci kayıtlarını ve içerik karar geçmişini koru. Testleri yalnız geçici `ivme_test` üzerinde `python scripts/ivme.py test` ile çalıştır. Özgün `../Kaynaklar/` arşivi yalnız okunur.
- **YKS kaynak kabulünde kullanıcı önceliği:** yalnız doğrulanabilir soru, basılı cevap ve kaynakla destekli konularla ilerle. Hatalı, eksik, uyuşmayan, bulunamayan veya mevcut denemede doğrulanamayan adayları `EXCLUDE_NO_RETRY` ile çalışma/aktarım kümesinden çıkar; kaynak onarma, eksik anahtar/şekil arama, tekrar OCR/model veya yeniden inceleme yapma. Elenen aday öğrenci ekranına/yayına girmez; görevi bitirmek için bu istisnaların düzelmesi beklenmez. Sadece yeni ve açıkça incelenebilir kaynaklarda bir geçiş yap; yine doğrulanamıyorsa hemen sonrakine geç. Mevcut banka kimlikleri ve öğrenci geçmişi korunur. Kural: `scripts/yks-secim-politikasi.json`; 07 tam kabulü: `selected-yks07-acceptance/`; soru alımı için daha yeni `selected-yks08-comparison/` dışlamaları üstündür. `verified-source-selection/` önceki özet gözlemidir, üretim alımı değildir.
- TAS-01–12 için referans günü **2026-10-31**: mevcut DB'de kaydedilmiş bütün veriler
  korunur; geçmişte DB'ye ulaşmamış olay/kuyruk/loglardan kayıt tamamlama veya
  yeniden oynatma yapılmaz. Eski öğrenme tarayıcı kuyruğu atılır; bu geçişten sonra
  oluşan yeni olaylar onaylanana kadar korunur ve aynı kimlikle yeniden denenir.
  Hesaplar, diğer çalışmalar, içerikler ve DB geçmişi silinmez.
- Sözlük, kaynak kimliği, kanıt ve öğretmen onayı için [ortak etiket sözleşmesini](docs/sozlesmeler/ortak-etiketler.md) ve ilgili [şemayı](docs/semalar/learning-resource-v2.schema.json) kullan. Üretilmiş JSON'u elle düzenleme; kanıtı olmayan içeriğe öğretmen onayı yazma.
- Ön yüzde tabloları `frontend/src/components/DataGrid.jsx` üzerinden AG Grid Community ile çiz; başka tablo bileşeni veya düz `<table>` ekleme. Ortak renkler `frontend/src/theme.css` değişkenlerindedir. Tablo başlığı/hücresi ortalı ve grid alanı dolu olmalı.

## Doğrulama ve belgeler

- Değişen davranışı ilgili teknik belgede düzelt; tarihli iş günlüğünü belgelere kopyalama. Açık iş [yol haritasında](docs/plan/README.md), etkin/yarım iş devir notunda, tekrar eden işlem `docs/islemler/` altında kalır.
- Değişiklikle ilgili en küçük anlamlı denetimi çalıştır. Belge/plan için `python scripts/ivme.py plan`, commit öncesi `python scripts/ivme.py kontrol`; ön yüz için gerektiğinde `npm run build`, sayfa için `python scripts/ivme.py sayfa /yol`.
- TAS işlerinde [test/devir tarifini](docs/islemler/test-ve-devir.md) kullan: `python scripts/ivme.py kalite plan|durum|calistir TAS-XX`. Önce mevcut kanıtı kontrol et; yalnız değişen kapsamı çalıştır. Yeni test/kaynak bağımlılığını `testler/kalite-profilleri.json` girdilerine ekle. `PASS` yalnız otomatik test sonucudur; eksik UI, insan veya dış ortam kabulünü kapatma.
- Uygulama kodu değiştiyse yerel izleyicinin sonucu ve servis edilen sürümü doğrula. Çalışma/yeniden başlatma ayrıntıları [işletim tarifinde](docs/islemler/uygulama-calistirma-ve-yayin.md). Yeni dış dağıtım ve push için açık kullanıcı talimatını bekle.

## Konuyu Öğrenelim: kullanıcının kalıcı öğretim beklentisi

Bu bölüm hem Codex/ChatGPT hem Claude için geçerlidir. `CLAUDE.md` bu dosyayı içe alır;
ayrı bir `agent.md` veya kopya kural dosyası oluşturma. Devam noktası için önce
[docs/devam.md](docs/devam.md), yalnız uygulama ayrıntısı gerektiğinde
[öğretim sözleşmesi](docs/icerik/konuyu-ogrenelim.md) okunur.

- **Matematik işine başlamadan önce** [matematik konu listesini](docs/icerik/matematik-konu-listesi.md)
  oku (`node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` sıradaki konuyu verir).
  **Sıra (kullanıcı kararı): önce TYT konu içerikleri, lablar en son.** İlk 🟡/⬜ TYT içerik
  satırından sırayla ilerle; bütün TYT içerikleri ✅ olunca aynı belgedeki **laboratuvar
  kapsamı ve devam sırasına** dön (kullanıcı mevcut ve yeni bütün konulara lab istedi).
  Eski otomatik ✅ yalnız dört içerik ölçütüdür, lab kabulünü ölçmez. Lab eksikse ✅ konuyu
  o aşamada yalnız lab/aktarım kapsamı için yeniden aç;
  bitmiş anlatım, kaynak ve soruları gerekçesiz baştan üretme. İçerik durumu ölçütlerden
  üretilir; değiştiyse listeyi aynı commit'te `--liste` ile yenile. Etkin aşama TYT; AYT bekler.
- **TYT–AYT ortak konular tek derstir.** Sınav kapsamını takip listesinde ve uygulamada
  `TYT + AYT` olarak göster; çalışma sırasındaki “TYT aşaması”nı “yalnız TYT kapsamı” sanma.
  Aynı konu/katalog satırı için ikinci AYT dersi veya kopya anlatım oluşturma. Ortak anlatım,
  gerekçeli örnek ve sorular iki sınava hitap eder; varsa AYT'ye özgü ek bölümler aynı dersin
  içinde ayrıca etiketlenir. AYT aşamasında ortak tamamlanmış anlatımı yeniden yazma; yalnız
  eksik AYT uzantısını tamamla. Geniş kategori tek başına alt konunun iki sınava girdiğinin
  kanıtı değildir; yalnız etiket eklemek AYT uzantısını tamamlanmış saydırmaz.
- Amaç öğrencinin **mantığı kavraması ve gerçek soruyu kendi başına çözebilmesi**.
  Kısa özetleri uzun metne çevirmek yeterli değildir. Hiç bilmeyen için terimleri ve
  sembolleri açıklayarak başla; temel → bağlantılar → ileri gerekçe/özel durum sırasını koru.
- Öğretim sırası: **günlük yaşam bağlamı → tahmin ve etkileşimli görsel → gerekçeli
  çözümlü örnekler → bu örneklerden çıkarılan pratik kısa yollar → öğrencinin denemesi
  ve gerçek sorular**. İpuçları tek başına kural listesi olmasın. Kısa yolun geçerli
  olduğu koşulu, neden çalıştığını ve yanıltacağı durumu birlikte açıkla.
- Görseller süs değildir: değişen miktarı, sabit kalan ilişkiyi ve işlemin nedenini
  gösterir. Öğrenci değeri değiştirebilmeli; şekil, sayısal sonuç ve açıklama tutarlı
  güncellenmeli. Günlük kullanım, merak uyandıran bağlantı ve püf noktası konuya özgü
  olmalı. Olgusal ilginç bilgiyi uydurma; matematiksel bir ilişkiyi keşfettirmek uygundur.
- **Her matematik konusu için hedefe uygun laboratuvar gerekir.**
  [Lab öğretim/kabul standardını](docs/icerik/matematik-laboratuvari.md) uygula;
  tek–çift pilotunun arayüzünü veya görev sayısını her konuya kopyalama. Önce hedef,
  yanılgı ve gerçek soru becerisini belirle; uygun model/etkileşimi seç. Tahmin veya
  karar, amaçlı eylem, neden/koşul, hataya özel geri bildirim ve bağımsız aktarım gerekir.
  Uygunsa mevcut keşfi geliştir; yalnız kaydırıcı/animasyon/soru sayısıyla lab tamamlanmaz.
  Ortak bileşen birden çok konuya bağlanabilir; her konu için hedef/kabul bağı ayrı tutulur.
  Matematik ve etkileşim doğruluğunu anlamlı testlerle; eğitim etkisini görülmemiş soruda
  yardımsız çözüm, gerekçe, ipucu ihtiyacı ve gecikmeli aktarımla değerlendir. Teknik
  kabulü öğretmen onayı veya öğrenme etkisi diye sunma. Konu listesindeki lab durumunu,
  hedef kapsamını, kanıtı ve kalan işi güncelle; içerik + lab teknik kabulü olmadan
  konunun yeni standarda göre tamamlandığını yazma.
- Önce örnek çöz; her adımda **ne / neden / nasıl kontrol ederim** göster. Yeni başlayan
  için gerekçeyi gizleme. “Temelden” başlangıçtır; bilgili öğrenci daha ileri anlatımı
  seçebilir. Gereksiz jargon, küçük yazı, yoğun tek ekran ve acele ettiren dil kullanma.
- Kaynak PDF görüntüsü veya özgün çizim kullanılabilir. Özgün soru kodunu/görselini koru;
  görmeden ayrıntılı çözüm yazma. Otomatik konu eşlemesini görsel inceleme veya öğretmen
  onayı gibi sunma. Çözümü derste gösterilen soru bağımsız ustalık testine girmemeli.
- TAS-11 video ipuçları, kaynak ve matematik kontrolüyle **protip** olarak konuya ve
  ilgili ders bölümüne eklenir; öğretmen incelemesi bekleyenlerde “Öğretmen kontrolü
  bekliyor” etiketi görünür. Kullanıcının talimatı gereği öğretmen onayı protipin
  görünmesini engellemez; onay kaydı uydurulmaz. Uzun vadeli hedef bütün uygun
  video/konu içeriklerine aynı hattı uygulamaktır; mevcut iki video yalnız başlangıçtır.
- Kaynaklı konu içeriği (ana kaynak kanıtı, açıklamalı soru, konu testi) [içerik hattıyla](docs/islemler/icerik-hatti.md)
  üretilir: `python scripts/ivme.py icerik calistir <kavram>`; 3 dönerse `veri/icerik-hatti/<kavram>/gorev-taslak.md`
  paketini tamamla ve yeniden çalıştır. Öğretmen kararı/öğrenci gözlemi (`icerik karar|gozlem`) yalnız insan girdisidir.
- Mevcut dersler ve bundan sonra eklenecekler aynı standarda uyar. Yeni ders yalnız
  `.ders` özetiyle tamamlanmış sayılmaz: keşif anlatımı, uygun görsel model, gerekçeli
  örnek, aktarım sorusu, koşullu kısa yol ve yanlış düşünce geri bildirimi gerekir.
  Her bölümde üç düzeyi dolu bir `::duzey` (Temelden / Bağlantıları kur / Derinleş) ve en az
  bir `::sorgula` (Günlük hayattan sorgula) bulunur; örnek: bölme ve bölünebilme pilotu.
- Oturum sonunda yerel commit yap; devam notunda **tamamlanan kapsam, kalan somut iş,
  doğrulama sonucu ve sıradaki komut** bulunmalı. Geçmişi yeniden tarama, geçerli testleri
  sebepsiz tekrarlama, mevcut modeli veya soru bankasını baştan üretme. Yeni bir hata ya
  da değişen girdi tekrar denetimini gerektirebilir. Kaynak arşivi ve öğrenci DB'si korunur.
