# Sistem rehberi — Kimlikler ve sayım

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Kategori/soru/kaynak kimlikleri, tekil sayım, sürüm kimlikleri.

## Kimlikler ve sayım

Müfredatın tek içerik referansı `Kaynaklar/mufredat/YKS_TYT_AYT_Konu_Soru_Dagilimi_2018-2026.xlsx`
dosyasının ilk `KONULAR` sayfasıdır. Diğer Excel sayfaları okunmaz. İçe aktarıcı,
4. satırdaki başlıkları doğrular ve 5–457 arasındaki 453 satırın ders, sınıf,
ünite, konu, kapsam işaretleri, toplamlar, notlar ve 2018–2026 sayılarını aynen alır.
`✓*`, boş hücre ve 0 birbirinden ayrıdır; toplu başlıklar için sayı dağıtılmaz.
Kullanıcının talimatıyla Matematik + Geometri ve Türkçe / Edebiyat grupları,
yalnız bu sayfadaki ünite ve konulara göre Matematik, Geometri, Türkçe ve
Edebiyat olarak ayrılır. Üçgenler/dörtgenler/çokgenler/analitik/uzay geometrisi
Geometri; fonksiyonlar/trigonometri/türev/integral Matematik kapsamındadır.
Anlam ve dil bilgisi Türkçe; edebiyat bilgisi, dönemleri ve akımları Edebiyat
kapsamındadır. Aynı kaynak satırı iki sınavda yer alsa da tek derse aittir.
Özgün birleşik ad `sourceSubject` ve `distribution.subject` içinde korunur;
ekranlar ayrılmış `subjectId`/`subject` alanlarını kullanır. Yeni konu veya
ikinci çalışma zamanı sözlüğü üretilmez.

Çalışma anında bütün ekranların tek ders/ünite/konu tablosu PostgreSQL
`learning_catalog.current_categories` görünümüdür. `definition` içindeki `unitId`,
`unit`, `topic`, `subjectId`, `subject`, `gradeLabel` ve `distribution` alanları
aynı kayıttan sunulur. Ayrı dağılım tablosu veya ön yüzde elle yazılmış ders listesi
yoktur. `curriculumReference.js` yalnız bu DB metadata'sının sunum projeksiyonudur.
Tabloların `.xlsx` indirmesi ortak `DataGrid.jsx` içindedir: o anda yüklenmiş,
filtrelenmiş ve sıralanmış satırların tamamını sayfalama sınırı olmadan alır;
sunucudan henüz getirilmemiş başka sayfaları kendiliğinden sorgulamaz.
Dersler'deki Konu takibi ve Konu ve soru dağılımı sekmeleri, Soru Çöz/pratik
ve soru bankası aynı kimlikleri kullanır. Dağılım tablosu iki sınavda
olan satırları `excelRowId` ile bir kez gösterir. İlerleme sınav başına kimlikle
hesaplanır; tekil soru genel toplamda çoğalmaz. Bir ünite iki sınavda 26 konu
kimliğine sahip olabildiğinden ortak seçim sınırı 100'dür; ünite seçimi kesilmez.

`scripts/excel-curriculum-import.py` yalnız ilk sayfayı okur; aynı adlı `.mjs`
içe aktarıcı mevcut kontrollü sözlüğü günceller. İlk kimlikler ders/ünite/konu
bileşiminden deterministik üretilir; sonraki içe aktarımlarda mevcut satır ve ad
eşleşmeleri korunur. Satır kayması veya izlenebilen başlık düzeltmesi kimliği
değiştirmez; kaldırılan sınav/konu kimlikleri seçilemeyen tarihsel kayıt olarak kalır.
`unitReference.sha256` yalnız ilk sayfadaki veri satırlarının hash'idir. Eski
kimlikler `selectable=false` ve `canonicalTopicIds` yönlendirmeleriyle korunur.
`SOURCE_CURRICULUM`, eski PDF/video çıkarımı için tutulur; seçilebilir sözlük
veya kullanıcıya gösterilen ders/konu referansı olamaz.

Mevcut bir yayını kayıpsız taşımak için sırasıyla `excel-curriculum-snapshot.py`,
`excel-curriculum-import.py`, `node --max-old-space-size=6144 scripts/excel-curriculum-relabel.mjs`,
`learning-resource-check.mjs`, `excel-curriculum-audit.py` ve
`content-label-publish.py --database ivme` kullanılır. Snapshot, mevcut DB
kataloğunu aynı okuma işlemi içinde alır. Denetim kaynak kimliklerini ve kaynak
sürümlerini mevcut DB ile birebir karşılaştırır; eski çıkarım denetimi ayrıca
saklanır ve yeniden yapılmış gibi gösterilmez. Yayın önceki katalog hâlâ
etkinse tek işlemde geçer. Önceki sürüm ve öğrenci geçmişi korunur.
Yalnız ders adı/kapsamı ayrılırken `excel-curriculum-relabel.mjs --refresh-definitions`
kullanılır: konu ve ünite kimlikleri, içerik, kaynak ve soru–konu bağları korunur;
yeni ders adları ve ilişki tanım sürümleri güncellenir. Denetim bu kipte
eski/yeni kaynak başına kategori kimliği listesini de birebir karşılaştırır.

