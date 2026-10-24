# 12. Adım — kalan içerik ve yayın işlerini tamamla

Bağımlılık: ortak katalog, gezinme ve takip entegrasyonunun kabulü. Bu bölüm kalan
içerik ve gerçek ortam işlerini tutar; tamamlanan hazırlık yeniden yapılmaz.

## 12.01 — Kaynak/cevap düzeltmelerini ve resmî arşiv farklarını kapat

PDF envanterindeki soru/deneme kaynaklarının belge bazlı banka kapsamı ayrıca
incelenir: `Dersler > PDF envanteri` kesin dosya–hash–soru kodu–sayfa bağlarını
gösterir. Bağı doğrulanmayan PDF'deki soruların gerçekten eksik olup olmadığı,
özellikle çevrim içi OGM Soru Bankası ile aynı içerikteki kitaplarda, sayfa ve
görsel karşılaştırmasıyla belirlenir. Yeni soru çıkarımı mevcut cevap/kırpım
doğrulama ve kaynak kabul hattından geçer; yalnız başlık veya benzer soruya
dayanarak banka kaydı ya da tamamlandı kararı yazılmaz.
24 Ekim denetiminde belirli PDF bağı olmayan 209 soru/deneme katalog kaydının
206'sı çevrim içi OGM Soru Bankası okul PDF'sidir. Kalan üç katalog kaydı iki
fiziksel kaynağa aittir: `YKS Kampi - TYT Kitabi.pdf` için mevcut kuru çıkarım
910 soru adayı ve 175 hata/uyumsuzluk üretti; `YKS Mini Deneme - Test 04.pdf`
iki katalog kimliğine bağlıdır, mevcut profil 60 cevaplı anahtar bulsa da sıfır
güvenilir soru/test çıkardı (42 reddedilen çapa, 40 yetim parça). Bu iki PDF'nin
kırpım ve cevap eşleşmesi onarılıp bağımsız doğrulanmadan banka aktarımı yapılmaz.
[Dosya/hash ve kuru çıkarım kanıtı](../../veri/content-labels/integration/pdf-bank-audit-20261024/report.json)
bu iki kaynak için korunur.
Mini Deneme Test 04 için main'e özel `scripts/pdf-question-candidates.py` kaynak
numarasının 16 pt yatay kaymasını giderdi: 60 soru/60 görsel, sıfır reddedilen
çapa, sıfır cevap yöntemi uyuşmazlığı. 1, 30, 60 ve görsel seçenekli 33, 39,
43, 52, 53. adayların kırpımları gözle incelendi. Paket
`veri/content-labels/pdf-extraction/mini-test-04/candidates.json` içindedir;
bankaya alınmadan önce tüm 60 görsel, ders/sınav etiketi ve mevcut sorularla
benzerlik bağı incelenir. Adaylar banka sayısı değildir.
Main PDF envanterinde banka sorusu bulunan kaynaklar “İşlendi (kapsam açık)”,
henüz kanıtlanmayanlar “İşlenmedi / doğrulanmadı” diye ayrılır. Arşiv incelemesi
seçimi dosya taşımaz. Gerçek arşiv için her PDF'nin beklenen soru sayısı/kodları,
canlı banka eşleşmesi ve konu/not/inceleme referansları birlikte doğrulanır.
Paylaşılan özgün `Kaynaklar` feature ortamı için korunur; main'e ait
`veri/pdf-arsiv` ve hash kimliği tekrar indirmeyi önlemek için saklanır.
`scripts/pdf-archive.py` inceleme JSON'undaki tam kod dökümünü canlı banka
kanıtıyla karşılaştırır; güncel `pdf:<id>` içerik kaydı veya yayımlanmış konu
PDF bağı varsa arşivi reddeder. Bu denetimde arşive uygun kayıt henüz yoktur.

Durum: `BEKLIYOR_KAYNAK_KARARI`. 14 içerik kararı ve 54 birleşik/belirsiz resmî
soru konumu açık. Kaynak/alan kanıtı olmadan cevap, soru kimliği veya geçmiş
puan değiştirilemez; kimlik bazlı kanıt paketi ve sonraki işlem aşağıdadır.

