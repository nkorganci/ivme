// Rasyonel sayılar: bölüm keşifleri. Özgün öğretim örnekleri; sınav sorusu değildir.
import { sup } from './yardim.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a * b) / gcd(a, b);
const frac = (p, q) => {
  const g = gcd(p, q) || 1;
  return q / g === 1 ? String(p / g) : `${p / g}/${q / g}`;
};
const FRACS = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [5, 6]];
const DIVIDENDS = [[3, 4], [1, 1], [3, 2], [2, 1], [5, 2]];
const DIVISORS = [[1, 8], [1, 4], [3, 8], [1, 3], [1, 2], [3, 4]];
// Ondalık sayılar tam sayı × 10^(−e) biçiminde tutulur; kayan nokta hatası olmaz.
const DECIMALS = [[375, 2], [125, 3], [125, 1], [4, 2], [206, 2]];
const DENOMS = [3, 6, 7, 8, 9, 11, 12, 13, 14, 15, 22, 40];
const OVERLINE = '̅';

/** m · 10^(−e) sayısının Türkçe yazımı (virgüllü, binlik ayırıcısız). */
export const decimalText = (m, e) => {
  if (e <= 0) return String(m) + '0'.repeat(-e);
  const s = String(m).padStart(e + 1, '0');
  return `${s.slice(0, -e)},${s.slice(-e)}`;
};

/** a/n bölmesinin uzun bölme kayıtları: tam kısım, ondalık basamaklar, kalanlar ve devrin başladığı yer. */
export function longDivision(a, n) {
  const whole = Math.floor(a / n);
  let r = a % n;
  const digits = [];
  const remainders = [];
  const seen = new Map();
  while (r !== 0 && !seen.has(r)) {
    seen.set(r, digits.length);
    remainders.push(r);
    r *= 10;
    digits.push(Math.floor(r / n));
    r %= n;
  }
  return { whole, digits, remainders, start: r === 0 ? -1 : seen.get(r), repeatAt: r };
}

const onlyTwoFive = (n) => {
  let x = n;
  while (x % 2 === 0) x /= 2;
  while (x % 5 === 0) x /= 5;
  return x === 1;
};