Soru/PDF/video ilişkileri yalnız Excel'in aynı sınav ve ders kapsamındaki
konularına eşlenir. Kaynak başlığından türetilen ilişkiler `CANDIDATE/LOW`
olarak görünür; geniş kaynak birden fazla aday konuya bağlanabilir. Dar konu
kanıtı olmayan kayıt, ilgili dersin seçilemeyen `system.*.konu-incelemesi`
etiketiyle korunur; öğrenciye görünen sorular bu durumda kalmaz (aşağıdaki tamamlama).
Öğretmen onayı, konuya özel PDF/video konumu veya dar konu
başarısı uydurulmaz. Sorunun kendi kaynak alt konusu (OGM kartında kazanım,
elle veya kitap başlığı kaynaklı; model tahmini değil), elle düzeltilmiş alt
konusu ya da test başlığı tek bir Excel konusunun adıyla aynıysa (sözcük sırası
serbest) `excel-curriculum-relabel.mjs` soruyu yalnız o konuya bağlar
(`confidence=HIGH`, yine `CANDIDATE`). Çok konulu ünitenin kendi adı veya başka
bir Excel konusunu gösteren kaynak/arşiv kanıtı bu daraltmayı engeller; adım
idempotenttir ve her turun listesi `veri/content-labels/source-subtopic-matches-from-<önceki run>.json`
dosyasına yazılır. Dar ad bulunmayan ünite geneli sorular ünitenin bütün
konularında sayılır. `questions.topic`, cevaplar ve olay anındaki etiket
anlık kayıtları değiştirilmez.

Soru–konu tamamlama: öğrenciye görünen her soru (OGM + çıkmış) en az bir Excel
konusuna bağlı olmalıdır; yoksa konu/ders süzgeçlerinde çıkmaz. Konusuz kalan
sorular için `scripts/question-topic-completion.py` (DB'yi ve
`veri/content-labels/source-inventory.json`'ı okur) her soruya tek bir Excel konusu
önerir ve `veri/content-labels/question-topic-decisions.json` dosyasına yazar.
Yöntemler: `EXACT_NAME`/`NAMED_UNIT` (kaynak başlığı konu/ünite adı), `TEXT_MODEL`
(ders grubu başına TF-IDF + kazanım özellikli doğrusal sınıflayıcı), `DUPLICATE`,
`PRIOR` (kaynak kazanım/alt başlığına göre en yakın konu) ve `CONTENT_READ`
(`veri/content-labels/question-topic-reviewed.json`: soru metni veya görseli
okunarak elle verilen karar; aynı metinli kopyalara `CONTENT_READ_COPY` yayılır).
`veri/content-labels/question-topic-applied.json` içindeki sorular önceki turda tamamlanmış
sayılır: planlayıcı bunları yeniden planlar ve eğitimde etiket olarak kullanmaz, böylece
okuma düzeltmeleri aynı hat üzerinden yeniden uygulanır.
Bütün model (`TEXT_MODEL`) kararları da okunarak doğrulandı; kaynakta karşılığı olmayan konular
(ör. “Orta Çağ'da Dünya”, “Su, Hayat ve Çevre Kimyası”) en yakın Excel konusuna
konup öğretmen onayı bekler. `excel-curriculum-relabel.mjs` kararı, yalnız hâlâ Excel
konusu olmayan sorulara `PRIMARY/CANDIDATE` ilişki (`review.status=PENDING`,
`confidenceReason` “öğretmen onayı gerekiyor”, `reviewReasons=TOPIC_APPROVAL_REQUIRED`,
kanıt türü `QUESTION_TOPIC_COMPLETION`) olarak ekler, `system.*` yer tutucusunu ve
`unitReview`'i kaldırır; mevcut Excel konusu olan sorulara dokunmaz. Sorunun `examIds`
alanı her zaman kaynak sınavını da içerir: TYT kaynaklı bir soru yalnız AYT'de bulunan bir
konuya bağlıysa hem TYT hem AYT süzgecinde çıkar. Bu bağlar öğretmen onayı değildir.

Güncel istatistikler yeni ortak kimlikleri,
tarihsel sınıflama kayıt anındaki etiketleri kullanır.

Eski tek hedefli tamamlanma, yeni kimlikle gösterilebilir; birden çok konuya
ayrılan eski tamamlanma bütün alt konuları bitmiş saymaz. Geri alma tek hedefli
eski bağları da aynı işlemde kaldırır. Ayrı bir öğrencinin kaydı etkilenmez.

- `categoryId` kavramı, `itemKey` katalog kaydını, `canonicalAssetId`/envanterdeki
  `entityKey` aynı fiziksel/sağlayıcı varlığını, `relationKey` kaynak–kategori ilişkisini tanımlar.
- Bir PDF'nin aynı hash'e sahip iki katalog kaydı korunabilir. Bu iki kimlik,
  fiziksel kaynak sayısı ve konu referansı sayısının aynı olduğu anlamına gelmez.
  Farklı baskılar veya benzer soru görselleri başlıktan birleştirilmez.
- Video sağlayıcı kimliği konuya göre değişmez. Playlist, video ve başlangıç
  zamanı ayrı bilgilerdir. Eski konuya gömülü bağlantılar taşınırken yönlendirme korunur.
- Başlık düzeltmesinde `id` değişmez; eski terim `aliases` içine alınır ve kimlik
  projeksiyonu yeniden üretilir. Kimlik birleştirmesi açık yönlendirme ve
  öğretmen/ilerleme taşıma değerlendirmesi gerektirir.
- `PRIMARY` doğrudan konu, `SECONDARY` eşlik eden konu, `PREREQUISITE` ön bilgidir.
  Birden fazla ana ilişki olabilir. Üst/alt konu genişlemesi aynı kaynak veya öğrenci
  olayını iki kez saydırmaz. Genel toplam tekil soru/olay kimliğine dayanır.
- Konu numarası: V74 `topicNumber` değerini yayımlanmış
  `learning_catalog.categories.definition` kaydına yazar; sonraki katalog yayınları
  aynı alanı üretir. Pratik seçimi/geçmişi ve kaynak kütüphanesi ortak DB adını gösterir.
