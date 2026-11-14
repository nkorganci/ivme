// Fizik araç kutusu · ortak mikro dersler (16.04, içerik taslağı v1).
// Bir kez yazılır, bütün fizik konuları `onkosul` alanıyla bağlanır. Akış: konu başında `kontrol` sorusu sorulur;
// doğruysa mikro ders açılmaz, yanlışsa `ekranlar` sırayla gösterilir ve sonunda `cikis` soruları sorulur.
// Biçim (bileşenleri henüz yazılmadı; uygulamaya bağlı değildir):
//   ekran  = { baslik, metin, gorsel?, dene? }   gorsel = grafik belirtimi (bkz. fizik-hareket.v2.js başı)
//   dene, kontrol, cikis = { soru, secenekler: [{ metin, dogru?, neden }] }   tam bir doğru, her şıkka özel açıklama
// Öğretmen onayı yoktur.

export default [
  {
    id: 'AK-1', baslik: 'Birim çevirme: km/h ile m/s', sure: '3 dk',
    neden: 'Araç göstergesi km/h gösterir, fizik soruları metre ve saniyeyle çalışır. Birimi çevirmeden yapılan işlem, doğru formülle yanlış cevap verir.',
    kontrol: { soru: '72 km/h kaç m/s eder?', secenekler: [
      { metin: '20', dogru: true, neden: '72 km = 72.000 m, 1 saat = 3600 s. 72.000 / 3600 = 20 m/s. Kısa yol: 72 / 3,6.' },
      { metin: '259,2', neden: '3,6 ile çarptın. Bir saniyede gidilen metre, bir saatte gidilen kilometreden küçük bir sayı olmalı.' },
      { metin: '7,2', neden: '10\'a bölmek yetmez: 1 km 1000 m, 1 saat 3600 saniyedir; oran 3,6\'dır.' },
      { metin: '1200', neden: 'Bu, dakikada gidilen metredir (72.000 / 60). Saniyeye inmek için bir kez daha 60\'a bölmelisin.' },
    ] },
    ekranlar: [
      { baslik: 'Sayı nereden geliyor?', metin: '1 km = 1000 m ve 1 saat = 3600 s. O hâlde 1 km/h = 1000 m / 3600 s = **1/3,6 m/s**.\n\n3,6 ezber bir sayı değildir: 3600 saniyenin 1000 metreye oranıdır.' },
      { baslik: 'Hangi yöne çevirirken ne yaparım?', metin: '**km/h → m/s: 3,6\'ya böl.** **m/s → km/h: 3,6 ile çarp.**\n\nEmin olamazsan şunu düşün: bir saniyede gidilen metre, bir saatte gidilen kilometreden hep küçük bir sayıdır. m/s sayısı küçük çıkmalı.',
        dene: { soru: '15 m/s kaç km/h eder?', secenekler: [
          { metin: '54', dogru: true, neden: '15 × 3,6 = 54. Sayı büyüdü: saatte gidilen kilometre daha büyük sayıdır.' },
          { metin: '4,2', neden: 'Böldün. m/s\'den km/h\'ye geçerken sayı büyümeli; 3,6 ile çarp.' },
          { metin: '150', neden: '10 ile çarpmak yaklaşık bile değil; oran 3,6\'dır.' },
        ] } },
      { baslik: 'Sınavın sevdiği beş sayı', metin: 'ÖSYM ve MEB soruları hep tam bölünen sayılar seçer. Bunları tanırsan bölme yapmazsın:\n\n**18 km/h = 5 m/s · 36 km/h = 10 m/s · 54 km/h = 15 m/s · 72 km/h = 20 m/s · 90 km/h = 25 m/s · 108 km/h = 30 m/s**\n\nHepsi 36 = 10\'un katıdır.' },
      { baslik: 'Süre de çevrilir', metin: 'Dakika verilip hız m/s isteniyorsa süreyi saniyeye çevir: 1 dk = 60 s. 2,5 dk = 150 s.\n\nKural: **işleme başlamadan önce bütün birimleri aynı takıma sok** (ya metre–saniye ya kilometre–saat).' },
    ],
    cikis: [
      { soru: '90 km/h süratle giden araç 4 saniyede kaç metre yol alır?', secenekler: [
        { metin: '100', dogru: true, neden: '90 km/h = 25 m/s. 25 × 4 = 100 m.' },
        { metin: '360', neden: '90 × 4 yaptın; km/h ile saniyeyi çarpamazsın. Önce 90 km/h\'yi m/s\'ye çevir.' },
        { metin: '22,5', neden: '90 / 4 bölmedir; yol için sürat ile süre çarpılır, ama önce birim çevrilir.' },
      ] },
      { soru: 'Bir koşucu 3 dakikada 900 m koşuyor. Sürati kaç m/s\'dir?', secenekler: [
        { metin: '5', dogru: true, neden: '3 dk = 180 s. 900 / 180 = 5 m/s.' },
        { metin: '300', neden: '900 / 3 metre bölü dakikadır. Soru m/s istiyor: süreyi saniyeye çevir.' },
        { metin: '18', neden: '18, bu süratin km/h karşılığıdır (5 × 3,6). İstenen birim m/s.' },
      ] },
    ],
  },
  {
    id: 'AK-2', baslik: 'Sayı doğrusu ve işaret: eksi yön demektir', sure: '3 dk',
    neden: 'Fizikte eksi işareti "az" ya da "borç" demek değildir, **öbür yön** demektir. Konum, yer değiştirme, hız ve ivmenin hepsi bu dille yazılır.',
    kontrol: { soru: 'Bir cisim sayı doğrusunda −4 m konumundan +3 m konumuna geliyor. Konumundaki değişim nedir?', secenekler: [
      { metin: '+7 m', dogru: true, neden: 'Değişim = son − ilk = 3 − (−4) = +7. Artı işareti cismin artı yöne (sağa) 7 m gittiğini söyler.' },
      { metin: '−1 m', neden: 'İki sayıyı topladın. Değişim son konumdan ilk konumun çıkarılmasıdır: 3 − (−4).' },
      { metin: '+1 m', neden: 'Eksi 4\'ün işaretini atladın: −4\'ten sıfıra 4 m, sıfırdan +3\'e 3 m, toplam 7 m.' },
      { metin: '−7 m', neden: 'Büyüklük doğru, yön ters: ilk − son yaptın. Değişim her zaman son − ilk\'tir.' },
    ] },
    ekranlar: [
      { baslik: 'İşaret = taraf', metin: 'Bir doğru çiz, bir noktasına **sıfır** de, bir yönüne **artı** de. Artık her noktanın bir adı var: +3 "sıfırın 3 m artı tarafında", −4 "sıfırın 4 m eksi tarafında".\n\n−4, +3\'ten "daha az" bir yer değildir; yalnız öbür taraftadır.',
        gorsel: { tur: 'sayi-dogrusu', aralik: [-5, 5], noktalar: [{ x: -4, ad: 'K' }, { x: 3, ad: 'L' }] } },
      { baslik: 'Değişim her zaman son − ilk', metin: 'Bir şeyin ne kadar değiştiğini bulmak için **son değerden ilk değeri** çıkar. Sonucun işareti değişimin yönünü kendiliğinden verir.\n\n−4 → +3: 3 − (−4) = **+7** (artı yöne 7).\n+5 → −1: −1 − 5 = **−6** (eksi yöne 6).',
        dene: { soru: 'Cisim +2 m\'den −6 m\'ye gidiyor. Değişim?', secenekler: [
          { metin: '−8 m', dogru: true, neden: '−6 − 2 = −8. Eksi: cisim eksi yöne 8 m gitti.' },
          { metin: '−4 m', neden: 'Sayıları topladın. İki nokta arasındaki uzaklık 2 + 6 = 8 m\'dir.' },
          { metin: '+8 m', neden: 'Büyüklük doğru ama cisim eksi yöne gitti; son − ilk = −6 − 2.' },
        ] } },
      { baslik: 'Eksi sayı küçük şey demek değil', metin: '−20 m/s ile giden araba, +5 m/s ile gidenden **daha süratlidir**; yalnız öbür yöne gidiyordur. Büyüklüğü karşılaştırırken işareti kapat, yönü söylerken işareti oku.' },
    ],
    cikis: [
      { soru: 'Hangisinde cisim sıfır noktasından en uzaktadır?', secenekler: [
        { metin: '−9 m', dogru: true, neden: 'Uzaklık büyüklüktür: 9 m. İşaret yalnız hangi tarafta olduğunu söyler.' },
        { metin: '+7 m', neden: '7 m uzakta; −9 m konumundaki cisim 9 m uzakta.' },
        { metin: '0 m', neden: 'Bu cisim tam sıfır noktasındadır; uzaklığı sıfırdır.' },
      ] },
      { soru: 'Hız −3 m/s\'den −8 m/s\'ye geliyor. Hızdaki değişim nedir?', secenekler: [
        { metin: '−5 m/s', dogru: true, neden: 'Son − ilk = −8 − (−3) = −5. Hız eksi yönde 5 m/s daha büyüdü.' },
        { metin: '+5 m/s', neden: 'İlk − son yaptın. Kural değişmez: son − ilk.' },
        { metin: '−11 m/s', neden: 'Topladın. İki değer aynı tarafta; aralarındaki fark 5\'tir.' },
      ] },
    ],
  },
  {
    id: 'AK-3', baslik: 'Skaler ve vektör: yön sorusu', sure: '3 dk',
    neden: 'Hareket konusundaki bütün tuzaklar tek ayrıma dayanır: bu büyüklüğün yönü var mı? Yol–yer değiştirme ve sürat–hız çiftleri bu ayrımın iki yüzüdür.',
    kontrol: { soru: 'Hangisini tam anlatmak için yön de söylemek gerekir?', secenekler: [
      { metin: 'Bir arabanın hızı', dogru: true, neden: 'Hız vektöreldir: "90 km/h" yetmez, "90 km/h kuzeye" demek gerekir.' },
      { metin: 'Bir dersin süresi', neden: 'Süre skalerdir: "40 dakika" tam bir bilgidir, yönü sorulmaz.' },
      { metin: 'Bir çantanın kütlesi', neden: 'Kütle skalerdir: "3 kg hangi yöne?" sorusu anlamsızdır.' },
      { metin: 'Bir odanın sıcaklığı', neden: 'Sıcaklık skalerdir; eksi derece olsa bile bu yön değil, ölçekteki yerdir.' },
    ] },
    ekranlar: [
      { baslik: 'Tek soru: "Hangi yöne?"', metin: 'Bir büyüklük için "hangi yöne?" diye sormak **anlamlıysa** o büyüklük vektöreldir; anlamsızsa skalerdir.\n\n"5 kg hangi yöne?" anlamsız → kütle skaler.\n"5 m/s hangi yöne?" anlamlı → hız vektörel.' },
      { baslik: 'Hareketin iki takımı', metin: '**Skaler (yalnız sayı ve birim):** zaman, alınan yol, sürat.\n**Vektörel (sayı, birim ve yön):** konum, yer değiştirme, hız, ivme.\n\nÇiftlere dikkat: yol ↔ yer değiştirme, sürat ↔ hız. Aynı birimi taşırlar, farklı soruya cevap verirler.',
        dene: { soru: '"Koşucu 400 m koştu" cümlesi hangi büyüklüğü veriyor?', secenekler: [
          { metin: 'Alınan yol', dogru: true, neden: 'Yön söylenmedi, yalnız ne kadar koştuğu söylendi: skaler olan yol.' },
          { metin: 'Yer değiştirme', neden: 'Yer değiştirme için nereden nereye, hangi yöne olduğu gerekir; pistte bir tur koştuysa yer değiştirmesi sıfırdır.' },
          { metin: 'Hız', neden: 'Hız için hem süre hem yön bilgisi gerekir; cümlede ikisi de yok.' },
        ] } },
      { baslik: 'Aynı doğru üzerinde vektörler işaretle toplanır', metin: 'Tek doğru üzerinde çalışırken yönü işaret taşır: bir yön artı, öbürü eksi.\n\nSağa 6 m, sonra sola 4 m: (+6) + (−4) = **+2 m** yer değiştirme. Skaler olan yol ise işaretsiz toplanır: 6 + 4 = **10 m**.' },
    ],
    cikis: [
      { soru: 'Hız ile süratin birimi aynıdır (m/s). Buna göre hangisi doğrudur?', secenekler: [
        { metin: 'Birimleri aynıdır ama hız vektörel, sürat skalerdir.', dogru: true, neden: 'Birim büyüklüğün türünü belirlemez. Hızın yönü vardır, süratin yoktur.' },
        { metin: 'Birimleri aynı olduğu için ikisi aynı büyüklüktür.', neden: 'Yol ile yer değiştirme de metreyle ölçülür ama farklı şeylerdir; birim eşitliği büyüklük eşitliği değildir.' },
        { metin: 'İkisi de vektöreldir.', neden: 'Sürat için "hangi yöne?" sorulmaz; gösterge yalnız sayı gösterir.' },
      ] },
      { soru: 'Bir kişi doğuya 8 m, sonra batıya 3 m yürüyor. Doğu artı yön alınırsa yer değiştirme ve yol nedir?', secenekler: [
        { metin: '+5 m ve 11 m', dogru: true, neden: 'Yer değiştirme işaretle: 8 + (−3) = +5. Yol işaretsiz: 8 + 3 = 11.' },
        { metin: '+11 m ve 11 m', neden: 'Geri dönülen 3 m yer değiştirmeyi azaltır; yalnız yola eklenir.' },
        { metin: '+5 m ve 5 m', neden: 'Yol hiç azalmaz: geri yürünen 3 m de yürünmüştür.' },
      ] },
    ],
  },
  {
    id: 'AK-4', baslik: 'Grafikte eğim: ne kadar hızlı değişiyor?', sure: '4 dk',
    neden: 'Konum–zaman grafiğinden hız, hız–zaman grafiğinden ivme **eğimle** okunur. Eğimi birimiyle okuyabilen öğrenci grafik sorularının yarısını formülsüz çözer.',
    kontrol: { soru: 'Bir doğru (0 s, 0 m) ve (4 s, 20 m) noktalarından geçiyor. Eğimi nedir?', secenekler: [
      { metin: '5 m/s', dogru: true, neden: 'Eğim = dikey değişim / yatay değişim = 20 m / 4 s = 5 m/s. Birim de bölünür.' },
      { metin: '80', neden: 'Çarptın. Eğim bir orandır: dikeydeki değişim yataydaki değişime bölünür.' },
      { metin: '0,2 s/m', neden: 'Ters böldün (yatay / dikey). Eğim dikey değişimin yatay değişime oranıdır.' },
      { metin: '20 m', neden: 'Bu yalnız dikey değişim. Eğim için bu değişimin kaç saniyede olduğuna bölmelisin.' },
    ] },
    ekranlar: [
      { baslik: 'Eğim bir orandır', metin: 'Doğru üzerinde iki nokta seç. **Eğim = dikeyde ne kadar değişti / yatayda ne kadar değişti.**\n\n(2 s, 10 m) ve (6 s, 30 m): dikey değişim 20 m, yatay değişim 4 s. Eğim = 20/4 = 5.',
        gorsel: { tur: 'xt', n: [[0, 0], [8, 40]], isaret: [[2, 10], [6, 30]] } },
      { baslik: 'Eğimin birimi vardır ve anlamı oradan okunur', metin: 'Dikey eksen metre, yatay eksen saniyeyse eğimin birimi **m/s** olur. m/s hızın birimidir: demek ki bu grafikte eğim hızdır.\n\nKural: **eğimin anlamını ezberleme, eksen birimlerini böl.** (m/s) / s = m/s² çıkıyorsa eğim ivmedir.',
        dene: { soru: 'Dikey ekseni hız (m/s), yatay ekseni zaman (s) olan grafikte eğimin birimi nedir?', secenekler: [
          { metin: 'm/s²', dogru: true, neden: '(m/s) / s = m/s². Bu ivmenin birimidir: hız–zaman grafiğinin eğimi ivmedir.' },
          { metin: 'm', neden: 'Metre, bu grafikte alanın birimidir ((m/s) × s). Eğim için bölersin.' },
          { metin: 'm/s', neden: 'm/s dikey eksenin kendi birimi. Eğim, onun saniyeye bölünmesidir.' },
        ] } },
      { baslik: 'Dört görünüş', metin: '**Dik çizgi:** büyük eğim, hızlı değişim. **Yatık çizgi:** küçük eğim. **Yatay çizgi:** eğim sıfır, değişim yok. **Aşağı inen çizgi:** eğim eksi, değer azalıyor.\n\nDüz bir doğrunun eğimi her yerinde aynıdır; hangi iki noktayı seçersen seç aynı sonucu bulursun.',
        gorsel: { tur: 'xt', cizgiler: [[[0, 0], [4, 40]], [[0, 0], [8, 20]], [[0, 25], [8, 25]], [[0, 40], [8, 0]]] } },
    ],
    cikis: [
      { soru: 'Bir doğru (0 s, 12 m) noktasından (3 s, 0 m) noktasına iniyor. Eğimi nedir?', secenekler: [
        { metin: '−4 m/s', dogru: true, neden: 'Dikey değişim 0 − 12 = −12 m, yatay değişim 3 s. −12/3 = −4 m/s. Eksi: değer azalıyor.' },
        { metin: '+4 m/s', neden: 'Büyüklük doğru; ama çizgi aşağı iniyor, dikey değişim son − ilk = −12.' },
        { metin: '−36', neden: 'Çarptın. Eğim, dikey değişimin yatay değişime bölünmesidir.' },
      ] },
      { soru: 'Aynı grafikte K doğrusu L doğrusundan daha dik. Buna göre hangisi doğrudur?', secenekler: [
        { metin: 'K\'de dikeydeki büyüklük birim zamanda daha çok değişir.', dogru: true, neden: 'Diklik değişimin hızıdır: aynı yatay adımda K daha çok yükselir.' },
        { metin: 'K\'nin değeri her an L\'ninkinden büyüktür.', neden: 'Diklik değeri değil değişimi anlatır; dik bir doğru daha aşağıdan başlayabilir.' },
        { metin: 'K daha uzun bir doğrudur.', neden: 'Doğrunun kâğıttaki uzunluğu eğim değildir; eğim bir orandır.' },
      ] },
    ],
  },
  {
    id: 'AK-5', baslik: 'Grafik altındaki alan: biriken miktar', sure: '4 dk',
    neden: 'Hız–zaman grafiğinden yer değiştirme, ivme–zaman grafiğinden hız değişimi **alanla** okunur. Alan, çarpmanın resmidir.',
    kontrol: { soru: 'Hız–zaman grafiğinde hız 4 saniyede 0\'dan 10 m/s\'ye düzgün çıkıyor. Çizgi ile zaman ekseni arasındaki alan nedir?', secenekler: [
      { metin: '20 m', dogru: true, neden: 'Üçgen: taban 4 s, yükseklik 10 m/s. Alan = 4 × 10 / 2 = 20; birim (m/s) × s = m.' },
      { metin: '40 m', neden: 'Bu dikdörtgenin alanı. Hız baştan beri 10 değildi; şekil üçgen, ikiye böl.' },
      { metin: '2,5 m/s²', neden: 'Bu eğimdir (10/4). Soru alanı istiyor: taban ile yükseklik çarpılır.' },
      { metin: '14 m', neden: 'Kenarları topladın. Alan için taban ile yükseklik çarpılır, üçgende ikiye bölünür.' },
    ] },
    ekranlar: [
      { baslik: 'Alan = yükseklik × taban, birimiyle', metin: 'Hız 5 m/s\'de sabit, süre 4 s: çizgi ile zaman ekseni arasında bir dikdörtgen oluşur. Alanı 5 × 4 = 20; birimi (m/s) × s = **m**.\n\n20 m, bu cismin 4 saniyede yaptığı yer değiştirmedir. Alanın anlamı da eğim gibi **birimlerden** okunur: bu kez bölmek yerine çarparsın.',
        gorsel: { tur: 'vt', n: [[0, 5], [4, 5]], alan: [0, 4] } },
      { baslik: 'Üç şekil yeter', metin: '**Dikdörtgen:** taban × yükseklik. **Üçgen:** taban × yükseklik / 2. **Yamuk:** (alt + üst) / 2 × genişlik; ya da dikdörtgen + üçgen diye ikiye böl.\n\nHız 3 saniyede 4 m/s\'den 10 m/s\'ye çıkıyorsa: (4 + 10) / 2 × 3 = 21 m.',
        dene: { soru: 'Hız (0–2) s aralığında 6 m/s sabit, (2–5) s aralığında 6\'dan 0\'a düzgün iniyor. Toplam alan?', secenekler: [
          { metin: '21 m', dogru: true, neden: 'Dikdörtgen 6 × 2 = 12, üçgen 3 × 6 / 2 = 9. Toplam 21 m.' },
          { metin: '30 m', neden: 'Bütün süre boyunca 6 m/s gidilmiş gibi hesapladın; ikinci parça üçgen.' },
          { metin: '12 m', neden: 'Yalnız dikdörtgeni aldın; yavaşlarken de cisim yol alır, üçgeni ekle.' },
        ] } },
      { baslik: 'Eksenin altı eksidir', metin: 'Çizgi zaman ekseninin **altındaysa** değer eksidir; o parçanın alanı da eksi sayılır. Hız–zaman grafiğinde bu "geri gidilen" kısımdır.\n\nİki farklı soru, iki farklı toplam: **net değişim** için alanları işaretleriyle topla, **toplam miktar** için büyüklükleriyle.',
        gorsel: { tur: 'vt', n: [[0, 4], [3, 4], [3, -2], [5, -2]], alan: [0, 5] } },
    ],
    cikis: [
      { soru: 'Hız–zaman grafiğinde hız (0–3) s aralığında +4 m/s, (3–5) s aralığında −2 m/s. İşaretli toplam alan nedir?', secenekler: [
        { metin: '+8 m', dogru: true, neden: '4 × 3 = +12 ve −2 × 2 = −4. Toplam +8 m: cisim başladığı yerin 8 m ilerisinde.' },
        { metin: '16 m', neden: 'Büyüklükleri topladın; bu, alınan yoldur. İşaretli toplam soruldu.' },
        { metin: '+12 m', neden: 'Eksenin altındaki parçayı atladın; geri gidilen 4 m çıkarılır.' },
      ] },
      { soru: 'İvme–zaman grafiğinde ivme 5 saniye boyunca 2 m/s². Alan nedir ve neyi verir?', secenekler: [
        { metin: '10 m/s; hızdaki değişimi', dogru: true, neden: '2 × 5 = 10; birim (m/s²) × s = m/s. m/s hız birimidir: alan hızın ne kadar değiştiğidir.' },
        { metin: '10 m; yer değiştirmeyi', neden: 'Birimleri çarp: (m/s²) × s = m/s eder, metre etmez.' },
        { metin: '2,5 m/s²; ivmeyi', neden: 'Böldün. Alan çarpmadır; ivme zaten dikey eksenin kendisi.' },
      ] },
    ],
  },
  {
    id: 'AK-6', baslik: 'Oran düşünmesi: sürat, yol, süre', sure: '3 dk',
    neden: 'Hareket sorularının çoğu tek ilişkinin üç biçimidir. Bu ilişkiyi üçgen ezberiyle değil, birimin anlamıyla kurarsan hiçbir biçimi unutmazsın.',
    kontrol: { soru: 'Bir araç aynı yolu bu kez yarı sürede gidiyor. Sürati nasıl değişmiştir?', secenekler: [
      { metin: 'İki katına çıkmıştır.', dogru: true, neden: 'Yol aynıyken sürat ile süre ters orantılıdır: süre yarıya inerse sürat iki katına çıkar.' },
      { metin: 'Yarıya inmiştir.', neden: 'Daha kısa sürede aynı yolu gitmek için daha hızlı gitmek gerekir.' },
      { metin: 'Değişmemiştir.', neden: 'Sürat sabit kalsaydı aynı yol aynı sürede biterdi.' },
      { metin: 'Dört katına çıkmıştır.', neden: 'İlişki birinci derecedendir: sürat = yol / süre. Süre yarıya inince sürat iki kat olur.' },
    ] },
    ekranlar: [
      { baslik: 'Birimi oku, formülü hatırla', metin: '"15 m/s" şu cümledir: **her saniyede 15 metre.** Bu cümleyi bilen üç işlemi de kurar:\n\n4 saniyede kaç metre? 15 × 4 = 60 m. (yol = sürat × süre)\n90 metre kaç saniye sürer? 90 / 15 = 6 s. (süre = yol / sürat)\n6 saniyede 90 m gidenin sürati? 90 / 6 = 15 m/s. (sürat = yol / süre)' },
      { baslik: 'Biri sabitken diğer ikisi', metin: '**Süre aynıysa:** sürat iki kat → yol iki kat (doğru orantı).\n**Sürat aynıysa:** süre iki kat → yol iki kat (doğru orantı).\n**Yol aynıysa:** sürat iki kat → süre yarı (ters orantı).\n\nSınavdaki "v, 2v, t, 2t" soruları bu üç cümleyle çözülür.',
        dene: { soru: 'K aracı v süratiyle 2t süre, L aracı 2v süratiyle t süre gidiyor. Aldıkları yollar için ne söylenir?', secenekler: [
          { metin: 'Eşittir.', dogru: true, neden: 'K: v × 2t = 2vt. L: 2v × t = 2vt. Çarpım aynı.' },
          { metin: 'L\'ninki iki katıdır.', neden: 'L iki kat süratli ama yarı süre gitti; iki etki birbirini götürür.' },
          { metin: 'K\'ninki iki katıdır.', neden: 'K iki kat süre gitti ama yarı süratle; çarpımlar eşit çıkar.' },
        ] } },
      { baslik: 'Yavaş parça daha uzun sürer', metin: 'Aynı uzunluktaki iki yoldan yavaş gidilende **daha çok zaman** geçer. Bu yüzden eşit yollar farklı süratlerle gidildiğinde ortalama, yavaş olana daha yakın çıkar. Bunu Sürat ve Hız durağında hesaplayacaksın; şimdilik sezgiyi al.' },
    ],
    cikis: [
      { soru: '20 m/s süratle giden araç 300 m\'lik yolu kaç saniyede alır?', secenekler: [
        { metin: '15', dogru: true, neden: 'Her saniyede 20 m: 300 / 20 = 15 s.' },
        { metin: '6000', neden: 'Çarptın. Süre, yolun sürate bölünmesidir; birimi kontrol et: m / (m/s) = s.' },
        { metin: '280', neden: 'Çıkarma yapılmaz; "her saniyede 20 m" cümlesinden 300 m\'nin kaç saniye ettiğini bul.' },
      ] },
      { soru: 'Aynı sürede K aracı L aracının üç katı yol alıyor. Süratleri oranı v_K / v_L kaçtır?', secenekler: [
        { metin: '3', dogru: true, neden: 'Süre aynıyken yol ile sürat doğru orantılıdır: üç kat yol, üç kat sürat.' },
        { metin: '1/3', neden: 'Oranı ters kurdun: daha çok yol alan daha süratlidir.' },
        { metin: '9', neden: 'İlişki birinci derecedendir; kare alınmaz.' },
      ] },
    ],
  },
  {
    id: 'AK-7', baslik: 'İki geometri kısa yolu: dik üçgen ve çember', sure: '3 dk',
    neden: 'Yer değiştirme düz oktur. Kareli düzlemde ya da pistte bu okun uzunluğunu bulmak için iki şekil yeter.',
    kontrol: { soru: 'Bir kişi doğuya 60 m, sonra kuzeye 80 m yürüyor. Başladığı noktaya düz uzaklığı kaç metredir?', secenekler: [
      { metin: '100', dogru: true, neden: 'Doğu ile kuzey birbirine dik: 60–80–100, yani 3–4–5 üçgeninin 20 katı.' },
      { metin: '140', neden: 'Bu yürünen toplam yol. Düz uzaklık dik üçgenin uzun kenarıdır ve toplamdan kısadır.' },
      { metin: '20', neden: 'Çıkarma yalnız aynı doğru üzerindeki zıt yönler için yapılır; burada yönler dik.' },
      { metin: '70', neden: 'Ortalama almak bir anlam taşımaz; dik kenarlardan uzun kenar bulunur.' },
    ] },
    ekranlar: [
      { baslik: 'Dik yönler: 3–4–5', metin: 'Doğu–kuzey, sağ–yukarı gibi birbirine dik iki gidişten sonra başlangıca düz uzaklık dik üçgenin uzun kenarıdır.\n\nSınav neredeyse hep **3–4–5** ve katlarını kullanır: 6–8–10, 30–40–50, 60–80–100. Bir de 5–12–13 çıkar. Kenarlar eşitse (a, a) uzun kenar a√2 olur.',
        gorsel: { tur: 'kroki', yol: [[0, 0], [4, 0], [4, 3]], ok: [[0, 0], [4, 3]] } },
      { baslik: 'Çember: çevre ve çap', metin: 'Yarıçapı r olan çemberde **tam tur = 2πr**, **yarım tur = πr**. Sınav çoğunlukla π = 3 verir: tam tur 6r, yarım tur 3r.\n\nYarım tur atan kişi çemberin **tam karşısına** gelir: başlangıca düz uzaklığı çap kadardır, **2r**. Tam turda başladığı yere döner: düz uzaklık **sıfır**.',
        dene: { soru: 'Yarıçapı 50 m olan pistte yarım tur atan sporcu için yürünen uzunluk ve başlangıca düz uzaklık nedir? (π = 3)', secenekler: [
          { metin: '150 m ve 100 m', dogru: true, neden: 'Yarım tur πr = 3 × 50 = 150 m. Karşı uca düz uzaklık çap: 2 × 50 = 100 m.' },
          { metin: '300 m ve 100 m', neden: '300 m tam turun uzunluğu (2πr). Soru yarım turu soruyor.' },
          { metin: '150 m ve 50 m', neden: 'Karşı uca uzaklık yarıçap değil çaptır: iki yarıçap.' },
        ] } },
      { baslik: 'Çeyrek tur', metin: 'Çeyrek turda yürünen uzunluk πr/2\'dir. Başlangıca düz uzaklık ise iki yarıçapın oluşturduğu dik üçgenin uzun kenarıdır: **r√2**.\n\nÜç değer yan yana: çeyrek tur r√2, yarım tur 2r, tam tur 0. Düz uzaklık önce büyür, sonra küçülür; yürünen uzunluk ise hep artar.' },
    ],
    cikis: [
      { soru: 'Kareli düzlemde bir karınca 5 birim sağa, sonra 12 birim yukarı gidiyor. Başlangıca düz uzaklığı kaç birimdir?', secenekler: [
        { metin: '13', dogru: true, neden: '5–12–13 dik üçgeni: 25 + 144 = 169 = 13².' },
        { metin: '17', neden: 'Bu toplam yürünen uzunluk; düz uzaklık bundan kısadır.' },
        { metin: '7', neden: 'Yönler dik olduğu için çıkarma yapılmaz.' },
      ] },
      { soru: 'Yarıçapı 20 m olan pistte bir buçuk tur atan sporcunun başlangıca düz uzaklığı kaç metredir?', secenekler: [
        { metin: '40', dogru: true, neden: 'Tam tur başladığı yere getirir; kalan yarım tur karşı uca götürür: çap = 40 m.' },
        { metin: '0', neden: 'Düz uzaklık tam turlarda sıfır olur; burada yarım tur daha var.' },
        { metin: '180', neden: 'Bu yürünen uzunluk (1,5 × 2π × 20, π = 3). Düz uzaklık çapı geçemez.' },
      ] },
    ],
  },
];
