// Bölme ve Bölünebilme laboratuvarı: bölme algoritması (kalan < bölen), kuralla aday üretme, aralarında asal
// çarpanlarla bileşik kural, kalanlarla işlem ve döngü. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const digitSum = (n) => [...String(n)].reduce((s, d) => s + Number(d), 0);
export const altSum = (n) => [...String(n)].reverse().reduce((s, d, i) => s + (i % 2 ? -1 : 1) * Number(d), 0);
export const RULES = {
  3: { label: '3', check: (n) => digitSum(n) % 3 === 0, why: (n) => `rakam toplamı ${digitSum(n)}` },
  4: { label: '4', check: (n) => (n % 100) % 4 === 0, why: (n) => `son iki basamak ${String(n % 100).padStart(2, '0')}` },
  9: { label: '9', check: (n) => digitSum(n) % 9 === 0, why: (n) => `rakam toplamı ${digitSum(n)}` },
  11: { label: '11', check: (n) => altSum(n) % 11 === 0, why: (n) => `sağdan +,−,+,… toplamı ${altSum(n)}` },
};
export const PATTERN_A = ['NORMAL', 'NORMAL', 'DAR', 'DAR'];
export const PATTERN_B = ['S', 'M', 'L'];
export const label = (n) => [PATTERN_A[(n - 1) % 4], PATTERN_B[(n - 1) % 3]];

const BOLEN = 7;

