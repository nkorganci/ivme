"""Source-reading decisions, independent of local-model confidence/proposals.

These content-maintenance decisions carry no attributed teacher approval. Only
the explicitly listed, read source questions enter the acceptance workset.
"""
import hashlib
import json
from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,digest,write_json
from pdf_question_accept import reviewed_answer


NEW={
 'pdf-01ea43dabcb81155-p0021-q01':('TYT','felsefe','Varlık Felsefesi Alanındaki Çağdaş Yaklaşımlar','Hartmann’ın varlık katmanları, karşıt ontolojik yaklaşımlara çatışmayan alanlar açar; A.'),
 'pdf-029dd097037ba8ca-p0019-q01':('AYT','tarih','Osmanlı Devleti’nde Modern Orduya Geçiş','Yeniçeri Ocağının kaldırılması padişahın otoritesini güçlendirir; B. Kuruluş/devşirme yerine modern ordu kapsamıdır.'),
 'pdf-029dd097037ba8ca-p0040-q01':('TYT','tarih','Tek Hanedan Anlayışı ve Gelenekler Işığında Devlet İdarecisi','Ekberiyet ve kafes düzeninde şehzadelerin sancaklarda yönetim deneyimi kazanması engellenir; D.'),
 'pdf-074e8bea6164fa38-p0034-q01':('TYT','felsefe','20. Yüzyıl Felsefesinde Bazı Ana Akımlar','Yeni yöntemler, bilim felsefesi ve sembolik mantık bu dönemin özellikleridir; III skolastik gerekçedir; E.'),
 'pdf-0b126b03ac0a7a58-p0051-q01':('AYT','tarih','Siyasi Alandaki Gelişmeler','Serbest Cumhuriyet Partisi saltanatı savunmaz; B. Ölçülen konu çok partili siyasal hayat denemesidir.'),
 'pdf-0b126b03ac0a7a58-p0053-q01':('AYT','tarih','Siyasi Alandaki Gelişmeler','Nutuk 1919–1927 sürecini kapsar; Çanakkale Savaşları bu zaman aralığının dışındadır; C.'),
 'pdf-0b126b03ac0a7a58-p0055-q01':('AYT','tarih','Siyasi Alandaki Gelişmeler','Çok partili hayata geçiş Hürriyet Partisiyle gerçekleşmedi; diğer kurum eşleştirmeleri uygundur; A.'),
 'pdf-0b126b03ac0a7a58-p0057-q01':('AYT','tarih','Siyasi Alandaki Gelişmeler','SCF muhalefeti ve denetimi mümkün kılar; liberallerin örgütlenmesini kapatmak destek gerekçesi değildir; C.'),
 'pdf-0e7b4657c25d02b5-p0016-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','Sovyetlerin sömürgelerde pay ve uydu yönetimlerin tanınması talepleri etki alanını genişletmeye yöneliktir; B.'),
 'pdf-0e7b4657c25d02b5-p0025-q01':('AYT','tarih','II. Dünya Savaşı','Kitle imha silahları savaşın sivil nüfus kaybını artırmıştır; verilen seçenekler içinde C.'),
 'pdf-0e7b4657c25d02b5-p0027-q01':('AYT','tarih','II. Dünya Savaşı','Almanya ve İtalya ile barış koşullarının belirlenmesi Potsdam Konferansının kapsamındadır; A.'),
 'pdf-13a5d1aef378a1d8-p0035-q01':('TYT','felsefe','Siyaset Felsefesinin Konusu ve Problemleri','Parça özgürlük ve adalet taleplerinin yönetim biçimlerini değiştirmesini vurgular; E.'),
 'pdf-14fcf9c906d20df6-p0031-q01':('TYT','felsefe','Düşünme ve Dil İlişkisi','Aynı kavramın düşünce sistemine bağlı olarak farklı anlamlar kazanması vurgulanır; yalnız Hegel adına göre dönem seçilmez; C.'),
 'pdf-1a02fe189cf176e5-p0012-q01':('TYT','felsefe','Siyaset Felsefesinin Konusu ve Problemleri','Devletin adaleti uygulayabilmesi yasaların yaptırım gücü gerektirdiğini gösterir; A.'),
 'pdf-1a02fe189cf176e5-p0016-q01':('TYT','felsefe','Siyaset Felsefesinin Konusu ve Problemleri','Sözleşmeye geçiş insanın sınırsız doğal arzularının kendi güvenliğini tehdit etmesinden kaynaklanır; C.'),
 'pdf-1a02fe189cf176e5-p0032-q01':('TYT','felsefe','15-17. Yüzyıl Felsefesinde Öne Çıkan Görüşler','Bacon’ın putlardan arınma düşüncesi ön kabullere dayanmayı reddeder; yapılmaması gereken D.'),
 'pdf-1ccc7f36114af6ff-p0030-q01':('TYT','tarih','İslamiyet’in Türk Devlet ve Toplum Yapısına Etkisi','Tarım, zanaat ve meslek çeşitliliği göçebe yaşam sonucunu zorunlu kılmaz; çıkarılamayan D.'),
 'pdf-2ec8d5e0c0c4d44c-p0022-q01':('AYT','tarih','Ekonomi Alanındaki Gelişmeler','Ağnam vergisinin kaldırılması İzmir İktisat Kongresi kararlarından değildir; E.'),
 'pdf-3acc726164e8d8b4-p0023-q01':('AYT','tarih','İslamiyet Yayılıyor','Bedir zaferi siyasi güç, yayılma ve Müslümanların güveni üzerinde birlikte etkilidir; E.'),
 'pdf-412e490eedcfc0e2-p0032-q01':('AYT','tarih','Avrupa’da Değişim Çağı','Yeni Çağ Avrupa’sında toprağa bağlı aristokrasi güçlenmez; diğer seçenekler döneme uygundur; E.'),
 'pdf-412e490eedcfc0e2-p0034-q01':('AYT','tarih','Avrupa’da Değişim Çağı','Coğrafi keşifler Baharat yolunun önemini azaltır; önem kazanması sonuç değildir; E.'),
 'pdf-41807fc85f9bcbe3-p0052-q01':('TYT','tarih','Boylardan Devlete','Toyun devlet ve toplum işlevleri anlatılıyor; hükümdar kararlarının bağlayıcılığı bu metinden çıkarılamaz; C.'),
 'pdf-4459989e930ff8a7-p0015-q01':('TYT','tarih','Coğrafya ile Oluşan Yaşam Tarzı','Kaynak haritası görsel olarak incelendi; göç okları Kuzeybatı Afrika’ya ulaşmıyor; E.'),
 'pdf-41807fc85f9bcbe3-p0047-q01':('TYT','tarih',['Boylardan Devlete','Coğrafya ile Oluşan Yaşam Tarzı'],'Kaynakta E işaretlenmiş; sanat=II, savaş=I, yönetim=III eşlemesi II,I,III sırasını verir. Bağımsız sıra kontrolünün doğru cevabı C.'),
 'pdf-4459989e930ff8a7-p0017-q01':('TYT','tarih','Kavimler Göçü','Kavimler Göçü ve Batı Roma’nın dağılması sonrasındaki güvensizlik feodal koruma ilişkilerine yol açar; D.'),
 'pdf-4459989e930ff8a7-p0031-q01':('TYT','tarih','Kavimler Göçü','Avrupa Hunlarına ilişkin Rusların siyasi güç olarak ortaya çıkışını sağlama yargısı uygun değildir; C.'),
 'pdf-4459989e930ff8a7-p0033-q01':('TYT','tarih','Kavimler Göçü','Avrupa Hunlarının Tanrı’nın Kamçısı olarak anılan hükümdarı Attila’dır; D.'),
 'pdf-4a2f5f617534b7d5-p0036-q01':('TYT','tarih','Coğrafya ile Oluşan Yaşam Tarzı','Yerleşik kültür ve Çin-Hint-İran etkileşimi bakımından Uygurlar öne çıkar; B.'),
 'pdf-4a2f5f617534b7d5-p0038-q01':('TYT','tarih','Coğrafya ile Oluşan Yaşam Tarzı','Bögü Kağan, Maniheizm ve matbaa işaretleri Uygurları tanımlar; A.'),
 'pdf-4b2619cbfc7ac879-p0038-q01':('AYT','tarih','1960 Sonrasında Türk Dış Politikası','1974 Kıbrıs Barış Harekâtı sonrasında silah ambargosu uygulayan ülke ABD’dir; Lozan dönemiyle karıştırılmaz; E.'),
 'pdf-4fb000b99039243b-p0021-q01':('AYT','tarih','Osmanlı’da Devletin Toprak Üzerindeki Mülkiyeti ve Çifthane Sistemi','Metinde yerli devlet görevlilerinin sermayesi anlatılır; yabancı sermaye teşviki sonucu çıkmaz; A.'),
 'pdf-56dfaf33e5870c67-p0023-q01':('TYT','felsefe','Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi','Kant’ın ödev ahlakında koşulsuz buyruk esastır; yarar veya mutluluk koşulu değil; A.'),
 'pdf-56dfaf33e5870c67-p0025-q01':('TYT','felsefe','Ahlak Felsefesinin Konusu ve Temel Kavramları','Erdemin ölçütü gösterişli sonuç değil iyiye yönelen niyettir; iyi isteme seçeneği D.'),
 'pdf-56dfaf33e5870c67-p0029-q01':('TYT','felsefe','Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi','Kant çıkar ve mutluluk hesabı yerine karşılıksız ödev duygusunu ahlaki amaç sayar; D.'),
 'pdf-56dfaf33e5870c67-p0031-q01':('TYT','felsefe','Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi','İnsanın amaç olması ve değerinin korunması, sonuç hesabından önce insana saygıyı gerektirir; A.'),
 'pdf-5889abc6e299ab06-p0034-q01':('AYT','tarih','Türk İslam Dünyasında Birliği Sağlama Çabaları','XVI. yüzyıl Safevi rekabetinin odağı Doğu Anadolu üzerindeki nüfuzdur; XIX. yüzyıl tehditlerine etiketlenmez; E.'),
 'pdf-5889abc6e299ab06-p0045-q01':('AYT','tarih','Türk İslam Dünyasında Birliği Sağlama Çabaları','Hazine vasiyeti Yavuz Sultan Selim’e aittir; Mısır seferleri dönemiyle bağlantılıdır; E.'),
 'pdf-58c523b76f024c4b-p0038-q01':('TYT','felsefe','Felsefenin Anlamı','Dağa tırmanma benzetmesi sonuca ulaşmaktan çok felsefe yapma sürecinin değerini ve hazzını vurgular; A.'),
 'pdf-58cd106c7ec93538-p0019-q01':('TYT','felsefe','Ahlak Felsefesinde Özgürlük ve Sorumluluk','Kişi seçtiği eylemle insanlık için de bir değer örneği ortaya koyar; eylem sorumluluğu vurgulanır; A.'),
 'pdf-5ff28f5cba6106f1-p0018-q01':('AYT','tarih','Osmanlı Devleti’nde Yönetici Sınıf (Askerî Sınıf)','Esnafın kalite ve belirlenen fiyatlara uygunluğunu denetleyen görevli muhtesiptir; B.'),
 'pdf-5ff28f5cba6106f1-p0041-q01':('TYT','tarih','Osmanlı Devleti’nin Rumeli’deki İskân ve İstimâlet Politikası','İskân ve dervişlerin etkisi topluca din değiştirme sonucunu zorunlu kılmaz; çıkarılamayan D.'),
 'pdf-5ff28f5cba6106f1-p0043-q01':('AYT','tarih','Osmanlı Devleti’nde Yönetici Sınıf (Askerî Sınıf)','Medrese ilmiye teşkilatıyla ilgilidir; bütün eğitim kurumlarının defterdara bağlı olduğu yargısı yanlıştır; A.'),
 'pdf-6573aef021a56670-p0010-q01':('AYT','tarih','II. Dünya Savaşı Sürecinde Türkiye','Hayat sahası yayılmacılığının sınırının belirsizliği Türkiye açısından da tehdit oluşturur; C.'),
 'pdf-6573aef021a56670-p0014-q01':('AYT','tarih','II. Dünya Savaşı','Kennedy İkinci Dünya Savaşı döneminde devlet başkanı değildir; B.'),
 'pdf-6573aef021a56670-p0058-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','Sovyetlerin toprak talepleri Türkiye’yi savaş sonrası Batı bloğuna yaklaştırmıştır; D.'),
 'pdf-6573aef021a56670-p0078-q01':('AYT','tarih','II. Dünya Savaşı Sürecinde Türkiye','Karartma ekonomik daralmanın değil güvenlik önleminin örneğidir; sorunun gösterilemez seçeneği B.'),
 'pdf-6ed220636c8151de-p0033-q01':('AYT','tarih','Saray ve Şehir Kültürü','Bir tür ticaret malının toptan dağıtıldığı kapalı pazar kapan hanıdır; şehir içi ticaret mekânı sorulur; C.'),
 'pdf-6ed220636c8151de-p0043-q01':('AYT','tarih','Saray ve Şehir Kültürü','Cami etrafındaki sosyal hizmet ve şehir gelişimi tesislerinin bütünü külliyedir; A.'),
 'pdf-7061f7ee68cbbb64-p0015-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','Yugoslavya’da direniş hareketi komünist yönetimin oluşumunda doğrudan etkili olmuştur; A.'),
 'pdf-751ac36824cea1c7-p0079-q01':('AYT','tarih','1960 Sonrasında Türk Dış Politikası','Fırat-Dicle suları ve GAP’a tepki veren iki temel aşağı kıyıdaş ülkeden seçeneklerde bulunan Suriye’dir; A.'),
 'pdf-7923a033953e8d53-p0023-q01':('TYT','felsefe','Felsefi Düşüncenin Ortaya Çıkışı ve Özellikleri','Farklı tutarlı kuramların birlikte bulunması felsefi düşüncenin öznel görüşlere açık oluşunu vurgular; E.'),
 'pdf-7d2900144b32704c-p0017-q01':('TYT','tarih','Türklerin İslamiyet’i Kabulü','Endülüs Emevileriyle İspanya’da yayılma Türklerin katkısı değildir; C.'),
 'pdf-7d2900144b32704c-p0021-q01':('TYT','tarih','Türklerin İslamiyet’i Kabulü','Gayrimüslimleri zorla Müslüman yapma, verilen İslamiyet’i savunma değerlendirmesinin dayanağı değildir; D.'),
 'pdf-7d2900144b32704c-p0039-q01':('TYT','tarih','Türklerin İslamiyet’i Kabulü','Göktürkler İslam öncesi bir devlettir; İslamiyet’i yayma iki devletin ortak özelliği olamaz; C.'),
 'pdf-7d2900144b32704c-p0057-q01':('AYT','tarih','Büyük Selçuklu Devleti (1040-1157)','Karahanlı-Gazneli yakınlaşmasının karşısındaki yükselen güç Selçuklulardır; B.'),
 'pdf-7e8886f7fa42defd-p0019-q01':('AYT','tarih','Osmanlı Devleti’nde Demokratikleşme Hareketleri','1856 Islahat düzenlemeleri bağlılık/eşitlik ve dış müdahale sorunuyla ilgilidir; burjuva oluşturma amaçlanmaz; A.'),
 'pdf-7e8886f7fa42defd-p0054-q01':('AYT','tarih','Osmanlı Devleti’nde Demokratikleşme Hareketleri','II. Meşrutiyet sonrasındaki bu kanunlar hanedan otoritesini artırma hedefini göstermez; B.'),
 'pdf-82d487be5a0cab0b-p0016-q01':('TYT','felsefe','Sanat Felsefesinin Konusu ve Problemleri','Eserlerin güzel ideasından pay alması, eserden bağımsız güzel ideasını gerektirir; E.'),
 'pdf-82d487be5a0cab0b-p0028-q01':('TYT','felsefe','Sanat Felsefesinin Konusu ve Problemleri','Nesneyi sanat eseri olarak değerlendiren alımlayıcının estetik bakışı ayırt edicidir; C.'),
 'pdf-8a996703b8c1d8f9-p0029-q01':('AYT','tarih','Dünyanın Muhteşem Gücü Osmanlı','Kanuni’nin Akdeniz mücadelesinde Venedik ve İspanya rakiptir; Fransa müttefik konumundadır; D.'),
 'pdf-8b19fd17ecd847ff-p0037-q01':('AYT','felsefe','Felsefi Metin Analizi','Felsefi metin yalnız baş ve son kısımlarla yorumlanmaz; kavram, argüman ve bütünlük birlikte izlenir; B.'),
 'pdf-8c9a44db828d19fb-p0025-q01':('TYT','felsefe','Siyaset Felsefesinin Konusu ve Problemleri','Yasallık tek başına yeterli değildir; meşruluk normların benimsenmesine dayanır; C.'),
 'pdf-ad96fd5b2f41d72b-p0035-q01':('AYT','tarih','I. Dünya Savaşı Sürecinde Osmanlı Devleti','1917 İngiliz mektubu Balfour Deklarasyonudur; 1960 sonrası politika değildir; B.'),
 'pdf-ade416d31115af4d-p0021-q01':('TYT','felsefe','Bilginin Kaynağı ile İlgili Görüşler','Locke çocuğun bilgiyi tecrübe ederek öğrendiğini savunuyor; bilginin kaynağı deneyimdir; D.'),
 'pdf-adf571ba1f478060-p0012-q01':('AYT','tarih',['I. Dünya Savaşı’nın Sonuçları','II. Dünya Savaşı'],'Versay ve Neuilly’nin revizyonist etkileri İkinci Dünya Savaşı nedenleriyle bağlantılıdır; Sevr uygulanmış bir savaş-sonrası düzen oluşturmaz; D.'),
 'pdf-adf571ba1f478060-p0039-q01':('AYT','tarih','II. Dünya Savaşı','Eisenhower Doktrini 1957 tarihlidir; İkinci Dünya Savaşı öncesindeki gelişme değildir; A.'),
 'pdf-adf571ba1f478060-p0053-q01':('AYT','tarih','II. Dünya Savaşı','Almanya için Nazizm ve Hayat Sahası eşleşmesi doğrudur; Kara Gömlekliler İtalyan faşizmine aittir; B.'),
 'pdf-b094ab6e26e57495-p0018-q01':('TYT','felsefe','Siyaset Felsefesinin Konusu ve Problemleri','Hobbes’ta sözleşme bireylerin kendi aralarında yapılır; devlet sözleşmenin tarafı olarak kurulmaz. ÖSYM 2016 YGS Sosyal 34 gövde ve resmî anahtar da ayrıca karşılaştırıldı; A.'),
 'pdf-b094ab6e26e57495-p0030-q01':('TYT','felsefe','Ahlak Felsefesinde Özgürlük ve Sorumluluk','Parça özgürlüğün keyfî serbestlik olmayıp belirlenimler ve zorunluluklarla birlikte düşünüldüğünü anlatır; D.'),
 'pdf-b567543bb4ba18f8-p0026-q01':('AYT','tarih','Abbasi Devleti ve Türkler','Sasaniler VII. yüzyılda son buldu; VIII. yüzyılda başlayan Abbasilerle çağdaş değillerdir; B.'),
 'pdf-b6090dbbc3efe582-p0027-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','Süveyş’in millîleştirilmesi 1956 krizini ve büyük güç rekabetini artırır; 1955 Bağdat Paktı bunun sonucu değildir; E.'),
 'pdf-b6090dbbc3efe582-p0029-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','1956 Süveyş Krizi’nin doğrudan nedeni Nasır’ın kanalı millîleştirmesidir; C.'),
 'pdf-b6090dbbc3efe582-p0038-q01':('AYT','cografya','Uluslararası Örgütler','OPEC petrol üreticileri arasında fiyat/teknik iş birliği örgütüdür. Soru eski tarih kaynağında olsa da ölçülen güncel YKS konusu uluslararası örgütlerdir; B.'),
 'pdf-c5a553f237b3aadf-p0019-q01':('AYT','tarih','Osmanlı Devleti’ne Yönelik Tehditler','Berlin düzeninde Bosna-Hersek’in idaresi Avusturya-Macaristan’a bırakılmıştır; Rusya’nın uygulaması değildir; E.'),
 'pdf-c5a553f237b3aadf-p0048-q01':('AYT','tarih','Osmanlı Devleti’ne Yönelik Tehditler','1878 Berlin Antlaşması’nda Romanya, Sırbistan ve Karadağ bağımsızlaşmıştır; dönem 1595–1774 değildir; C.'),
 'pdf-c772aa9e8b548fd1-p0048-q01':('AYT','tarih','Büyük Selçuklu Devleti (1040-1157)','Büyük Selçuklu Devleti Ön Asya merkezlidir; Orta Asya’da kurulmuş en büyük Türk-İslam devleti yargısı uygun değildir; C.'),
 'pdf-c9c099cd3eb05a2c-p0056-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','1953–1954 Balkan ittifakı Kıbrıs nedeniyle Türk-Yunan ilişkilerinin bozulmasından etkilenmiştir; Atatürk dönemi değildir; C.'),
 'pdf-ceba00efd2c95492-p0030-q01':('TYT','tarih','Osmanlı Devleti’nde Demokratikleşme Hareketleri','Kanunuesasi ile eşit Osmanlı vatandaşlığına dayalı Osmanlıcılık uygulama alanı bulmuştur; B.'),
 'pdf-d3de30b2ab124359-p0060-q01':('AYT','tarih','Osmanlı Devleti’nde Demokratikleşme Hareketleri','İttihat ve Terakki anayasa ve yetki sınırlandırmasını ister; hanedan veraset sistemini değiştirme amacı taşımaz; D.'),
 'pdf-d77db725f41ce027-p0015-q01':('TYT','felsefe','20. Yüzyıl Filozoflarının Görüşleri','Topçu’nun hareket/isyan ahlakında özgürlük Tanrı’ya yönelen iradeyle kazanılır; verili veya keyfî değildir; D.'),
 'pdf-dc1aa3afeb6f3a1b-p0031-q01':('TYT','felsefe','18-19. Yüzyıl Felsefesinde Öne Çıkan Problemler ve Görüşler','Nietzsche’nin istiyordum vurgusu iradedir; düşünür XIX. yüzyıl kapsamında ele alınır; B.'),
 'pdf-deacdc896ef00baf-p0033-q01':('TYT','felsefe','Sanat Felsefesinin Konusu ve Problemleri','Parça estetik/sanat felsefesinin kapsamını açıklar; eserin doğayı sanatçı yorumuyla yansıtması görüşünü vermez; E.'),
 'pdf-df1445341a0a7d73-p0036-q01':('TYT','felsefe','Sanat Felsefesinin Konusu ve Problemleri','Aşık Veysel dörtlüğünde güzelliğin değerlendiren özneye bağlılığı vurgulanır; akıl yürütme kavramları konusu değildir; C.'),
 'pdf-ee7cda7d9e043ce5-p0052-q01':('TYT','tarih','Saray ve Şehir Kültürü','El yazmasındaki olayları resmeden Matrakçı Nasuh/Levni sanatı minyatürdür; tezhiple karıştırılmaz; E.'),
 'pdf-ef5b9db0e4cbd6c5-p0027-q01':('AYT','tarih','İstanbul’un Fethi ve Fethin Sonuçları','Anadolu Hisarı Fatih’ten önce Yıldırım Bayezid tarafından yaptırılmıştır; Fatih’in hazırlığı değildir; C.'),
 'pdf-ef5b9db0e4cbd6c5-p0056-q01':('AYT','tarih','Osmanlı Devleti’nde Millet Sistemi','Dinî cemaatin eğitim/ibadet yetkileriyle birlikte patriği padişahın ataması merkezî otoriteyi korur; B.'),
 'pdf-ef5b9db0e4cbd6c5-p0071-q01':('AYT','tarih','Dünyanın Muhteşem Gücü Osmanlı','Fatih’in imparatorluk siyaseti fetih ve merkezî kul düzeniyle ilgilidir; yüzyıllar önceki Avar kuşatması neden sayılamaz; E.'),
 'pdf-effe1c1338fc6dfd-p0029-q01':('TYT','felsefe','Sanat Felsefesinin Konusu ve Problemleri','Estetik yargıların öznel oluşu kişilere göre beğeni farklılığını açıklar; E.'),
 'pdf-f142cc1bd47b3b0a-p0028-q01':('TYT','felsefe','Ahlak Felsefesinin Konusu ve Temel Kavramları','Yakınının çıkarı yerine dürüstçe doğruyu söylemek erdemli eylemdir; C.'),
 'pdf-f142cc1bd47b3b0a-p0036-q01':('TYT','felsefe','Ahlak Felsefesinin Konusu ve Temel Kavramları','Fırıncı iyi niyetle zarar veren bir sonuç doğurur; niyetin iyi oluşu eylemi tek başına iyi yapmaz; E.'),
 'pdf-fdb6bf558a57d72c-p0031-q01':('TYT','tarih','Coğrafya ile Oluşan Yaşam Tarzı','Bulgar, Hazar ve Peçenek kullanımından Göktürk yazısının Avrupa içlerine yayıldığı çıkar; Selçuklu dönemi konusu değildir; B.'),
 'pdf-fdb6bf558a57d72c-p0033-q01':('AYT','tarih','İslamiyet Yayılıyor','İslam ordularıyla Hazar ve Türgiş devletleri mücadele etmiştir; Avarlar bu cephede yer almaz; D.'),
}

