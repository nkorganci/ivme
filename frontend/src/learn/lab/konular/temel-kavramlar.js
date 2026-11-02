// Temel Kavramlar laboratuvarı: tek–çift pilotu + sayı kümeleri, işaret/sıralama, ardışık sayılar, uç değer.
// Alıştırmalar özgündür; `real` kodlarının görselleri okunup cevapları veri/sorular-tum.csv ile karşılaştırıldı.
import { add, div, fmt, frac, fracText, isZero, mul, sub } from '../sayi.js';

// p + q√2 (p, q rasyonel) biçimindeki sayılar: toplama, çarpma ve bölme bu kümede kapalıdır; sonuç q = 0 ise rasyoneldir.
export const ROOT2_NUMBERS = [
  ['r2', '$\\sqrt2$', [frac(0), frac(1)]],
  ['mr2', '$-\\sqrt2$', [frac(0), frac(-1)]],
  ['2r2', '$2\\sqrt2$', [frac(0), frac(2)]],
  ['1pr2', '$1+\\sqrt2$', [frac(1), frac(1)]],
  ['1mr2', '$1-\\sqrt2$', [frac(1), frac(-1)]],
  ['3', '$3$', [frac(3), frac(0)]],
  ['0', '$0$', [frac(0), frac(0)]],
  ['half', '$\\tfrac12$', [frac(1, 2), frac(0)]],
];
export const OPS = [['+', '$+$'], ['-', '$-$'], ['*', '$\\times$'], ['/', '$\\div$']];
const byKey = Object.fromEntries(ROOT2_NUMBERS.map(([k, label, v]) => [k, { label, v }]));

export function root2(op, [p1, q1], [p2, q2]) {
  if (op === '+') return [add(p1, p2), add(q1, q2)];
  if (op === '-') return [sub(p1, p2), sub(q1, q2)];
  if (op === '*') return [add(mul(p1, p2), mul(frac(2), mul(q1, q2))), add(mul(p1, q2), mul(p2, q1))];
  // (p1+q1√2)/(p2+q2√2) = (p1+q1√2)(p2−q2√2) / (p2² − 2q2²); payda yalnız p2 = q2 = 0 iken sıfırdır.
  const den = sub(mul(p2, p2), mul(frac(2), mul(q2, q2)));
  if (isZero(den)) return null;
  const [np, nq] = root2('*', [p1, q1], [p2, frac(-q2.n, q2.d)]);
  return [div(np, den), div(nq, den)];
}
export const root2Text = ([p, q]) => {
  if (isZero(q)) return `$${fracText(p)}$`;
  const coef = q.n === q.d ? '' : q.n === -q.d ? '-' : fracText(q).replace('−', '-');
  const r = `${coef}\\sqrt2`;
  return isZero(p) ? `$${r}$` : `$${fracText(p).replace('−', '-')}${q.n > 0 ? '+' : ''}${r}$`;
};
const rational = (x) => isZero(x[1]);

// x'in kuvvetleri ve tersi; sıralama −1, 0, 1 noktalarında değişir.
export const ORDER_TERMS = [['x', (x) => x], ['x^2', (x) => x * x], ['x^3', (x) => x ** 3], ['1/x', (x) => 1 / x]];
export const orderOf = (x) => ORDER_TERMS.map(([k, f]) => [k, f(x)]).sort((a, b) => a[1] - b[1]).map(([k]) => k);

export const run = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);

