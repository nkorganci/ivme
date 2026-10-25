# Deneme

[Mimari dizini](README.md) · Ne zaman okunur: Deneme planı, kapsam, yıla ait sınav, arşiv konumları.

## Deneme ve sınav arşivi

Deneme formunda kaynak adları seçilen sınava göre “TYT Çıkmış Sorular” /
“TYT Soru Bankası” veya AYT karşılıklarıyla gösterilir. Sınav değişince adlar ve
soru havuzu birlikte değişir. Sayım (`/api/exams/plan`) ve oluşturma
(`/api/exams/full`) aynı `examType`, banka ve AYT alanı seçimini kullanır;
iki bankanın birlikte seçilmesi TYT ve AYT havuzlarını birleştirmez.

Denemede `includeSolved` URL'de korunur; varsayılan `true`, `false` seçimi hem
plan hem oluşturmada `NEW` havuzunu kullanır. Öğrencinin pratik `ANSWER`
olayları ve teslim edilmiş denemelerde yanıtladığı sorular dışlanır; başka
öğrencinin geçmişi, açık deneme veya boş cevap çözülen soru sayılmaz.
Yetersiz branşta tekrar sorularına sessiz dönüş yapılmaz.

`ExamPlanService` planı `REPEATABLE_READ` salt okunur işlemde kurar.
`QuestionAvailabilityService.countBySubject` bütün branş kotalarını tek SQL'de
hesaplar; `SharedQuestionLabels.subjectSelection` güncel katalog ve öğretmen
kararını bir kez çözer. Ortak `question_ids_for_labels` seçim kuralı korunur;
uygun kimlikler sorgu içindeki `MATERIALIZED` CTE'de yeniden kullanılır
([PostgreSQL sözleşmesi](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-CTE-MATERIALIZATION)).
`MIXED` sayımında öğrenci geçmişi okunmaz; diğer kiplerde mevcut pratik ve
teslim edilmiş deneme geçmişi tek kez birleştirilir. Boş kategori filtresi
bütün sözlüğü yüklemez; öğretmen kararı yoksa karar sözlüğü/hash taraması yapılmaz.

Dengeli deneme oluşturma ayrıca genel havuzu saymaz. Genel, branş ve özel
denemelerin hepsi `ExamTopicBalancer` kullanır. Güncel DB etiketleri ve öğretmen
kararları `canonicalTopicIds` üzerinden aynı seçilebilir Excel konularına çözülür; önkoşul
ilişkileri konu kapsamı sayılmaz. Seçilmiş konu/aday filtreleri korunur.
Genel denemenin Matematik kotası Geometriyi; AYT Felsefe Grubu kotası felsefe,
psikoloji, sosyoloji ve mantık branşlarını aynı ortak kimliklerle kapsar.
Her branşta önce deneme içinde en az temsil edilen ünite seçilir; eşitlikte
öğrencinin önceki denemelerinde daha az kullanılan, sonra daha eskiden sorulan
ünite öne gelir. Eşit adaylar rastgele seçilir. Soru sayısı ünite sayısını aşarsa
aynı sıra yeni turda sürer; havuzu tükenen ünite kalan soruları engellemez.
Çok etiketli soru ilişkili üniteleri birer kez temsil eder, aynı soru kimliği
denemede iki kez bulunmaz. Ünite eşleşmesi olmayan soru ancak bilinen ünite
havuzları yetmediğinde kullanılır; kaynak başlığından yeni kimlik üretilmez.

Deneme oluşturulurken bir sorunun birden fazla yayımlanmış ünite adı
`exam_questions.topic` alanında anlık metin olarak saklanır. V78 bu alanı
`text` tipine genişletir; çoklu ünite adları 160 karakteri aşsa da kesilmez.

Kapsam geçmişi yalnız aynı öğrencinin `IN_PROGRESS` ve `SUBMITTED` deneme
sorularından hesaplanır; boş cevap da sunulmuş sorudur. İptal edilen deneme ve
başka öğrencinin geçmişi kapsama eklenmez. Bu geçmiş `NEW/REPEAT/WRONG/MIXED`
uygunluk filtresinden bağımsızdır: yeni soru seçimi daha önce atlanan üniteyi
unutturmaz. Öğrenci satırı kilidi eşzamanlı iki oluşturmada bu sırayı korur.
Ünite eşlemesi tek toplu SQL'de yapılır; adaylar branş–ünite başına denemenin
toplam soru sayısıyla sınırlanır. Her branşın kotası ve gerçek havuz yetersizliği
kontrolü korunur. Kalıcı kullanıcı havuz önbelleği veya branş başına thread yoktur.