# Source readings of rejected model MATCH / UNCERTAIN proposals. Topic overlap
# alone cannot consume a source occurrence; these stems/options are different.
NEW.update({
 'pdf-c76d197b9be672bc-p0005-q01':('TYT','felsefe','Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi','Özgün soru kırpımı görsel olarak okundu: istem “Bu parça, ahlak felsefesinin temel sorularından hangisine bir cevap içermektedir?” biçiminde tamdır. Metin çıkarımında cevap sözcüğü eksik olsa da değişmemiş kaynak görselinde vardır. Aristoteles en yüksek iyiyi mutluluk ve eylemin amacı olarak açıklar; modelin eşlediği diğer soru farklı kök ve seçenekler içeriyor; E.'),
 'pdf-151f191151598d03-p0042-q01':('AYT','tarih','Dünyanın Muhteşem Gücü Osmanlı','Kanuni döneminde Hristiyan birliğini parçalamak için Fransa ile ittifak kurulmuştur; bankadaki amaçları soran farklı öncüllü soruyla birleştirilmedi; B.'),
 'pdf-2ec8d5e0c0c4d44c-p0054-q01':('AYT','tarih','Ekonomi Alanındaki Gelişmeler','1933 ve tekstil/ayakkabı fabrikaları Sümerbankı tanımlar. Banka adayı 1935 madencilik bankasını sorar; farklı kök ve seçenekler; C.'),
 'pdf-4a2f5f617534b7d5-p0045-q01':('TYT','tarih','Boylardan Devlete','Bilge Kağanın yoksulu zengin ve az milleti çok kılma sözü sosyal devlettir. Bankadaki alıntıdan sonuç çıkarma sorusundan farklı kök ve beş seçenek var; B.'),
 'pdf-5889abc6e299ab06-p0047-q01':('AYT','tarih','Türk İslam Dünyasında Birliği Sağlama Çabaları','Mısırın fethi Yavuz dönemidir; bankadaki olumsuz dönem sorusuyla kök ve seçenekler farklı; E.'),
 'pdf-5ff28f5cba6106f1-p0025-q01':('AYT','tarih','Osmanlı Devleti’nde Yönetici Sınıf (Askerî Sınıf)','İlmiye mensubu ve fetva makamı Şeyhülislamdır. Banka adayı ilmiye mensubu olmayanı soruyor; aynı soru değildir; B.'),
 'pdf-5ff28f5cba6106f1-p0030-q01':('AYT','tarih','Osmanlı Devleti’nde Yönetici Sınıf (Askerî Sınıf)','Eğitim=müderris, yargı=kadı, fetva=müftü sırası A. Banka sorusu yeniden ifade edilmiş ve D çeldiricisindeki sıra farklı; özgün seçenekler korunarak kabul; A.'),
 'pdf-62a4e3e26a9ad3d7-p0031-q01':('AYT','tarih','Saray ve Şehir Kültürü','Dış saray hizmetlerinin bölümü Birundur. Banka adayı üç alanlı görsel eşleştirme sorusudur; bu tek tanım ve seçenekler farklı; D.'),
 'pdf-6573aef021a56670-p0021-q01':('AYT','tarih','II. Dünya Savaşı','Almanyanın yanında savaşan iki devlet İtalya ve Japonyadır. Banka adayı üçlü Mihver listesini sorar; kök ve bütün seçenekler farklı; D.'),
 'pdf-6573aef021a56670-p0068-q01':('AYT','tarih','II. Dünya Savaşı Sürecinde Türkiye','Âşarın kaldırılması 1925tedir; savaş yıllarındaki diğer dört ekonomi tedbirinden ayrılır. Banka adayı farklı öncüllü çoklu sorudur; E.'),
 'pdf-6573aef021a56670-p0072-q01':('AYT','tarih','II. Dünya Savaşı Sürecinde Türkiye','Milletler Cemiyetine giriş 1932dir; II. Dünya Savaşı sırasında gerçekleşmemiştir. Bankadaki önlem sorusunun farklı kökü ve çeldiricileri var; A.'),
 'pdf-6b14eb8069450040-p0027-q01':('AYT','tarih','Büyük Selçuklu Devleti’nde Yönetim ve Toplum Yapısı','İkta gelirleriyle atlı asker yetişmesi ordunun tamamının atlı olduğu anlamına gelmez. Bankadaki sistemin amaçları sorusunun kökü/seçenekleri farklı; C.'),
 'pdf-7061f7ee68cbbb64-p0027-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','Truman/Marshall yardımları SSCBye karşı kuşatma politikasıyla ilişkilidir. Banka adayı Soğuk Savaşın nedenleri için olumsuz sorudur; farklı; A.'),
 'pdf-7061f7ee68cbbb64-p0036-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','COMECON Doğu Blokudur; Batı Bloku sorusunun özgün diğer dört seçeneği bankadaki adaydan farklı; D.'),
 'pdf-7061f7ee68cbbb64-p0063-q01':('AYT','tarih','II. Dünya Savaşı Sonrası Oluşan Güç Dengeleri ve Türkiye','Türkiye II. Dünya Savaşı sonrasında Kore Savaşına fiilen katılmıştır. Banka adayı I. Dünya Savaşı ve Millî Mücadele sonrası ilk savaşı farklı çeldiricilerle sorar; C.'),
 'pdf-7d2900144b32704c-p0014-q01':('TYT','tarih','Coğrafya ile Oluşan Yaşam Tarzı','Din adamı kam/şaman; yabgu yönetsel unvandır. Gök Tanrı esasları sorusunun banka adayındaki seçenekleri farklıdır; C.'),
 'pdf-9d252e3d361580f1-p0063-q01':('AYT','tarih','Toplumsal Alandaki İnkılaplar','1934te kadınlara milletvekili seçme/seçilme hakkı tanınmıştır. Banka adayı kronolojik olarak ilk kazanılan hakkı sorar; kök/seçenekler farklı; D.'),
 'pdf-a0ab44d8bb78e087-p0040-q01':('AYT','tarih','Osmanlı Devleti’nde Modern Orduya Geçiş','Mühendishane-i Berri-i Hümayun askerî mühendislik okuludur. Bankadaki olumsuz soru ve seçenekler farklı; D.'),
 'pdf-b567543bb4ba18f8-p0024-q01':('AYT','tarih','Abbasi Devleti ve Türkler','İlk para ve İstanbulun ilk kuşatılması Emevi, avasım örgütlenmesi Abbasidir; yalnız II. Bankada farklı dört öncül var; B.'),
 'pdf-b567543bb4ba18f8-p0050-q01':('AYT','tarih','Abbasi Devleti ve Türkler','Mısırdaki ilk Türk devleti Tolunoğullarıdır; banka adayı Haçlılarla mücadele etmeyeni sorar, eş soru değildir; B.'),
 'pdf-b567543bb4ba18f8-p0052-q01':('AYT','tarih','Abbasi Devleti ve Türkler','Ahmed 868=Tolunoğulları, Muhammed 935=İhşidiler; banka adayı Eyyubilerin tanımıdır, farklı; D.'),
 'pdf-c9c099cd3eb05a2c-p0054-q01':('AYT','tarih','Atatürk Dönemi Türk Dış Politikası','Balkan Antantının danışma/güvence koşulu revizyonist yayılmayı engeller. Banka adayı antanta katılmayan ülkeyi sorar; A.'),
 'pdf-c9c099cd3eb05a2c-p0058-q01':('AYT','tarih','Atatürk Dönemi Türk Dış Politikası','Balkan Antantı dayanışmasının Türkiye lehine desteği Montrö Boğazlar Sözleşmesindedir. Banka adayı dönem dışı gelişmeyi sorar; E.'),
 'pdf-c9c099cd3eb05a2c-p0088-q01':('AYT','tarih','Atatürk Dönemi Türk Dış Politikası','Kıta sahanlığı uyuşmazlığı 1923–1932 gündemi değildir; özgün beş sorun ve dönem, bankadaki farklı sorun listesinden ayrıdır; C.'),
 'pdf-d3de30b2ab124359-p0047-q01':('AYT','tarih','Osmanlı Devleti’nde Demokratikleşme Hareketleri','31 Mart Olayı II. Meşrutiyete tepkidir; bankadaki çok gelişmeli olumsuz eşleştirme sorusundan farklı; A.'),
 'pdf-029dd097037ba8ca-p0042-q01':('AYT','tarih','Tek Hanedan Anlayışı ve Gelenekler Işığında Devlet İdarecisi','Trabzon, Amasya, Kütahya, Manisa şehzade sancağıdır; Adana değildir; E.'),
 'pdf-1ccc7f36114af6ff-p0028-q01':('AYT','tarih','İslamiyet’in Türk Devlet ve Toplum Yapısına Etkisi','Kutadgu Bilig devletin ve yöneticinin erdemli düzenini anlatan siyasetnamedir; A.'),
 'pdf-4b2619cbfc7ac879-p0071-q01':('AYT','tarih','Atatürk Dönemi Türk Dış Politikası','Rum göçünün uluslararası uyuşmazlığı Cumhuriyetin ilk yıllarındaki etabli/nüfus mübadelesi sorunuyla karşılaştırılır; C.'),
 'pdf-6573aef021a56670-p0046-q01':('AYT','tarih','II. Dünya Savaşı','1948 sözleşmesi II. Dünya Savaşındaki insanlık dışı uygulamalara karşıdır; daha sonraki Vietnam/Yugoslavya olayları neden olamaz; C.'),
 'pdf-6b14eb8069450040-p0025-q01':('AYT','tarih','Büyük Selçuklu Devleti’nde Yönetim ve Toplum Yapısı','Şehzade eğiticisi atabey, aşevi imaret, sınır yöneticisi uç beyi, hanedan yöneticisi melik; B.'),
 'pdf-ad50b3d27f7ab277-p0007-q01':('AYT','tarih','Büyük Selçuklu Devleti’nde Yönetim ve Toplum Yapısı','Büyük Selçuklu eğitim kurumu medresedir; diğer seçenekler farklı dönem/kurumlardır; D.'),
 'pdf-ad50b3d27f7ab277-p0013-q01':('AYT','tarih','Büyük Selçuklu Devleti’nde Yönetim ve Toplum Yapısı','Rasathanedeki astronomi gözlemleri Celâlî Takviminin hazırlanmasına katkı verir; E.'),
 'pdf-ad50b3d27f7ab277-p0029-q01':('AYT','tarih','Büyük Selçuklu Devleti’nde Yönetim ve Toplum Yapısı','Hükümdarın Tanrı tarafından seçilmesi kut anlayışının devamıdır; C.'),
 'pdf-df1445341a0a7d73-p0038-q01':('TYT','felsefe','İlk Neden (Arkhe) ve Değişim Problemi','Herakleitosun her şey değişip akmada anlatımı varlığın sürekli oluşunu ifade eder; B.'),
})

