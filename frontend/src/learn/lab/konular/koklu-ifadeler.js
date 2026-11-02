// Köklü İfadeler laboratuvarı: kök dışına çıkarma (en büyük kare çarpan), kökü tam sayılar arasına yerleştirme ve
// sıralama, eşlenikle paydayı rasyonel yapma, köklü denklemde sahte kök. `real` görselleri okunup CSV ile karşılaştırıldı.
import { fmt } from '../sayi.js';

/** n = k²·m, m karesiz. */
export function squarePart(n) {
  let k = 1;
  for (let d = 2; d * d <= n; d++) while (n % (d * d) === 0) { n /= d * d; k *= d; }
  return { k, m: n };
}
export const CONJ = [['p', '$\\sqrt3+1$'], ['m', '$\\sqrt3-1$'], ['r', '$\\sqrt3$']];
// 2/(√3+1) payda çarpanına göre: payda = (√3+1)·çarpan, p + q√3 biçiminde.
export function rationalize(choice) {
  const f = { p: [1, 1], m: [-1, 1], r: [0, 1] }[choice];
  // (1 + √3)(a + b√3) = (a + 3b) + (a + b)√3
  const den = [f[0] + 3 * f[1], f[0] + f[1]];
  return { den, rational: den[1] === 0 };
}

