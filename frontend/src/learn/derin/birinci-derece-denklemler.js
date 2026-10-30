// Birinci dereceden denklemler: bölüm keşifleri. Özgün öğretim örnekleri; sınav sorusu değildir.
import { show } from './yardim.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/** p/q kesrini sadeleştirip Türkçe yazar (tam sayıysa yalnız sayı). */
export const ratio = (p, q) => {
  if (q < 0) { p = -p; q = -q; }
  const g = gcd(p, q) || 1;
  const [a, b] = [p / g, q / g];
  return b === 1 ? show(a) : `${a < 0 ? '−' : ''}${Math.abs(a)}/${b}`;
};
const term = (k, v) => (k === 0 ? '' : `${k === 1 ? '' : k === -1 ? '−' : show(k)}${v}`);
const lin = (k, b, v = 'x') => {
  const t = term(k, v);
  if (!t) return show(b);
  if (b === 0) return t;
  return `${t} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
};
export const SCENARIOS = [
  { name: 'Jeton', N: 20, big: 'mavi', small: 'sarı', q: 5, p: 1, T: 52, unit: 'puan' },
  { name: 'Bilet', N: 20, big: 'tam', small: 'öğrenci', q: 90, p: 60, T: 1500, unit: 'TL' },
  { name: 'Kümes', N: 20, big: 'tavşan', small: 'tavuk', q: 4, p: 2, T: 56, unit: 'ayak' },
];

export const explorations = {
  'denklem-terazi': {
    lessonId: 'birinci-derece-denklemler',
    title: 'Terazide dengeyi koruyarak bilinmeyeni yalnız bırakmak',
    story: 'Eşit kollu bir terazinin sol kefesinde 3 özdeş paket ve 4 kilo, sağ kefesinde 1 paket ve 10 kilo var; terazi dengede. Bir paketin kaç kilo olduğunu bulmak için iki kefeden aynı şeyleri alırız: denge bozulmaz ve sonunda bir kefede paketler, öbüründe yalnız kilolar kalır.',
    terms: [['Denklem', 'İki tarafı eşit olan ve bilinmeyen içeren eşitlik: $3x+4=x+10$.'], ['Kök', 'Denklemi sağlayan değer.'], ['Sağlama', 'Kökü ilk denklemde yerine koyup iki tarafın eşit çıktığını görmek.']],
    experiment: 'Kefelerdeki paket ve kilo sayılarını değiştir. İki kefeden ortak olanlar atılınca geriye ne kalıyor? Paket sayıları eşit olunca neden tek bir kök bulunamıyor?',
    example: '$3x+4=x+10$ denklemini terazi düşüncesiyle çözelim.',
    steps: [
      ['Ortak paketleri at', 'İki kefeden 1’er paket al: $2x+4=10$. Denge korunur.'],
      ['Ortak kiloları at', 'İki kefeden 4’er kilo al: $2x=6$.'],
      ['Paylaştır ve sağla', 'İki paket 6 kilo ise bir paket 3 kilo: $x=3$. Sağlama: $9+4=13=3+10$.'],
    ],
    tip: 'Bir terimi “karşıya atmak”, iki taraftan aynı şeyi çıkarmanın kısa söylenişidir; işaret bu yüzden değişir. Her denklemi sonunda ilk hâlinde sağla.',
    trap: 'Yalnız bir kefeden çıkarmak dengeyi bozar: $3x+4=x+10$’da yalnız soldan 4 atıp $3x=x+10$ yazmak yanlıştır.',
    transfer: ['$5x+2=2x+17$ ise $x$ kaçtır?', '5', '19/3', 'İki kefeden $2x$ ve 2 at: $3x=15$, $x=5$. Sağlama: $27=27$.'],
    expert: 'Terazi modeli negatif sayıları gösteremez; cebir gösterir. $x+10=3x+14$ denkleminde kök $-2$’dir: terazide “paket” negatif olamaz ama denklem kuralları aynen işler. Model sezgi verir, kural geneldir.',
  },
  'denklem-ozel': {
    lessonId: 'birinci-derece-denklemler',
    title: 'ax = b kaç çözüm verir? İki doğrunun buluşması',
    story: '$ax=b$ denklemini iki doğru olarak düşünelim: $y=ax$ orijinden geçen eğik bir doğru, $y=b$ yatay bir doğru. Kök, iki doğrunun kesiştiği yerin $x$ değeridir. Eğim sıfır olunca $y=ax$ da yatay olur; o zaman ya hiç kesişmezler ya da üst üste biner.',
    terms: [['Tek çözüm', '$a\\neq0$: doğrular bir noktada kesişir, $x=\\frac{b}{a}$.'], ['Çözüm yok ($\\varnothing$)', '$a=0$, $b\\neq0$: iki paralel yatay doğru.'], ['Sonsuz çözüm ($\\mathbb{R}$)', '$a=0$, $b=0$: iki doğru çakışır; her $x$ çözümdür.']],
    experiment: '$a$’yı ve $b$’yi değiştir. $a=0$ yapınca eğik doğru ne oluyor? $b$’yi de 0 yapınca iki doğru nasıl duruyor?',
    example: '$(m-2)x=m+1$ denklemini $m=2$ ve $m=3$ için inceleyelim.',
    steps: [
      ['$m=3$', '$1\\cdot x=4$: eğik doğru $y=x$ ile yatay $y=4$ tek noktada kesişir; $x=4$.'],
      ['$m=2$', '$0\\cdot x=3$: $y=0$ ile $y=3$ paralel; hiç kesişmez. ÇK $=\\varnothing$.'],
      ['Genel kural', 'Katsayı sıfır değilse tek kök; sıfırsa sağ tarafa bak: 0 ise $\\mathbb{R}$, değilse $\\varnothing$.'],
    ],
    tip: 'Parametreli sorularda önce denklemi $ax=b$ biçimine getir; sonra yalnız $a$ ile $b$’nin sıfır olup olmadığına bak.',
    trap: '$0\\cdot x=0$ denkleminin tek kökünü “$x=0$” sanmak: her sayı çözümdür.',
    transfer: ['$(k+1)x=k^2-1$ denkleminin çözüm kümesi $\\mathbb{R}$ ise $k$ kaçtır?', '$-1$', '$1$', '$k=-1$: katsayı $0$, sağ taraf $1-1=0$. $k=1$ için katsayı 2; tek çözüm olur.'],
    expert: 'Aynı fikir iki bilinmeyenli sistemlerde de çalışır: iki doğru bir noktada kesişir (tek çözüm), paraleldir (çözüm yok) ya da çakışıktır (sonsuz çözüm). Bir bilinmeyenli denklem, bu resmin tek boyutlu hâlidir.',
  },
  'denklem-sistem': {
    lessonId: 'birinci-derece-denklemler',
    title: 'İki denklem, iki doğru: kesim noktası',
    story: 'Bir manavda elma ile armudun toplam fiyatı 7 lira, elmanın 2 katı armuttan 2 lira fazla. Her bilgi tek başına sonsuz çok (elma, armut) ikilisine izin verir; bu ikililer bir doğru üzerindedir. İki bilgiyi birden sağlayan ikili, iki doğrunun kesiştiği noktadır.',
    terms: [['Doğrusal denklem', '$ax+by=c$ biçimindeki denklem; grafiği bir doğrudur.'], ['Yok etme', 'Denklemleri taraf tarafa toplayıp bir bilinmeyeni yok etmek.'], ['Paralel doğrular', 'Eğimleri aynı, sabitleri farklı: ortak nokta yok.']],
    experiment: 'İkinci doğrunun eğimini ($k$) ve sabitini ($c$) değiştir. Kesim noktası nasıl kayıyor? $k=-1$ olunca iki doğru neden paralel ya da çakışık oluyor?',
    example: '$x+y=7$ ve $2x-y=2$ sistemini çözelim.',
    steps: [
      ['Topla', '$y$’ler ters katsayılı: $3x=9$, $x=3$.'],
      ['Yerine koy', '$3+y=7$, $y=4$.'],
      ['Grafikle bak', 'İki doğru $(3,4)$ noktasında kesişir; bu nokta iki denklemi de sağlar.'],
    ],
    tip: 'Ters katsayılı bilinmeyen varsa topla; katsayısı 1 olan bilinmeyen varsa yerine koy. Sonucu iki denklemde de sağla.',
    trap: '$x$’i bulup durmak: çoğu soru $y$’yi ya da bir ifadeyi ister. Bulduğun değeri öbür bilinmeyene taşımayı unutma.',
    transfer: ['$x+y=7$ ve $-x-y=5$ sisteminin kaç çözümü vardır?', '0', '1', 'İkinci denklem $x+y=-5$ demektir: aynı eğim, farklı sabit. Doğrular paralel; çözüm yok.'],
    expert: '$ax+by=c$ ve $dx+ey=f$ için $ae-bd\\neq0$ ise tek çözüm vardır: $x=\\frac{ce-bf}{ae-bd}$, $y=\\frac{af-cd}{ae-bd}$. Payda sıfırsa doğrular paraleldir ya da çakışıktır; oran koşulu $\\frac{a}{d}=\\frac{b}{e}$ bunun başka yazılışıdır.',
  },
  'denklem-jeton': {
    lessonId: 'birinci-derece-denklemler',
    title: '“Hepsi aynı olsaydı”: yok etmenin sözlü hâli',
    story: 'Bir kümeste tavuk ve tavşanlar var: 20 baş, 56 ayak. Hepsini tavuk sansan 40 ayak sayardın; 16 ayak eksik. Her tavuğu tavşanla değiştirmek 2 ayak ekler: 8 değişiklik gerekir. Denklem kurmadan yapılan bu akıl yürütme, iki denklemi taraf tarafa çıkarmanın ta kendisidir.',
    terms: [['Adet denklemi', '$x+y=N$: toplam sayı.'], ['Değer denklemi', '$qx+py=T$: toplam puan, para ya da ayak.'], ['Değiştirme', 'Bir ucuz parçayı pahalısıyla değiştirmek toplamı $q-p$ artırır.']],
    experiment: 'Bir durum seç ve tahminini kaydır. Her adımda toplam ne kadar değişiyor? Hedefe kaç adım kaldığını farktan nasıl okursun?',
    example: '20 jeton, mavi 5 puan, sarı 1 puan; toplam 52 puan. Kaç mavi jeton var?',
    steps: [
      ['Hepsi sarı olsaydı', '$20\\cdot1=20$ puan; hedefe $52-20=32$ puan eksik.'],
      ['Bir değişiklik ne getirir?', 'Bir sarıyı maviyle değiştirmek $5-1=4$ puan ekler.'],
      ['Böl ve doğrula', '$32:4=8$ mavi, 12 sarı. Denklemle: $x+y=20$, $5x+y=52$; çıkarınca $4x=32$.'],
    ],
    tip: 'Toplam adet ve toplam değer verilen her soruda: hepsini ucuz say, eksiği $(q-p)$’ye böl. Sonuç pahalı türün adedidir.',
    trap: 'Eksik farkı pahalı türün değerine bölmek: $32:5$ değil, $32:(5-1)$. Bir değişiklik sarıyı çıkarıp maviyi koyar.',
    transfer: ['30 madeni para 5 TL ve 1 TL’lik, toplam 86 TL. Kaç tane 5 TL’lik var?', '14', '17', 'Hepsi 1 TL olsaydı 30 TL; eksik 56 TL; her değişiklik 4 TL: $56:4=14$.'],
    expert: 'Bu yöntem her doğrusal iki bilinmeyenli adet–değer sistemini çözer ve neden tam sayı çıkması gerektiğini de gösterir: eksik fark $(q-p)$’nin katı değilse böyle bir dağılım yoktur. Soru tutarsız verilmişse bu hemen fark edilir.',
  },
};

const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
export const controls = {
  'denklem-terazi': [range('a', 'Sol: paket (x)', 3, 1, 5), range('b', 'Sol: kilo', 4, 0, 12), range('c', 'Sağ: paket (x)', 1, 0, 4), range('d', 'Sağ: kilo', 10, 0, 24)],
  'denklem-ozel': [range('a', 'Katsayı a', 2, -3, 3), range('b', 'Sağ taraf b', 4, -4, 4)],
  'denklem-sistem': [range('s', '1. doğru: x + y =', 7, 2, 10), range('k', '2. doğru: eğim k', 2, -3, 3), range('c', '2. doğru: kx − y =', 2, -6, 8)],
  'denklem-jeton': [{ key: 'sc', label: 'Durum', value: 0, options: SCENARIOS.map((s, i) => [i, `${s.name}: ${s.N} tane, ${s.T} ${s.unit}`]) }, range('g', 'Tahmin: pahalı türden kaç tane?', 0, 0, 20)],
};

export function model(id, v) {
  if (id === 'denklem-terazi') {
    const A = v.a - v.c, B = v.d - v.b;
    const common = Math.min(v.a, v.c), commonKg = Math.min(v.b, v.d);
    const base = { kind: 'denklem-terazi', ...v, A, B, common, commonKg };
    const left = lin(v.a, v.b), right = lin(v.c, v.d);
    if (A === 0) {
      return { ...base, root: null, all: B === 0,
        equation: `${left} = ${right} → 0 · x = ${show(B)}`,
        observation: B === 0 ? 'Kefeler her paket ağırlığında dengede: iki taraf aynı. Her sayı kök; ÇK = ℝ.' : `Paketler atılınca ${show(v.b)} kilo ile ${show(v.d)} kilo karşı karşıya kalıyor: bu denge hiçbir paket ağırlığıyla kurulamaz. ÇK = ∅.` };
    }
    const root = B / A;
    const [l2, r2] = A > 0 ? [lin(A, 0), show(B)] : [show(-B), lin(-A, 0)];
    return { ...base, root, all: false,
      equation: Math.abs(A) === 1 ? `${left} = ${right} → x = ${ratio(B, A)}` : `${left} = ${right} → ${l2} = ${r2} → x = ${ratio(B, A)}`,
      observation: `İki kefeden ${[common ? `${common} paket` : '', commonKg ? `${commonKg} kilo` : ''].filter(Boolean).join(' ve ') || 'hiçbir şey'} atıldı; geriye ${Math.abs(A)} paket ile ${Math.abs(B)} kilo kaldı. ${root < 0 ? 'Kök negatif: terazide paket negatif olamaz, ama cebirsel kök yine de budur.' : Number.isInteger(root) ? `Bir paket ${root} kilo; sağlama: ${v.a * root + v.b} = ${v.c * root + v.d}.` : `Bir paket ${ratio(B, A)} kilo: kök tam sayı olmak zorunda değil.`}` };
  }
  if (id === 'denklem-ozel') {
    const base = { kind: 'denklem-ozel', ...v };
    if (v.a !== 0) return { ...base, sol: 'tek', root: v.b / v.a, rootText: ratio(v.b, v.a),
      equation: `${lin(v.a, 0)} = ${show(v.b)} → x = ${ratio(v.b, v.a)}`,
      observation: `Eğik doğru y = ${lin(v.a, 0)} ile yatay doğru y = ${show(v.b)} tek noktada kesişiyor: tek kök.` };
    return { ...base, sol: v.b === 0 ? 'sonsuz' : 'yok', root: null,
      equation: `0 · x = ${show(v.b)} → ${v.b === 0 ? 'ÇK = ℝ' : 'ÇK = ∅'}`,
      observation: v.b === 0 ? 'a = 0 ve b = 0: iki doğru da y = 0; üst üste biniyor. Her x çözüm.' : `a = 0: y = 0 doğrusu yatay oldu; y = ${show(v.b)} ile paralel. Hiç kesişmiyorlar; çözüm yok.` };
  }
  if (id === 'denklem-sistem') {
    const det = 1 + v.k;
    const base = { kind: 'denklem-sistem', ...v, det };
    const second = `${v.k === 0 ? '' : `${lin(v.k, 0)} `}− y = ${show(v.c)}`.replace(/^− y/, '−y');
    if (det === 0) {
      const same = v.c === -v.s;
      return { ...base, x: null, y: null, same,
        equation: `x + y = ${v.s} ve ${second} (yani x + y = ${show(-v.c)})`,
        observation: same ? 'İkinci denklem birincinin −1 katı: doğrular çakışık, sonsuz çözüm var.' : `İki denklem x + y için iki farklı değer söylüyor (${v.s} ve ${show(-v.c)}): doğrular paralel, çözüm yok.` };
    }
    const x = (v.s + v.c) / det, y = v.s - x;
    return { ...base, x, y, same: false,
      equation: `x + y = ${v.s} ve ${second} → topla: ${det === 1 ? 'x' : `${show(det)}x`} = ${show(v.s + v.c)} → (${ratio(v.s + v.c, det)}, ${ratio(v.s * det - v.s - v.c, det)})`,
      observation: `Toplayınca y’ler gitti. Kesim noktası (${show(x)}, ${show(y)}) iki denklemi birden sağlar. Eğimler farklı olduğu sürece tek kesim noktası vardır.` };
  }
  if (id === 'denklem-jeton') {
    const s = SCENARIOS[v.sc];
    const g = Math.min(v.g, s.N);
    const total = g * s.q + (s.N - g) * s.p;
    const diff = s.T - total, step = s.q - s.p;
    const answer = (s.T - s.N * s.p) / step;
    return { kind: 'denklem-jeton', ...v, s, g, total, diff, step, answer,
      equation: `${g} ${s.big} + ${s.N - g} ${s.small} = ${g}·${s.q} + ${s.N - g}·${s.p} = ${total} ${s.unit} (hedef ${s.T})`,
      observation: diff === 0
        ? `Tuttu: ${g} ${s.big}, ${s.N - g} ${s.small}. Hepsi ${s.small} olsaydı ${s.N * s.p} ${s.unit} olurdu; eksik ${s.T - s.N * s.p}, her değişiklik ${step}: ${s.T - s.N * s.p} : ${step} = ${answer}.`
        : `Hedeften ${Math.abs(diff)} ${s.unit} ${diff > 0 ? 'eksik' : 'fazla'}. Her değişiklik toplamı ${step} ${diff > 0 ? 'artırır' : 'azaltır'}: ${Math.abs(diff)} : ${step} = ${Math.abs(diff) / step}; ${diff > 0 ? `${Math.abs(diff) / step} ${s.small} daha ${s.big} ile değiştirilmeli` : `${Math.abs(diff) / step} ${s.big} fazla seçtin`}.` };
  }
  return null;
}