İki kırpım `source-repair/applied.json` uyarınca hash denetimli türetilmiş gösterim
olarak uygulanmıştır; özgün görseller, cevaplar ve geçmiş korunur. Resmî 2018–2026
TYT/AYT PDF'leri yerel hash önbelleğindedir. `official-archive/report.json` ve
`answer-comparison.jsonl` tekil 2.561 geçerli anahtar eşleşmesini, üç resmî iptali ve 54 birleşik/belirsiz
kimliği ayırır; tam soru metni eşitliği veya pedagojik doğruluk onayı değildir.
`scripts/content-correction-package.py` 12 branş uyuşmazlığı, bir konu
uyuşmazlığı, bir biyoloji cevap çelişkisi, üç resmî iptal ve iki uygulanmış kırpımı
ayrı sürümlü kanıt paketine toplar; öğrenci/banka yazımı yapmaz. Üç resmî iptal
[ayrı uygulama kanıtıyla](../../veri/content-labels/official-corrections/ivme-20261016T234524Z.json)
yeni seçimlerden çıkarılmıştır; cevap anahtarları ve geçmiş puanlar korunur.
Güncel [19 kayıtlık düzeltme kanıtı](../../veri/content-labels/corrections/labels-v1-00509791e46290a42506896e-20261016T235925Z/report.json)
uygulanmış beş kaydı, karar bekleyen 14 içerik kaydından ayırır.

- Hazır düzeltme paketindeki branş/konu uyuşmazlıkları ve biyoloji cevabı için bağımsız alan kararı al. Onaylanan düzeltmeyi kaynak damgası, özgün kanıt ve etkilenen geçmiş olay sayılarıyla ayrı işlem olarak uygula; cevap ve yeniden puanlamayı sessizce değiştirme.
- `missing-bank-positions.jsonl` içindeki 54 birleşik pasaj/belirsiz kimliği resmî soru konumu ve görseliyle tek tek doğrula. Eski birleşik kimliği koruyan tekil soru kabulü hazırla; alternatif din/felsefe konumlarını birleştirme. Yeni kayıtlar mevcut etiket/ad/konum kabul hattından geçsin.

Yıla ait tam sınav seçimi bu kabulü kullanır. [Canlı arşiv ölçümü](../../veri/content-labels/integration/exam-coverage-20261018/api-report.json)
TYT'de 2018–2026 Türkçe için 34/40 tekil soru, 2019 Matematik için ayrıca
39/40 gösterir. Kullanıcının 18 Ekim talimatıyla eksik yıllar/alanlar aynı sınav
ve ders havuzundan açıkça “Tahmini soru” işaretli tamamlayıcılarla başlatılabilir.
Bu tamamlama 54 konumun kaynak incelemesini kapatmaz.
Tekil soru kabulünden sonra korunmuş özgün konum bağını DB arşiv kaydına ekle ve
yıl/alanın özgün soru sayısını yeniden doğrula; başka yılın tamamlayıcı sorusunu
özgün arşiv konumu gibi kaydetme.

Kabul: kaynak düzeltmesi, arşivde bulunmayan soru ve inceleme bekleyen kayıt ayrılmış; eski soru kodları ve öğrenci kayıtları korunmuş.

**Gereken kişi/girdi:** 14 içerik kaydı için ilgili branş uzmanının gerekçeli
kararı; 54 birleşik/belirsiz konum için resmî PDF'deki tekil soru ve görsel
eşleştirmesi. Özellikle `3a-tyt-biyoloji-16-02` için kaynak/CSV cevabı B,
AI önerisi D'dir; AI önerisi bağımsız cevap doğrulaması değildir.
**Yapılacak işlem:** düzeltme paketindeki kimlik ve kaynak kanıtını aç;
branş/konu/cevap kararını özgün kanıtla kaydet. Birleşik pasajlarda ortak metin ile
her sorunun kök/seçeneklerini ayrı eşleştir; eski kimliği ilişki kaydı olarak koru.
Onaylanan değişiklik ayrı işlemde uygulanır, eski puanların yeniden hesaplanması
ayrı bir açık karardır.
**Tamamlanma kanıtı:** her kaydın karar/gerekçe/kaynak hash'i, yeni tekil soru
kimliği veya belirsizlik nedeni ve etkilenen geçmiş olay sayısı. Mevcut otomatik
cevap eşleşmesi bu 54 konumu çözülmüş saymaz.

## 12.02 — Eksik ders notu ve gerçek kaynaklı ipucu kapsamını genişlet

