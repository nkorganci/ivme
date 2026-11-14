# Öğrenci ilerlemesi ve kayıt güvenilirliği

Öğrenci kayıtlarının kaynağı PostgreSQL'dir. Referans günü **2026-10-31**: mevcut DB geçmişi aynen korunur; geçmişte DB'ye ulaşmamış olay/kuyruk/log tamamlanmaz veya yeniden oynatılmaz; eski v1/v2 tarayıcı kuyruğu atılır. Öğrenme/cevap/hesap tablolarında silme veya geçmiş filtreleme yoktur.

## Konu takibi ve ilerleme

- `/progress?classification=CURRENT|HISTORICAL` her soruyu ilk yanıtlandığı karşılaşmada bir kez sayar (tamamlanmış pratik veya gönderilmiş deneme). Denemedeki boş cevap yalnız soru hiçbir yerde yanıtlanmadıkça karşılaşmadır; sonradan pratikte yanıtlanırsa doğru/yanlış olarak geçer. Tekrar çözüm tekil toplamı artırmaz; boş deneme sorusu "yeni" sayılır (`QuestionAvailabilityService.MINE`). Tarihsel görünüm olay anındaki `learning_label_snapshot`'ı kullanır, boş eski kayıt bugünün etiketiyle doldurulmaz. Çok etiketli soru farklı konu satırlarında görünür, konu içinde ve genel toplamda tekildir. Kaydedilmemiş aktif süre veya PDF/video izleme süresi uydurulmaz.
- `Dersler > Konu takibi` satırları `/api/learning-resources/metadata` kimliklerinden; Çözdüğüm/Doğru/Yanlış `/api/learning-resources/progress?classification=CURRENT`'tan gelir (ön koşul ve `system.*` dışındaki tüm konu bağlarına sayılır). "Bitti" işaretleri `curriculum_topic_progress`'tedir. Eski `/ilerleme` ve `/gecmis?tab=progress` Konu takibine gider; ayrı İlerlemem tablosu yoktur.

## Ortak cevap ve sayım sözleşmesi (TAS-04)

Yeni paralel soru geçmişi yoktur; `progress` kayıtları tek sözleşmeyle okur (`countingContract`).

| Giriş noktası | Kayıt | Konu takibinde | Bağımsız ölçüm |
|---|---|---|---|
| Soru bankası, pratik, deneme | `question_attempts`, `exam_questions` | Çözdüğüm/Doğru/Yanlış = soru başına ilk yanıt; Toplam cevap; Son sonuç D/Y | Evet |
| Konuyu Öğrenelim banka sorusu | `question_attempts` + öğrenme olayı | Banka satırıyla aynı; olay kopyası tekrar sayılmaz | Evet |
| Açık pratik | `question_attempts` | Devam eden: henüz sayılmamış tekil soru | Oturum bitince |
| Ders içi soru (`lesson_q`) | `learning_engine_events` | Ders alıştırması: tekil öğe, ilk/son sonuç | Yalnız rehbersiz |
| Kaynaklı not alıştırması | `student_self_check_attempts` | Ders alıştırması | Çözüm önceden açılmadıysa |
| Kart ("bildim") | `learning_engine_events` | Kart tekrarı; doğru cevap değildir | Hayır |

