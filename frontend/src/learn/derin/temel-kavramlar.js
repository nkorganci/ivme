// Temel Kavramlar: bölüm keşifleri. Özgün öğretim örnekleri; sınav sorusu değildir.
const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '0');
const show = (n) => (n < 0 ? `−${-n}` : String(n)).replace('.', ',');
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const power = (base, n) => `${base < 0 ? `(${show(base)})` : show(base)}${String(n).split('').map((d) => SUP[d]).join('')}`;

export const explorations = {
  'temel-tekcift': {
    lessonId: 'temel-kavramlar',
    title: 'Tek mi, çift mi? Nesneleri eşleştir',
    story: 'Bir sınıfta öğrenciler ikili gruplara ayrılıyor. Herkes eşleşirse öğrenci sayısı çifttir; bir kişi açıkta kalırsa tektir. Toplama, çıkarma ve çarpmada sonucun tek mi çift mi olduğunu, sayıyı hesaplamadan açıkta kalanlara bakarak bulabiliriz.',
    terms: [['Çift sayı', '2 ile tam bölünen tam sayı: $2k$. Nesneler ikişer ikişer eşleşir, kimse açıkta kalmaz. 0 da çifttir.'], ['Tek sayı', '2 ile bölündüğünde 1 kalan tam sayı: $2k+1$. Bir nesne açıkta kalır.'], ['Teklik', 'Bir tam sayının tek ya da çift olma durumu.']],
    experiment: 'Önce a ve b’yi tek seç ve toplamaya bak: açıkta kalan iki nesne ne yapıyor? Sonra işlemi çarpma yap ve sayılardan birini çift seç. Izgarada hangi durumda eşsiz bir kare kalıyor?',
    example: '7 ile 5’in toplamı ve çarpımı tek mi, çift mi? Hesaplamadan karar verelim.',
    steps: [
      ['Açıkta kalanları bul', '$7=2\\cdot3+1$ ve $5=2\\cdot2+1$: ikisinde de bir nesne açıkta kalıyor; ikisi de tek.'],
      ['Toplamda açıktakileri eşleştir', 'Toplamda açıktaki iki nesne birbiriyle eşleşir: $7+5$ çifttir. Gerçekten $12=2\\cdot6$.'],
      ['Çarpımı ızgara olarak düşün', '$7\\cdot5$, 7 sütun ve 5 satırlık bir ızgaradır. Her satırda bir kare açıkta kalır; açıktaki 5 kareden 4’ü eşleşir, 1’i kalır. Çarpım tektir: $35$.'],
    ],
    tip: 'Toplama ve çıkarmada yalnız tek terimleri say: tek sayıda tek terim varsa sonuç tektir. Çarpımda bir tane çift çarpan yeter, sonuç çift olur. Bu kısa yollar tam sayılarda geçerlidir.',
    trap: 'Kesirli ya da ondalıklı sayılar için teklik sorulmaz: $\\frac{3}{2}$ ne tek ne çifttir. 0 ise çift sayıdır, çünkü $0=2\\cdot0$.',
    transfer: ['$a$ tek, $b$ çift ise $a\\cdot b+a$ tek midir, çift midir?', 'Tek', 'Çift', '$a\\cdot b$ çifttir, çünkü bir çift çarpan yeter. Çift + tek = tek. Örnek: $3\\cdot4+3=15$.'],
    expert: 'Cebirle: $(2m+1)+(2n+1)=2(m+n+1)$ çift; $(2m+1)(2n+1)=2(2mn+m+n)+1$ tek. Kuvvette $a^n$ ($n\\geq1$) tabanla aynı tekliktedir, çünkü yalnız tek çarpanların çarpımı tektir. $a-b$ ile $a+b$ aynı tekliktedir; aralarındaki fark $2b$ çifttir.',
  },
  'temel-isaret': {
    lessonId: 'temel-kavramlar',
    title: 'Negatif bir sayıyı tekrar tekrar çarpmak',
    story: 'Bir asansör her katta 3 metre aşağı iniyorsa her adımdaki yer değiştirme negatiftir. Negatif bir sayıyı kendisiyle çarptıkça işaret bir eksi, bir artı olarak değişir. Bu ritmi görmek, kuvvetlerin işaretini hesaplamadan söylemeyi sağlar.',
    terms: [['Kuvvet', '$a^n$, $n$ tane $a$’nın çarpımıdır: $(-2)^3=(-2)(-2)(-2)$.'], ['Taban ve üs', '$(-2)^3$’te taban $-2$, üs 3’tür.'], ['Parantez', '$(-2)^2$ ile $-2^2$ farklıdır: ilki 4, ikincisi $-4$.']],
    experiment: 'Tabanı −2 seç ve üssü 1’den 6’ya kadar artır. Her yeni çarpanda işaret ne oluyor? Sonra tabanı 2 yap: işaret neden hiç değişmiyor? Taban 0 iken ne görüyorsun?',
    example: '$(-2)^5$ pozitif midir, negatif midir? Değeri kaçtır?',
    steps: [
      ['Negatif çarpanları say', '$(-2)^5$ ifadesinde beş tane $-2$ çarpılıyor; beş negatif çarpan var.'],
      ['İkişer eşleştir', 'İki negatif çarpanın çarpımı pozitiftir. Dört çarpan iki pozitif çift oluşturur, bir negatif çarpan açıkta kalır.'],
      ['İşareti ve büyüklüğü birlikte yaz', 'Sonuç negatif, büyüklüğü $2^5=32$: $(-2)^5=-32$.'],
    ],
    tip: 'Negatif tabanın kuvvetinde işareti üssün tekliği belirler: üs çiftse sonuç pozitif, tekse negatiftir. Pozitif tabanın her kuvveti pozitiftir.',
    trap: 'Parantez yoksa üs yalnız sayıya etki eder: $-2^4=-16$, ama $(-2)^4=16$. Taban 0 ise her pozitif kuvvet 0’dır; 0 ne pozitif ne negatiftir.',
    transfer: ['$(-1)^{25}+(-1)^{26}$ kaçtır?', '0', '2', 'Tek üs $-1$, çift üs $+1$ verir: $-1+1=0$.'],
    expert: 'Çarpım ve bölümün işaretini negatif çarpanların sayısı belirler: çiftse pozitif, tekse negatif. Bu yüzden $a^2b^5<0$ gibi koşullarda ($a\\neq0$) çift kuvvetleri atabiliriz. Toplama ve çıkarmada işaret yalnız işaretlerden çıkmaz; büyüklükler de gerekir.',
  },
  'temel-ardisik': {
    lessonId: 'temel-kavramlar',
    title: 'Gauss’un eşleştirmesi: ilk ile sonu topla',
    story: 'Bir salonun ilk sırasında 5 koltuk var ve her sıra bir öncekinden 3 koltuk daha uzun. Koltukları tek tek saymak uzun sürer. Diziyi bir de tersten yazarsan alt alta gelen her çiftin aynı toplamı verdiğini görürsün.',
    terms: [['Ardışık terimler', 'Aralarındaki fark hep aynı olan sayılar: 5, 8, 11, 14, …'], ['Ortak fark', 'Bir terimden sonrakine geçerken eklenen sayı.'], ['Terim sayısı', 'Dizide kaç sayı olduğu: $\\frac{\\text{son}-\\text{ilk}}{\\text{fark}}+1$.']],
    experiment: 'İlk terimi, farkı ve terim sayısını değiştir. Alt satır aynı diziyi tersten yazıyor. Alt alta gelen sayıların toplamı her sütunda neden aynı kalıyor?',
    example: '$5+8+11+\\ldots+32$ toplamını bulalım.',
    steps: [
      ['Terim sayısını bul', '$\\frac{32-5}{3}+1=9+1=10$ terim. 9 adım atılır; başlangıç terimi de sayılır.'],
      ['Tersiyle eşleştir', 'Diziyi tersten yaz: $5+32=37$, $8+29=37$, … Her sütun 37 eder ve 10 sütun var.'],
      ['İki kez yazdığını unutma', '$10\\cdot37=370$ iki dizinin toplamıdır; istenen toplam $\\frac{370}{2}=185$.'],
    ],
    tip: 'Toplam $=\\frac{\\text{ilk}+\\text{son}}{2}\\cdot\\text{terim sayısı}$. Ortak fark sabitse ilk ile son terimin ortalaması bütün terimlerin ortalamasıdır.',
    trap: 'Fark değişiyorsa (1, 2, 4, 8, …) eşleştirme çalışmaz; sütun toplamları eşit çıkmaz. Terim sayısında $+1$’i unutmak da en sık hatadır.',
    transfer: ['$3+7+11+\\ldots+43$ toplamı kaçtır?', '253', '230', 'Terim sayısı $\\frac{43-3}{4}+1=11$; toplam $\\frac{3+43}{2}\\cdot11=23\\cdot11=253$.'],
    expert: 'Terim sayısı tekse ortadaki terim ortalamaya eşittir: toplam = ortanca × terim sayısı. Bu yüzden “ardışık 5 tek sayının toplamı 115” sorusunda ortanca $115:5=23$’tür. Çift sayıda terimde ortadaki iki terimin ortalaması kullanılır.',
  },
  'temel-ucdeger': {
    lessonId: 'temel-kavramlar',
    title: 'Toplamı sabit iki sayının çarpımı',
    story: '24 metrelik bir çitle dikdörtgen bir bahçe çevireceksin; iki komşu kenarın toplamı 12 metre olur. Kenarlardan biri uzadıkça diğeri kısalır. Alan hangi ayrımda en büyük olur? Değeri değiştirip dikdörtgenin biçimini izle.',
    terms: [['Sabit toplam', 'İki sayının toplamı değişmiyor: $x+y=12$.'], ['Uç değer', 'Bir ifadenin alabileceği en büyük ya da en küçük değer.'], ['Bağlı değişken', 'Birini seçince diğeri kendiliğinden belirlenir: $y=12-x$.']],
    experiment: 'x’i 1’den başlatıp artır. Sağdaki çubuklar her ayrımın çarpımını gösteriyor. Çarpım ne zaman artmayı bırakıp azalmaya başlıyor? x ile y eşitken dikdörtgen hangi şekli alıyor?',
    example: '$x+y=12$ ve $x$, $y$ pozitif tam sayılar. $x\\cdot y$ en çok kaç olur?',
    steps: [
      ['Bir değişkeni diğerine bağla', '$y=12-x$; çarpım $x(12-x)$. Tek değişkenli bir sayım kaldı.'],
      ['Uçlardan ortaya doğru dene', '$1\\cdot11=11$, $3\\cdot9=27$, $5\\cdot7=35$, $6\\cdot6=36$. Sayılar birbirine yaklaştıkça çarpım büyüyor.'],
      ['Simetriyi kullan', '$7\\cdot5$ ile $5\\cdot7$ aynıdır; ortayı geçince çarpım yeniden küçülür. En büyük değer 36.'],
    ],
    tip: 'Toplamı sabit iki pozitif sayının çarpımı, sayılar birbirine en yakınken en büyüktür. “Farklı olsun” koşulu varsa ortaya en yakın farklı ikiliyi seç: $5\\cdot7=35$.',
    trap: 'Bu kural toplam sabitken ve sayılar pozitifken geçerlidir. Negatif sayılar serbestse sonuç değişir: $x+y=12$ iken $x=-2$, $y=14$ çarpımı $-28$ yapar.',
    transfer: ['$x+y=15$ ve $x$, $y$ pozitif tam sayılar. $x\\cdot y$ en çok kaçtır?', '56', '54', '15 tek olduğu için iki eşit tam sayıya bölünemez; birbirine en yakın tam sayılar 7 ve 8: $7\\cdot8=56$.'],
    expert: 'Cebirle: $x(12-x)=36-(x-6)^2$. Kare negatif olamaz; çarpım ancak $x=6$ iken 36 olur ve $x$, 6’dan uzaklaştıkça $(x-6)^2$ kadar azalır. Aynı fikir, çevresi sabit dikdörtgenlerden alanı en büyük olanın kare olduğunu gösterir.',
  },
};

