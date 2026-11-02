// Üslü İfadeler laboratuvarı: negatif taban ve parantez, kuvvet kuralları, ortak paranteze alma ve büyüme, ortak üsle
// sıralama. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const COMPARE = [[2, 30], [3, 20], [5, 10]];

export default {
  conceptId: 'uslu-ifadeler',
  title: 'Üslü İfadeler ve Üslü Denklemler',
  exam: 'TYT + AYT',
  hero: { title: 'Kaç kez çarptın?', text: 'Üs, tekrarlanan çarpmanın sayısıdır. Parantezi oku, kuralı nedeninden çıkar, büyümeyi gör.', art: ['2ⁿ', '×2', 'büyüme'] },
  goals: [
    {
      id: 'negatif-taban', label: 'Negatif taban', short: '(−2)ⁿ ile −2ⁿ',
      objective: '$(-a)^n$ ile $-a^n$’yi ayırır; işareti üssün tek/çift oluşundan, sıfırıncı ve negatif kuvveti tanımdan çıkarır.',
      misconception: '$-2^4$’ü $16$ sanmak; negatif üssü negatif sonuç sanmak.',
      story: 'Hesap makinesine “−2^4” yazınca −16, “(−2)^4” yazınca 16 çıkıyor. Makine mi yanılıyor, yoksa yazım mı farklı?',
      predict: {
        question: '$-2^4$ kaçtır?',
        options: ['$-16$', '$16$', '$-8$'],
        insight: [
          'Doğru: üs yalnız 2’ye etki eder: $-(2^4)$.',
          '$16$, $(-2)^4$’ün değeri; parantez yok.',
          '$-8$ için üs 3 olmalı.',
        ],
      },
      experiment: {
        prompt: 'Yazımı ve üssü seç; değeri $-16$ olan ve üssü **çift** olan ifadeyi kur.',
        view: 'sign', visualLabel: 'Sayı doğrusu: sonucun işareti ve büyüklüğü',
        controls: [{ key: 'w', label: 'Yazım', options: [['par', '$(-2)^n$'], ['yok', '$-2^n$']] }, { key: 'n', label: 'Üs $n$', min: 1, max: 6, step: 1 }],
        initial: { w: 'par', n: 3 },
        compute: ({ w, n }) => ({ w, n, v: w === 'par' ? (-2) ** n : -(2 ** n) }),
        readout: ({ w }, r) => [['İfade', w === 'par' ? `$(-2)^{${r.n}}$` : `$-2^{${r.n}}$`], ['Değer', fmt(r.v)], ['Üs', r.n % 2 ? 'tek' : 'çift']],
        target: {
          text: 'Hedef: değer $-16$, üs çift.',
          test: (_, r) => r.v === -16 && r.n % 2 === 0,
          example: { w: 'yok', n: 4 },
          hint: 'Çift üsle $(-2)^n$ hep pozitif. Eksi işaretini üssün dışında bırakan yazımı dene.',
        },
        diagnose: (_, r) => (r.w === 'par' && r.n % 2 === 0 ? `$(-2)^{${r.n}}=${r.v}$: çift üs eksi işaretini de kuvvetlendirir, sonuç pozitif.` : r.n % 2 ? `Üs ${r.n} tek; hedef çift üs.` : `Değer ${r.v}; $-16$ için $2^n=16$ olmalı.`),
        success: '$-2^4=-(2\\cdot2\\cdot2\\cdot2)=-16$; $(-2)^4=16$.',
      },
      reasons: [
        {
          question: '$-2^4$ neden $-16$?',
          options: ['Üs yalnız hemen önündeki 2’ye etki eder: $-(2^4)$.', 'Eksi sayılar kuvvet alınca hep eksi kalır.', 'Çift üs her zaman negatif sonuç verir.'],
          answer: 0,
          feedback: ['', '$(-2)^4=16$ pozitif; eksi parantez içindeyse işaret de kuvvetlenir.', 'Çift üs negatif tabanı pozitif yapar.'],
        },
        {
          question: '$(-2)^n$ ne zaman pozitiftir?',
          options: ['$n$ çiftken.', '$n$ tekken.', 'Hiçbir zaman.'],
          answer: 0,
          feedback: ['', '$(-2)^3=-8$: tek üste sonuç negatif.', '$(-2)^2=4$: çift üste pozitif oluyor.'],
        },
      ],
      proof: '$(-2)^n$ $n$ tane $-2$’nin çarpımıdır; eksi işaretler çift sayıdaysa birbirini götürür. $-2^n$ ise $-1\\cdot2^n$’dir. Tanım gereği $a^0=1$ ($a\\neq0$) ve $a^{-n}=\\tfrac1{a^n}$.',
      rule: 'Üs yalnız hemen önündeki tabana etki eder; parantez yoksa eksi dışarıda kalır. Negatif taban: çift üs +, tek üs −.',
      condition: '$0^0$ tanımsızdır; negatif üs, tabanın tersini alır (işaretini değiştirmez).',
      trap: '$-3^2=9$ yazmak; $2^{-3}=-8$ sanmak.',
      transfer: [
        {
          id: 'neg-yakin', level: 'Yakın alıştırma', text: '$(-1)^{25}+(-1)^{24}-1^{23}$ kaçtır?',
          options: ['$-1$', '$1$', '$3$'], answer: 0,
          hints: ['$(-1)^{\\text{tek}}=-1$, $(-1)^{\\text{çift}}=1$.', '$1^{23}=1$.', '$-1+1-1$.'],
          feedback: ['$-1+1-1=-1$.', '$-1^{23}$’ü çıkarmayı unuttun; $1^{23}$ çıkarılıyor.', 'Bütün terimleri pozitif aldın.'],
        },
        {
          id: 'neg-sifir', level: 'Sıfırıncı kuvvet', text: '$(-5)^0-5^0+0^3$ kaçtır?',
          options: ['$0$', '$2$', '$-1$'], answer: 0,
          hints: ['Sıfır olmayan her sayının 0. kuvveti 1.', '$0^3=0$.', '$1-1+0$.'],
          feedback: ['$1-1+0=0$.', '$(-5)^0$ ile $5^0$ eşit; fark 0.', '$(-5)^0=1$; negatif değil.'],
        },
        {
          id: 'neg-ust', level: 'Negatif üs', text: '$2^{-3}$ kaçtır?',
          options: ['$\\dfrac18$', '$-8$', '$-6$'], answer: 0,
          hints: ['Negatif üs: ters al.', '$2^{-3}=\\tfrac1{2^3}$.', '$\\tfrac18$.'],
          feedback: ['$\\tfrac1{2^3}$.', 'Negatif üs işareti değil, tersi değiştirir.', 'Üs çarpan değildir: $2\\cdot(-3)$ değil.'],
        },
      ],
      realNote: 'Kategorideki (Üslü İfadeler ve Denklemler) bankaların görselleri tarandı; negatif taban/sıfırıncı kuvvet soran tek soru (TYT-0630) derste çözüldü.',
    },
    {
      id: 'kurallar', label: 'Kuvvet kuralları', short: '(aᵐ)ⁿ = aᵐⁿ, aᵐ·aⁿ = aᵐ⁺ⁿ',
      objective: 'Çarpma, bölme, üssün üssü ve çarpımın kuvveti kurallarını tekrarlanan çarpmadan gerekçelendirir; toplamada üslerin toplanmadığını ayırır.',
      misconception: '$(a^m)^n=a^{m+n}$ ya da $a^m+a^n=a^{m+n}$ yazmak.',
      story: 'Bir bakteri her saat ikiye bölünüyor. 3 saatlik büyümeyi 4 kez art arda yaşarsan kaç kat olur? 3 saat sonra 4 saat daha beklersen?',
      predict: {
        question: '$(2^3)^4$ kaçtır?',
        options: ['$2^{12}$', '$2^7$', '$2^{81}$'],
        insight: [
          'Doğru: $2^3$’ü 4 kez çarpınca üsler $3+3+3+3=12$.',
          '$2^7=2^3\\cdot2^4$; üssün üssü değil.',
          '$3^4=81$ üsse uygulanmaz.',
        ],
      },
      experiment: {
        prompt: '$m$ ve $n$’yi seç; aynı anda $2^m\\cdot2^n=2^7$ ve $(2^m)^n=2^{12}$ olsun.',
        view: 'doubling', visualLabel: 'İkiye katlama adımları',
        controls: [{ key: 'm', label: '$m$', min: 1, max: 6, step: 1 }, { key: 'n', label: '$n$', min: 1, max: 6, step: 1 }],
        initial: { m: 2, n: 2 },
        compute: ({ m, n }) => ({ m, n, prod: m + n, pow: m * n }),
        readout: (_, r) => [['$2^m\\cdot2^n$', `$2^{${r.prod}}=${2 ** r.prod}$`], ['$(2^m)^n$', `$2^{${r.pow}}=${2 ** r.pow}$`]],
        target: {
          text: 'Hedef: çarpımda üs 7, üssün üssünde 12.',
          test: (_, r) => r.prod === 7 && r.pow === 12,
          example: { m: 3, n: 4 },
          hint: 'Toplamı 7, çarpımı 12 olan iki sayı.',
        },
        diagnose: (_, r) => `$2^m\\cdot2^n$ üssü $m+n=${r.prod}$, $(2^m)^n$ üssü $m\\cdot n=${r.pow}$. ${r.prod !== 7 ? 'Toplam 7 olmalı.' : 'Çarpım 12 olmalı.'}`,
        success: '$m=3$, $n=4$: $2^3\\cdot2^4=2^7$ (üsler toplanır), $(2^3)^4=2^{12}$ (üsler çarpılır).',
      },
      reasons: [
        {
          question: '$(2^3)^4$ neden $2^{12}$?',
          options: ['$2^3$’ü 4 kez çarpıyorsun: üsler 4 kez toplanır, $3\\cdot4$.', 'Üsler her zaman toplanır: $3+4$.', '$3^4=81$ olduğu için.'],
          answer: 0,
          feedback: ['', '$3+4$ çarpma kuralıdır ($2^3\\cdot2^4$); burada kuvvetin kuvveti var.', 'Üs kendi kuvvetine yükseltilmez.'],
        },
        {
          question: '$2^3+2^3$ kaçtır?',
          options: ['$2^4$', '$2^6$', '$4^3$'],
          answer: 0,
          feedback: ['', 'Toplamada üsler toplanmaz; $8+8=16=2^4$.', '$4^3=64\\neq16$; tabanlar da toplanmaz.'],
        },
      ],
      proof: '$a^m\\cdot a^n$: $m$ tane ve $n$ tane $a$ yan yana, toplam $m+n$. $(a^m)^n$: $n$ grup, her birinde $m$ tane $a$, toplam $mn$. $\\tfrac{a^m}{a^n}=a^{m-n}$ sadeleştirmeden gelir; $(ab)^n=a^nb^n$ çarpmanın değişme özelliğinden.',
      rule: 'Çarpmada üsler toplanır, bölmede çıkarılır, kuvvetin kuvvetinde çarpılır; önce tabanları eşitle.',
      condition: 'Kurallar aynı taban (ya da aynı üs) için geçerlidir. Toplama/çıkarmada ortak paranteze alınır, üsler birleşmez.',
      trap: '$2^3\\cdot3^2=6^5$ gibi farklı tabanlarda üsleri birleştirmek.',
      transfer: [
        {
          id: 'kural-yakin', level: 'Yakın alıştırma', text: '$\\dfrac{8^4}{4^5}$ kaçtır?',
          options: ['$4$', '$2$', '$\\dfrac12$'], answer: 0,
          hints: ['Tabanları 2 yap.', '$2^{12}/2^{10}$.', '$2^2$.'],
          feedback: ['$2^{12-10}=4$.', 'Üs farkı 2: $2^2$, $2^1$ değil.', 'Payın üssü (12) paydanınkinden (10) büyük; sonuç 1’den büyük.'],
        },
        {
          id: 'kural-carpim', level: 'Çarpımın kuvveti', text: '$6^8=2^a\\cdot3^b$ ise $a+b$ kaçtır?',
          options: ['$16$', '$8$', '$64$'], answer: 0,
          hints: ['$6=2\\cdot3$.', '$(2\\cdot3)^8=2^8\\cdot3^8$.', '$8+8$.'],
          feedback: ['$a=b=8$.', 'İki tabanın üssünü de say.', 'Üsler çarpılmaz; $a$ ve $b$ ayrı ayrı 8.'],
        },
        {
          id: 'kural-harf', level: 'Harfle ifade', text: '$x=2^{10}$ ise $4^7$’nin $x$ türünden eşiti nedir?',
          options: ['$16x$', '$4x$', '$x+16$'], answer: 0,
          hints: ['$4^7=2^{14}$.', '$2^{14}=2^{10}\\cdot2^4$.', '$16x$.'],
          feedback: ['$2^{10}\\cdot16$.', '$2^{14}=2^{10}\\cdot2^4$; $2^2$ değil.', 'Çarpma kuralı toplamaya dönmez: $2^{10}\\cdot2^4$, $2^{10}+16$ değil.'],
        },
      ],
      real: [
        { code: 'TYT-0640', answer: 'D', why: 'Dört yıl $\\tfrac{11}{10}$, dört yıl $\\tfrac{12}{11}$ oranında artış: çarpımın kuvveti, sonra $810000\\cdot1{,}2^4$.' },
        { code: 'TYT-0636', answer: 'D', why: '$12{,}5\\cdot10^{-3}\\cdot4\\cdot40$: 10’un kuvvetlerini ayrı topla.' },
        { code: 'TYT-0638', answer: 'C', why: 'Her sayıyı taban veya üssü 3 olacak biçimde yazmayı dene: $8=2^3$, $81=3^4$…' },
      ],
    },
    {
      id: 'ortak-paranteze', label: 'Ortak paranteze alma', short: '3ˣ⁺¹ + 3ˣ = 4·3ˣ',
      objective: 'Aynı tabanlı terimleri en küçük kuvvet parantezine alarak toplar/çıkarır; üslü denklemi buna dönüştürüp çözer; katlanarak büyümeyi toplamla ilişkilendirir.',
      misconception: '$3^{x+1}+3^x=3^{2x+1}$ gibi üsleri toplamak.',
      story: 'Bir bilgisayar oyununda her seviyede puan 3 katına çıkıyor. İki ardışık seviyenin puanlarının toplamını tek bir ifadeyle nasıl yazarsın?',
      predict: {
        question: '$3^{x+1}+3^x$ ifadesi neye eşittir?',
        options: ['$4\\cdot3^x$', '$3^{2x+1}$', '$6^{x+1}$'],
        insight: [
          'Doğru: $3\\cdot3^x+1\\cdot3^x$.',
          'Toplamada üsler toplanmaz; $x=1$: $9+3=12$, $3^3=27$.',
          'Tabanlar toplanmaz; $x=1$: $12\\neq36$.',
        ],
      },
      experiment: {
        prompt: '$x$’i seç; $3^{x+1}+3^x=108$ eşitliğini sağla.',
        view: 'stack', visualLabel: '3ˣ blokları: 3 tane + 1 tane',
        controls: [{ key: 'x', label: '$x$', min: 0, max: 6, step: 1 }],
        initial: { x: 1 },
        compute: ({ x }) => ({ x, base: 3 ** x, total: 3 ** (x + 1) + 3 ** x }),
        readout: (_, r) => [['$3^x$', r.base], ['$3^{x+1}+3^x$', `$4\\cdot${r.base}=${r.total}$`]],
        target: {
          text: 'Hedef: toplam $108$.',
          test: (_, r) => r.total === 108,
          example: { x: 3 },
          hint: '$4\\cdot3^x=108$ ise $3^x$ kaç?',
        },
        diagnose: (_, r) => `$4\\cdot3^{${r.x}}=${r.total}$; ${r.total < 108 ? 'küçük' : 'büyük'}. $3^x=108/4=27$ olmalı.`,
        success: '$4\\cdot3^x=108$ → $3^x=27$ → $x=3$.',
      },
      reasons: [
        {
          question: 'Neden $4\\cdot3^x$?',
          options: ['$3^{x+1}=3\\cdot3^x$; 3 tane ve 1 tane $3^x$ toplanır.', 'Üsler toplanır: $x+1+x$.', '$3+1=4$ taban olur.'],
          answer: 0,
          feedback: ['', '$x=1$: $9+3=12$ ama $3^3=27$.', 'Taban değil, katsayı 4: $4\\cdot3^x$, $4^x$ değil.'],
        },
        {
          question: '$2^{n+2}-2^n$ neye eşittir?',
          options: ['$3\\cdot2^n$', '$2^2$', '$2^{2n+2}$'],
          answer: 0,
          feedback: ['', 'Fark $n$’ye bağlı; $n=1$: $8-2=6$.', 'Çıkarmada üsler birleşmez.'],
        },
      ],
      proof: '$3^{x+1}=3\\cdot3^x$ (çarpma kuralı). Dağılma özelliğiyle $3\\cdot3^x+3^x=(3+1)3^x$. $4\\cdot3^x=108\\iff3^x=27=3^3\\iff x=3$ (taban 1’den farklı pozitif olduğu için üsler eşit).',
      rule: 'En küçük kuvveti paranteze al: $a^{x+k}\\pm a^x=(a^k\\pm1)a^x$. Üslü denklemde tabanları eşitle, üsleri eşitle.',
      condition: 'Tabanlar aynı olmalı. $a^x=a^y\\Rightarrow x=y$ için $a>0$, $a\\neq1$.',
      trap: 'Toplamı tek kuvvet sanmak; $1^x=1^y$’den $x=y$ çıkarmak.',
      transfer: [
        {
          id: 'ortak-yakin', level: 'Yakın alıştırma', text: '$2^{x+3}-2^x=56$ ise $x$ kaçtır?',
          options: ['$3$', '$8$', '$2$'], answer: 0,
          hints: ['$2^x(8-1)$.', '$7\\cdot2^x=56$.', '$2^x=8$.'],
          feedback: ['$2^3=8$.', '8, $2^x$’in değeri; $x$ için $2^x=8$’i çöz.', '$2^2=4$; $7\\cdot4=28$.'],
        },
        {
          id: 'ortak-bes', level: 'Aynı terimler', text: '$5^{20}+5^{20}+5^{20}+5^{20}+5^{20}$ kaçtır?',
          options: ['$5^{21}$', '$5^{100}$', '$25^{20}$'], answer: 0,
          hints: ['Beş tane $5^{20}$.', '$5\\cdot5^{20}$.', '$5^{21}$.'],
          feedback: ['$5^1\\cdot5^{20}$.', 'Üsler toplanır ama yalnız çarpmada; burada 5 tane toplanıyor.', '$25^{20}=5^{40}$; beş terimin toplamı bu kadar büyümez.'],
        },
        {
          id: 'ortak-zincir', level: 'Büyüme ve toplam', text: 'Bir haber her gün yeni duyan her kişiden 3 kişiye yayılıyor. 1. gün 1 kişi duydu, 2. gün 3, 3. gün 9 kişi… 6. günün sonunda toplam kaç kişi duymuştur?',
          options: ['$364$', '$729$', '$243$'], answer: 0,
          hints: ['$1+3+9+\\dots+3^5$.', '$S$ ile $3S$’yi alt alta yaz.', '$2S=3^6-1$.'],
          feedback: ['$\\tfrac{729-1}2=364$.', '$3^6$ 7. günün yeni sayısı.', '$3^5$ yalnız 6. günün yeni duyanları.'],
        },
      ],
      real: [
        { code: 'TYT-0642', answer: 'A', why: 'Her adımda eklenen mandal sayısı ikiye katlanıyor; toplamlar farkı $2^{12}-2^{10}=3\\cdot2^{10}$.' },
        { code: 'TYT-0646', answer: 'B', why: 'Nesiller arası oran sabit: 2. ile 4. nesil arasında iki adım, $r^2=4\\cdot10^4$.' },
      ],
    },
    {
      id: 'siralama', label: 'Üslüleri sıralama', short: 'Üsleri eşitle, tabana bak',
      objective: 'Üslü sayıları ortak üs ya da ortak taban yazarak sıralar; 0 ile 1 arasındaki tabanda üs büyüdükçe küçülmeyi açıklar.',
      misconception: 'Üssü büyük olanı her zaman büyük sanmak; 0 ile 1 arasındaki tabanı da büyüyen sanmak.',
      story: 'Üç yatırım: biri 30 yıl boyunca her yıl 2 katı, biri 20 yıl boyunca 3 katı, biri 10 yıl boyunca 5 katı büyüyor. Hangisi en çok büyür?',
      predict: {
        question: '$2^{30}$, $3^{20}$, $5^{10}$ küçükten büyüğe nasıl sıralanır?',
        options: ['$5^{10}<2^{30}<3^{20}$', '$2^{30}<3^{20}<5^{10}$', '$5^{10}<3^{20}<2^{30}$'],
        insight: [
          'Doğru: üsleri 10 yapınca $8^{10}$, $9^{10}$, $5^{10}$.',
          'Taban büyük olsa da üssü küçük olan küçük kalabilir: $5^{10}$ en küçük.',
          '$3^{20}=9^{10}>8^{10}=2^{30}$.',
        ],
      },
      experiment: {
        prompt: 'Ortak üssü seç; üç sayıyı aynı üsle yaz ve karşılaştır.',
        view: 'compare', visualLabel: 'Aynı üste tabanların karşılaştırması',
        controls: [{ key: 'k', label: 'Ortak üs', options: [[1, '1'], [2, '2'], [5, '5'], [10, '10'], [3, '3']] }],
        initial: { k: 1 },
        compute: ({ k }) => {
          const rows = COMPARE.map(([b, e]) => ({ b, e, ok: e % k === 0, nb: e % k === 0 ? b ** (e / k) : null }));
          return { k, rows, all: rows.every((r) => r.ok) };
        },
        readout: (_, r) => r.rows.map((x) => [`$${x.b}^{${x.e}}$`, x.ok ? `$${x.nb}^{${r.k}}$` : `üs ${r.k}’e bölünmüyor`]),
        target: {
          text: 'Hedef: üçü de aynı üsle yazılsın ve tabanlar olabildiğince küçük olsun.',
          test: (_, r) => r.k === 10,
          example: { k: 10 },
          hint: '30, 20 ve 10’un en büyük ortak böleni.',
        },
        diagnose: (_, r) => (!r.all ? `${r.k}, üslerden birini bölmüyor; ortak bölen seç.` : `Ortak üs ${r.k} çalışıyor ama tabanlar çok büyük (${r.rows.map((x) => x.nb).join(', ')}). Daha büyük ortak üs seç.`),
        success: '$8^{10}$, $9^{10}$, $5^{10}$: üsler eşitken büyük taban büyük sayı.',
      },
      reasons: [
        {
          question: 'Neden üsleri eşitliyoruz?',
          options: ['Üsler eşit ve tabanlar pozitifken büyük taban büyük sayı verir.', 'Üsleri toplamak için.', 'Tabanlar eşit olsun diye.'],
          answer: 0,
          feedback: ['', 'Toplama yapılmıyor; karşılaştırma yapılıyor.', 'Burada tabanlar değil üsler eşitlendi; diğer yol tabanları eşitlemektir.'],
        },
        {
          question: '$(\\tfrac12)^5$ ile $(\\tfrac12)^3$’ten hangisi büyük?',
          options: ['$(\\tfrac12)^3$; 0 ile 1 arası tabanda üs büyüdükçe sayı küçülür.', '$(\\tfrac12)^5$; üssü büyük.', 'Eşittir.'],
          answer: 0,
          feedback: ['', '$\\tfrac1{32}<\\tfrac18$.', '$\\tfrac1{32}\\neq\\tfrac18$.'],
        },
      ],
      proof: '$2^{30}=(2^3)^{10}=8^{10}$, $3^{20}=9^{10}$. $t\\mapsto t^{10}$ pozitif sayılarda artandır, bu yüzden $5<8<9$ sırası korunur. Taban $0<a<1$ ise $a^m<a^n\\iff m>n$.',
      rule: 'Üsleri (ya da tabanları) eşitle, kalan kısmı karşılaştır. Taban 1’den büyükse üs büyüdükçe büyür; 0–1 arasıysa küçülür.',
      condition: 'Pozitif tabanlar için. Negatif tabanda işaret üssün tek/çiftliğine bağlıdır.',
      trap: 'Yalnız üslere ya da yalnız tabanlara bakmak.',
      transfer: [
        {
          id: 'sira-yakin', level: 'Yakın alıştırma', text: '$a=2^{40}$, $b=3^{30}$, $c=5^{20}$ ise sıralama nedir?',
          options: ['$a<c<b$', '$a<b<c$', '$c<a<b$'], answer: 0,
          hints: ['Ortak üs 10.', '$16^{10}$, $27^{10}$, $25^{10}$.', '$16<25<27$.'],
          feedback: ['$16<25<27$.', '$c=25^{10}<27^{10}=b$.', '$a=16^{10}<25^{10}=c$.'],
        },
        {
          id: 'sira-kesir', level: '0–1 arası taban', text: '$x=0{,}5$ ise $x$, $x^2$, $x^3$ küçükten büyüğe nasıl sıralanır?',
          options: ['$x^3<x^2<x$', '$x<x^2<x^3$', '$x^2<x<x^3$'], answer: 0,
          hints: ['$0{,}5$, $0{,}25$, $0{,}125$.', 'Üs büyüdükçe küçülüyor.', '$0{,}125<0{,}25<0{,}5$.'],
          feedback: ['0–1 arasında kuvvet küçültür.', '1’den büyük tabanlardaki sıra.', '$x^3=0{,}125$ en küçük.'],
        },
        {
          id: 'sira-esit', level: 'Ortak taban', text: '$4^{15}$ ile $8^{10}$’dan hangisi büyüktür?',
          options: ['Eşittir', '$4^{15}$', '$8^{10}$'], answer: 0,
          hints: ['İkisini de 2 tabanında yaz.', '$2^{30}$ ve $2^{30}$.', 'Eşit.'],
          feedback: ['İkisi de $2^{30}$.', '$4^{15}=2^{30}=8^{10}$.', '$8^{10}=2^{30}=4^{15}$.'],
        },
      ],
      realNote: 'Kategorideki bankalarda üslü sayı sıralaması isteyen görseli okunmuş soru bulunmadı; aktarım özgün alıştırmalarla yapılır.',
    },
  ],
};