export const explorations = {
  'rasyonel-ortakpayda': {
    lessonId: 'rasyonel-sayilar',
    title: 'Ortak payda: dilimleri aynı boya getirmek',
    story: 'İki arkadaş aynı boy iki çikolatadan pay aldı: biri yarısını, diğeri üçte birini. “Bir parça artı bir parça, iki parça” demek yanlıştır; parçaların boyu farklı. Çikolataları aynı boy küçük dilimlere ayırınca iki pay da dilim sayısıyla ölçülür ve toplanabilir.',
    terms: [['Payda', 'Bütünün kaç eş dilime ayrıldığı: dilimin boyunu söyler.'], ['Pay', 'Kaç dilim alındığı.'], ['Ortak payda', 'İki kesrin de dilimlerinin tam sığdığı dilim sayısı; en küçüğü paydaların EKOK’udur.']],
    experiment: 'İki kesri seç. Dilimler EKOK sayısına inince her kesrin kaç dilim olduğunu say. Payları ve paydaları ayrı ayrı toplamak hangi sonucu verirdi; o sonuç şekle uyuyor mu?',
    example: '$\\frac{1}{2}+\\frac{1}{3}$ toplamını dilimlerle bulalım.',
    steps: [
      ['Ortak dilimi bul', 'EKOK(2, 3) = 6: bütünü 6 eş dilime ayır. Yarım 3, üçte bir 2 dilimdir.'],
      ['Dilimleri say', '$\\frac{3}{6}+\\frac{2}{6}=\\frac{5}{6}$: aynı boy dilimler doğrudan toplanır.'],
      ['Akıl kontrolü yap', 'Sonuç yarımdan büyük ve bütünden küçük olmalı; $\\frac{5}{6}$ uyar. $\\frac{2}{5}$ ise yarımdan küçük: imkânsız.'],
    ],
    tip: 'Toplama ve çıkarmada paydaları EKOK’ta eşitle, payları topla, paydayı koru. Sonuç kesirlerin her birinden büyük olmalı (toplamada).',
    trap: '$\\frac{a}{b}+\\frac{c}{d}\\neq\\frac{a+c}{b+d}$. Bu “ara kesir” iki kesrin arasında kalır; toplam değildir.',
    transfer: ['$\\frac{3}{4}-\\frac{1}{6}$ kaçtır?', '$\\frac{7}{12}$', '$\\frac{2}{2}$', 'EKOK(4, 6) = 12: $\\frac{9}{12}-\\frac{2}{12}=\\frac{7}{12}$. Payları ve paydaları ayrı çıkarmak $\\frac{2}{-2}$ gibi anlamsız bir şey verir.'],
    expert: 'Paydaların çarpımı da ortak paydadır; ama sayılar gereksiz büyür ve sonunda sadeleştirmek gerekir. EKOK, iki kesrin de tam oturduğu en iri dilimi verir; hesap en küçük sayılarla yapılır.',
  },
  'rasyonel-bolme': {
    lessonId: 'rasyonel-sayilar',
    title: 'Kesirle bölme: içine kaç tane sığar?',
    story: '$\\frac{3}{4}$ litre ayranı $\\frac{1}{8}$ litrelik bardaklara dolduracaksın. Soru “$\\frac{3}{4}$’ün içinde kaç tane $\\frac{1}{8}$ var?” sorusudur; bu bir bölmedir. Sayı doğrusunda bardakları art arda dizince cevap gözle sayılır.',
    terms: [['Bölünen', 'Paylaştırılan miktar: $\\frac{3}{4}$ litre.'], ['Bölen', 'Bir parçanın büyüklüğü: $\\frac{1}{8}$ litre.'], ['Ters kesir', '$\\frac{c}{d}$’nin tersi $\\frac{d}{c}$; çarpımları 1.']],
    experiment: 'Bölüneni ve böleni değiştir. Bölen 1’den küçükken sonuç neden bölünenden büyük çıkıyor? Parça tam sığmadığında son parçanın ne kadarı doluyor?',
    example: '$\\frac{3}{4}:\\frac{1}{8}$ işlemini sayı doğrusunda yapalım.',
    steps: [
      ['Parçaları diz', '$\\frac{1}{8}$’lik parçaları 0’dan başlayarak art arda koy: $\\frac{1}{8}$, $\\frac{2}{8}$, … $\\frac{6}{8}$.'],
      ['Say', '$\\frac{6}{8}=\\frac{3}{4}$: tam 6 parça sığdı.'],
      ['Kuralla karşılaştır', '$\\frac{3}{4}\\cdot\\frac{8}{1}=6$. Bölenin tersiyle çarpmak, 1’in içinde 8 parça olduğunu kullanır.'],
    ],
    tip: '“İçinde kaç tane var, kaç parçaya yeter” sözleri bölmedir. Bölmede yalnız bölen ters çevrilir: $\\frac{a}{b}:\\frac{c}{d}=\\frac{a}{b}\\cdot\\frac{d}{c}$.',
    trap: 'Bölmenin her zaman küçülttüğü düşüncesi yanlıştır: 1’den küçük bir sayıya bölmek sonucu büyütür. $2:\\frac{1}{2}=4$.',
    transfer: ['$2:\\frac{3}{4}$ kaçtır?', '$\\frac{8}{3}$', '$\\frac{3}{2}$', '$2\\cdot\\frac{4}{3}=\\frac{8}{3}$: iki tam parça ($\\frac{6}{4}$) ve bir parçanın üçte ikisi ($\\frac{2}{4}$).'],
    expert: 'Bölme, çarpmanın tersidir: $\\frac{a}{b}:\\frac{c}{d}=x$ demek $x\\cdot\\frac{c}{d}=\\frac{a}{b}$ demektir. İki tarafı $\\frac{d}{c}$ ile çarpınca $x=\\frac{a}{b}\\cdot\\frac{d}{c}$ bulunur; “ters çevir ve çarp” kuralı buradan gelir.',
  },
  'rasyonel-virgul': {
    lessonId: 'rasyonel-sayilar',
    title: 'Virgül kaydırma: basamak tablosunda yer değiştirmek',
    story: 'Bir ürünün fiyatı 3,75 TL. 10 tanesi 37,5 TL, 100 tanesi 375 TL eder. Rakamlar aynı kaldı; yalnız basamak değerleri değişti. 10 ile çarpmak her rakamı bir basamak büyütür; virgül sabit dururken rakamlar sola kayar.',
    terms: [['Basamak değeri', 'Rakamın bulunduğu yerin değeri: 3,75’te 7, onda birler basamağındadır ($0{,}7$).'], ['$10^k$ ile çarpmak', '$k$ pozitifse virgül $k$ basamak sağa, negatifse sola kayar.'], ['Ondalık basamak', 'Virgülden sonraki basamak sayısı.']],
    experiment: 'Sayıyı seç ve kuvveti değiştir. Rakamların sırası değişiyor mu? Hangi durumda başa ya da sona sıfır eklemen gerekiyor?',
    example: '$0{,}04\\cdot1000$ ve $0{,}04:100$ işlemlerini basamak tablosunda yapalım.',
    steps: [
      ['Yerini bul', '0,04’te 4 rakamı yüzde birler basamağında: $4\\cdot10^{-2}$.'],
      ['1000 ile çarp', '$4\\cdot10^{-2}\\cdot10^{3}=4\\cdot10^{1}=40$: rakam üç basamak büyüdü.'],
      ['100’e böl', '$4\\cdot10^{-2}\\cdot10^{-2}=4\\cdot10^{-4}=0{,}0004$: iki basamak küçüldü; boş kalan basamaklara 0 yazıldı.'],
    ],
    tip: 'Çarpmada virgülleri yok say, sonra çarpanların ondalık basamak sayılarını topla. Bölmede pay ile paydayı aynı $10^k$ ile çarparak böleni virgülden kurtar.',
    trap: '0,04 ile 100’ü çarparken “iki sıfır ekle” deyip 0,0400 yazmak değeri değiştirmez; virgül kaydırılmalıdır: $0{,}04\\cdot100=4$.',
    transfer: ['$12{,}5:1000$ kaçtır?', '0,0125', '0,125', 'Virgül üç basamak sola kayar: 12,5 → 1,25 → 0,125 → 0,0125.'],
    expert: 'Bilimsel gösterim bu tablonun kısaltmasıdır: $0{,}000125=1{,}25\\cdot10^{-4}$. Çok küçük ve çok büyük sayılarla işlemde rakamları ve 10’un kuvvetlerini ayrı ayrı hesaplamak hata payını azaltır.',
  },
  'rasyonel-devirli': {
    lessonId: 'rasyonel-sayilar',
    title: 'Devirli ondalık: kalanlar neden tekrar eder?',
    story: '1’i 7’ye uzun bölmeyle bölünce her adımda bir kalan çıkar. Kalan 7’den küçük olmak zorunda olduğu için en çok 6 farklı kalan vardır; bir kalan ikinci kez görülünce bölme aynı adımları baştan yapar. Ondalık basamakların tekrar etmesinin nedeni budur.',
    terms: [['Uzun bölme', 'Kalanı 10 ile çarpıp tekrar bölerek ondalık basamakları tek tek bulmak.'], ['Sonlu ondalık', 'Bölme bir yerde 0 kalanla biter: $\\frac{3}{8}=0{,}375$.'], ['Devreden kısım', 'Tekrar eden basamak bloğu; üstüne çizgi çekilir: $\\frac{1}{6}=0{,}1\\overline{6}$.']],
    experiment: 'Payı ve paydayı değiştir. Kalanlar sırasını izle: hangi kalan tekrar edince devir başlıyor? Hangi paydalarda bölme 0 kalanla bitiyor; bu paydaların asal çarpanları nedir?',
    example: '$\\frac{1}{6}$’yı uzun bölmeyle ondalığa çevirelim.',
    steps: [
      ['İlk basamak', 'Kalan 1; $10:6=1$, kalan 4. İlk basamak 1.'],
      ['İkinci basamak', '$40:6=6$, kalan 4. Kalan 4 yeniden geldi.'],
      ['Devri yaz', 'Kalan 4 tekrar ettiği için 6 sonsuza kadar sürer: $0{,}1\\overline{6}$. Kontrol: $\\frac{16-1}{90}=\\frac{15}{90}=\\frac{1}{6}$.'],
    ],
    tip: 'Sadeleşmiş kesrin paydası yalnız 2 ve 5’ten oluşuyorsa ondalık sonludur; başka bir asal çarpan varsa devirlidir. Devir uzunluğu en çok payda − 1’dir.',
    trap: 'Paydada 3 görüp hemen “devirli” deme: önce sadeleştir. $\\frac{9}{30}=\\frac{3}{10}=0{,}3$ sonludur.',
    transfer: ['$\\frac{5}{12}$ sonlu mu, devirli mi?', 'Devirli', 'Sonlu', '$12=2^2\\cdot3$ ve kesir sadeleşmiyor; 3 çarpanı devir yaratır: $\\frac{5}{12}=0{,}41\\overline{6}$.'],
    expert: 'Paydanın 2 ve 5 dışındaki kısmı $q$ ise devir uzunluğu, $10^k$’nın $q$’ya bölümünden 1 kalanını veren en küçük $k$’dır: 7 için $10^6=7\\cdot142857+1$, devir 6 basamak. Bu yüzden $\\frac{1}{7}=0{,}\\overline{142857}$.',
  },
  'rasyonel-sayidogrusu': {
    lessonId: 'rasyonel-sayilar',
    title: 'İki kesri sayı doğrusunda karşılaştırmak',
    story: 'İki sınıfın başarı oranları $\\frac{18}{25}$ ve $\\frac{13}{18}$. Hangisi büyük? Ondalığa çevirmek uzun sürer. Çapraz çarpım tek satırda söyler; sayı doğrusu ise ne kadar yakın olduklarını gösterir. Ayrıca iki kesrin arasına her zaman yeni bir kesir sığar.',
    terms: [['Çapraz çarpım', '$\\frac{a}{b}$ ile $\\frac{c}{d}$ için ($b,d>0$) $a\\cdot d$ ile $b\\cdot c$ karşılaştırılır.'], ['Ara kesir', '$\\frac{a+c}{b+d}$; iki kesrin her zaman arasında kalır.'], ['Yoğunluk', 'İki farklı rasyonel sayı arasında sonsuz çok rasyonel sayı vardır.']],
    experiment: 'Kesirleri değiştir. Çapraz çarpımlar eşitken noktalar nerede? Ara kesir hangi kesre daha yakın; paydaları büyük olana mı?',
    example: '$\\frac{3}{4}$ ile $\\frac{5}{7}$’yi karşılaştıralım ve aralarına bir kesir yerleştirelim.',
    steps: [
      ['Çapraz çarp', '$3\\cdot7=21$, $4\\cdot5=20$; $21>20$ olduğundan $\\frac{3}{4}>\\frac{5}{7}$.'],
      ['Nedenini gör', 'Ortak payda 28: $\\frac{21}{28}$ ve $\\frac{20}{28}$. Çapraz çarpımlar tam bu payları verir.'],
      ['Araya kesir koy', '$\\frac{3+5}{4+7}=\\frac{8}{11}\\approx0{,}727$; $\\frac{5}{7}\\approx0{,}714$ ile $0{,}75$ arasında.'],
    ],
    tip: 'Kısa yol yoksa çapraz çarp: $ad>bc$ ise $\\frac{a}{b}>\\frac{c}{d}$ (paydalar pozitif). Seçeneklerde bir aralıkta kesir aranıyorsa ara kesir ya da paydaları büyütmek işe yarar.',
    trap: 'Payı ve paydası büyük olan kesir daha büyük değildir: $\\frac{2}{5}<\\frac{1}{2}$. Negatif paydada çapraz çarpımın yönü değişir; önce işareti paya taşı.',
    transfer: ['$\\frac{7}{9}$ ile $\\frac{11}{14}$’ten hangisi büyük?', '$\\frac{11}{14}$', '$\\frac{7}{9}$', '$7\\cdot14=98<99=9\\cdot11$; yani $\\frac{7}{9}<\\frac{11}{14}$.'],
    expert: 'Ara kesir, iki oranı birleştirmektir: iki sınıfın toplam başarısı $\\frac{18+13}{25+18}=\\frac{31}{43}$, iki oranın arasında kalır ve mevcudu kalabalık olan sınıfa daha yakındır. Kesirleri ortalamak ($\\frac{1}{2}$ toplamı) ile birleştirmek farklı sonuç verir.',
  },
};

