# 7. Adım — çoklu etiketleri ve belirsiz kayıtları denetle

Bağımlılık: otomatik soru/PDF/video işleme tamam. Yöntem: makine denetimi + risk sıralı
inceleme + sabit örneklem. Manuel işaretli kayıt teknik devamı durdurmaz.

Bütün sorular ve PDF'ler en az bir Excel konusuna bağlıdır; kaynak başlığından veya
yakın konudan türetilen bağlar `CANDIDATE` ve “öğretmen onayı gerekiyor” işaretlidir
([kimlik ve sayım kuralları](../mimari/kimlikler-ve-sayim.md)). Eksik sayfa sınırları
`LOCATION_REVIEW`, eksik video zamanları `TIME_REVIEW` ile görünür. Bu adımdaki açık iş
insan/alan incelemesidir; tamamlanan çıkarım yeniden yapılmaz. Gerçek öğretmen kararı
henüz yoktur (`content_reviews` boş).

Risk kuyruğu ve tabakalı örneklem `scripts/content-label-audit.py` ile üretilir
(`veri/content-labels/audit.json`, `quality-review-queue.jsonl`); aynı kuyruğu yeniden
üretmek insan incelemesini tamamlamaz.

## 07.02 — Risk kuyruğunu çöz ve bağımsız örneklemi incele

Durum: `BEKLIYOR_ALAN_UZMANI`. Teknik hat hazır; kaynakları gerçekten incelemiş alan
uzmanının kararları yok. Otomatik etiketler ve manuel neden kodları DB'de korunur; bu
durum insan onayı veya kesin sayfa/zaman kapsamı değildir.

- Hazır risk kuyruğunu kaynak kanıtıyla incele: eksik kaynak/branş uyuşmazlığı, düşük güven, çelişen aday ve görsel/başlık dayanaklı kapsam için gerçek alan kararı kaydet. Düşük güvenli kayıt etiketsiz bırakılmasın.
- `ordinaryAndFlaggedReviewSample` içindeki yüksek güvenli/kuyruk dışı sabit örneklemi bağımsız incele. Hata bulunursa etkilenen kural grubunu yeniden tara.
- Gerçekten çok konulu kapsamı onayla; birbirini dışlayan adaylardan uygun olanı seç veya düşük güvenli adayları koru. “Çok etiket” belirsizliği saklamak için kullanılmasın.

Kabul: çözülen, düzeltilen, belirsiz ve kaynağı bekleyen ilişkiler ayrı; kalan her kaydın nedeni ve sonraki eylemi belli.

**Gereken kişi/girdi:** ilgili dersin alan uzmanı ve inceleyeceği kaynak PDF, soru
görseli veya video bölümü. Bu kararlar otomatik öğretmen onayıyla doldurulamaz.
**Yapılacak işlem:** Öğretmen Doğrulaması ekranında branşı aç, **Tahmini etiketleri
göster** filtresini seç; önce PDF, sonra Soru → **Bütün kaynaklar** üzerinden kaynağı
aç; doğru konuyu işaretleyip **Konuları kaydet ve sonraki** ile kaydet. Kaynak hâlâ
okunamıyorsa belirsiz bırak ve nedenini yaz.
**Tamamlanma kanıtı:** kaynak sürümüne bağlı gerçek karar ve karar geçmişi; örneklem
sonucu ve bulunan hataların etkilediği kural grubu. Ekrandaki **Kararları indir**
çıktısı devir kanıtıdır. İncelenmeyen videoya zaman, incelenmeyen PDF'ye kesin sayfa
sınırı yazılmaz.

## 07.03 — İnsan incelemesi ve içerik düzeltmesini ayır

Durum: `BEKLIYOR_OGRETMEN_KARARI`. 200 soruluk TYT Türkçe çevrimdışı inceleme paketinin
soru listesi `ornek-veri/altin-ornek-inceleme-200.csv` içindedir; paket dosyası yerelde
yoktur ve gerektiğinde güncel katalogla yeniden üretilir. Gerçek öğretmen kararı yoktur.

- Paketi üret, gerçek öğretmen kararlarını al ve doğrulanmış aktarım betiğiyle kaydet. Soru/görsel/sözlük bağı geçerli eski kararı yeniden isteme. Kullanıcının uzmanlık alanı dışındaki derslerde otomatik insan onayı yazma.
- AI önerilerini gerçek kararlarla branş/etiket türü bazında karşılaştır; örneklem yetersizse doğruluk sonucu uydurma.

Kaynak/cevap/kırpım hazırlığı `scripts/content-correction-package.py` ile ayrı, kimlik
ve hash bağlı kanıt paketine aktarılır; uygulanacak içerik kararları
[12.01'de](12-icerik-ve-yayin.md) kalır.

Kabul: öğretmen kararı öneriden ayrılıyor; kaynak değişince karar eskimiş oluyor; düzeltilecek kayıt kimlikleri ve etkisi açık.

**Gereken kişi/girdi:** Türkçe öğretmeninin 200 soru için verdiği gerçek kararları
taşıyan `tyt-turkce-ogretmen-kararlari-*.json`.
**Yapılacak işlem:**

```powershell
..\.venv\Scripts\python.exe -X utf8 -B scripts/ogretmen-inceleme-paketi.py   # veri/ogretmen-inceleme-tyt-turkce-200.zip
..\.venv\Scripts\python.exe -X utf8 -B scripts/ogretmen-inceleme-aktar.py 'KARAR_DOSYASININ_TAM_YOLU.json'
```

ZIP'i bir klasöre çıkar, `index.html` dosyasını tarayıcıda aç; öğretmen adını yaz,
soruları incele ve her oturum sonunda **Kararları dosyaya indir** düğmesini kullan. Son
JSON doğrulamadan geçerse aynı aktarım komutuna `--apply` eklenir; bu işlem tek başına
uygulama veritabanına öğretmen onayı yayımlamaz. Ardından AI karşılaştırması gerçek
kararlar üzerinden üretilir.
**Tamamlanma kanıtı:** 200 sorunun gerçek inceleme durumu, aktarım doğrulaması ve
branş/etiket türü bazında karşılaştırma. Belirsiz/ret kararı da gerçek karardır.

İlgili kaynaklar: `scripts/content-label-audit.py`, `ogretmen-inceleme-paketi.py`, `ogretmen-inceleme-aktar.py`, `backend/.../review/ContentReviewService.java`, `frontend/src/pages/TeacherReview.jsx`, `testler/content-labels.mjs`.
