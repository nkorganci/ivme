// EBOB–EKOK: bölüm keşifleri. Özgün öğretim örnekleri; sınav sorusu değildir.
import { power } from './yardim.js';

export const factor = (n) => {
  const out = [];
  let x = n;
  for (let p = 2; p * p <= x; p++) while (x % p === 0) { out.push(p); x /= p; }
  if (x > 1) out.push(x);
  return out;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const powers = (list) => {
  const counts = {};
  list.forEach((p) => { counts[p] = (counts[p] ?? 0) + 1; });
  return Object.entries(counts).map(([p, e]) => power(Number(p), e).replace(/¹$/, '')).join(' · ') || '1';
};
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const SHAPES = [[24, 18], [30, 12], [20, 15]];

export const explorations = {
  'ebob-bolen': {
    lessonId: 'ebob-ekok',
    title: 'Bölenler çiftler hâlinde gelir',
    story: '36 fideyi dikdörtgen bir tarhta eşit sıralara dikmek istiyorsun. 4 sıra yaparsan her sırada 9 fide, 6 sıra yaparsan 6 fide olur. Her düzen iki böleni birlikte kullanır: sıra sayısı × sıradaki fide = 36. Bölenleri çiftler hâlinde aramak hiçbirini atlamamayı sağlar.',
    terms: [['Bölen', '$n$’yi kalansız bölen pozitif tam sayı: 36 için 4 bir bölendir, çünkü $36=4\\cdot9$.'], ['Bölen çifti', 'Çarpımı $n$ olan iki bölen: $(4,9)$.'], ['Asal sayı', '1’den büyük ve yalnız 1’e ve kendisine bölünen sayı: 2, 3, 5, 7, 11, …']],
    experiment: 'Sayıyı değiştir ve bölen çiftlerini incele. Hangi sayılarda bir çiftin iki elemanı aynı çıkıyor? O sayıların bölen sayısı neden tek?',
    example: '36’nın bütün pozitif bölenlerini çiftler hâlinde yazalım ve sayısını formülle doğrulayalım.',
    steps: [
      ['Küçük bölenden başla', '$1\\cdot36$, $2\\cdot18$, $3\\cdot12$, $4\\cdot9$, $6\\cdot6$. 5 bölmediği için atlandı.'],
      ['Nerede duracağını bil', '$6\\cdot6=36$: kareköke ulaştık. Bundan sonraki çiftler öncekilerin tersidir ($9\\cdot4$ gibi).'],
      ['Formülle karşılaştır', '$36=2^2\\cdot3^2$; bölen sayısı $(2+1)(2+1)=9$. Çiftlerden: 4 çift (8 bölen) + 6 = 9 bölen.'],
    ],
    tip: 'Bölenleri $\\sqrt{n}$’e kadar ara: her küçük bölen bir büyük bölenle eşleşir. Bölen sayısı için $n=p^a q^b\\cdots$ yaz ve $(a+1)(b+1)\\cdots$ hesapla.',
    trap: 'Tam kare sayılarda kareköklü çift tek bölen verir; bölen sayısı tektir. 1 asal değildir; en küçük asal 2’dir ve tek çift asal da odur.',
    transfer: ['48’in kaç pozitif böleni vardır?', '10', '8', '$48=2^4\\cdot3$; $(4+1)(1+1)=10$. Çiftler: 1·48, 2·24, 3·16, 4·12, 6·8.'],
    expert: 'Bir sayının asal olup olmadığını anlamak için $\\sqrt{n}$’e kadar olan asallarla bölmeyi denemek yeter: 221 için 2, 3, 5, 7, 11, 13 denenir ve $221=13\\cdot17$ bulunur. $\\sqrt{n}$’den büyük bir bölen varsa onun çifti $\\sqrt{n}$’den küçüktür ve zaten denenmiştir.',
  },
  'ebob-venn': {
    lessonId: 'ebob-ekok',
    title: 'Asal çarpanların ortak bölgesi: EBOB ve EKOK',
    story: 'İki sayının asal çarpanlarını iki torbaya koy. Ortak olan çarpanlar iki torbanın kesişimine gider. Kesişimdeki çarpanların çarpımı iki sayıyı da böler; bu EBOB’dur. Bütün çarpanların (ortakları bir kez sayarak) çarpımı ise iki sayının da katıdır; bu EKOK’tur.',
    terms: [['EBOB', 'En büyük ortak bölen: iki sayıyı da tam bölen en büyük sayı.'], ['EKOK', 'En küçük ortak kat: iki sayının da katı olan en küçük pozitif sayı.'], ['Asal çarpanlara ayırma', '$24=2\\cdot2\\cdot2\\cdot3=2^3\\cdot3$.']],
    experiment: 'İki sayıyı seç. Ortak bölgeye düşen asal çarpanları ve iki yandakileri izle. Ortak bölge boş kalınca EBOB ve EKOK ne oluyor? Alt satırdaki çarpım eşitliği her seçimde neden doğru?',
    example: '24 ile 36’nın EBOB ve EKOK’unu asal çarpanlarla bulalım.',
    steps: [
      ['Ayır', '$24=2\\cdot2\\cdot2\\cdot3$, $36=2\\cdot2\\cdot3\\cdot3$.'],
      ['Ortak olanları eşleştir', 'İki 2 ve bir 3 ikisinde de var: EBOB $=2\\cdot2\\cdot3=12$.'],
      ['Hepsini bir kez topla', 'Ortaklar + yalnız 24’te olan bir 2 + yalnız 36’da olan bir 3: EKOK $=12\\cdot2\\cdot3=72$. Kontrol: $24\\cdot36=864=12\\cdot72$.'],
    ],
    tip: 'EBOB: ortak asalların küçük üsleri; EKOK: bütün asalların büyük üsleri. İki sayı için $a\\cdot b=\\text{EBOB}\\cdot\\text{EKOK}$.',
    trap: 'EKOK, çarpım değildir: ortak çarpanlar bir kez sayılır. Çarpım eşitliği iki sayı için geçerlidir; üç sayıda $a\\cdot b\\cdot c$ ile EBOB·EKOK genellikle eşit değildir.',
    transfer: ['EBOB(18, 30) kaçtır?', '6', '3', '$18=2\\cdot3^2$, $30=2\\cdot3\\cdot5$; ortak: 2 ve bir 3. EBOB $=6$.'],
    expert: 'Venn bölgeleriyle düşününce $a=\\text{EBOB}\\cdot m$, $b=\\text{EBOB}\\cdot n$ ve $m$, $n$ aralarında asal olur; EKOK $=\\text{EBOB}\\cdot m\\cdot n$. Bu gösterim “EBOB’u ve toplamı/EKOK’u bilinen iki sayı” sorularını tek değişkenli sayıma indirir.',
  },
  'ebob-kare': {
    lessonId: 'ebob-ekok',
    title: 'Dikdörtgeni eş karelerle döşemek',
    story: 'Bir duvarı kesilmemiş kare fayanslarla döşeyeceksin. Fayansın kenarı hem duvarın enini hem boyunu tam bölmeli; yoksa kenarda kesik bir şerit kalır. En az fayans için bu ortak bölenlerin en büyüğünü, yani EBOB’u seçeriz.',
    terms: [['Ortak bölen', 'İki sayıyı da tam bölen sayı.'], ['Döşeme', 'Bir yüzeyi boşluk ve taşma olmadan eş parçalarla kaplamak.'], ['Fayans sayısı', '$\\frac{\\text{en}}{s}\\cdot\\frac{\\text{boy}}{s}$; $s$ fayans kenarı.']],
    experiment: 'Duvarı seç ve fayans kenarını değiştir. Hangi kenarlarda kesik şerit kalmıyor? Uygun kenarlar arasında en büyüğünü seçince fayans sayısı ne oluyor?',
    example: '24 × 18 bir duvar en büyük eş karelerle döşenirse kaç fayans gerekir?',
    steps: [
      ['Ortak bölenleri bul', '24’ün ve 18’in ortak bölenleri 1, 2, 3, 6.'],
      ['En büyüğünü seç', 'EBOB(24, 18) = 6. Kenarı 6 olan fayans iki yönde de tam sığar.'],
      ['Say', 'Bir yönde $24:6=4$, diğer yönde $18:6=3$ fayans: $4\\cdot3=12$.'],
    ],
    tip: '“Eş, en büyük, kesilmeden” sözleri EBOB’u gösterir. Parça sayısı alanda çarpılır; uzunlukta toplanır.',
    trap: 'Kenar 4 seçilirse 24 tam bölünür ama 18 bölünmez: kenarda 2 birimlik kesik şerit kalır. Tek yönde uymak yetmez.',
    transfer: ['30 × 12 bir duvar en büyük eş karelerle döşenirse kaç fayans gerekir?', '10', '6', 'EBOB(30, 12) = 6; $5\\cdot2=10$ fayans.'],
    expert: 'Üç boyutta da aynı: $a\\times b\\times c$ bir prizma en büyük eş küplere EBOB(a, b, c) kenarla bölünür. Fayans sayısını azaltmak kenarı büyütmektir; en büyük ortak bölen bu yüzden en az parçayı verir.',
  },
  'ekok-zil': {
    lessonId: 'ebob-ekok',
    title: 'İki zil ne zaman birlikte çalar?',
    story: 'Bir okulda bir zil 4 dakikada, diğeri 6 dakikada bir çalıyor. İkisi saat tam 9’da birlikte çaldı. Bir sonraki ortak çalma, iki aralığın da katı olan ilk andır. Zaman çizgisinde iki zilin işaretlerinin üst üste geldiği yerleri ara.',
    terms: [['Kat', 'Bir sayının tam sayı katları: 4 için 4, 8, 12, …'], ['Ortak kat', 'İki sayının da katı olan sayı: 4 ve 6 için 12, 24, …'], ['EKOK', 'Ortak katların en küçüğü.']],
    experiment: 'İki zilin aralığını değiştir. Ortak çalmalar arasındaki süre neden hep aynı? Aralıklar aralarında asal olunca ortak çalma ne kadar seyrekleşiyor?',
    example: '4 ve 6 dakikada bir çalan iki zil 9.00’da birlikte çaldı. 10.00’a kadar (dahil) kaç kez birlikte çalarlar?',
    steps: [
      ['Ortak periyodu bul', 'EKOK(4, 6) = 12 dakika.'],
      ['Ortak anları yaz', '9.00, 9.12, 9.24, 9.36, 9.48, 10.00.'],
      ['Say', '60 dakikada $60:12=5$ aralık; başlangıç da sayılınca 6 kez.'],
    ],
    tip: '“Aynı anda”, “birlikte”, “yeniden karşılaşma” EKOK’u gösterir. Bir aralıkta kaç kez sorulursa aralık sayısına başlangıcı eklemeyi unutma.',
    trap: 'İki aralığı çarpmak bir ortak kat verir ama en küçüğü olmayabilir: $4\\cdot6=24$, ama 12’de de birlikte çalarlar.',
    transfer: ['6 ve 8 dakikada bir çalan iki zil birlikte çaldıktan kaç dakika sonra yeniden birlikte çalar?', '24', '48', 'EKOK(6, 8) = 24. $6\\cdot8=48$ de ortak kattır ama ilki değildir.'],
    expert: 'İki periyot aralarında asalsa EKOK çarpımdır ve ortak olaylar en seyrek hâlini alır. Bu yüzden düzenli tekrarları çakıştırmamak istenen yerlerde (çark dişleri, sinyaller) aralarında asal sayılar seçilir.',
  },
  'ebob-takvim': {
    lessonId: 'ebob-ekok',
    title: 'Haftanın günü: 7’lik döngüde kalan',
    story: 'Bugün hangi gün olursa olsun, 7 gün sonra yine aynı gündür. Bu yüzden 100 gün sonrasını bulmak için 100 günü saymaya gerek yok; tam haftaları atıp kalan günleri saymak yeter.',
    terms: [['Periyot', 'Bir olayın tekrar ettiği aralık: hafta için 7 gün.'], ['Kalan', '$n=7q+r$ yazınca $r$; $0\\leq r<7$.'], ['n. kez', 'İlk olay başlangıçtır; $n$. olaya kadar $n-1$ aralık geçer.']],
    experiment: 'Başlangıç gününü seç ve gün sayısını artır. Gün sayısı 7’nin katı olunca ne oluyor? Kalan ile kaç gün ileri gidildiği arasındaki ilişkiyi izle.',
    example: 'Bugün salı. 100 gün sonra hangi gün olur?',
    steps: [
      ['Tam haftaları ayır', '$100=7\\cdot14+2$: 14 tam hafta günü değiştirmez.'],
      ['Kalanı ilerle', 'Salıdan 2 gün sonra perşembe.'],
      ['Kontrol', '98 gün sonra yine salı (7’nin katı); 99 çarşamba, 100 perşembe.'],
    ],
    tip: 'Geçen süreyi periyoda böl, yalnız kalana bak. “$n$. kez” deniyorsa $n-1$ periyot geçtiğini unutma.',
    trap: 'Bugünü saymak hatası: “100 gün sonra” bugünden itibaren 100 adımdır; bugünü 1. gün sayan sonucu bir gün kaydırır.',
    transfer: ['Bugün cuma. 45 gün sonra hangi gün olur?', 'Pazartesi', 'Pazar', '$45=7\\cdot6+3$; cumadan 3 gün sonra: cumartesi, pazar, pazartesi.'],
    expert: 'Aynı fikir her döngüde çalışır: saatte periyot 12 ya da 24, son rakamlarda 4. İki farklı döngü birlikte izleniyorsa ortak periyot EKOK’tur: 6 günde bir yapılan bir iş, 7×6/EBOB(6,7)=42 günde bir aynı gün ve aynı haftanın gününe denk gelir.',
  },
};

const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
const pick = (key, label, value, list) => ({ key, label, value, options: list.map((n) => [n, String(n)]) });
export const controls = {
  'ebob-bolen': [pick('n', 'Sayı', 36, [12, 16, 18, 24, 30, 36, 48, 60, 64, 100])],
  'ebob-venn': [pick('a', 'Birinci sayı', 24, [12, 18, 24, 36, 40, 45, 60, 72, 90]), pick('b', 'İkinci sayı', 36, [12, 18, 24, 35, 36, 40, 45, 60, 90])],
  'ebob-kare': [{ key: 'shape', label: 'Duvar (en × boy)', value: 0, options: SHAPES.map(([w, h], i) => [i, `${w} × ${h}`]) }, range('s', 'Fayans kenarı', 4, 1, 10)],
  'ekok-zil': [range('a', '1. zil (dakika)', 4, 2, 9), range('b', '2. zil (dakika)', 6, 2, 9)],
  'ebob-takvim': [{ key: 'start', label: 'Başlangıç günü', value: 1, options: DAYS.map((d, i) => [i, d]) }, range('n', 'Kaç gün sonra?', 100, 0, 100)],
};

export function model(id, v) {
  if (id === 'ebob-bolen') {
    const divisors = Array.from({ length: v.n }, (_, i) => i + 1).filter((d) => v.n % d === 0);
    const pairs = divisors.filter((d) => d * d <= v.n).map((d) => [d, v.n / d]);
    const square = pairs.some(([a, b]) => a === b);
    return { kind: 'ebob-bolen', ...v, divisors, pairs, square, count: divisors.length, factorText: powers(factor(v.n)),
      equation: `${v.n} = ${powers(factor(v.n))}; ${divisors.length} pozitif bölen`,
      observation: square
        ? `${v.n} bir tam kare: ${Math.sqrt(v.n)} × ${Math.sqrt(v.n)} çifti tek bölen verir. Bu yüzden bölen sayısı tek: ${divisors.length}.`
        : `Her bölen bir eşiyle gelir: ${pairs.length} çift, ${divisors.length} bölen. Çiftleri aramayı karekök civarında (${Math.floor(Math.sqrt(v.n))}) bitirmek yeter.` };
  }
  if (id === 'ebob-venn') {
    const fa = factor(v.a), fb = factor(v.b);
    const common = [];
    const restB = [...fb];
    const onlyA = [];
    fa.forEach((p) => { const i = restB.indexOf(p); if (i >= 0) { common.push(p); restB.splice(i, 1); } else onlyA.push(p); });
    const prod = (list) => list.reduce((x, y) => x * y, 1);
    const ebob = prod(common), ekok = ebob * prod(onlyA) * prod(restB);
    return { kind: 'ebob-venn', ...v, onlyA, common, onlyB: restB, ebob, ekok,
      equation: `EBOB = ${ebob}; EKOK = ${ekok}; ${v.a} × ${v.b} = ${v.a * v.b} = ${ebob} × ${ekok}`,
      observation: common.length
        ? `Ortak çarpanlar ${common.join(' · ')}: EBOB ${ebob}. EKOK, ortakları bir kez sayıp kalan bütün çarpanları ekler: ${ekok}. Ortakları iki kez sayan çarpım ${v.a * v.b} ise EBOB × EKOK’a eşittir.`
        : `Ortak asal çarpan yok: sayılar aralarında asal. EBOB 1, EKOK çarpıma eşit: ${ekok}.` };
  }
  if (id === 'ebob-kare') {
    const [w, h] = SHAPES[v.shape];
    const fits = w % v.s === 0 && h % v.s === 0;
    const g = gcd(w, h);
    return { kind: 'ebob-kare', ...v, w, h, fits, g, tiles: fits ? (w / v.s) * (h / v.s) : 0,
      equation: fits ? `${w / v.s} × ${h / v.s} = ${(w / v.s) * (h / v.s)} fayans; EBOB(${w}, ${h}) = ${g}` : `Kenar ${v.s}: ${w % v.s ? `${w}’de ${w % v.s}` : ''}${w % v.s && h % v.s ? ', ' : ''}${h % v.s ? `${h}’de ${h % v.s}` : ''} birim artıyor`,
      observation: fits
        ? (v.s === g ? `Kenar ${v.s}, ortak bölenlerin en büyüğü: en az fayans bu kenarla kullanılır.` : `Kenar ${v.s} iki boyutu da böler; ama ${g} daha büyük bir ortak bölen. Daha büyük fayansla daha az parça yeter.`)
        : `Kenar ${v.s} ortak bölen değil; kesik şerit kalır. Ortak bölenler: ${Array.from({ length: g }, (_, i) => i + 1).filter((d) => g % d === 0).join(', ')}.` };
  }
  if (id === 'ekok-zil') {
    const l = (v.a * v.b) / gcd(v.a, v.b);
    const T = l <= 36 ? 2 * l : l;
    const ringsA = Array.from({ length: Math.floor(T / v.a) + 1 }, (_, i) => i * v.a);
    const ringsB = Array.from({ length: Math.floor(T / v.b) + 1 }, (_, i) => i * v.b);
    const together = ringsA.filter((t) => t % v.b === 0);
    return { kind: 'ekok-zil', ...v, l, T, ringsA, ringsB, together,
      equation: `EKOK(${v.a}, ${v.b}) = ${l} dakika; birlikte: ${together.join(', ')}`,
      observation: gcd(v.a, v.b) === 1
        ? `${v.a} ve ${v.b} aralarında asal: EKOK çarpıma eşit (${l}). Ortak çalmalar en seyrek hâlinde.`
        : `Ortak bölenleri ${gcd(v.a, v.b)}; bu yüzden EKOK çarpımdan küçük: ${v.a} × ${v.b} ÷ ${gcd(v.a, v.b)} = ${l}.` };
  }
  if (id === 'ebob-takvim') {
    const q = Math.floor(v.n / 7), r = v.n % 7;
    const end = (v.start + v.n) % 7;
    return { kind: 'ebob-takvim', ...v, q, r, end, days: DAYS,
      equation: `${v.n} = 7 × ${q} + ${r} → ${DAYS[end]}`,
      observation: r === 0 ? `${v.n}, 7’nin katı: ${q} tam hafta geçti, gün değişmedi (${DAYS[end]}).` : `${q} tam hafta günü değiştirmez; kalan ${r} gün ${DAYS[v.start]} gününden ${DAYS[end]} gününe götürür.` };
  }
  return null;
}