- **Sunucu puanı:** `scripts/cevap-anahtari.mjs`, `.ders` dosyaları ve `kaynakli-notlar.json`'dan `backend/src/main/resources/learn/answer-keys.json` üretir (`npm run build` de çalıştırır; ders/not değişince aynı commit'te yenilenir). İstemci `chosen`/`response` gönderir; sunucu `correct`, `scoring=SERVER`, `keyVersion` yazar, farklı istemci beyanını `clientCorrect` saklar. Anahtarda olmayan/gövdesi eksik cevap `scoring=CLIENT` olur ve doğru/yanlışa girmez. Boşluk puanlaması ön yüzde `lesson/scoring.js`, sunucuda `AnswerKeys`; ortak örnekler iki tarafta denenir.
- **Rehberli/bağımsız:** `quick_check`, `misconception`, `reteach` bağlamı veya açılmış ipucu `mode=GUIDED`; kart `REVIEW`; diğerleri `INDEPENDENT`. Çözüm cevaptan önce açıldıysa `solution_seen=true` rehberli sayılır.
- **Konu bağı:** ders sorusu/kart dersin `kategori:` kimliklerine, not alıştırması `note:` kaydının konularına sayılır; cevap anındaki bağ `categoryIds`/`category_snapshot`'a yazılır (`HISTORICAL` bunu kullanır). Referans günü öncesi ders olayları yeniden puanlanmaz, doğrulanmamış cevap olarak ayrı sayılır. Rehber bilgi testi (`GUIDE_QUIZ`) Konu takibine girmez.

Kanıt: `TopicAnswerContractTest`, `learn.AnswerKeysTest`, `node --test testler/cevap-anahtari.test.mjs`.

## Ortak PRATIK seti (TAS-05)

Konu testi, Çıkmış sorular ve "Bu tipten alıştırma" bağlantıları `/konuyu-ogrenelim/pratik?tur=test|cikmis|practice&konu=…[&tip=…]` açar; GET yalnız sayfayı açar, oturum sabit istek kimliğiyle `POST /api/konu-ogrenme/practice-sets` ile kurulur ve `/soru/{kod}?sessionId=…` ortak ekranına yönlenir (eski `/calis?tur=…` buraya yönlenir; bankasız tipte ders içi havuz `yerel=1`). Mastery, tekrar, yanlışlar, karma set ve yeniden anlatım yerel motorda kalır.