Durum: `KISMI_KAYNAKLI_ICERIK`. 55 taslak hazır; 335 kontrollü kimlikte dar
konu notu henüz yok. Bu kimliklerin doğrulanmış anlatım sayfası/gerçek örnek ve
alan incelemesi tamamlanmadan otomatik genel metinle kapatılması kabul edilmez.
Eksiklerin kimlik bazlı kaynağı yalnız `note-coverage.json` içindeki `NO_NOTE`
kayıtlarıdır; ikinci konu veya eksik listesi açılmaz.

Konu bazlı farkın üreticisi `scripts/note-coverage.py`, çıktısı
`veri/content-labels/note-coverage.json` dosyasıdır. Var olan rehber yeniden
yazılmaz. Hareket, polinom, trigonometri, Newton, gazlar ve endokrin için eklenen
altı not; PDF sayfası, 12 gerçek soru bağı, 12 kalıp ve altı özgün alıştırmayla
hazırdır. Diğer taslaklarla birlikte kaynak doğrulaması öğretmen onayı değildir.
Güncel ölçüm: 55 taslak, 399 kontrollü konu/alt konunun 64'ünde taslak bağı,
335'inde not yok; gerçek öğretmen onayı sıfırdır. Taslak bağı tam konu kapsamı
anlamına gelmez.

- Güncel kapsam farkında `NO_NOTE` olan kontrollü kimliklerden çalış; geniş giriş notunu bütün dar alt konuların tamamlanması sayma. Edebiyatın dar alt konuları ve AYT sözel kapsamının eksik kaynak/örnek bağlarını tamamla.
- Türkçe Sözel Mantık/Fiilde Çatı, tarih, coğrafya, felsefe, din ve TYT biyoloji/kimya taslaklarındaki örnek bağlarını alan uzmanıyla değerlendir; hazır konuları baştan yazma. Bulunamayan çıkmış örnek nedenini açık bırak.
- Altı yeni taslak dahil gerçek ipucu/not içeriğinin alan kararını al; onaylı ipucunu güvenli aktarım ve cevap sızıntısı denetimiyle bağla. Faydalı/hatalı geri bildirimini gerçek içerik pilotunda doğrula. Sentetik test gerçek içerik onayı değildir.

Kabul: eksik kapsam kimlik bazında azalıyor; her yeni not/ipucu ortak etiket ve kaynak aralığını taşıyor; alan uzmanı incelemesi gerektiren içerik açıkça ayrılıyor.

**Gereken kişi/girdi:** eksik kontrollü konuya ait doğrulanabilir PDF sayfası ve
gerçek örnek soru; yayımlanacak anlatım/çözüm için ilgili dersin alan kararı.
335 kimliğin tamamına kaynaklı dar konu notu henüz hazırlanmadı; bu sayı öğretmen
bekleyen 55 taslaktan farklıdır. Taslak hazırlığı sürdürülebilir, kaynak ve
örnek bağı bulunmayan konu tamamlandı sayılamaz.
**Yapılacak işlem:** `note-coverage.json` içindeki `NO_NOTE` kimliğini seç;
`ornek-veri/kaynakli-notlar/` biçiminde anlatım, kaynak sayfası, gerçek örnek,
soru kalıbı ve özgün alıştırma ekle. `scripts/yayinla_kaynakli_notlar.py --check`
ile kaynak/anahtar bağını denetle; alan incelemesinden sonra onaylı ipucunu güvenli
aktarım hattına ver. Hazır 55 taslağı yeniden yazma.
**Tamamlanma kanıtı:** güncellenmiş kimlik bazlı kapsam sayacı, kaynak denetimi,
gerçek öğretmen kararı ve içerik pilotundan faydalı/hatalı geri bildirimi.
Kapsamın tamamlandığını veya pedagojik doğruluğu yalnız taslak üretimiyle
onaylayamam.

## 12.03 — Kalıcı yayın öncesi açık işletim koşullarını doğrula

Durum: `BEKLIYOR_ORTAM_YETKI`. Yerel yedek ve yalıtılmış geri yükleme geçti:
[44 DB denetimi ve 262.841 dosyanın kanıtı](../../veri/content-labels/backup-restore/ivme-20261017-003903.json).
Aynı fiziksel disk kullanımı açıkça kayıtlıdır. Kalanlar aşağıdaki DB yöneticisi,
gerçek telefon/kalıcı ortam ve koşullu iletişim doğrulaması girdileridir.