const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
export const controls = {
  'temel-tekcift': [range('a', 'Birinci sayı (a)', 7, 1, 9), range('b', 'İkinci sayı (b)', 5, 1, 9),
    { key: 'op', label: 'İşlem', value: 0, options: [[0, 'Toplama a + b'], [1, 'Çıkarma a − b'], [2, 'Çarpma a × b']] }],
  'temel-isaret': [{ key: 'base', label: 'Taban', value: -2, options: [[-3, '−3'], [-2, '−2'], [-1, '−1'], [0, '0'], [2, '2']] }, range('n', 'Üs', 3, 1, 6)],
  'temel-ardisik': [range('a', 'İlk terim', 5, 1, 10), range('r', 'Ortak fark', 3, 1, 5), range('n', 'Terim sayısı', 6, 2, 10)],
  'temel-ucdeger': [range('x', 'Bir kenar (x)', 3, 1, 11)],
};

export function model(id, v) {
  if (id === 'temel-tekcift') {
    const symbol = ['+', '−', '×'][v.op];
    const result = v.op === 0 ? v.a + v.b : v.op === 1 ? v.a - v.b : v.a * v.b;
    const even = result % 2 === 0;
    const odd = [v.a % 2, v.b % 2];
    let observation;
    if (v.op < 2) {
      const open = odd[0] + odd[1];
      observation = `${v.a} sayısında ${odd[0]}, ${v.b} sayısında ${odd[1]} nesne açıkta. `
        + (open === 2 ? 'Açıktaki iki nesne birbirini eşler; sonuç çift.' : open === 1 ? 'Tek bir nesne açıkta kalır; sonuç tek.' : 'Hiç nesne açıkta değil; sonuç çift.')
        + (v.op === 1 ? ' Çıkarma, toplamayla aynı tekliği verir: a − b ile a + b’nin farkı 2b’dir.' : '');
    } else {
      observation = even
        ? 'Izgaranın çift sayıdaki kenarı boyunca kareler ikişer eşleşir. Tek bir çift çarpan, çarpımı çift yapar.'
        : 'Her satırda bir kare açıkta kalır. Açıktaki kare sayısı da tek olduğu için sonunda bir kare eşsiz kalır: tek × tek = tek.';
    }
    return { kind: 'temel-tekcift', ...v, symbol, result, even, odd, equation: `${v.a} ${symbol} ${v.b} = ${show(result)} → ${even ? 'çift' : 'tek'}`, observation };
  }
  if (id === 'temel-isaret') {
    const powers = Array.from({ length: v.n }, (_, i) => v.base ** (i + 1));
    const value = powers[v.n - 1];
    const observation = v.base === 0
      ? 'Taban 0 olunca her pozitif kuvvet 0’dır: 0 ne pozitif ne negatiftir.'
      : v.base > 0
        ? `Pozitif bir sayıyı kendisiyle çarpmak işareti değiştirmez: ${v.base} tabanının her kuvveti pozitiftir.`
        : `Her yeni ${show(v.base)} çarpanı işareti tersine çevirir. Üs ${v.n} ${v.n % 2 ? 'tek: bir negatif çarpan eşsiz kalır, sonuç negatif' : 'çift: negatif çarpanlar ikişer eşleşir, sonuç pozitif'}.`;
    return { kind: 'temel-isaret', ...v, powers, value, signs: powers.map(sign), equation: `${power(v.base, v.n)} = ${show(value)}`, observation };
  }
  if (id === 'temel-ardisik') {
    const terms = Array.from({ length: v.n }, (_, i) => v.a + i * v.r);
    const last = terms[v.n - 1];
    const pair = v.a + last;
    const sum = (pair * v.n) / 2;
    return { kind: 'temel-ardisik', ...v, terms, last, pair, sum,
      equation: `Terim sayısı (${last} − ${v.a}) ÷ ${v.r} + 1 = ${v.n} · Toplam ${v.n} × ${pair} ÷ 2 = ${sum}`,
      observation: `Alt alta gelen her sütun ${v.a} + ${last} = ${pair} eder; ${v.n} sütun ${v.n * pair} verir. Diziyi iki kez yazdığımız için ikiye böleriz: ${sum}. Ortalama terim ${show(pair / 2)}.` };
  }
  if (id === 'temel-ucdeger') {
    const y = 12 - v.x;
    const products = Array.from({ length: 11 }, (_, i) => (i + 1) * (11 - i));
    const area = v.x * y;
    return { kind: 'temel-ucdeger', ...v, y, area, products,
      equation: `${v.x} × ${y} = ${area} · en büyük 6 × 6 = 36`,
      observation: area === 36
        ? 'Kenarlar eşit: dikdörtgen kare oldu ve çarpım en büyük değerine, 36’ya ulaştı.'
        : `Kenarlar arasındaki fark ${Math.abs(v.x - y)}. Çarpım ${area}; 36’dan ${36 - area} eksik. Bu eksiklik (x − 6)² = ${(v.x - 6) ** 2} kadardır: sayılar ortadan uzaklaştıkça çarpım küçülür.` };
  }
  return null;
}
