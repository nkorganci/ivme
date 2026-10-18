# 7. Adım — çoklu etiketleri ve belirsiz kayıtları denetle

Bağımlılık: otomatik soru/PDF/video işleme tamam. Yöntem: makine denetimi + risk sıralı inceleme + sabit örneklem. Kullanıcının ek talimatıyla manuel işaretli kayıt teknik devamı durdurmaz.

Otomasyonun devri `quality-review-queue.jsonl`, `audit.json`, `pdf-location-report.json`,
`pdf-fallback-report.json`, `video-content-index.json` içindedir. Bütün 81.626 asıl
soruda etiket ve kaynak kimliği var; 54.225 PDF sayfası tahmini kalır. PDF'de
59.586 sayfa tarandı; 3.464 ilk OCR ve 1.108 alternatif OCR yeniden kullanılabilir.
Alternatif yöntem 320 sayfayı kurtardı; 327 boş adayı ve 461 görsel/okunamayan
sayfa manuel işaretlidir. 1.073 başlık/bölüm dayanağı adaydır; tam anlam doğrulaması
yapılmış sayılmaz. Video RSS alternatifi 60 yeni tekil video buldu; 700 video ve
5 liste korunur. Üç altyazı pilotundaki genel yöntemler boş yanıt verdi; kalan
697 video için transkript incelenmiş gibi işaret yazılmaz. Bütün eksik zamanlar
`TIME_REVIEW`, eksik sayfa sınırları `LOCATION_REVIEW` ile görünürdür.
Bu dosyadaki açık iş insan/alan incelemesidir; tamamlanan çıkarım yeniden yapılmaz.
Risk sıralaması ve branş/tür/kanıt katmanlı sabit örneklem `audit.json` içinde
hazırdır; aynı kuyruğu yeniden üretmek insan incelemesini tamamlamaz.

## 07.02 — Risk kuyruğunu çöz ve bağımsız örneklemi incele

Kullanıcının bütün branşlar için seçtiği Ark referansında 237 ünite vardır.
Önceki 46 fizik başlığı da bu referansa yönlendirilir. Belirsiz ünite/sınıf
etiketleri tahmini olarak korunur; hiçbir soru/PDF etiketsiz bırakılmaz.
Öğretmen Doğrulaması ekranında **Tahmini etiketleri göster** filtresiyle
tek tek kontrol edilir. Önce PDF, sonra Soru → Bütün kaynaklar üzerinden kaynak
açılır; uygun referans ünitesi **Konuları kaydet ve sonraki** ile kaydedilir.
Bu insan kararları gelmeden belirsiz kayıtlar doğru sınıflandırılmış sayılmaz.
Teknik sözleşme ve tekrar üretim kuralları sistem rehberindedir;
güncel sayım/kabul kanıtı çalışma bağlamından izlenir.

Durum: `BEKLIYOR_ALAN_UZMANI`. Teknik hat hazır; kaynakları gerçekten incelemiş
alan uzmanının kararları henüz yok. Otomatik etiketler ve manuel neden kodları
DB'de korunur; bu durum insan onayı veya kesin sayfa/zaman kapsamı değildir.

- Hazır risk kuyruğunu kaynak kanıtıyla incele: eksik kaynak/branş uyuşmazlığı, düşük güven, çelişen aday ve görsel/başlık dayanaklı kapsam için gerçek alan kararı kaydet. Düşük güvenli kayıt etiketsiz bırakılmasın.
- `ordinaryAndFlaggedReviewSample` içindeki yüksek güvenli/kuyruk dışı sabit örneklemi bağımsız incele. Hata bulunursa etkilenen kural grubunu yeniden tara.
- Gerçekten çok konulu kapsamı onayla; birbirini dışlayan adaylardan uygun olanı seç veya düşük güvenli adayları koru. “Çok etiket” belirsizliği saklamak için kullanılmasın.

Kabul: çözülen, düzeltilen, belirsiz ve kaynağı bekleyen ilişkiler ayrı; kalan her kaydın nedeni ve sonraki eylemi belli.

**Gereken kişi/girdi:** ilgili dersin alan uzmanı ve inceleyeceği kaynak PDF,
soru görseli veya video bölümü. Bu kararları otomatik öğretmen onayıyla dolduramam.
**Yapılacak işlem:** Öğretmen Doğrulaması ekranında branşı aç; önce riskli
kaynakları, sonra `ordinaryAndFlaggedReviewSample` örneklemini incele. Konu/alt
konu, doğrudan veya ikincil ilişki, sayfa/zaman aralığı ve gerekçeyi kaydet.
Kaynak hâlâ okunamıyorsa belirsiz bırak ve nedenini yaz; başka kayda geç.
**Tamamlanma kanıtı:** kaynak sürümüne bağlı gerçek karar ve karar geçmişi;
örneklem sonucu ve bulunan hataların etkilediği kural grubu. Ekrandaki
**Kayıtlı kararları indir** çıktısı devir kanıtıdır. İncelenmeyen videoya zaman,
incelenmeyen PDF'ye kesin sayfa sınırı yazılmaz.

