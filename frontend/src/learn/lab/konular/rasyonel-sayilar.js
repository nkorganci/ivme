// Rasyonel Sayılar laboratuvarı: ortak bölme ile kesir toplama, eş aralıklı ölçek okuma (ondalık), devirli ondalığı
// kesre çevirme, kesir sıralama ve ara kesir. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt, frac, fracText, gcd } from '../sayi.js';

export const SCALE = { from: 20, to: 30, parts: 8 };
export const repeatValue = (a, b) => frac(10 * a + b, 99);

export default {
  conceptId: 'rasyonel-sayilar',
  title: 'Rasyonel Sayılar ve Ondalık Sayılar',
  exam: 'TYT + AYT',
  hero: { title: 'Parça mı, sayı mı?', text: 'Kesri parçalara böl, ölçeği oku, devreden basamakları yakala. Her kesir sayı doğrusunda bir nokta.', art: ['1/3', '+', '1/4'] },
  goals: [
    {
      id: 'kesir-islem', label: 'Ortak bölme', short: 'Aynı büyüklükte parçalar',
      objective: 'Farklı paydalı kesirleri ortak bölmeye (EKOK) getirip toplar/çıkarır; “kalanın kesri” ile “bütünün kesri”ni ayırır.',
      misconception: 'Payları ve paydaları ayrı ayrı toplamak ($\\tfrac13+\\tfrac14=\\tfrac27$); kalanın kesrini bütünün kesri gibi almak.',
      story: 'Bir pizzanın üçte birini sen, dörtte birini kardeşin yedi. Birlikte ne kadar yediniz? Parçalar aynı büyüklükte değil.',
      predict: {
        question: '$\\dfrac13+\\dfrac14$ kaça eşittir?',
        options: ['$\\dfrac7{12}$', '$\\dfrac27$', '$\\dfrac17$'],
        insight: [
          'Doğru: ikisini de 12’lik parçalarla yazınca $\\tfrac4{12}+\\tfrac3{12}$.',
          '$\\tfrac27\\approx0{,}29$, ama $\\tfrac13$ tek başına $0{,}33$. Toplam bir terimden küçük olamaz.',
          '$\\tfrac17$ iki kesrin de her birinden küçük; toplam olamaz.',
        ],
      },
      experiment: {
        prompt: 'Bütünü kaç eş parçaya böleceğini seç; $\\tfrac13$ ve $\\tfrac14$’ü **aynı parçalarla** gösteren en küçük bölmeyi bul.',
        view: 'parts', visualLabel: 'İki şerit, aynı ızgara',
        controls: [{ key: 'n', label: 'Bütün kaç parça?', min: 2, max: 24, step: 1 }],
        initial: { n: 6 },
        compute: ({ n }) => ({ n, fit3: n % 3 === 0, fit4: n % 4 === 0, p3: n / 3, p4: n / 4 }),
        readout: (_, r) => [['$\\tfrac13$', r.fit3 ? `$\\tfrac{${r.p3}}{${r.n}}$` : 'parça sınırına denk gelmiyor'], ['$\\tfrac14$', r.fit4 ? `$\\tfrac{${r.p4}}{${r.n}}$` : 'parça sınırına denk gelmiyor'],
          ['Toplam', r.fit3 && r.fit4 ? `$\\tfrac{${r.p3 + r.p4}}{${r.n}}$` : '—']],
        target: {
          text: 'Hedef: iki kesir de tam parçalarla yazılsın, parça sayısı en küçük olsun.',
          test: (_, r) => r.n === 12,
          example: { n: 12 },
          hint: 'Parça sayısı 3’e de 4’e de bölünmeli. Ortak katların en küçüğü?',
        },
        diagnose: (_, r) => !r.fit3 || !r.fit4 ? `${r.n} parçada ${!r.fit3 ? '$\\tfrac13$' : '$\\tfrac14$'} parça sınırına denk gelmiyor; $n$ ${!r.fit3 ? '3’ün' : '4’ün'} katı olmalı.` : `${r.n} parça çalışıyor ($\\tfrac{${r.p3 + r.p4}}{${r.n}}$) ama daha küçük ortak bölme var.`,
        success: '12 parça: $\\tfrac4{12}+\\tfrac3{12}=\\tfrac7{12}$. Ortak payda = EKOK$(3,4)$.',
      },
      reasons: [
        {
          question: 'Neden payları ve paydaları ayrı ayrı toplayamayız?',
          options: ['Payda parça büyüklüğünü söyler; farklı büyüklükteki parçalar önce aynı büyüklüğe bölünmeli.', 'Toplayabiliriz; yalnız sonucu sadeleştirmek gerekir.', 'Paydalar asal değilse toplanamaz.'],
          answer: 0,
          feedback: ['', '$\\tfrac27$ sadeleşmez ve $\\tfrac13$’ten küçük; yöntem yanlış, sadeleştirme kurtarmaz.', '$\\tfrac12+\\tfrac13$’te paydalar asal ama yine ortak bölme gerekir.'],
        },
        {
          question: 'Ortak bölme neden 12?',
          options: ['Hem 3’ün hem 4’ün katı olan en küçük sayı: EKOK$(3,4)=12$.', '$3+4+5=12$.', '12 her zaman ortak paydadır.'],
          answer: 0,
          feedback: ['', 'Toplama tesadüf; $\\tfrac16+\\tfrac14$ için ortak bölme 12, $6+4+2$ değil EKOK.', '$\\tfrac15+\\tfrac12$ için 10 gerekir.'],
        },
      ],
      proof: '$\\tfrac ab+\\tfrac cd$: iki kesri de $m=$EKOK$(b,d)$ parçayla yaz: $\\tfrac{a\\,(m/b)+c\\,(m/d)}{m}$. Parçalar aynı büyüklükte olunca sayılar toplanabilir.',
      rule: 'Paydaları EKOK’ta eşitle, payları topla. Kalanın kesri: önce kalanı bul, sonra onun kesrini al.',
      condition: 'Toplama/çıkarmada geçerli. Çarpmada ortak payda gerekmez: $\\tfrac ab\\cdot\\tfrac cd=\\tfrac{ac}{bd}$.',
      trap: 'Pay + pay / payda + payda; “kalanın $\\tfrac13$’ü”nü bütünün $\\tfrac13$’ü sanmak.',
      transfer: [
        {
          id: 'kesir-yakin', level: 'Yakın alıştırma', text: '$\\dfrac25+\\dfrac13$ kaçtır?',
          options: ['$\\dfrac{11}{15}$', '$\\dfrac38$', '$\\dfrac3{15}$'], answer: 0,
          hints: ['EKOK$(5,3)=15$.', '$\\tfrac25=\\tfrac6{15}$, $\\tfrac13=\\tfrac5{15}$.', '$\\tfrac{6+5}{15}$.'],
          feedback: ['$\\tfrac6{15}+\\tfrac5{15}=\\tfrac{11}{15}$.', 'Pay ve paydaları ayrı topladın.', 'Paylar genişletilmeden toplandı: $2+1$.'],
        },
        {
          id: 'kesir-kalan', level: 'Kalanın kesri', text: 'Bir pastanın $\\tfrac14$’ü yendi, sonra **kalanın** $\\tfrac13$’ü yendi. Pastanın ne kadarı kaldı?',
          options: ['$\\dfrac12$', '$\\dfrac5{12}$', '$\\dfrac23$'], answer: 0,
          hints: ['İlkinden sonra kalan $\\tfrac34$.', 'Kalanın $\\tfrac13$’ü: $\\tfrac34\\cdot\\tfrac13=\\tfrac14$.', 'Kalan $\\tfrac34-\\tfrac14=\\tfrac12$.'],
          feedback: ['$\\tfrac34\\cdot\\tfrac23=\\tfrac12$.', '$1-\\tfrac14-\\tfrac13$: ikinci kesri bütünden aldın; soru kalanın kesrini istiyor.', '$\\tfrac23$ kalanın kalan kısmı oranı; bütüne göre $\\tfrac34\\cdot\\tfrac23$.'],
        },
        {
          id: 'kesir-teleskop', level: 'Yapıyı fark et', text: '$\\dfrac1{1\\cdot2}+\\dfrac1{2\\cdot3}+\\dots+\\dfrac1{9\\cdot10}$ toplamı kaçtır?',
          options: ['$\\dfrac9{10}$', '$\\dfrac1{10}$', '$\\dfrac{10}9$'], answer: 0,
          hints: ['$\\tfrac1{n(n+1)}=\\tfrac1n-\\tfrac1{n+1}$.', 'Ardışık terimler birbirini götürür.', 'Geriye $1-\\tfrac1{10}$ kalır.'],
          feedback: ['$1-\\tfrac1{10}=\\tfrac9{10}$.', 'Kalan yalnız son terim değil; $1-\\tfrac1{10}$.', 'Toplam 1’den küçük; her terim pozitif ama $1-\\tfrac1{10}$ sınırında kalır.'],
        },
      ],
      real: [
        { code: 'TYT-0568', answer: 'D', from: 'temel-kavramlar', why: 'Nota süreleri $\\tfrac12,\\tfrac14,\\tfrac18,\\tfrac1{16}$: hepsini 16’lık parçalarla topla.' },
        { code: 'TYT-0580', answer: 'D', from: 'temel-kavramlar', why: '12 bölmenin $\\tfrac23$’ü 8 simge; aynı 8 simge 30 bölmenin kaçta kaçı?' },
      ],
    },
    {
      id: 'olcek', label: 'Ölçek okuma', short: 'Eş aralık = fark ÷ bölme',
      objective: 'İki etiket arasındaki eş bölmelerden bir bölmenin değerini (ondalık) bulur, istenen işareti okur/konumlandırır; çizgi ile aralık sayısını karıştırmaz.',
      misconception: 'Çizgi sayısını bölme sayısı sanmak; bir bölmeyi 1 birim saymak.',
      story: 'Bir termometrede 20 ile 30 arasında 8 eş bölme var. Kırmızı sıvı 6. çizgide. Hava kaç derece?',
      predict: {
        question: '20 ile 30 arası 8 eş bölmeye ayrılmış. Bir bölme kaç birimdir?',
        options: ['$1{,}25$', '$1{,}2$', '$0{,}8$'],
        insight: [
          'Doğru: $10\\div8=1{,}25$.',
          '$1{,}2$ yaklaşık; $8\\cdot1{,}2=9{,}6\\neq10$.',
          '$8\\div10$ ters bölme; bölme sayısı paydaya gelir.',
        ],
      },
      experiment: {
        prompt: 'İbreyi çizgi çizgi kaydır; **27,5**’i gösteren çizgiyi bul.',
        view: 'scale', visualLabel: '20–30 arası 8 eş bölme',
        controls: [{ key: 'k', label: '20’den sonra kaçıncı çizgi?', min: 0, max: 8, step: 1 }],
        initial: { k: 3 },
        compute: ({ k }) => { const step = (SCALE.to - SCALE.from) / SCALE.parts; return { k, step, value: SCALE.from + k * step }; },
        readout: (_, r) => [['Bir bölme', fmt(r.step)], ['Gösterilen', fmt(r.value)], ['Hesap', `$20+${r.k}\\cdot1{,}25$`]],
        target: {
          text: 'Hedef: ibre 27,5’i göstersin.',
          test: (_, r) => r.value === 27.5,
          example: { k: 6 },
          hint: '$27{,}5-20=7{,}5$. Bu kaç tane $1{,}25$’lik bölme?',
        },
        diagnose: (_, r) => `${r.k}. çizgi $20+${r.k}\\cdot1{,}25=${fmt(r.value)}$ gösteriyor. ${r.value < 27.5 ? 'Biraz daha ileri.' : 'Biraz geri.'}`,
        success: '$7{,}5\\div1{,}25=6$ bölme: 6. çizgi.',
      },
      reasons: [
        {
          question: 'Bir bölme neden $1{,}25$?',
          options: ['Etiketler arasındaki fark 10, 8 eş parçaya bölünür: $10\\div8$.', 'Her bölme 1 derecedir.', '10 çizgi var, her biri 1.'],
          answer: 0,
          feedback: ['', '8 bölmeyle 1’er artış 28’e ulaşır, 30’a değil.', 'Çizgileri değil aralıkları say: 8 aralık, 9 çizgi.'],
        },
        {
          question: '8 eş bölmede kaç çizgi vardır?',
          options: ['9 (iki uç dahil)', '8', '7'],
          answer: 0,
          feedback: ['', '8 aralığı sınırlamak için uçlar dahil 9 çizgi gerekir.', '7 yalnız aradaki çizgiler; uçları da say.'],
        },
      ],
      proof: 'Eş aralıklı ölçekte değer çizgi numarasının doğrusal fonksiyonudur: $v=a+k\\cdot\\tfrac{b-a}{n}$. $a=20$, $b=30$, $n=8$: $v=27{,}5\\iff k=6$.',
      rule: 'Bir bölme $=\\dfrac{\\text{etiket farkı}}{\\text{bölme sayısı}}$; okuma $=$ başlangıç $+$ bölme sayısı $\\times$ bir bölme.',
      condition: 'Bölmeler eş olmalı ve etiketler aynı birimde. Ölçek doğrusal değilse (logaritmik) geçmez.',
      trap: 'Çizgi sayısını bölme sayısı sanmak; ara etiketleri ihmal edip yanlış aralıkta saymak.',
      transfer: [
        {
          id: 'olcek-yakin', level: 'Yakın alıştırma', text: '0 ile 1 arası 4 eş bölmeye ayrılmış. 0’dan sonraki 3. çizgi kaçı gösterir?',
          options: ['$0{,}75$', '$0{,}3$', '$0{,}6$'], answer: 0,
          hints: ['Bir bölme $1\\div4$.', '$0{,}25$’lik adımlar.', '$3\\cdot0{,}25$.'],
          feedback: ['$3\\cdot0{,}25=0{,}75$.', 'Çizgi numarası ondalık basamak değildir.', '$0{,}2$’lik adım 5 bölme için olurdu.'],
        },
        {
          id: 'olcek-ip', level: 'Ondalık bölme', text: '3,6 m’lik ip 0,45 m’lik eş parçalara kesiliyor. Kaç parça olur?',
          options: ['$8$', '$80$', '$0{,}8$'], answer: 0,
          hints: ['$3{,}6\\div0{,}45$.', 'İkisini 100 ile çarp: $360\\div45$.', '$45\\cdot8=360$.'],
          feedback: ['$0{,}45\\cdot8=3{,}6$.', 'Virgülü kaydırırken iki sayıyı da aynı katla çarp.', 'Parça sayısı 1’den küçük olamaz; ip parçadan uzun.'],
        },
        {
          id: 'olcek-negatif', level: 'Negatif ölçek', text: '−1 ile 1 arası 5 eş bölmeye ayrılmış. −1’den sonraki 2. çizgi kaçı gösterir?',
          options: ['$-0{,}2$', '$-0{,}6$', '$0{,}2$'], answer: 0,
          hints: ['Fark $1-(-1)=2$.', 'Bir bölme $0{,}4$.', '$-1+2\\cdot0{,}4$.'],
          feedback: ['$-1+0{,}8=-0{,}2$.', '$-0{,}6$ birinci çizgi.', 'Henüz sıfırı geçmedin.'],
        },
      ],
      real: [
        { code: 'TYT-0587', answer: 'C', why: 'Ondalık uzunlukları en kısaya göre farklar olarak topla: $1{,}1+2{,}4+3{,}2$.' },
        { code: 'TYT-0569', answer: 'A', why: '1,2 m’de 5 rafta 4, 6 rafta 5 eş aralık: raf yüksekliklerini aralık değeriyle oku.' },
      ],
    },
    {
      id: 'devirli', label: 'Devirli ondalık', short: '0,ababab… = ab/99',
      objective: 'Devirli ondalık sayıyı “kaydır ve çıkar” yöntemiyle kesre çevirir; devretmeyen basamak varsa 90, 990… paydalarını kurar.',
      misconception: '$0{,}\\overline{36}=\\tfrac{36}{100}$ sanmak; $0{,}\\overline9$’un 1’den küçük olduğunu düşünmek.',
      story: 'Hesap makinesi $4\\div11$ için $0{,}36363636$ gösteriyor ve ekran bitiyor. Bu sayı gerçekten bir kesir mi, yoksa ekran mı yetmiyor?',
      predict: {
        question: '$0{,}363636\\dots$ hangi kesre eşittir?',
        options: ['$\\dfrac4{11}$', '$\\dfrac9{25}$', '$\\dfrac{36}{100}$'],
        insight: [
          'Doğru: $\\tfrac{36}{99}=\\tfrac4{11}$.',
          '$\\tfrac9{25}=0{,}36$ tam; devirli sayı $0{,}36$’dan büyük.',
          '$\\tfrac{36}{100}=0{,}36$; devam eden basamakları atar.',
        ],
      },
      experiment: {
        prompt: 'Devreden iki rakamı seç; $\\tfrac4{11}$’e eşit devirli sayıyı kur.',
        view: 'repeat', visualLabel: '100x ile x’i alt alta yaz',
        controls: [{ key: 'a', label: 'Devreden 1. rakam', min: 0, max: 9, step: 1 }, { key: 'b', label: 'Devreden 2. rakam', min: 0, max: 9, step: 1 }],
        initial: { a: 1, b: 2 },
        compute: ({ a, b }) => { const f = repeatValue(a, b); return { a, b, f, decimal: `0,${`${a}${b}`.repeat(4)}…` }; },
        readout: (_, r) => [['$x$', r.decimal], ['$100x-x$', `$${r.a * 10 + r.b}$`], ['$x$ kesir', `$\\tfrac{${r.a * 10 + r.b}}{99}=${fracText(r.f).replace('−', '-')}$`]],
        target: {
          text: 'Hedef: $x=\\tfrac4{11}$.',
          test: (_, r) => r.f.n === 4 && r.f.d === 11,
          example: { a: 3, b: 6 },
          hint: '$\\tfrac4{11}$’i paydası 99 olacak biçimde genişlet.',
        },
        diagnose: (_, r) => `$\\overline{${r.a}${r.b}}$ için $x=\\tfrac{${r.a * 10 + r.b}}{99}=${fracText(r.f)}$. $\\tfrac4{11}=\\tfrac{?}{99}$ hesapla.`,
        success: '$100x-x=36$ → $x=\\tfrac{36}{99}=\\tfrac4{11}$.',
      },
      reasons: [
        {
          question: 'Payda neden 99?',
          options: ['$100x-x$ yapınca devreden kısımlar birbirini götürür: $99x=36$.', 'İki basamak devrettiği için 100’e bölünür.', '99, 100’e en yakın sayı olduğu için.'],
          answer: 0,
          feedback: ['', '100’e bölmek yalnız iki basamağı alır; devam eden basamaklar kaybolur.', 'Yaklaşıklık değil; $100x-x$ çıkarmasından gelir.'],
        },
        {
          question: '$0{,}\\overline9$ neden 1’e eşittir?',
          options: ['$10x-x=9$ → $x=1$; ayrıca 1 ile arasına başka sayı sığmaz.', 'Eşit değildir, 1’den çok az küçüktür.', 'Yuvarlama ile 1 kabul edilir.'],
          answer: 0,
          feedback: ['', 'Aradaki fark her basamakta 10 kat küçülür; pozitif bir sayı olamaz. Fark sıfırdır.', 'Yuvarlama değil, kesin eşitlik.'],
        },
      ],
      proof: '$x=0{,}\\overline{ab}$ ise $100x=ab{,}\\overline{ab}$; çıkarınca $99x=\\overline{ab}$. Devretmeyen $k$ basamak varsa önce $10^k$ ile çarpıp aynı yöntemi uygula: $0{,}a\\overline b=\\tfrac{\\overline{ab}-a}{90}$.',
      rule: '$0{,}\\overline{ab}=\\dfrac{ab}{99}$; $0{,}a\\overline{b}=\\dfrac{ab-a}{90}$ (devreden kadar 9, devretmeyen kadar 0).',
      condition: 'Devir sonsuza kadar sürmeli. Sonlu ondalık ($0{,}36$) için payda 100’dür.',
      trap: 'Devirli sayıyı sonlu ondalık gibi 10’un kuvvetine bölmek; $0{,}\\overline9<1$ sanmak.',
      transfer: [
        {
          id: 'devir-yakin', level: 'Yakın alıştırma', text: '$0{,}\\overline7$ kesir olarak kaçtır?',
          options: ['$\\dfrac79$', '$\\dfrac7{10}$', '$\\dfrac7{99}$'], answer: 0,
          hints: ['Tek basamak devrediyor: $10x-x$.', '$9x=7$.', '$x=\\tfrac79$.'],
          feedback: ['$10x-x=7$.', '$0{,}7$ sonlu; devirli sayı daha büyük.', '99 iki basamak devrederken.'],
        },
        {
          id: 'devir-karma', level: 'Devretmeyen basamak', text: '$0{,}2\\overline5$ kesir olarak kaçtır?',
          options: ['$\\dfrac{23}{90}$', '$\\dfrac{25}{99}$', '$\\dfrac{25}{90}$'], answer: 0,
          hints: ['$10x=2{,}\\overline5$, $100x=25{,}\\overline5$.', '$90x=25-2$.', '$x=\\tfrac{23}{90}$.'],
          feedback: ['$100x-10x=23$.', 'Yalnız 5 devrediyor; 2 devretmiyor.', 'Devretmeyen 2’yi çıkar: $25-2$.'],
        },
        {
          id: 'devir-toplam', level: 'İşlem', text: '$0{,}\\overline3+0{,}\\overline6$ kaçtır?',
          options: ['$1$', '$\\dfrac9{10}$', '$\\dfrac{99}{100}$'], answer: 0,
          hints: ['Her birini kesre çevir.', '$\\tfrac39+\\tfrac69$.', '$\\tfrac99=1$.'],
          feedback: ['$\\tfrac13+\\tfrac23=1$.', '$0{,}9$ sonlu; toplam $0{,}\\overline9=1$.', 'Devirli toplam sonlu ondalık değildir.'],
        },
      ],
      realNote: 'Konunun bankasındaki 12 ÖSYM sorusunun görselleri tarandı; devirli ondalık soran soru yok (5’i derste çözülmüş). Aktarım özgün alıştırmalarla yapılır.',
    },
    {
      id: 'siralama', label: 'Sıralama ve ara kesir', short: 'İki kesir arasında hep bir kesir',
      objective: 'Kesirleri ortak payda, çapraz çarpım ya da 1’e uzaklıkla sıralar; iki kesir arasında yeni bir kesir (ara kesir) bulur.',
      misconception: '“Paydası büyük olan küçüktür” kuralını payları farklı kesirlere uygulamak; ardışık görünen kesirlerin arasında sayı olmadığını sanmak.',
      story: 'İki pastanede çikolata oranı $\\tfrac56$ ve $\\tfrac67$. Aralarında bir oran isteyen müşteriye hangi tarifi önerirsin?',
      predict: {
        question: '$\\dfrac56$ ile $\\dfrac67$ arasında kesir var mıdır?',
        options: ['Yok; bunlar ardışık kesirler.', 'Sonsuz çok vardır.', 'Yalnız bir tane vardır.'],
        insight: [
          'Deneyde $\\tfrac{11}{13}$ arada çıktı. Rasyoneller yoğundur; “ardışık kesir” yoktur.',
          'Doğru: her iki kesrin arasına yeni bir kesir sığar, yani sonsuz çok.',
          'Paydayı büyütürsen başkaları da çıkar: $\\tfrac{21}{25}$ gibi.',
        ],
      },
      experiment: {
        prompt: 'Pay ve paydayı seç; paydası en çok 15 olan, $\\tfrac56$ ile $\\tfrac67$ arasında bir kesir bul.',
        view: 'between', visualLabel: 'Sayı doğrusu (0,8 – 0,9 arası büyütülmüş)',
        controls: [{ key: 'q', label: 'Payda', min: 2, max: 15, step: 1 }, { key: 'p', label: 'Pay', min: 1, max: 15, step: 1 }],
        initial: { q: 10, p: 8 },
        compute: ({ p, q }) => ({ p, q, v: p / q, inside: 5 * q < 6 * p && 7 * p < 6 * q, simple: frac(p, q) }),
        readout: (_, r) => [['Kesir', `$\\tfrac{${r.p}}{${r.q}}=${fmt(r.v, 3)}$`], ['$\\tfrac56$ ile', 5 * r.q < 6 * r.p ? 'büyük' : 5 * r.q === 6 * r.p ? 'eşit' : 'küçük'], ['$\\tfrac67$ ile', 7 * r.p < 6 * r.q ? 'küçük' : 7 * r.p === 6 * r.q ? 'eşit' : 'büyük']],
        target: {
          text: 'Hedef: $\\tfrac56<\\tfrac pq<\\tfrac67$.',
          test: (_, r) => r.inside,
          example: { q: 13, p: 11 },
          hint: 'Payları ve paydaları toplamayı dene: $\\tfrac{5+6}{6+7}$. Bu “ara kesir” her zaman iki kesrin arasındadır.',
        },
        diagnose: (_, r) => (5 * r.q >= 6 * r.p ? `$\\tfrac{${r.p}}{${r.q}}\\le\\tfrac56$: çapraz çarpım ${r.p}·6 = ${r.p * 6} ≤ ${r.q}·5 = ${r.q * 5}.` : `$\\tfrac{${r.p}}{${r.q}}\\ge\\tfrac67$: ${r.p}·7 = ${r.p * 7} ≥ ${r.q}·6 = ${r.q * 6}.`),
        success: '$\\tfrac{11}{13}\\approx0{,}846$: $0{,}833<0{,}846<0{,}857$.',
      },
      reasons: [
        {
          question: '$\\tfrac{5+6}{6+7}$ neden iki kesrin arasındadır?',
          options: ['Ara kesir iki kesrin pay ve paydalarını birleştirir; değeri ikisinin ağırlıklı ortalamasıdır.', 'Paydası daha büyük olduğu için iki kesirden de küçüktür.', 'Tesadüfen arada çıkmıştır.'],
          answer: 0,
          feedback: ['', 'Paydası büyük ama payı da büyük; $\\tfrac{11}{13}>\\tfrac56$.', 'Tesadüf değil: $\\tfrac{a+c}{b+d}$, $\\tfrac ab$ ile $\\tfrac cd$ arasındadır (b, d > 0).'],
        },
        {
          question: '$\\tfrac56$ ile $\\tfrac67$’den hangisi büyük, neden?',
          options: ['$\\tfrac67$; 1’e uzaklığı $\\tfrac17<\\tfrac16$.', '$\\tfrac56$; paydası küçük.', 'Eşittir; ikisi de 1’den bir eksik.'],
          answer: 0,
          feedback: ['', '“Paydası küçük olan büyük” payları eşitse geçerli; burada paylar farklı.', 'İkisinde de pay paydadan 1 eksik ama eksik parçanın büyüklüğü farklı.'],
        },
      ],
      proof: '$\\tfrac ab<\\tfrac cd$ ($b,d>0$) ise $\\tfrac ab<\\tfrac{a+c}{b+d}<\\tfrac cd$: $(a+c)b-a(b+d)=cb-ad>0$ ve benzeri. Bu yüzden iki farklı rasyonel arasında her zaman bir rasyonel vardır; işlem tekrar edilerek sonsuz çok.',
      rule: 'Sıralamada ortak payda ya da çapraz çarpım; 1’e yakın kesirlerde 1’e uzaklık. Ara kesir: $\\tfrac{a+c}{b+d}$ ya da ortalama.',
      condition: 'Paydalar pozitif olmalı. Negatif kesirlerde sıra mutlak değerin tersidir.',
      trap: 'Paydası büyük kesri her zaman küçük saymak; negatiflerde sırayı ters çevirmeyi unutmak.',
      transfer: [
        {
          id: 'sira-yakin', level: 'Yakın alıştırma', text: '$\\dfrac23$, $\\dfrac34$, $\\dfrac45$ büyükten küçüğe nasıl sıralanır?',
          options: ['$\\tfrac45>\\tfrac34>\\tfrac23$', '$\\tfrac23>\\tfrac34>\\tfrac45$', '$\\tfrac34>\\tfrac45>\\tfrac23$'], answer: 0,
          hints: ['1’e uzaklıklar: $\\tfrac13$, $\\tfrac14$, $\\tfrac15$.', 'Uzaklık küçükse kesir büyük.', '$\\tfrac15<\\tfrac14<\\tfrac13$.'],
          feedback: ['1’e en yakın $\\tfrac45$.', 'Paydası küçük olan büyük kuralı burada ters sonuç verir.', 'Ondalıkla kontrol: $0{,}8$, $0{,}75$, $0{,}67$.'],
        },
        {
          id: 'sira-negatif', level: 'Negatif kesirler', text: '$-\\dfrac34$ ile $-\\dfrac23$’ten hangisi büyüktür?',
          options: ['$-\\dfrac23$', '$-\\dfrac34$', 'Eşittir'], answer: 0,
          hints: ['Mutlak değerleri karşılaştır: $\\tfrac34>\\tfrac23$.', 'Negatiflerde mutlak değeri küçük olan büyük.', '$-0{,}67>-0{,}75$.'],
          feedback: ['Sıfıra daha yakın.', 'Mutlak değeri büyük olan negatif sayı daha küçüktür.', 'Mutlak değerleri farklı: $0{,}75\\neq0{,}67$.'],
        },
        {
          id: 'sira-ekle', level: 'Genelleme', text: '$\\tfrac ab$ basit kesir ($0<a<b$). Pay ve paydaya 1 eklenirse kesir ne olur?',
          options: ['Büyür', 'Küçülür', 'Değişmez'], answer: 0,
          hints: ['Örnek: $\\tfrac12\\to\\tfrac23$.', '1’e uzaklık $\\tfrac{b-a}b$’den $\\tfrac{b-a}{b+1}$’e iner.', 'Uzaklık azalınca kesir büyür.'],
          feedback: ['$\\tfrac{a+1}{b+1}-\\tfrac ab=\\tfrac{b-a}{b(b+1)}>0$.', 'Bileşik kesirde ($a>b$) küçülürdü; burada basit kesir.', '$\\tfrac12$ ile $\\tfrac23$ farklı.'],
        },
      ],
      real: [
        { code: 'TYT-0586', answer: 'C', why: '$\\tfrac56$’dan büyük basit kesir: 1’e uzaklıkla ya da ortak paydayla karşılaştır.' },
        { code: 'TYT-0564', answer: 'D', from: 'temel-kavramlar', why: 'Üç eşikten ikisini geçen sayı: $\\tfrac13$ ile $\\tfrac12$ arası ($\\tfrac8{24}$–$\\tfrac{12}{24}$).' },
      ],
    },
  ],
};

export const between = (p, q) => 5 * q < 6 * p && 7 * p < 6 * q;
export const reduce = (p, q) => { const g = gcd(p, q); return [p / g, q / g]; };
