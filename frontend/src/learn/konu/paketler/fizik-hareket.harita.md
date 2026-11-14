# Konu haritası — TYT Fizik · Hareket (v2 taslağı)

Durum: **kullanıcı onayı bekliyor.** Onaydan önce içerik ve kod yazılmaz. Yöntem:
[16. adım, fizik öğretim yöntemi](../../../../../docs/plan/16-ogrenme-kalitesi.md#fizik-öğretim-yöntemi-1604-pilot-genişlemesi).
Bu dosya paketin (`fizik-hareket.js`) v2 yazımının tek girdisidir; uygulamaya yüklenmez.

## 1. Kapsam

- Kazanımlar: 9.3.1.1–9.3.1.6 (hareket çeşitleri, konum, yol, yer değiştirme, sürat, hız, düzgün doğrusal hareket,
  ortalama/anlık hız, ivme, grafikler, farklı referans noktalarına göre hareket).
- İçeride: bir boyutta hareket; x–t, v–t, a–t grafikleri; sabit hız problemleri; sabit ivmede v–t eğimi ve alanı.
- Dışarıda (yalnız "AYT'de devamı" köprüsü olarak gösterilir): x = v₀t + ½at², v² = v₀² + 2aΔx, iki boyutta
  bağıl hareket, atışlar. Köprü soruları: AYT_Sayisal-0361–0365, 0351–0353.
- Hedef öğrenci: konuyu hiç görmemiş 9. sınıf düzeyi. Çıkış: ÖSYM TYT hareket sorusunu yardımsız, gerekçesiyle çözer.

## 2. Ön koşullar (basamak 0) → araç kutusu

| Kod | Mikro ders | Hareket'te nerede gerekir | Kontrol sorusu örneği |
|---|---|---|---|
| AK-1 | Birim çevirme: km/h ↔ m/s (÷3,6), dakika ↔ saniye | Durak 3, 4, 6 | 72 km/h kaç m/s? |
| AK-2 | Sayı doğrusu ve işaret: "eksi" yön demektir, azlık değil | Durak 1, 2, 7 | −4'ten +3'e kaç birim, hangi yöne? |
| AK-3 | Skaler ve vektör: yalnız büyüklük mü, yön de mi? | Durak 1, 3 | "5 m doğuya" ile "5 m" farkı |
| AK-4 | Grafikte eğim: dikey değişim / yatay değişim, birimiyle | Durak 4, 7 | (0,0)–(4,20) doğrusunun eğimi ve birimi |
| AK-5 | Grafik altı alan: dikdörtgen, üçgen, yamuk; eksen altı eksi | Durak 5, 7, 8 | Tabanı 4, yüksekliği 10 üçgenin alanı ne anlatır? |
| AK-6 | Oran düşünmesi: v = yol / süre üç biçimde; "iki katına çıkarsa" | Durak 3, 6 | Süre yarıya inerse sürat? |
| AK-7 | Geometri kısa yolları: 3-4-5 üçgeni, çember çevresi ve çapı (π = 3) | Durak 2, 3 | Yarım turda yol ve yer değiştirme |

Her mikro ders 3–5 ekrandır, kendi kontrolü vardır ve başka fizik konularınca da kullanılır. Öğrenci kontrol
sorusunu doğru yaparsa mikro ders açılmaz.

## 3. Duraklar (6 → 8)

Değişiklik: sabit hız problemleri kendi durağına ayrıldı (tek durağa sığmıyordu), a–t grafiği ve üç grafik zinciri
yeni durak oldu (kazanımda var, v1'de yoktu).

| # | Durak | Büyük fikir (öğrencinin cümlesi) | Tahminle açılış | Deney (hareket stüdyosu) | v1'de |
|---|---|---|---|---|---|
| 1 | Hareket: kime göre, nerede? | "Hareket ediyor mu?" sorusu "kime göre?" demeden cevaplanmaz; konum = sıfıra göre yönlü uzaklık | Trende oturan yolcu hareketli mi? | Gözlemciyi değiştir: peron / tren / karşı tren; sıfır noktasını kaydır, konum değişir, hareket değişmez | Var; konum kısmı genişler |
| 2 | Yol ve yer değiştirme | Yol izin uzunluğudur, hep artar; yer değiştirme ilk noktadan son noktaya oktur, sıfır olabilir | Gidip aynı yere dönen kişinin yer değiştirmesi? | Cismi ileri geri sürükle: yol sayacı ve yer değiştirme oku aynı anda | Var |
| 3 | Sürat ve hız | Aynı birim, farklı pay: sürat yoldan, hız yer değiştirmeden; gösterge sürati gösterir | İki arabanın göstergesi 90: hızları aynı mı? | Aynı sürede iki rota: sürat aynı, hız farklı; ortalama ↔ anlık | Var; anlık hız ve gösterge eklenir |
| 4 | Sabit hız ve x–t grafiği | Eşit sürede eşit yer değiştirme; x–t'de eğim = hız, grafik yörüngenin resmi değildir | Daha dik doğru ne demek? | Cisim yürürken x–t çizilir; hızı değiştir, eğim değişsin; dur → yatay, geri dön → aşağı eğim | Var |
| 5 | v–t grafiği ve grafik çevirisi | v–t'de yükseklik hız, alan yer değiştirme; eksen altı = geri yön | v–t'de yatay çizgi: duruyor mu? | x–t ve v–t alt alta, aynı anda; tablodan grafiğe, grafikten grafiğe | Var |
| 6 | İki hareketli: karşılaşma, yetişme, tren | Aradaki uzaklık her saniye ne kadar kapanıyor? (yaklaşma hızı); formül bundan çıkar | Zıt yönde 10 ve 5 m/s: saniyede kaç metre yaklaşırlar? | İki cisim, aradaki uzaklık sayacı; aynı x–t'de kesişim = buluşma; tren boyu görünür | Kısmen (durak 4 içinde) |
| 7 | İvme: hız nasıl değişiyor? | İvme hızın değişme hızıdır; hızlanma/yavaşlama ivmenin işaretine değil, hız ile ivmenin yön ilişkisine bağlı | Hızı büyük olanın ivmesi de büyük mü? | Hız oku ve ivme oku ayrı ayrı; dört durum (± yön × hızlanan/yavaşlayan); v–t eğimi | Var |
| 8 | Üç grafik zinciri: x–t, v–t, a–t | Aşağı inerken eğim, yukarı çıkarken alan; a–t alanı hızı değil hız **değişimini** verir | Aynı a–t grafiği, farklı ilk hız: v–t aynı mı? | Üç grafik alt alta; v₀ kaydırıcısı; durgundan sabit ivmede x, 3x, 5x | Yok (yeni) |

Her durakta basamak 1–4 sırası: tahmin → deney → kavram dili → temsil çevirisi → nicel ilişki (formül türetilir) →
çözümlü örnek (tam → eksik adım → bağımsız) → püf noktası → kendini sına.

## 4. Yanılgı kataloğu

Her yanılgı dört parçayla yazılır: ortaya çıkaran soru → yüzleştiren deney → çözen açıklama → gecikmeli yeniden sınama.

| Kod | Yanılgı | Durak | Ortaya çıkaran soru | Yüzleştiren deney | Yeniden sınama |
|---|---|---|---|---|---|
| Y1 | Hareket mutlaktır; duran herkese göre durur | 1 | Trende uyuyan yolcu hareketli mi? | Gözlemci değişince aynı cisim durgun/hareketli | Karma tur |
| Y2 | Konum alınan yoldur; eksi konum olmaz | 1, 2 | −4 m konumundaki cisim ne kadar yol almıştır? | Sıfır noktası kayınca konum değişir, yol değişmez | Durak 4 x–t okuma |
| Y3 | Yer değiştirme = yol; geri dönünce de artar | 2 | Bir tam turda yer değiştirme? | Tur atarken ok kısalır, sayaç artar | ÖSYM 2023, 2026 tipi |
| Y4 | Sürat ile hız aynı şeydir; gösterge hızı gösterir | 3 | İki gösterge 90: hızlar aynı mı? | Aynı sürat, zıt yön: hız okları farklı | Karma tur, yargı sorusu |
| Y5 | Ortalama hız, hızların ortalamasıdır | 3, 6 | Yolun yarısı 60, yarısı 20 km/h: ortalama? | Süreler eşit değil: yavaş kısım daha uzun sürer | Düzeyli set |
| Y6 | x–t grafiği cismin gittiği yolun resmidir | 4 | Yukarı çıkan x–t çizgisi: cisim yokuş mu çıkıyor? | Düz yolda yürüyen cisim eğik çizgi çizer | Durak 5 çevirisi |
| Y7 | Grafikte yukarıdaki daha hızlıdır; kesişen çizgiler aynı hızdadır | 4, 6 | x–t'de kesişme anında hızlar eşit mi? | Kesişim = aynı konum; hız eğimden okunur | Tip tanıma |
| Y8 | v–t'de çizgi aşağı iniyorsa cisim geri gidiyor | 5, 7 | Azalan ama artı kalan v–t: yön? | Cisim ileri giderken yavaşlar; yön ancak eksen altında değişir | Durak 8 |
| Y9 | v–t altındaki alanlar hep toplanır | 5 | Eksen altı alan yola mı, yer değiştirmeye mi girer? | Geri dönen cisim: yol toplanır, yer değiştirme çıkarılır | Düzeyli set |
| Y10 | İvme sıfırsa cisim durur; hız büyükse ivme büyüktür | 7 | Sabit 100 m/s giden uçağın ivmesi? | Sabit hızda ivme oku yok; yavaş ama hızlanan cisimde var | Kavram testi |
| Y11 | Hız sıfırsa ivme de sıfırdır | 7, 8 | Yukarı atılan topun tepe noktası (yalnız nitel) | v–t ekseni keserken eğim değişmez | Tekrar kartı |
| Y12 | Eksi ivme yavaşlama demektir | 7 | Eksi yönde giden, eksi ivmeli cisim? | Dört durum tablosu: oklar aynı yönde → hızlanır | Karma tur |
| Y13 | a–t alanı hızı verir | 8 | Aynı a–t, farklı ilk hız: son hızlar? | v₀ kaydırıcısı: v–t yukarı kayar, eğim aynı | Düzeyli set |

Kaynak: fizik eğitimi literatüründeki kinematik yanılgıları, OGM/MEBİ notlarındaki "dikkat" kutuları ve bankadaki
236 sorunun çeldiricileri. Y7'nin sınav karşılığı YGS 2013 (kesişen x–t), Y4'ünki YGS 2017 (gösterge) sorusudur.

## 5. Temsil zinciri ve çeviri alıştırmaları

Olay (şerit üstünde cisim) → hareket haritası (eşit süreli noktalar ve hız okları) → tablo → x–t → v–t → a–t → söz.

| Geçiş | Alıştırma biçimi | Durak |
|---|---|---|
| Olay → hareket haritası | Noktaların aralığına bakıp "hızlanıyor / sabit / yavaşlıyor" seç | 4, 7 |
| Hareket haritası ↔ x–t | Dört grafikten doğru olanı eşleştir; sonra kendisi çizer | 4 |
| Tablo → grafik | Eşit sürede alınan yollar → sürat–zaman (ÖSYM 2018 biçimi) | 5 |
| x–t → v–t | Parça parça eğim al, basamak grafiği kur | 5 |
| v–t → x–t | Alanları topla, ilk konumu ekle (x₀ ≠ 0 dahil) | 5 |
| v–t ↔ a–t | Eğim al / alan ekle; v₀ verilmeden v–t çizilemeyeceğini gör | 8 |
| Grafik → söz | "Bu cismin hikâyesini anlat": üç cümle, biri yanlış → hatayı bul | 4, 5, 8 |
| Söz → grafik | Günlük hikâyeden (evden çeşmeye, bekle, dön) x–t çiz | 4 |

## 6. Nicel ilişkiler: nereden gelir, ne zaman geçerli

| İlişki | Türetim (ezber yerine) | Koşul | Tipik hata |
|---|---|---|---|
| Δx = x_son − x_ilk | Sayı doğrusunda ok | Yön seçilmiş olmalı | Büyükten küçüğü çıkarmak |
| Ortalama sürat = toplam yol / toplam süre | Tanım | Bekleme süresi de dahil | Beklemeyi atmak |
| Ortalama hız = Δx / Δt | Tanım; x–t'de iki noktayı birleştiren doğrunun eğimi | Yön işaretle taşınır | Yolu kullanmak |
| x = x₀ + v·t | x–t doğrusunun eğimi ve başlangıcı | Hız sabit | x₀'ı unutmak |
| Yer değiştirme = v–t altındaki işaretli alan | Sabit hızda dikdörtgen v·t; değişen hızda ince dikdörtgenler | Her zaman | Eksen altını toplamak |
| a = Δv / Δt | v–t eğimi | Ortalama ivme; sabit ivmede her an | Δv yerine v kullanmak |
| Δv = a–t altındaki alan | a·t dikdörtgeni | v₀ ayrıca verilmeli | Alanı hız sanmak |
| Eşit yollarda v_ort = 2v₁v₂ / (v₁ + v₂) | Süreleri yaz, topla | Yollar eşit; süreler eşitse aritmetik ortalama | Her durumda aritmetik almak |
| Karşılaşma t = d / (v₁ + v₂), yetişme t = d / (v₁ − v₂) | Aradaki uzaklık saniyede ne kadar kapanır? | Sabit hız, aynı anda başlama | Aynı yönde toplamak |
| Tünel/köprü: yol = tren boyu + tünel boyu | Trenin ucunu izle | Tamamen çıkma soruluyorsa | Tren boyunu unutmak |
| Durgundan sabit ivme: ardışık eşit sürelerde x, 3x, 5x | v–t üçgenini eşit dilimlere böl | v₀ = 0 ve sabit ivme | v₀ ≠ 0 iken kullanmak |
| 1 m/s = 3,6 km/h | 1000 m / 3600 s | — | Çarpma-bölmeyi karıştırmak |

Bütün çözümlü örnekler aynı protokolle yazılır: Anla → Çiz → İlke seç → Sembolle çöz → Kontrol et.

## 7. Soru tipleri (10 → 12)

Mevcut 10 tip korunur. İki değişiklik önerilir; sayıları soru görselleri yeniden taranınca kesinleşir:

| Tip | Değişiklik | Durak |
|---|---|---|
| `at-grafik` — a–t grafiği: alan, ilk hız, v–t'ye çeviri | Yeni; şimdi `ivme` tipinin içinde | 8 |
| `yon-degistirme` — grafikten yön değiştirme anı ve sayısı (x–t'de tepe, v–t'de eksen kesişi) | Yeni; şimdi `xt-grafik` ve `vt-grafik` içinde | 5, 8 |
| `sabit-hiz` | Durak 4'ten durak 6'ya taşınır | 6 |

Basamak 5'te her tip için: çözmeden tip seçme alıştırması ve yüzeyi benzer, ilkesi farklı bir soru çifti
(örnek: aynı pist şekli, biri ortalama sürat, biri ortalama hız soruyor).

## 8. Basamak 6: düzeyli sınav seti

| Düzey | Ne ister | Kaynak |
|---|---|---|
| 1 Tanı | Tek kavram, hesap yok ya da tek işlem | Banka |
| 2 Uygula | Tek tip, iki işlem; grafik okuma | Banka |
| 3 Birleştir | İki tip bir arada (grafik + ortalama hız, iki hareketli + birim) | Banka |
| 4 ÖSYM | Yargı sorusu, "kesinlikle doğrudur", tablo/grafik çevirisi; süreli | ÖSYM TYT 2018–2026 (5 soru; hepsi v1'de çözümlü örnek) |

Sorun: bankadaki beş ÖSYM hareket sorusunun hepsi v1'de derste çözülüyor, bağımsız ölçüme ÖSYM sorusu kalmıyor.
Öneri: ikisi çözümlü örnek kalır (TYT-0909 tablo → grafik, TYT-0911 "kesinlikle"), üçü (0910, 0912, 0913) düzey 4'te
bağımsız sorulur. YGS 2008–2017 hareket soruları yalnız OGM sunusunda var, bankada yok; bankaya alınmaları ayrı karar.

## 9. Kavram testi (ön ve son; 10 madde, hesap yok)

Her madde bir yanılgıyı ölçer; ön ve son testte aynı fikir farklı yüzeyle sorulur: Y1 gözlemci, Y3 tam tur,
Y4 gösterge, Y5 eşit yollar, Y6 grafik-resim, Y7 kesişim, Y8 azalan v–t, Y9 işaretli alan, Y10 sabit hızda ivme,
Y12 eksi ivme. Hedef normalize kazanç ≥ 0,4.

## 10. Kaynaklar ve uygunluk

| Kaynak | Sayfa | Kullanım |
|---|---|---|
| OGM konu özetleri 07, 08, 10, 11 | 4 | v1'de kullanıldı; tanım ve sınav dili |
| OGM konu özeti 09 (değerlendirme) | 1 | Yeni; karma soru örnekleri |
| OGM ders sunuları 07, 08, 09, 10, 17 | 88 | Yeni; örnek soru biçimleri, grafik çevirisi sırası, a–t alıştırmaları, YGS 2008–2017 soruları |
| MEBİ konu özeti · Hareket Kavramları | 6 | Yeni; anlık hız, gösterge, yeşil dalga (ortalama sürat bağlamı), x–t'de ortalama hız |
| MEBİ konu özeti · İvme Kavramı | 4 | Yeni; dört durum grafikleri, x–3x–5x, a–t alanı |
| OGM soru bankası 9. sınıf · Hareket ve Kuvvet | 40 | Soruları bankada; tip sayımı |
| Banka | 236 soru | Tipler, çeldiriciler, düzeyli set |

Kaynak hataları (içerikte doğrusu yazılır, kaynak düzeltilmez):
- MEBİ İvme özeti s.1: "konum–zaman grafiğinin eğimi hız değişimini verir" → doğrusu **hızı** verir.
- OGM Hareket notundaki yanlış basılmış formül (v1'de saptandı).
- OGM sunularında `x` hem konum hem alınan yol için kullanılıyor; pakette yol "yol" diye yazılır, `x` yalnız konumdur.

## 11. v1 içeriğinin yeri

| v1 | v2 |
|---|---|
| 6 durak, 7 çözümlü örnek, 6 püf, 6 kendini sına | Korunur; 8 durağa dağıtılır, her örnek protokol adımlarıyla yeniden yazılır |
| "Sınavda nasıl gelir?" grafiği | Korunur; konu girişinden basamak 5'in başına iner, girişte kısa özet kalır |
| Karma tur (6), tekrar kartları (8) | Korunur; yanılgı kodlarına bağlanır, karma tur 10'a çıkar |
| Yok | Basamak 0 (ön koşul kontrolü), 13 yanılgı döngüsü, 8 çeviri alıştırması, durak 6 ve 8, düzeyli set, kavram testi |

## 12. Sıradaki iş ve model

| Sıra | İş | Model |
|---|---|---|
| 1 | Bu haritanın onayı | Kullanıcı |
| 2 | Araç kutusu AK-1…AK-7 içeriği; Hareket v2 içeriği (8 durak, yanılgı döngüleri, çeviri alıştırmaları, düzeyli set, kavram testi) | Fable 5.2 |
| 3 | Şema v2, yeni bloklar (ön koşul, çeviri, tip seçme, kavram testi), stüdyo bağı, testler, ekran | Sonnet 5.5 |
| 4 | Bağımsız denetim | Opus 5.5, ayrı oturum |

İçerik yeni blok türleri gerektirdiği için 2 ve 3 iç içedir: önce Fable içerik verisini yazar (blok alanlarıyla),
sonra Sonnet o alanları çizen bileşenleri ve testleri yazar.
