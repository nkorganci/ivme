// Eşitsizlikler: bölüm keşifleri. Özgün öğretim örnekleri; sınav sorusu değildir.
import { show } from './yardim.js';

export const OPS = [
  ['a + b', (a, b) => a + b],
  ['a − b', (a, b) => a - b],
  ['a · b', (a, b) => a * b],
  ['2a − 3b', (a, b) => 2 * a - 3 * b],
];
const INTS = Array.from({ length: 13 }, (_, i) => i - 6);
const inA = (x, v) => v.p <= x && x < v.q; // A = [p, q)
const inB = (x, v) => v.r < x && x <= v.s; // B = (r, s]
const list = (xs) => (xs.length ? xs.map(show).join(', ') : 'yok');

export const explorations = {
  'esitsizlik-ayna': {
    lessonId: 'esitsizlikler',
    title: 'Negatif sayıyla çarpmak sayı doğrusunu aynalar',
    story: 'İki arkadaşın borç–alacak durumu: Ali 2 lira alacaklı, Can 5 lira alacaklı; Can daha zengin. İkisinin durumu tersine dönse (alacak borca dönüşse) Ali 2 lira, Can 5 lira borçlu olur; şimdi Ali daha iyi durumda. −1 ile çarpmak sırayı ters çevirdi.',
    terms: [['Eşitsizlik', 'İki ifadenin hangisinin büyük olduğunu söyleyen bağıntı: $a<b$.'], ['Yön', '$<$ ya da $>$ işaretinin gösterdiği taraf.'], ['Aynalama', '$-1$ ile çarpmak her sayıyı 0’a göre simetriğine taşır.']],
    experiment: 'İki sayıyı ve çarpanı seç. Çarpan pozitifken iki sayının sırası korunuyor mu? Çarpanı negatif yapınca oklar neden çaprazlanıyor? Çarpan 0 olunca ne oluyor?',
    example: '$-3x<12$ eşitsizliğini çözelim.',
    steps: [
      ['Bölünecek sayıya bak', '$x$’i yalnız bırakmak için $-3$’e böleceğiz; bölen negatif.'],
      ['Yönü çevir', 'Negatif sayıya bölmek sırayı ters çevirir: $x>-4$.'],
      ['Bir sayıyla dene', '$x=0$: $0<12$ doğru ve $0>-4$ doğru. $x=-5$: $15<12$ yanlış; $-5>-4$ de yanlış. Sonuç tutarlı.'],
    ],
    tip: 'Pozitif sayıyla çarpma/bölme yönü korur; negatif sayıyla çarpma/bölme yönü çevirir. Toplama ve çıkarma hiçbir zaman yönü değiştirmez.',
    trap: 'İşareti bilinmeyen bir harfle ($a$, $x$) çarpıp bölmek: yön değişip değişmeyeceği belli değildir. Önce harfin işaretini bul.',
    transfer: ['$-2x\\geq8$ ise $x$ hangi aralıktadır?', '$x\\leq-4$', '$x\\geq-4$', '$-2$’ye bölünce yön değişir: $x\\leq-4$. Deneme: $x=-5$ için $10\\geq8$ doğru.'],
    expert: 'Çarpma bir fonksiyon gibi düşünülebilir: $f(x)=kx$, $k>0$ iken artan, $k<0$ iken azalandır. Azalan bir fonksiyonu iki tarafa uygulamak eşitsizliği ters çevirir. Ters alma ($\\frac{1}{x}$) aynı işaretli sayılarda azalan olduğu için o da yönü çevirir.',
  },
  'esitsizlik-aralik': {
    lessonId: 'esitsizlikler',
    title: 'Aralıklarla kesişim, birleşim ve fark',
    story: 'Bir kütüphane sabah 9’dan (dahil) öğlen 14’e (hariç) kadar açık; bir arkadaşın 11’den sonra (hariç) 17’ye kadar (dahil) boş. Buluşabileceğiniz saatler iki aralığın kesişimidir; uçların dahil olup olmadığı da kesişime taşınır.',
    terms: [['$[p, q)$', '$p\\leq x<q$: $p$ dahil, $q$ hariç.'], ['Kesişim ($\\cap$)', 'İki aralıkta birden olan sayılar: “ve”.'], ['Birleşim ($\\cup$)', 'En az birinde olan sayılar: “veya”.']],
    experiment: 'A ve B aralıklarının uçlarını değiştir. Kesişimin uçları hangi aralıktan geliyor ve dahil mi? Aralıklar ayrılınca kesişim ve birleşim ne oluyor?',
    example: '$A=[-3,2)$ ve $B=(0,4]$ için $A\\cap B$ ve $A\\setminus B$’yi bulalım.',
    steps: [
      ['Aynı doğruya çiz', '$A$ $-3$’ten 2’ye, $B$ 0’dan 4’e. Ortak kısım 0 ile 2 arası.'],
      ['Uçları taşı', '0, $B$’de hariç; 2, $A$’da hariç: $A\\cap B=(0,2)$.'],
      ['Farkı bul', '$A$’dan $B$’yi atınca $-3$ ile 0 arası kalır; 0, $B$’de olmadığı için $A$’da kalır: $A\\setminus B=[-3,0]$.'],
    ],
    tip: 'Kesişimde her uç, o ucu belirleyen aralıktaki durumunu korur. Farkta $B$’nin hariç tuttuğu uç $A$’da kalır; $B$’nin dahil ettiği uç gider.',
    trap: 'Tam sayı sayarken açık uçları saymak: $(0,2)$ aralığında yalnız 1 vardır.',
    transfer: ['$A=[1,5)$ ve $B=(3,7]$ için $A\\cap B$ kaç tam sayı içerir?', '1', '2', '$A\\cap B=(3,5)$; yalnız 4. 3 $B$’de, 5 $A$’da hariç.'],
    expert: 'Aralık işlemleri küme işlemlerinin sayı doğrusundaki hâlidir: “ve” kesişim, “veya” birleşim, “değil” tümleyendir. De Morgan kuralı burada da çalışır: $(A\\cap B)’=A’\\cup B’$.',
  },
  'esitsizlik-ifade': {
    lessonId: 'esitsizlikler',
    title: 'İfadenin aralığı: dört köşeyi dene',
    story: 'Bir ürünün maliyeti 2 ile 4 lira, satış fiyatı 5 ile 7 lira arasında. Kâr en az ne olur? En pahalıya mal edip en ucuza satınca: $5-4=1$. En çok? En ucuza mal edip en pahalıya satınca: $7-2=5$. Her değişkenin ifadeyi büyütüp büyütmediğini düşünmek uçları doğru seçtirir.',
    terms: [['Alt sınır', 'İfadenin alabileceği en küçük değer (ya da yaklaştığı değer).'], ['Üst sınır', 'İfadenin alabileceği en büyük değer.'], ['Köşe', 'Değişkenlerin uç değerlerinin bir kombinasyonu: $(a_{\\min},b_{\\max})$ gibi.']],
    experiment: '$a$ ve $b$’nin aralıklarını ve ifadeyi seç. Dört köşedeki değerlerden hangisi en küçük, hangisi en büyük? Çıkarmada ve çarpımda kazanan köşe neden değişiyor?',
    example: '$-2\\leq a\\leq1$ ve $-3\\leq b\\leq2$ için $a\\cdot b$’nin aralığını bulalım.',
    steps: [
      ['Dört köşeyi yaz', '$(-2)(-3)=6$, $(-2)(2)=-4$, $1\\cdot(-3)=-3$, $1\\cdot2=2$.'],
      ['En küçük ve en büyüğü seç', 'En küçük $-4$, en büyük 6.'],
      ['Aralığı yaz', '$-4\\leq ab\\leq6$. İşaretler karışıkken uçları tek tek eşleştirmek ($-2\\cdot-3$ ve $1\\cdot2$) yanlış sonuç verir.'],
    ],
    tip: 'İki bağımsız değişkenin toplam, fark ya da çarpımı en küçük ve en büyük değerini köşelerde alır. Dört köşeyi hesaplamak her durumda güvenlidir.',
    trap: 'Değişkenler birbirine bağlıysa ($a+b=6$ gibi) köşeler gerçekten oluşmayabilir; önce bir değişkeni öbürü cinsinden yaz.',
    transfer: ['$1\\leq a\\leq3$ ve $2\\leq b\\leq5$ ise $a-b$ en küçük kaçtır?', '$-4$', '$-1$', '$a$ en küçük, $b$ en büyük: $1-5=-4$. Uçları sırayla çıkarmak ($1-2=-1$) yanlış.'],
    expert: 'Köşe kuralının nedeni: $a+b$, $a-b$, $2a-3b$ her değişkende doğrusal; $ab$ ise $a$ sabitken $b$’de, $b$ sabitken $a$’da doğrusaldır. Doğrusal bir ifade bir aralıkta en uç değerlerini uçlarda alır. $a^2$ ya da $a(6-a)$ gibi ifadelerde bu kural tek başına yetmez.',
  },
  'esitsizlik-bolge': {
    lessonId: 'esitsizlikler',
    title: 'Doğrunun bir tarafı: tam sayılı noktaları saymak',
    story: 'Defteri 20, kalemi 10 lira olan bir kırtasiyede 100 lirayı aşmadan alışveriş yapacaksın. Her (defter, kalem) seçimi düzlemde bir noktadır; bütçe doğrusu düzlemi ikiye böler. Doğrunun altındaki noktalar bütçeye uyan seçimlerdir.',
    terms: [['Yarı düzlem', '$ax+by<c$ eşitsizliğini sağlayan noktalar: doğrunun bir tarafı.'], ['Sınır doğrusu', '$ax+by=c$; eşitlik varsa düz, yoksa kesikli çizilir.'], ['Test noktası', 'Hangi tarafın çözüm olduğunu anlamak için denenen nokta, çoğu zaman $(0,0)$.']],
    experiment: 'Katsayıları, sınırı ve sayım kuralını değiştir. Kesin eşitsizlikte doğrunun üzerindeki noktalar neden sayılmıyor? “Pozitif” yerine “doğal sayı” seçince hangi noktalar ekleniyor?',
    example: '$x$, $y$ pozitif tam sayılar ve $2x+3y<14$ ise kaç ikili vardır?',
    steps: [
      ['Büyük katsayılıyı sabitle', '$y=1$: $2x<11$, $x=1..5$; $y=2$: $2x<8$, $x=1..3$.'],
      ['Devam et', '$y=3$: $2x<5$, $x=1,2$; $y=4$: $2x<2$, pozitif $x$ yok.'],
      ['Topla', '$5+3+2=10$ nokta; hepsi doğrunun altında.'],
    ],
    tip: 'Katsayısı büyük değişkeni sabitlemek durum sayısını azaltır. Her satırda kalan değişkenin en büyük değerini bulup say.',
    trap: '“Pozitif” 0’ı dışarıda bırakır, “doğal sayı” içerir; kesin eşitsizlik ($<$) doğrunun üzerindeki noktaları dışarıda bırakır.',
    transfer: ['$x$, $y$ pozitif tam sayılar ve $x+2y\\leq6$ ise kaç ikili vardır?', '6', '9', '$y=1$: $x\\leq4$ (4); $y=2$: $x\\leq2$ (2); toplam 6. Doğal sayılarda sonuç 16 olurdu.'],
    expert: 'Bu sayım, doğrusal programlamanın tam sayılı hâlidir: kısıtlar bir çokgen oluşturur, içindeki kafes noktaları olası seçimlerdir. “En çok kâr” gibi sorularda doğrusal bir ifade en büyük değerini çokgenin köşelerinde (ya da köşelere yakın kafes noktalarında) alır.',
  },
};

