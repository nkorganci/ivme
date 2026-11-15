// Ölçme maddelerine ek çeldiriciler ve yeni tur için ikiz maddeler (denetim bulgusu A2).
// Önceki sürümde ön/son test, karma tur, düzeyli set ve kavram kapısı iki seçenekliydi: tahmin tabanı %50 idi ve
// yeni turda yanlış yapılan maddenin cevabı elemeyle bilinebiliyordu. Bu dosya her maddeyi 3–4 seçeneğe çıkarır;
// her çeldirici ayrı bir yanlış düşünceye karşılık gelir ve kendi geri bildirimini taşır.
// Öğretmen onayı yoktur.

// Soru kimliği → eklenecek [seçenek, geri bildirim] çiftleri. `fizik-hareket.v2.olcme.js` içindeki `soru()` bunları ekler.
export const EK_SECENEK = {
  // ── Yanılgı tanı soruları (ön testte de kullanılır): 4 seçenek ──
  'Y1-tani': [['Yalnız tren hızlanırken hareketli sayılır.', 'Sabit hızla gitmek de harekettir; yolcunun perona göre konumu her an değişir.'], ['Bu, yolcunun kendi kararına bağlıdır.', 'Hareket kanaate değil, konumun seçilen gözlemciye göre değişip değişmediğine bağlıdır.']],
  'Y2-tani': [['−4 m.', 'Yol eksi olamaz; ayrıca konum, gidilen uzunluğu söylemez.'], ['Sıfır; çünkü konum eksi.', 'Eksi işaret yalnız sıfırın hangi tarafında olduğunu söyler; cismin hareket edip etmediğini söylemez.']],
  'Y3-tani': [['Pistin çapı.', 'Çap yarım turdaki yer değiştirmedir; tam turda başlangıca dönülür.'], ['Çevrenin yarısı.', 'Bu, yarım turda alınan yoldur. Yer değiştirme baştan sona düz oktur ve tam turda sıfırdır.']],
  'Y4-tani': [['Hayır; süratleri de farklıdır.', 'İki gösterge de 60 km/h: süratler eşit. Farklı olan yalnız yöndür.'], ['Evet; hız yöne bağlı değildir.', 'Hız vektöreldir; yön değişince hız değişir. Yöne bağlı olmayan sürattir.']],
  'Y5-tani': [['Hayır, 50 km/h.', 'Ortalama hızlı parçaya değil yavaş parçaya yakın çıkar; yavaş yolda daha uzun süre geçer.'], ['Hayır, 80 km/h.', 'Süratler toplanmaz; ortalama iki süratin arasında olmak zorundadır.']],
  'Y6-tani': [['Evet, ama yalnız çizgi düzse.', 'Çizginin düz olması hızın sabit olduğunu söyler; yolun eğimi hakkında bilgi vermez.'], ['Hayır; yükselen çizgi cismin hızlandığını gösterir.', 'Düz doğrunun eğimi sabittir: hız değişmiyor. Yükselme konumun arttığını gösterir.']],
  'Y7-tani': [['Süratleri.', 'Sürat eğimin büyüklüğüdür; eğimler farklı olduğundan süratler de farklıdır.'], ['Aldıkları yollar.', 'Farklı yerlerden başlamış olabilirler; aynı konuma gelmek aynı yolu almak değildir.']],
  'Y8-tani': [['Hayır, artı yönde hızlanır.', 'Hızın büyüklüğü 8\'den 2\'ye iniyor: sürat azalıyor.'], ['Önce ileri, sonra geri gider.', 'Geri gitmesi için hızın eksiye geçmesi gerekir; burada hep artı kalıyor.']],
  'Y9-tani': [['+6 m.', 'Yalnız ileri gidişi aldın; geri gidilen 4 m çıkarılır.'], ['−2 m.', 'İşaretleri ters kurdun: alanlar +6 ve −4, toplam artıdır.']],
  'Y10-tani': [['Bilinemez; süre verilmemiş.', 'Hız hiç değişmiyorsa hangi süreye bölersen böl ivme sıfırdır.'], ['Çok büyük; çünkü hız çok büyük.', 'İvme hızın büyüklüğünü değil, ne kadar çabuk değiştiğini anlatır.']],
  'Y11-tani': [['Evet; cisim o an durduğu için.', 'Bir an durmak hızın sıfır olmasıdır; hız o anda da değişmeye devam eder.'], ['Hayır; ivme o anda en büyük değerindedir.', 'Doğrunun eğimi her yerde aynıdır; ivme o anda ne büyür ne küçülür.']],
  'Y12-tani': [['Sürati değişmez.', 'İvme sıfır değil; hız her saniye değişir.'], ['Önce yavaşlar, sonra hızlanır.', 'Bu, hız ile ivme zıt yönlüyken olur; burada ikisi aynı yönlü.']],
  'Y13-tani': [['Hayır; son hız kesinlikle 6 m/s\'den büyüktür.', 'İlk hız eksi de olabilir; o zaman son hız 6\'dan küçük çıkar.'], ['Evet; ivme artıysa hız da artıdır.', 'İvmenin işareti hızın işaretini belirlemez; cisim eksi yönde gidiyor olabilir.']],

  // ── Gecikmeli yeniden sınama (karışık tur): 4 seçenek ──
  'Y1-gecikmeli': [['Yalnız öndeki hareketlidir.', 'İkisinin de birbirine göre konumu değişmiyor; önde ya da arkada olmak fark etmez.'], ['Evet; ama çok yavaş.', 'Aralarındaki uzaklık hiç değişmiyor: birbirine göre hız tam sıfır.']],
  'Y2-gecikmeli': [['Hayır; en az 8 m yol almıştır.', 'Cisim baştan beri +8 m\'de duruyor olabilir; konum geçmişi anlatmaz.'], ['Yalnız sıfır noktası sonradan değiştirildiyse.', 'Sıfırı değiştirmeye gerek yok: cisim başından beri orada durmuş olabilir.']],
  'Y3-gecikmeli': [['100 m ve 0 m.', 'Dönüş yolu da yürünmüştür: yol 100 + 100.'], ['200 m ve 100 m.', 'Eve dönüldü: başlangıç ve bitiş aynı nokta, ok yok.']],
  'Y4-gecikmeli': [['Hayır; büyüklüğü de yönü de değişir.', 'Sürat sabit: büyüklük değişmiyor. Değişen yalnız yöndür.'], ['Yalnız tam turlarda sabittir.', 'Tur sonunda yön başlangıçtaki yöne döner ama arada sürekli değişmiştir.']],
  'Y5-gecikmeli': [['50 km/h.', 'Ortalama yavaş sürate daha yakın olmalı; yavaş parçada daha çok zaman geçer.'], ['90 km/h.', 'Süratler toplanmaz; ortalama 30 ile 60 arasında kalır.']],
  'Y6-gecikmeli': [['Hayır; cisim sıfır noktasındadır.', 'Yatay çizgi herhangi bir konumda olabilir; söylediği tek şey konumun değişmediğidir.'], ['Evet; çok yavaş ilerliyor.', 'Yavaş ilerleme az eğimli çizgidir; tam yatay çizgide konum hiç değişmez.']],
  'Y7-gecikmeli': [['Konumları aynı, hızları farklı.', 'Tersi: paralellik eşit eğim, yani eşit hızdır; yükseklik farkı konum farkıdır.'], ['Alttaki bir süre sonra üsttekine yetişir.', 'Paralel doğrular kesişmez: aradaki uzaklık hiç değişmez.']],
  'Y8-gecikmeli': [['Eksi yönde hızlanır.', 'Sürat 6\'dan 2\'ye iniyor; hızlanan cismin sürati artardı.'], ['Artı yönde yavaşlar.', 'Hız eksi kaldığı için cisim eksi yönde gidiyor.']],
  'Y9-gecikmeli': [['12 m ve 0 m.', 'İki yönde de 12 m gidildi: yol 12 + 12.'], ['24 m ve 24 m.', 'Yer değiştirmede geri gidiş çıkarılır: +12 − 12.']],
  'Y10-gecikmeli': [['Hayır; hız eksi olduğu için ivme de eksidir.', 'Hızın işareti ivmenin işaretini belirlemez; hız değişmiyorsa ivme sıfırdır.'], ['Yalnız durursa olabilir.', 'Sıfır ivme hızın değişmemesidir; cisim −5 m/s ile gitmeyi sürdürür.']],
  'Y11-gecikmeli': [['Hız sıfır; ivme yukarı yönlüdür.', 'Top çıkarken yavaşlıyordu: ivme hareketin tersine, aşağı doğruydu ve tepede de öyledir.'], ['Hız aşağı yönlü; ivme sıfırdır.', 'Tepe noktasında top bir an durur: hız sıfırdır. İvme ise hiç kaybolmaz.']],
  'Y12-gecikmeli': [['Değişmez.', 'İvme sıfır değil; hız bir saniyede −3\'ten −2 m/s\'ye gelir.'], ['2 m/s\'den 3 m/s\'ye çıkar.', 'Sıra ters: başlangıçta sürat 3, bir saniye sonra 2 m/s.']],
  'Y13-gecikmeli': [['+14 m/s.', 'İlk hızın işaretini attın: −4 + 10.'], ['−6 m/s.', 'Değişim artı yönde: hız −4\'ten yukarı çıkar, sonuç artıdır.']],

  // ── Son kavram testi: 4 seçenek ──
  'Y1-son': [['Asansördeki yolcuya göre.', 'Yolcu da çantayla birlikte yükselir; aralarındaki konum değişmez.'], ['Hiçbir gözlemciye göre.', 'Binaya göre konumu değişiyor; en az bir gözlemciye göre hareketlidir.']],
  'Y3-son': [['Ortalama sürati.', 'Yol sıfır olmadığı için yolun süreye oranı da sıfır değildir.'], ['Hareket süresi.', 'Rota bir süre içinde tamamlanır; süre sıfır olamaz.']],
  'Y4-son': [['Aynı anda başlamaları.', 'Başlama anı hız vektörünü değiştirmez.'], ['Başka bir şey gerekmez.', 'Sürat yalnız büyüklüktür; zıt yöne koşan iki kişinin hızları farklıdır.']],
  'Y5-son': [['Büyük sürate.', 'Hızlı parça kısa sürer; ortalamayı uzun süren yavaş parça belirler.'], ['İki süratin toplamına.', 'Ortalama iki değerin arasında kalır; toplamları kadar olamaz.']],
  'Y6-son': [['Evet; ancak koridor kıvrılıyorsa.', 'Koridorun biçimi grafiğe geçmez; eğrilik hızın değiştiğini gösterir.'], ['Hayır; konum–zaman grafiği her zaman düz bir doğrudur.', 'Yalnız sabit hızda düzdür; hız değişince eğim de değişir.']],
  'Y7-son': [['Hızları eşittir.', 'Eğimler farklı verilmiş; hızlar eşit olsaydı doğrular paralel olurdu.'], ['Bu bilgiyle belirlenemez.', 'Hız için gereken tek bilgi eğimdir ve verilmiştir.']],
  'Y8-son': [['Eksi yönde hızlanır.', 'Çizgi eksene yaklaşıyor: hızın büyüklüğü azalıyor.'], ['Durur.', 'Durması için hızın sıfır olması gerekir; çizgi henüz eksene ulaşmadı.']],
  'Y9-son': [['İkisi de pozitiftir.', 'İşaretli alanlar eşit ve zıt: net yer değiştirme sıfırdır.'], ['Net pozitif, yol sıfırdır.', 'Tersi: cisim gidip döndü; yol alındı ama başlangıca gelindi.']],
  'Y10-son': [['İvme eksi, hareket eksi yönde.', 'Çizgi yatay: eğim, yani ivme sıfır. Eksi olan hızdır.'], ['İvme sıfır, hareket artı yönde.', 'Çizgi eksenin altında: hız eksi, cisim eksi yönde gidiyor.']],
  'Y12-son': [['Hayır; artı ivme her zaman yavaşlatır.', 'Hız da artıysa artı ivme sürati artırır.'], ['Evet; ama yalnız ivme büyükse.', 'İvmenin büyüklüğü değişimin ne kadar çabuk olduğunu söyler; hızlanma mı yavaşlama mı olduğunu yön ilişkisi belirler.']],

  // ── İlk hamle çalışması: 3 seçenek ──
  'tip-hareket-turu': [['Cismin ne kadar hızlı gittiğine bak.', 'Hareket türü sürate değil, noktaların nasıl yer değiştirdiğine bağlıdır.']],
  'tip-referans': [['Hızlı olanın hızını aynen yaz.', 'O, yere göre hızdır; B\'ye göre hız için B\'nin hızı çıkarılır.']],
  'tip-skaler-vektor': [['Sayısı büyük olanları vektör say.', 'Sayının büyüklüğü tür belirlemez; ölçüt yön bilgisidir.']],
  'tip-yol-yer': [['Yalnız son gidişin uzunluğunu al.', 'Yol bütün gidişlerin toplamıdır; yer değiştirme ise baştan sona oktur.']],
  'tip-ort-hiz-surat': [['Yalnız ileri gidilen uzunluğu süreye böl.', 'Geri gidiş yola eklenir, yer değiştirmeden çıkarılır; ikisi de hesaba girer.']],
  'tip-xt-grafik': [['İki konumu topla, süreye böl.', 'Eğim konumların farkıyla bulunur, toplamıyla değil.']],
  'tip-vt-grafik': [['Hızları topla, toplam süreyle çarp.', 'Her hız yalnız kendi süresiyle çarpılır.']],
  'tip-grafik-donusum': [['İki noktanın konum değerlerini hız eksenine taşı.', 'Hız–zamanın düşey ekseni hızdır; konum değerleri oraya yazılmaz.']],
  'tip-sabit-hiz': [['Uzaklığı tek aracın hızına böl.', 'İki araç da arayı kapatıyor; ikisi de hesaba girer.']],
  'tip-ivme': [['Son hızı süreye böl.', 'İvme hızın değil, hız değişiminin süreye oranıdır.']],
  'tip-yon-degistirme': [['Grafikteki tepe ve çukurları say.', 'Tepe ve çukur konum–zamanda yön değişimidir; hız–zamanda bakılacak yer eksen kesişidir.']],
  'tip-at-grafik': [['İvme değerlerini topla.', 'İvmeler önce süreleriyle çarpılır; toplanan alanlardır.']],

  // ── Düzeyli set: 4 seçenek ──
  'set-hareket-turu': [['Yalnız öteleme.', 'Tekerlek merkezi çevresinde de döner.'], ['Titreşim.', 'Titreşim iki nokta arasında gidip gelmedir; tekerlek geri dönmüyor.']],
  'set-referans': [['−2 m/s.', 'Bu B\'nin A\'ya göre hızıdır; soru A\'nın B\'ye göre hızını soruyor.'], ['+3 m/s.', 'Bu A\'nın yere göre hızı; B de hareket ediyor.']],
  'set-skaler-vektor': [['Yalnız hız.', 'Konum da yönlüdür: sıfırın hangi tarafında olduğu söylenir.'], ['Sürat ve hız.', 'Sürat yalnız büyüklüktür; gösterge yön vermez.']],
  'set-yol-yer': [['10 m ve 10 m.', 'Robot çapraz gitmedi; 6 + 8 = 14 m yürüdü.'], ['14 m ve 14 m.', 'Köşeden dönüldü; düz ok toplamdan kısadır.']],
  'set-ort-hiz-surat': [['+5 m/s ve 5 m/s.', 'Geri gidilen 10 m yer değiştirmeyi 30 m\'ye düşürür.'], ['+3 m/s ve 3 m/s.', 'Yol 40 + 10 = 50 m; geri gidiş yola eklenir.']],
  'set-xt-grafik': [['+3 m/s.', 'Konum azalıyor: eğim eksi olmalı.'], ['−15 m/s.', '−15 konumdaki değişimdir (metre); 5 saniyeye bölmelisin.']],
  'set-vt-grafik': [['12 m ve +12 m.', 'Geri gidilen 4 m yola eklenir, yer değiştirmeden çıkarılır.'], ['16 m ve +16 m.', 'Yer değiştirmede eksenin altındaki alan çıkarılır.']],
  'set-grafik-donusum': [['4\'ten 10\'a yükselen.', 'Konum değerlerini hız eksenine taşıdın.'], ['+6 m/s\'de yatay.', '6 m konum değişimidir; 3 saniyeye bölünce 2 m/s eder.']],
  'set-sabit-hiz': [['Yaklaşık 3,3 s.', 'km/h değerlerini çevirmeden kullandın: 180 / 54. Önce m/s\'ye çevir.'], ['18 s.', 'Yalnız 10 m/s\'lik aracı saydın; diğeri de arayı kapatıyor.']],
  'set-ivme': [['+3 m/s²; sürat artar.', 'Değişim son − ilk: −8 − (−2) = −6. İvme eksi.'], ['−5 m/s²; sürat artar.', 'Hızları topladın; değişim −6 m/s\'dir.']],
  'set-yon-degistirme': [['Hiç.', 'Son parçada hız artıdan eksiye geçiyor: bir yön değişimi var.'], ['Üç.', 'Eğimin değişmesi yön değişimi değildir; hızın işareti değişmelidir.']],
  'set-at-grafik': [['+6 m/s.', 'İkinci aralıkta ivme eksi: o alan çıkarılır.'], ['0 m/s.', 'İlk hızı iki kez çıkardın: −2 + 6 − 2 = +2.']],
};

