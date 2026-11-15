# 16. Adım — Öğrenme kalitesi, kaynak düzeni ve model kullanımı

Durum: plan onaylı; 16.01 ve 16.02 BITTI; 16.03 silme kısmı bitti (taşımalar ertelendi); 16.04 sürüyor: [fizik öğretim
yöntemi](#fizik-öğretim-yöntemi-1604-pilot-genişlemesi) için içerik taslağı tamamlandı; GPT-6.1 Sol kod pilotu uygulamaya bağlı; ilk Sol extra high denetimi 19/28 ile kaldı; ilk düzeltme 24/28, F04 kısmi; Opus 5.5 yeniden denetimi 25/28 teknik PASS; B1 (ayrılan ÖSYM sorularının erken görünmesi), A8, öğretmen onayı ve kullanıcı kabulü bekliyor. Kalıcı kurallar
[AGENTS.md](../../AGENTS.md), devam noktası [devir notunda](../devam.md).

## Hedef

YKS öğrencisinin her konuyu sıfırdan ileri düzeye görerek, deneyerek ve ölçülerek öğrendiği,
sade gezinmeli bir ürün. Çalışma alanında yalnız kullanılan dosya ve yalnız güncel belge kalır.

## Kararlar (kullanıcı)

1. Veritabanı PostgreSQL kalır.
2. **Arşiv yok, gereksiz olan silinir.** Video ve ses dosyaları tutulmaz; uygulama videoyu bağlantıdan açar.
3. **Aynı dosya iki yerde tutulmaz.** `D:\workspace\mebi-yks` içeriği `D:\workspace\ivme` içinde de varsa ivme'deki kopya silinir; tek kopya hedef düzene taşınır (`mebi-yks` dosyaları ivme'ye *taşınır*, kopyalanmaz) ve `mebi-yks` klasörü boşalınca kaldırılır.
4. **Soruları sisteme alınmış PDF'in aslı tutulmaz**; ayrıca düzenlenmeden tek bir `soru-referansi/` klasörüne konur (yalnız soru bankası referansı). Konu anlatan PDF kalır (sayı sınırı yok); ders/ünite/konusu kayıtta bir kez tutulur.
5. Kalan konu PDF'leri sınav → ders → ünite → konu klasör düzenine taşınır.
6. Proje, klasör ve dosya adları gerektiğinde değiştirilir, birleştirilir veya silinir; amaç düzenli ve anlaşılır tek yapıdır.
7. Belgeler bilgi kaybı olmadan en aza indirilir; kapanmış iş dosyaları silinir (geçmiş `git log`'dadır).
8. Pratik 2 soru aktarımı 10.959 kabul edilmiş soruda dondurulur.
9. Model erişimi: abonelik + yerel Ollama; API/Batch yok.

## Mevcut durum

| Alan | Bulgu |
|---|---|
| İçerik | Katalogda 542 konu grubu; derin anlatım yalnız 34 matematik dersinde. Diğer derslerde 1 Fizik pilotu ve 2–4 interaktif ünite. |
| Kök neden | Her ders elle, konuya özel JSX/SVG ile yazılıyor; ortak şema, bileşen kataloğu ve kalite rubriği yok. |
| Gezinme | ~40 rota; aynı işi yapan 12 öğrenci girişi. |
| Öğrenme motoru | `frontend/src/learn/engine/` iyi durumda (FSRS, 1-3-7-14-30-60 gün merdiveni, yanlış kuyruğu, %80 ustalık, yerleştirme, seri). Yeniden yazılmaz. |
| Dosyalar | ~12.000 PDF (YKS 8.352, OGM 2.687, KPSS 730, LGS 224). mp4 2.091, mp3 2.039, zip 162. |
| Sabit bağlantı | Videolar üç yolda aynı dosyadır: `mebi-yks`, `Kaynaklar/YKS/Dersler`, `Kaynaklar/YKS/Katalog/EskiYollar`. Tek yolu silmek yer açmaz; bütün bağlantılar silinmelidir. Gerçek disk kullanımı 16.02'de ölçülür. |
| Video adresleri | `mebi-yks/katalog.json` (1.811 sayfa, `assets`) ve `video-boyutlari.json` MEBİ CDN adreslerini taşır; bir kısmı oturum ister (`oturum-gerektiren.json`). YouTube bağlantıları `frontend/src/curriculumVideos.js` içindedir. |
| Çalışma verisi | `uygulama/veri` ~53–60 GB (kırpım, kanıt, önbellek, denetim görüntüsü); `yedekler` 3,7 GB (5 döküm). |
| Hazır temel | `pipeline/`: OGM 2.686 PDF / 58.371 sayfa metne çıkarılmış, 38.321 parça `bge-m3` ile gömülü, 542 konuya eşli. |
| Belgeler | `docs/` + `AGENTS.md` 10.484 satır; kapanmış YKS-00–13 görev dosyaları ~2.700 satır; `veri/` altında 162, `Kaynaklar/` altında ~100 `.md`. |
| Yerel modeller | `gpt-oss:20b`, `qwen3.5:9b`, `gemma3:4b`, `bge-m3`; 8 GB GPU, 32 GB RAM. |

## Hedef ürün

### Dört ana yer

| Yer | İçerik | Birleşen eski girişler |
|---|---|---|
| Bugün | Günün planı: tekrar, yeni konu, yanlışlar | Öneriler, yarım kalan çalışma |
| Öğren | Ders → ünite → konu; her konu tek sayfa | Konuyu Öğrenelim, İnteraktif Öğrenme, Akıllı Öğretmen, Konu Anlatımları, Ders Notları, Özel Ders, Konular ve Kaynaklar |
| Çöz | Konu testi, karışık pratik, çıkmış sorular, deneme | Soru Bankası, Pratik, Pratik 2, Çıkmış Sorular, Sınav |
| İlerleme | Konu ustalığı, netler, geçmiş | İlerleme, Geçmiş, deneme tabloları |

Eski adresler yönlendirilir; yönetim ekranları `/yonetim` altında toplanır; öğrenci geçmişi korunur.

### Konu sayfası (her derste aynı akış)

1. **Neden?** Günlük bağlam ve tahmin sorusu.
2. **Gör ve dene.** Konuya uygun etkileşimli model.
3. **Birlikte çöz.** Adım adım örnek (ne / neden / nasıl kontrol ederim); adımlar giderek öğrenciye bırakılır.
4. **Püf noktası.** Kısa yol, geçerli olduğu koşul, yanılttığı yer, sınavda soruluş biçimi.
5. **Kendini sına.** 4–6 kavram sorusu; her yanlış şıkka özel açıklama.
6. **Gerçek sorular.** Konu testi; her soruda açıklamalı çözüm ve ipucu.
7. **Tekrar.** Ders sonu geri çağırma, sonra aralıklı tekrar.
8. **Video.** Konunun videosu bağlantıdan açılır (MEBİ veya YouTube); yerel dosya yok.

Bu akış fizikte [basamak merdiveniyle](#basamak-merdiveni-her-fizik-konusu) sıfırdan sınav düzeyine genişler; fizikte
onaylanınca bütün derslerin akışı olur.

### Derse göre görsel dil

| Dersler | Ana etkileşim |
|---|---|
| Matematik, Geometri | Değeri değişen model, sayı doğrusu, grafik, şekil sürükleme |
| Fizik, Kimya | Simülasyon, senkron grafik |
| Biyoloji | Etiketli şema, süreç akışı, sıralama/eşleştirme |
| Tarih | Zaman şeridi, neden → sonuç zinciri, harita, karar oyunu |
| Coğrafya | Harita katmanları, iklim grafiği |
| Türkçe, Edebiyat | Metin işaretleme, öge ayırma, dönem/eser eşleştirme |
| Felsefe, Din Kültürü | Kavram haritası, görüş karşılaştırma, argüman şeması |

Durağan şema ve akış için Mermaid (tembel yüklenir); etkileşim için `interactive/kit/` ve `learn/lesson/`.

### Bilimsel dayanak → ürün kuralı

| İlke | Kural |
|---|---|
| Geri çağırma pratiği (Roediger ve Karpicke; Dunlosky) | Her bölüm kısa soruyla biter; okumak "tamamlandı" saymaz |
| Aralıklı tekrar (Cepeda) | Ders sonu → 1, 3, 7, 14, 30, 60 gün; son 21 günde sıkışır |
| Çözümlü örnek ve azalan yardım (Sweller; Renkl) | Tam çözüm → eksik adım → bağımsız soru |
| Karışık pratik (Rohrer) | Konu testinden sonra önceki konularla karışık set |
| Çoklu ortam (Mayer) | Görsel ve açıklama yan yana; süs görsel yok; ekranda tek fikir |
| Kendine açıklama (Chi) | "Neden?" soruları, seçenek gerekçesi |
| Ustalık (Bloom) | %80 ve her soru tipinden doğru olmadan konu kapanmaz; geçilemeyen tip geri gelir |
| Uygun zorluk (~%85 başarı; Wilson) | 2 yanlış → ipucu ve kolay kardeş soru; 3 doğru → daha zor |
| Hataya özel geri bildirim (Hattie ve Timperley) | Yanlışta moral bozmayan, nedeni söyleyen mesaj |
| İç motivasyon (Deci ve Ryan) | Kutlama (konfeti/havai fişek) ustalık ve seri dönüm noktalarında; hareket azaltma tercihine uyar |

### Kişisel ders planı (en yüksek net için)

- **Öncelik puanı** = konunun sınavdaki soru ağırlığı × öğrencinin açığı × öğrenilebilirlik (ön koşulları tamam mı).
  Ağırlık kaynağı: `Kaynaklar/mufredat/konu-listeleri/` 2018–2026 konu-soru dağılımları.
- **Başlangıç:** kısa yerleştirme testi; bilinen konu atlanır, eksik ön koşul öne alınır.
- **Günlük sıra:** vadesi gelen tekrar → yanlış kuyruğu → yeni konu → karışık set. Yeni konu payı en çok %40.
- **Haftalık:** bir deneme ve hata analizi; yanlış soru tipleri sonraki haftanın planına girer.
- **Son 21 gün:** yeni konu durur; deneme, yanlışlar ve yüksek ağırlıklı konuların tekrarı.
- Uygulama yeri: `learn/engine/plan.js`, `placement.js`, `selection.js` (ek; mevcut davranış korunur).

## Kaynak düzeni

### Hedef klasör yapısı

```
Kaynaklar/
  konu-anlatim/<Sınav>/<Ders>/<Ünite>/<Konu>/   konu başına sayı sınırı yok; her PDF'in ders/ünite/konusu kayıtta
  soru-bekleyen/<Sınav>/<Ders>/                 sorusu henüz bankaya alınmamış veya kısmen alınmış PDF
  soru-referansi/<Sınav>/                       soruları sistemde olan asıllar; düzenlenmez, yalnız referans
  cikmis-sinavlar/                              resmî ÖSYM kitapçıkları (küçük; cevap itirazında referans)
  mufredat/                                     tek kopya
```

`Sınav`: YKS (TYT/AYT), KPSS, LGS, yurt dışı. `mebi-yks` içindeki dosyalar bu yapıya taşınır, klasör kaldırılır;
`katalog.json` ve `envanter.jsonl` kaynak kaydına aktarılır. `Kaynaklar/YKS/Katalog/EskiYollar` kaldırılır.

### Kaynak kaydı (PostgreSQL, tek tablo)

Her dosya için: SHA-256, boyut, sayfa sayısı, tür (konu anlatımı / soru / deneme / kitap), sınav–ders–ünite–konu,
özgün indirme adresi, bağlı soru sayısı, karar (kalır / silinir / bekler) ve gerekçe. Silinen dosyanın satırı kalır;
adresi olan dosya gerektiğinde yeniden indirilebilir. Birleşecek mevcut kayıtlar: `veri/pdf-source-registry`,
YKS-13 sonuçları, `pipeline` (ogm_ders), `mebi-yks/envanter.jsonl`.

### Silme kuralları

| Ne | Koşul |
|---|---|
| mp4, mp3 | Video adresi kayıtta ve bağlantı denetiminden geçtiyse bütün sabit bağlantılarıyla silinir. Adresi olmayan video listelenir, kullanıcı karar verir |
| zip | İçindeki dosyalar kayıtta varsa silinir |
| Aynı PDF (aynı hash; ya da aynı sayfa sayısı + ilk üç sayfa önizlemesi) | Bir kopya kalır; ivme ve mebi-yks'te ikisi de varsa ivme'dekini sil, mebi-yks'tekini hedef düzene taşı |
| Soru PDF'i | Cevaplı bütün soruları bankada kırpım + cevapla duruyorsa `soru-referansi/`'ne taşınır (düzenlenmez); kısmi alınmışsa `soru-bekleyen/` |
| Konu anlatımı | Sayı sınırı yok (kullanıcı kararı). Yalnız sistemde aynısı varsa (aynı hash) silinir; yoksa kalır, konusu belirsizse belirsiz olarak kayıtlı kalır. Ders–ünite–konu bir kez eşlenir, işlem sırasında tekrar uğraşılmaz |
| Genel ilke | Sistemde karşılığı olmayan dosya silinmez. Kullanılmayan, işe yaramayan, yedek ve tekrar dosya silinir; çalışan sistem (DB, uygulamanın okuduğu görsel/PDF klasörleri) bozulmaz. Referansı sürenler (`yks-birlestirme`, `mebi-pratik-2`, `pdf-accept` dökümleri) okuyan kod ve DB karşılığı doğrulanınca silinir |
| `uygulama/veri` | Uygulamanın sunduğu kırpımlar ve küçük kabul makbuzları kalır; önbellek, geçici dosya, eski denetim görüntüsü, geri yükleme kopyası silinir |
| `yedekler`, `pipeline/backups` | Yalnız son geçerli veritabanı dökümü kalır (öğrenci verisi koruması; arşiv değildir) |
| Kaynak içindeki `.md` durum notları | Bilgisi kayda aktarılır, dosya silinir |

Her silme önce **kuru çalıştırma listesi** üretir (dosya, boyut, gerekçe); kullanıcı kategoriyi onaylar, sonra silinir.
Silmeden önce güncel veritabanı dökümü alınır. Öğrenci kayıtları ve soru kimlikleri değişmez.

## İçerik mimarisi

- **Konu paketi şeması:** [learning-resource-v2](../semalar/learning-resource-v2.schema.json) genişletilir.
  Paket = bölümler → bloklar (anlatım, model, çözümlü örnek, püf noktası, yanılgı, kontrol sorusu, Mermaid şema,
  zaman şeridi, harita, eşleştirme, sıralama, video bağlantısı) + kaynak sayfa referansları + soru bağları.
- **Bileşen kataloğu:** ~15 parametrik blok. Yeni konu veridir; konuya özel JSX yazılmaz.
  Yeni bileşen en az üç konuda kullanılacaksa eklenir.
- Mevcut 34 matematik dersi korunur ve aynı bloklarla çizilir.
- **Kalite rubriği (12–15 ölçüt):** doğruluk, kaynak bağı, sıfırdan anlaşılırlık, görselin işlevi, örnek kalitesi,
  püf noktasının koşulu, soru–kavram uyumu, dil. Eşik altı paket yayımlanmaz.
- Öğretmen onayı olmayan içerik "Öğretmen kontrolü bekliyor" etiketiyle görünür.

## Fizik öğretim yöntemi (16.04 pilot genişlemesi)

**Kullanıcı değerlendirmesi (model konu Hareket):** sayfa soru tiplerinden başlıyor; konuyu hiç bilmeyen öğrenciyi
sıfırdan alıp kavram, grafik, formül ve soru çözümüyle ileri düzeye taşıyan adım adım **konu eğitimi** eksik. PDF
yalnız en sonda kaynak. Hedef: öğrenci PDF okumadan, her adımda bir şey yaparak kavramı, bakış açısını ve sorunun
mantığını öğrenir. Yöntem önce bütün fizikte kurulur, sonra derse özgü katmanı değişerek öbür derslere geçer.

### Dayanak: fizik eğitimi araştırması → ürün kuralı

Genel ilkeler (geri çağırma, aralıklı tekrar, karışık pratik, ustalık) yukarıdaki tablodadır. Fiziğe özgü olanlar:

| Bulgu | Kural |
|---|---|
| Etkileşimli derste kavram kazancı geleneksel derse göre yaklaşık iki kat (Hake: 62 ders, 6.000 öğrenci, normalize kazanç 0,48 ve 0,23); etkin öğrenme başarısızlığı azaltır (Freeman ve ark. meta-analizi) | Her ekran öğrenciye bir hamle yaptırır; okumak tek başına ilerletmez |
| Yanılgı anlatımla değil, ortaya çıkar → yüzleştir → çöz döngüsüyle değişir (McDermott, *Tutorials in Introductory Physics*; tahmin–gözle–açıkla, White ve Gunstone) | Her kavram tahminle açılır; deney tahmini sınar; açıklama yüzleşmeden sonra gelir |
| Uzman soruyu ilkesine, acemi yüzeyine göre gruplar (Chi, Feltovich ve Glaser) | Tip tanıma ayrı alıştırma: "Bu soru hangi ilkeyle çözülür?" (çözmeden); yüzeyi benzer, ilkesi farklı soru çiftleri |
| Anlama, temsiller arası geçişte ölçülür (Hestenes, Modelleme Öğretimi; Beichner, kinematik grafik testi) | Her konu temsil zinciri taşır: olay → şekil/hareket haritası → tablo → grafik → denklem → sözel; her geçiş ayrı alıştırma |
| Somuttan soyuta (Fyfe ve ark.) ve ön eğitim ilkesi (Mayer) | Önce olay ve deney, sonra sade çizim, en son sembol; terimler deneyden önce bir cümleyle tanıtılır |
| Kavram sorusu ve tahmin oylaması (Mazur, Akran Öğretimi; Sokoloff ve Thornton) | Hesap gerektirmeyen kavram soruları; çeldiriciler bilinen yanılgılardan |
| Yapılandırılmış problem çözme (Heller ve Heller; Polya) | Her çözümlü örnek aynı beş adım: **Anla → Çiz → İlke seç → Sembolle çöz → Kontrol et** |
| Uzmanlık tersine etkisi (Kalyuga) | Bilen öğrenci basamağı kısa kontrolle atlar; ustalaştıkça çözümlü örnek kalkar |
| Karşılaştırmalı vakalar (Gentner; Schwartz ve Bransford) | İki örnek yan yana: "Ne aynı, ne farklı, hangisi hangi ilke?" |
| Simülasyon tasarımı (PhET: örtük iskele, bağlı temsiller) | Az kontrol, cisimle eş zamanlı grafik; serbest denemeden önce tek görev |

### Örnek alınan siteler (yalnız yöntem; metin, görsel ve soru kopyalanmaz)

| Site | Alınan kalıp |
|---|---|
| PhET (Colorado) | Cisim ile x–t, v–t, a–t grafiklerinin aynı anda değişmesi; az düğme, keşfe açık görev |
| The Physics Classroom | Her alt bölüm sonunda "Anladın mı?" sorusu; *Concept Builder*: aynı fikir farklı yüzeyle, üst üste doğru gelince geçiş, yanlışta yardım ekranı |
| Isaac Physics (Cambridge) | Düzeylere ayrılmış sorular; adım adım açılan ipucu; önce sembolik cevap |
| Khan Academy | Ustalık düzeyleri, ipucu kullanımı ustalığı yavaşlatır, kısa video bağlantısı |
| Brilliant | Önce soru, sonra açıklama; ekran başına tek fikir |
| MEB/OGM ders notları, sistemdeki konu anlatımları | Müfredat kapsamı, kazanım, Türkçe terim ve sınav dili; içeriğin doğruluk kaynağı |

Kavram envanterlerinin (FCI, TUG-K) maddeleri dağıtımı kısıtlı olduğu için kullanılmaz; aynı yanılgıları ölçen kendi
maddelerimiz yazılır.

### Basamak merdiveni (her fizik konusu)

Konu = 4–8 durak (bir durak bir kavram). Basamak 1–4 her durakta, 5–7 konu düzeyindedir. Yerleştirme ön testi
bilinen basamakları atlatır; atlanan basamak her an açılabilir.

| Basamak | Amaç | Etkinlik | Geçiş ölçütü |
|---|---|---|---|
| 0 Ön koşul | Eksik aracı tamamla | 3–5 soruluk kontrol; eksikte araç kutusundan 2–4 dakikalık mikro ders | Kontrol doğru veya mikro ders bitti |
| 1 Sezgi | Olayı fark et | Tahmin → deney → açıklama; formül yok | Yanılgı sorusu doğru ve gerekçe seçildi |
| 2 Kavram dili | Tanım ve ayrım | Kavram çiftleri (yol/yer değiştirme), örnek–karşı örnek, sınıflama | Üst üste 3 doğru |
| 3 Temsiller | Çeviri | Hareket haritası ↔ x–t ↔ v–t ↔ a–t ↔ sözel: eşleştir, çiz, hatayı bul | Her geçişten 1 doğru |
| 4 Nicel ilişki | Formülün anlamı | Formül modelden türetilir (eğim, alan); birim ve geçerlilik koşulu; tam çözüm → eksik adım → bağımsız soru | 2 bağımsız doğru |
| 5 Soru tipleri | Tanı ve ilk hamle | Çözmeden tip seçme, püf noktası + koşul + tuzak, ÖSYM çözümlü örnek | Her tipten 1 bağımsız doğru |
| 6 Sınav düzeyi | Aktarım | Kolaydan zora düzeyli set, karışık tur, iki adımlı ve konu arası soru, süreli tur | %80 ve her tipten doğru |
| 7 Kalıcılık | Unutmamak | Geri çağırma kartları, aralıklı tekrar, geçilemeyen tipin dönüşü (ustalık motoru, 16.06) | Motor |

**Fizik problem çözme protokolü:** Anla (ne soruluyor, verilenler birimiyle) → Çiz (şekil, hareket haritası veya
kuvvet diyagramı; pozitif yönü seç) → İlke seç (hangi yasa, geçerli mi) → Sembolle çöz, sonra sayı koy →
Kontrol et (birim, işaret, uç durum, büyüklük tahmini). Bütün örnek ve ipuçları bu sırayla yazılır; öğrenci
basamak 4'ten sonra adımları kendisi doldurur.

**Fizik araç kutusu (ortak mikro dersler; bir kez yazılır, konular bağlanır):** birim ve çevirme (km/h ↔ m/s),
oran–orantı ("iki katına çıkarsa"), vektör (yön, toplama, bileşen, 37°–53° üçgeni), grafik okuma (eğim, alan,
kesişim), sembolik düzenleme, büyüklük tahmini, işaret ve referans yönü. Her mikro ders 3–5 ekran ve kendi kontrolü.

**Yanılgı kataloğu (konu başına 5–10):** kaynakları fizik eğitimi literatürü, ders notlarındaki "dikkat" kutuları ve
banka sorularının çeldiricileridir. Öğrencinin seçtiği yanlış şık istatistiği sonra eklenir; fizikte şimdilik 14
deneme var, yetmez. Her yanılgının dört parçası olur: ortaya çıkaran soru, yüzleştiren deney, çözen açıklama ve
karma turda veya tekrarda gecikmeli yeniden sınama. Hareket örnekleri: "ivme sıfırsa cisim durur", "hız sıfırsa ivme
de sıfırdır", "x–t grafiği yoldur", "grafikte yukarıdaki daha hızlıdır", "ortalama hız, hızların ortalamasıdır".

### Ölçüm (pedagojik kabul)

Konu başına yanılgılara dayalı 8–10 maddelik kendi kavram testimiz ön ve son test olarak kullanılır. Normalize kazanç
= (son − ön) / (100 − ön); hedef ≥ 0,4. Bir hafta sonra görülmemiş ÖSYM sorusu yardımsız çözülür. Ölçütler denemeden
önce yazılır; tıklama, süre ve beğeni öğrenme kanıtı değildir.

### Üretim yöntemi (konu başına; 16.07 hattının fizik biçimi)

1. **Kanıt paketi** (betik + Ollama): **bütün kaynaklar kullanılabilir; sayı sınırı yoktur, uygun olan kullanılır.**
   Konuya eşli her belge taranır: MEB/OGM sayfaları (`pipeline` eşlemesi), kayıttaki bütün konu anlatımları (fizikte
   215 belge), kazanımlar, bankadaki sorular (temas tabakası: `scripts/konu/soru_tabakasi.py`; fizikte 10.525 soru,
   97 konu), ÖSYM soruları, ön koşul konular. Uygunluk ölçütü: konuyu kapsıyor, doğru, metni okunuyor, kazanıma ve
   sınav diline uyuyor, başka kaynakta olmayan bir şey (yanılgı, örnek, şekil, soru tipi) katıyor. Paket her ölçütü
   karşılayan sayfaları taşır; kullanılmayan belgenin nedeni kaynak kaydına yazılır.
2. **Konu haritası** (Fable 5.2 ilk konular, sonra Opus 5.5): duraklar, ön koşullar, yanılgı kataloğu, temsil zinciri, formüllerin türetimi ve
   koşulu, soru tipleri ve sıklığı. Yazmaya geçmeden önce kullanıcıya tek tablo olarak gösterilir.
3. **Paket taslağı** merdivene göre; mevcut parçalar yeniden kullanılır: `interactive/motion/` stüdyosu (bağlı
   grafikler), Akıllı Öğretmen soru içeriği (ipucu, yanılgı, ikiz soru), matematik laboratuvarı kabul ölçütleri.
4. **Betik denetimi**: şema, bağımsız hesap, ÖSYM anahtarı, her yanılgının dört parçası, her formülde birim ve koşul,
   her basamakta geçiş ölçütü.
5. **Bağımsız doğrulama** (farklı sağlayıcı, rubrik) → kullanıcı/öğretmen → öğrenci ölçümü.

Şema `konu-paketi-v1` → v2: `onkosul`, `yanilgilar`, `temsiller`, blok başına `basamak`, araç kutusu bağı, `envanter`.

### Derslere genelleme

Aynı kalan: merdiven, problem çözme protokolü (adımların adı derse göre), yanılgı kataloğu, araç kutusu fikri, ölçüm.
Derse göre değişen: temsil zinciri (kimya: makroskobik → tanecik → sembol; biyoloji: yapı → işlev → süreç; tarih:
olay → neden → sonuç → zaman; Türkçe: metin → yapı → anlam), araç kutusunun içeriği ve deney türü.

## Proje ve belge düzeni

Hedef: tek, sistematik yapı. Ad değiştirme, birleştirme ve silme serbesttir; her taşımada kod, betik, test ve belgelerdeki
yollar aynı işte güncellenir ve `python scripts/ivme.py plan` ile `kontrol` geçer.

### Proje yapısı (kök `D:\workspace\ivme`)

| Klasör | Görev | Değişiklik |
|---|---|---|
| `uygulama/` | Kod, belgeler, testler | `scripts/` alt klasörlere ayrılır: `pratik2/` (donmuş soru aktarma), `yks/`, `icerik/`, `kaynak/`; kapanmış tek seferlik betikler silinir |
| `uygulama/veri/` | Çalışma verisi | Kök `icerik/data` buraya taşınır (yollar tek sabit dosyasında toplanır); önbellek ve eski denetim çıktıları silinir |
| `Kaynaklar/` | Kaynak PDF'ler | Yukarıdaki hedef klasör yapısı |
| `araclar/` | OGM metin çıkarma/embedding ve KPSS soru çıkarma betikleri | `pipeline/` ile `veri-hatti/` birleşir; durum raporları, `.pid`, `.lock`, `.tmp` silinir |
| `yedekler/` | Son veritabanı dökümü | Tek dosya |

Kaldırılır: `D:\workspace\mebi-yks` (dosyalar taşındıktan sonra), kök `icerik/`, `veri-hatti/`, `pipeline/`,
`__pycache__`, `.pytest_cache`.

### Belge düzeni (hedef: ~10.500 satırdan ~2.500 satıra)

| Yeni | Birleşen eski | Sınır |
|---|---|---|
| `AGENTS.md` | Yalnız her işte geçerli kurallar | 60 satır |
| `README.md` (kök) | Çalıştırma ve klasör haritası | 20 satır |
| `docs/README.md` | İçindekiler | 20 satır |
| `docs/devam.md` | Etkin iş, sıradaki komut, açık karar | 40 satır |
| `docs/plan/` | `README.md` (yol haritası + `gorev-durumu.md` birleşir) ve yalnız açık adım dosyaları (07, 12, 14, 16) | |
| `docs/urun/` | `icerik/` (11 dosya) → `ogretim-standardi.md` (öğretim, lab, pilot, ders yazma) + üretilen `matematik-konu-listesi.md` | |
| `docs/sistem/` | `mimari/` (17 dosya) ve `tasarim/kullanici-yonetimi.md` → `veri.md`, `ilerleme.md`, `soru-ve-pratik.md`, `icerik-hatti.md`, `kullanicilar.md` | |
| `docs/tarifler/` | `islemler/` (18 dosya) → `calistirma-ve-yayin.md`, `test-ve-devir.md`, `soru-aktarma.md` (Pratik 2, yurt dışı, içe aktarma), `kaynak-kaydi.md` (pdf-*, yks-kaynak-birlestirme, pgvector, yerel model), `konu-paketi.md` (içerik hattı, öğretim içeriği, video), `izleme.md` (sağlık, bildirimler, devir, doğrulama) | |
| `docs/sozlesmeler/`, `docs/semalar/` | Olduğu gibi | |
| `testler/bilinen-hatalar.md` | Olduğu gibi | |

Silinir: kapanmış YKS-00–13 görev ve işlem dosyaları, 15. adım belgeleri, 826 satırlık inceleme belgesi (model tablosu bu
plandadır), `pipeline/` durum raporları, `veri/` ve `Kaynaklar/` altındaki `.md` notları (bilgisi kaynak kaydına aktarılır).
15. adımdaki "kapanan adımlar silinmez" notu kullanıcının güncel talimatıyla kaldırılır.

**Bilgi kaybı kuralı:** silinen veya birleşen her belgenin hâlâ geçerli kuralı kalan belgeye tek cümleyle taşınır;
tarihçe taşınmaz. Taşınan kuralların listesi commit mesajına yazılır. Tekrarlanan işler skill olur:
`konu-paketi-uret`, `konu-paketi-dogrula`, `bilesen-ekle`, `kaynak-kayit`.

## Hangi iş hangi modelde

Claude modeli oturumda `/model` ile seçilir. Kural: içeriğin doğruluğu ve öğretim kalitesi en güçlü modelde,
kalıba dönüşmüş iş daha hızlı modelde, ağır tarama hiç bulut modelinde değil (betik + Ollama).

| Adım | İş | Model | Düşünme |
|---|---|---|---|
| 16.03 kalanı | zip, `mebi-yks` birleştirme, PDF taşıma, proje yapısı, tek sabit dosyası | Sonnet 5.5 (betik) | orta |
| 16.04 / 2 | Hareket konu haritası: duraklar, ön koşul, yanılgı kataloğu, temsil zinciri, formül türetimi | **Fable 5.2** | yüksek |
| 16.04 / 3 | Araç kutusu mikro derslerinin içeriği (birim, vektör, grafikte eğim/alan) | Fable 5.2 | yüksek |
| 16.04 / 3–4 | Şema v2, blok bileşenleri, deney bağı, testler, ekran | Kullanıcı tercihi: GPT-6.1 Sol | yüksek |
| 16.04 / 4 | Hareket v2 içeriği: basamak metinleri, sorular, çeldiriciler, çözümler | **Fable 5.2** | yüksek |
| 16.04 / 5 | Bağımsız denetim: fizik doğruluğu, cevaplar, rubrik puanı (önce kendi çözümünü üretir) | Kullanıcı tercihi: GPT-6.1 Sol, ayrı oturum | extra high |
| 16.05 | Newton yasaları: konu haritası ve paket (yöntemin ikinci konuda sınanması) | Fable 5.2 | yüksek |
| 16.05 | Kalan fizik konuları: konu haritası | Opus 5.5 (modern fizik, indüksiyon gibi zor konular Fable 5.2) | yüksek |
| 16.05 | Kalan fizik konuları: paket taslağı onaylı haritadan | Sonnet 5.5 | yüksek |
| 16.05 | Her paketin denetimi; eşik altıysa düzeltme | Opus 5.5; ikinci turda da geçmezse Fable 5.2 | yüksek |
| 16.06 | Ürün kabuğu, dört ana yer, ustalık motoru bağı | Sonnet 5.5; mimari karar Opus 5.5 | orta / yüksek |
| 16.07 | Üretim hattı betikleri, skill'ler | Sonnet 5.5 | orta |
| 16.08 | Ölçüm raporu; rubrik ve plan ağırlığı kararı | Sonnet 5.5; karar Opus 5.5 | orta / yüksek |
| Her adım | Küçük metin, etiket, belge düzeltmesi, tek dosyalık UI ayarı | Haiku 5.5 (ekran gerekirse Sonnet 5.5) | düşük |

| Model dışı iş | Araç |
|---|---|
| Kaynak tarama, gömme, kaynak–konu eşleme | Ollama `bge-m3` |
| PDF sınıflama, uygunluk ön elemesi, kanıt paketi taslağı | Ollama `qwen3.5:9b`; kararsız kalanlar `gpt-oss:20b` |
| Görselden ön eleme | Ollama `gemma3:4b` (önce 20 sayfalık deneme) |
| Hash, sayfa sayımı, bağlantı denetimi, silme listesi, hesap testi | Betik |
| Farklı sağlayıcıyla doğrulama (varsa) | GPT-6 Astra; yoksa yazan modelden farklı Claude modeli, ayrı oturumda |

Yazan ve denetleyen aynı oturum olmaz; denetleyen yazanın gerekçesini görmeden önce kendi çözümünü yazar.

Token kuralları: bulut modeli PDF taramaz, yalnız betik + Ollama'nın hazırladığı **kanıt paketini** (bütün kaynaklardan
seçilen uygun sayfalar, görselleri, bağlı soruları; çok büyükse Ollama'nın kaynaklı özetiyle) okur; bir oturum bir konu ya da bir iş; girdisi değişmeyen aşama yeniden
çalışmaz; güçlü modele yalnız gözlenebilir hatada (şema, hesap, test) geçilir.

## Görev sırası

## 16.01 — Dondur ve belgeleri yeniden düzenle (Sonnet 5.5) — BITTI
- Pratik 2 süreçlerini düzgün kapat, imleci devir notuna yaz, bekleyen değişiklikleri commit et.
- Belge düzenini uygula (yukarıdaki tablo): birleştir, yeniden adlandır, sil; `plan-check.py`, `ivme.py` ve `AGENTS.md` yollarını güncelle.
- `AGENTS.md`'deki "Kaynaklar yalnız okunur" kuralını 16.03'ün silme kurallarıyla değiştir.
- Kabul: `python scripts/ivme.py plan` ve `kontrol` geçer; satır sınırları tutar; kırık bağlantı yok.

## 16.02 — Ölç ve kaynak kaydını kur (betik + Ollama; kod Sonnet 5.5) — BITTI
- Sabit bağlantıları hesaba katan gerçek disk raporu; `uygulama/veri` alt klasör boyutları.
- Kaynak kaydını doldur: hash, tür, konu eşleme (klasör ve `katalog.json` → `bge-m3` → `gpt-oss:20b`), bağlı soru sayısı.
- Video bağlantı tablosu: `katalog.json` + YouTube; bağlantı denetimi; oturum isteyenler MEBİ sayfa adresiyle.
- Kabul: her dosya kayıtta tek satır ve bir karar taşır; kararsız dosya sayısı raporlu.
- Sonuç (`python scripts/ivme.py kaynak …`; rapor `veri/kaynak-kayit/`): görünen 386,7 GiB, gerçek disk 148,3 GiB (238 GiB sabit bağlantı tekrarı); Kaynaklar 87,9 GiB, mebi-yks 76,9 GiB (aynı dosyaların büyük kısmı ortak), `uygulama/veri` 49,7 GiB. Kayıt `kaynak_kaydi.dosyalar`: 12.140 fiziksel dosya = 12.140 satır, hepsinde SHA-256; karar: kalır 6.707 (9,2 GiB), silinir önerisi 4.685 (68,7 GiB: 2.094 video/ses, tekrar kopyalar; konu anlatımı silinmez), **kararsız (bekler) 748** (668 konusu belirlenemeyen konu anlatımı + 78 zip: içinde kayıtta olmayan üye + 2 adressiz zip). Konu eşleme: katalog/klasör 3.259, bge-m3 83, gpt-oss 110 (150 sınırı), belirsiz 2.940 (çoğu YKS dışı değil; eşik sıkı). Video tablosu `kaynak_kaydi.video_baglari`: MEBİ 2.094 adresin tamamı denetimden geçti (boyut eşit), YouTube 195 geçti / 184 ulaşılamadı (liste/oEmbed; 16.03'te elle bakılır). Silinen dosya yok; "silinir" yalnız öneridir.

## 16.03 — Sil ve yeniden düzenle (betik; kullanıcı onayıyla)
- Kategori kategori kuru liste → onay → silme: video/ses, zip, tekrar PDF, önbellekler, eski dökümler (konu anlatımında sayı sınırı yok).
- Soruları sistemde olan PDF'leri `soru-referansi/`'ne, kısmi olanları `soru-bekleyen/`'e, konu anlatımlarını hedef konu klasörlerine taşı.
- `mebi-yks` dosyalarını `Kaynaklar/`'a taşı, ivme'deki tekrarları sil; `mebi-yks` ve `EskiYollar` kaldırılır.
- Proje yapısını uygula (yukarıdaki tablo): `pipeline` + `veri-hatti` → `araclar`, `icerik/data` → `uygulama/veri`, betik alt klasörleri; yollar tek sabit dosyasında.
- Kabul: uygulama, PDF ekranı ve soru görselleri çalışır; öğrenci ve soru sayıları değişmez; boyut önce/sonra raporlu.
- Yapılanlar (onaylı, `scripts/kaynak/sil.py`, günlük `veri/kaynak-kayit/silme-gunlugu.jsonl`): 2.094 video/ses (66,3 GiB) ve 2.591 tekrar dosya silindi; `video-hatti/medya`, `veri/yedek`, önbellekler, eski dökümler, `main-bank-transfer`, `yks-birlestirme` ve `source-inventory` çalışma çıktıları silindi (yalnız `yks-birlestirme/current.json`+`state.json`+`yol-uyumluluk` ve `single-test-crop-pilot` kaldı: canlı etiket hattı ve MebiPractice2PilotTest okur); kapanmış YKS/Pratik 2'nin 332 betik ve test dosyası `git rm` ile kaldırıldı (geri dönüş git), kalite profilinden 75 ölü kontrol çıkarıldı. D: 454 → 342 GiB. 97.061 soru görselinin tamamı `resimler-pilot`'ta; DB 97.061 soru, 12 kullanıcı. Kalan: zip (80), `Kaynaklar` ↔ `mebi-yks` birleştirme, soru PDF taşıma, proje yapısı, tek sabit dosyası.

## 16.04 — Öğretim standardı ve tasarım sistemi (içerik Fable 5.2, kod Sonnet 5.5, denetim Opus 5.5)
- Konu paketi şeması, bileşen kataloğu, rubrik, dört ana yerin ve konu sayfasının ekran tasarımı, kişisel plan kuralları.
- Durum: kullanıcı kararıyla **tek model konu** üzerinden yürür (TYT Fizik – Hareket, `/konuyu-ogrenelim/ogren/fizik-hareket`). Yapıldı: şema, blok kataloğu, konu sayfası, rubrik ve üretim sırası ([standart](../urun/ogretim-standardi.md#konu-paketi-standardı-v1--1604)); 236 banka sorusunun görseli incelenerek 10 soru tipi çıkarıldı; `node --test testler/konu-paketi.test.mjs` 7/7; masaüstü ve mobil ekran denetimi temiz. Kullanıcı değerlendirmesi: arayüz düzeltildi; içerik soru tipinden başlıyor, sıfırdan konu eğitimi eksik → [fizik öğretim yöntemi](#fizik-öğretim-yöntemi-1604-pilot-genişlemesi).
- Sıra (her biri kullanıcı onayıyla):
  1. Yöntem onayı (bu belge); onaylanınca yöntem [öğretim standardına](../urun/ogretim-standardi.md) taşınır, burada özet kalır.
  2. Hareket konu haritası: duraklar, ön koşullar, yanılgı kataloğu, temsil zinciri, formül türetimleri; tek tabloyla kullanıcıya gösterilir. **Yazıldı; kullanıcı devam talimatıyla içerik aşamasına geçildi:** [fizik-hareket.harita.md](../../frontend/src/learn/konu/paketler/fizik-hareket.harita.md) (8 durak, 7 ön koşul dersi, 13 yanılgı, 12 soru tipi; 5 ders sunusu ve 2 MEBİ özeti kaynaklara eklendi).
  3. **İçerik taslağı tamam:** `arac-kutusu-fizik.js` AK-1…AK-7; son Claude commitindeki içerik korundu.
  4. Hareket v2: mevcut içerik basamaklara dağıtılır, eksik basamaklar (0 ön koşul, 3 temsiller, 6 düzeyli sınav seti) yazılır; deney `interactive/motion/` bağlı grafikleriyle; kavram ön/son testi; şema v2 ve testler.
  5. Kabul: kullanıcı sıfırdan başlayan öğrenci gibi baştan sona dener; test, ekran ve rubrik geçer.
- Denetim: ilk sürüm `468087f`, Sol extra high ayrı oturum: **19/28 FAIL**. Sekiz bulgu kullanıcı talimatıyla düzeltildi; [matris ve kanıtlar](../islemler/hareket-v2-denetim.md). Opus 5.5 `d99dcc7` 23/28 FAIL (A1–A8); düzeltme turundan sonra `95586e0` yeniden denetimi **25/28 PASS** (yalnız teknik kabul; B1–B6 bulguları). Öğretmen onayı, A8 ve öğrenci ölçümü açık; 16.04 BITTI değildir.
- Kod pilotu: kullanıcı tercihiyle GPT-6.1 Sol. Katalog v2’ye bağlı; ön/son test, yedi mikro ders, yeni bloklar, kavram kapısı (3 ardışık doğru), aşama geçişleri, iki hareketli/üç grafik deneyleri ve kullanıcıya özel v2 yerel ilerleme eklendi. Teknik kabul [devir sözleşmesinde](../urun/hareket-v2-icerik-devri.md#kod-pilotu). Tamamlanmış öğretmen/öğrenci kabulü değildir.
- İçerik devri: `fizik-hareket.v2.js` + `fizik-hareket.v2.olcme.js`: 8 durak, 13 yanılgı döngüsü, 10+10 kavram sorusu, 12 tip tanıma/alıştırma, 10 karma soru, 13 tekrar kartı. Son devam GPT-6 Astra ile yapıldı (Fable çalıştırıldığı iddia edilmez). Uygulamaya bağlı değildir; öğretmen/Opus kabulü yoktur. Kod sınırları ve açık ölçüm koşulları [devir sözleşmesinde](../urun/hareket-v2-icerik-devri.md).
- Kalan: dört ana yerin ekran tasarımı ve kişisel plan kuralları (model konu onayından sonra); ustalık motoru bağı 16.06.

## 16.05 — Fizik dersi (yöntem v2; modeller tablodaki gibi)
- İkinci konu Newton'un hareket yasaları (Hareket ve Kuvvet'in kalanı): araç kutusu ve yöntemin yeniden kullanılabildiği burada sınanır; konu başına oturum/token maliyeti ölçülür.
- Sonra TYT fiziğin kalan üniteleri ön koşul sırası ve sınav ağırlığıyla, ardından AYT. Her konu: konu haritası onayı → paket → denetim.
- Sözel altın konu (Tarih — Millî Mücadele) fizik yöntemi oturduktan sonra genellemenin ilk sınavıdır (kullanıcı: "şimdilik yalnız fizik").

## 16.06 — Ürün kabuğu (Sonnet 5.5 / Sol; ekran denetimi Terra)
- Dört ana yer ve yönlendirmeler, konu sayfası, blok bileşenleri, Mermaid, bağlantıdan video.
- Geri bildirim: kutlama, moral bozmayan yanlış mesajı, ipucu merdiveni.
- Uyarlama: kolay/zor kardeş soru, geçilemeyen tipin tekrarı, ders sonu geri çağırma, hatırlatma, kişisel plan.

## 16.07 — Üretim hattı (konu konu)
```
betik + Ollama: kanıt paketi → Sonnet/Sol: konu paketi taslağı → betik: şema, hesap, bağlantı denetimi
→ farklı sağlayıcı: rubrikle doğrulama → eşik altıysa bir düzeltme turu, yine geçmezse Opus/Fable
→ yayın: "Öğretmen kontrolü bekliyor"
```
Sıra sınav ağırlığına göre: TYT Türkçe, TYT Fen, TYT Sosyal, sonra AYT. Matematik kendi sırasını korur.

## 16.08 — Ölç ve iyileştir
- Konu başına kavram kontrolü başarısı, ipucu kullanımı, gecikmeli tekrar başarısı, terk noktası.
- En düşük puanlı konular yeniden ele alınır; rubrik ve plan ağırlıkları gerçek veriye göre güncellenir.

## Doğrulama

- Her görev sonunda `python scripts/ivme.py kontrol` ve ilgili `kalite calistir` profili.
- Silme: kuru liste ile silinenlerin eşleşmesi; kayıt satırlarının kalması; uygulama testleri.
- Konu paketi: şema + hesap/bağlantı testleri + rubrik puanı + masaüstü/mobil UI testi.
- Ürün kabulü: kullanıcı altın konuları baştan sona dener; gerçek öğrencide görülmemiş soruda yardımsız çözüm gözlenir.
  Otomatik test geçişi pedagojik kabul sayılmaz.