const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
export const controls = {
  'esitsizlik-ayna': [range('a', 'Birinci sayı (a)', 2, -5, 5), range('b', 'İkinci sayı (b)', 5, -5, 5), range('k', 'Çarpan (k)', -1, -3, 3)],
  'esitsizlik-aralik': [range('p', 'A = [p, q): p', -3, -6, 6), range('q', 'A = [p, q): q', 2, -6, 6), range('r', 'B = (r, s]: r', 0, -6, 6), range('s', 'B = (r, s]: s', 4, -6, 6)],
  'esitsizlik-ifade': [range('a1', 'a en az', -2, -4, 4), range('a2', 'a en çok', 1, -4, 4), range('b1', 'b en az', -3, -4, 4), range('b2', 'b en çok', 2, -4, 4), { key: 'op', label: 'İfade', value: 2, options: OPS.map(([name], i) => [i, name]) }],
  'esitsizlik-bolge': [range('a', 'x katsayısı', 2, 1, 4), range('b', 'y katsayısı', 3, 1, 4), range('c', 'Sınır (c)', 14, 4, 16), { key: 'strict', label: 'İşaret', value: 1, options: [[1, 'ax + by < c'], [0, 'ax + by ≤ c']] }, { key: 'zero', label: 'Sayılar', value: 0, options: [[0, 'Pozitif tam sayı'], [1, 'Doğal sayı (0 dahil)']] }],
};

