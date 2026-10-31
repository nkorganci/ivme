# Öğrenci ilerlemesi

[Mimari dizini](README.md) · Ne zaman okunur: /progress, Konu takibi, /gecmis, haftalık çizelge, öğrenci kayıtları.

## İlerleme, Konu takibi ve istatistik

`/progress?classification=CURRENT|HISTORICAL` oturumdaki öğrencinin her sorusunu
bir kez, ilk yanıtlandığı karşılaşmada sayar (tamamlanmış pratik veya gönderilmiş
deneme). Gönderilmiş denemenin boş cevabı yalnız soru hiçbir yerde yanıtlanmadıkça
sorunun karşılaşmasıdır; sonradan pratikte yanıtlanırsa doğru/yanlış olarak Konu
takibine geçer. Tekrar çözüm genel tekil toplamı artırmaz. Pratik seçiminin
"daha önce çözdüğüm sorular" geçmişi de aynı yanıtlanmış pratik + deneme
kayıtlarından gelir (`QuestionAvailabilityService.MINE`); boş deneme sorusu yeni
sayılır. Tarihsel görünüm
olay anındaki `learning_label_snapshot` alanını kullanır; boş eski anlık kayıt
bugünün etiketiyle doldurulmaz. Çok etiketli sorular farklı konu satırlarında
görünebilir; bir konu içinde ve genel toplamda tekildir. Deneme sorularında
kaydedilmemiş aktif süre veya PDF/video izleme süresi uydurulmaz.

`Dersler > Konu takibi` satırları `/api/learning-resources/metadata` içindeki
yayımlanmış ders/ünite/konu kimliklerinden gelir. Çözdüğüm/Doğru/Yanlış aynı
kimliklerle `/api/learning-resources/progress?classification=CURRENT` yanıtından
hesaplanır: tamamlanmış pratik ve teslim edilmiş denemelerde her sorunun ilk
karşılaşması, sorunun ön koşul ve `system.*` dışındaki bütün konu bağlarına
sayılır; pratik seçimi de aynı bağları kullanır. "Bitti" işaretleri ayrı
`curriculum_topic_progress` tablosunda kalır. `Çalışma İstatistiklerim`
içindeki eski İlerlemem sekmesi kaldırılmıştır; ayrı bir İlerlemem veri tablosu
yoktur. Eski `/ilerleme` ve `/gecmis?tab=progress` adresleri Konu takibine gider.

## Ortak cevap ve sayım sözleşmesi (TAS-04)

Yeni paralel soru geçmişi yoktur; `progress` mevcut kayıtları tek sözleşmeyle okur
(yanıttaki `countingContract`). Her giriş noktası DB'ye yazılır ve kendi sütununda görünür:

| Giriş noktası | Kayıt | Konu takibinde | Bağımsız ölçüm |
|---|---|---|---|
| Soru bankası, pratik, deneme | `question_attempts`, `exam_questions` | Çözdüğüm/Doğru/Yanlış = soru başına ilk yanıt; Toplam cevap; Son sonuç D/Y | Evet |
| Konuyu Öğrenelim banka sorusu | `question_attempts` + öğrenme olayı | Banka satırıyla aynı; olay kopyası tekrar sayılmaz | Evet |
| Açık (bitmemiş) pratik | `question_attempts` | Devam eden: henüz sayılmamış tekil soru | Oturum bitince |
| Ders içi soru (`lesson_q`) | `learning_engine_events` | Ders alıştırması: tekil öğe, ilk/son sonuç | Yalnız rehbersiz bağlam |
| Kaynaklı not alıştırması | `student_self_check_attempts` | Ders alıştırması | Çözüm önceden açılmadıysa |
| Kart (“bildim”) | `learning_engine_events` | Kart tekrarı; doğru cevap değildir | Hayır |

- **Sunucu puanı:** `scripts/cevap-anahtari.mjs`, `.ders` dosyalarından ve
  `kaynakli-notlar.json`'dan `backend/src/main/resources/learn/answer-keys.json`
  dosyasını üretir (`npm run build` de çalıştırır). Ders sorusunda istemci `chosen`/
  `response` gönderir; sunucu `correct`, `scoring=SERVER`, `keyVersion` yazar ve farklı
  istemci beyanını `clientCorrect` olarak saklar. Anahtarda olmayan veya gövdesi eksik
  cevap `scoring=CLIENT` olur ve doğru/yanlışa girmez. Boşluk puanlaması ön yüzde
  `lesson/scoring.js`, sunucuda `AnswerKeys` içindedir; ortak örnekler iki tarafta denenir.
