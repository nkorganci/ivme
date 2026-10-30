// Sayı Basamakları: bölüm keşifleri. Özgün öğretim örnekleri; sınav sorusu değildir.
import { power, show } from './yardim.js';

const group = show;

export const explorations = {
  'basamak-ters': {
    lessonId: 'sayi-basamaklari',
    title: 'Rakamlar yer değiştirince ne değişir?',
    story: 'Bir çocuk 38 yerine yanlışlıkla 83 yazdı. Aynı iki rakam, ama sayılar arasında 45 fark var. Onlar basamağındaki rakam birlere inince değeri onda birine düşer; birlerden onlara çıkan rakamın değeri ise on katına çıkar. Fark, bu iki değişimin sonucudur.',
    terms: [['Onlar basamağı', 'İki basamaklı sayıda soldaki yer; oradaki rakam 10 ile çarpılır: $AB=10A+B$.'], ['Ters sayı', 'Rakamları yer değiştirmiş sayı: $AB$’nin tersi $BA$.'], ['Rakam farkı', '$A-B$: iki rakam arasındaki fark. Sayı farkı bunun 9 katıdır.']],
    experiment: 'A’yı ve B’yi değiştir. Fark kutusunun her zaman 9’un katı, toplam kutusunun hep 11’in katı olduğunu gözle. A ile B eşit olunca ne oluyor?',
    example: '$83-38$ farkını ve $83+38$ toplamını kısa yoldan bulalım.',
    steps: [
      ['Sayıları aç', '$83=8\\cdot10+3$ ve $38=3\\cdot10+8$.'],
      ['Farkı rakamlara bağla', '$AB-BA=(10A+B)-(10B+A)=9A-9B=9(A-B)$. Burada $9\\cdot(8-3)=45$.'],
      ['Toplamı rakamlara bağla', '$AB+BA=11(A+B)=11\\cdot11=121$. Kontrol: $83+38=121$.'],
    ],
    tip: 'İki basamaklı bir sayı ile tersinin farkı $9\\cdot$(rakam farkı), toplamı $11\\cdot$(rakam toplamı)dır. Üç basamaklıda ortadaki rakam yerinde kalırsa $ABC-CBA=99(A-C)$ olur.',
    trap: 'Fark verildiğinde yalnız rakam farkı bulunur, sayı tek türlü belirlenmez: $AB-BA=36$ ise 51, 62, 73, 84, 95 sayılarının hepsi uyar. Toplam verildiğinde de yalnız $A+B$ bulunur.',
    transfer: ['$AB-BA=63$ ise $A-B$ kaçtır?', '7', '6', '$9(A-B)=63$, yani $A-B=7$. Örnek: $81-18=63$ ya da $92-29=63$.'],
    expert: 'Fark her zaman 9’un katı olduğu için kasada iki rakamın yer değiştirmesinden doğan hata 9’a bölünür. Toplam 11’in katıdır; $AB+BA=121$ verilirse $A+B=11$ bulunur ama A ile B tek tek belirlenmez: 29, 38, 47, 56 … hepsi uyar.',
  },
  'basamak-ekle': {
    lessonId: 'sayi-basamaklari',
    title: 'Sağa yazınca on katı, sola yazınca basamak değeri',
    story: 'Bir sayının sonuna bir rakam eklemekle başına bir rakam eklemek çok farklı sonuçlar verir. Sağa eklenen rakam eski bütün rakamları bir basamak sola iter. Sola eklenen rakam ise eski rakamlara dokunmaz, yalnız yeni bir basamak açar.',
    terms: [['Sağa rakam eklemek', '$x$’in sağına $d$ yazmak: yeni sayı $10x+d$.'], ['Sola rakam eklemek', 'İki basamaklı $x$’in soluna $d$ yazmak: yeni sayı $100d+x$.'], ['Değişim', 'Yeni sayı − eski sayı.']],
    experiment: 'x’i ve eklenen rakamı seç, sonra yeri değiştir. Sağa eklerken eski rakamların hangi basamağa kaydığını izle. Değişim neden sağa eklemede $9x+d$, sola eklemede $100d$ oluyor?',
    example: '47’nin sağına 5 yazmak ile soluna 5 yazmak sayıyı ne kadar değiştirir?',
    steps: [
      ['Sağa ekle', '47’nin sağına 5 yazınca 475 olur: 47 önce on katına çıktı (470), sonra 5 eklendi. Değişim $475-47=428=9\\cdot47+5$.'],
      ['Sola ekle', '47’nin soluna 5 yazınca 547 olur: eski rakamlar yerinde kaldı, yüzler basamağına 5 geldi. Değişim $547-47=500$.'],
      ['Karşılaştır', 'Sağa eklemede değişim eski sayıya bağlıdır ($9x+d$); sola eklemede yalnız eklenen rakama ve açılan basamağa bağlıdır ($100d$).'],
    ],
    tip: 'Sağa ekleme: $x\\to10x+d$. İki basamaklı sayının soluna ekleme: $x\\to100d+x$. Soruda “kaç fazla” deniyorsa farkı bu iki kalıpla kur.',
    trap: 'Sola 0 yazmak sayıyı değiştirmez (047 = 47); sağa 0 yazmak sayıyı 10 katına çıkarır. Sola ekleme kalıbı eski sayının basamak sayısına bağlıdır: üç basamaklı bir sayıda $1000d+x$ olur.',
    transfer: ['36’nın sağına bir $d$ rakamı yazılınca sayı 329 artıyor. $d$ kaçtır?', '5', '2', '$10\\cdot36+d-36=324+d=329$, yani $d=5$. Yeni sayı 365.'],
    expert: 'Bu kalıplar çözümlemenin kısa yazımıdır. Sağa $k$ basamaklı bir $y$ eklemek $10^k x+y$ verir: 47’nin sağına 25 yazmak $4700+25$’tir. Problemlerde bilinmeyen sayıya $x$ deyip yeni sayıyı bu kalıpla yazmak, rakamları tek tek harflemekten kısa bir denklem kurar.',
  },
  'basamak-rakam': {
    lessonId: 'sayi-basamaklari',
    title: 'Rakam toplamı sabitken en küçük ve en büyük sayı',
    story: 'Üç tekerlekli bir sayı kilidinde rakamların toplamı belli olsun. En büyük sayıyı yazmak için en değerli basamağı, yani en soldakini doldurmaya çalışırız. En küçük sayı için ise yükü sağdaki basamaklara veririz.',
    terms: [['Rakam toplamı', 'Sayının rakamlarının toplamı: 489 için $4+8+9=21$.'], ['Açgözlü doldurma', 'En etkili basamağa önce en uygun rakamı yazmak.'], ['İlk basamak', 'Üç basamaklı sayıda yüzler basamağı; 0 olamaz.']],
    experiment: 'Rakam toplamını değiştir ve farklılık koşulunu aç–kapat. En küçük sayıda birler basamağının neden hep büyük, yüzler basamağının neden küçük olduğunu izle. Hangi toplamlar için hiç sayı yok?',
    example: 'Rakamları toplamı 20 olan üç basamaklı en küçük ve en büyük sayıyı bulalım.',
    steps: [
      ['En küçük için sağdan doldur', 'Birler 9, onlar 9; yüzlere $20-18=2$ kalır: 299.'],
      ['En büyük için soldan doldur', 'Yüzler 9, onlar 9; birlere $20-18=2$ kalır: 992.'],
      ['Koşul eklenirse yeniden dene', 'Rakamlar farklı olmalıysa en küçük sayıda birler 9, onlar 8, yüzler 3: 389. En büyükte 9, 8, 3: 983.'],
    ],
    tip: 'En küçük sayı: sağdan 9’larla doldur, kalanı en sola yaz (sol 0 olamaz). En büyük sayı: soldan 9’larla doldur. Farklılık koşulunda 9, 8, 7, … sırasıyla kullan.',
    trap: 'Rakam toplamı 1 iken en küçük üç basamaklı sayı 100’dür; rakamlar farklı olmak zorundaysa böyle bir sayı yoktur. Üç rakamın toplamı 27’yi aşamaz.',
    transfer: ['Rakamları toplamı 15 olan, rakamları farklı üç basamaklı en küçük sayı kaçtır?', '159', '168', 'Birlere 9; yüzler 1 olunca onlara $15-1-9=5$ kalır: 159. 168 de koşulu sağlar ama daha büyüktür.'],
    expert: 'Toplamı $S$ olan en küçük $k$ basamaklı sayıda sağdaki basamaklar 9 olur ve kalan $S-9(k-1)$ en sola yazılır; bu kalan en az 1 olmalıdır. Rakamlar farklıysa sağdan 9, 8, 7, … yazılır. Yöntem, sayıların büyüklüğünü önce en soldaki basamağın belirlemesinden gelir.',
  },
  'basamak-sifir': {
    lessonId: 'sayi-basamaklari',
    title: '2’ler ile 5’ler eşleşince sıfır olur',
    story: 'Bir fabrikada her kutuda $5^b$ vida var ve $2^a$ kutu dolduruluyor. Toplamın kaç basamaklı olduğunu bulmak için sayıyı hesaplamaya gerek yok: her 2 ile her 5 birleşip bir 10 yapar ve sayının sonuna bir sıfır ekler.',
    terms: [['Çarpan eşleşmesi', '$2\\cdot5=10$; her eşleşme sona bir sıfır ekler.'], ['Artan çarpan', 'Eşleşmeden kalan 2’ler ya da 5’ler; sıfır üretmez.'], ['$k\\cdot10^n$ biçimi', '$1\\leq k<10$ ise sayı $n+1$ basamaklıdır; $k$ daha büyükse $k$’nin basamak sayısı eklenir.']],
    experiment: '2’lerin ve 5’lerin sayısını değiştir. Kaç tane 10 oluştuğunu, hangi çarpanların arttığını ve basamak sayısını izle. Artan çarpanlar çoğaldıkça basamak sayısı neden bazen bir anda artıyor?',
    example: '$2^{7}\\cdot5^{4}$ kaç basamaklıdır ve sonunda kaç sıfır vardır?',
    steps: [
      ['Eşleştir', 'Dört 5, dört 2 ile eşleşir: $2^4\\cdot5^4=10^4$. Geriye $2^3=8$ kalır.'],
      ['Biçime getir', '$2^7\\cdot5^4=8\\cdot10^4=80\\,000$.'],
      ['Say', '8 tek basamaklı ve 4 sıfır var: $1+4=5$ basamak; sonda 4 sıfır.'],
    ],
    tip: 'Küçük üs kadar 10 oluşur; sondaki sıfır sayısı küçük üstür. Basamak sayısı = artan çarpanın basamak sayısı + sıfır sayısı.',
    trap: 'Artan kısım tek basamaklı olmayabilir: $2^9\\cdot5^5=16\\cdot10^5$, 7 basamaklıdır. Artan 2’ler sona sıfır eklemez; $2^7=128$’in hiç sıfırı yoktur.',
    transfer: ['$2^{5}\\cdot5^{8}$ sayısı kaç basamaklıdır?', '8', '9', '$2^5\\cdot5^5=10^5$; artan $5^3=125$ üç basamaklı: $125\\cdot10^5$, $3+5=8$ basamak.'],
    expert: 'Faktöriyelde de aynı fikir çalışır: $n!$’de 2 çarpanları 5’lerden çok olduğu için sondaki sıfırları 5’ler belirler. 25, 125 gibi sayılar birden çok 5 taşır; bu yüzden $\\lfloor n/5\\rfloor+\\lfloor n/25\\rfloor+\\ldots$ formülü çıkar.',
  },
  'basamak-sonrakam': {
    lessonId: 'sayi-basamaklari',
    title: 'Kuvvetlerin son rakamı bir döngüye girer',
    story: 'Bir sayıyı sürekli aynı sayıyla çarparsan son rakamlar bir süre sonra tekrar etmeye başlar. 2, 4, 8, 16, 32, 64, … dizisinin son rakamları 2, 4, 8, 6 ve yeniden 2’dir. Bu döngü sayesinde $2^{100}$’ün son rakamı hesaplamadan söylenebilir.',
    terms: [['Birler basamağı', 'Sayının son rakamı; 10 ile bölümünden kalan.'], ['Döngü', 'Tekrar eden son rakam dizisi: 2 için 2, 4, 8, 6.'], ['Döngü uzunluğu', 'Tekrar eden dizideki eleman sayısı.']],
    experiment: 'Tabanı seç ve üssü artır. Son rakamların kaç adımda tekrar ettiğini say. Hangi tabanlarda döngü 4, hangilerinde 2 ya da 1 uzunluğunda?',
    example: '$3^{43}$ sayısının birler basamağını bulalım.',
    steps: [
      ['Döngüyü yaz', '$3^1$, $3^2$, $3^3$, $3^4$ sayılarının son rakamları 3, 9, 7, 1; sonra yine 3. Döngü 4 uzunluğunda.'],
      ['Üssü döngüye böl', '$43=4\\cdot10+3$: 10 tam döngü ve 3 adım.'],
      ['Yeri oku', 'Döngünün 3. elemanı 7: $3^{43}$ 7 ile biter.'],
    ],
    tip: 'Son rakam için yalnız tabanın son rakamına bak. Üssü döngü uzunluğuna böl; kalan 0 ise döngünün son elemanını al.',
    trap: 'Kalan 0 çıkınca “sıfırıncı eleman” arama; döngünün son elemanını seç. Ayrıca $a^0=1$ olduğu için üs 0 bu döngü kuralının dışındadır.',
    transfer: ['$7^{22}$ sayısının birler basamağı kaçtır?', '9', '3', '7’nin döngüsü 7, 9, 3, 1. $22=4\\cdot5+2$: ikinci eleman 9.'],
    expert: 'Bütün döngü uzunlukları (1, 2 ya da 4) 4’ü böler. Bu yüzden $n\\geq1$ için $a^n$ ile $a^{n+4}$ aynı rakamla biter. Toplam ve çarpımlarda son rakamları ayrı ayrı bulur, yalnız son rakamlarla işlem yapar ve sonucun da yalnız son rakamını alırız.',
  },
};