export default {
  conceptId: 'koklu-ifadeler',
  title: 'Köklü İfadeler ve Köklü Denklemler',
  exam: 'TYT + AYT',
  hero: { title: 'Karenin kenarı', text: '√n, alanı n olan karenin kenarıdır. Kareleri ayır, kökü yerleştir, eşleniği bul, sahte kökü yakala.', art: ['√72', '=', '6√2'] },
  goals: [
    {
      id: 'kok-disi', label: 'Kök dışına çıkarma', short: '√(k²m) = k√m',
      objective: 'Kök içini en büyük tam kare çarpan × karesiz sayı biçiminde ayırıp kök dışına çıkarır; benzer kökleri toplar, kök çarpımını sadeleştirir.',
      misconception: '$\\sqrt{72}=36\\sqrt2$ yazmak (kare çarpanı kökten çıkarmamak) ya da $\\sqrt a+\\sqrt b=\\sqrt{a+b}$ sanmak.',
      story: 'Alanı 72 m² olan kare bir halının kenarı kaç metre? Halıyı 36’lık parçalara bölünce kenar daha kolay okunur.',
      predict: {
        question: '$\\sqrt{72}$ neye eşittir?',
        options: ['$6\\sqrt2$', '$36\\sqrt2$', '$2\\sqrt6$'],
        insight: [
          'Doğru: $72=36\\cdot2$, $\\sqrt{36}=6$.',
          '$36\\sqrt2\\approx50$; ama $\\sqrt{72}\\approx8{,}5$. Kare çarpanın kökü alınır.',
          '$2\\sqrt6=\\sqrt{24}$; 72 değil.',
        ],
      },
      experiment: {
        prompt: '$n$’yi seç; $\\sqrt n=6\\sqrt2$ olan sayıyı bul.',
        view: 'square-grid', visualLabel: 'n = k² tane kenarı √m olan kare',
        controls: [{ key: 'n', label: '$n$', min: 2, max: 200, step: 1 }],
        initial: { n: 50 },
        compute: ({ n }) => ({ n, ...squarePart(n) }),
        readout: (_, r) => [['Ayrıştırma', `$${r.n}=${r.k * r.k}\\cdot${r.m}$`], ['$\\sqrt n$', r.m === 1 ? `$${r.k}$` : `$${r.k === 1 ? '' : r.k}\\sqrt{${r.m}}$`], ['Yaklaşık', fmt(Math.sqrt(r.n), 2)]],
        target: {
          text: 'Hedef: $\\sqrt n=6\\sqrt2$.',
          test: (_, r) => r.k === 6 && r.m === 2,
          example: { n: 72 },
          hint: '$6\\sqrt2=\\sqrt{6^2\\cdot2}$.',
        },
        diagnose: (_, r) => `$\\sqrt{${r.n}}=${r.m === 1 ? r.k : `${r.k === 1 ? '' : r.k}\\sqrt{${r.m}}`}$. ${r.m !== 2 ? 'Karesiz kısım 2 olmalı.' : 'Kare kısım $6^2=36$ olmalı.'}`,
        success: '$72=36\\cdot2$: $6\\times6$ tane $\\sqrt2$ kenarlı kare.',
      },
      reasons: [
        {
          question: '$\\sqrt{72}$ neden $6\\sqrt2$?',
          options: ['$72=36\\cdot2$ ve $\\sqrt{ab}=\\sqrt a\\sqrt b$: $\\sqrt{36}=6$.', '$72/12=6$ olduğu için.', '$\\sqrt{72}=\\sqrt{70}+\\sqrt2$.'],
          answer: 0,
          feedback: ['', '12’ye bölmenin kökle ilgisi yok; kare çarpan aranır.', 'Kök toplama dağılmaz: $\\sqrt{a+b}\\neq\\sqrt a+\\sqrt b$.'],
        },
        {
          question: '$a<0$ iken $\\sqrt{a^2}$ nedir?',
          options: ['$|a|=-a$', '$a$', 'Tanımsız'],
          answer: 0,
          feedback: ['', 'Karekök negatif olamaz; $a$ negatif.', '$a^2>0$; kökü tanımlı.'],
        },
      ],
      proof: '$\\sqrt{ab}=\\sqrt a\\sqrt b$ ($a,b\\ge0$). $n=k^2m$ ise $\\sqrt n=\\sqrt{k^2}\\sqrt m=k\\sqrt m$. En büyük kare çarpanı alınca $m$ karesiz kalır; sonuç tektir.',
      rule: 'Kök içinden en büyük tam kare çarpanı ayır, kökünü dışarı yaz. Yalnız kök içleri aynıysa topla: $a\\sqrt m+b\\sqrt m=(a+b)\\sqrt m$.',
      condition: 'Kök içleri negatif olmamalı. $\\sqrt{x^2}=|x|$; $x$’in işareti bilinmiyorsa mutlak değer kalır.',
      trap: '$\\sqrt{a+b}=\\sqrt a+\\sqrt b$; farklı kök içlerini toplamak.',
      transfer: [
        {
          id: 'disi-yakin', level: 'Yakın alıştırma', text: '$\\sqrt{50}+\\sqrt{18}$ kaçtır?',
          options: ['$8\\sqrt2$', '$\\sqrt{68}$', '$2\\sqrt{17}$'], answer: 0,
          hints: ['Her birini sadeleştir.', '$5\\sqrt2+3\\sqrt2$.', 'Kök içleri aynı: topla.'],
          feedback: ['$8\\sqrt2\\approx11{,}3$.', 'Kök içleri toplanmaz: $\\sqrt{68}\\approx8{,}2$.', '$2\\sqrt{17}=\\sqrt{68}$; aynı hata.'],
        },
        {
          id: 'disi-carpim', level: 'Kök çarpımı', text: '$\\sqrt{12}\\cdot\\sqrt{27}$ kaçtır?',
          options: ['$18$', '$\\sqrt{39}$', '$6\\sqrt3$'], answer: 0,
          hints: ['$\\sqrt{12\\cdot27}$.', '$324=18^2$.', '$18$.'],
          feedback: ['$2\\sqrt3\\cdot3\\sqrt3=6\\cdot3$.', 'Çarpımda kök içleri çarpılır, toplanmaz.', '$\\sqrt3\\cdot\\sqrt3=3$; tam sayı çıkar.'],
        },
        {
          id: 'disi-mutlak', level: 'İşaret', text: '$x<0$ ise $\\sqrt{x^2}+|x|$ neye eşittir?',
          options: ['$-2x$', '$2x$', '$0$'], answer: 0,
          hints: ['$\\sqrt{x^2}=|x|$.', '$x<0$: $|x|=-x$.', '$-x-x$.'],
          feedback: ['$-2x$ pozitif.', '$2x$ negatif; kök ve mutlak değer negatif olamaz.', 'İkisi de $-x$; toplam 0 değil.'],
        },
      ],
      real: [
        { code: 'TYT-0635', answer: 'A', from: 'uslu-ifadeler', why: 'Karesiz kısımları aynı olan kökleri eşle: $\\sqrt8\\sqrt{18}$, $\\sqrt{12}\\sqrt{27}$, $\\sqrt5\\sqrt{20}$.' },
        { code: 'TYT-0639', answer: 'C', from: 'uslu-ifadeler', why: '$A\\sqrt B=C\\sqrt D\\iff A^2B=C^2D$; dört farklı sayıyla dene.' },
        { code: 'TYT-0645', answer: 'E', from: 'uslu-ifadeler', why: '$a\\sqrt b\\pm\\sqrt b$ ortak $\\sqrt b$ parantezi: $3\\sqrt b-\\sqrt b=12$.' },
      ],
    },
    {
      id: 'tahmin', label: 'Kökü yerleştir', short: 'Hangi iki tam sayı arasında?',
      objective: 'Kökü ardışık tam kareler arasına yerleştirir; katsayılı kökleri kök içine alarak sıralar.',
      misconception: '$\\sqrt{30}$’u 15 civarı sanmak (yarıya bölmek); $2\\sqrt7$ ile $3\\sqrt3$’ü katsayıya bakarak sıralamak.',
      story: 'Alanı 30 m² olan kare bir oda; kenarı 5 m mi, 6 m mi, arada bir yerde mi? Duvar kâğıdı almadan tahmin et.',
      predict: {
        question: '$\\sqrt{30}$ hangi iki tam sayı arasındadır?',
        options: ['5 ile 6', '15 ile 16', '4 ile 5'],
        insight: [
          'Doğru: $25<30<36$.',
          'Kök almak yarıya bölmek değildir; $15^2=225$.',
          '$5^2=25<30$; 5’ten büyük.',
        ],
      },
      experiment: {
        prompt: '$n$’yi değiştir; $\\sqrt n$’in 5 ile 6 arasında olduğu **en büyük** tam sayı $n$’yi bul.',
        view: 'root-line', visualLabel: 'Sayı doğrusu: tam kareler ve √n',
        controls: [{ key: 'n', label: '$n$', min: 1, max: 50, step: 1 }],
        initial: { n: 20 },
        compute: ({ n }) => ({ n, s: Math.sqrt(n), lo: Math.floor(Math.sqrt(n)) }),
        readout: (_, r) => [['$\\sqrt n$', fmt(r.s, 3)], ['Aralık', Number.isInteger(r.s) ? `tam kare: ${r.s}` : `${r.lo} ile ${r.lo + 1} arası`]],
        target: {
          text: 'Hedef: $5<\\sqrt n<6$ ve $n$ en büyük.',
          test: (_, r) => r.n === 35,
          example: { n: 35 },
          hint: '$6^2=36$; 36 dahil olursa kök 6 olur.',
        },
        diagnose: (_, r) => (r.s >= 6 ? `$\\sqrt{${r.n}}\\ge6$: çok büyük.` : r.s <= 5 ? `$\\sqrt{${r.n}}\\le5$: daha büyük $n$ dene.` : `$\\sqrt{${r.n}}$ 5 ile 6 arasında ama daha büyük $n$ var.`),
        success: '$n=35$: $25<35<36$. 26’dan 35’e 10 tam sayı bu aralıkta.',
      },
      reasons: [
        {
          question: '$\\sqrt{30}$ neden 5 ile 6 arasında?',
          options: ['$25<30<36$ ve karekök büyük sayıya büyük değer verir.', '$30/6=5$ olduğu için.', '30 tek sayı olmadığı için.'],
          answer: 0,
          feedback: ['', 'Bölme ile kök farklı işlemler; $\\sqrt{30}\\neq5$.', 'Teklik konu değil; kök, ardışık tam kareler arasına yerleştirilir.'],
        },
        {
          question: '$2\\sqrt7$ ile $3\\sqrt3$’ten hangisi büyük?',
          options: ['$2\\sqrt7=\\sqrt{28}>\\sqrt{27}=3\\sqrt3$', '$3\\sqrt3$; katsayısı büyük.', 'Eşittir.'],
          answer: 0,
          feedback: ['', 'Katsayı ile kök içi birlikte etkiler; kök içine alarak karşılaştır.', '$\\sqrt{28}\\neq\\sqrt{27}$; kök içleri farklı.'],
        },
      ],
      proof: '$0\\le a<b\\Rightarrow\\sqrt a<\\sqrt b$ (karekök artandır). $k^2<n<(k+1)^2\\Rightarrow k<\\sqrt n<k+1$. $a\\sqrt b=\\sqrt{a^2b}$ ($a\\ge0$) ile katsayılar kök içine alınır.',
      rule: 'Kökü ardışık tam karelerle sıkıştır; sıralamada katsayıları kök içine al.',
      condition: 'Negatif katsayılı ifadelerde işareti ayrı düşün; kök içine yalnız pozitif katsayı girer.',
      trap: 'Kökü sayının yarısı sanmak; yalnız katsayıya bakmak.',
      transfer: [
        {
          id: 'tahmin-sira', level: 'Yakın alıştırma', text: '$2\\sqrt7$, $3\\sqrt3$ ve $5$ küçükten büyüğe nasıl sıralanır?',
          options: ['$5<3\\sqrt3<2\\sqrt7$', '$3\\sqrt3<5<2\\sqrt7$', '$2\\sqrt7<3\\sqrt3<5$'], answer: 0,
          hints: ['Hepsini kök içine al.', '$\\sqrt{28}$, $\\sqrt{27}$, $\\sqrt{25}$.', '$25<27<28$.'],
          feedback: ['$\\sqrt{25}<\\sqrt{27}<\\sqrt{28}$.', '$5=\\sqrt{25}$ en küçük.', 'Ters sıra: en büyük $\\sqrt{28}$’i en küçük yazdın.'],
        },
        {
          id: 'tahmin-aralik', level: 'Aralıkta seçim', text: 'Aşağıdakilerden hangisi 3 ile 3,5 arasındadır?',
          options: ['$\\sqrt{10}$', '$\\sqrt8$', '$\\sqrt{13}$'], answer: 0,
          hints: ['Kareleri: 9 ve 12,25.', '9 ile 12,25 arasındaki kök içi.', '10.'],
          feedback: ['$9<10<12{,}25$.', '$8<9$ olduğu için $\\sqrt8<3$; aralığın dışında.', '$13>12{,}25$: 3,5’ten büyük.'],
        },
        {
          id: 'tahmin-kare', level: 'Sayım', text: '$10<n<50$ olmak üzere $\\sqrt n$ kaç farklı $n$ için tam sayıdır?',
          options: ['$4$', '$3$', '$5$'], answer: 0,
          hints: ['Tam kareleri say.', '16, 25, 36, 49.', '4 tane.'],
          feedback: ['16, 25, 36, 49.', '49’u unuttun; o da 50’den küçük bir tam kare.', '9 ve 64 aralığın dışında.'],
        },
      ],
      real: [
        { code: 'TYT-0631', answer: 'B', from: 'uslu-ifadeler', why: 'Süs 1,5 ile 2 m arasında: hangi kök bu aralığa düşer? Kareleri 2,25 ile 4 arası.' },
        { code: 'TYT-0647', answer: 'D', from: 'uslu-ifadeler', why: 'İç kökler tam sayı: toplam 22; hangisi çıkarılınca kalan tam kare olur?' },
      ],
    },
    {
      id: 'eslenik', label: 'Eşlenik', short: '(a+√b)(a−√b) = a² − b',
      objective: 'Paydadaki iki terimli köklü ifadeyi eşleniğiyle genişletip rasyonel yapar; eşlenik çarpımının iki kare farkı olduğunu açıklar.',
      misconception: 'Aynı ifadeyle genişletmek ($(\\sqrt3+1)^2$) ya da yalnız kökle çarpmak.',
      story: 'Hesap makinesi yokken $\\tfrac2{\\sqrt3+1}$’i ondalığa çevirmek zor. Paydayı tam sayı yaparsan iş kolaylaşır. Hangi sayıyla genişletmelisin?',
      predict: {
        question: '$\\dfrac2{\\sqrt3+1}$’in paydasını rasyonel yapmak için pay ve payda hangi ifadeyle çarpılır?',
        options: ['$\\sqrt3-1$', '$\\sqrt3+1$', '$\\sqrt3$'],
        insight: [
          'Doğru: $(\\sqrt3+1)(\\sqrt3-1)=3-1=2$.',
          '$(\\sqrt3+1)^2=4+2\\sqrt3$; kök kalır.',
          '$(\\sqrt3+1)\\sqrt3=3+\\sqrt3$; kök kalır.',
        ],
      },
      experiment: {
        prompt: 'Genişletme çarpanını seç; payda rasyonel olsun.',
        view: 'conjugate', visualLabel: 'Payda × çarpan = p + q√3',
        controls: [{ key: 'c', label: 'Pay ve paydayı neyle çarpıyorsun?', options: CONJ }],
        initial: { c: 'p' },
        compute: ({ c }) => ({ c, ...rationalize(c) }),
        readout: (_, r) => [['Yeni payda', `$${r.den[0]}${r.den[1] ? `+${r.den[1]}\\sqrt3` : ''}$`], ['Rasyonel mi?', r.rational ? 'evet' : 'hayır, kök kaldı']],
        target: {
          text: 'Hedef: paydada kök kalmasın.',
          test: (_, r) => r.rational,
          example: { c: 'm' },
          hint: '$(a+b)(a-b)=a^2-b^2$: kare alınınca kök kaybolur.',
        },
        diagnose: (_, r) => `Payda $${r.den[0]}+${r.den[1]}\\sqrt3$ oldu; $\\sqrt3$ terimi sıfırlanmadı. İşaretleri zıt olan ikinciyi dene.`,
        success: '$\\tfrac{2(\\sqrt3-1)}{3-1}=\\sqrt3-1$.',
      },
      reasons: [
        {
          question: 'Neden $\\sqrt3-1$?',
          options: ['$(\\sqrt3+1)(\\sqrt3-1)=(\\sqrt3)^2-1^2=2$; kökler sadeleşir.', 'İfadeyi küçültmek için.', 'Paydadaki 1’i yok etmek için.'],
          answer: 0,
          feedback: ['', 'Küçültmek değil, kökü yok etmek amaç.', '1 değil kök yok ediliyor: iki kare farkı.'],
        },
        {
          question: '$(\\sqrt5-\\sqrt3)(\\sqrt5+\\sqrt3)$ kaçtır?',
          options: ['$2$', '$\\sqrt2$', '$8$'],
          answer: 0,
          feedback: ['', 'Kareler: $5-3$; kök kalmaz.', '$5+3$: işaret çıkarma.'],
        },
      ],
      proof: '$(a+\\sqrt b)(a-\\sqrt b)=a^2-(\\sqrt b)^2=a^2-b$: çapraz terimler $\\pm a\\sqrt b$ birbirini götürür. Kesrin pay ve paydasını aynı sayıyla çarpmak değeri değiştirmez.',
      rule: 'Paydada $a\\pm\\sqrt b$ ya da $\\sqrt a\\pm\\sqrt b$ varsa ortadaki işareti ters çevrilmiş eşleniğiyle genişlet.',
      condition: 'Eşlenik sıfır olmamalı ($a^2\\neq b$). Paydada tek terimli kök varsa ($\\sqrt3$) kendisiyle genişletmek yeter.',
      trap: 'Yalnız paydayı çarpmak; aynı işaretle genişletmek.',
      transfer: [
        {
          id: 'es-yakin', level: 'Yakın alıştırma', text: '$\\dfrac1{\\sqrt5-2}$ neye eşittir?',
          options: ['$\\sqrt5+2$', '$\\sqrt5-2$', '$\\dfrac{\\sqrt5+2}{9}$'], answer: 0,
          hints: ['Eşlenik: $\\sqrt5+2$.', 'Payda: $5-4=1$.', 'Sonuç $\\sqrt5+2$.'],
          feedback: ['Payda 1 oldu.', 'Bu, sayının tersi değil kendisi.', 'Payda $5-4=1$, 9 değil.'],
        },
        {
          id: 'es-teleskop', level: 'Yapıyı fark et', text: '$\\dfrac1{\\sqrt2+1}+\\dfrac1{\\sqrt3+\\sqrt2}+\\dfrac1{2+\\sqrt3}$ kaçtır?',
          options: ['$1$', '$\\sqrt3$', '$2$'], answer: 0,
          hints: ['Her terimi eşleniğiyle genişlet; paydalar 1 olur.', '$(\\sqrt2-1)+(\\sqrt3-\\sqrt2)+(2-\\sqrt3)$.', 'Ara terimler götürür.'],
          feedback: ['$2-1=1$.', 'Ara terimler sadeleşir; $\\sqrt3$ kalmaz.', 'Son terim 2 ama başta $-1$ var.'],
        },
        {
          id: 'es-carpim', level: 'İki kare farkı', text: '$(2\\sqrt3-1)(2\\sqrt3+1)$ kaçtır?',
          options: ['$11$', '$13$', '$5$'], answer: 0,
          hints: ['$(2\\sqrt3)^2-1^2$.', '$12-1$.', '11.'],
          feedback: ['$12-1=11$.', 'Toplama değil çıkarma.', '$(2\\sqrt3)^2=12$, 6 değil.'],
        },
      ],
      realNote: 'Kategorideki eşlenik sorusu (TYT-0637) derste çözüldü; diğer bankalarda görseli okunmuş uygun soru bulunmadı.',
    },
    {
      id: 'denklem', label: 'Köklü denklem', short: 'Kare al, adayı denetle',
      objective: 'Köklü denklemi kare alarak çözer; her adayı tanım alanı ve asıl denklemle denetleyip sahte kökü eler.',
      misconception: 'Kare alındıktan sonra bulunan bütün adayları kök saymak; karekökün negatif değer alabileceğini sanmak.',
      story: 'Bir bahçenin alanı $x+6$, kare olduğu için kenarı $\\sqrt{x+6}$. Kenarın $x$’e eşit olduğu söyleniyor. Kare almak iki aday verir; ikisi de mümkün mü?',
      predict: {
        question: '$\\sqrt{x+6}=x$ denkleminin kaç çözümü vardır?',
        options: ['$1$', '$2$', '$0$'],
        insight: [
          'Doğru: adaylar 3 ve $-2$; $-2$ için sol taraf 2, sağ taraf $-2$.',
          '$x^2-x-6=0$ iki aday verir ama $x=-2$ asıl denklemi sağlamaz.',
          '$x=3$: $\\sqrt9=3$ ✓.',
        ],
      },
      experiment: {
        prompt: '$x$’i dene; sol ve sağ tarafın gerçekten eşit olduğu çözümü bul.',
        view: 'root-eq', visualLabel: 'y = √(x+6) ve y = x',
        controls: [{ key: 'x', label: '$x$', min: -6, max: 6, step: 1 }],
        initial: { x: -2 },
        compute: ({ x }) => ({ x, lhs: Math.sqrt(x + 6), rhs: x, sq: x + 6 === x * x }),
        readout: (_, r) => [['$\\sqrt{x+6}$', fmt(r.lhs, 3)], ['$x$', fmt(r.rhs)], ['Kare alınmış denklem', r.sq ? '$x+6=x^2$ sağlanıyor' : 'sağlanmıyor']],
        target: {
          text: 'Hedef: $\\sqrt{x+6}=x$ gerçekten sağlansın.',
          test: (_, r) => Math.abs(r.lhs - r.rhs) < 1e-12,
          example: { x: 3 },
          hint: 'Kök değeri negatif olamaz; aday $x\\ge0$ olmalı.',
        },
        diagnose: (_, r) => (r.sq ? `Sahte kök: $x=${r.x}$ kare alınmış denklemi sağlıyor ama $\\sqrt{${r.x + 6}}=${fmt(r.lhs)}\\neq${r.x}$.` : `$\\sqrt{${r.x + 6}}=${fmt(r.lhs, 2)}$, sağ taraf ${r.x}: eşit değil.`),
        success: '$x=3$: $\\sqrt9=3$. $x=-2$ kare alma ile gelen sahte kök.',
      },
      reasons: [
        {
          question: '$x=-2$ neden kök değil?',
          options: ['Karekök negatif olamaz; $\\sqrt4=2$ ama sağ taraf $-2$.', 'Kök içi negatif olduğu için.', '$-2$ tam sayı olmadığı için.'],
          answer: 0,
          feedback: ['', 'Kök içi $-2+6=4$ pozitif; sorun sağ tarafın negatif olması.', '$-2$ tam sayıdır; sorun tam sayılık değil, işaret.'],
        },
        {
          question: 'Kare almak neden sahte kök üretebilir?',
          options: ['$a=b\\Rightarrow a^2=b^2$ ama $a^2=b^2$, $a=-b$ iken de doğrudur.', 'Kare almak her zaman yanlış sonuç verir.', 'Hesap hatası yüzünden.'],
          answer: 0,
          feedback: ['', '$x=3$ doğru kök; kare almak doğru kökü korur, fazladan aday ekleyebilir.', 'Hesap doğru; mantıksal yön tek taraflı.'],
        },
      ],
      proof: '$\\sqrt{x+6}=x\\Rightarrow x+6=x^2\\Rightarrow(x-3)(x+2)=0$. Ters yön yalnız $x\\ge0$ iken geçerli ($\\sqrt{x^2}=|x|$). Bu yüzden $x=3$ kök, $x=-2$ değil.',
      rule: 'Kare almadan önce koşulları yaz (kök içi $\\ge0$, kökle eşit taraf $\\ge0$); sonunda her adayı asıl denklemde dene.',
      condition: 'Kare alma iki tarafın da aynı işarette olduğu bilinmiyorsa denklik değildir.',
      trap: 'Bütün adayları cevap saymak; yalnız kök içi koşuluna bakıp sağ tarafın işaretini unutmak.',
      transfer: [
        {
          id: 'kd-yakin', level: 'Yakın alıştırma', text: '$\\sqrt{2x+1}=3$ ise $x$ kaçtır?',
          options: ['$4$', '$1$', '$5$'], answer: 0,
          hints: ['Kare al.', '$2x+1=9$.', '$x=4$.'],
          feedback: ['$\\sqrt9=3$ ✓.', '$2x+1=3$ ile çözdün; kare almayı unuttun.', '$2\\cdot5+1=11\\neq9$; kare almada 9 gerekir.'],
        },
        {
          id: 'kd-tanim', level: 'Tanım alanı', text: '$\\sqrt{x-2}+\\sqrt{2-x}=x+1$ denkleminin çözüm kümesi nedir?',
          options: ['Boş küme', '$\\{2\\}$', '$\\{-1\\}$'], answer: 0,
          hints: ['İki kök için $x\\ge2$ ve $x\\le2$.', 'Yalnız $x=2$ tanımlı.', '$0+0=3$? Hayır.'],
          feedback: ['Tek tanımlı nokta 2, sağlamıyor.', '$x=2$ tanımlı ama sol 0, sağ 3: sağlamıyor.', '$x=-1$ tanımlı değil.'],
        },
        {
          id: 'kd-aday', level: 'Adayları ele', text: '$\\sqrt{x+1}=x-1$ denkleminin çözüm kümesi nedir?',
          options: ['$\\{3\\}$', '$\\{0,\\,3\\}$', '$\\{0\\}$'], answer: 0,
          hints: ['Kare al: $x+1=x^2-2x+1$.', 'Adaylar 0 ve 3.', '$x=0$: $1=-1$? Hayır.'],
          feedback: ['$\\sqrt4=2=3-1$ ✓.', '$x=0$ sahte: sağ taraf negatif.', '$x=0$ sahte kök: $\\sqrt1=1$ ama sağ taraf $-1$.'],
        },
      ],
      realNote: 'Kategorideki köklü denklem/tanım alanı soruları derste çözüldü (TYT-0643 tanım aralığı); bankalarda görseli okunmuş başka uygun soru yok.',
    },
  ],
};