- **Rehberli/bağımsız:** `quick_check`, `misconception`, `reteach` bağlamı veya açılmış
  ipucu `mode=GUIDED`; kart `REVIEW`; diğerleri `INDEPENDENT`. Not alıştırmasında çözüm
  cevaptan önce açıldıysa `solution_seen=true` rehberli sayılır.
- **Konu bağı:** ders sorusu ve kart dersin `kategori:` kimliklerine, not alıştırması
  katalogdaki `note:` kaydının konularına sayılır. Cevap anındaki bağ olaya
  (`categoryIds`) veya `category_snapshot` alanına yazılır; `HISTORICAL` bunu kullanır.
- **Eski kayıt:** referans günü öncesindeki ders olayları yeniden puanlanmaz ve konu
  anlık kaydıyla doldurulmaz; doğrulanmamış cevap olarak ayrı sayılır.
- Genel toplamlar tekildir; çok konulu öğe birden fazla konu satırında görünebilir.
  Rehber bilgi testi (`GUIDE_QUIZ`) müfredat konusu olmadığı için Konu takibine girmez.

Kanıt: `TopicAnswerContractTest` (geçici DB), `learn.AnswerKeysTest` ve
`node --test testler/cevap-anahtari.test.mjs`.

Öğrencinin `/gecmis` ekranı “Çalışma İstatistiklerim” adıyla deneme ve pratik
tablolarını sunar. Deneme/pratik filtreleri yalnız görünen API
sayfasına değil tüm geçmişe uygulanır; deneme özeti, filtre sonrası kayıtlar üzerinden
hesaplanır. Başarı toplam doğru / toplam soru oranıdır; oturum yüzdelerinin
ortalaması alınmaz. Pratik sekmesinde üst filtre kartı ve özet gösterilmez;
Durum/Boş sütunları gösterilmez. Konu sütunu, pratik oluşturulurken
`study_sessions.catalog_filter.categoryIds` alanına kaydedilen kimlikleri
yayımlanmış ortak katalogdaki görünen adlara çevirir; eski `filter_topic`
kayıtları da gösterilir. Soru geçmişi sütunu çözülmüş soruları dahil etme
kipini ayrı gösterir. Yalnız Pratik/Tarih/Ders sütunları başlık menüsünden filtrelenir ve
sıralanır. Tarih gün/ay gösterilir; filtre/sıralama tam tarih üzerinden çalışır.
Diğer kayıt sütunlarında filtre ve sıralama kapalıdır. Tamamlanan pratikte son
tur sonucu kullanılır; ilk tur sonucu API'de ayrıca korunur.
Açık pratikte sonuç sayıları hesaplanmış gibi gösterilmez. Süre sınırı,
aktif soru çözme süresi ve giriş/çıkıştan ölçülen oturum süresi ayrı etiketlenir.
Pratik listesinin son “Bitirme süresi” sütunu yalnız `COMPLETED` oturumda
kayıtlı `endedAt − startedAt` farkıdır; eksik/geçersiz tarihte ve açık/iptal
oturumda `—` gösterilir. Aktif soru çözme süresi diye sunulmaz.

Denemelerde N tamamlanma zamanına göre tüm geçmiş üzerinde verilir; filtreleme
ve sıralama numarayı değiştirmez. Branş soru/doğru/yanlış/boş sayıları API'de
`exam_questions` anlık kayıtlarından sayfa başına tek toplu sorguyla okunur;
güncel soru branşı veya cevap anahtarı geçmişi değiştirmez. Branş neti doğru −
yanlış / 4'tür; denemede bulunmayan branş sıfır yerine `—` gösterilir. Trk/Edb/Mat/Fzk/
Kim/Bio/Coğ/Tar/Fel/Din sütunları bütün TYT/AYT alanları için sabittir. Hücrelerde
doğru/yanlış çifti, araç ipucunda soru/boş/net ve özgün alt test ayrıntıları gösterilir.
Tarih-1/2 ve Coğrafya-1/2 ilgili ortak branşta toplanır; Felsefe Grubu Fel altında
gösterilir. Bu gruplama kayıtlı branş kimliğini veya geçmişi değiştirmez. Gün/ay
görünen tarihi kısaltır; sıralama ve tarih filtresi tam tarih üzerinden çalışır.
`DataGrid.compactColumns` kısa başlık/hücre sunumunu kullanır; sütun genişlikleri
ortak genişliğe uyarlama ile belirlenir.
Mobilde tablo içinde yatay kaydırma korunur. İstatistik başlıkları ve hücreleri
ortalanır; özet ve kayıt açıklamaları ile genel arama kutusu gösterilmez. `DataGrid`
seçim filtresi Community özel bileşenidir; yalnız Deneme ve Tarih başlıklarında
değer seçimi ve tarihte yerel gün sınırları sunar. Diğer sütunlar başlıklarından
sıralanabilir. Deneme sütunu 64 px, Din sütunu 40 px üst sınırla korunur;
kayıt tablosunda B ve son TYT sütunları gösterilmez. “Deneme sonuçları detaylı”
tablosunun üst özeti TYT ve AYT için iki sabit satırdır; kayıt/soru/sonuç ve
ağırlıklı başarı her tür için filtrelenen denemelerden ayrı hesaplanır. Kayıt
olmayan tür sıfır kayıt ve hesaplanmamış başarıyla korunur. Enterprise Set Filter
kullanılmaz. Kullanıcının tercihiyle resmî veya tahmini puan hesaplanmaz.