- `operations-readiness.json` ile saptanan uygulama rolü ayrımını tamamla: mevcut `root` süper kullanıcı değildir ama şema oluşturma/DB oluşturma yetkilidir; `ivme_app` rolü yoktur ve mevcut rolün `CREATEROLE` yetkisi bulunmaz. Yönetici erişimiyle sınırlı rolü kur, çalışma/Flyway rolünü ayır; parolayı sohbete veya rapora yazma. V51 dahil yerel/test göçleri uygulanmıştır.
- Kalıcı başlatma, yeniden başlama/uyku sonrası toparlanma ve hata durumunu doğrula. Gerçek telefon/dış ağda giriş, soru, PDF/video, QR, oturum ve güvenli çerez akışını dene.
- Yaklaşık aktif süreyi gerçek telefonda ekran kilidi/arka plan/60 saniyeyi aşan boşta kalma/geri dönüş ve masaüstü pencere geçişleriyle ölç.
- E-posta/telefon sahiplik doğrulaması gerektiren bir kullanım açılacaksa önce hizmeti ve doğrulamayı tamamla; mevcut biçim kontrolünü sahiplik onayı sayma. Yeni doğrulama servisi etiketleme kapsamına dahil değildir.

Kabul: yalnız gerçekten açık işletim koşulları kapatılıyor; yayına hazır denebilmesi için somut ortam/cihaz/yedek kanıtı var. Yerel göç uygulanması dış yayın kanıtı değildir. Kullanıcı aynı disk yedeğini seçmiştir; bağımsız fiziksel hedef bu çalışma için ön koşul değildir.

**Gereken kişi/girdi — veritabanı rolü:** PostgreSQL rol oluşturma yetkisine
sahip yerel yönetici. Mevcut bağlantıda `CREATEROLE` yok; erişebildiğim
etkileşimsiz yönetici bağlantısı da yok. Yönetici şu komutu kendi terminalinde
çalıştırıp istenen parolayı gizli girişle yazmalı:

```powershell
pwsh -NoProfile -File scripts/kur-uygulama-rolu.ps1 -Database ivme
```

Parola sohbete gönderilmez. Oluşan `ivme_app` bilgileriyle çalışma bağlantısı
ayarlanır; Flyway/katalog yayını ayrı yetkili bağlantıda kalır.
**Kanıt:** `ivme_app` ile veri okuma/yazma başarılı; rol/DB/şema oluşturma ve
Flyway geçmişine yazma reddedilir, uygulama sağlık kontrolü geçer.

**Gereken kişi/girdi — telefon ve kalıcı ortam:** dış ağdan erişebilen gerçek
telefon, normal kullanıcı hesabı ve kalıcı sunucu/alan adı. Bu çalışma alanında
erişebildiğim telefon yok. Bu kontrol yerel geliştirmeyi durdurmaz; halka açık
veya kalıcı yayın öncesinde yapılır. 390 px tarayıcı testi gerçek cihaz testi
olarak kaydedilmez.
**Yapılacak işlem:** telefonda Wi-Fi'yi kapatıp mobil veriden HTTPS adresini aç;
giriş/çıkış, soru görseli, PDF sayfası, video, QR bağlantısı ve oturuma geri dönüşü
dene. Aktif süre için 20 saniye etkileşim, 90 saniye ekran kilidi/arka plan,
geri dönüş ve 70 saniye dokunmadan bekleme senaryosunu uygula. Kilit/arka plan
süresi eklenmemeli; görünür boşta kalmada son etkileşimden sonra en çok 60 saniye
sayılmalı. Masaüstünde başka pencereye geçiş de süreyi durdurmalı.
Kalıcı ortamın yeniden başlama/uyku kontrolü gerçek makinede uygun zamanda
yapılmalı; çalışan kullanıcı oturumunu kendiliğimden kapatmam.
**Kanıt:** cihaz/işletim sistemi/tarayıcı, URL/sürüm, tarih ve her senaryonun
beklenen/gözlenen sonucu; yeniden başlatma sonrası sağlık ve oturum kontrolleri.