`examSource=year` seçimi formda “Yıla ait tam sınav” seçeneğini açar; `year`,
TYT/AYT ve AYT alanı yenilemede korunur. `GET /api/exams/archive` her kayıtlı
yılın branş hedeflerini, o yıldaki uygun özgün sorularını (`available`), eksik
sayısını (`estimatedQuestionCount`) ve tamamlama dahil başlatılabilirliğini (`ready`) verir.
`POST /api/exams/full` isteğindeki `year`, o yılın bütün uygun çıkmış sorularını
özgün kitapçık sırasında korur; çözülmüş soru filtresi kullanılmaz.
Güncel öğretmen görünürlüğü, kaynak damgası ve etkinlik koşulları uygulanır.
Yıla ait tam sınavda eksik/birleşik/inceleme bekleyen soruların
yerine aynı sınav türü ve dersten yayımlanmış uygun havuzdaki sorular seçilir;
çıkmış sorulara, ardından soru bankasına öncelik verilir. Özgün sorular tekrar
seçilmez; her soru kimliği bir denemede yalnız bir kez yer alır. Tamamlayıcılar
her dersin sonuna, tümü eksik dersler mevcut derslerden sonra eklenir. 120/80 soru,
branş kotaları ve 165/180 dakika korunur. Uygun havuz da yetersizse `ready=false`
kalır; eksik sorulu deneme kaydedilmez. Yıllı sınava konu dengelemesi uygulanmaz.

Tamamlayıcı soru için V60'taki `exam_questions.archive_provisional` oluşturma
anında kaydedilir. Oturum/sonuç DTO'sundaki `archiveProvisional`, masaüstü ve
mobilde “Tahmini soru” etiketini gösterir; başlık tamamlandığını belirtir.
Devam etme, bitirme ve sonuç okuma bu bilgiyi korur. Seçilen sorunun gerçek
kimliği, cevabı ve kaynak bilgisi kullanılır; başka yılın sorusu özgün soru diye
sunulmaz. Bu seçim öğretmen onayı veya arşivdeki kaynak eksiğinin çözümü sayılmaz.

Özgün sıra `exam_archive_positions` tablosundadır. V57/V58, korunmuş
`ham/sorular_son.json` kimliklerinden `scripts/official-exam-positions.py` ile
üretilir; kaynak hash'i göçte saklanır. Son tablo `question_code` ile bağlıdır;
sorular ilk kurulumda daha sonra içe alınsa veya silinse bile kaynak kimliği
korunur. Geometri kitapçıktaki Matematik testine dahildir. Birleşik kartlar ve
din muafiyeti alternatifleri standart 120/80 soru profiline eklenmez.
Bu kayıtlar soru metni, görsel, cevap, etiket veya eski öğrenci sonucu değiştirmez.

Çalışma başlığının altındaki tek sayısal satır AYT/TYT çıkmış soru ve
Soru Bankası-AYT/Soru Bankası-TYT toplamlarını ayrı gösterir. Genel toplam,
çözülen, doğru ve kalan mevcut yayımlanmış havuzdaki tekil soru kimliklerinden
hesaplanır; çoklu sınav etiketi toplamı çoğaltmaz. Kaynak rakamına tıklamak
sınav/banka filtresini değiştirir, eski konu/PDF kısıtını temizler.
`availability.correct` pratik ve teslim edilmiş deneme yanıtlarının tarih,
kaynak sırası ve olay kimliğiyle sıralanmış ilk yanıtının doğruluğunu sayar;
sonraki deneme cevap anahtarı güncel sorudan yeniden hesaplanmaz. Sayılar
ekrana dönüşte, odaklanmada ve sekme görünür olduğunda yeniden okunur.
Soru özeti kartı form kartıyla aynı 680 px üst sınırına sahiptir. `DataGrid.dense`
yalnız bu tabloda 12 px yazı, 4 px yatay boşluk ve 34 px başlık/satır yüksekliği
uygular; başlıklar ve sayılar ortalanır. İki soru bankası sütunu daha geniştir.
Community [tema kompaktlık parametreleri](https://www.ag-grid.com/react-data-grid/theming-compactness/)
kullanılır; dokunmatik yatay kaydırma çubuğu için gövde alt sınırı 50 px tutulur.
Mobilde tablo kendi içinde yatay kaydırılır, sayı satırı çubuğun altında kalmaz.
`fitContent` içerik genişliği gereken diğer çağrılar için korunur. Diğer tabloların varsayılan
genişlik ve hizalama ayarları ortak sarmalayıcıda korunur.