- Kayıt: `study_sessions` (`mode=PRACTICE`, `origin=KONU_OGRENME`, `learning_kind` `TOPIC_TEST|PAST_EXAM|ARCHETYPE`) ve `session_questions` (sıra, tip, zorluk, görünen görselin SHA-256'sı); yeni tablo yok.
- Sunucu doğrulaması: soru etkin, TYT/AYT Matematik, öğrenciye açık ve dersin `kategori:` kimliklerinden birine bağlı; yinelenen kimlik 400, uygun olmayan 409; çıkmış setine yalnız `CIKMIS` + yıl + `exam_archive_positions` konumlu soru; **görünen görseli aynı bayt olan iki soru bir sette bulunamaz** (409); en çok 120 soru.
- İdempotency: aynı kullanıcı + istek kimliği aynı seti döndürür; `resume` (varsayılan) açık ve çözülmemiş soru içeren seti döndürür, tamamen çözülmüş açık set tamamlanır; kullanıcı satırı kilidi iki sekmeyi sıralar.
- Adetler: konu testi `min(12, tekil soru)` (tip payı yetmezse bankanın kalanından, aynı soruyla doldurulmaz); çıkmış sorular bankadaki tüm ÖSYM soruları. Eşit Ağırlık/Sayısal kitapçıkları aynı görseli iki kodla taşır; `scripts/ortak-set-tani.mjs` bunu raporlar ve `frontend/src/learn/bank/_gorsel.json` haritasını üretir (`--yaz`, `--kontrol`; banka değişince yenilenir); `loadBank` ikizlerden birini tutar (çıkmış > kod sırası) ve ikizin görülmesi tutulanı da görülmüş sayar.
- Motor köprüsü: ortak ekrandaki ilk cevap `GET /api/konu-ogrenme`'de türetilmiş `attempt` olayı (`shared:true`, `setId=ps-{oturum}`) ve `practiceSets` özeti olarak gelir; `learning_engine_events`'e ikinci kez yazılmaz; iptal edilen set katılmaz; Konu takibi yine yalnız `question_attempts`'ten sayar.
- Referans günü öncesi sorular ve eski `sessionStorage` setleri yeniden kurulmaz; cevap anahtarı istemciye gitmez.

Kanıt: `LearnPracticeSetTest`, `node --test testler/konu-ogrenme-ortak-set.test.mjs`, `node testler/konu-ogrenme-ortak-set-ui.mjs`, `node scripts/ortak-set-tani.mjs --kontrol`.

## Kişisel zorluk ve tekrar tercihleri (TAS-06)

Yalnız o öğrenciye ait iki işaret; oturumdaki kullanıcıya yazılır, başka rolde "senin etiketin" görünmez.

| İşaret | Kayıt | Anlamı |
|---|---|---|
| Benim zorluk etiketim KOLAY/ORTA/ZOR/etiketsiz | `feedback` RATING satırı, `difficulty_vote` (kullanıcı+soru tek kayıt) | Kişisel filtre; öğretmen zorluğundan (`teacherDifficulty`) ayrıdır; "Topluluk" özeti kendi etiketlerinin anonim toplamıdır |
| Tekrar tercihim DEFAULT/AGAIN/HIDE | `student_question_preferences` (V94) | HIDE otomatik pratik, motor seti ve öneri örneğinden çıkarır; AGAIN sonraki otomatik seçimde öne alır |

- API: `PUT /api/question-preferences/questions/{id}` `{"difficulty":"KOLAY|ORTA|ZOR|NONE","repeat":"DEFAULT|AGAIN|HIDE"}` (olmayan alan değişmez; NONE temizler), `GET …/questions/{id}`, `GET …/summary`, `POST …/reset` (`REPEAT|DIFFICULTY|ALL`). Soru ayrıntısı `myEvaluation` ve `myRepeat` taşır. Yazma tek deyimlik `INSERT … ON CONFLICT DO UPDATE`; `/api/feedback` RATING birleştirmesi `COALESCE` ile gönderilmeyen alanı silmez; yıldızı ve mesajı olmayan boş satır silinir.
- Seçime etkisi yalnız otomatik pratikte: `QuestionFilter.forPractice()` (`POST /api/study-sessions` ve `GET /api/questions/availability?practice=true` aynı süzgeç; gösterilen sayı = kurulan set). Açık süzgeçler `mark=HIDE|AGAIN|UNMARKED` ve `myDifficulty=KOLAY|ORTA|ZOR|NONE` varsayılanı geçer. Çıkmış/Soru Bankası listesi ve önceki/sonraki gezinti HIDE'ı yalnız ilgili öğrenci için çıkarır (sayı ve sayfalama gizlemeden sonra). Mevcut oturum, deneme (sabit kitapçık dahil), `pool-summary` değişmez; cevap ve istatistik silinmez.
- AGAIN: henüz cevaplanmamış AGAIN sorular otomatik seçimde önce gelir; bir kez cevaplanınca sıra biter, işaret kalır; aynı sette soru zaten bir kez bulunur.
- Konuyu Öğrenelim: `GET /api/konu-ogrenme` yalnız kendi `questionPreferences`'ını döndürür; motor `state.hidden/again` ile tüm seçicilerde gizlileri çıkarır, bekleyenleri öne alır; ders sayfasındaki sayılar gizlileri düşer. Zorluk/tekrar kontrolleri cevap öncesi de açık, yanıt düğmelerinin altındadır; kişisel zorluğun öğretmen etiketinden ayrı olduğu ipucu ve ekran okuyucu metninde belirtilir. YKS ve Yurt Dışı aynı soru kimliğine bağlı API'yi kullanır. Öneri örnek sorusu HIDE ise seçilmez; PDF kaynaklı pratik tercihi sayım ve kurma isteğine taşır.
- Sıfırlama yalnız çağıran öğrencinin satırlarını siler (`REPEAT` tekrar, `DIFFICULTY` zorluk — topluluk sayımından da çıkar, `ALL` ikisi); onay ister; yanıttan sonra uygun soru sayısı yeniden okunur. Hesap dışa aktarma `questionPreferences` ve `feedback.difficulty_vote`'u içerir; hesap silinince satırlar silinir; her değişiklik `user_record_audit` iz kaydı bırakır.
- Sınır: işaret banka sorusuna (`questions`) uygulanır; ders içi mini soru (`konu:öğe`) ve not alıştırması (`note:…`) için gerekirse tablo `item_key` ile genelleştirilir.

Kanıt: `QuestionPreferenceTest`, `YurtDisiContentTest`, `node testler/kisisel-tercih-ui.mjs`.

## Geçmiş ve istatistik ekranı

- `/gecmis` "Çalışma İstatistiklerim": deneme/pratik filtreleri tüm geçmişe uygulanır; başarı toplam doğru / toplam soru (oturum yüzdelerinin ortalaması değil). Pratik sekmesinde üst filtre kartı ve Durum/Boş sütunu yok; Konu sütunu `study_sessions.catalog_filter.categoryIds`'i görünen adlara çevirir (eski `filter_topic` de gösterilir); yalnız Pratik/Tarih/Ders başlıkları filtrelenir ve sıralanır; tarih gün/ay görünür, filtre tam tarihle çalışır. Tamamlanan pratikte son tur sonucu kullanılır (ilk tur API'de korunur); açık pratikte sonuç gösterilmez; süre sınırı, aktif çözme süresi ve oturum süresi ayrı etiketlenir; "Bitirme süresi" yalnız `COMPLETED` oturumda `endedAt − startedAt`'tır.
- Deneme N'i tamamlanma zamanına göre tüm geçmişte verilir. Branş soru/doğru/yanlış/boş `exam_questions` anlık kaydından sayfa başına tek sorguyla okunur; branş neti = doğru − yanlış/4; denemede olmayan branş `—`. Trk/Edb/Mat/Fzk/Kim/Bio/Coğ/Tar/Fel/Din sütunları tüm alanlar için sabit; Tarih-1/2 ve Coğrafya-1/2 ortak branşta, Felsefe Grubu Fel altında toplanır (kayıtlı kimlik değişmez). `DataGrid.compactColumns`; mobilde tablo içi yatay kaydırma; başlık/hücre ortalı; özet ve genel arama yok; seçim filtresi Community özel bileşeni (yalnız Deneme ve Tarih; Enterprise Set Filter kullanılmaz); Deneme sütunu 64 px, Din 40 px üst sınır; B ve son TYT sütunları yok. "Deneme sonuçları detaylı" üst özeti TYT ve AYT için iki sabit satır (kayıtsız tür sıfır kayıt/hesaplanmamış başarı). Resmî veya tahmini puan hesaplanmaz.
- Haftalık çizelge notları, kategori ve `resourceKeys` `student_program_weeks`'te kullanıcı/hafta anahtarı ve artan sürümle durur; `GET/PUT /api/student-program/weeks/{pazartesi}` yalnız oturumdaki hesaba erişir, eski sürümle kaydetme 409. Eski tarayıcı kopyası yalnız sunucu kaydı yoksa aktarılır. Matematik özel ders bağlarının kategori ilişkisi doğrulanır; yeni haftaya kopyada kimlik ve notlar taşınır, durum `Planlandı`, tekrar tarihi temizlenir; kaynak bağlı boş not satırı silme/kısaltma korumasındadır.
- Diğer PostgreSQL kayıtları: deneme çizelgeleri, sınav/cevap/sonuç, pratik oturum/olayları, matematik dersleri, geri bildirim; rehber bilgi testi ve mini alıştırma yanıtları `student_self_check_attempts`; soru/PDF sayfası karalaması `page_annotations` (kullanıcıya özel; renk her çizgiyle, sürüm koşullu kayıt, eski oturum 409; şekil, bilimsel hesap makinesi ifadeleri kod çalıştırmadan ayrıştırılır; grafik kağıdı sınırları `graph_json` V73; PDF kaynağı değişmez; eski `question_boards` erişilebilir); `user_display_preferences`; `user_record_audit` (tür, anahtar, işlem, zaman — cevap/serbest metin çoğaltılmaz); `activity_events`, `question_attempts`, öğretim olayları; `account_audit`. Hesap dışa aktarma ve silme bunları kapsar. Kaydedilmemiş taslak tamamlanmış kayıt değildir.