const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
const choose = (key, label, value, list) => ({ key, label, value, options: list.map(([p, q], i) => [i, q === 1 ? String(p) : `${p}/${q}`]) });
export const controls = {
  'rasyonel-ortakpayda': [choose('f', 'Birinci kesir', 0, FRACS), choose('g', 'İkinci kesir', 1, FRACS), { key: 'op', label: 'İşlem', value: 0, options: [[0, 'Topla'], [1, 'Farkını al (büyükten küçüğü)']] }],
  'rasyonel-bolme': [choose('f', 'Bölünen', 0, DIVIDENDS), choose('g', 'Bölen (bir parça)', 0, DIVISORS)],
  'rasyonel-virgul': [{ key: 'x', label: 'Sayı', value: 3, options: DECIMALS.map(([m, e], i) => [i, decimalText(m, e)]) }, range('k', '10’un kuvveti (k)', 3, -3, 3)],
  'rasyonel-devirli': [range('a', 'Pay', 1, 1, 12), { key: 'n', label: 'Payda', value: 1, options: DENOMS.map((n, i) => [i, String(n)]) }],
  'rasyonel-sayidogrusu': [range('a', '1. kesrin payı', 3, 1, 15), range('b', '1. kesrin paydası', 4, 2, 15), range('c', '2. kesrin payı', 5, 1, 15), range('d', '2. kesrin paydası', 7, 2, 15)],
};