export function model(id, v) {
  if (id === 'esitsizlik-ayna') {
    const ka = v.k * v.a, kb = v.k * v.b;
    const rel = (x, y) => (x < y ? '<' : x > y ? '>' : '=');
    const before = rel(v.a, v.b), after = rel(ka, kb);
    const flipped = before !== '=' && after !== '=' && before !== after;
    return { kind: 'esitsizlik-ayna', ...v, ka, kb, before, after, flipped,
      equation: `${show(v.a)} ${before} ${show(v.b)} → ${show(ka)} ${after} ${show(kb)}`,
      observation: v.k === 0 ? 'Çarpan 0: iki sayı da 0 oldu; sıra bilgisi tamamen kayboldu. Bu yüzden eşitsizlikte 0 ile çarpılmaz.'
        : before === '=' ? 'Sayılar eşit: hangi çarpanla çarpılırsa çarpılsın eşit kalırlar.'
        : flipped ? `Çarpan negatif (${show(v.k)}): sayılar 0’ın öbür tarafına geçti ve sıra ters döndü. Yön ${before}’den ${after}’ye değişti.`
        : `Çarpan pozitif (${show(v.k)}): sayılar aynı tarafta büyüdü ya da küçüldü; sıra korundu.` };
  }
  if (id === 'esitsizlik-aralik') {
    const both = INTS.filter((x) => inA(x, v) && inB(x, v));
    const either = INTS.filter((x) => inA(x, v) || inB(x, v));
    const onlyA = INTS.filter((x) => inA(x, v) && !inB(x, v));
    const emptyA = v.p >= v.q, emptyB = v.r >= v.s;
    const lo = Math.max(v.p, v.r), hi = Math.min(v.q, v.s);
    let cap = '∅';
    if (!emptyA && !emptyB && lo < hi) cap = `${v.p > v.r ? '[' : '('}${show(lo)}, ${show(hi)}${v.s < v.q ? ']' : ')'}`;
    else if (!emptyA && !emptyB && lo === hi && v.s === lo && v.p <= lo && lo < v.q && v.r < lo) cap = `{${show(lo)}}`;
    return { kind: 'esitsizlik-aralik', ...v, both, either, onlyA, emptyA, emptyB, cap,
      equation: `A ∩ B = ${cap}; tam sayılar: ∩ ${both.length}, ∪ ${either.length}, A∖B ${onlyA.length}`,
      observation: emptyA || emptyB ? `${emptyA ? 'A' : 'B'} boş: sol uç sağ uçtan küçük değil. Boş kümeyle kesişim boştur.`
        : cap === '∅' ? `Aralıklar ortak nokta taşımıyor. Birleşim iki ayrı parça; tam sayıları: ${list(either)}.`
        : `Kesişimin sol ucu ${v.p > v.r ? 'A’dan gelir ve dahil' : v.p < v.r ? 'B’den gelir ve hariç' : 'iki aralıkta da var ama B’de hariç; bu yüzden hariç'}; sağ ucu ${v.s < v.q ? 'B’den gelir ve dahil' : v.s > v.q ? 'A’dan gelir ve hariç' : 'A’da hariç olduğu için hariç'}. Ortak tam sayılar: ${list(both)}.` };
  }
  if (id === 'esitsizlik-ifade') {
    const [name, f] = OPS[v.op];
    const A = [Math.min(v.a1, v.a2), Math.max(v.a1, v.a2)], B = [Math.min(v.b1, v.b2), Math.max(v.b1, v.b2)];
    const corners = [[A[0], B[0]], [A[0], B[1]], [A[1], B[0]], [A[1], B[1]]].map(([a, b]) => ({ a, b, value: f(a, b) }));
    const values = corners.map((c) => c.value);
    const min = Math.min(...values), max = Math.max(...values);
    const minC = corners.find((c) => c.value === min), maxC = corners.find((c) => c.value === max);
    return { kind: 'esitsizlik-ifade', ...v, name, A, B, corners, min, max,
      equation: `${show(min)} ≤ ${name} ≤ ${show(max)}`,
      observation: `En küçük değer a = ${show(minC.a)}, b = ${show(minC.b)} köşesinde; en büyük a = ${show(maxC.a)}, b = ${show(maxC.b)} köşesinde. ${v.op === 1 ? 'Çıkarmada b’nin büyüğü sonucu küçültür; uçlar çapraz eşleşir.' : v.op === 2 ? 'Çarpımda işaretler karışınca kazanan köşe her seferinde değişebilir; dördünü de hesapla.' : v.op === 3 ? 'b’nin katsayısı negatif: b büyüdükçe ifade küçülür.' : 'Toplamda iki değişken de aynı yönde etki eder: küçük + küçük, büyük + büyük.'}` };
  }
  if (id === 'esitsizlik-bolge') {
    const start = v.zero ? 0 : 1;
    const points = [];
    for (let x = start; x <= 8; x++) for (let y = start; y <= 6; y++) {
      const t = v.a * x + v.b * y;
      if (v.strict ? t < v.c : t <= v.c) points.push([x, y]);
    }
    const rows = {};
    points.forEach(([, y]) => { rows[y] = (rows[y] ?? 0) + 1; });
    const counts = Object.entries(rows).sort((p, q) => Number(p[0]) - Number(q[0])).map(([y, n]) => `y=${y}: ${n}`);
    return { kind: 'esitsizlik-bolge', ...v, points, count: points.length,
      equation: `${v.a === 1 ? '' : v.a}x + ${v.b === 1 ? '' : v.b}y ${v.strict ? '<' : '≤'} ${v.c}: ${points.length} nokta`,
      observation: points.length ? `Satır satır: ${counts.join('; ')}. ${v.strict ? 'Doğrunun üzerindeki noktalar (eşitlik) sayılmadı.' : 'Doğrunun üzerindeki noktalar da sayıldı.'}${v.zero ? ' Eksenler üzerindeki (0’lı) noktalar da dahil.' : ''}` : 'Bu sınırla hiçbir nokta koşulu sağlamıyor: en küçük değer bile sınırı aşıyor.' };
  }
  return null;
}