MATCHES={
 'pdf-c76d197b9be672bc-p0013-q01':('pdf-56dfaf33e5870c67-p0029-q01','TYT','felsefe','Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi',
   'EXACT_TEXT','Kant’ın çıkar gözetmeyen ödev ahlakına ilişkin kök ve bütün seçenekler diğer sunudaki aynı soruyla karşılaştırıldı; iki kez eklenmez; D.'),
 'pdf-f142cc1bd47b3b0a-p0016-q01':('pdf-56dfaf33e5870c67-p0023-q01','TYT','felsefe','Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi',
   'EXACT_TEXT','Çalmayacaksın buyruğuna ilişkin Kant sorusunun kökü ve bütün seçenekleri aynı; aynı soru ikinci kez eklenmez; A.'),
}

CORRECTIONS={
 'pdf-41807fc85f9bcbe3-p0047-q01':{'method':'EXPLICIT_ROLE_ORDER','sourceAnswer':'E','correctedAnswer':'C',
   'requestedRoles':['sanatta betimleme','savaş yöntemi','devlet yönetimi'],
   'itemRoles':{'I':{'sourceText':'Turan (Hilal) taktiği','role':'savaş yöntemi'},
     'II':{'sourceText':'Hayvan figürleri','role':'sanatta betimleme'},
     'III':{'sourceText':'İkili teşkilat','role':'devlet yönetimi'}}},
}