export function model(id, v) {
  if (id === 'rasyonel-ortakpayda') {
    const [a, b] = FRACS[v.f], [c, d] = FRACS[v.g];
    const l = lcm(b, d), A = (a * l) / b, Cn = (c * l) / d;
    const big = A >= Cn;
    const R = v.op ? Math.abs(A - Cn) : A + Cn;
    const sign = v.op ? '−' : '+';
    const [p1, q1, p2, q2] = v.op && !big ? [c, d, a, b] : [a, b, c, d];
    const [n1, n2] = v.op && !big ? [Cn, A] : [A, Cn];
    return { kind: 'rasyonel-ortakpayda', ...v, a, b, c, d, l, A, Cn, R, first: n1, second: n2,
      equation: `${p1}/${q1} ${sign} ${p2}/${q2} = ${n1}/${l} ${sign} ${n2}/${l} = ${R}/${l}${frac(R, l) !== `${R}/${l}` ? ` = ${frac(R, l)}` : ''}`,
      observation: v.op
        ? (R === 0 ? `İki kesir eşit: ${l} dilimde ikisi de ${A} dilim. Fark 0.` : `Ortak dilim ${l}’de bir: ${n1} dilimden ${n2} dilim çıkınca ${R} dilim kalır. Payları ve paydaları ayrı çıkarmak anlamsız bir kesir verirdi.`)
        : `Dilimler EKOK(${b}, ${d}) = ${l}’de birlik boyda eşitlendi; ${A} + ${Cn} = ${R} dilim. Payları ve paydaları ayrı toplamak ${a + c}/${b + d} verirdi; o sayı iki kesrin arasında kalır, oysa toplam ikisinden de büyük olmalı.` };
  }
  if (id === 'rasyonel-bolme') {
    const [a, b] = DIVIDENDS[v.f], [c, d] = DIVISORS[v.g];
    const num = a * d, den = b * c;
    const whole = Math.floor(num / den), rest = num - whole * den;
    return { kind: 'rasyonel-bolme', ...v, a, b, c, d, value: num / den, whole, rest, den, restText: frac(rest, den),
      equation: `${frac(a, b)} : ${frac(c, d)} = ${frac(a, b)} · ${frac(d, c)} = ${frac(num, den)}`,
      observation: rest === 0
        ? `${frac(c, d)}’lik parçadan tam ${whole} tane sığdı. Bölen 1’den küçük olduğu için sonuç bölünenden büyük.`
        : `${whole} tam parça sığdı; son parça ${frac(rest, den)} oranında doldu. Sonuç ${frac(num, den)}: tam kısmı tam parçaları, kesir kısmı son parçanın dolu oranını gösterir.` };
  }
  if (id === 'rasyonel-virgul') {
    const [m, e] = DECIMALS[v.x];
    const e2 = e - v.k;
    const digits = String(m).split('').map(Number);
    const high = digits.length - 1 - e; // en büyük basamağın üssü
    const cells = (shift) => {
      const out = {};
      digits.forEach((dgt, i) => { out[high - i + shift] = dgt; });
      const exps = Object.keys(out).map(Number);
      for (let p = Math.min(0, ...exps); p <= Math.max(0, ...exps); p++) if (out[p] == null) out[p] = 0;
      return out;
    };
    const before = cells(0), after = cells(v.k);
    const word = v.k > 0 ? `${v.k} basamak sağa` : v.k < 0 ? `${-v.k} basamak sola` : 'yerinde';
    return { kind: 'rasyonel-virgul', ...v, before, after, from: decimalText(m, e), to: decimalText(m, e2),
      equation: `${decimalText(m, e)} · 10${sup(v.k)} = ${decimalText(m, e2)}`,
      observation: v.k === 0 ? '10⁰ = 1: sayı değişmez.' : `Rakamlar (${digits.join(', ')}) aynı sırada kaldı; her biri ${Math.abs(v.k)} basamak ${v.k > 0 ? 'büyüdü' : 'küçüldü'}. Virgül ${word} kaydı gibi görünür; boş kalan basamaklara 0 yazılır.` };
  }
  if (id === 'rasyonel-devirli') {
    const n = DENOMS[v.n];
    const g = gcd(v.a, n), p = v.a / g, q = n / g;
    const ld = longDivision(p, q);
    const fin = ld.start === -1;
    const head = ld.digits.slice(0, fin ? ld.digits.length : ld.start).join('');
    const cycle = fin ? '' : ld.digits.slice(ld.start).map((dgt) => `${dgt}${OVERLINE}`).join('');
    const text = ld.digits.length ? `${ld.whole},${head}${cycle}` : String(ld.whole);
    return { kind: 'rasyonel-devirli', ...v, p, q, ...ld, finite: fin, text, simplified: g > 1,
      equation: `${v.a}/${n}${g > 1 ? ` = ${p}/${q}` : ''} = ${text}`,
      observation: fin
        ? `Payda ${q} yalnız 2 ve 5 çarpanlarından oluşuyor: kalan 0 oldu ve bölme bitti.${g > 1 && !onlyTwoFive(n) ? ` Sadeleştirmeden önceki payda ${n} yanıltıcıydı.` : ''}`
        : `Kalan ${ld.repeatAt} ikinci kez geldi; bölme buradan sonra aynı adımları tekrarlar. Devir ${ld.digits.length - ld.start} basamak. Payda ${q}, 2 ve 5 dışında bir asal çarpan içeriyor; devri bu çarpan yaratır.` };
  }
  if (id === 'rasyonel-sayidogrusu') {
    const x = v.a / v.b, y = v.c / v.d;
    const left = v.a * v.d, right = v.b * v.c;
    const mp = v.a + v.c, mq = v.b + v.d;
    const max = Math.max(1, Math.ceil(Math.max(x, y)));
    const cmp = left > right ? '>' : left < right ? '<' : '=';
    return { kind: 'rasyonel-sayidogrusu', ...v, x, y, left, right, cmp, mp, mq, mid: mp / mq, max,
      equation: `${v.a}·${v.d} = ${left} ${cmp} ${right} = ${v.b}·${v.c} → ${v.a}/${v.b} ${cmp} ${v.c}/${v.d}`,
      observation: cmp === '='
        ? `Çapraz çarpımlar eşit: iki kesir aynı sayıyı gösterir (${frac(v.a, v.b)}). Ara kesir ${mp}/${mq} de aynı noktadadır.`
        : `Ortak payda ${v.b * v.d} ile paylar ${left} ve ${right}: farkları ${Math.abs(left - right)}. Ara kesir ${mp}/${mq} ≈ ${(mp / mq).toFixed(3).replace('.', ',')} iki kesrin arasında kalır.` };
  }
  return null;
}