// Düzeyli setin yeni turu için ikiz maddeler: aynı tip ve ilke, farklı sayı ve yüzey. Birinci turda yanlış yapılan
// maddenin yerine ikinci turda ikizi gelir; böylece yeni tur ezberle ya da elemeyle geçilemez.
// [tip, soru, doğru, gerekçe, [[çeldirici, geri bildirim] × 3]]
export const IKIZ = [
  ['hareket-turu', 'Yerinde duran vantilatörün dönen kanadının hareketini sınıflandır.', 'Yalnız dönme.', 'Eksen yer değiştirmiyor; kanat eksen çevresinde dolanıyor.',
    [['Öteleme ve dönme.', 'Vantilatör yerinde: eksen ilerlemiyor, öteleme yok.'], ['Titreşim.', 'Kanat gidip gelmiyor, hep aynı yöne dönüyor.'], ['Yalnız öteleme.', 'Kanadın noktaları aynı yöne aynı kadar gitmiyor.']]],
  ['referans', 'A artı yönde 3 m/s, B eksi yönde 1 m/s hızla yürüyor. A\'nın B\'ye göre hızı?', '+4 m/s.', 'B\'nin hızı −1 m/s: 3 − (−1) = +4 m/s.',
    [['+2 m/s.', 'Zıt yönde gidiyorlar; B\'nin hızı eksi işaretlidir.'], ['−4 m/s.', 'Bu B\'nin A\'ya göre hızıdır.'], ['+3 m/s.', 'Bu A\'nın yere göre hızıdır; B de hareket ediyor.']]],
  ['skaler-vektor', 'Alınan yol, yer değiştirme, ivme arasından yön gerektirenleri seç.', 'Yer değiştirme ve ivme.', 'İkisi de vektöreldir; yol yalnız uzunluktur.',
    [['Üçü de.', 'Yol için "hangi yöne?" sorulmaz; yalnız uzunluktur.'], ['Yalnız yer değiştirme.', 'İvme de vektöreldir: hızın hangi yönde değiştiğini söyler.'], ['Alınan yol ve yer değiştirme.', 'Birimleri aynı ama yolun yönü yoktur.']]],
  ['yol-yer', 'Robot 9 m doğuya, sonra 12 m güneye gidiyor. Yol ve yer değiştirme büyüklüğü?', '21 m ve 15 m.', 'Yol 9 + 12; dik yönlerde ok 9–12–15 üçgeninin uzun kenarıdır.',
    [['21 m ve 3 m.', 'Dik yönlerde çıkarma yapılmaz; dik üçgenin uzun kenarı bulunur.'], ['15 m ve 15 m.', 'Robot çapraz gitmedi; 9 + 12 = 21 m yürüdü.'], ['21 m ve 21 m.', 'Köşeden dönüldü; düz ok toplamdan kısadır.']]],
  ['ort-hiz-surat', '60 m ileri, 20 m geri giden araç toplam 20 s hareket etti. Ortalama hız ve sürat?', '+2 m/s ve 4 m/s.', 'Yer değiştirme 40 m, yol 80 m; ikisi de 20 s\'ye bölünür.',
    [['4 m/s ve 2 m/s.', 'Sıra ters: hızda yer değiştirme, süratte yol kullanılır.'], ['+3 m/s ve 4 m/s.', 'Geri gidilen 20 m yer değiştirmeyi 40 m\'ye düşürür.'], ['+2 m/s ve 2 m/s.', 'Yol 60 + 20 = 80 m; geri gidiş yola eklenir.']]],
  ['xt-grafik', 'Konum–zaman doğrusu (0 s, −4 m) ve (4 s, 8 m) noktalarından geçiyor. Hız?', '+3 m/s.', 'Eğim (8 − (−4)) / 4 = 12 / 4 = +3 m/s.',
    [['+2 m/s.', 'Son konumu süreye böldün; ilk konum sıfır değil.'], ['+1 m/s.', 'İlk konumun işaretini kaçırdın: 8 − (−4) = 12.'], ['−3 m/s.', 'Konum artıyor: eğim artı olmalı.']]],
  ['vt-grafik', 'Hız 3 s boyunca +4 m/s, sonra 3 s boyunca −1 m/s. Yol ve yer değiştirme?', '15 m ve +9 m.', 'Alanlar +12 ve −3: yol 12 + 3, yer değiştirme 12 − 3.',
    [['9 m ve +15 m.', 'Sıra ters: yol büyüklüklerin, yer değiştirme işaretli alanların toplamıdır.'], ['12 m ve +12 m.', 'Geri gidilen 3 m yola eklenir, yer değiştirmeden çıkarılır.'], ['15 m ve +15 m.', 'Yer değiştirmede eksenin altındaki alan çıkarılır.']]],
  ['grafik-donusum', 'Konum–zaman doğrusu (0 s, 12 m) ve (4 s, 0 m) arasında. Hız–zaman grafiği bu aralıkta nasıldır?', '−3 m/s\'de yatay.', 'Sabit eğim (0 − 12) / 4 = −3; hız sabit ve eksidir.',
    [['+3 m/s\'de yatay.', 'Konum azalıyor: eğim ve hız eksi.'], ['12\'den 0\'a inen.', 'Konum değerlerini hız eksenine taşıdın.'], ['0\'dan −3\'e inen.', 'Doğrunun eğimi sabit; hız değişmiyor.']]],
  ['sabit-hiz', 'Aynı yönde giden iki araç arasında 200 m var. Arkadaki 72 km/h, öndeki 36 km/h hızla gidiyor. Yetişme süresi?', '20 s.', '20 ve 10 m/s; ara saniyede 10 m kapanır: 200 / 10 = 20 s.',
    [['Yaklaşık 6,7 s.', 'Aynı yönde hızlar toplanmaz; ara farkla kapanır.'], ['10 s.', 'Öndeki araç beklemiyor; 200 / 20 yalnız arkadakini sayar.'], ['Yaklaşık 5,6 s.', 'km/h değerlerini çevirmeden kullandın: 200 / 36.']]],
  ['ivme', 'Hız 3 s içinde +2 m/s\'den −4 m/s\'ye değişiyor. Ortalama ivme ve hareketin gidişi?', '−2 m/s²; önce yavaşlar, sonra eksi yönde hızlanır.', 'Δv = −6; −6 / 3 = −2. Hız sıfırı geçene kadar ivmeye zıt, sonra aynı yönlüdür.',
    [['−2 m/s²; baştan sona yavaşlar.', 'Hız sıfırı geçtikten sonra hız ile ivme aynı yönlü olur: sürat artar.'], ['−2/3 m/s²; önce yavaşlar, sonra hızlanır.', 'Değişim −2 değil −6 m/s: −4 − 2.'], ['+2 m/s²; önce hızlanır, sonra yavaşlar.', 'Son − ilk = −6: ivme eksi.']]],
  ['yon-degistirme', 'Hız–zaman düğümleri (0, −3), (3, 3), (5, 0), (7, 3). Kaç yön değişimi var?', 'Bir.', 'İlk parçada t = 1,5 s\'de eksiden artıya geçer. t = 5 s\'de sıfıra değip yine artı kalır.',
    [['İki.', 't = 5 s\'de hız sıfıra değiyor ama işaret değiştirmiyor.'], ['Hiç.', 'İlk parçada hız eksiden artıya geçiyor.'], ['Üç.', 'Eğimin değişmesi yön değişimi değildir.']]],
  ['at-grafik', 'İlk hız +5 m/s. İvme ilk 2 s −3 m/s², sonraki 3 s +1 m/s². Son hız?', '+2 m/s.', '5 − 3×2 + 1×3 = +2 m/s.',
    [['−3 m/s.', 'Bu yalnız alanların toplamı; ilk hız eklenmeli.'], ['+14 m/s.', 'Eksenin altındaki alan çıkarılır: 5 − 6 + 3.'], ['−1 m/s.', 'Bu 2. saniyedeki hız; sonraki üç saniyede hız 3 m/s artar.']]],
];