**Koşullu iş — iletişim sahipliği:** ürün e-posta/telefon sahibini doğruladığını
iddia edecekse doğrulama sağlayıcısı, hizmet hesabı ve ürün kararı gerekir.
Kullanılmayacaksa bu koşul uygulanmaz. Açılırsa doğru/yanlış/süresi dolmuş kod,
yeniden gönderim ve oran sınırı kanıtı alınır; biçim kontrolü sahiplik onayı değildir.

## 12.04 — Küçük pilotu ölç ve yalnız yeni bulguları iş listesine al

Durum: `BEKLIYOR_GERCEK_PILOT`. Gerçek katılımcı, sorumlu ve tarih sağlanmadı;
işletim/içerik koşulları da açık. Sentetik kullanıcı veya tarayıcı testini gerçek
öğrenme ve kullanım sonucu olarak raporlamak kabul edilmez.

- Güvenlik/yedek ve içerik koşulları sağlandıktan sonra davetli küçük pilotu yürüt; önce eski plandaki yaklaşık 50 kişi hedefinin ihtiyaca uygunluğunu kontrol et.
- Kaynak bulma süresi, yanlış etiket/aralık, yinelenen kaynak, soru sonuçları, performans, erişilebilirlik ve geri yükleme başarısını ölç.
- Her yeni bulguyu ilgili mevcut adımın yeni alt görevi olarak ekle; ayrı “eksikler” dosyası açma. Kapatılan işleri yeniden aktif listeye taşıma.

Kabul: ölçülen sorunların görev kimliği ve kabul ölçütü var; büyüme kararı gözleme dayanıyor.

**Gereken kişi/girdi:** davetli gerçek kullanıcılar, pilot sorumlusu, deneme
tarihleri ve kullanılacak sürüm. Ben kullanıcı davet etmiş veya gerçek öğrenme
sonucu ölçmüş gibi kayıt üretemem.
**Yapılacak işlem:** işletim ve içerik koşullarından sonra küçük bir grupla gerçek
giriş, kaynak bulma ve soru çözme akışlarını uygula; kişi sayısını ihtiyaca göre
belirle, 50 kişiyi zorunlu alt sınır sayma.
**Tamamlanma kanıtı:** ölçüm dönemi, gerçek katılımcı sayısı, anonimleştirilmiş
bulgular ve her yeni sorunun mevcut plan içindeki görev kimliği.

İlgili kaynaklar: `scripts/kur-uygulama-rolu.ps1`, `ivme-yedek-al.ps1`, `ipucu-guvenli-aktar.py`, `frontend/src/activeTime.js`, `docs/KAYNAKLI_DERS_NOTLARI.md`, `docs/KAYNAKLI_SORU_ANALIZI.md`, `README.md`.

## Kopyalanacak prompt

```text
D:\workspace\ivme\uygulama projesinde 12. adımı uygula.
Önce AGENTS.md, docs/plan/00_YOL_HARITASI.md ve
 docs/plan/00_CALISMA_BAGLAMI.md dosyalarını oku.
Görev dosyası: docs/plan/12_KALAN_ICERIK_VE_YAYIN.md
Bu prompt uygulama talimatıdır. Bağımlılıkları ve mevcut kanıtları kontrol et;
biten işi yeniden yapma. Bu adımın ilk açık alt işinden başlayıp sırayla ilerle.
00_CALISMA_BAGLAMI.md içindeki kalıcı etiket/adlandırma/kaynak aralığı
kurallarını ve güncel sözlük/şema referanslarını kullan; ikinci sözlük oluşturma.
Görev için gereken kaynak parçasını oku; önce betik/önbellek, gerekirse AI.
Mevcut kullanıcı değişikliklerini, özgün kaynakları ve geçmiş kayıtlarını koru.
Gerçek veriyi sıfırlama; mevcut yetkiyi aşan yayın/push yapma.
Kabul ölçütlerini ilgili denetimlerle doğrula. Her biten alt işten sonra
00_CALISMA_BAGLAMI.md devam noktasını ve bu adımın kalan işlerini güncelle.
Kapanan alt işi listeden çıkar; yarım grubu çıktı/checkpoint ile kaydet.
Adım tamamen bitince kalıcı kuralları ve kanıtı koru, görev dosyasını sil.
Yol haritası/bağlantıları güncelle; kalan adımların numarasını değiştirme.
Genel karar veya bağımlılık değişirse yol haritası ve sözleşmeyi de güncelle.
Sonuçta değişikliği, doğrulama kanıtını ve sıradaki görev kimliğini kısa yaz.
```