const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
export const controls = {
  'basamak-ters': [range('A', 'Onlar rakamı (A)', 8, 1, 9), range('B', 'Birler rakamı (B)', 3, 1, 9)],
  'basamak-ekle': [range('x', 'İki basamaklı sayı (x)', 47, 10, 99), range('d', 'Eklenen rakam (d)', 5, 0, 9),
    { key: 'side', label: 'Rakamı nereye yazalım?', value: 0, options: [[0, 'Sağına'], [1, 'Soluna']] }],
  'basamak-rakam': [range('S', 'Rakamlar toplamı', 20, 1, 27),
    { key: 'distinct', label: 'Rakamlar', value: 0, options: [[0, 'Tekrar edebilir'], [1, 'Birbirinden farklı']] }],
  'basamak-sifir': [range('a', '2’nin üssü (a)', 7, 0, 9), range('b', '5’in üssü (b)', 4, 0, 9)],
  'basamak-sonrakam': [{ key: 'base', label: 'Taban', value: 3, options: [2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, String(n)]) }, range('n', 'Üs', 6, 1, 12)],
};

export const lastDigitCycle = (base) => {
  const cycle = [];
  let d = base % 10;
  while (!cycle.includes(d)) { cycle.push(d); d = (d * base) % 10; }
  return cycle;
};