// Kavram kapısı: durak kimliği → sırayla her soruya eklenecek üçüncü seçenek [metin, geri bildirim].
export const KAVRAM_EK = {
  'kime-gore': [['Yalnız cismin hızını.', 'Hız konumun nasıl değiştiğini anlatır; konumu söylemek için sıfır, yön ve birim gerekir.'], ['Hayır; hareket için cismin kendi kendine ilerlemesi gerekir.', 'Hareket, konumun seçilen gözlemciye göre değişmesidir; cismin kendi çabası gerekmez.'], ['Sıfıra çok yakın olduğunu.', 'İşaret uzaklığı değil tarafı söyler; −100 m de eksi konumdur.']],
  'yol-yer': [['Geçen süresi.', 'Rotalar farklı uzunlukta ve farklı süratle geçilebilir; süre eşit olmak zorunda değildir.'], ['Evet; başlangıca dönülürse.', 'Başlangıca dönünce sıfır olan yer değiştirmedir; yol azalmaz, eksiye de düşmez.'], ['Yol daha büyüktür.', 'Yolun büyük olması için dönüş ya da kıvrım gerekir; burada ikisi de yok.']],
  'hiz-surat': [['Yalnız bekleme uzunsa girer.', 'Sürenin uzunluğu fark etmez; geçen bütün süre paydadadır.'], ['Daha küçüktür.', 'Aynı sürede daha çok yer değiştirmek daha büyük ortalama hız demektir.'], ['Yer değiştirmenin birimiyle.', 'Yer değiştirme metreyle ölçülür; sürat metre bölü saniyedir.']],
  xt: [['O aralıktaki ivmeyi.', 'İvme hız–zaman grafiğinin eğimidir; konum–zamanın eğimi hızdır.'], ['Doğrunun uzunluğu.', 'Çizginin kâğıttaki uzunluğu bir büyüklük değildir; hız bir orandır.'], ['Cismin konumunun işareti.', 'Konumun işareti çizginin eksenin hangi tarafında olduğuyla ilgilidir; eğimle değil.']],
  vt: [['Yer değiştirmeyi.', 'Yer değiştirme alandır; eğim ivmedir.'], ['Başlangıç hızı.', 'Başlangıç hızı grafikte zaten okunur; eksik olan cismin nereden başladığıdır.'], ['Eksi yönde yavaşlayarak.', 'Çizgi yatay: hız değişmiyor, yavaşlama yok.']],
  'iki-hareketli': [['Her durumda azalır.', 'Ara ancak arkadaki daha hızlıysa azalır; hızlar eşitken değişmez.'], ['Trenin ortası.', 'Ortası çıktığında arka yarı hâlâ tüneldedir.'], ['Hangi aracın daha ağır olduğu.', 'Kütle bu soruda rol oynamaz; süreyi uzaklık ve hızlar belirler.']],
  ivme: [['Alınan yolun zamana göre değişimini.', 'O sürattir. İvme hızın değişimidir.'], ['Değişmez.', 'İvme sıfır değilse hız değişir; ters yönlü ivme büyüklüğü azaltır.'], ['Evet; ama yalnız cisim duruyorsa.', 'Duran cismin sürati sıfırdır ve değişen bir yönü yoktur; kastedilen viraj gibi yönün değiştiği harekettir.']],
  'uc-grafik': [['Bire eşittir.', 'Eğim ivmenin kendisidir; ivme sıfırsa eğim de sıfırdır.'], ['Zamanla büyür.', 'İki cismin hızına her an aynı miktar eklenir; fark değişmez.'], ['Değişmez.', 'Hız artıyorsa eğim de artar; değişmeyen eğim sabit hız demektir.']],
};