export default {
  conceptId: 'bolme-bolunebilme',
  title: 'Bölme ve Bölünebilme Kuralları',
  exam: 'TYT + AYT',
  hero: { title: 'Kalan ne anlatır?', text: 'Gruplara ayır, artanı izle, kuralın nedenini bul. Bir kural aday üretir, diğeri eler.', art: ['b·q + k', '÷', 'k < b'] },
  goals: [
    {
      id: 'bolme-algoritmasi', label: 'Bölme algoritması', short: 'Bölünen = bölen·bölüm + kalan',
      objective: 'Bölünen = bölen × bölüm + kalan eşitliğini $0\\le$ kalan $<$ bölen koşuluyla kurar; bölüm/kalan ilişkisi verilen sayıları ve uç değeri bulur.',
      misconception: 'Kalanın bölene eşit ya da büyük olabileceğini düşünmek; bölüm–kalan eşitliğinde en büyük sayıyı $7\\cdot7+7$ sanmak.',
      story: '50 kurabiyeyi 7’li paketlere koyuyorsun. Kaç paket dolar, kaç kurabiye artar? Artan 7 olsaydı ne olurdu?',
      predict: {
        question: '7 ile bölündüğünde bölümü kalanına eşit olan en büyük doğal sayı kaçtır?',
        options: ['$48$', '$56$', '$63$'],
        insight: [
          'Doğru: sayı $7q+q=8q$ ve kalan $q\\le6$; en büyük $8\\cdot6=48$.',
          '$56=7\\cdot7+7$ yazımında kalan 7: bir paket daha dolar, gerçek bölüm 8, kalan 0.',
          '$63=7\\cdot9$; kalan 0, bölüm 9. Eşit değiller.',
        ],
      },
      experiment: {
        prompt: 'Bölüm ve kalanı seç; 7’ye bölündüğünde bölümü kalanına eşit olan **en büyük** sayıyı kur.',
        view: 'groups', visualLabel: '7’li sıralar ve artan',
        controls: [{ key: 'q', label: 'Bölüm $q$ (dolu sıra)', min: 0, max: 9, step: 1 }, { key: 'r', label: 'Kalan $k$ (artan)', min: 0, max: 9, step: 1 }],
        initial: { q: 3, r: 2 },
        compute: ({ q, r }) => ({ q, r, n: BOLEN * q + r, invalid: r >= BOLEN ? `Kalan ${r}, bölen 7’den küçük değil: artanlardan bir sıra daha dolar. Gerçek bölüm ${q + Math.floor(r / BOLEN)}, kalan ${r % BOLEN}.` : null }),
        readout: (_, r) => [['Bölünen', `$7\\cdot${r.q}+${r.r}=${r.n}$`], ['Bölüm = kalan?', r.q === r.r ? 'evet' : 'hayır'], ['Gerçek bölme', `${r.n} = 7·${Math.floor(r.n / 7)} + ${r.n % 7}`]],
        target: {
          text: 'Hedef: kalan geçerli ($k<7$), bölüm = kalan ve sayı en büyük.',
          test: (_, r) => !r.invalid && r.q === r.r && r.n === 48,
          example: { q: 6, r: 6 },
          hint: 'Bölüm = kalan ise sayı $7q+q=8q$. $q$ ne kadar büyük olabilir? Kalanın sınırını hatırla.',
        },
        diagnose: (_, r) => {
          if (r.invalid) return 'Kalan bölenden küçük olmalı; 7 ya da daha fazla artan bir sıra daha doldurur.';
          if (r.q !== r.r) return `Bölüm ${r.q}, kalan ${r.r}: eşit değil. İkisini aynı sayı yap.`;
          return `$${r.n}=7\\cdot${r.q}+${r.r}$ geçerli ama en büyük değil; kalan en çok 6 olabilir.`;
        },
        success: 'Kalanın üst sınırı bölüm–kalan eşitliğinde sınırı da belirledi: $8\\cdot6=48$.',
      },
      reasons: [
        {
          question: 'Kalan neden 7 olamaz?',
          options: ['7 artan olursa bir tam sıra daha oluşur; bölüm 1 artar, kalan 0 olur.', 'Kalan her zaman bölümden küçük olmalıdır.', 'Kalan tek sayı olmalıdır.'],
          answer: 0,
          feedback: ['', 'Kalanın sınırı bölüme değil bölene bağlıdır: $7\\cdot1+5=12$’de kalan 5 bölümden büyük ve geçerli.', 'Kalan çift de olabilir: $16=7\\cdot2+2$.'],
        },
        {
          question: '“Bölüm = kalan” koşulunda sayı neden $8q$ biçimindedir?',
          options: ['$N=7q+k$ ve $k=q$ ise $N=7q+q=8q$.', 'Bölen 7 olduğu için sayı 7’nin katıdır.', '$N=7+q$ olduğu için.'],
          answer: 0,
          feedback: ['', 'Kalan 0 değilse sayı 7’nin katı değildir: $48$’in 7 ile kalanı 6.', 'Bölen bölüm kadar tekrar eder: $7\\cdot q$, toplama değil çarpma.'],
        },
      ],
      proof: 'Bölme algoritması: her doğal $N$ ve $b>0$ için $N=b\\,q+k$, $0\\le k<b$ olacak biçimde tek $(q,k)$ vardır. $k=q$ iken $N=(b+1)q$ ve $q\\le b-1$; en büyük $N=(b+1)(b-1)=b^2-1$. $b=7$: $48$.',
      rule: 'Önce $N=b\\,q+k$ yaz; sonra kalanın $0\\le k<b$ sınırını uygula.',
      condition: 'Doğal sayılarda ve pozitif bölende. Kalan, yalnız bölenden küçük olunca biricik olur.',
      trap: '$k\\ge b$ olan yazımı geçerli saymak (ör. $56=7\\cdot7+7$).',
      transfer: [
        {
          id: 'ba-yakin', level: 'Yakın alıştırma', text: 'Bir sayı 9’a bölündüğünde bölüm 5, kalan 4’tür. Bu sayı kaçtır?',
          options: ['$49$', '$45$', '$54$'], answer: 0,
          hints: ['Bölünen = bölen × bölüm + kalan.', '$9\\cdot5+4$.', '$45+4=49$.'],
          feedback: ['$9\\cdot5+4=49$.', '$45$ kalanı eklemeden; artan 4’ü unutma.', '$54=9\\cdot6$; bölüm 6 olurdu.'],
        },
        {
          id: 'ba-kalan', level: 'Kalanlarla işlem', text: '$a$ sayısının 6 ile bölümünden kalan 4 ise $3a+1$ sayısının 6 ile bölümünden kalan kaçtır?',
          options: ['$1$', '$13$', '$5$'], answer: 0,
          hints: ['$a=6q+4$ yaz.', '$3a+1=18q+13$.', '$18q$ 6’ya bölünür; $13=6\\cdot2+1$.'],
          feedback: ['$3\\cdot4+1=13$, $13$’ün 6 ile kalanı 1.', '13 kalan olamaz; kalan 6’dan küçük olmalı.', '$13-6=7$, bir kez daha çıkar: 1.'],
        },
        {
          id: 'ba-donustur', level: 'Farklı bölen', text: '$x$ sayısı 8’e bölündüğünde bölüm 3, kalan 5’tir. $x$, 5’e bölünürse bölüm ve kalan nedir?',
          options: ['Bölüm 5, kalan 4', 'Bölüm 3, kalan 5', 'Bölüm 5, kalan 3'], answer: 0,
          hints: ['Önce $x$’i bul.', '$x=8\\cdot3+5=29$.', '$29=5\\cdot5+4$.'],
          feedback: ['$x=29=5\\cdot5+4$.', 'Bölen değişince bölüm ve kalan da değişir; kalan 5, bölen 5’ten küçük de değil.', '$5\\cdot5+3=28\\neq29$.'],
        },
      ],
      real: [
        { code: 'TYT-0600', answer: 'E', why: '49’u 9’a böl (bölüm 5, kalan 4); $m$’nin bölüm ve kalanı yer değiştirir: $m=9\\cdot4+5$.' },
        { code: 'TYT-0548', answer: 'A', why: 'Bölümün tam kısmı: $\\lfloor AB/6\\rfloor=\\lfloor19/4\\rfloor=\\lfloor AB/5\\rfloor$; aralıkları kesiştir.' },
        { code: 'TYT-0601', answer: 'B', why: 'Gensayı $(n-1)k+1$; $100$ için $n-1$ sayısı $99$’u bölmeli.' },
        { code: 'AYT_Sayisal-0030', answer: 'E', why: '$25!=600\\cdot23!$; $23!-a$ ile bölmede kalan $600a$, kalan bölenden küçük.' },
      ],
    },
    {
      id: 'kural', label: 'Kuralla aday', short: 'Rakam toplamı, son basamaklar',
      objective: 'Bölünebilme kuralını bilinmeyen rakama uygulayarak aday kümesini çıkarır; 3 ve 9 kurallarının neden rakam toplamına baktığını açıklar.',
      misconception: '9 (ya da 3) için son rakama bakmak; bir kuralın tek değer verdiğini sanıp diğer adayları kaçırmak.',
      story: 'Bir market fişindeki dört basamaklı tutarın bir rakamı silinmiş: 4?65. Tutarın 9 kişiye eşit bölündüğü biliniyor. Silinen rakam ne?',
      predict: {
        question: '$4A65$ sayısı 3 ile bölünüyorsa $A$ kaç farklı değer alabilir?',
        options: ['$1$', '$3$', '$4$'],
        insight: [
          '3 için $15+A$ 3’ün katı olmalı: $A=0,3,6,9$. Tek değer 9 kuralında çıkar.',
          '$A=0$’ı unutma: $4065$ de 3’e bölünür. Dört değer var.',
          'Doğru: $15+A\\in\\{15,18,21,24\\}$, yani $A\\in\\{0,3,6,9\\}$.',
        ],
      },
      experiment: {
        prompt: 'Kuralı ve $A$’yı seç; $4A65$ sayısını **9 ile** bölünür yap.',
        view: 'rule', visualLabel: 'Rakamlar ve kuralın baktığı yer',
        controls: [{ key: 'd', label: 'Kural', options: [[3, '3 ile'], [4, '4 ile'], [9, '9 ile'], [11, '11 ile']] }, { key: 'a', label: 'Rakam $A$', min: 0, max: 9, step: 1 }],
        initial: { d: 3, a: 3 },
        compute: ({ d, a }) => { const n = 4065 + 100 * a; return { d, a, n, ok: RULES[d].check(n), why: RULES[d].why(n), real: n % d === 0 }; },
        readout: ({ d }, r) => [['Sayı', fmt(r.n)], [`${d} kuralı`, `${r.why} → ${r.ok ? 'bölünür' : 'bölünmez'}`], ['Gerçek bölme', `${fmt(r.n)} = ${d}·${Math.floor(r.n / d)} + ${r.n % d}`]],
        target: {
          text: 'Hedef: 9 kuralı seçili ve $4A65$ 9 ile bölünüyor.',
          test: ({ d }, r) => d === 9 && r.real,
          example: { d: 9, a: 3 },
          hint: '9 için rakam toplamı $4+A+6+5=15+A$ 9’un katı olmalı. $A$ en çok 9.',
        },
        diagnose: ({ d }, r) => d !== 9 ? `Şu an ${d} kuralını inceliyorsun (${r.ok ? 'bölünür' : 'bölünmez'}). Hedef 9 kuralı; seç ve $A$’yı ayarla.` : `Rakam toplamı $15+${r.a}=${15 + r.a}$; 9’un katı değil.`,
        success: '$15+A=18$ yalnız $A=3$ ile: 9 kuralında tek aday, 3 kuralında dört aday.',
      },
      reasons: [
        {
          question: '9 ile bölünebilmede neden rakam toplamına bakılır?',
          options: ['$10,100,1000$’in her biri 9 ile bölününce 1 kalanını verir; sayı ile rakam toplamı aynı kalanı verir.', 'Son rakam 9 ise sayı 9’a bölünür.', 'Rakamlar toplanınca sayı küçülür, bölme kolaylaşır.'],
          answer: 0,
          feedback: ['', '$19$’un son rakamı 9 ama 9’a bölünmez; $18$’in son rakamı 8 ama bölünür.', 'Kolaylık bir sonuç; neden, $10\\equiv1$ olmasıdır. Aksi hâlde toplam kalanı korumazdı.'],
        },
        {
          question: '3 kuralında dört aday, 9 kuralında tek aday neden çıkar?',
          options: ['$15+A$, $A\\le9$ iken 3’ün dört katına (15,18,21,24), 9’un yalnız bir katına (18) eşit olabilir.', '9, 3’ten büyük olduğu için her zaman daha az aday çıkar.', '3 kuralı yanlış sonuç verir.'],
          answer: 0,
          feedback: ['', 'Aday sayısı katların aralığa düşmesine bağlı: $A$ aralığı farklı olsaydı 9 için iki aday da çıkabilirdi.', '3 kuralı doğrudur; yalnız daha geniş bir aday kümesi verir.'],
        },
      ],
      proof: '$10\\equiv1\\pmod9$ olduğundan $10^k\\equiv1$; $\\overline{a_n\\dots a_0}=\\sum a_k10^k\\equiv\\sum a_k$. Aynı akıl yürütme 3 için de geçerli. 4 için $100\\equiv0\\pmod4$: yalnız son iki basamak kalır. 11 için $10\\equiv-1$: işaretli toplam.',
      rule: 'Bilinmeyen rakamı kurala yerleştir, $0$–$9$ aralığında bütün adayları listele.',
      condition: 'Kural yalnız tam bölünüp bölünmediğini (ve 3, 9, 11’de kalanı) söyler; rakamın 0–9 ve baş rakamın 0 olmaması koşulları ayrıca uygulanır.',
      trap: 'Aday listesinde $A=0$’ı ya da ikinci uygun katı unutmak.',
      transfer: [
        {
          id: 'kural-yakin', level: 'Yakın alıştırma', text: '$5A2$ sayısı 4 ile bölünüyorsa $A$ kaç farklı değer alır?',
          options: ['$5$', '$3$', '$10$'], answer: 0,
          hints: ['4 kuralı son iki basamağa bakar: $\\overline{A2}$.', '$12, 32, 52, 72, 92$ 4’e bölünür.', '$A\\in\\{1,3,5,7,9\\}$.'],
          feedback: ['$A$ tek olmalı: 5 değer.', '$12, 32, 52, 72, 92$: beşini de say.', 'Son basamak 2 iken $\\overline{A2}$’nin yalnız bir kısmı 4’e bölünür; $22$ bölünmez.'],
        },
        {
          id: 'kural-11', level: 'Farklı kural', text: '$38A6$ sayısının 11 ile bölünmesi için $A$ kaçtır?',
          options: ['$0$', '$5$', '$9$'], answer: 0,
          hints: ['Sağdan başlayarak $+,-,+,-$: $6-A+8-3$.', '$11-A$ 11’in katı olmalı.', '$A=0$: $3806=11\\cdot346$.'],
          feedback: ['$11-0=11$.', '$11-5=6$; 11’in katı değil.', '$11-9=2$; 11’in katı değil.'],
        },
        {
          id: 'kural-kalan', level: 'Kural + kalan', text: '$ABC$ sayısı 5 ile bölünüyor ve $C\\neq0$. $ABC+3$ sayısının 5 ile bölümünden kalan kaçtır?',
          options: ['$3$', '$8$', '$0$'], answer: 0,
          hints: ['5 kuralı: son rakam 0 ya da 5.', '$C\\neq0$ ise $C=5$.', '$ABC+3$ son rakamı 8; 8’in 5 ile kalanı 3.'],
          feedback: ['Son rakam 8: kalan 3.', '8 son rakamdır; kalan 5’ten küçük olmalı.', '$ABC$ 5’e bölünüyor ama 3 ekleyince kalan 3 olur.'],
        },
      ],
      real: [
        { code: 'TYT-0597', answer: 'B', why: 'Kat ilişkisi aday üretir, 3 kuralı (rakam toplamı) eler: $621$.' },
        { code: 'AYT_Sayisal-0005', answer: 'D', why: '5 kuralı $B$’yi, 4 kuralı $C$’yi, 9 kuralı $A$’yı verir; sırayla aday ele.' },
      ],
    },
    {
      id: 'bilesik', label: 'Bileşik kural', short: '12 = 3·4, 2·6 değil',
      objective: 'Bileşik sayıya bölünebilmeyi aralarında asal çarpanlara ayırarak denetler; ortak çarpanlı ayrışımın neden yanılttığını karşı örnekle gösterir.',
      misconception: '“2 ve 6 ile bölünüyorsa 12 ile bölünür” gibi ortak çarpanlı ayrışım kullanmak.',
      story: 'Bir okul 12 kişilik takımlar kuruyor. Öğrenci sayısının hem 2’ye hem 6’ya bölündüğünü biliyorsun. Takımlar tam kurulur mu?',
      predict: {
        question: 'Bir sayı hem 2 hem 6 ile bölünüyorsa 12 ile de bölünür mü?',
        options: ['Her zaman.', 'Bazen.', 'Hiçbir zaman.'],
        insight: [
          '$18$: 2’ye de 6’ya da bölünür ama 12’ye bölünmez. 2 ve 6 ortak çarpanlı.',
          'Doğru: $24$ bölünür, $18$ bölünmez. 2·6 ayrışımı 12’yi garanti etmez.',
          '$24$ hem 2, 6 hem de 12 ile bölünür.',
        ],
      },
      experiment: {
        prompt: 'Ayrışımı, $A$ ve $B$’yi seç; $3A4B$ sayısını 12 ile bölünür yapan **en büyük** sayıyı bul.',
        view: 'pair', visualLabel: 'İki kural ve gerçek bölünme',
        controls: [{ key: 'pair', label: '12’yi nasıl ayırıyorsun?', options: [['3x4', '$3\\cdot4$'], ['2x6', '$2\\cdot6$']] }, { key: 'a', label: 'Rakam $A$', min: 0, max: 9, step: 1 }, { key: 'b', label: 'Rakam $B$', min: 0, max: 9, step: 1 }],
        initial: { pair: '2x6', a: 9, b: 2 },
        compute: ({ pair, a, b }) => {
          const n = 3040 + 100 * a + b;
          const [p, q] = pair === '3x4' ? [3, 4] : [2, 6];
          return { n, p, q, okP: n % p === 0, okQ: n % q === 0, real: n % 12 === 0 };
        },
        readout: (_, r) => [['Sayı', fmt(r.n)], [`${r.p} ile`, r.okP ? 'bölünür' : 'bölünmez'], [`${r.q} ile`, r.okQ ? 'bölünür' : 'bölünmez'], ['12 ile gerçekten', r.real ? 'bölünür' : `bölünmez (kalan ${r.n % 12})`]],
        target: {
          text: 'Hedef: aralarında asal ayrışım seçili, iki kural geçiyor ve sayı 12 kuralını sağlayan en büyük $3A4B$.',
          test: ({ pair }, r) => pair === '3x4' && r.real && r.n === 3948,
          example: { pair: '3x4', a: 9, b: 8 },
          hint: '4 için son iki basamak $\\overline{4B}$: $B\\in\\{0,4,8\\}$. En büyük $B$’yi al, sonra 3 kuralıyla en büyük $A$’yı seç.',
        },
        diagnose: ({ pair }, r) => {
          if (pair === '2x6' && r.okP && r.okQ && !r.real) return `Yanıltıcı durum: ${fmt(r.n)} hem 2 hem 6 ile bölünüyor ama 12 ile bölünmüyor. 2 ile 6 ortak çarpanlı; aralarında asal ayrışım seç.`;
          if (pair === '2x6') return '2 ve 6 aralarında asal değil; iki kural geçse bile 12 garanti olmaz. $3\\cdot4$ ayrışımına geç.';
          if (!r.real) return `${r.okQ ? '' : '4 kuralı geçmedi (son iki basamak). '}${r.okP ? '' : '3 kuralı geçmedi (rakam toplamı). '}İki kuralı da sağla.`;
          return `${fmt(r.n)} 12 ile bölünüyor ama en büyük değil; önce $B$’yi, sonra $A$’yı büyüt.`;
        },
        success: 'Aralarında asal 3 ve 4: ikisine bölünen 12’ye bölünür. En büyük $3948$.',
      },
      reasons: [
        {
          question: '12 için neden 3 ve 4 kullanılır?',
          options: ['3 ve 4 aralarında asal; ikisine bölünen sayı çarpımlarına bölünür.', '3 ve 4, 12’nin en küçük çarpanlarıdır.', '$3+4$ küçük olduğu için hesap kolaydır.'],
          answer: 0,
          feedback: ['', '2 de 12’nin çarpanı ve daha küçük; ama $2\\cdot6$ çalışmaz. Önemli olan ortak çarpan olmaması.', 'Toplam değil çarpım ve aralarında asallık önemli.'],
        },
        {
          question: '2 ve 6 neden yetmez?',
          options: ['Ortak çarpanları 2; ikisine bölünmek yalnız EKOK$(2,6)=6$’ya bölünmeyi garanti eder.', '6 tek sayı olmadığı için.', '2 kuralı yanlış olduğu için.'],
          answer: 0,
          feedback: ['', 'Teklik konu değil; ikisine bölünmenin garanti ettiği şey EKOK’tur.', '2 kuralı doğru; sorun iki kuralın aynı 2’yi iki kez saymasıdır.'],
        },
      ],
      proof: '$a\\mid n$ ve $b\\mid n$ ise $\\text{EKOK}(a,b)\\mid n$. EKOK$(a,b)=ab$ ancak $a$ ile $b$ aralarında asalsa. $3,4$ → 12; $2,6$ → 6. Karşı örnek: $18$.',
      rule: 'Bileşik bölen için aralarında asal çarpanlara ayır ($12=3\\cdot4$, $15=3\\cdot5$, $18=2\\cdot9$, $36=4\\cdot9$) ve her kuralı ayrı uygula.',
      condition: 'Çarpanlar aralarında asal olmalı; kuralları birlikte sağlayan adaylar kesişim kümesidir.',
      trap: '$2\\cdot6$, $3\\cdot6$, $2\\cdot18$ gibi ortak çarpanlı ayrışımlar.',
      transfer: [
        {
          id: 'bil-yakin', level: 'Yakın alıştırma', text: '$5A3B$ sayısı 15 ile bölünüyor ve $B\\neq0$. $A$ kaç farklı değer alabilir?',
          options: ['$3$', '$4$', '$1$'], answer: 0,
          hints: ['$15=3\\cdot5$.', '5 için $B=5$; 3 için $5+A+3+5=13+A$.', '$13+A\\in\\{15,18,21\\}$: $A\\in\\{2,5,8\\}$.'],
          feedback: ['$A=2,5,8$.', '$A=-1$ olamaz; $13+A$ 3’ün katı olan rakamları say.', '3 kuralı birden çok aday verir; hepsini listele.'],
        },
        {
          id: 'bil-kesin', level: 'Kesinlik', text: 'Bir sayı hem 6 hem 9 ile bölünüyor. Aşağıdakilerden hangisi **kesinlikle** doğrudur?',
          options: ['18 ile bölünür.', '54 ile bölünür.', '27 ile bölünür.'], answer: 0,
          hints: ['Garanti olan EKOK’tur.', 'EKOK$(6,9)=18$.', '$18$ kendisi 6 ve 9’a bölünür ama 54’e bölünmez.'],
          feedback: ['EKOK$(6,9)=18$.', '$6\\cdot9=54$ ama 6 ile 9 ortak çarpanlı (3); $18$ karşı örnek.', '$18$ hem 6 hem 9 ile bölünür ama 27’ye bölünmez.'],
        },
        {
          id: 'bil-36', level: 'İki kuralın kesişimi', text: '$2A7B$ sayısı 36 ile bölünüyorsa $A+B$’nin alabileceği en büyük değer kaçtır?',
          options: ['$9$', '$18$', '$8$'], answer: 0,
          hints: ['$36=4\\cdot9$.', '4: $\\overline{7B}\\in\\{72,76\\}$; 9: $9+A+B$ 9’un katı.', '$B=2$: $A=7$; $B=6$: $A=3$. İkisinde de $A+B=9$.'],
          feedback: ['$2772$ ve $2376$: $A+B=9$.', '$A+B=18$ için $B=6$, $A=12$ gerekir; rakam değil.', '$A+B=8$ ise rakam toplamı 17; 9’a bölünmez.'],
        },
      ],
      real: [
        { code: 'TYT-0595', answer: 'E', why: '11 kuralı hangi sayının 11’e bölündüğünü seçtirir; diğeri için $12=3\\cdot4$ kuralları birlikte.' },
        { code: 'AYT_Sayisal-0027', answer: 'D', why: '$20=4\\cdot5$, $18=2\\cdot9$, $15=3\\cdot5$: her ayrışımın kuralını aynı rakamlara uygula.' },
        { code: 'AYT_Sayisal-0041', answer: 'B', why: '11’e bölünme, rakam çarpımı 12’ye ve toplamı 13’e bölünme koşullarının kesişimi.' },
      ],
    },
    {
      id: 'kalan-islem', label: 'Kalan ve döngü', short: 'Tekrar eden düzende sıra bul',
      objective: 'Tekrar eden düzende sırayı kalanla bulur; iki döngünün birlikte başa dönüşünü EKOK ile açıklar; kalanlarla toplama/çarpma yapar.',
      misconception: 'Bölümü sıra numarası sanmak; kalan 0’ı döngünün başı saymak; iki döngünün toplam uzunluğunu ($3+4$) ortak tekrar sanmak.',
      story: 'İki makine art arda gelen kartonları etiketliyor: biri “normal, normal, dar, dar”, diğeri “S, M, L” diye. İki makine hangi kartonda yeniden birlikte döngünün başında olur?',
      predict: {
        question: 'İki makine 1. kartondan sonra ilk kez hangi kartonda yeniden birlikte döngünün başında olur?',
        options: ['$13$', '$10$', '$7$'],
        insight: [
          'Doğru: 4’lük ve 3’lük döngüler $\\text{EKOK}(4,3)=12$ kartonda birlikte başa döner; $1+12=13$.',
          '10. kartonun etiketleri NORMAL · S, 1. kartonla aynı görünüyor; ama 1. makine döngünün 2. sırasında (NORMAL iki kez geçiyor). Etiket değil, sıra önemli.',
          '$3+4$ iki döngünün uzunluk toplamı; ortak tekrar EKOK ile olur.',
        ],
      },
      experiment: {
        prompt: 'Karton numarasını değiştir; 1. kartondan sonra iki makinenin de döngünün **başında** olduğu ilk kartonu bul.',
        view: 'cycle', visualLabel: 'İki döngü: 4’lük ve 3’lük',
        controls: [{ key: 'n', label: 'Karton numarası $n$', min: 2, max: 40, step: 1 }],
        initial: { n: 5 },
        compute: ({ n }) => ({ n, r4: (n - 1) % 4, r3: (n - 1) % 3, tags: label(n), same: (n - 1) % 12 === 0 }),
        readout: (_, r) => [['Etiketler', r.tags.join(' · ')], ['1. makinede sıra', `${r.r4 + 1}. ($n-1$’in 4 ile kalanı ${r.r4})`], ['2. makinede sıra', `${r.r3 + 1}. ($n-1$’in 3 ile kalanı ${r.r3})`]],
        target: {
          text: 'Hedef: iki makine de döngünün 1. sırasında ve $n$ en küçük.',
          test: (_, r) => r.n === 13,
          example: { n: 13 },
          hint: '1. makine 4 kartonda bir, 2. makine 3 kartonda bir başa döner. İkisinin birlikte döndüğü en küçük adım?',
        },
        diagnose: (_, r) => r.same ? `${r.n}. kartonda iki makine de başta ama ilk değil; daha küçük bir ortak tekrar var.` : r.tags.join() === 'NORMAL,S' ? `Etiketler 1. kartondaki gibi (NORMAL · S) ama 1. makine ${r.r4 + 1}. sırada: NORMAL döngüde iki kez geçiyor. Sıra aynı olmalı.`
          : `${r.n}. kartonda 1. makine ${r.r4 === 0 ? 'başta' : `${r.r4 + 1}. sırada`}, 2. makine ${r.r3 === 0 ? 'başta' : `${r.r3 + 1}. sırada`}. İkisi birlikte başta olmalı.`,
        success: 'İki döngü EKOK$(4,3)=12$ kartonda birlikte başa döner: 13. karton.',
      },
      reasons: [
        {
          question: 'Neden 13. karton?',
          options: ['Döngüler 4 ve 3 uzunlukta; ikisi birlikte $\\text{EKOK}(4,3)=12$ kartonda başa döner.', 'Döngü uzunlukları toplamı $4+3=7$’ye 6 eklenir.', '13 asal olduğu için.'],
          answer: 0,
          feedback: ['', '8. kartonda 1. makine 4., 2. makine 2. sırada; toplam uzunluk ortak tekrar değildir.', 'Asallığın rolü yok; 25 ve 37 de aynı etiketleri taşır.'],
        },
        {
          question: '175. kartonun 1. makinedeki etiketini nasıl bulursun?',
          options: ['$175-1=174$’ün 4 ile kalanı 2: döngünün 3. etiketi (DAR).', '$175$’i 4’e böl; bölüm 43, döngünün 43. etiketi.', '$175$’in 4 ile kalanı 3; döngünün 4. etiketi.'],
          answer: 0,
          feedback: ['', 'Bölüm kaç tam tur atıldığını söyler; sıra kalanla bulunur.', '$n$’nin kendisini bölersen kalan 3, döngünün 3. etiketi demektir (kalan 0 → 4. etiket). Kalanı bir kaydırma.'],
        },
      ],
      proof: '$p$ uzunluklu döngüde $n$. elemanın sırası $(n-1)\\bmod p$ ile belirlenir. İki döngüde $(n-1)\\equiv0\\pmod4$ ve $(n-1)\\equiv0\\pmod3$ olmalı ⇔ $12\\mid n-1$ (4 ve 3 aralarında asal). En küçük $n>1$: 13.',
      rule: 'Sırayı kalan belirler; birden çok döngü EKOK adımda birlikte tekrar eder.',
      condition: 'Düzen gerçekten sabit uzunlukta tekrar etmeli. Hangi sayıyı böldüğüne dikkat et: $n$ mi, $n-1$ mi (kalan 0’ın anlamı değişir).',
      trap: 'Bölümü sıra sanmak; kalan 0’ı “ilk eleman” diye okumak.',
      transfer: [
        {
          id: 'kalan-gun', level: 'Yakın alıştırma', text: 'Bugün salı. 100 gün sonra hangi gün olur?',
          options: ['Perşembe', 'Çarşamba', 'Salı'], answer: 0,
          hints: ['Haftalık döngü 7 gün.', '$100=7\\cdot14+2$.', 'Salıdan 2 gün sonra.'],
          feedback: ['14 tam hafta + 2 gün: perşembe.', 'Kalan 2; salıdan 1 değil 2 gün ilerle.', '100 7’nin katı değil; kalan 2 gün var.'],
        },
        {
          id: 'kalan-islem-carpim', level: 'Kalanlarla işlem', text: '$a$’nın 5 ile bölümünden kalan 3, $b$’nin kalanı 2 ise $ab+a$ sayısının 5 ile bölümünden kalan kaçtır?',
          options: ['$4$', '$9$', '$1$'], answer: 0,
          hints: ['Kalanlarla işlem yap: $a\\to3$, $b\\to2$.', '$3\\cdot2+3=9$.', '$9$’un 5 ile kalanı 4.'],
          feedback: ['$9=5+4$.', '9 kalan olamaz; 5’ten küçük olmalı.', '$3\\cdot2=6\\to1$, ama $+a$ (3) eklenince $4$.'],
        },
        {
          id: 'kalan-birler', level: 'Farklı döngü', text: '$7^{50}$ sayısının birler basamağındaki rakam kaçtır?',
          options: ['$9$', '$7$', '$1$'], answer: 0,
          hints: ['Birler basamağı döngüsü: $7, 9, 3, 1$.', 'Döngü 4 uzunlukta; $50$’nin 4 ile kalanı 2.', 'Döngünün 2. elemanı: 9.'],
          feedback: ['$7^2=49$ gibi biter.', 'Kalan 1 olsaydı 7 olurdu; 50’nin kalanı 2.', 'Kalan 0 (üs 4’ün katı) olsaydı 1 olurdu.'],
        },
      ],
      real: [
        { code: 'TYT-0596', answer: 'A', why: '4’lük ve 3’lük etiket döngülerinde 175. kartonun sırasını kalanlarla bul.' },
      ],
    },
  ],
};
