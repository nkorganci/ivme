# Matematik konu listesi (9–12. sınıf, TYT → AYT)

Bu belge Konuyu Öğrenelim matematiğinin **tek takip listesidir**. Claude, Codex/ChatGPT ve
diğer agent'lar matematik içerik işine başlamadan önce bu listeyi okur. Kullanıcı
**mevcut ve yeni her konuya, konuya uygun laboratuvar eklenmesini** istedi.
Önce aşağıdaki lab kapsamına bak; ilk TYT lab eksiğinden konu sırasıyla baştan ilerle.
Lablar tamamlandıktan sonra ilk 🟡/⬜ içerik eksiğine geç. Eski ✅ içerik labı eksikse
yalnız eksik lab/hedef/aktarım kapsamı için yeniden açılır. Girdisi değişmemiş
bitmiş anlatımı, kaynağı veya soruları yeniden üretme; testleri sebepsiz tekrarlama.

**Öncelikli liste: TYT ve ortak konular.** Sınav kapsamı `TYT + AYT` olan konu tek
derstir; temel anlatım iki sınava hitap eder. AYT aşamasında aynı konuyu yeniden baştan
yazma; yalnız varsa AYT'ye özgü eksik bölümleri aynı ders içinde tamamla ve etiketle.
Yalnız AYT konuları bekler. Katalogdaki geniş başlık tek başına her alt konunun ortak
olduğunu göstermez; ortak etiket, AYT'ye özgü anlatımın tamamlandığı anlamına gelmez.

Uygulamadaki karşılığı: **Konuyu Öğrenelim → İçerik durumu**
(`/konuyu-ogrenelim/icerik-durumu`). Sınav kapsamı, bitti/eksik durumu ve kalan hazırlık
aynı ölçümden üretilir. Konu haritasındaki rozetler öğrencinin kişisel ilerlemesidir.

## İçerik “bitti” işareti ve laboratuvar kabulü

**İki kabul birlikte gerekir:** aşağıdaki otomatik dört içerik ölçütü + konu
hedeflerini karşılayan labın teknik kabulü. Otomatik tablo ve uygulamanın
`İçerik durumu` ekranı şu anda yalnız dört içerik ölçütünü hesaplar; lab durumunu
henüz hesaplamaz. Bu yüzden aşağıdaki ✅ ve bitti sayısı **içerik hazırlığıdır**;
genel konu hazırlığı tamamlandı diye yorumlanmaz. Lab durumu aynı belgedeki ayrı
tabloda elle, kapsam/kanıt/kalan işle tutulur; üretilen bölüme elle sütun eklenmez.

Bu doküman güncellemesi lab sayacını veya uygulama ekranını değiştirmez. Lab kabulünü
otomatik ölçüme bağlamak, gerçek lab kabul kayıtlarıyla yapılacak sonraki teknik iştir.

Durum sütunu elle yazılmaz. `node scripts/konu-ogrenme-kapsam.mjs --liste` ders dosyalarını
ölçer ve aşağıdaki tabloyu yeniden yazar; `--liste --kontrol` belge ölçümle uyuşmazsa
hata verir ve `python scripts/ivme.py kontrol` bunu commit öncesi çalıştırır. Bir satır
yalnız dört ölçütün hepsi sağlanınca ✅ olur:

1. **Ders derinliği** (bölme pilotu standardı): en az 8 bölüm, 20 gerekçeli çözümlü örnek,
   3 adım tamamlama, 4 etkileşimli keşif; her bölümde üç düzeyli `::duzey` ve `::sorgula`.
   Biçim ve matematik denetimi `testler/konu-ogrenme-bicim.test.mjs`,
   `testler/konu-ogrenme-derin.test.mjs` (ders `DERIN` listesine eklenir).
2. **Çıkmış soru:** en az 3 görseli okunmuş, cevabı DB anahtarıyla karşılaştırılmış rehberli
   ÖSYM çözümü (`::cikmis`, `WORKED_EXAMS`). Her birine aynı kalıpta özgün “benzer soru”
   (`::ornek`/`::soru`) eşlik eder. Çıkmış sorular `veri/sorular-tum.csv` kategorisinden
   seçilir; görsel başka konuyu soruyorsa kullanılmaz.
3. **Video protip:** iki TYT kampı listesindeki ilgili videodan en az 2 kaynaklı protip
   (alıntı + kare + koşul + karşı örnek; [video hattı](../islemler/video-kanit-hatti.md)).
   Listede o konuya video yoksa ölçüt uygulanmaz.
4. **Ders anlatım PDF'i:** yalnız özet değil, `pdfAnlatim` altındaki ders anlatım sunusu
   veya TYT video notu sayfaları okunmuş olmalı. Okunan dosya/sayfalar
   `scripts/matematik-konu-listesi.json` → `pdfOkundu` alanına yazılır (örn.
   `"TYT-AYT Ortak/Ders Anlatim Sunulari 9. Sinif/28 - SAYI PROBLEMLERI.pdf s.1-17"`).