Haftalık çizelgede notlar, kategori ve `resourceKeys` bağları
`student_program_weeks` tablosunda kullanıcı/hafta anahtarı ve artan sürümle
saklanır. `GET/PUT /api/student-program/weeks/{pazartesi}` yalnız oturumdaki
hesaba erişir; başka oturumun yeni kaydını yenilemeyle okur ve eski sürümle
kaydetme 409 döner. Eski tarayıcı kopyası yalnız sunucu kaydı yoksa aktarılır;
farklı bir sunucu kaydı varsa kullanıcı seçmeden üzerine yazılmaz. Matematik özel ders
bağları mevcut kullanıcıya ait sunucu kaydındadır; bağlanan kaynağın seçili
kategoriyle katalog ilişkisi doğrulanır. Serbest notlar korunur. Yeni haftaya
kopyalamada kimlik ve notlar taşınır; çalışma durumu `Planlandı` olur, tekrar
tarihi temizlenir. Yalnız kaynak bağı bulunan boş not satırı da silme/kısaltma
korumasına girer.

TYT/AYT deneme çizelgeleri, gerçek sınav/cevap/sonuç, pratik oturumu ve olayları,
öğrenci ilerlemesi, matematik dersleri ve geri bildirim PostgreSQL kayıtlarıdır.
Rehber bilgi testi ve konu notu mini alıştırmalarının tamamlanan yanıtları
`student_self_check_attempts` içinde kullanıcıya bağlı, deneme geçmişiyle saklanır;
not alıştırması sunucuda puanlanır ve konu bağıyla saklanır (yukarıdaki TAS-04 sözleşmesi).
Soru bankası, pratik ve denemede soru kimliğine bağlı tam sayfa karalama;
PDF görüntüleyicide katalog kimliği ve fiziksel sayfa numarasına bağlı karalama
`page_annotations` içinde kullanıcıya özel saklanır. Yaz/Tıkla modu gezinmeyi
korur; siyah, kırmızı, mavi, yeşil kalem rengi her çizgiyle kaydedilir. Çizgi
bitince sürüm koşullu kayıt yapılır; geri alma, çizginin yalnız dokunulan kısmını
silme, çerçeve içini silme ve
tümünü silme yine sürümlü kayıt yapar. Eski oturumun yeni çizimi ezmesi 409 ile
engellenir. Çizgi/şekil renkleri korunur. Bilimsel hesap makinesi ifadeleri kod
çalıştırmadan ayrıştırır. Doğru, dikdörtgen, üçgen, çember/elips ve açı çizimi
sayfa çizgisi olarak saklanır. Açılabilir kareli x‑y grafik kağıdının dört sınırı
`graph_json` alanında her kaynak sayfası için ayrı saklanır (V73). PDF uygulama
içinde sayfa sayfa çizilir; kaynak PDF'nin kendisi değiştirilmez. Eski soru yanı
`question_boards` kayıtları ayrı ve erişilebilir kalır. Hesap veri dışa aktarımı
ve hesap silme akışı bu kayıtları da içerir; denetim izi kaynak türü/kimlik/sayfayı
taşır.
Kenar menü ve soru görseli görünüm tercihleri `user_display_preferences` içindedir.
`user_record_audit` önemli kayıt değişikliklerinin türünü, anahtarını, işlemini ve
zamanını aynı veritabanı işleminde tutar; cevap ve serbest metinleri çoğaltmaz.
Oturum/çözüm olayları `activity_events`, `question_attempts` ve öğretim olaylarında,
hesap yönetimi kararları `account_audit` içinde tutulur. Kaydedilmemiş form
taslakları oturum süresiyle sınırlıdır; başarılı kayıt için sunucu yanıtı gerekir.