export function model(id, v) {
  if (id === 'basamak-ters') {
    const ab = 10 * v.A + v.B, ba = 10 * v.B + v.A;
    const diff = ab - ba, sum = ab + ba;
    return { kind: 'basamak-ters', ...v, ab, ba, diff, sum,
      equation: `${ab} − ${ba} = 9 × (${v.A} − ${v.B}) = ${diff < 0 ? `−${-diff}` : diff}; ${ab} + ${ba} = 11 × ${v.A + v.B} = ${sum}`,
      observation: v.A === v.B
        ? 'Rakamlar eşit: sayı tersine eşit, fark 0. Toplam yine 11’in katı.'
        : `${v.A} onluk birliğe inerken her biri 9 değer kaybeder; ${v.B} birlik onluğa çıkarken her biri 9 değer kazanır. Net değişim 9 × (${v.A} − ${v.B}) = ${diff < 0 ? `−${-diff}` : diff}.` };
  }
  if (id === 'basamak-ekle') {
    const result = v.side === 0 ? 10 * v.x + v.d : 100 * v.d + v.x;
    const change = result - v.x;
    const observation = v.side === 0
      ? `Sağa ${v.d} yazınca ${v.x} bir basamak sola kaydı ve on katına çıktı (${10 * v.x}); sonra ${v.d} eklendi. Değişim 9 × ${v.x} + ${v.d} = ${change}.`
      : v.d === 0
        ? 'Sola 0 yazmak sayıyı değiştirmez: 0 en başta değer taşımaz.'
        : `Sola ${v.d} yazınca eski rakamlar yerinde kaldı; yüzler basamağı açıldı. Değişim ${v.d} × 100 = ${change}.`;
    return { kind: 'basamak-ekle', ...v, result, change, digitsOld: String(v.x).split('').map(Number), digitsNew: String(result).split('').map(Number),
      equation: v.side === 0 ? `10 × ${v.x} + ${v.d} = ${result}` : `${v.d} × 100 + ${v.x} = ${result}`, observation };
  }
  if (id === 'basamak-rakam') {
    const found = [];
    for (let n = 100; n <= 999; n++) {
      const ds = String(n).split('').map(Number);
      if (ds[0] + ds[1] + ds[2] === v.S && (!v.distinct || new Set(ds).size === 3)) found.push(n);
    }
    const smallest = found[0] ?? 0, largest = found[found.length - 1] ?? 0;
    return { kind: 'basamak-rakam', ...v, count: found.length, smallest, largest,
      equation: found.length ? `En küçük ${smallest}; en büyük ${largest}; ${found.length} sayı` : 'Bu koşulda üç basamaklı sayı yok',
      observation: !found.length
        ? (v.distinct ? 'Farklı üç rakamla bu toplam elde edilemiyor: ya çok küçük (ilk rakam en az 1, diğerleri 0 ve başka bir rakam) ya da çok büyük (9+8+7=24).' : 'Üç rakamın toplamı en çok 27 olabilir.')
        : `En küçük sayıda yük sağdaki basamaklarda: birler ${smallest % 10}. En büyükte en soldaki basamak ${Math.floor(largest / 100)}. İlk basamak hiçbir zaman 0 değil.` };
  }
  if (id === 'basamak-sifir') {
    const tens = Math.min(v.a, v.b);
    const rest = 2 ** (v.a - tens) * 5 ** (v.b - tens);
    const number = rest * 10 ** tens;
    const digits = String(number).length;
    return { kind: 'basamak-sifir', ...v, tens, rest, number, digits, restDigits: String(rest).length,
      equation: `${power(2, v.a)} × ${power(5, v.b)} = ${group(rest)} × ${power(10, tens)} = ${group(number)}`,
      observation: `${tens} tane 2 ile ${tens} tane 5 eşleşip ${tens} tane 10 yaptı: sonda ${tens} sıfır. Artan çarpan ${group(rest)}, ${String(rest).length} basamaklı. Toplam ${String(rest).length} + ${tens} = ${digits} basamak.` };
  }
  if (id === 'basamak-sonrakam') {
    const cycle = lastDigitCycle(v.base);
    const seq = Array.from({ length: v.n }, (_, i) => cycle[i % cycle.length]);
    const index = (v.n - 1) % cycle.length;
    const r = v.n % cycle.length;
    return { kind: 'basamak-sonrakam', ...v, cycle, seq, index, last: cycle[index],
      equation: `${power(v.base, v.n)} sayısının son rakamı ${cycle[index]}; döngü uzunluğu ${cycle.length}`,
      observation: cycle.length === 1
        ? `${v.base} ile biten her sayının bütün kuvvetleri ${v.base} ile biter; döngü tek elemanlı.`
        : `Döngü: ${cycle.join(' → ')}. ${v.n} = ${cycle.length} × ${Math.floor(v.n / cycle.length)} + ${r}; ${r === 0 ? 'kalan 0, döngünün son elemanı' : `kalan ${r}, döngünün ${r}. elemanı`}: ${cycle[index]}.` };
  }
  return null;
}