Bu dört ölçüt teknik/yapısal içerik kabulüdür. Lab için ayrıca
[öğretim ve anlamlı doğrulama standardı](matematik-laboratuvari.md) uygulanır:
konuya uygun model, amaçlı öğrenci eylemi, neden/koşul, hataya özel geri bildirim,
bağımsız aktarım ve doğrulanmış gerçek soru eşlemesi gerekir. Dosya veya kaydırıcı
varlığı lab kabulü değildir. İçerik + lab teknik kabulü, öğretmen onayı veya
öğrencide ölçülmüş öğrenme anlamına gelmez; bu kabuller ayrıca raporlanır.

## Bir konuyu bitirme sırası

1. Önce lab tablosundaki ilk eksik TYT konusunu seç. Mevcut içerik durumunu
   `node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` ile denetle; komutun
   “sıradaki konu” çıktısı yalnız içerik ölçümüdür, lab ekleme sırasının yerine geçmez.
   İçerik zaten ✅ ise doğrudan 6. adıma geç.
2. `pdfAnlatim` dosyalarını oku (metin + gerekli sayfa görselleri); konunun alt başlıklarını,
   tanımlarını ve çözümlü örnek türlerini çıkar. Okunanı `pdfOkundu`'ya yaz.
3. `videolar` içinden konu anlatım videolarının altyazısını al, püf noktası adaylarını
   bul, karesiyle doğrula; görev/ipucu dosyası yaz ve `video protips` üret.