HELD={
 'pdf-41807fc85f9bcbe3-p0047-q01':('SOURCE_KEY_CONTRADICTION',
   'Kaynak cevap slaytı E gösteriyor. Sanat=II (hayvan figürleri), savaş=I (Turan taktiği), yönetim=III (ikili teşkilat); istenen II,I,III sırası C seçeneğidir. Soru ve cevap sayfaları görsel olarak da kontrol edildi.'),
 'pdf-4fb000b99039243b-p0032-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW',
   'Narh ve şehir esnafında fiyat/kalite denetimi sorusudur. Modelin önerdiği çifthane/toprak mülkiyeti başlığı uygun değildir. İlk sayfanın doğru konu/ünite karşılığı ayrıca kesinleştirilmeden kabul edilmedi.'),
 'pdf-5fa39c7abb9588bc-p0016-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Vakıfların toplumsal ve mali işlevleri soruluyor. Çifthane/toprak mülkiyeti başlığına zorlanmadan doğru konu/ünite karşılığı kesinleştirilecek.'),
 'pdf-5fa39c7abb9588bc-p0024-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Avârız akçesi vakfı ve mahalle dayanışması sorusudur; dinî cemaatlere ilişkin millet sistemi etiketi uygun değildir. Vakıf/mahalle kurumunun doğru karşılığı bekleniyor.'),
 'pdf-5ff28f5cba6106f1-p0059-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Takiyüddin ve rasathane/bilim tarihi sorusudur. Müderris ve kadı sözcükleri nedeniyle idarî sınıf etiketi kesinleştirilemez; doğru ilim-kültür kapsamı ayrıca çözülecek.'),
 'pdf-6ed220636c8151de-p0055-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Kapan ve fiyat denetiminin ekonomik amacı sorulur; millet sistemi önerisi yanlıştır. İlgili ekonomi/lonca konu ve ünitesi kesinleşmeden alınmadı.'),
 'pdf-7061f7ee68cbbb64-p0061-q01':('SOURCE_STEM_FACTUAL_ERROR','Soru kökü 12 Mart 1947 yardımını Marshall diye adlandırıyor. Birincil kayıtta bu tarih Türkiye-Yunanistan yardımını içeren Truman Doktrinidir; Marshall önerisi 5 Haziran 1947 tarihlidir. Görsel/metin düzeltilmeden kabul edilmedi.'),
 'pdf-747153888445dc65-p0045-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1960 sonrası DPT ve iç ekonomik planlama sorusudur; dış politika etiketi yanlıştır. Doğru ekonomi konu/ünite karşılığı kesinleşmedi.'),
 'pdf-747153888445dc65-p0058-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1940–1960 bilim/teknoloji tarihi sorusudur. Türkiye’nin savaş siyaseti başlığına zorlanmadı; doğru kültür-bilim tarihi karşılığı bekleniyor.'),
 'pdf-751ac36824cea1c7-p0030-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1961 ve 1982 anayasalarının iç siyasal yapı farkı soruluyor. Dış politika önerisi uygun değildir; doğru anayasa/iç siyaset başlığı kesinleşmeden alınmadı.'),
 'pdf-751ac36824cea1c7-p0077-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1960–1980 iç sosyal-kültürel hayatı sorulur; dış politika ya da yalnız yanlış seçenekteki 1990 sonrası özel TV konusuna etiketlenmedi.'),
 'pdf-85f9787afe45c2fe-p0042-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','XIX. yüzyıl toplumsal modernleşmesi soruluyor; sanayileşme başlığı bütün eğitim-hukuk-giyim değişimlerini doğru biçimde kapsamıyor. Kesin konu/ünite karşılığı bekleniyor.'),
 'pdf-9d252e3d361580f1-p0061-q01':('SOURCE_STEM_FACTUAL_ERROR','İsviçre için 1969 yılı verilmiş. Federal düzeyde kadınların seçme ve seçilme hakkı 7 Şubat 1971’de kabul edilmiştir; İsviçre Parlamentosu kaydıyla kontrol edildi. Kaynak görseli düzeltilmeden kabul edilmedi; sağlık etiketi de yanlıştır.'),
 'pdf-ad96fd5b2f41d72b-p0033-q01':('SOURCE_KEY_AND_TOPIC_REVIEW','Parça petrol ve gelir dağılımıyla ekonomik unsuru açıkça içeriyor. Dinî unsurdan söz edilmiyor; kaynak C gösterse de doğru seçenek D olmalıdır. Ayrıca genel Orta Doğu konusu Türkiye’nin 1960 sonrası dış politikası ya da II. Dünya Savaşı başlığına zorlanmadı.'),
 'pdf-adf571ba1f478060-p0016-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1925 Locarno ve Avrupa’da savaş arası barış düzeni soruluyor. 1960 sonrası Türk dış politikası yanlıştır; doğru savaş arası dünya konu/ünite karşılığı kesinleşmedi.'),
 'pdf-adf571ba1f478060-p0020-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1928 Kellogg–Briand dünya barış paktıdır; Türkiye’nin 1960 sonrası dış politika etiketi uygun değildir. Doğru savaş arası dünya karşılığı bekleniyor.'),
 'pdf-adf571ba1f478060-p0033-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','1929 Dünya Ekonomik Buhranı’nın küresel etkileri soruluyor; Atatürk inkılaplarının ekonomi başlığına zorlanmadı. Kesin küresel ekonomi konu/ünite karşılığı bekleniyor.'),
 'pdf-b6090dbbc3efe582-p0020-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Camp David ve Mısır-İsrail barışı soruluyor; Türkiye’nin 1960 sonrası dış politikası başlığı uygun değildir. Doğru Orta Doğu diplomasisi karşılığı bekleniyor.'),
 'pdf-b6090dbbc3efe582-p0056-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Irak’ın Kuveyt’i işgali ve Körfez krizi soruluyor. Yalnız 1990 sonrası Türkiye veya Türk dış politikası başlığına zorlanmadan doğru dünya/Orta Doğu karşılığı kesinleştirilecek.'),
 'pdf-c4c6209b26aa5257-p0030-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','İslam öncesi Arabistan’da haram aylar ve panayırlar sorusudur. İslamiyet’in yayılma dönemi etiketi zaman bakımından uygun değildir; doğuş koşulları karşılığı bekleniyor.'),
}

