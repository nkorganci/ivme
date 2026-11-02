// Sayı Basamakları laboratuvarı: basamak değeriyle çözümleme, rakam yer değişimi/elde, rakam koşullu aday tarama,
// basamak sayısı ve sondaki sıfırlar. `real` görselleri okunup cevapları veri/sorular-tum.csv ile karşılaştırıldı.
import { fmt } from '../sayi.js';

const digitRange = (key, label, min = 0) => ({ key, label, min, max: 9, step: 1 });
export const SWAPS = [['yb', 'Yüzler ↔ birler'], ['yo', 'Yüzler ↔ onlar'], ['ob', 'Onlar ↔ birler']];
export function swapDigits(a, b, c, kind) {
  if (kind === 'yb') return [c, b, a];
  if (kind === 'yo') return [b, a, c];
  return [a, c, b];
}
export const num = (...d) => d.reduce((s, x) => s * 10 + x, 0);
export const digitsOf = (n) => String(n).length;
export const trailingZeros = (n) => { let z = 0; while (n % 10n === 0n && n > 0n) { n /= 10n; z++; } return z; };

export default {
  conceptId: 'sayi-basamaklari',
  title: 'Sayı Basamakları',
  exam: 'TYT + AYT',
  hero: { title: 'Rakam mı, değer mi?', text: 'Aynı rakam yer değiştirince değeri değişir. Basamakları dene, farkın nereden geldiğini bul, sonra gerçek soruda kullan.', art: ['AB', '10A+B', 'BA'] },
  goals: [
    {
      id: 'cozumleme', label: 'Çözümleme', short: 'AB = 10A + B',
      objective: 'İki/üç basamaklı harfli sayıyı basamak değeriyle çözümler; sayı ile tersinin farkını/toplamını 9 ve 11 çarpanıyla kurar ve rakam koşulunu (başta sıfır olmaz) denetler.',
      misconception: '$AB$’yi $A+B$ ya da $A\\cdot B$ sanmak; $AB-BA$ farkında $B=0$ durumunu (BA iki basamaklı değil) gözden kaçırmak.',
      story: 'Bir otoparkta 41 numaralı yeri 14 diye okudun. Yanlış okuduğun numara ile doğrusu arasında kaç yer var? Rakamlar aynı, değerleri farklı.',
      predict: {
        question: 'İki basamaklı $AB$ ve $BA$ sayıları için $AB-BA=27$ olan kaç tane $AB$ vardır?',
        options: ['Tek bir sayı.', 'Birden çok sayı.', 'Hiç yok.'],
        insight: [
          '$41, 52, 63, 74, 85, 96$: altı sayı. Fark yalnız $A-B$’ye bağlı; $A-B=3$ olan her çift çalışır.',
          'Doğru: $AB-BA=9(A-B)$, yani $A-B=3$ olan her çift; $B=0$ ($30$) hariç altı sayı.',
          '$52-25=27$; böyle sayılar var.',
        ],
      },
      experiment: {
        prompt: '$A$ ve $B$ rakamlarını seç; $AB-BA=27$ yapan bir sayı bul.',
        view: 'blocks', visualLabel: 'Onluk çubuklar ve birlikler',
        controls: [digitRange('a', 'Onlar rakamı $A$', 1), digitRange('b', 'Birler rakamı $B$')],
        initial: { a: 3, b: 5 },
        compute: ({ a, b }) => {
          const ab = 10 * a + b, ba = 10 * b + a;
          return { a, b, ab, ba, diff: ab - ba, sum: ab + ba, invalid: b === 0 ? '$B=0$ iken $BA$ yazılımı “0A” olur; iki basamaklı bir sayı değildir.' : null };
        },
        readout: (_, r) => [['$AB$', fmt(r.ab)], ['$BA$', r.invalid ? 'iki basamaklı değil' : fmt(r.ba)], ['$AB-BA$', r.invalid ? '—' : `${fmt(r.diff)} = 9 × (${fmt(r.a - r.b)})`], ['$AB+BA$', r.invalid ? '—' : `${fmt(r.sum)} = 11 × ${r.a + r.b}`]],
        target: {
          text: 'Hedef: $AB-BA=27$ ve iki sayı da iki basamaklı.',
          test: (_, r) => !r.invalid && r.diff === 27,
          example: { a: 5, b: 2 },
          hint: 'Farkı $9\\times(A-B)$ olarak okuyorsun. $27=9\\times3$; $A$, $B$’den kaç büyük olmalı?',
        },
        diagnose: (_, r) => {
          if (r.invalid) return 'Fark 27 olsa bile $BA$ iki basamaklı olmalı; $B\\neq0$ seç.';
          if (r.diff < 0) return `$A<B$ olduğu için $AB<BA$; fark negatif (${fmt(r.diff)}). Onlar rakamını büyük seç.`;
          return `Fark $9\\times${r.a - r.b}=${r.diff}$. 27 için $A-B=3$ olmalı.`;
        },
        success: 'Rakamlar aynı kalıyor, yalnız basamakları değişiyor: $AB-BA=9(A-B)$.',
      },
      reasons: [
        {
          question: '$AB-BA$ neden her zaman 9’un katıdır?',
          options: ['$AB=10A+B$, $BA=10B+A$; fark $9A-9B=9(A-B)$.', 'İki sayının rakamları toplamı aynı olduğu için fark 0’dır.', '$AB-BA=A-B$ olduğu için.'],
          answer: 0,
          feedback: ['', 'Rakam toplamları aynı ama sayılar aynı değil: $52-25=27\\neq0$. Basamak değerine bak.', '$A-B=3$ iken fark 3 değil 27’dir; onlar basamağındaki rakam 10 ile çarpılır.'],
        },
        {
          question: '$AB-BA=27$ için neden $30$ sayılmaz?',
          options: ['$BA=03$ iki basamaklı bir sayı değildir; $B\\neq0$ gerekir.', '30 tek sayı olmadığı için.', '$30-3=27$ olduğu için sayılır.'],
          answer: 0,
          feedback: ['', 'Teklik bir koşul değil; sorun $BA$’nın yazılışında.', 'Sayısal fark 27 ama $BA$ “03” yazılır; soru iki basamaklı $BA$ istiyor.'],
        },
      ],
      proof: '$AB=10A+B$ ve $BA=10B+A$. Fark $9(A-B)$, toplam $11(A+B)$. Bu yüzden $AB-BA=27$ ⇔ $A-B=3$; $BA$’nın iki basamaklı olması için $B\\ge1$: $41,52,63,74,85,96$.',
      rule: '$AB-BA=9(A-B)$, $AB+BA=11(A+B)$; üç basamakta $ABC-CBA=99(A-C)$.',
      condition: 'Harfler rakam; başa gelen rakam 0 olamaz. Ters sayının da istenen basamak sayısında olduğunu ayrıca kontrol et.',
      trap: '$B=0$ çözümünü saymak; $AB$’yi $A\\cdot B$ gibi okumak.',
      transfer: [
        {
          id: 'coz-yakin', level: 'Yakın alıştırma', text: 'İki basamaklı $AB$ ve $BA$ için $AB+BA=143$ ise $A+B$ kaçtır?',
          options: ['$13$', '$14$', '$11$'], answer: 0,
          hints: ['Toplamı çözümle: $(10A+B)+(10B+A)$.', '$11(A+B)=143$.', '$A+B=143/11=13$.'],
          feedback: ['$11\\times13=143$.', '$11\\times14=154$; toplam 143 değil.', '11 çarpandır, cevap değil; $143/11$’i hesapla.'],
        },
        {
          id: 'coz-uc', level: 'Üç basamağa genelleme', text: '$ABC$ ve $CBA$ üç basamaklı sayılar, $ABC-CBA=396$ ise $A-C$ kaçtır?',
          options: ['$4$', '$44$', '$6$'], answer: 0,
          hints: ['Onlar rakamı iki sayıda aynı yerde; farka katkısı yok.', '$(100A+C)-(100C+A)=99(A-C)$.', '$396/99=4$.'],
          feedback: ['$99\\times4=396$.', '$396/9=44$ yanlış çarpan: üç basamakta yüzler ile birler yer değiştirince fark 99’un katıdır.', '$99\\times6=594$; 396 için rakam farkı 4 olmalı.'],
        },
        {
          id: 'coz-ucluk', level: 'Farklı sunum', text: 'Rakamları toplamı 12 olan üç basamaklı $ABC$ için $ABC+BCA+CAB$ kaçtır?',
          options: ['$1332$', '$432$', '$1200$'], answer: 0,
          hints: ['Her rakam her basamakta bir kez görünüyor.', 'Toplam $111A+111B+111C$.', '$111\\times12=1332$.'],
          feedback: ['Her rakam yüzler, onlar ve birlerde bir kez: $111(A+B+C)$.', '$36\\times12$ değil; her rakamın üç basamaktaki değeri $100+10+1=111$.', '$100\\times12$ yalnız yüzler basamağını sayar.'],
        },
      ],
      real: [
        { code: 'TYT-0555', answer: 'A', why: '$1BA-1AB$ ve $1CA-1BA$ farklarını çözümle; rakam farklarından $A,B,C$’yi bul.' },
        { code: 'TYT-0590', answer: 'C', why: '$11\\cdot AB$’yi çözümle; $A+B\\ge10$ iken elde oluşur, rakam toplamı $2(A+B)-9$ olur.' },
      ],
    },
    {
      id: 'yer-degisim', label: 'Yer değişimi ve elde', short: 'Fark = rakam farkı × basamak',
      objective: 'İki rakam yer değiştirince veya bir rakam değişince sayının ne kadar değiştiğini basamak değeriyle hesaplar; toplamadaki eldeyi rakam koşuluna bağlar.',
      misconception: 'Yer değişimi farkının bütün rakamlara bağlı olduğunu sanmak; ondalık sayılarda basamak adlarını (onda birler, yüzde birler) karıştırmak; eldeyi unutmak.',
      story: 'Bir fatura tutarını yazarken yüzler ve birler rakamını karıştırdın: 253 yerine 352. Fark kaç lira? Hangi rakamlar bu farkı belirliyor?',
      predict: {
        question: 'Üç basamaklı $ABC$’de yüzler ve birler rakamı yer değiştirince oluşan fark neye bağlıdır?',
        options: ['Yalnız $A$ ile $C$’nin farkına.', 'Üç rakamın hepsine.', 'Yalnız $B$’ye.'],
        insight: [
          'Doğru: $CBA-ABC=99(C-A)$; onlar rakamı yerinde kaldığı için farka girmez.',
          '$B$’yi değiştirip farkı izledin mi? Yerinde kalan rakam farkı değiştirmiyor.',
          '$B$ yerinde kalıyor; farka hiç katkısı yok.',
        ],
      },
      experiment: {
        prompt: 'Rakamları ve yer değişimini seç; yeni sayı eskisinden tam 396 büyük olsun.',
        view: 'swap', visualLabel: 'Rakam kartları · basamak değerleri',
        controls: [digitRange('a', 'Yüzler $A$', 1), digitRange('b', 'Onlar $B$'), digitRange('c', 'Birler $C$'), { key: 'kind', label: 'Yer değişimi', options: SWAPS }],
        initial: { a: 2, b: 5, c: 3, kind: 'yb' },
        compute: ({ a, b, c, kind }) => {
          const before = num(a, b, c); const d = swapDigits(a, b, c, kind); const after = num(...d);
          return { digits: [a, b, c], swapped: d, before, after, diff: after - before, invalid: d[0] === 0 ? 'Yeni sayının yüzler rakamı 0 oldu; üç basamaklı değil.' : null };
        },
        readout: ({ kind }, r) => [['Önce', fmt(r.before)], ['Sonra', r.invalid ? `${r.swapped.join('')} (geçersiz)` : fmt(r.after)],
          ['Fark', r.invalid ? '—' : fmt(r.diff)], ['Kural', kind === 'yb' ? `$99\\times(C-A)=99\\times${r.digits[2] - r.digits[0]}$` : kind === 'yo' ? `$90\\times(B-A)=90\\times${r.digits[1] - r.digits[0]}$` : `$9\\times(C-B)=9\\times${r.digits[2] - r.digits[1]}$`]],
        target: {
          text: 'Hedef: yeni sayı − eski sayı $=396$ ve yeni sayı üç basamaklı.',
          test: (_, r) => !r.invalid && r.diff === 396,
          example: { a: 1, c: 5, kind: 'yb' },
          hint: '396’yı $99$, $90$ ve $9$’a böl: hangisi tam çıkıyor? O yer değişiminde rakam farkı ne olmalı?',
        },
        diagnose: ({ kind }, r) => {
          if (r.invalid) return 'Başa 0 gelince sayı iki basamaklı olur; birler rakamını 0 seçme.';
          if (kind !== 'yb') return `Bu yer değişiminde fark ${kind === 'yo' ? '90' : '9'}’un katı: ${fmt(r.diff)}. $396=99\\times4$; hangi değişim 99 verir?`;
          return `Fark $99\\times${r.digits[2] - r.digits[0]}=${fmt(r.diff)}$. 396 için $C-A=4$ olmalı.`;
        },
        success: 'Yerinde kalan rakam farka girmez: $CBA-ABC=99(C-A)$.',
      },
      reasons: [
        {
          question: '$CBA-ABC$ neden $B$’ye bağlı değil?',
          options: ['$B$ iki sayıda da onlar basamağında; $10B$ farkta sadeleşir.', '$B$ her zaman 0 olduğu için.', 'Fark yalnız birler basamağına bakılarak bulunur.'],
          answer: 0,
          feedback: ['', 'Deneyde $B=5$ iken de fark 396 çıktı; $B$ sıfır olmak zorunda değil.', 'Birler farkı $A-C$; yüzler farkı $100(C-A)$. İkisi birlikte $99(C-A)$ verir.'],
        },
        {
          question: 'Onlar ile birler yer değiştirirse fark neden 9’un katıdır?',
          options: ['$(10C+B)-(10B+C)=9(C-B)$', '$90$ ile $9$ aynı sayıdır', 'Onlar basamağı her zaman 9’dur'],
          answer: 0,
          feedback: ['', '90 ve 9 farklı katsayılar: yüzler–onlar değişimi 90, onlar–birler değişimi 9 verir.', 'Rakam değil, basamak değerleri farkı: $10-1=9$.'],
        },
      ],
      proof: 'İki rakam yer değiştirince her biri diğerinin basamak değerini alır. Değerleri $p$ ve $q$ olan basamaklarda $x,y$ rakamları için fark $(py+qx)-(px+qy)=(p-q)(y-x)$. Yüzler–birler: $99$, yüzler–onlar: $90$, onlar–birler: $9$.',
      rule: 'Fark = (basamak değerleri farkı) × (rakamların farkı).',
      condition: 'Yalnız iki rakam yer değiştiriyorsa ve yeni sayı aynı basamak sayısındaysa (başa 0 gelmiyorsa). Ondalık basamaklarda değerler $0{,}1$ ve $0{,}01$’dir.',
      trap: 'Ondalıkta onda birler ile yüzde birler yer değişince fark $0{,}09\\times$(rakam farkı) olur; tam sayı kuralı aynen kullanılmaz.',
      transfer: [
        {
          id: 'yer-yakin', level: 'Yakın alıştırma', text: 'Üç basamaklı $ABC$’nin onlar ve birler rakamları yer değiştirince sayı 45 azalıyor. $B-C$ kaçtır?',
          options: ['$5$', '$45$', '$9$'], answer: 0,
          hints: ['Onlar–birler değişiminde fark $9\\times$(rakam farkı).', '$ABC-ACB=9(B-C)=45$.', '$B-C=5$.'],
          feedback: ['$9\\times5=45$.', '45 farktır; rakam farkı onun 9’da biri.', '9 katsayıdır; $45/9$’u hesapla.'],
        },
        {
          id: 'yer-ekle', level: 'Elde ve rakam toplamı', text: 'Rakamları toplamı 8 olan iki basamaklı $AB$’ye ($B\\neq0$) 9 eklenirse yeni sayının rakamları toplamı kaçtır?',
          options: ['$8$', '$17$', '$9$'], answer: 0,
          hints: ['$+9$’u $+10-1$ diye düşün.', 'Onlar rakamı 1 artar, birler rakamı 1 azalır ($B\\ge1$ olduğu için elde/ödünç sorunu yok).', 'Toplam $(A+1)+(B-1)=8$.'],
          feedback: ['$+10-1$: biri artar, biri azalır; toplam değişmez. Örnek $35+9=44$.', 'Rakam toplamı 9 artmaz; 9, iki basamağa $+1$ ve $-1$ olarak dağılır.', '$35\\to44$: toplam 8 kaldı.'],
        },
        {
          id: 'yer-ondalik', level: 'Farklı temsil', text: '$0{,}74$ sayısının onda birler ve yüzde birler rakamları yer değiştirirse sayı ne kadar değişir?',
          options: ['$0{,}27$ azalır', '$0{,}03$ azalır', '$27$ azalır'], answer: 0,
          hints: ['Basamak değerleri $0{,}1$ ve $0{,}01$.', 'Fark $(0{,}1-0{,}01)\\times(7-4)$.', '$0{,}09\\times3=0{,}27$; $0{,}74\\to0{,}47$.'],
          feedback: ['$0{,}74-0{,}47=0{,}27$.', 'Yalnız rakam farkı 3; basamak değerleri farkı $0{,}09$ ile çarp.', 'Ondalık basamakların değeri 1’den küçük; fark da öyle.'],
        },
      ],
      real: [
        { code: 'TYT-0581', answer: 'C', why: '$13/20=0{,}65$; onda birler ile yüzde birler yer değişince $0{,}56$ — ondalık basamak değeri.' },
        { code: 'AYT_Sayisal-0038', answer: 'D', why: '$52A+B43$ toplamında birlerden elde gelmezse onlar rakamı çift kalır; eldeyi rakam koşuluna bağla.' },
      ],
    },
    {
      id: 'rakam-kosul', label: 'Rakam koşulu', short: 'En büyük / en küçük, farklı rakam',
      objective: 'Farklı rakam, başta sıfır olmaması ve toplam/çarpım koşuluyla en büyük–en küçük sayıyı basamak basamak kurar; adayları koşullarla eler.',
      misconception: 'En büyük sayıyı ararken önce birler basamağını büyütmek; 0’ın başta olamayıp diğer basamaklarda kullanılabileceğini unutmak; “farklı” koşulunu atlamak.',
      story: 'Bir kilit kodu üç farklı rakamdan oluşuyor ve rakamların toplamı 10. Kod olabildiğince büyük olsun istiyorsun. Hangi rakamı nereye koymalısın?',
      predict: {
        question: 'Rakamları farklı ve toplamı 10 olan en büyük üç basamaklı sayının yüzler rakamı kaçtır?',
        options: ['$9$', '$8$', '$7$'],
        insight: [
          'Doğru: $9$ yüzlere; kalan 1’i $1$ ve $0$ paylaşır: $910$.',
          '$8$ ile başlayan en büyük sayı $820$; $910$ daha büyük. Yüzler rakamı bir artınca sayı en az 100 artar.',
          '$7$ ile en çok $730$; $910$ daha büyük.',
        ],
      },
      experiment: {
        prompt: 'Rakamları seç; rakamları farklı, toplamı 10 olan **en büyük** üç basamaklı sayıyı kur.',
        view: 'digits', visualLabel: 'Rakam kartları ve koşul denetimi',
        controls: [digitRange('a', 'Yüzler'), digitRange('b', 'Onlar'), digitRange('c', 'Birler')],
        initial: { a: 1, b: 2, c: 7 },
        compute: ({ a, b, c }) => {
          const checks = { lead: a !== 0, distinct: new Set([a, b, c]).size === 3, sum: a + b + c === 10 };
          return { n: num(a, b, c), sumDigits: a + b + c, checks, ok: checks.lead && checks.distinct && checks.sum };
        },
        readout: (_, r) => [['Sayı', fmt(r.n)], ['Rakam toplamı', fmt(r.sumDigits)], ['Koşullar', `${r.checks.lead ? '✓' : '✗'} başta 0 yok · ${r.checks.distinct ? '✓' : '✗'} farklı · ${r.checks.sum ? '✓' : '✗'} toplam 10`]],
        target: {
          text: 'Hedef: üç koşulu sağlayan en büyük sayı.',
          test: (_, r) => r.ok && r.n === 910,
          example: { a: 9, b: 1, c: 0 },
          hint: 'Önce yüzleri olabildiğince büyük yap; sonra kalan toplamı onlar ve birlere, onlara öncelik vererek dağıt. 0 da bir rakamdır.',
        },
        diagnose: ({ a, b, c }, r) => {
          if (!r.checks.lead) return 'Başta 0 varsa sayı üç basamaklı değil.';
          if (!r.checks.distinct) return 'Rakamlar farklı olmalı; tekrar eden rakam var.';
          if (!r.checks.sum) return `Rakam toplamı ${r.sumDigits}; 10 olmalı.`;
          if (a < 9) return `${fmt(r.n)} koşulları sağlıyor ama yüzler rakamı ${a}. Yüzler bir artarsa sayı en az 100 artar; önce yüzleri büyüt.`;
          return `${fmt(r.n)} geçerli. Yüzler 9 iken kalan toplam 1; onlar basamağı birlerden değerlidir, büyük rakamı onlara koy (${b} ile ${c}).`;
        },
        success: 'Basamak basamak: yüzleri en büyük, sonra onlar, sonra birler. $9+1+0=10$: $910$.',
      },
      reasons: [
        {
          question: 'En büyük sayı için neden önce yüzler basamağı doldurulur?',
          options: ['Yüzlerdeki 1 birim 100 eder; onlar ve birler birlikte en çok 99 ekleyebilir.', 'Rakamlar soldan sağa yazıldığı için.', 'Birler basamağı büyükse sayı tek olur.'],
          answer: 0,
          feedback: ['', 'Yazılış yönü değil, basamak değeri: yüzlerdeki bir artış diğer basamakların toplam etkisinden büyüktür.', 'Teklik bu soruda koşul değil.'],
        },
        {
          question: 'Aynı koşullarda **en küçük** sayı neden $109$’dur?',
          options: ['Yüzler en az 1 olabilir; onlara 0, kalan 9 birlere.', 'En küçük rakamlar $0,1,2$ olduğu için $012$.', 'Rakamlar farklı olduğu için $123$.'],
          answer: 0,
          feedback: ['', '$012$ üç basamaklı değil; ayrıca $0+1+2=3\\neq10$.', '$1+2+3=6$; toplam koşulunu sağlamıyor.'],
        },
      ],
      proof: 'Üç basamaklı sayılarda yüzler rakamı büyük olan her zaman daha büyüktür ($100a\\ge100(a-1)+99+1$). Bu yüzden en büyük için yüzler en büyük seçilir ($9$); kalan $1$ toplamı farklı rakamlarla $1+0$ olarak, büyük rakam onlara gelecek biçimde dağıtılır: $910$.',
      rule: 'En büyük: soldan başla, her basamağa izin verilen en büyük rakamı koy. En küçük: başa en küçük sıfır olmayan rakamı, sonra en küçükleri koy.',
      condition: 'Kalan basamaklar koşulu hâlâ sağlayabilmeli (ör. kalan toplam iki farklı rakamla yazılabilmeli). Her adımda kalanın mümkün olup olmadığını denetle.',
      trap: '0’ı tamamen dışlamak ($901$ yerine $9xx$ aramak) ya da başa 0 koymak; “farklı” koşulunu unutup $811$ demek.',
      transfer: [
        {
          id: 'rakam-yakin', level: 'Yakın alıştırma', text: 'Rakamları farklı ve toplamı 12 olan en küçük üç basamaklı sayı kaçtır?',
          options: ['$129$', '$039$', '$138$'], answer: 0,
          hints: ['Yüzlere en küçük sıfır olmayan rakamı koy.', 'Yüzler 1 ise onlar + birler $=11$; onları en küçük yap.', 'Onlar 0 olsa birler 11 olurdu; onlar 2, birler 9.'],
          feedback: ['$1+2+9=12$, rakamlar farklı.', '$039$ üç basamaklı değil.', '$138$ geçerli ama $129$ daha küçük.'],
        },
        {
          id: 'rakam-carpim', level: 'Farklı koşul', text: 'Rakamları çarpımı 12 olan en büyük iki basamaklı sayı kaçtır?',
          options: ['$62$', '$43$', '$26$'], answer: 0,
          hints: ['12’yi iki rakamın çarpımı olarak yaz.', 'Çiftler: $(2,6)$, $(3,4)$.', 'Onlar basamağına en büyük rakam: $62$.'],
          feedback: ['$6\\times2=12$ ve onlarda en büyük rakam.', '$43$ geçerli ama onlar rakamı 6 olabilir.', '$26$ aynı rakamlar; büyük rakam onlara gelmeli.'],
        },
        {
          id: 'rakam-sistem', level: 'İki koşul', text: '$A+B=9$, $A\\cdot B=18$ ve $A>B$ rakamlar ise $AB-BA$ kaçtır?',
          options: ['$27$', '$63$', '$36$'], answer: 0,
          hints: ['Toplamı 9, çarpımı 18 olan rakamları bul.', '$A=6$, $B=3$.', '$AB-BA=9(A-B)=27$.'],
          feedback: ['$63-36=27$.', '$63$ sayının kendisi; fark istendi.', '$36=BA$; fark $63-36$.'],
        },
      ],
      real: [
        { code: 'TYT-0567', answer: 'D', why: '“Sıralı sayı” koşulunu iki sayıda birlikte kullan; ortak $B$ rakamı adayları eler.' },
        { code: 'TYT-0579', answer: 'D', why: '$B^2$ ile birler–yüzler rakamlarının yan yana yazılması: iki yazım sırasını da aday olarak dene.' },
        { code: 'AYT_Sayisal-0028', answer: 'C', why: 'Farklı rakamlarla iki asal $AB$, $BC$: en küçüğü ve en büyüğü basamak basamak kur.' },
      ],
    },
    {
      id: 'basamak-sayisi', label: 'Basamak sayısı', short: 'Sondaki sıfırlar = 2·5 çiftleri',
      objective: '$2^a5^b\\cdots$ biçimindeki sayının sondaki sıfır sayısını ve basamak sayısını $10$’un kuvvetlerine ayırarak bulur.',
      misconception: 'Sondaki sıfır sayısını $a+b$ sanmak; eşleşmeyen 2’lerin veya 3’lerin basamak sayısını değiştirdiğini unutmak.',
      story: 'Bir şirketin kazancı “8 milyon” ($8\\,000\\,000$) yazılıyor. $2^9\\cdot5^6$ gibi bir çarpım kaç sıfırla biter ve kaç basamaklı olur?',
      predict: {
        question: '$2^6\\cdot5^3$ sayısının sonunda kaç sıfır vardır?',
        options: ['$3$', '$6$', '$9$'],
        insight: [
          'Doğru: $2^6\\cdot5^3=2^3\\cdot10^3=8000$. Üç tane $2\\cdot5$ çifti var.',
          '$6$, 2’lerin sayısı; sıfırı 2 ile 5 birlikte yapar. 5 yalnız üç tane.',
          '$6+3$ sayısı çarpanların sayısıdır; sıfır yalnız eşleşen $2\\cdot5$ çiftleridir.',
        ],
      },
      experiment: {
        prompt: 'Üsleri seç; sonunda tam 3 sıfır olan **5 basamaklı** bir sayı kur.',
        view: 'zeros', visualLabel: '2·5 çiftleri = 10’lar',
        controls: [{ key: 'a', label: '$2$’nin üssü $a$', min: 0, max: 8, step: 1 }, { key: 'b', label: '$5$’in üssü $b$', min: 0, max: 8, step: 1 }, { key: 'c', label: '$3$’ün üssü $c$', min: 0, max: 4, step: 1 }],
        initial: { a: 2, b: 4, c: 0 },
        compute: ({ a, b, c }) => {
          const n = 2n ** BigInt(a) * 5n ** BigInt(b) * 3n ** BigInt(c);
          return { a, b, c, n, text: n.toString(), digits: n.toString().length, zeros: trailingZeros(n), pairs: Math.min(a, b) };
        },
        readout: (_, r) => [['Sayı', r.text], ['Basamak sayısı', r.digits], ['Sondaki sıfır', r.zeros], ['Ayrıştırma', `$${r.a > r.b ? `2^{${r.a - r.b}}` : r.b > r.a ? `5^{${r.b - r.a}}` : '1'}\\cdot3^{${r.c}}\\cdot10^{${r.pairs}}$`]],
        target: {
          text: 'Hedef: sondaki sıfır sayısı 3, basamak sayısı 5.',
          test: (_, r) => r.zeros === 3 && r.digits === 5,
          example: { a: 3, b: 3, c: 3 },
          hint: '3 sıfır için $\\min(a,b)=3$. Geriye kalan çarpan iki basamaklı olmalı: $10$ ile $99$ arasında.',
        },
        diagnose: (_, r) => {
          if (r.zeros !== 3) return `$\\min(a,b)=${r.pairs}$ tane $2\\cdot5$ çifti → ${r.zeros} sıfır. Tam 3 çift kur.`;
          return `3 sıfır tamam; sayı ${r.digits} basamaklı. $10^3$’ün önündeki çarpan ${r.digits - 3} basamaklı; 2 basamaklı olmalı.`;
        },
        success: 'Sayı = (kalan çarpan) × $10^{\\min(a,b)}$: sıfırlar çiftlerden, diğer basamaklar kalan çarpandan.',
      },
      reasons: [
        {
          question: 'Sondaki sıfır sayısı neden $\\min(a,b)$’dir?',
          options: ['Her sıfır bir $10=2\\cdot5$ çarpanıdır; eşleşmeyen 2 veya 5 sıfır üretmez.', 'Sıfır sayısı üslerin toplamıdır.', 'Yalnız 5’lerin sayısı önemlidir.'],
          answer: 0,
          feedback: ['', '$2^6\\cdot5^3=8000$: üslerin toplamı 9, sıfır 3.', '$2^1\\cdot5^3=250$: üç 5 var ama yalnız bir sıfır.'],
        },
        {
          question: '$2^6\\cdot5^3$ kaç basamaklıdır?',
          options: ['$4$', '$9$', '$6$'],
          answer: 0,
          feedback: ['', 'Üslerin toplamı basamak sayısı değildir; $8\\cdot10^3=8000$.', '$2^6=64$ iki basamaklı ama $5^3$ ile çarpınca $8000$ olur.'],
        },
      ],
      proof: '$2^a5^b=2^{a-b}\\cdot10^b$ ($a\\ge b$). $10^b$ sayıya $b$ sıfır ekler; $2^{a-b}\\cdot3^c$ 10’a bölünmediği için başka sıfır oluşmaz. Basamak sayısı = kalan çarpanın basamak sayısı $+\\,b$.',
      rule: 'Sıfır sayısı $=\\min(\\text{2’ler},\\text{5’ler})$; basamak sayısı $=$ kalan çarpanın basamakları $+$ sıfır sayısı.',
      condition: 'Sayı asal çarpanlarına ayrılmış olmalı ($4^5=2^{10}$, $25^3=5^6$ gibi). Kalan çarpanın son rakamı 0 olmamalı (2 ve 5’ten biri tükenmiş olduğu için olmaz).',
      trap: '$4^5\\cdot25^3$’te üsleri doğrudan karşılaştırmak; önce tabanları 2 ve 5’e çevir.',
      transfer: [
        {
          id: 'bs-yakin', level: 'Yakın alıştırma', text: '$2^{10}\\cdot5^8$ sayısı kaç basamaklıdır?',
          options: ['$9$', '$18$', '$10$'], answer: 0,
          hints: ['Çiftleri ayır: $2^8\\cdot5^8=10^8$.', 'Kalan $2^2=4$.', '$4\\cdot10^8$: 1 + 8 = 9 basamak.'],
          feedback: ['$400\\,000\\,000$: 9 basamak.', '18 üslerin toplamı; basamak sayısı değil.', '$10^8$ 9 basamaklıdır ama önündeki 4 yeni basamak eklemez; $4\\cdot10^8$ yine 9 basamak.'],
        },
        {
          id: 'bs-taban', level: 'Önce dönüştür', text: '$4^5\\cdot25^3$ sayısının sonunda kaç sıfır vardır?',
          options: ['$6$', '$3$', '$10$'], answer: 0,
          hints: ['Tabanları asala çevir.', '$4^5=2^{10}$, $25^3=5^6$.', '$\\min(10,6)=6$.'],
          feedback: ['$2^{10}\\cdot5^6=2^4\\cdot10^6$.', '$25$’te iki tane 5 var: $25^3=5^6$.', '10 tane 2 var ama yalnız 6 tane 5; çift sayısı 6.'],
        },
        {
          id: 'bs-faktoriyel', level: 'Yöntem seçimi', text: '$20!$ sayısının sonunda kaç sıfır vardır?',
          options: ['$4$', '$2$', '$5$'], answer: 0,
          hints: ['2’ler bol; 5’leri say.', '1’den 20’ye 5’in katları: $5,10,15,20$.', 'Her biri bir tane 5 verir: 4 sıfır.'],
          feedback: ['5’in katları dört tane; 25 olmadığı için ek 5 yok.', 'Yalnız 10 ve 20’yi saymak 5 ve 15’in 5’lerini atlar.', '25 sınırı aşılmadığı için fazladan 5 yok.'],
        },
      ],
      realNote: 'Bu konunun bankasındaki 20 ÖSYM sorusunun görselleri tarandı; sondaki sıfır ve basamak sayısını doğrudan soran soru yok. Aktarım özgün alıştırmalarla yapılır; bu beceri EBOB–EKOK ve üslü ifadeler labında da kullanılır.',
    },
  ],
};