export default {
  conceptId: 'temel-kavramlar',
  title: 'Sayı Kümeleri ve Temel Kavramlar',
  exam: 'TYT + AYT',
  hero: { title: 'Kesin mi, mümkün mü?', text: 'Beş hedef, her birinde bir iddia. Dene, koşulu değiştir, nedenini kur; sonra gerçek soruda kullan.', art: ['a + 2b', '?', 'Her zaman mı?'] },
  goals: [
    {
      id: 'tek-cift', custom: 'parity', label: 'Tek–çift', short: 'Koşuldan teklik çıkarımı',
      objective: 'Toplam, fark ve çarpım koşulundan bilinmeyenlerin tek/çift olduğunu kesin olarak çıkarır; “kesinlikle” iddiasını karşı örnekle sınar.',
      misconception: 'Bir örnekte doğru çıkan sonucu “her zaman” sanmak; çift çarpımda iki çarpanın da çift olduğunu düşünmek.',
      real: [
        { code: 'TYT-0545', answer: 'B', why: '$a(b+c)$ tek → $a$ tek, $b+c$ tek; üssün tekliği değiştirmediğini kullan.' },
        { code: 'TYT-0565', answer: 'E', why: 'İki çift, bir tek ifadeden hangi harfin tek olduğunu durum ayırarak bul.' },
        { code: 'TYT-0576', answer: 'D', why: 'Günlük bağlamı “kasa − 3” ve “kasa + 2” ifadelerine çevir; fark ve çarpımın tekliği.' },
        { code: 'TYT-0572', answer: 'E', why: 'Dört durumlu döngüden A, B, C’nin tekliğini çıkar; farklı temsil.' },
      ],
    },
    {
      id: 'sayi-kumeleri', label: 'Sayı kümeleri', short: 'İşlem sonucu hangi kümede?',
      objective: 'İki sayının toplam/fark/çarpım/bölümünün rasyonel mi irrasyonel mi olduğunu gerekçesiyle belirler; katsayıları sıfırlayarak ifadeyi rasyonel yapar.',
      misconception: '“İki irrasyonelin toplamı ya da çarpımı her zaman irrasyoneldir” ve “rasyonel × irrasyonel her zaman irrasyoneldir” sanmak.',
      story: 'Bir karenin kenarı 1 m ise köşegeni $\\sqrt2$ m’dir; bu uzunluk hiçbir kesirle tam yazılamaz. Peki iki köşegen uzunluğunu toplayınca ya da çarpınca ne olur?',
      predict: {
        question: 'İki irrasyonel sayıyla toplama, çıkarma, çarpma veya bölme yapınca sonuç için ne söylenebilir?',
        options: ['Her zaman irrasyoneldir.', 'Bazen rasyonel, bazen irrasyonel olabilir.', 'Hiçbir zaman irrasyonel olmaz.'],
        insight: [
          'Deney bir karşı örnek verdi: iki irrasyonelden rasyonel sonuç çıktı. “Her zaman” iddiası tek bir koşula uyan karşı örnekle düşer.',
          'Tahminin doğruydu: $\\sqrt2$ terimleri birbirini götürünce ya da karekök kendisiyle çarpılınca sonuç rasyonel olur; götürmezse irrasyonel kalır.',
          '$\\sqrt2+\\sqrt2 = 2\\sqrt2$ hâlâ irrasyonel. Sonuç duruma göre değişir.',
        ],
      },
      experiment: {
        prompt: 'İki irrasyonel sayı seç; işlemin sonucunu rasyonel yap.',
        view: 'sets', visualLabel: 'Sayı = p + q√2 · q = 0 ise rasyonel',
        controls: [
          { key: 'a', label: 'Birinci sayı', options: ROOT2_NUMBERS.map(([k, l]) => [k, l]) },
          { key: 'op', label: 'İşlem', options: OPS },
          { key: 'b', label: 'İkinci sayı', options: ROOT2_NUMBERS.map(([k, l]) => [k, l]) },
        ],
        initial: { a: 'r2', op: '+', b: '2r2' },
        compute: ({ a, op, b }) => {
          const x = byKey[a].v; const y = byKey[b].v;
          const value = root2(op, x, y);
          if (!value) return { invalid: 'Sıfıra bölme tanımsızdır; ikinci sayı 0 olamaz.', aIrr: !rational(x), bIrr: !rational(y) };
          return { value, aIrr: !rational(x), bIrr: !rational(y), rational: rational(value) };
        },
        readout: ({ a, op, b }, r) => [
          ['İşlem', `${byKey[a].label} ${OPS.find((o) => o[0] === op)[1]} ${byKey[b].label}`],
          ['Sonuç', r.value ? root2Text(r.value) : 'tanımsız'],
          ['Küme', r.value ? (r.rational ? 'Rasyonel ($\\mathbb Q$)' : 'İrrasyonel') : '—'],
        ],
        target: {
          text: 'Hedef: iki sayı da irrasyonel olsun, sonuç rasyonel çıksın.',
          test: (_, r) => !!r.value && r.aIrr && r.bIrr && r.rational,
          example: { a: '1pr2', op: '+', b: '1mr2' },
          hint: '$\\sqrt2$’nin katsayılarına bak. Toplamda katsayılar toplanır; hangi seçim katsayıyı sıfır yapar? Çarpmada $\\sqrt2\\cdot\\sqrt2=2$ olur.',
        },
        diagnose: (_, r) => {
          if (!r.value) return 'Sıfıra bölme tanımsız; başka bir sayı seç.';
          if (!r.aIrr || !r.bIrr) return 'Seçtiğin sayılardan biri rasyonel. İddia iki irrasyonel sayı hakkında; ikisini de $\\sqrt2$ içeren sayılardan seç.';
          return `Sonuçta hâlâ $\\sqrt2$ terimi var (katsayısı ${fracText(r.value[1])}). Katsayıların birbirini götürmesini ya da karekökün kendisiyle çarpılmasını sağla.`;
        },
        success: 'İki irrasyonel, rasyonel sonuç: “her zaman irrasyonel” iddiasına karşı örnek.',
      },
      reasons: [
        {
          question: '$(1+\\sqrt2)+(1-\\sqrt2)$ neden rasyoneldir?',
          options: ['$\\sqrt2$ katsayıları $+1$ ve $-1$; toplamda sıfırlanır, geriye $2$ kalır.', 'İki sayı da pozitif olduğu için.', 'Toplama işlemi her zaman rasyonel sonuç verir.'],
          answer: 0,
          feedback: ['', '$1-\\sqrt2\\approx-0{,}41$ negatiftir. Ayrıca işaretin rasyonellikle ilgisi yok; $\\sqrt2$ teriminin kalıp kalmadığına bak.', '$\\sqrt2+\\sqrt2=2\\sqrt2$ irrasyoneldir. Toplama bazen rasyonel, bazen irrasyonel sonuç verir.'],
        },
        {
          question: '“Rasyonel × irrasyonel = irrasyonel” kısa yolu hangi koşulda doğrudur?',
          options: ['Her zaman.', 'Rasyonel çarpan sıfırdan farklıysa.', 'İrrasyonel sayı pozitifse.'],
          answer: 1,
          feedback: ['$0\\cdot\\sqrt2=0$ rasyoneldir. Koşulsuz kısa yol bu durumda yanıltır.', '', 'İşaret değil, sıfır olup olmama önemli: $3\\cdot(-\\sqrt2)$ de irrasyoneldir, $0\\cdot\\sqrt2$ ise rasyoneldir.'],
        },
      ],
      proof: 'Her sayıyı $p+q\\sqrt2$ biçiminde yaz ($p,q$ rasyonel). Sonuç rasyoneldir ⇔ $q=0$. Toplamda $q$’lar toplanır; çarpımda $(p_1+q_1\\sqrt2)(p_2+q_2\\sqrt2)=(p_1p_2+2q_1q_2)+(p_1q_2+p_2q_1)\\sqrt2$. $r\\neq0$ rasyonel ve $x$ irrasyonelken $rx$ rasyonel olsaydı $x=\\tfrac{rx}{r}$ de rasyonel olurdu; çelişki.',
      rule: 'Sonucu $p+q\\sqrt a$ biçimine getir; kök teriminin katsayısı sıfırsa sonuç rasyoneldir.',
      condition: 'Rasyonel ± irrasyonel her zaman irrasyoneldir; rasyonel × irrasyonel yalnız rasyonel çarpan 0 değilse irrasyoneldir. İki irrasyonel için kesin kural yoktur.',
      trap: '$0\\cdot\\sqrt2=0$; $\\sqrt2\\cdot\\sqrt2=2$; $\\sqrt2+(-\\sqrt2)=0$. “İrrasyonel ile işlem irrasyoneldir” ezberi bu durumlarda yanlış.',
      transfer: [
        {
          id: 'kumeler-yakin', level: 'Yakın alıştırma', text: '$a=3-\\sqrt5$ veriliyor. Hangi $b$ için $a+b$ rasyoneldir?',
          options: ['$b=\\sqrt5-2$', '$b=2\\sqrt5$', '$b=-\\sqrt5$'], answer: 0,
          hints: ['$a+b$’de $\\sqrt5$’in katsayısını her seçenek için yaz.', 'Katsayı sıfır olmalı: $a$’daki $-\\sqrt5$’i hangi $b$ götürür?', '$(3-\\sqrt5)+(\\sqrt5-2)=1$ rasyoneldir.'],
          feedback: ['$\\sqrt5$ terimleri sıfırlandı: $a+b=1$.', '$3-\\sqrt5+2\\sqrt5=3+\\sqrt5$; kök terimi kaldı.', '$3-2\\sqrt5$; katsayılar toplandı ama sıfırlanmadı.'],
        },
        {
          id: 'kumeler-katsayi', level: 'Farklı sunum', text: '$a$ ve $b$ rasyonel sayılar ve $(a-2)\\sqrt3+b-5=0$ ise $a+b$ kaçtır?',
          options: ['$7$', '$5$', 'Belirlenemez'], answer: 0,
          hints: ['Rasyonel kısım ile $\\sqrt3$’lü kısmı ayrı düşün.', '$\\sqrt3$’ün katsayısı sıfır olmazsa sol taraf irrasyonel kalır; sıfıra eşit olamaz.', '$a-2=0$ ve $b-5=0$: $a=2$, $b=5$.'],
          feedback: ['Kök katsayısı ve rasyonel kısım ayrı ayrı sıfır: $a=2$, $b=5$.', 'Yalnız $b=5$ bulundu. $\\sqrt3$’ün katsayısı da sıfır olmalı.', '$a,b$ rasyonel olduğu için tek çözüm var: irrasyonel kısım ancak katsayısı sıfırsa yok olur.'],
        },
        {
          id: 'kumeler-kesin', level: 'Kesinlik ve karşı örnek', text: '$x$ irrasyonel bir sayıdır. Aşağıdakilerden hangisi **kesinlikle** irrasyoneldir?',
          options: ['$x+1$', '$x^2$', '$0\\cdot x$'], answer: 0,
          hints: ['Her seçenek için rasyonel sonuç veren bir $x$ arayabilir misin?', '$x=\\sqrt2$ dene. Bir seçenek için karşı örnek bulunamıyorsa nedenini düşün.', '$x+1$ rasyonel olsaydı $x=(x+1)-1$ de rasyonel olurdu.'],
          feedback: ['Rasyonel bir sayı eklemek irrasyonelliği bozmaz; aksi hâlde $x$ rasyonel çıkardı.', '$x=\\sqrt2$ için $x^2=2$ rasyoneldir; “kesinlikle” değil.', '$0\\cdot x=0$ rasyoneldir.'],
        },
      ],
      realNote: 'TYT 2018–2026 ve AYT Sayı Kümeleri havuzunun görselleri tarandı; rasyonel–irrasyonel işlem kapalılığını soran soru bulunmadı. Bu hedefte aktarım özgün alıştırmalarla yapılır; ders içindeki rehberli TYT-0588 işlem önceliğini işler.',
    },
    {
      id: 'isaret', label: 'İşaret ve sıralama', short: 'Kuvvet ve ters sırayı çevirir',
      objective: '$x$’in bulunduğu aralığa göre $x$, $x^2$, $x^3$, $1/x$ sırasını ve işaretini belirler; aralık ayırmadan genelleme yapmaz.',
      misconception: '“Kuvvet almak sayıyı büyütür”, “negatifin küpü daha küçüktür” gibi yalnız $x>1$ için doğru kuralları her aralığa uygulamak.',
      story: 'Bir dalgıç yüzeyin 0,5 m altındaysa konumu $-0{,}5$’tir. Bu sayının karesi, küpü ve tersi sayı doğrusunda nereye düşer? Sezgin her aralıkta aynı mı çalışıyor?',
      predict: {
        question: '“$x$ negatifse $x^3<x$ olur.” Bu iddia için ne düşünüyorsun?',
        options: ['Her zaman doğru.', 'Bazen doğru.', 'Hiçbir zaman doğru değil.'],
        insight: [
          '$x=-0{,}5$ için $x^3=-0{,}125>-0{,}5$. İddia $-1<x<0$ aralığında bozuluyor; “her zaman” değil.',
          'Doğru: $x<-1$ iken $x^3<x$, $-1<x<0$ iken $x^3>x$. Sıra $-1$ noktasında değişiyor.',
          '$x=-2$ için $x^3=-8<-2$; iddia bu aralıkta doğru. Durum aralığa bağlı.',
        ],
      },
      experiment: {
        prompt: '$x$’i değiştir; sıralamanın $x<x^3<x^2$ olduğu bir $x$ bul.',
        view: 'order', visualLabel: 'Sayı doğrusu · −1, 0, 1 sınırları',
        controls: [{ key: 'x', label: '$x$', min: -2.5, max: 2.5, step: 0.1, format: (v) => fmt(v, 1) }],
        initial: { x: 2 },
        compute: ({ x }) => {
          const v = Math.round(x * 10) / 10;
          if ([-1, 0, 1].includes(v)) return { x: v, invalid: v === 0 ? '$1/x$ tanımsız; ayrıca $0$, $-1$ ve $1$’de bazı ifadeler eşitlenir. Sınırın iki yanını dene.' : `$x=${fmt(v)}$ iken bazı ifadeler eşit olur; sınırın iki yanını dene.` };
          return { x: v, order: orderOf(v), values: Object.fromEntries(ORDER_TERMS.map(([k, f]) => [k, f(v)])) };
        },
        readout: (_, r) => r.invalid ? [['$x$', fmt(r.x, 1)]] : [
          ['$x$', fmt(r.x, 1)], ['Sıra', r.order.map((k) => `$${k}$`).join(' < ')],
          ['Aralık', r.x < -1 ? '$x<-1$' : r.x < 0 ? '$-1<x<0$' : r.x < 1 ? '$0<x<1$' : '$x>1$'],
        ],
        target: {
          text: 'Hedef sıra: $x < x^3 < x^2$. Hangi aralıkta?',
          test: (_, r) => !r.invalid && r.values.x < r.values['x^3'] && r.values['x^3'] < r.values['x^2'],
          example: { x: -0.5 },
          hint: '$x^2$ en büyük olmalı ve $x^3$, $x$’ten büyük. Negatif ama mutlak değeri 1’den küçük sayıları dene.',
        },
        diagnose: (_, r) => {
          if (r.invalid) return 'Sınır noktasında ifadeler eşitlenir; biraz sağına veya soluna geç.';
          if (r.x > 1) return '$x>1$: kuvvet aldıkça büyüyor, $x<x^2<x^3$. Hedefte $x^2$ en büyük olmalı.';
          if (r.x > 0) return '$0<x<1$: kuvvet aldıkça küçülüyor, $x^3<x^2<x$. Hedefte $x$ en küçük olmalı; negatif tarafa bak.';
          return '$x<-1$: $x^3$ daha da negatif, $x^3<x$. Mutlak değeri 1’den küçük negatifleri dene.';
        },
        success: '$-1<x<0$: küp mutlak değeri küçültür; negatifte küçük mutlak değer daha büyük sayı demektir.',
      },
      reasons: [
        {
          question: '$x=-0{,}5$ için neden $x^3>x$?',
          options: ['$|x^3|<|x|$ ve ikisi de negatif; mutlak değeri küçük olan negatif sayı daha büyüktür.', 'Küp almak bir sayıyı her zaman büyütür.', 'Negatif bir sayının küpü pozitiftir.'],
          answer: 0,
          feedback: ['', '$x=2$ için büyütür ama $x=0{,}5$ için küçültür, $x=-2$ için de küçültür. Kural aralığa bağlı.', 'Tek kuvvet işareti korur: $(-0{,}5)^3=-0{,}125$ negatiftir.'],
        },
        {
          question: 'Bu tür sıralama sorusunda hangi aralıkları ayrı ayrı incelemek gerekir?',
          options: ['$x<-1$, $-1<x<0$, $0<x<1$, $x>1$', 'Yalnız $x<0$ ve $x>0$', 'Yalnız $x$ tam sayıysa sıralama yapılabilir'],
          answer: 0,
          feedback: ['', 'Negatif tarafta da sıra $-1$’de değişti; iki aralık yetmez.', 'Soru gerçek sayılar için; aralık içindeki her $x$ aynı sırayı verir, tam sayı şartı gerekmez.'],
        },
      ],
      proof: '$|x|<1$ iken $|x^3|=|x|^3<|x|$, $|x|>1$ iken $|x^3|>|x|$. Tek kuvvet işareti korur; negatif sayılarda mutlak değeri küçük olan büyüktür. $x^2\\ge0$ olduğu için negatif $x$’te en büyük $x^2$’dir. Sıra yalnız ifadelerin eşitlendiği $-1$, $0$, $1$ noktalarında değişebilir; her aralıktan bir sayı denemek bu yüzden yeterlidir.',
      rule: 'Sıralama sorusunda $-1$, $0$, $1$ ile aralıkları ayır; her aralıktan bir temsilci sayı dene.',
      condition: 'Temsilci deneme, sıranın ancak sınır noktalarında değiştiği ifadelerde (kuvvetler, ters) geçerlidir. Sınır noktası sorunun yasakladığı değerlerdir.',
      trap: 'Tek bir sayı denemek tek aralığı gösterir; “hiçbir zaman” sorularında bütün aralıkları denemeden karar verme.',
      transfer: [
        {
          id: 'isaret-yakin', level: 'Yakın alıştırma', text: '$-1<x<0$ ise $x$, $x^2$ ve $\\dfrac1x$ küçükten büyüğe nasıl sıralanır?',
          options: ['$\\dfrac1x<x<x^2$', '$x<\\dfrac1x<x^2$', '$x^2<x<\\dfrac1x$'], answer: 0,
          hints: ['Aralıktan bir temsilci seç: $x=-0{,}5$.', '$1/x=-2$, $x=-0{,}5$, $x^2=0{,}25$.', 'Negatifler pozitiften küçük; $-2<-0{,}5$.'],
          feedback: ['$x=-0{,}5$: $-2<-0{,}5<0{,}25$.', '$x=-0{,}5$ için $1/x=-2$; mutlak değeri 1’den küçük sayının tersi mutlak değerce büyür.', '$x^2$ pozitif, diğer ikisi negatif; $x^2$ en büyük olmalı.'],
        },
        {
          id: 'isaret-kosul', level: 'Ters yön', text: '$x^2<x$ olduğu biliniyor. Buna göre hangisi doğrudur?',
          options: ['$0<x<1$', '$x<0$', '$x>1$'], answer: 0,
          hints: ['Her aralıktan bir temsilci dene: $-2$, $0{,}5$, $2$.', '$x^2-x<0$ ⇔ $x(x-1)<0$.', 'Çarpım negatifse çarpanlar zıt işaretli: $x>0$ ve $x<1$.'],
          feedback: ['$x=0{,}5$: $0{,}25<0{,}5$ ✓; başka aralıkta sağlanmaz.', '$x$ negatifse $x^2$ pozitiftir, $x^2<x$ olamaz.', '$x=2$: $4<2$ yanlış; $x>1$’de kare büyür.'],
        },
        {
          id: 'isaret-uc', level: 'Sıralamadan işaret', text: '$a<b<0<c$ ise aşağıdakilerden hangisi **kesinlikle** pozitiftir?',
          options: ['$a\\cdot b\\cdot c$', '$a+c$', '$b\\cdot c$'], answer: 0,
          hints: ['Her harfin işaretini yaz: $a$ −, $b$ −, $c$ +.', 'Çarpımda negatif çarpan sayısına bak; toplamda büyüklükler de gerekir.', 'İki negatif bir pozitif: $(-)(-)(+)=+$.'],
          feedback: ['İki negatif çarpan: çarpım pozitif.', '$a=-5$, $c=1$ için $a+c<0$; $a=-1$, $c=5$ için $>0$. Kesin değil.', 'Bir negatif bir pozitif çarpan: $b\\cdot c<0$.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0037', answer: 'D', why: '$x^3, x^2, x, -x, -1/x$ sırası: aralıkları ayırıp hangi elemanın asla ortada olmadığını bul.' },
        { code: 'AYT_Sayisal-0008', answer: 'B', why: '$a+b=|a|$ eşitliğinden $a$’nın işaretini durum ayırarak bul; sonra sırala.' },
        { code: 'TYT-0542', answer: 'C', why: 'Negatif sayılarla toplama, çıkarma ve çarpmanın işaretini ayırt et.' },
      ],
    },
    {
      id: 'ardisik', label: 'Ardışık sayılar', short: 'Toplam = terim sayısı × orta',
      objective: 'Ardışık (tam, tek, çift) sayıların toplamını ortanca terimle kurar; toplamdan terim sayısını ve uçları bulur, işaret koşulunu birlikte kullanır.',
      misconception: '“Ardışık çift” sayılarda artışı 1 almak; çift sayıda terimde ortalamanın bir terim olduğunu sanmak; toplamın tek bir dizilişle elde edilebileceğini düşünmek.',
      story: 'Bir apartmanda yan yana daire numaraları 10, 12, 14 gibi ikişer artıyor. Numaraların toplamını bilerek hangi dairelerin yan yana olduğunu bulabilir misin?',
      predict: {
        question: 'Toplamı 36 olan ardışık çift sayılarda (en az 3 terim) terim sayısı için ne söylenebilir?',
        options: ['Yalnız 3 terim olabilir.', 'Birden çok farklı terim sayısı olabilir.', 'Böyle bir dizi yoktur.'],
        insight: [
          '$10+12+14$ bir çözüm; ama $6+8+10+12$ ve $-4,-2,\\dots,12$ (9 terim) de 36 eder. Tek çözüm yok.',
          'Doğru: 3 terim ($10,12,14$), 4 terim ($6,\\dots,12$), 9 terim ($-4,\\dots,12$). Negatif terimlere izin vermek yeni çözüm açar.',
          '$10+12+14=36$; dizi var.',
        ],
      },
      experiment: {
        prompt: 'Başlangıcı, artışı ve terim sayısını seç; toplamı 36 olan ardışık çift sayılar kur.',
        view: 'run', visualLabel: 'Terimler ve ortanca çizgisi',
        controls: [
          { key: 'start', label: 'İlk terim', min: -10, max: 20, step: 1 },
          { key: 'step', label: 'Artış', options: [[1, 'Ardışık (+1)'], [2, 'Ardışık tek/çift (+2)']] },
          { key: 'n', label: 'Terim sayısı', min: 3, max: 9, step: 1 },
        ],
        initial: { start: 1, step: 1, n: 3 },
        compute: ({ start, step, n }) => {
          const terms = run(start, step, n);
          const sum = terms.reduce((a, b) => a + b, 0);
          return { terms, sum, mean: sum / n };
        },
        readout: ({ n }, r) => [['Terimler', r.terms.map((t) => fmt(t)).join(', ')], ['Toplam', fmt(r.sum)], ['Ortalama (orta)', fmt(r.mean)], ['$n\\times$orta', `${n} × ${fmt(r.mean)} = ${fmt(r.sum)}`]],
        target: {
          text: 'Hedef: terimler ardışık **çift** sayılar ve toplam $36$.',
          test: ({ start, step }, r) => step === 2 && start % 2 === 0 && r.sum === 36,
          example: { start: 10, step: 2, n: 3 },
          hint: 'Toplam = terim sayısı × orta. 3 terim için orta $36/3=12$ olmalı; ortanın iki yanına ikişer adım git.',
        },
        diagnose: ({ start, step, n }, r) => {
          if (step !== 2) return 'Artış 1 iken sayılar sırayla tek–çift değişir. Ardışık çift için artış 2 olmalı.';
          if (start % 2 !== 0) return 'İlk terim tek; +2 artışla bütün terimler tek kalır. Çift bir sayıdan başla.';
          const need = 36 / n;
          return `Toplam ${fmt(r.sum)}. ${n} terimde orta $36/${n}=${fmt(need)}$ olmalı${Number.isInteger(need) || n % 2 === 0 ? '' : '; bu sayı tam sayı değil, terim sayısını değiştir'}.`;
        },
        success: 'Toplam = terim sayısı × ortanca. Ortayı bulunca uçlar ikişer adımla gelir.',
      },
      reasons: [
        {
          question: 'Ardışık sayıların toplamı neden “terim sayısı × orta terim”dir?',
          options: ['Ortanın iki yanındaki terimler eşit uzaklıkta; eksik ve fazlalar birbirini götürür.', 'Bütün terimler birbirine eşittir.', 'Yalnız pozitif sayılarda geçerli bir kuraldır.'],
          answer: 0,
          feedback: ['', 'Terimler farklı; ama ortadan sapmalar $-2,0,+2$ gibi simetrik olduğu için toplamda sıfırlanır.', 'Deneyde negatif terimli dizide de geçerliydi: simetri işaretten bağımsız.'],
        },
        {
          question: 'Çift sayıda terim varsa “orta” nedir?',
          options: ['Ortadaki iki terimin ortalaması; terimlerden biri olmayabilir.', 'Ortadaki büyük terim.', 'Her zaman bir terimdir.'],
          answer: 0,
          feedback: ['', '$6,8,10,12$’de orta 9’dur; 10 alınırsa toplam $4\\cdot10=40$ çıkar.', '$6,8,10,12$’de orta $9$; dizide yok ama toplam $4\\cdot9=36$.'],
        },
      ],
      proof: 'Terimler $m-k\\,d,\\dots,m,\\dots,m+k\\,d$ biçimindedir ($d$ artış, $m$ orta). Sapmalar simetrik olduğu için toplanınca sıfırlanır: toplam $=n\\cdot m$. Çift $n$’de $m$ iki orta terimin ortalamasıdır; ardışık çiftlerde bu bir tek sayıdır.',
      rule: 'Toplam ÷ terim sayısı = orta terim; uçlar ortadan artış kadar adımla bulunur.',
      condition: 'Terimler eşit artışla ilerlemeli (ardışık, ardışık tek/çift, ardışık katlar). Artış eşit değilse kural geçmez.',
      trap: 'Ardışık çiftte çift sayıda terim varsa orta tek sayıdır; “orta terim çift olmalı” diye çözümü eleme.',
      transfer: [
        {
          id: 'ardisik-yakin', level: 'Yakın alıştırma', text: 'Ardışık 7 tam sayının toplamı $0$ ise en büyüğü kaçtır?',
          options: ['$3$', '$7$', '$0$'], answer: 0,
          hints: ['Orta terim = toplam ÷ terim sayısı.', 'Orta $0/7=0$; ortanın iki yanında üçer terim var.', '$-3,\\dots,0,\\dots,3$: en büyük $3$.'],
          feedback: ['Orta 0, üç adım sağ: 3.', 'Terim sayısı ile en büyük terim aynı şey değil; orta 0’dan üç adım git.', '0 orta terimdir; en büyük değil.'],
        },
        {
          id: 'ardisik-tek', level: 'Farklı dizi türü', text: 'Ardışık 4 tek sayının toplamı $56$ ise en küçüğü kaçtır?',
          options: ['$11$', '$13$', '$14$'], answer: 0,
          hints: ['Orta $=56/4=14$; terim sayısı çift.', 'Ortanın iki yanında birer tek sayı: $13$ ve $15$.', 'Artış 2: $11,13,15,17$.'],
          feedback: ['$11+13+15+17=56$.', '$13$ ortanın hemen solu; dizide ondan küçük bir terim daha var.', '$14$ orta değerdir ama tek değil; dizide yer almaz.'],
        },
        {
          id: 'ardisik-isaret', level: 'İki koşulu birlikte', text: '$a<b<c$ ardışık tam sayılar ve $a\\cdot c<0$ ise $b$ kaçtır?',
          options: ['$0$', '$-1$', 'Belirlenemez'], answer: 0,
          hints: ['$a\\cdot c<0$: $a$ ve $c$ zıt işaretli.', '$a<0<c$ ve $c=a+2$.', '$a=-1$, $c=1$, dolayısıyla $b=0$.'],
          feedback: ['$a=-1$, $b=0$, $c=1$: tek olasılık.', '$b=-1$ ise $a=-2$, $c=0$; çarpım 0 olur, negatif değil.', 'İki koşul birlikte tek durumu bırakır: $c-a=2$ ve aralarında 0 var.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0020', answer: 'B', why: 'Ardışık dört tam sayıda $a\\cdot c>0$ ve $a\\cdot b\\cdot d=0$: sıfırın yerini işaret koşuluyla bul.' },
      ],
    },
    {
      id: 'uc-deger', label: 'Uç değer', short: 'Koşul en büyüğü değiştirir',
      objective: 'Sabit toplamda çarpımın en büyük/en küçük değerini koşula (farklı, tam sayı, pozitif) göre bulur; koşul aday kümesini nasıl değiştirir açıklar.',
      misconception: '“Toplam sabitse en büyük çarpım sayılar eşitken” kuralını “farklı” koşulunda da uygulamak; en küçük değer için de aynı stratejiyi kullanmak.',
      story: '12 metre çitle dikdörtgen bir bahçe çevreleyeceksin; iki kenarın toplamı sabit. Alan en büyük ne zaman? Peki kenarlar farklı tam sayı olmak zorundaysa?',
      predict: {
        question: '$x+y=12$, $x$ ve $y$ **farklı** tam sayılar. $x\\cdot y$ en çok kaçtır?',
        options: ['$36$', '$35$', '$32$'],
        insight: [
          '$36$ için $x=y=6$ gerekir; “farklı” koşulu bunu yasaklıyor. En yakın izinli durum $5\\cdot7=35$.',
          'Doğru: eşitliğe en yakın izinli seçim $5$ ve $7$.',
          '$32=4\\cdot8$; $5\\cdot7=35$ daha büyük. Sayılar birbirine yaklaştıkça çarpım büyür.',
        ],
      },
      experiment: {
        prompt: '$x$’i değiştir; $x+y=12$, $x\\neq y$ tam sayılarken çarpımı en büyük yap.',
        view: 'product', visualLabel: 'Kenarları x ve y olan dikdörtgen · çarpım eğrisi',
        controls: [{ key: 'x', label: '$x$ (y = 12 − x)', min: -4, max: 16, step: 1 }],
        initial: { x: 2 },
        compute: ({ x }) => {
          const y = 12 - x;
          return { x, y, product: x * y, invalid: x === y ? '“Farklı tam sayılar” koşulu: $x=y=6$ seçilemez.' : null };
        },
        readout: (_, r) => [['$x$', fmt(r.x)], ['$y=12-x$', fmt(r.y)], ['$x\\cdot y$', fmt(r.product)], ['$6$’dan uzaklık', fmt(Math.abs(r.x - 6))]],
        target: {
          text: 'Hedef: koşula uyan en büyük çarpım.',
          test: (_, r) => !r.invalid && r.product === 35,
          example: { x: 5 },
          hint: '$x=6$’ya yaklaştıkça çarpım büyüyor mu? $6$ yasak; ona en yakın izinli tam sayıları dene.',
        },
        diagnose: (_, r) => r.invalid ? 'Bu en büyük çarpım ama koşulu bozuyor; izinli en yakın durumu ara.'
          : `Çarpım ${fmt(r.product)}. $x$, $6$’dan ${Math.abs(r.x - 6)} uzakta; ${r.product < 0 ? 'bir sayı negatif olunca çarpım da negatif. ' : ''}6’ya yaklaştır.`,
        success: 'Eşitlik yasak olunca en büyük çarpım, eşitliğe en yakın izinli durumda: $5\\cdot7=35$.',
      },
      reasons: [
        {
          question: 'Toplam sabitken çarpım neden sayılar birbirine yaklaştıkça büyür?',
          options: ['$xy=36-(x-6)^2$; $6$’dan uzaklık arttıkça çıkarılan kare büyür.', 'Büyük sayı seçmek her zaman büyük çarpım verir.', 'Çarpım $x$’e bağlı değildir.'],
          answer: 0,
          feedback: ['', '$x=11$, $y=1$: çarpım yalnız $11$. Bir sayı büyürken diğeri küçülüyor.', 'Deneyde çarpım $x$ ile değişti: $x=2$’de 20, $x=5$’te 35.'],
        },
        {
          question: '$x$ ve $y$ negatif de olabilseydi en küçük çarpım için ne söylenirdi?',
          options: ['En küçük değer yoktur; çarpım istenildiği kadar küçülür.', 'En küçük değer $0$’dır.', 'En küçük değer $35$’tir.'],
          answer: 0,
          feedback: ['', '$x=13$, $y=-1$: çarpım $-13<0$. Daha uzağa gittikçe daha da küçülür.', '$35$ en büyük çarpımdı; en küçük için ters yöne, uzaklığı artırmaya bak.'],
        },
      ],
      proof: '$y=12-x$ ise $xy=12x-x^2=36-(x-6)^2$. Kare en az $0$ olduğu için $xy\\le36$, eşitlik yalnız $x=6$’da. $x\\neq6$ tam sayısında $(x-6)^2\\ge1$, en büyük çarpım $35$. Kare sınırsız büyüdüğü için en küçük değer yoktur.',
      rule: 'Toplam sabitse çarpım, sayılar eşitken en büyük; koşul eşitliği yasaklıyorsa eşitliğe en yakın izinli durumu seç.',
      condition: 'Toplam sabit olmalı. Gerçek sayılarda da geçerli; tam sayı/farklı koşulu yalnız hangi değerin seçilebileceğini değiştirir. En küçük değer için başka bir sınır (ör. pozitiflik) gerekir.',
      trap: '“Farklı” koşulunda $36$ seçmek; negatif sayılara izin varken “en küçük çarpım 0” demek.',
      transfer: [
        {
          id: 'uc-yakin', level: 'Yakın alıştırma', text: '$a+b=20$, $a$ ve $b$ birbirinden farklı pozitif tam sayılar. $a\\cdot b$ en çok kaçtır?',
          options: ['$99$', '$100$', '$96$'], answer: 0,
          hints: ['Eşit olsalardı $10\\cdot10$ olurdu.', 'Eşitlik yasak; $10$’a en yakın farklı iki sayı?', '$9\\cdot11=99$.'],
          feedback: ['$9+11=20$, $99=100-1^2$.', '$100$ için $a=b=10$; “farklı” koşulu bozulur.', '$96=8\\cdot12$; $9\\cdot11$ eşitliğe daha yakın.'],
        },
        {
          id: 'uc-aday', level: 'Koşulla aday eleme', text: '$a$ ve $b$ birbirinden farklı rakamlar, $a\\cdot b=12$ ve $a>b$. $a-b$ en az kaçtır?',
          options: ['$1$', '$4$', '$2$'], answer: 0,
          hints: ['12’yi iki farklı rakamın çarpımı olarak yaz.', 'Adaylar: $(4,3)$ ve $(6,2)$; $(12,1)$ rakam değil.', 'Farklar $1$ ve $4$.'],
          feedback: ['$4\\cdot3=12$, fark $1$.', '$6-2=4$; daha yakın bir çift var.', '$a-b=2$ veren rakam çifti yok; adayları listele.'],
        },
        {
          id: 'uc-enkucuk', level: 'Yöntem seçimi', text: '$x+y=10$ ve $x,y$ tam sayılar (negatif olabilir). $x\\cdot y$ için hangisi doğrudur?',
          options: ['En küçük değeri yoktur.', 'En küçük değeri $0$’dır.', 'En küçük değeri $-25$’tir.'], answer: 0,
          hints: ['Bir sayıyı çok büyütüp diğerini negatif yap.', '$x=20$, $y=-10$: çarpım?', '$xy=25-(x-5)^2$ ve kare sınırsız büyür.'],
          feedback: ['$x$ büyüdükçe $xy=25-(x-5)^2$ sınırsız azalır.', '$x=11$, $y=-1$ için $-11<0$.', '$x=20$, $y=-10$ için $-200$; $-25$ alt sınır değil.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0024', answer: 'B', why: '$b\\cdot c=12$ adaylarını listele; $a\\cdot b<8$ ve $a\\cdot c>10$ sınırlarıyla ele.' },
        { code: 'AYT_Sayisal-0033', answer: 'E', why: 'Farklı rakamlarla $45<b\\cdot c<50$ ve sınır eşitsizlikleriyle tek durumu bul.' },
      ],
    },
  ],
};
