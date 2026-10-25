# Sistem rehberi — Uygulamada adlandırma ve erişim — soru filtreleri ve etiket eşleşmesi

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: match/categoryMatch, filtre sayımları, V44–V52 etiket anlık kayıtları.

## Soru filtreleri ve etiket eşleşmesi

Kütüphanenin `match`, soru/pratik/deneme seçiminin `categoryMatch` alanları aynı
`ANY/ALL` anlamındadır; gezinmede kategori dizisi ve `includeCandidates` korunur.
`SharedQuestionLabels` ve `learning_catalog.question_ids_for_labels`, gerçek
etkin banka sorularını aynı etkin öğretmen kararıyla seçer. Kaynak arşivi ve not
örnekleri pratik havuzuna girmez; kaynak damgası değişmiş soru yeniden etiketlenene
kadar eski kapsamla seçilmez.

Soru filtrelerindeki genel/ders sayımları ve açılır alanların tekil toplamları
aynı yayımlanmış banka havuzundan gelir; korunmuş eski soru künyesi ayrı bilgidir.
`question_ids_for_labels` sonucu geniş facet sorgularında `MATERIALIZED` sınırıyla
bir kez çözülür; etiket JSON'u yalnız kategori sayımında yüklenir. Çoklu sınav ve
ders ilişkileri genel toplamı çoğaltmaz. `category-counts` soru aramasında seçili
kaynak/sınav/ders/zorlukta gerçekten soru bulunan kimlikleri ve adetlerini sunar.
PDF/video için tanımlı fakat banka sorusu bulunmayan konu, soru önerisine girmez.

V52 ile aday kapsam tercihi yalnız seçili kategori ilişkisini daraltır; kategori
seçilmemiş genel/ders havuzunu sıfırlamaz. Seçili konuda adaylar kapalıysa yalnız
`CONFIRMED` veya güncel insan onaylı ilişkiler kullanılır; UI sıfırın nedenini
söyler ve adayları dahil etmeyi açık bir kullanıcı eylemiyle sunar. Aynı kural
`bankOnly=true` kütüphane sayımında korunur. İnsan onayı veya kaynak damgası
uydurulmaz; soru, cevap ve öğrenci geçmişi bu düzeltmeyle değiştirilmez.

V44 ortak etiket anlık kayıtlarını ve pratik seçim bağlamını, V46 deneme anındaki
onaylı alt konu/soru tipi anlık kayıtlarını saklar. Tarihsel boşluk bugünün
etiketleriyle doldurulmaz. Geçmiş öneri yalnız olay anındaki insan onaylı soru
tipiyle hesaplanır; otomatik kapsam etiketi insan onayı yerine geçmez.

V47 onaylı eski soru tiplerini soru kaynak damgasına bağlar. Geçmişte kaynak
damgası bulunmayan onaylar saklanır; güncel seçim için doğrulanmış sayılmaz.
`current_question_taxonomy` yalnız kaynağı hâlâ eşleşen insan kararını sunar.
`taxonomy:<nodeId>` mevcut soru tipi kimliğinin ortak gösterimidir; yeni bir konu
sözlüğü değildir. V48 ortak seçime `questionTypeId` ve `teacherDifficulty`
boyutlarını ekler. Öğretmen zorluğu yalnız güncel `APPROVE` kararından gelir;
otomatik zorluk, öğrenci oyu ve ölçülmüş başarı onun yerine kullanılmaz.
V49 güncel katalog görünümlerini tekil yayımlanmış sürümle sınırlar; geçmiş
kataloglar korunur ve her seçimde yeniden taranmaz.

Soru listesi `resource` içinde kütüphaneyle aynı öğrenci projeksiyonunu taşır;
özgün soru künyesi ayrıca korunur. `/items?key=…` en çok 100 kaynağı tek partide
döndürür. Müfredat soru sayıları `/coverage` içindeki tekil `bankCounts` değerini
kullanır; kaynak başlıklarını bağımsız alias listeleriyle yeniden eşlemez.