## Kayıt güvenilirliği (TAS-01)

- İstemci olay kimliğini ve gövdeyi ilk gönderimde sabitler; yeniden deneme ve yenileme aynı kimlik/gövdeyi kullanır. Okuma/yazma isteklerinde `expectedUserId` oturumdakiyle karşılaştırılır (farklıysa 409); yetki kaynağı daima oturumdur.
- `LearnService` ve `AttemptService` olay/pratik durumunu okumadan önce `users` satırını kilitler; cevap, etiket anlık kaydı ve öğrenme olayı aynı transaction'dadır. Aynı kullanıcı/olay kimliğinin tekrarı özgün kaydı ve `seq`'i döndürür; gövde değişirse 409 (sunucunun eklediği alanlar, banka şıkkı ve JSON sayıları normalize edilir).
- `/events` toplu isteği atomiktir; istemci 400/404/409/413/422'de grubu bölerek hatalı olayı ayırır, reddedileni kimliği/nedeniyle korur; **Şimdi dene** özgün gövdeyle yeniden dener; başarısız kayıt sessiz silinmez. Kuyruktan yalnız gönderilen kimliklerden pozitif `seq` ile onaylananlar çıkar; 401, kesinti, 5xx ve eksik onay kuyruğu korur.
- `LearnOutbox` her olayı `ivme:konu-ogrenme:giden:<userId>:v3:<eventId>` anahtarıyla ayrı saklar (500 sınırı yok, bozuk JSON korunur ve görünür hata olur); gönderim 50'lik parça; yeniden deneme bağlantı dönüşünde, 30 sn döngüde veya kullanıcı isteğiyle. Kota/izin hatasında olay bellekte kalır, uyarı görünür; bekleyen kayıtla ayrılırken uyarılır. Depolama kullanılamıyorsa zorla kapanmaya karşı kalıcılık garantisi yoktur ve sunucu kaydı gibi sunulmaz.
- İlerleme/ustalık/günlük sayaçlar yalnız sunucunun onayladığı olaylardan türer; bekleyen kayıt sayısı görünür, sonuçlanana kadar çalışma düğmeleri kilitli, yeniden deneme açık; ders/bölüm/set tamamlama onay bekler; ders sorusunun yerel doğru/yanlışı kalıcı kayıt değildir. Hesap değişiminde provider kullanıcı anahtarıyla yeniden kurulur, eski isteklerin gecikmiş sonucu yeni ekranı değiştirmez. Pratik seti anahtarı kullanıcı, tür, konu, sınav, gün ve soru tipini içerir.
- Öğrenme ekranı aynı sorunun başka ekrandaki yarım bağımsız pratik turunu `SKIP` ile kapatmaz (409). Yanlış banka cevabı doğru şıkkı döndürdüğü için turu `REVEAL` ile tamamlar (çözüm görseli açıldı kanıtı değildir). Ders içi sorular sunucu anahtarıyla puanlanır.

Kanıt: `node --test testler/konu-ogrenme-kayit.test.mjs`, `python scripts/ivme.py test LearnFlowTest,LearnReliabilityTest,AttemptTest`, `node testler/konu-ogrenme-kayit-ui.mjs`, `node testler/konu-ogrenme-ui.mjs temel-kavramlar`; UI testleri sahte API kullanır, gerçek öğrenci DB'sine yazmaz; DB kesintisi geçici test DB'sinde bağlantı sonlandırılarak denenir.