HELD.update({
 'pdf-0007ff4416955346-p0018-q01':('SOURCE_KEY_CONTRADICTION','Farklardan biri değildir sorusunda her ikisinin konusu olan dinî deneyim D seçeneğidir; kaynak kırmızı E gösteriyor. Banka adayı farklı kök ve beş farklı seçenek içeriyor; ne yeni doğru soru ne eş soru olarak onaysız kabul edildi.'),
 'pdf-403504d3cd0fd171-p0026-q01':('SOURCE_KEY_CONTRADICTION','Kaynak Makedonya B gösteriyor; Balkan savaşları öncesinde kaybedilen Bosna-Hersek C olmalıdır. Bankadaki Bosna-Hersek B ile seçenek sırası farklıdır; kaynak hatası kesin kanıtla düzeltilmeden tam sayılmadı.'),
 'pdf-58b5cf6a90bea871-p0013-q01':('DISTRACTOR_VARIANT_REVIEW','Aynı kök ve dört seçenek var; B seçeneği bilim etkilemez/ilerlemeyi engeller biçiminde farklı önerme içeriyor. Kaynak varyantı tekrar eklenmeden veya yanlışlıkla tamamen aynı sayılmadan ayrıca çözülecek.'),
 'pdf-5cda8723d5df6177-p0023-q01':('DISTRACTOR_VARIANT_REVIEW','Aynı kökte A seçeneği var olan devleti belirlemek/betimlemek biçiminde farklılaşmış. Varyant kararı ayrıca kesinleşmeden ikinci soru eklenmedi.'),
 'pdf-85f9787afe45c2fe-p0008-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Şinasi/Tercüman-ı Ahval ve Osmanlı basını sorusudur; sanayileşme başlığına zorlanmadı. Banka adayı gazete sıralamasını soran farklı sorudur.'),
 'pdf-a0ab44d8bb78e087-p0052-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Muzika-i Hümayun ve müzik tarihi sorusudur; ekonomi, sanayileşme veya Atatürk inkılabı başlığına zorlanmadı. Bankadaki dönüşüm sorusunun kök ve seçenekleri farklıdır.'),
 'pdf-c5a553f237b3aadf-p0013-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Hünkâr İskelesi ve Kavalalı Mehmet Ali Paşa krizi sorusudur. İlgili uluslararası denge konusunun dar karşılığı kesinleşmeden genel tehditler başlığına zorlanmadı; banka adayı farklı öncüllüdür.'),
 'pdf-c76d197b9be672bc-p0005-q01':('SOURCE_STEM_TEXT_REVIEW','Soru isteminde bir ... içermektedir ifadesinin yanıt/açıklama sözcüğü metin çıkarımında yok. Banka adayı Aristoteles kökü ve seçeneklerinden farklı; görsel/metin okuması tamamlanmadan eklenmedi.'),
 'pdf-d77db725f41ce027-p0017-q01':('DISTRACTOR_VARIANT_REVIEW','Aynı Nurettin Topçu kökü ancak D ve E seçenekleri farklı önermelerdir; modelin birebir aynıdır iddiası yanlış. Varyant kararı kesinleşmeden ikinci kez eklenmedi.'),
 'pdf-d77db725f41ce027-p0044-q01':('DISTRACTOR_VARIANT_REVIEW','Aynı Popper kökünde E seçeneği duyu verisinin tek kaynak olduğu ek iddiasını içermiyor; aynı beş seçenek değildir. Varyant kararı ve kaynak altlığının kırpımı ayrıca kontrol edilecek.'),
 'pdf-20ab117c2174b8fd-p0043-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','İbn Rüşdün Avrupa felsefesine etkisi soruluyor; Abbasi yönetimi veya İslamiyetin yayılması başlığı uygun değildir. Doğru bilim/felsefe tarihi kapsamı kesinleşmedi.'),
 'pdf-20ab117c2174b8fd-p0051-q01':('CONTROLLED_TOPIC_SCOPE_REVIEW','Karahisari/Hafız Osman ve hat sanatı sorusudur; İslamiyetin yayılması veya Abbasi siyasal yönetimi başlığına zorlanmadan doğru kültür-sanat karşılığı bekleniyor.'),
})