## 07.03 — İnsan incelemesi ve içerik düzeltmesini ayır

Durum: `BEKLIYOR_OGRETMEN_KARARI`. 200 soruluk devir paketi hazır; gerçek
öğretmen karar JSON'u gelmediği için aktarım ve bağımsız doğruluk karşılaştırması
tamamlanamaz. Gerekli dosya ve doğrulama komutu aşağıdadır.

Güncel [200 soruluk çevrimdışı paket](../../veri/content-labels/human-review/labels-v1-00509791e46290a42506896e-turkce-200.zip)
`labels-v1-00509791e46290a42506896e` kaynak bağlarını taşır; paket kimliği
`7755111fcd59cfde`dir. İlgisiz katalog yayını paket kimliğini değiştirmez.
Önceki paketlerin değişmemiş kaynak/görsel/sözlük bağları da aktarımda kabul edilir.
Gerçek öğretmen kararı henüz yoktur.

- Güncel Türkçe 200 soruluk pakete gerçek öğretmen kararlarını al ve doğrulanmış aktarım betiğiyle kaydet. Soru/görsel/sözlük bağı geçerli eski kararı yeniden isteme. Kullanıcının uzmanlık alanı dışındaki derslerde otomatik insan onayı yazma.
- AI önerilerini gerçek kararlarla branş/etiket türü bazında karşılaştır; örneklem yetersizse doğruluk sonucu uydurma. Bu çalışma genel geçici etiketlemeyi durdurmasın.

Kaynak/cevap/kırpım hazırlığı `scripts/content-correction-package.py` ile ayrı,
kimlik ve hash bağlı kanıt paketine aktarılır; uygulanacak içerik kararları
[12.01'de](12_KALAN_ICERIK_VE_YAYIN.md) kalır. İki kırpım hash denetimli türetilmiş
gösterim olarak uygulanmıştır; özgün dosya, cevap ve öğrenci geçmişi korunur.

Kabul: öğretmen kararı öneriden ayrılıyor; kaynak değişince karar eskimiş oluyor; düzeltilecek kayıt kimlikleri ve etkisi açık.

**Gereken kişi/girdi:** Türkçe öğretmeninin 200 soru için verdiği gerçek kararları
taşıyan `tyt-turkce-ogretmen-kararlari-*.json`. Henüz böyle bir karar dosyası yok.
**Yapılacak işlem:** yukarıdaki ZIP'i bir klasöre çıkar; `index.html` dosyasını
tarayıcıda aç. Öğretmen adını/kimliğini yaz, soruları incele ve her oturum sonunda
**Kararları dosyaya indir** düğmesini kullan. Son JSON geldiğinde önce doğrula:

```powershell
..\.venv\Scripts\python.exe -X utf8 -B scripts/ogretmen-inceleme-aktar.py 'KARAR_DOSYASININ_TAM_YOLU.json'
```

Doğrulama geçerse aynı komuta `--apply` eklenerek kararlar inceleme CSV'sine
aktarılır; bu işlem tek başına uygulama veritabanına öğretmen onayı yayımlamaz.
Ardından AI karşılaştırması gerçek kararlar üzerinden üretilir.
**Tamamlanma kanıtı:** 200 sorunun gerçek inceleme durumu, aktarım doğrulaması ve
branş/etiket türü bazında karşılaştırma. Belirsiz/ret kararı da gerçek inceleme
kararıdır; bütün soruları uygun yapmak gerekmez. Alan kararı gelmeden bağımsız
doğruluk oranı veremem.

İlgili kaynaklar: `scripts/content-label-audit.py`, `ogretmen-inceleme-aktar.py`, `backend/.../review/ContentReviewService.java`, `frontend/src/pages/TeacherReview.jsx`, `testler/content-labels.mjs`.

## Kopyalanacak prompt

```text
D:\workspace\ivme\uygulama projesinde 7. adımı uygula.
Önce AGENTS.md, docs/plan/00_YOL_HARITASI.md ve
 docs/plan/00_CALISMA_BAGLAMI.md dosyalarını oku.
Görev dosyası: docs/plan/07_KALITE_VE_INCELEME.md
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
