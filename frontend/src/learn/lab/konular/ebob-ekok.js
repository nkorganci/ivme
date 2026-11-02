// EBOB–EKOK laboratuvarı: asal çarpanlar ve bölen sayısı, EBOB·EKOK = a·b, problemde EBOB/EKOK seçimi, periyodik
// olaylar. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı; `from`: soru başka konunun bankasında.
import { fmt, gcd } from '../sayi.js';

export const lcm = (a, b) => (a / gcd(a, b)) * b;
export function factor(n) {
  const out = {};
  for (let p = 2; p * p <= n; p++) while (n % p === 0) { out[p] = (out[p] ?? 0) + 1; n /= p; }
  if (n > 1) out[n] = (out[n] ?? 0) + 1;
  return out;
}
export const factorText = (f) => Object.entries(f).map(([p, e]) => (e > 1 ? `${p}^{${e}}` : p)).join('\\cdot') || '1';
export const divisorCount = (n) => Object.values(factor(n)).reduce((s, e) => s * (e + 1), 1);
const FIELD = [18, 12];
const BELLS = [8, 12];

export default {
  conceptId: 'ebob-ekok',
  title: 'Asal Çarpanlar, EBOB–EKOK ve Periyodik Problemler',
  exam: 'TYT + AYT',
  hero: { title: 'Böl mü, birleştir mi?', text: 'Sayıları asal parçalarına ayır, ortak olanı ve hepsini kapsayanı gör. Soruda hangisinin gerektiğine karar ver.', art: ['EBOB', '·', 'EKOK'] },
  goals: [
    {
      id: 'asal-carpan', label: 'Asal çarpan ve bölen', short: 'Bölen sayısı = (a+1)(b+1)…',
      objective: 'Sayıyı asal çarpanlarına ayırır; bölen sayısını üslerden hesaplar ve verilen bölen sayısına sahip en küçük sayıyı kurar.',
      misconception: 'Bölen sayısını üslerin toplamı ya da çarpımı sanmak; en küçük sayı için hep tek asalın yüksek kuvvetini seçmek.',
      story: '60 öğrenciyi eşit gruplara kaç farklı biçimde ayırabilirsin? Her grup büyüklüğü 60’ın bir bölenidir. Peki tam 12 farklı biçim veren en küçük sınıf mevcudu kaç?',
      predict: {
        question: 'Tam 12 pozitif böleni olan en küçük doğal sayı kaçtır?',
        options: ['$60$', '$72$', '$2048$'],
        insight: [
          'Doğru: $60=2^2\\cdot3\\cdot5$, $(2+1)(1+1)(1+1)=12$. Yeni küçük asal eklemek, üssü büyütmekten ucuz.',
          '$72=2^3\\cdot3^2$ de 12 bölenli ama $60$ daha küçük.',
          '$2^{11}$ 12 bölenli ama çok büyük; üsleri asallara dağıtmak sayıyı küçültür.',
        ],
      },
      experiment: {
        prompt: 'Üsleri seç; tam 12 pozitif böleni olan **en küçük** sayıyı kur.',
        view: 'divisors', visualLabel: 'Bölen tablosu: her satır bir 2 kuvveti',
        controls: [{ key: 'a', label: '$2$’nin üssü', min: 0, max: 11, step: 1 }, { key: 'b', label: '$3$’ün üssü', min: 0, max: 4, step: 1 }, { key: 'c', label: '$5$’in üssü', min: 0, max: 3, step: 1 }],
        initial: { a: 3, b: 1, c: 0 },
        compute: ({ a, b, c }) => { const n = 2 ** a * 3 ** b * 5 ** c; return { a, b, c, n, count: (a + 1) * (b + 1) * (c + 1) }; },
        readout: (_, r) => [['Sayı', `$2^{${r.a}}\\cdot3^{${r.b}}\\cdot5^{${r.c}}=${r.n}$`], ['Bölen sayısı', `$(${r.a}+1)(${r.b}+1)(${r.c}+1)=${r.count}$`]],
        target: {
          text: 'Hedef: bölen sayısı 12 ve sayı olabildiğince küçük.',
          test: (_, r) => r.n === 60,
          example: { a: 2, b: 1, c: 1 },
          hint: '$12=12=6\\cdot2=4\\cdot3=3\\cdot2\\cdot2$. Her ayrışım bir üs dağılımı verir; büyük üsleri küçük asala koy.',
        },
        diagnose: (_, r) => r.count !== 12 ? `Bölen sayısı ${r.count}. $(a+1)(b+1)(c+1)=12$ olmalı.` : `${r.n} 12 bölenli ama daha küçüğü var. Üsleri farklı dağıt: üç asal kullanmayı dene.`,
        success: '$12=3\\cdot2\\cdot2$ → $2^2\\cdot3\\cdot5=60$: en küçük.',
      },
      reasons: [
        {
          question: 'Bölen sayısı neden $(a+1)(b+1)(c+1)$’dir?',
          options: ['Her bölen $2^i3^j5^k$ biçiminde; $i$ için $a+1$ seçenek (0…a), $j$ ve $k$ için de benzer, seçimler çarpılır.', 'Üslerin toplamına 1 eklenir.', 'Asal çarpan sayısı kadar bölen vardır.'],
          answer: 0,
          feedback: ['', '$60$’ta üsler toplamı $4$, bölen sayısı 12: toplama değil çarpma.', '$60$’ın üç asal çarpanı var ama 12 böleni var.'],
        },
        {
          question: 'Neden $72$ değil $60$?',
          options: ['$2^2\\cdot3\\cdot5=60<2^3\\cdot3^2=72$: küçük bir asalı eklemek, üssü artırmaktan daha az büyütür.', '72 çift sayı olduğu için.', '60’ın bölen sayısı daha fazladır.'],
          answer: 0,
          feedback: ['', '60 da çifttir; ikisi de 12 bölenli.', 'İkisinin de tam 12 böleni var; fark büyüklükte.'],
        },
      ],
      proof: '$n=2^a3^b5^c$’nin her böleni $2^i3^j5^k$ ($0\\le i\\le a$, …) biçimindedir ve farklı üçlüler farklı bölen verir; sayım ilkesiyle $(a+1)(b+1)(c+1)$. 12 için üs dağılımları $(11)$, $(5,1)$, $(3,2)$, $(2,1,1)$; en küçükleri $2048$, $96$, $72$, $60$.',
      rule: 'Bölen sayısı = üslerin birer fazlasının çarpımı; çift bölen için 2’nin üssü en az 1 alınır.',
      condition: 'Sayı asal çarpanlarına doğru ayrılmış olmalı ($4=2^2$ gibi). Pozitif bölenler sayılır; tam sayı bölenler iki katıdır.',
      trap: '$2^3\\cdot3^2$ için $3+2=5$ ya da $3\\cdot2=6$ bölen saymak.',
      transfer: [
        {
          id: 'asal-yakin', level: 'Yakın alıştırma', text: '$360$ sayısının kaç pozitif böleni vardır?',
          options: ['$24$', '$6$', '$30$'], answer: 0,
          hints: ['Önce asal çarpanlara ayır.', '$360=2^3\\cdot3^2\\cdot5$.', '$4\\cdot3\\cdot2=24$.'],
          feedback: ['$(3+1)(2+1)(1+1)=24$.', '$3+2+1=6$ üslerin toplamı; bölen sayısı değil.', '$360$’ın 30 böleni yok; çarpımı yeniden hesapla.'],
        },
        {
          id: 'asal-ters', level: 'Ters yön', text: '$n=2^a\\cdot3^2$ sayısının 12 pozitif böleni varsa $a$ kaçtır?',
          options: ['$3$', '$4$', '$10$'], answer: 0,
          hints: ['Bölen sayısı $(a+1)(2+1)$.', '$3(a+1)=12$.', '$a+1=4$.'],
          feedback: ['$2^3\\cdot3^2=72$: $4\\cdot3=12$.', '$a=4$ ise $5\\cdot3=15$ bölen.', '$a+2=12$ değil; çarpım kuralını kullan.'],
        },
        {
          id: 'asal-cift', level: 'Koşullu sayım', text: '$72$ sayısının kaç tane **çift** pozitif böleni vardır?',
          options: ['$9$', '$12$', '$6$'], answer: 0,
          hints: ['$72=2^3\\cdot3^2$.', 'Çift bölende 2’nin üssü 1, 2 ya da 3.', '$3\\cdot3=9$.'],
          feedback: ['2’nin üssü için 3, 3’ün üssü için 3 seçenek.', '12 bütün bölenlerin sayısı; tek bölenleri ($1,3,9$) çıkar.', '$6$ yalnız 2’nin üssünü $1,2$ alınca çıkar; 3 de olabilir.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0017', answer: 'D', from: 'temel-kavramlar', why: '$p\\mid180r$ ve $p\\neq r$ ise $p\\in\\{2,3,5\\}$; hepsinin böldüğü seçenek.' },
        { code: 'AYT_Sayisal-0010', answer: 'B', from: 'temel-kavramlar', why: '$143=11\\cdot13$: asal çarpanlardan $a$, $a+b$ ve $c$ belirlenir.' },
        { code: 'AYT_Sayisal-0016', answer: 'E', from: 'temel-kavramlar', why: 'Kesri $2,3,5$ kuvvetlerine ayır; tam sayı olması için her üs $\\ge0$.' },
      ],
    },
    {
      id: 'ebob-ekok-hesap', label: 'EBOB · EKOK', short: 'Ortak kısım ve birleşim',
      objective: 'İki sayının asal çarpanlarından EBOB’u (ortak, küçük üs) ve EKOK’u (hepsi, büyük üs) kurar; EBOB·EKOK $=a\\cdot b$ ilişkisini kullanır.',
      misconception: 'EKOK’u her zaman $a\\cdot b$ sanmak; EBOB–EKOK verilince sayı çiftinin tek olduğunu düşünmek.',
      story: 'İki dişli çark aynı anda dönüyor: biri 18, diğeri 24 dişli. Ortak dişler mi, ikisinin de tamamlandığı tur mu? Önce sayıları parçalarına ayır.',
      predict: {
        question: 'EBOB’u 6, EKOK’u 72 olan iki sayının çarpımı kaçtır?',
        options: ['$432$', '$72$', 'Sayılar bilinmeden bulunamaz.'],
        insight: [
          'Doğru: $(18,24)$ ve $(6,72)$ farklı çiftler ama çarpım hep $6\\cdot72=432$.',
          '72 EKOK’tur; çarpım yalnız sayılar aralarında asalsa EKOK’a eşit olur.',
          'Sayılar bilinmese de çarpım bellidir: EBOB·EKOK $=a\\cdot b$.',
        ],
      },
      experiment: {
        prompt: '$a$ ve $b$’yi seç; EBOB’u 6, EKOK’u 72 olan bir çift bul.',
        view: 'venn', visualLabel: 'Asal çarpanlar: ortak bölge EBOB, tamamı EKOK',
        controls: [{ key: 'a', label: '$a$', min: 2, max: 72, step: 1 }, { key: 'b', label: '$b$', min: 2, max: 72, step: 1 }],
        initial: { a: 12, b: 30 },
        compute: ({ a, b }) => ({ a, b, g: gcd(a, b), l: lcm(a, b), fa: factor(a), fb: factor(b) }),
        readout: (_, r) => [['$a$', `$${r.a}=${factorText(r.fa)}$`], ['$b$', `$${r.b}=${factorText(r.fb)}$`], ['EBOB', fmt(r.g)], ['EKOK', fmt(r.l)], ['EBOB·EKOK', `${r.g * r.l} = ${r.a}·${r.b}`]],
        target: {
          text: 'Hedef: EBOB $=6$ ve EKOK $=72$.',
          test: (_, r) => r.g === 6 && r.l === 72,
          example: { a: 18, b: 24 },
          hint: 'İki sayı da $6$’nın katı: $a=6x$, $b=6y$, $x$ ile $y$ aralarında asal ve $xy=72/6=12$.',
        },
        diagnose: (_, r) => r.g !== 6 ? `EBOB ${r.g}: ortak çarpan ${r.g > 6 ? 'fazla' : 'eksik'}. İki sayı da 6’nın katı olmalı, başka ortak çarpan olmamalı.` : `EBOB 6 tamam, EKOK ${r.l}. $a\\cdot b=432$ olmalı; şu an ${r.a * r.b}.`,
        success: 'Ortak kısım $2\\cdot3$, birleşim $2^3\\cdot3^2$: EBOB·EKOK $=a\\cdot b$.',
      },
      reasons: [
        {
          question: 'EBOB·EKOK neden $a\\cdot b$’ye eşittir?',
          options: ['Her asal için EBOB küçük üssü, EKOK büyük üssü alır; ikisinin toplamı iki üssün toplamıdır.', 'EBOB ile EKOK her zaman birbirinin tersidir.', 'Yalnız $a$ ile $b$ asal sayılarsa doğrudur.'],
          answer: 0,
          feedback: ['', '“Ters” bir ilişki yok; üslerin min ve max’ı toplanıyor.', '$18$ ve $24$ asal değil ama $6\\cdot72=18\\cdot24$.'],
        },
        {
          question: '$(18,24)$’ten başka hangi çift aynı EBOB ve EKOK’u verir?',
          options: ['$(6,72)$: $a=6x$, $b=6y$, $x,y$ aralarında asal ve $xy=12$.', '$(12,36)$: ikisi de 72’yi böler.', 'Başka çift yoktur.'],
          answer: 0,
          feedback: ['', 'EBOB$(12,36)=12$; ortak çarpan fazla.', '$xy=12$, aralarında asal: $(1,12)$ ve $(3,4)$ → iki çift var.'],
        },
      ],
      proof: '$a=\\prod p^{\\alpha}$, $b=\\prod p^{\\beta}$ ise EBOB $=\\prod p^{\\min(\\alpha,\\beta)}$, EKOK $=\\prod p^{\\max(\\alpha,\\beta)}$; $\\min+\\max=\\alpha+\\beta$. EBOB $=d$ ise $a=dx$, $b=dy$, EBOB$(x,y)=1$ ve EKOK $=dxy$.',
      rule: 'EBOB·EKOK $=a\\cdot b$; EBOB $d$ ise $a=dx$, $b=dy$ ($x,y$ aralarında asal).',
      condition: 'İki pozitif tam sayı için. Üç sayıda EBOB·EKOK $\\neq abc$ olabilir.',
      trap: 'EKOK $=a\\cdot b$ sanmak (yalnız aralarında asal sayılarda doğru).',
      transfer: [
        {
          id: 'hesap-yakin', level: 'Yakın alıştırma', text: 'EBOB$(a,b)=4$, EKOK$(a,b)=60$ ve $a=12$ ise $b$ kaçtır?',
          options: ['$20$', '$5$', '$48$'], answer: 0,
          hints: ['$a\\cdot b=$ EBOB·EKOK.', '$12b=240$.', '$b=20$.'],
          feedback: ['$12\\cdot20=240=4\\cdot60$.', '$12\\cdot5=60$; EBOB 4 olmaz.', '$48$ ile EKOK 48 olur.'],
        },
        {
          id: 'hesap-asal', level: 'Özel durum', text: '$a$ ve $b$ aralarında asal ve $a\\cdot b=90$ ise EKOK$(a,b)$ kaçtır?',
          options: ['$90$', '$1$', '$45$'], answer: 0,
          hints: ['Aralarında asal: EBOB $=1$.', 'EBOB·EKOK $=90$.', 'EKOK $=90$.'],
          feedback: ['EBOB 1 olduğu için EKOK çarpıma eşit.', '1, aralarında asal sayıların EBOB’udur; EKOK değil.', '$45$ için EBOB 2 olmalıydı; aralarında asal değil.'],
        },
        {
          id: 'hesap-faktoriyel', level: 'Ortak çarpanı ayır', text: '$A=5!+4!$ ve $B=6!-5!$ ise EBOB$(A,B)$ kaçtır?',
          options: ['$4!$', '$5!$', '$6\\cdot4!$'], answer: 0,
          hints: ['Ortak faktöriyeli paranteze al.', '$A=4!(5+1)=6\\cdot4!$, $B=5!(6-1)=5\\cdot5!=25\\cdot4!$.', 'EBOB$(6,25)=1$: EBOB $=4!$.'],
          feedback: ['$6\\cdot4!$ ve $25\\cdot4!$: kalan çarpanlar aralarında asal.', '$5!=5\\cdot4!$; $A=6\\cdot4!$ 5’e bölünmez.', '$6\\cdot4!=A$ kendisi; $B$’yi bölmez.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0021', answer: 'C', why: '$A=8\\cdot6!$, $B=49\\cdot6!$: ortak $6!$’ı ayır, kalanlar aralarında asal.' },
      ],
    },
    {
      id: 'problem-secim', label: 'EBOB mu, EKOK mu?', short: 'Bölüyor musun, birleştiriyor musun?',
      objective: 'Problemde bütünü eş parçalara bölme (ortak bölen, EBOB) ile parçalardan bütün kurma/aynı anda gerçekleşme (ortak kat, EKOK) durumlarını ayırır.',
      misconception: '“En büyük” görünce EKOK, “en küçük” görünce EBOB seçmek; parçayı değil sayıyı/adedi sormayı karıştırmak.',
      story: '18 m × 12 m bir tarlayı eş kare parsellere bölmek de, 18 × 12’lik karolardan kare bir avlu döşemek de “kare” sorusu. Biri bölüyor, diğeri birleştiriyor.',
      predict: {
        question: '18 m × 12 m tarla, eş ve olabildiğince büyük kare parsellere bölünecek. Kaç parsel olur?',
        options: ['$6$', '$36$', '$216$'],
        insight: [
          'Doğru: kenar EBOB$(18,12)=6$; $3\\cdot2=6$ parsel.',
          '36 EKOK; parsel kenarı tarladan büyük olamaz. Bölerken ortak bölen gerekir.',
          '$216=18\\cdot12$ tarlanın alanı; 1 m’lik karelerle parsel sayısı olurdu, en büyük değil.',
        ],
      },
      experiment: {
        prompt: 'Kare kenarını ve işi seç; tarlayı **en büyük** eş karelere böl.',
        view: 'tiles', visualLabel: '18 × 12 tarla ve kare ızgara',
        controls: [{ key: 'mode', label: 'İş', options: [['bol', 'Tarlayı karelere böl'], ['kur', 'Tarlalardan kare kur']] }, { key: 's', label: 'Kare kenarı (m)', min: 1, max: 40, step: 1 }],
        initial: { mode: 'bol', s: 4 },
        compute: ({ mode, s }) => {
          const [w, h] = FIELD;
          if (mode === 'bol') return { mode, s, w, h, fits: w % s === 0 && h % s === 0, count: (w / s) * (h / s) };
          return { mode, s, w, h, fits: s % w === 0 && s % h === 0, count: (s / w) * (s / h) };
        },
        readout: (_, r) => r.mode === 'bol'
          ? [['18 ÷ kenar', fmt(r.w / r.s)], ['12 ÷ kenar', fmt(r.h / r.s)], ['Parsel', r.fits ? fmt(r.count) : 'artan kalıyor']]
          : [['kenar ÷ 18', fmt(r.s / r.w)], ['kenar ÷ 12', fmt(r.s / r.h)], ['Tarla adedi', r.fits ? fmt(r.count) : 'kare tamamlanmıyor']],
        target: {
          text: 'Hedef: tarlayı böl, kareler artansız sığsın, kenar en büyük olsun.',
          test: ({ mode }, r) => mode === 'bol' && r.fits && r.s === 6,
          example: { mode: 'bol', s: 6 },
          hint: 'Kenar 18’i de 12’yi de tam bölmeli. Ortak bölenlerin en büyüğü?',
        },
        diagnose: ({ mode }, r) => {
          if (mode === 'kur') return r.fits ? `Bu iş birleştirme: ${r.s} m kare ${r.count} tarla ister; en küçüğü EKOK$(18,12)=36$. Hedef ise bölme.` : 'Kare kurarken kenar 18’in ve 12’nin katı olmalı. Hedef ise tarlayı bölmek; işi değiştir.';
          if (!r.fits) return `${r.s} m, ${r.w % r.s ? '18’i' : '12’yi'} tam bölmüyor; kenarda artan kalıyor.`;
          return `${r.s} m sığıyor (${r.count} parsel) ama daha büyük ortak bölen var.`;
        },
        success: 'Bölerken ortak bölen, en büyüğü EBOB: 6 m, 6 parsel.',
      },
      reasons: [
        {
          question: 'Bu soruda neden EBOB?',
          options: ['Kare kenarı iki kenarı da tam bölmeli (ortak bölen) ve en büyük olmalı.', 'Soruda “en büyük” geçtiği için EKOK değil EBOB kullanılır; her “en büyük” EBOB’dur.', 'Alan 216 olduğu için.'],
          answer: 0,
          feedback: ['', 'Anahtar kelime yanıltır: “en az kaç karo ile en küçük kare” EKOK’tur, “en büyük” geçmese bile. İşe bak: bölme mi, birleştirme mi?', 'Alan parsel sayısını hesaplamada kullanılabilir ama kenarı ortak bölen belirler.'],
        },
        {
          question: 'Hangi durumda EKOK gerekir?',
          options: ['Parçaları birleştirip bütün kurarken ya da olayların yeniden birlikte gerçekleşmesini ararken.', 'Sayılar büyükse.', 'Cevap tek sayı olacaksa.'],
          answer: 0,
          feedback: ['', 'Büyüklük değil, işin türü belirleyicidir.', 'Teklik ile ilgisi yok.'],
        },
      ],
      proof: 'Bölmede kare kenarı $s$, $s\\mid18$ ve $s\\mid12$ sağlamalı: $s$ ortak bölen, en büyüğü EBOB $=6$. Kurmada $18\\mid s$ ve $12\\mid s$: $s$ ortak kat, en küçüğü EKOK $=36$.',
      rule: 'Bütünü eş parçalara bölüyorsan EBOB; parçalardan bütün kuruyor ya da “yeniden birlikte” arıyorsan EKOK.',
      condition: 'Parçalar artansız ve eş olmalı. Kalanlı sorularda (her bölmede 1 artıyor) önce kalanı çıkar/ekle, sonra EBOB/EKOK uygula.',
      trap: 'Yalnız “en büyük / en küçük” kelimesine göre seçim yapmak.',
      transfer: [
        {
          id: 'secim-varil', level: 'Yakın alıştırma (EBOB)', text: '24 L ve 36 L’lik iki varildeki su, eşit hacimli ve olabildiğince büyük kaplara artmadan dolduruluyor. En az kaç kap gerekir?',
          options: ['$5$', '$12$', '$72$'], answer: 0,
          hints: ['Bölme işi: kap hacmi iki hacmi de bölmeli.', 'EBOB$(24,36)=12$ L.', '$2+3=5$ kap.'],
          feedback: ['12 L’lik kaplar: $2+3$.', '12 kap hacmi; soru kap sayısı.', '72 EKOK; bölme işinde değil.'],
        },
        {
          id: 'secim-karo', level: 'Farklı iş (EKOK)', text: '6 cm × 8 cm karolar döndürülmeden yan yana dizilerek olabildiğince küçük bir kare yapılacak. Kaç karo gerekir?',
          options: ['$12$', '$24$', '$48$'], answer: 0,
          hints: ['Birleştirme işi: kare kenarı 6’nın ve 8’in katı.', 'EKOK$(6,8)=24$.', '$(24/6)(24/8)=4\\cdot3$.'],
          feedback: ['24 cm kare: $4\\cdot3=12$ karo.', '24 kare kenarı; karo sayısı değil.', '$48$ cm kenar mümkün ama en küçük değil.'],
        },
        {
          id: 'secim-kalan', level: 'Kalanlı EKOK', text: 'Bir sayı 4’e, 6’ya ve 9’a bölündüğünde her seferinde 1 kalanını veriyor. Bu özellikteki en küçük iki basamaklı sayı kaçtır?',
          options: ['$37$', '$36$', '$13$'], answer: 0,
          hints: ['Sayıdan 1 çıkarınca üçüne de bölünür.', 'EKOK$(4,6,9)=36$.', '$36+1=37$.'],
          feedback: ['$37=36+1$.', '36 her birine tam bölünür; kalan 0.', '$13$’ün 9 ile kalanı 4.'],
        },
      ],
      real: [
        { code: 'TYT-0713', answer: 'C', why: 'Aynı bilye sayısı $3\\cdot AB=8\\cdot BA$; çözümden $216$, eşit gruplar onun bölenleri.' },
      ],
    },
    {
      id: 'periyodik', label: 'Periyodik olaylar', short: 'Yeniden birlikte: EKOK',
      objective: 'Farklı aralıklarla tekrar eden olayların yeniden birlikte gerçekleştiği anı EKOK ile bulur; günü/sırayı kalanla belirler.',
      misconception: 'Birlikte gerçekleşmeyi aralıkların çarpımı ya da toplamı sanmak; günleri sayarken başlangıç gününü ayrıca saymak.',
      story: 'Okulda biri 8, diğeri 12 dakikada bir çalan iki zil var. 09.00’da birlikte çaldılar. Teneffüsü kaçırmamak için bir sonraki ortak çalmayı bilmek istiyorsun.',
      predict: {
        question: '8 ve 12 dakikada bir çalan zil 09.00’da birlikte çaldı. Bir sonraki birlikte çalma ne zaman?',
        options: ['09.24', '09.20', '10.36'],
        insight: [
          'Doğru: ortak katların en küçüğü EKOK$(8,12)=24$ dakika.',
          '$8+12=20$: 20’de yalnız ne birinci ne ikinci zil çalar (20, 8’in katı değil).',
          '$8\\cdot12=96$ ortak kat ama ilki değil; 8 ve 12’nin ortak çarpanı 4.',
        ],
      },
      experiment: {
        prompt: 'Zamanı ilerlet; iki zilin 09.00’dan sonra **ilk** birlikte çaldığı dakikayı bul.',
        view: 'bells', visualLabel: 'Zaman çizgisi: zillerin çaldığı dakikalar',
        controls: [{ key: 't', label: '09.00’dan sonra dakika', min: 1, max: 120, step: 1 }, { key: 'third', label: 'Üçüncü zil', options: [[0, 'Yok'], [10, '10 dakikada bir']] }],
        initial: { t: 8, third: 0 },
        compute: ({ t, third }) => {
          const periods = third ? [...BELLS, third] : BELLS;
          return { t, third, periods, ringing: periods.map((p) => t % p === 0), all: periods.every((p) => t % p === 0) };
        },
        readout: (_, r) => [['Saat', `09.${String(r.t % 60).padStart(2, '0')}${r.t >= 60 ? ` (+${Math.floor(r.t / 60)} sa)` : ''}`], ...r.periods.map((p, i) => [`${p} dk zili`, r.ringing[i] ? 'çalıyor' : `${p - (r.t % p)} dk sonra`])],
        target: {
          text: 'Hedef: iki zil (üçüncü zil yok) birlikte çalıyor ve dakika en küçük.',
          test: ({ third }, r) => third === 0 && r.all && r.t === 24,
          example: { t: 24, third: 0 },
          hint: '8’in katları: 8, 16, 24, … 12’nin katları: 12, 24, … İlk ortak?',
        },
        diagnose: ({ third }, r) => {
          if (third) return r.all ? `Üç zil birlikte: ${r.t}. dakika; ilki EKOK$(8,12,10)=120$. Hedef iki zil; üçüncüyü kapat.` : 'Üçüncü zil hedefte yok; önce iki zili çöz, sonra üçüncüyü dene.';
          if (!r.all) return `${r.t}. dakikada ${r.ringing[0] ? 'yalnız 8’lik' : r.ringing[1] ? 'yalnız 12’lik' : 'hiçbiri'} çalıyor.`;
          return `${r.t}. dakikada birlikte çalıyorlar ama ilki değil.`;
        },
        success: 'İlk ortak kat EKOK$(8,12)=24$: 09.24.',
      },
      reasons: [
        {
          question: 'Neden 24. dakika?',
          options: ['Birlikte çalma anları iki aralığın ortak katları; en küçüğü EKOK$(8,12)=24$.', '$8+12+4=24$.', '24 günün saat sayısı.'],
          answer: 0,
          feedback: ['', 'Toplama tesadüfen 24 verir; 6 ve 9 dakikada bir için $6+9+3=18$ doğru olur ama yöntem değil.', 'Saatle ilgisi yok; 10 ve 15 dakikada bir çalsalar ilk ortak an 30. dakika olurdu.'],
        },
        {
          question: '$8\\cdot12=96$ neden ilk birlikte çalma değil?',
          options: ['8 ve 12’nin ortak çarpanı (4) var; 96 ortak kat ama daha küçüğü var.', '96 dakika 1 saati geçtiği için.', 'Çarpım her zaman yanlış sonuç verir.'],
          answer: 0,
          feedback: ['', 'Süre sınırı değil, ortak çarpan nedeniyle: 7 ve 12 için çarpım 84 ve ilk ortak an tam 84’tür.', 'Aralarında asal sayılarda çarpım EKOK’tur.'],
        },
      ],
      proof: 'Zil 1 $8k$, zil 2 $12m$ dakikalarında çalar; birlikte çalma $t$ hem 8’in hem 12’nin katı demektir. Ortak katlar EKOK’un katlarıdır; en küçük pozitif ortak kat EKOK$(8,12)=2^3\\cdot3=24$.',
      rule: 'Birlikte tekrar: EKOK. Gün/sıra: geçen süreyi döngü uzunluğuna böl, kalana bak.',
      condition: 'Olaylar aynı anda başlamış ve düzenli tekrar ediyor olmalı. “3 günde bir” = her 3 günde (aralık 3), başlangıç günü 0 kabul edilir.',
      trap: 'Çarpım ya da toplamı ortak an saymak; “n. kez” sorusunda $n$ yerine $n-1$ aralık olduğunu unutmak.',
      transfer: [
        {
          id: 'per-gun', level: 'Yakın alıştırma', text: 'Ali 4 günde, Ayşe 6 günde bir kütüphaneye gidiyor. Pazartesi birlikte gittiler. Bir sonraki birlikte gidiş hangi gün?',
          options: ['Cumartesi', 'Cuma', 'Pazartesi'], answer: 0,
          hints: ['EKOK$(4,6)=12$ gün sonra.', '$12=7+5$.', 'Pazartesiden 5 gün sonra.'],
          feedback: ['12 gün = 1 hafta + 5 gün: cumartesi.', 'Kalan 5: pazartesiye 5 gün ekle.', '12, 7’nin katı değil.'],
        },
        {
          id: 'per-sulama', level: '“n. kez” sayımı', text: 'Bir bahçe 3 günde bir sulanıyor; ilk sulama salı. 10. sulama hangi gün?',
          options: ['Pazartesi', 'Salı', 'Pazar'], answer: 0,
          hints: ['1. ile 10. sulama arasında 9 aralık var.', '$9\\cdot3=27$ gün.', '$27=3\\cdot7+6$: salıdan 6 gün sonra.'],
          feedback: ['27 gün = 3 hafta + 6 gün: pazartesi.', 'Salı için 7’nin katı gün gerekir; 27 değil.', '$10\\cdot3=30$ gün saydın; aralık sayısı 9.'],
        },
        {
          id: 'per-otobus', level: 'Üç olay, sayım', text: 'Üç otobüs 10, 15 ve 20 dakikada bir kalkıyor; 08.00’de birlikte kalktılar. 12.00 dahil, 08.00’den sonra kaç kez daha birlikte kalkarlar?',
          options: ['$4$', '$5$', '$2$'], answer: 0,
          hints: ['EKOK$(10,15,20)=60$.', 'Saat başlarında: 09, 10, 11, 12.', '08.00 sayılmıyor.'],
          feedback: ['09.00, 10.00, 11.00, 12.00.', '08.00’ı da saydın; soru “daha” diyor.', 'EKOK 60; her saat başı birlikte.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0003', answer: 'C', from: 'temel-kavramlar', why: '5 oyuncu ve 3’er atlayan pas: top $3k \\bmod 5$. sıradaki oyuncuda; 99. sefer için kalan.' },
        { code: 'TYT-0596', answer: 'A', from: 'bolme-bolunebilme', why: '4’lük ve 3’lük etiket döngüleri; 175. kartonun sırası kalanlarla.' },
      ],
    },
  ],
};