4. Çıkmış soruları görselinden çöz, CSV cevabıyla karşılaştır, `worked-*.js` kaydı ve
   kanıt satırı ekle ([öğretim sözleşmesi](konuyu-ogrenelim.md#pilot-derinliğindeki-dersler)).
5. `.ders` dosyasını 8 bölüme genişlet (eski kimlikler korunur; yeni bölümler `s1b`…),
   `frontend/src/learn/derin/<ders>.js` + `-cizim.jsx` keşiflerini yaz, `DERIN` listesine ekle.
6. Lab hedeflerini ve tipik yanılgıları seç; mevcut keşfi değerlendir, en uygun
   modeli kur/geliştir. Öğrenci eylemi → gerekçe → azalan yardım → yeni soruya
   aktarım akışını ve hedefe özgü gerçek soru bağını tamamla. Aynı pilotu kopyalama.
   Bitmiş içerikte 2–5. adımları baştan yapma; yalnız labın gerektirdiği boşlukları kapat.
7. Labı bağımsız matematik hesabı, sınır/koşul, yanlış cevap, ipucu, yeniden deneme,
   masaüstü/mobil ve klavye yollarıyla doğrula; kapsam/kanıt/kalanı lab satırına yaz.
   Görülmemiş soruda yardımsız çözüm ve gecikmeli aktarım için insan kabulünü ayrı tut.
8. İçerik değiştiyse ilgili denetimler: `node --test testler/konu-ogrenme-*.test.mjs`, `node scripts/cevap-anahtari.mjs`,
   banka (`node scripts/konu-ogrenme-banka.mjs`, `node scripts/ortak-set-tani.mjs --yaz`),
   `--kesif <ders>` UI testi; sonra `--liste`, `python scripts/ivme.py kontrol`, yerel commit.

İçerik ölçümü değişince bu listenin üretilen bölümünü aynı commit'te yeniden üret.
Lab kabulü/kapsamı değişince lab satırını, görev durumunu ve devirdeki sonraki somut
adımı güncelle. İçerik ve lab teknik kabulü birlikte olmadan konuyu genel olarak kapatma.

## Laboratuvar kapsamı ve devam sırası

**Yeni lab kabulüne göre:** TYT **9/32 teknik hazır**, AYT **0/24 teknik hazır**.
Teknik hazır: `temel-kavramlar`, `sayi-basamaklari`, `bolme-bolunebilme`, `ebob-ekok`, `rasyonel-sayilar`, `birinci-derece-denklemler`, `esitsizlikler`, `mutlak-deger`, `uslu-ifadeler`; kalan 47 konuda standarda göre kabulü
kayıtlı lab yok. Mevcut etkileşimli keşiflerin bulunması bu kabulün yapıldığı
anlamına gelmez; önce kullanılabilirlikleri değerlendirilir.

**Sıradaki çalışma:** `koklu-ifadeler` labı; sonra `carpanlara-ayirma` ve aşağıdaki TYT sırası. Her konu [ortak lab motoruyla](matematik-laboratuvari.md#ortak-lab-motoru-mat-lab-02)
yazılır: `konular/<konu>.js` + çizim + bağımsız matematik testi + UI akışı + kabul
manifesti; gerçek sorular görseli okunarak seçilir. Yeni konu hazırlanırken lab aynı
konu paketi içinde yapılır. TYT içerik ve lab açıkları tamamlanınca AYT sırasına geçilir.

`LAB YOK`: bu standarda göre kabul kaydı yok. `KISMİ`: lab var, hedef/kanıt eksiği
var. `TEKNİK HAZIR` (✅): kritik hedefler, bağımsız aktarım ve teknik/UI kabulü tamam;
öğretmen ve öğrenci değerlendirmesi ayrıca belirtilir. Her kabul değişiminde durum,
kapsanan/açık hedefler, kanıt bağlantısı ve üstteki sayım güncellenir. Yeni konu
kimliği eklenirse lab tablosuna da aynı kimlikle satır eklenir. Teknik kabulden önce insan
ölçümü yapılması şart değildir; ölçülmemiş etki başarı diye sunulmaz.

Aşağıdaki model önerileri **adaydır**. Gerçek sorudaki öğrenme ihtiyacına göre daha
etkili temsil veya etkileşim seçilebilir; aynı ekran veya etkinlik bütün konulara
zorlanmaz. Ortak model birden çok satıra hizmet edebilir; her satırın hedef ve
aktarım kabulü ayrı tamamlanır. Kurallar [lab sözleşmesindedir](matematik-laboratuvari.md).

### TYT ve ortak konuların labları

| Konu kimliği | Lab durumu / kabul kanıtı | İlk hedef ve uygun model adayı |
|---|---|---|
| `temel-kavramlar` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/temel-kavramlar.json`; öğretmen/öğrenci kabulü yok | Tek–çift pilotu + sayı kümeleri, işaret/sıralama, ardışık, uç değer hedefleri; 10 doğrulanmış ÖSYM sorusu. Açık: işlem önceliği labda yok (ders keşfi) |
| `sayi-basamaklari` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/sayi-basamaklari.json`; öğretmen/öğrenci kabulü yok | Çözümleme (AB−BA), yer değişimi/elde, rakam koşulu (en büyük/küçük), basamak sayısı ve sondaki sıfırlar; 7 doğrulanmış ÖSYM sorusu. Basamak sayısı hedefinde bankada eşleşen soru yok |
| `bolme-bolunebilme` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/bolme-bolunebilme.json`; öğretmen/öğrenci kabulü yok | Bölme algoritması (kalan < bölen), kuralla aday üretme (3/4/9/11), bileşik kural (3·4 vs 2·6 karşı örneği), kalan ve döngü (iki döngü, EKOK); 10 doğrulanmış ÖSYM sorusu |
| `ebob-ekok` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/ebob-ekok.json`; öğretmen/öğrenci kabulü yok | Asal çarpan ve bölen sayısı, EBOB·EKOK = a·b, EBOB mu EKOK mu (bölme/kurma), periyodik olaylar; 8 doğrulanmış ÖSYM sorusu (5’i Sayı Kümeleri kataloğundaki komşu bankalardan) |
| `rasyonel-sayilar` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/rasyonel-sayilar.json`; öğretmen/öğrenci kabulü yok | Ortak bölme (EKOK ızgarası), ölçek okuma (eş aralık, ondalık), devirli ondalık → kesir, sıralama ve ara kesir; 6 doğrulanmış ÖSYM sorusu. Devirli hedefinde bankada eşleşen soru yok |
| `birinci-derece-denklemler` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/birinci-derece-denklemler.json`; öğretmen/öğrenci kabulü yok | Denk işlem (terazi, tek kefeye işlem tuzağı), çözüm yok/sonsuz (iki doğru), denklem sistemi (kesişim), istenen ifade (denklemin katı); 6 doğrulanmış ÖSYM sorusu (aynı kategorideki eşitsizlik bankasından). Özel durum hedefinde eşleşen soru derste çözülmüş |
| `esitsizlikler` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/esitsizlikler.json`; öğretmen/öğrenci kabulü yok | Aralık ve tam sayılar (açık/kapalı uç), yön değişimi (kx+c eşlemesi), ifadenin aralığı (farkta çapraz uç, karede 0), iki bilinmeyenli tam sayı bölgesi; 5 doğrulanmış ÖSYM sorusu. İfade aralığı hedefinde uygun soru derste çözülmüş |
| `mutlak-deger` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/mutlak-deger.json`; öğretmen/öğrenci kabulü yok | Uzaklık (\|x−a\|=r iki nokta), işarete göre açma (parçalı ifade, kritik noktalar), bant (merkez ± yarıçap), uzaklıklar toplamı (ortanca); 7 doğrulanmış ÖSYM sorusu |
| `uslu-ifadeler` | ✅ TEKNİK HAZIR — [kabul kaydı](matematik-laboratuvari.md#konu-kabul-kayıtları), `testler/kanit/lab/uslu-ifadeler.json`; öğretmen/öğrenci kabulü yok | Negatif taban ve parantez, kuvvet kuralları (çarpma/üssün üssü), ortak paranteze alma ve büyüme, ortak üsle sıralama; 5 doğrulanmış ÖSYM sorusu. Negatif taban ve sıralama hedeflerinde eşleşen soru yok/derste çözülmüş |
| `koklu-ifadeler` | ⬜ LAB YOK | Alan–kenar, çarpan çıkarma ve eşlenik; tanım koşulu ve sahte kökü denetle |
| `carpanlara-ayirma` | ⬜ LAB YOK | Alan/parçalama ve çözüm karşılaştırma; yapıyı tanı, sadeleştirmede yasak değeri koru |
| `oran-oranti` | ⬜ LAB YOK | Eş ölçekli çubuklar ve birim oran; doğru/ters orantıyı ve korunan miktarı ayır |
| `sayi-kesir-problemleri` | ⬜ LAB YOK | Parça–bütün ve miktar kurma; bütünün kesri ile kalanın kesrini ayır |
| `yas-isci-problemleri` | ⬜ LAB YOK | Yaş zaman çizgisi ve iş/hız birikimi; değişmeyen yaş farkını, toplam hızı ve birimleri kur |
| `yuzde-karisim` | ⬜ LAB YOK | Bütün, yüzde tabanı ve saf madde korunumu; değişen payda/yoğunluğu açıkla |
| `kar-zarar` | ⬜ LAB YOK | Maliyet/satış referansı ve ardışık fiyat değişimi; yüzde tabanını seç |
| `hareket-problemleri` | ⬜ LAB YOK | Konum–zaman ve kapanan mesafe; yön, bağıl hız ve mola koşullarını modele bağla |
| `grafik-rutin-olmayan` | ⬜ LAB YOK | Tablo/grafikten kısıt çıkarma ve strateji seçimi; gereksiz bilgiyi ele |
| `veri-grafikleri` | ⬜ LAB YOK | Aynı verinin farklı grafikleri; ölçek ve sunum değişince değişmeyen bilgiyi oku |
| `merkezi-egilim` | ⬜ LAB YOK | Veri noktalarını değiştir; ortalama/ortanca/yayılım ve aykırı değerin etkisini ayır |
| `onermeler` | ⬜ LAB YOK | Doğruluk durumları kurma ve yanlış çıkarımı onarma; bağlaçların anlamını ayır |
| `kosullu-onerme` | ⬜ LAB YOK | Koşul, karşı durum ve niceleyici; bir örnek, karşı örnek ve genel iddiayı ayır |
| `kumeler-temel` | ⬜ LAB YOK | Eleman/alt küme kurma; üyelik, kapsama ve boş küme durumlarını ayır |
| `kume-islemleri` | ⬜ LAB YOK | Bölge seçimi ve ortak eleman sayımı; kesişim/birleşim/tümleyeni soruya çevir |
| `fonksiyon-kavrami` | ⬜ LAB YOK | Girdi–çıktı eşleme; fonksiyon olma, tanım/görüntü ve bire birlik koşullarını sına |
| `fonksiyon-grafikleri` | ⬜ LAB YOK | Bağlı tablo–grafik–cebir; eğim, kesişim ve temsil değişiminde aynı ilişkiyi tanı |
| `bileske-ters` | ⬜ LAB YOK | İşlem makineleri ve ters adımlar; sıra ile tanım/görüntü koşullarını koru |
| `polinom-islemleri` | ⬜ LAB YOK | Katsayı/terim yapısı, bölme ve yerine koyma; hangi stratejinin neden işe yaradığını seç |
| `ikinci-derece-denklemler` | ⬜ LAB YOK | Alan/parabol ve çarpanlar; kök, diskriminant ve çözüm yöntemi seçimini ilişkilendir |
| `sayma-permutasyon` | ⬜ LAB YOK | Küçük örnek uzay ve sistematik listeleme; sıra, koşul ve tekrar saymayı denetle |
| `kombinasyon` | ⬜ LAB YOK | Seçim ile sıralamayı karşılaştır; aynı grubu tekrar saymayı görünür kıl |
| `olasilik` | ⬜ LAB YOK | Eş olasılıklı örnek uzay kurma; deneysel sıklık ile teorik olasılığı ayır |

### AYT konularının labları (TYT sonrasında)

| Konu kimliği | Lab durumu | İlk hedef ve uygun model adayı |
|---|---|---|
| `binom` | ⬜ LAB YOK | Seçim yolları ve açılım katsayıları; terim seçimiyle kombinasyon bağını kur |
| `kosullu-olasilik` | ⬜ LAB YOK | Koşulla daralan örnek uzay; bağımsızlık ve değişen paydayı ayır |
| `ispat-yontemleri` | ⬜ LAB YOK | İspat adımı kurma/hata bulma; örnek, karşı örnek ve genel ispatı ayır |
| `karmasik-sayilar` | ⬜ LAB YOK | Karmaşık düzlemde işlemler; cebirsel sonuçla geometrik temsili ilişkilendir |
| `ikinci-derece-esitsizlikler` | ⬜ LAB YOK | İşaret çizelgesi ve aralık; kök, katlı kök ve tanımsız noktayı ayır |
| `denklem-esitsizlik-sistemleri` | ⬜ LAB YOK | Eğri/bölge kesişimleri; ortak çözümü cebir ve grafikle kontrol et |
| `fonksiyon-donusumleri` | ⬜ LAB YOK | Grafik dönüşümleri; değişkenin içindeki/dışındaki işlemleri karşılaştır |
| `parabol` | ⬜ LAB YOK | Katsayı, kök ve tepe noktası; cebirsel biçimi amaca göre seç |
| `trigonometri-acilar` | ⬜ LAB YOK | Birim çemberde açı ve yay; derece/radyan, yön ve bölgeyi ilişkilendir |
| `trigonometrik-fonksiyonlar` | ⬜ LAB YOK | Çember–grafik geçişi; işaret, periyot ve tanım koşullarını çıkar |
| `sinus-kosinus-teoremleri` | ⬜ LAB YOK | Üçgeni değiştir; verilenlere göre teorem seç, mümkün üçgen koşulunu denetle |
| `ters-trigonometrik-fonksiyonlar` | ⬜ LAB YOK | Kısıtlı aralıkta ters eşleme; esas değer ve tanım/görüntü koşullarını koru |
| `toplam-fark-iki-kat` | ⬜ LAB YOK | Açı bileşimi ve özdeşlik yapısı; uygun dönüşümü seç, sayısal denemeyi ispat sayma |
| `trigonometrik-denklemler` | ⬜ LAB YOK | Çemberde kök ve periyot; aralık kısıtını ve kaybolan/fazladan çözümleri denetle |
| `ustel-fonksiyon` | ⬜ LAB YOK | Tekrarlı çarpan ve grafik; tabana göre artış/azalışı ve sınırları ilişkilendir |
| `logaritma` | ⬜ LAB YOK | Üstel ilişkiyi tersine çevir; taban/iç koşulları ve işlem kurallarını gerekçelendir |
| `diziler` | ⬜ LAB YOK | Terim–indis ve fark/oran; örüntü tahmini ile genel terimin gerekçesini ayır |
| `limit` | ⬜ LAB YOK | İki yandan yaklaşma ve tablo/grafik; fonksiyon değeriyle limiti ayır |
| `sureklilik` | ⬜ LAB YOK | Nokta değeri ve iki yan limit; üç koşulu birlikte denetle |
| `turev` | ⬜ LAB YOK | Sekant–teğet ve değişim oranı; geometrik sezgiyi limit ve sembolik işleme bağla |
| `turev-uygulamalari` | ⬜ LAB YOK | İşaret, artış/azalış ve optimizasyon; kritik nokta ile gerçek uç değeri ayır |
| `belirsiz-integral` | ⬜ LAB YOK | Ters türev ve fonksiyon ailesi; sabitin rolünü türevle sağla |
| `belirli-integral` | ⬜ LAB YOK | Bölümlere ayırma ve birikim; işaretli integral ile geometrik alanı ayır |
| `integral-uygulamalari` | ⬜ LAB YOK | Bölgeyi parçalama ve uygun sınır seçimi; alan/hacmi problemdeki niceliğe bağla |

## Otomatik içerik listesi

<!-- liste:basla (node scripts/konu-ogrenme-kapsam.mjs --liste üretir; elle düzenleme) -->
TYT: **15/32 bitti**. Sıradaki TYT konusu: `kar-zarar`.

### TYT (şu anki aşama)

| # | Durum | Kimlik | Konu | Sınıf | Sınav kapsamı | Bölüm/örnek/tamamla/keşif | Rehberli çıkmış / TYT 2018–26 | Video protip · liste | PDF okundu | Kalan iş |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ✅ BİTTİ | `temel-kavramlar` | Sayı Kümeleri ve Temel Kavramlar | 9 | TYT + AYT | 10/28/3/5 | 4 / 50 (Sayı Kümeleri) | 2 · PL1 10, PL2 10 | 3/3 | — · PDF karşılaştırmasında eksik bulunan dört kalıp eklendi: harfli ardışık çift ifadeler (±2), bir sayının ardışık katları, ortak harfli iki çarpım, irrasyonel katsayıları sıfırlama. |
| 2 | ✅ BİTTİ | `sayi-basamaklari` | Sayı Basamakları | 9 | TYT + AYT | 8/22/3/6 | 5 / 50 (Sayı Kümeleri) | 3 · PL1 2, PL2 0 | 2/3 | — · PDF karşılaştırmasıyla iki kalıp eklendi: AB+BA=(A+B)² / AB−BA=A²−B² türü ve ABC+BCA+CAB=111(A+B+C). |
| 3 | ✅ BİTTİ | `bolme-bolunebilme` | Bölme ve Bölünebilme Kuralları | 9 | TYT + AYT | 8/27/3/4 | 4 / 11 (Bölünebilme Kuralları) | 2 · PL1 2, PL2 3 | 3/3 | — · Bu konunun OGM ders anlatım sunusu veya TYT video notu yok; konu özetleri ve MEBİ özeti okundu. MEBİ'deki “önce birler, sonra son iki/üç basamak, en son rakam toplamı” sırası dersteki aday-eleme stratejisiyle örtüşüyor. |
| 4 | ✅ BİTTİ | `ebob-ekok` | Asal Çarpanlar, EBOB–EKOK ve Periyodik Problemler | 9 | TYT + AYT | 10/28/4/6 | 3 / 50 (Sayı Kümeleri) | 2 · PL1 2, PL2 3 | 3/3 | — · Ders anlatım sunusu veya TYT video notu yok; özetler ve MEBİ kaynak, ders karşılıyor. Çıkmış: AYT_Sayisal-0022 (asal bölen kümeleri) eklendi; TYT-0713 ve AYT_Sayisal-0021 bağımsız aktarım sorusu. |
| 5 | ✅ BİTTİ | `rasyonel-sayilar` | Rasyonel Sayılar ve Ondalık Sayılar | 9 | TYT + AYT | 10/26/4/6 | 5 / 50 (Sayı Kümeleri) | 2 · PL1 4, PL2 5 | 2/4 | — · Kaynaklar dersle karşılaştırıldı; eklenen: a,b̄ + b,ā = 10 sayımı (0,9̄ = 1 tuzağı). Protip: teleskop çarpım ve kalanın kesri. |
| 6 | ✅ BİTTİ | `birinci-derece-denklemler` | Birinci Dereceden Denklemler ve Denklem Sistemleri | 9 | TYT + AYT | 8/25/5/5 | 3 / 28 (Birinci Dereceden Denklemler ve Eşitsizlikler) | 2 · PL1 2, PL2 1 | 3/4 | — · Sunu 12 aralık kavramını işler (eşitsizlikler dersinin kaynağı). Eklenen: derece koşulu, üçerli toplamlar. Protip: n nesne n−1 aralık; çözüm kümesi bütün sayılar için iki koşul. |
| 7 | ✅ BİTTİ | `esitsizlikler` | Aralıklar ve Birinci Dereceden Eşitsizlikler | 9 | TYT + AYT | 8/23/5/5 | 4 / 28 (Birinci Dereceden Denklemler ve Eşitsizlikler) | 2 · PL1 2, PL2 2 | 3/4 | — · Eklenen: (x+y)/(xy) = 1/x + 1/y ile aralık. Protip: fark aralığında negatifle çarpıp toplama; tam sayılarda uç değer seçimi. |
| 8 | ✅ BİTTİ | `mutlak-deger` | Mutlak Değer | 9 | TYT + AYT | 8/26/3/5 | 4 / 28 (Birinci Dereceden Denklemler ve Eşitsizlikler) | 2 · PL1 2, PL2 3 | 2/2 | — · Sunu 16 dosya adına rağmen denklem sistemlerini işler (birinci derece denklemler s3). Eklenen: işaret çarpanı |x|/x, ağırlıklı üç uzaklık toplamı. Protip: |a−b|=|b−a| ile birleştirme; sağ taraf x'liyse kök kontrolü. |
| 9 | ✅ BİTTİ | `uslu-ifadeler` | Üslü İfadeler ve Üslü Denklemler | 9 | TYT + AYT | 8/25/3/4 | 4 / 18 (Üslü İfadeler ve Denklemler) | 2 · PL1 2, PL2 5 | 3/4 | — · Kaynaklar dersle karşılaştırıldı; eklenen: farklı tabanları birbirine yerleştirme (5^x = 3, 9^y = 125). Protip: çift kuvvette iki durum; eşit oranlı dörtlüde x³ = a²d. |
| 10 | ✅ BİTTİ | `koklu-ifadeler` | Köklü İfadeler ve Köklü Denklemler | 9 | TYT + AYT | 8/26/3/4 | 4 / 18 (Üslü İfadeler ve Denklemler) | 2 · PL1 2, PL2 3 | 4/4 | — · Kaynak kalıpları (tanım aralığı, çift kökte |x|, eşlenik, derece eşitleme, kök içine alma, a±2√b) derste var. Çıkmış: TYT-0641, TYT-0643 eklendi. Protip: karesiz kalan çarpan; kök derecesi kadar kuvvet ve çift kökte kontrol. |
| 11 | ✅ BİTTİ | `carpanlara-ayirma` | Çarpanlara Ayırma ve Rasyonel İfadeler | 10 | TYT + AYT | 8/25/3/4 | 3 / 3 (Polinomlar) | 2 · PL1 2, PL2 2 | 4/4 | — · 8 bölüme derinleştirildi (3 keşif modeli: ortak kenar, kare içinde kare, çapraz çarpım). Çıkmış: TYT-0792, TYT-0794, AYT_Sayisal-0095. Sunulardan eklenen: üslü ifadede değişken değiştirme, büyük sayılarda iki kare farkı, sadeleşen kesir parametresi. |
| 12 | ✅ BİTTİ | `oran-oranti` | Oran ve Orantı | 9 | TYT + AYT | 8/34/3/4 | 4 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 2 · PL1 2, PL2 4 | 3/3 | — · PDF karşılaştırmasıyla eklenenler: katsayılı genişletme, ax=by=cz, altın oran, dişli çark, oran zinciri, kalan kişi-gün, aritmetik/geometrik ortalama (hiçbir derste yoktu). Çıkmış: TYT-0701, TYT-0723 eklendi. |
| 13 | ✅ BİTTİ | `sayi-kesir-problemleri` | Sayı ve Kesir Problemleri | 9 | TYT + AYT | 8/23/3/4 | 4 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 2 · PL1 6, PL2 3 | 3/3 | — · 8 bölüme derinleştirildi (keşif: kuyrukta en çok/en az, kalanın kesri / bütünün kesri, hepsini ucuz say). Çıkmış: TYT-0651, 0655, 0659, 0660. Kaynaklardan: kuyruk, kutu dağıtımı, katlanan sayfa, zıplayan top, dolu/kısmen dolu kap, mum, tel orta noktası. |
| 14 | ✅ BİTTİ | `yas-isci-problemleri` | Yaş, İşçi ve Havuz Problemleri | 9 | TYT + AYT | 8/28/4/4 | 4 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 2 · PL1 4, PL2 2 | 2/2 | — · Doğum yılı, değişen grup, kişi-saat-verim, ikili ekip hızları, kısmi/dönüşümlü iş ve havuz sınırları eklendi. Son committeki üç keşif bağlandı. Görseli okunan TYT-0650, 0681, 0683, 0741 ve özgün benzerleri; PDF sayfa kanıtı kayıtlı. |
| 15 | ✅ BİTTİ | `yuzde-karisim` | Yüzde ve Karışım Problemleri | 9 | TYT + AYT | 8/24/3/4 | 3 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 2 · PL1 4, PL2 2 | 2/2 | — · Alt grup yüzdesi, yüzde puanı, ters değişim, ağırlıklı ortalama, çapraz farkın gerekçesi, tekrarlı dökme, saf madde ve buharlaşma sınırları. Tuz örnekleri kütle birimiyle düzeltildi; altyazıdaki %120 hatası kareden %20 doğrulandı. |
| 16 | 🟡 EKSİK | `kar-zarar` | Kâr–Zarar ve İndirim Problemleri | 9 | TYT + AYT | 4/8/2/1 | 0 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 2, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 17 | 🟡 EKSİK | `hareket-problemleri` | Hareket Problemleri | 9 | TYT + AYT | 4/8/2/1 | 1 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 2, PL2 2 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 1/3; video protip 0/2; ders anlatım PDF okunmadı |
| 18 | 🟡 EKSİK | `grafik-rutin-olmayan` | Rutin Olmayan Problemler: Grafik, Tablo ve Strateji | 9 | TYT + AYT | 4/8/1/1 | 0 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 1, PL2 2 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 19 | 🟡 EKSİK | `veri-grafikleri` | Verilerin Grafikle Gösterilmesi | 9 | TYT | 4/8/1/1 | 0 / 17 (Veri) | 0 · PL1 1, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 20 | 🟡 EKSİK | `merkezi-egilim` | Merkezi Eğilim ve Yayılım Ölçüleri | 9 | TYT | 4/8/1/1 | 0 / 17 (Veri) | 0 · PL1 1, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 21 | 🟡 EKSİK | `onermeler` | Önermeler ve Bileşik Önermeler | 9 | TYT + AYT | 4/8/2/1 | 0 / 6 (Önermeler ve Bileşik Önermeler) | 0 · PL1 2, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 22 | 🟡 EKSİK | `kosullu-onerme` | Koşullu Önerme ve Niceleyiciler | 9 | TYT + AYT | 4/8/1/1 | 0 / 6 (Önermeler ve Bileşik Önermeler) | 0 · PL1 2, PL2 1 | 0/1 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 23 | 🟡 EKSİK | `kumeler-temel` | Kümelerde Temel Kavramlar ve Alt Küme | 9 | TYT + AYT | 4/8/1/1 | 0 / 9 (Kümeler) | 0 · PL1 2, PL2 1 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 24 | 🟡 EKSİK | `kume-islemleri` | Kümelerde İşlemler ve Küme Problemleri | 9 | TYT + AYT | 4/8/2/1 | 0 / 9 (Kümeler) | 0 · PL1 4, PL2 2 | 0/5 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 25 | 🟡 EKSİK | `fonksiyon-kavrami` | Fonksiyon Kavramı ve Fonksiyon Çeşitleri | 10 | TYT + AYT | 4/8/1/1 | 0 / 11 (Fonksiyonlar) | 0 · PL1 4, PL2 4 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 26 | 🟡 EKSİK | `fonksiyon-grafikleri` | Fonksiyon Grafikleri ve Doğrusal Modeller | 10 | TYT + AYT | 4/8/1/1 | 0 / 11 (Fonksiyonlar) | 0 · PL1 2, PL2 2 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 27 | 🟡 EKSİK | `bileske-ters` | Bileşke Fonksiyon ve Ters Fonksiyon | 10 | TYT + AYT | 4/8/2/1 | 0 / 11 (Fonksiyonlar) | 0 · PL1 2, PL2 2 | 0/4 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 28 | 🟡 EKSİK | `polinom-islemleri` | Polinom Kavramı, İşlemler ve Bölme | 10 | TYT + AYT | 4/8/1/1 | 0 / 3 (Polinomlar) | 0 · PL1 0, PL2 2 | 0/4 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 29 | 🟡 EKSİK | `ikinci-derece-denklemler` | İkinci Dereceden Denklemler ve Kök-Katsayı İlişkileri | 10 | TYT + AYT | 8/24/3/4 | 3 / 3 (Polinomlar) | video yok | 0/3 | ders anlatım PDF okunmadı · İki TYT kampı listesinde ikinci derece denklem videosu yok; video ölçütü başka kaynak bulunana kadar uygulanamaz. |
| 30 | 🟡 EKSİK | `sayma-permutasyon` | Saymanın Temel İlkesi ve Permütasyon | 10 | TYT + AYT | 4/8/2/1 | 0 / 9 (Sıralama ve Seçme) | 0 · PL1 2, PL2 2 | 0/1 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 31 | 🟡 EKSİK | `kombinasyon` | Kombinasyon ve Seçme Problemleri | 10 | TYT + AYT | 4/8/1/1 | 0 / 9 (Sıralama ve Seçme) | 0 · PL1 2, PL2 2 | 0/1 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 32 | 🟡 EKSİK | `olasilik` | Olasılık: Basit Olayların Olasılıkları | 10 | TYT + AYT | 4/8/2/1 | 0 / 9 (Basit Olayların Olasılıkları) | 0 · PL1 2, PL2 2 | 0/4 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |

### AYT (TYT bitince)

| # | Durum | Kimlik | Konu | Sınıf | Sınav kapsamı | Bölüm/örnek/tamamla/keşif | Rehberli çıkmış / TYT 2018–26 | Video protip · liste | PDF okundu | Kalan iş |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 🟡 EKSİK | `binom` | Binom Açılımı ve Pascal Üçgeni | 10 | AYT | 4/8/2/1 | 0 / 9 (Sıralama ve Seçme) | 0 · PL1 2, PL2 1 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı · Katalogda yalnız AYT; iki TYT kampı da binomu işler. AYT aşamasında tamamlanır. |
| 2 | 🟡 EKSİK | `kosullu-olasilik` | Koşullu Olasılık, Bağımsız ve Bileşik Olaylar | 11 | AYT | 4/8/2/1 | 0 | video yok | 0/0 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; ders anlatım PDF okunmadı |
| 3 | ⬜ DERS YOK | `ispat-yontemleri` | Tanım, aksiyom, teorem ve ispat yöntemleri | 9 | AYT | — | — | — | 0/0 | ders yok |
| 4 | ⬜ DERS YOK | `karmasik-sayilar` | Karmaşık sayılar | 10 | AYT | — | — | — | 0/0 | ders yok |
| 5 | ⬜ DERS YOK | `ikinci-derece-esitsizlikler` | İkinci derece ve rasyonel eşitsizlikler | 11 | AYT | — | — | — | 0/0 | ders yok |
| 6 | ⬜ DERS YOK | `denklem-esitsizlik-sistemleri` | İkinci derece denklem ve eşitsizlik sistemleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 7 | ⬜ DERS YOK | `fonksiyon-donusumleri` | Fonksiyon uygulamaları ve dönüşümleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 8 | ⬜ DERS YOK | `parabol` | İkinci dereceden fonksiyon ve grafikleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 9 | ⬜ DERS YOK | `trigonometri-acilar` | Yönlü açılar, derece, radyan ve birim çember | 11 | AYT | — | — | — | 0/0 | ders yok |
| 10 | ⬜ DERS YOK | `trigonometrik-fonksiyonlar` | Trigonometrik fonksiyonlar ve grafikleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 11 | ⬜ DERS YOK | `sinus-kosinus-teoremleri` | Sinüs ve kosinüs teoremleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 12 | ⬜ DERS YOK | `ters-trigonometrik-fonksiyonlar` | Ters trigonometrik fonksiyonlar | 11 | AYT | — | — | — | 0/0 | ders yok |
| 13 | ⬜ DERS YOK | `toplam-fark-iki-kat` | Toplam, fark ve iki kat açı formülleri | 12 | AYT | — | — | — | 0/0 | ders yok |
| 14 | ⬜ DERS YOK | `trigonometrik-denklemler` | Trigonometrik denklemler | 12 | AYT | — | — | — | 0/0 | ders yok |
| 15 | ⬜ DERS YOK | `ustel-fonksiyon` | Üstel fonksiyon | 12 | AYT | — | — | — | 0/0 | ders yok |
| 16 | ⬜ DERS YOK | `logaritma` | Logaritma fonksiyonu ve denklemleri | 12 | AYT | — | — | — | 0/0 | ders yok |
| 17 | ⬜ DERS YOK | `diziler` | Gerçek sayı dizileri, aritmetik ve geometrik dizi | 12 | AYT | — | — | — | 0/0 | ders yok |
| 18 | ⬜ DERS YOK | `limit` | Limit | 12 | AYT | — | — | — | 0/0 | ders yok |
| 19 | ⬜ DERS YOK | `sureklilik` | Süreklilik | 12 | AYT | — | — | — | 0/0 | ders yok |
| 20 | ⬜ DERS YOK | `turev` | Anlık değişim oranı ve türev | 12 | AYT | — | — | — | 0/0 | ders yok |
| 21 | ⬜ DERS YOK | `turev-uygulamalari` | Türevin uygulamaları | 12 | AYT | — | — | — | 0/0 | ders yok |
| 22 | ⬜ DERS YOK | `belirsiz-integral` | Belirsiz integral | 12 | AYT | — | — | — | 0/0 | ders yok |
| 23 | ⬜ DERS YOK | `belirli-integral` | Belirli integral | 12 | AYT | — | — | — | 0/0 | ders yok |
| 24 | ⬜ DERS YOK | `integral-uygulamalari` | İntegralin alan ve diğer uygulamaları | 12 | AYT | — | — | — | 0/0 | ders yok |
<!-- liste:bitis -->

Sütunlar: *Bölüm/örnek/tamamla/keşif* ders dosyasından sayılır (hedef 8/20/3/4).
*Rehberli çıkmış*: derste görseli okunmuş ÖSYM çözüm sayısı / o kategorideki TYT
2018–2026 soru sayısı (kategori birden çok derse paylaşılır). *Video protip*: konu
sayfasındaki protip sayısı ve iki listedeki ilgili video sayısı. Video kimlikleri,
PDF yolları ve kategori eşlemesi `scripts/matematik-konu-listesi.json` içindedir;
listelerin tamamı `veri/video-hatti/listeler/tam/` altında (PL1 175, PL2 78 video).