EXTERNAL_SOURCES={
 'pdf-7061f7ee68cbbb64-p0061-q01':[
   {'title':'National Archives — Truman Doctrine (1947)','url':'https://www.archives.gov/milestone-documents/truman-doctrine',
    'supports':'12 Mart 1947 Türkiye ve Yunanistan yardım talebi Truman Doktrinidir.'},
   {'title':'National Archives — Marshall Plan (1948)','url':'https://www.archives.gov/milestone-documents/marshall-plan',
    'supports':'Marshall önerisi 5 Haziran 1947, kanun 3 Nisan 1948 tarihlidir.'}],
 'pdf-9d252e3d361580f1-p0061-q01':[
   {'title':'Swiss Parliament — Women’s suffrage in Switzerland',
    'url':'https://www.parlament.ch/en/%C3%BCber-das-parlament/political-women/conquest-of-equal-rights/women-suffrage',
    'supports':'Federal seçme ve seçilme hakkı 7 Şubat 1971 tarihinde kabul edildi.'}],
 'pdf-b094ab6e26e57495-p0018-q01':[
   {'title':'ÖSYM — 2016 YGS Temel Soru Kitapçığı ve Cevap Anahtarı',
    'url':'https://dokuman.osym.gov.tr/pdfdokuman/2016/YGS/YGS14032016.pdf',
    'questionPdfPage':20,'answerKeyPdfPage':47,'section':'Sosyal Bilimler','printedNumber':34,'officialAnswer':'A',
    'sha256':'7a50566da2fefd61d53c9df2aaf24cf2ce58a03c990c86e7eddad56181c4995a',
    'supports':'Özgün soru gövdesi/seçenekler ve resmî cevap anahtarı karşılaştırıldı.'}],
}


def main():
    categories=json.loads(query(db_connection('ivme'),'SELECT json_agg(definition) FROM learning_catalog.current_categories'))
    staged={c['code']:(path,p,c) for path in (OUT/'slide-candidates').glob('*/candidates.json')
            for p in [json.loads(path.read_text(encoding='utf-8'))] for c in p['cards']}
    items=[]
    readings=[(code,values,'NEW',None,'SOURCE_ANSWER_CORRECTION' if code in CORRECTIONS else 'NEW_SOURCE_QUESTION') for code,values in NEW.items()]
    readings += [(code,(exam,subject,topic,reading),'MATCH',canonical,kind)
        for code,(canonical,exam,subject,topic,kind,reading) in MATCHES.items()]
    for code,(exam,subject,topic,reading),decision,canonical,kind in readings:
        path,package,card=staged[code]
        if package['version']!='slide-vector-and-pixel-answer-v2':raise ValueError('Source extractor changed; review the content again')
        choices=[]
        for name in topic if isinstance(topic,list) else [topic]:
            matched=[c for c in categories if c['exam']==exam and c['subjectId']==subject and c['topic']==name and c.get('canonicalUnit')]
            if len(matched)!=1:raise ValueError('Controlled source topic ambiguity: '+code)
            choices.extend(matched)
        effective_answer=reviewed_answer(card,{'answerCorrection':CORRECTIONS.get(code)})
        if not reading.endswith(effective_answer+'.') and effective_answer+'; ' not in reading and '; '+effective_answer+'.' not in reading:
            # The explanatory reading may continue after the source answer.
            if '; '+effective_answer+'.' not in reading:raise ValueError('Source reading does not agree with the reviewed answer: '+code)
        items.append({'sourceCode':code,'sourceSha256':package['sourceSha256'],'sourcePackage':path.relative_to(APP).as_posix(),'packageSha256':digest(path),
            'decision':decision,'canonicalCode':canonical,'matchType':kind,'categoryIds':[c['id'] for c in choices],
            'imageSha256':card['imageSha256'],'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),
            'sourceReading':reading,'teacherApproved':False})
        if code in CORRECTIONS:items[-1]['answerCorrection']=CORRECTIONS[code]
        if code in EXTERNAL_SOURCES:items[-1]['externalSources']=EXTERNAL_SOURCES[code]
    issues=[]
    for code,(reason,reading) in HELD.items():
        path,package,card=staged[code]
        issues.append({'sourceCode':code,'sourceSha256':package['sourceSha256'],'imageSha256':card['imageSha256'],
            'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),'reason':reason,
            'sourceReading':reading,'sourceAnswer':card['answer'],'teacherApproved':False})
        if code in EXTERNAL_SOURCES:issues[-1]['externalSources']=EXTERNAL_SOURCES[code]
    write_json(OUT/'slide-content-review.json',{'reviewMethod':'SOURCE_CONTENT_REVIEW','teacherApproved':False,'items':items,'issues':issues})
    print(json.dumps({'sourceReadings':len(items),'teacherApproved':False}),flush=True)


if __name__=='__main__':main()
