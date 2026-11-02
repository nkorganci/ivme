// Çarpanlara Ayırma laboratuvarı: gruplama ile ortak çarpan, iki kare farkı, üç terimli (x+p)(x+q), rasyonel ifadede
// sadeleştirme ve yasak değer. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const sgn = (n) => (n < 0 ? `-${-n}` : `+${n}`);
export const original = (x) => ((x * x + x - 6) === 0 ? null : (x * x - 9) / (x * x + x - 6));
export const simplified = (x) => (x === 2 ? null : (x - 3) / (x - 2));

export default {
  conceptId: 'carpanlara-ayirma',
  title: 'Çarpanlara Ayırma ve Rasyonel İfadeler',
  exam: 'TYT + AYT',
  hero: { title: 'Toplamı çarpıma çevir', text: 'Alanı parçalara ayır, yeniden diz; çarpanları gör. Sadeleştirirken yasak değeri koru.', art: ['x²+7x+12', '=', '(x+3)(x+4)'] },
  goals: [
    {
      id: 'gruplama', label: 'Gruplama', short: 'Ortak parantez dışarı',
      objective: 'Dört terimli ifadeyi uygun gruplayıp ortak çarpanı paranteze alarak iki çarpanın çarpımına çevirir; sayısal hesapta ortak çarpanı kullanır.',
      misconception: 'Katsayıları yanlış parantezlere dağıtmak ($(x+3)(y+2)$); ortak çarpanı yalnız bir terimden almak.',
      story: 'Bir bahçe dört dikdörtgen parselden oluşuyor: alanlar $xy$, $3x$, $2y$ ve 6. Bütün bahçe tek bir dikdörtgen; kenarları ne?',
      predict: {
        question: '$xy+3x+2y+6$ ifadesinin çarpanlara ayrılmış biçimi hangisidir?',
        options: ['$(x+2)(y+3)$', '$(x+3)(y+2)$', '$(x+6)(y+1)$'],
        insight: [
          'Doğru: $x(y+3)+2(y+3)$.',
          '$(x+3)(y+2)=xy+2x+3y+6$; katsayılar yer değiştirmiş.',
          '$(x+6)(y+1)=xy+x+6y+6$.',
        ],
      },
      experiment: {
        prompt: '$p$ ve $q$’yu seç; $(x+p)(y+q)$ açılımı $xy+3x+2y+6$ olsun.',
        view: 'area4', visualLabel: 'Alan modeli: dört parsel',
        controls: [{ key: 'p', label: '$p$', min: 0, max: 6, step: 1 }, { key: 'q', label: '$q$', min: 0, max: 6, step: 1 }],
        initial: { p: 3, q: 2 },
        compute: ({ p, q }) => ({ p, q, cx: q, cy: p, c: p * q }),
        readout: (_, r) => [['Açılım', `$xy+${r.cx}x+${r.cy}y+${r.c}$`], ['Hedef', '$xy+3x+2y+6$']],
        target: {
          text: 'Hedef: açılım tam olarak $xy+3x+2y+6$.',
          test: (_, r) => r.cx === 3 && r.cy === 2 && r.c === 6,
          example: { p: 2, q: 3 },
          hint: '$x$’in katsayısı $(y+q)$’daki $q$’dan gelir; $y$’nin katsayısı $p$’den.',
        },
        diagnose: (_, r) => `$x$’in katsayısı ${r.cx} (3 olmalı), $y$’nin katsayısı ${r.cy} (2 olmalı). $x$ hangi parantezdeki sayıyla çarpılıyor?`,
        success: '$x\\cdot(y+3)+2\\cdot(y+3)=(x+2)(y+3)$.',
      },
      reasons: [
        {
          question: 'Gruplama neden işe yarar?',
          options: ['$x(y+3)+2(y+3)$: iki grupta aynı parantez çıkar ve dışarı alınır.', 'Terimlerin sırası değişince ifade küçülür.', 'Her ifade gruplanarak ayrılabilir.'],
          answer: 0,
          feedback: ['', 'Sıra değil, ortak parantez önemli.', '$xy+3x+2y+5$ bu biçimde ayrılmaz; ortak parantez oluşmaz.'],
        },
        {
          question: '$(x+3)(y+2)$ neden olmaz?',
          options: ['Açılımı $xy+2x+3y+6$; $x$ ve $y$’nin katsayıları yer değiştirir.', 'Çarpım sırası önemli olduğu için.', '6 sabit terim olmadığı için.'],
          answer: 0,
          feedback: ['', 'Çarpma değişmeli; sorun katsayıların yeri.', 'Sabit terim 6 doğru; katsayılar farklı.'],
        },
      ],
      proof: '$(x+p)(y+q)=xy+qx+py+pq$. Katsayıları eşleştir: $q=3$, $p=2$, $pq=6$ ✓. Ters yönde: $xy+3x+2y+6=x(y+3)+2(y+3)=(x+2)(y+3)$ (dağılma özelliği).',
      rule: 'Terimleri ikişerli grupla, her gruptan ortak çarpanı çıkar; aynı parantez oluşuyorsa onu dışarı al.',
      condition: 'İki grupta da aynı parantez çıkmalı; çıkmıyorsa başka gruplama dene ya da ifade bu yolla ayrılmaz.',
      trap: 'Bir gruptan $-$ işaretini çıkarırken parantez içinin işaretini değiştirmemek: $ab-2a-3b+6=a(b-2)-3(b-2)$.',
      transfer: [
        {
          id: 'grup-yakin', level: 'Yakın alıştırma', text: '$ab-2a+3b-6$ ifadesi neye eşittir?',
          options: ['$(a+3)(b-2)$', '$(a-2)(b+3)$', '$(a+3)(b+2)$'], answer: 0,
          hints: ['$a(b-2)+3(b-2)$.', 'Ortak parantez $(b-2)$.', '$(a+3)(b-2)$.'],
          feedback: ['Açılım: $ab-2a+3b-6$ ✓.', 'Açılım $ab+3a-2b-6$; katsayılar yer değiştirdi.', 'Sabit terim $+6$ olurdu.'],
        },
        {
          id: 'grup-sayi', level: 'Sayısal kısa yol', text: '$37\\cdot43+37\\cdot57$ kaçtır?',
          options: ['$3700$', '$3600$', '$7400$'], answer: 0,
          hints: ['Ortak çarpan 37.', '$37(43+57)$.', '$37\\cdot100$.'],
          feedback: ['$37\\cdot100$.', '$43+57=100$; 3600 için 36 gerekirdi.', '37 iki kez sayıldı; ortak çarpan bir kez dışarı alınır.'],
        },
        {
          id: 'grup-denklem', level: 'İfadeden değer', text: '$a^2+ab=30$ ve $a+b=5$ ise $a$ kaçtır?',
          options: ['$6$', '$5$', '$25$'], answer: 0,
          hints: ['$a^2+ab=a(a+b)$.', '$a\\cdot5=30$.', '$a=6$.'],
          feedback: ['$6\\cdot5=30$; $b=-1$.', '5, $a+b$’nin değeri; $a$ değil.', '$5^2$ ile karıştırdın.'],
        },
      ],
      real: [
        { code: 'TYT-0793', answer: 'B', from: 'polinom-islemleri', why: '$R(x)=(x^2-1)^2-1=x^4-2x^2=x^2(x^2-2)$: ortak çarpan $x^2$’den kökler.' },
      ],
    },
    {
      id: 'iki-kare', label: 'İki kare farkı', short: 'a² − b² = (a − b)(a + b)',
      objective: '$a^2-b^2$’yi alan modeliyle $(a-b)(a+b)$’ye dönüştürür; hesapta ve denklemde kullanır, $(a-b)^2$ ile karıştırmaz.',
      misconception: '$a^2-b^2=(a-b)^2$ sanmak; $a^2+b^2$’yi de iki kare farkı gibi ayırmaya çalışmak.',
      story: '51 × 49’u kafadan hesaplamak mı, $50^2-1$ mi? İki kare farkı büyük çarpımları kolaylaştırır.',
      predict: {
        question: '$51^2-49^2$ kaçtır?',
        options: ['$200$', '$4$', '$2^2$'],
        insight: [
          'Doğru: $(51-49)(51+49)=2\\cdot100$.',
          '$(51-49)^2=4$; fark kare değil.',
          '$2^2=4$; aynı hata.',
        ],
      },
      experiment: {
        prompt: 'Doğal sayılar $a$ ve $b$’yi seç; $a^2-b^2=39$ olsun.',
        view: 'diff-squares', visualLabel: 'Büyük kareden küçük kare çıkınca kalan L, dikdörtgene dönüşür',
        controls: [{ key: 'a', label: '$a$', min: 2, max: 12, step: 1 }, { key: 'b', label: '$b$', min: 1, max: 11, step: 1 }],
        initial: { a: 7, b: 3 },
        compute: ({ a, b }) => ({ a, b, diff: a * a - b * b, invalid: b >= a ? '$b<a$ olmalı; küçük kare büyüğün içine sığmalı.' : null }),
        readout: (_, r) => [['$a^2-b^2$', fmt(r.diff)], ['$(a-b)(a+b)$', `${r.a - r.b} × ${r.a + r.b}`]],
        target: {
          text: 'Hedef: $a^2-b^2=39$.',
          test: (_, r) => !r.invalid && r.diff === 39,
          example: { a: 8, b: 5 },
          hint: '$(a-b)(a+b)=39$: 39’u iki çarpana ayır (1·39 ya da 3·13).',
        },
        diagnose: (_, r) => (r.invalid ? '$b<a$ seç.' : `$(${r.a}-${r.b})(${r.a}+${r.b})=${r.diff}$; 39 için çarpanlar 3 ve 13 olabilir.`),
        success: '$a-b=3$, $a+b=13$: $a=8$, $b=5$.',
      },
      reasons: [
        {
          question: 'Neden $(a-b)(a+b)$?',
          options: ['L şeklini kesip yan yana koyunca kenarları $a-b$ ve $a+b$ olan dikdörtgen olur.', 'Kareler farkı her zaman farkın karesidir.', '$a$ ile $b$ çarpılır.'],
          answer: 0,
          feedback: ['', '$(a-b)^2=a^2-2ab+b^2$; farklı.', '$ab$ terimleri sadeleşir; çarpım kalmaz.'],
        },
        {
          question: '$(a-b)^2$ ile $a^2-b^2$ arasındaki fark nedir?',
          options: ['$(a-b)^2=a^2-2ab+b^2$; $a^2-b^2$ ise $(a-b)(a+b)$.', 'İkisi aynıdır.', 'Yalnız $a>b$ iken aynıdır.'],
          answer: 0,
          feedback: ['', '$a=3$, $b=1$ dene: $(a-b)^2=4$ ama $a^2-b^2=8$.', '$a=3,b=1$ de $a>b$ ama farklılar.'],
        },
      ],
      proof: '$(a-b)(a+b)=a^2+ab-ab-b^2=a^2-b^2$. Geometride: $a\\times a$ kareden $b\\times b$ kare çıkarılır; kalan L iki dikdörtgene bölünüp birleştirilince $(a-b)\\times(a+b)$ olur.',
      rule: '$a^2-b^2=(a-b)(a+b)$; büyük çarpımlarda $(n-k)(n+k)=n^2-k^2$.',
      condition: 'Fark olmalı; $a^2+b^2$ gerçek sayılarda çarpanlara ayrılmaz.',
      trap: '$a^2-b^2=(a-b)^2$ yazmak; $a^2+b^2=(a+b)^2$ sanmak.',
      transfer: [
        {
          id: 'kare-yakin', level: 'Yakın alıştırma', text: '$x^2-y^2=24$ ve $x+y=6$ ise $x-y$ kaçtır?',
          options: ['$4$', '$18$', '$2$'], answer: 0,
          hints: ['$(x-y)(x+y)=24$.', '$(x-y)\\cdot6=24$.', '$4$.'],
          feedback: ['$x=5$, $y=1$.', '$24-6$ çıkarma değil, bölme.', '$\\sqrt4$; kök alınmaz.'],
        },
        {
          id: 'kare-us', level: 'Büyük sayı', text: '$2^{16}-1$ sayısının kaç farklı asal böleni vardır?',
          options: ['$4$', '$2$', '$16$'], answer: 0,
          hints: ['$(2^8-1)(2^8+1)$.', '$255\\cdot257$.', '$3\\cdot5\\cdot17\\cdot257$.'],
          feedback: ['3, 5, 17, 257.', '255’i de ayır: $3\\cdot5\\cdot17$.', 'Üs sayısı bölen sayısı değil.'],
        },
        {
          id: 'kare-ifade', level: 'İfade', text: '$(x+3)^2-(x-3)^2$ neye eşittir?',
          options: ['$12x$', '$18$', '$6x$'], answer: 0,
          hints: ['$A^2-B^2=(A-B)(A+B)$.', '$A-B=6$, $A+B=2x$.', '$12x$.'],
          feedback: ['$6\\cdot2x$.', '$9-9=0$; $x$’li terimler kalır.', '$2x\\cdot6=12x$; 2’yi unuttun.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0086', answer: 'C', from: 'polinom-islemleri', why: 'Çift polinomun kökleri $\\pm2$, $\\pm3$: $P(x)=(x^2-4)(x^2-9)$.' },
      ],
    },
    {
      id: 'uc-terimli', label: 'Üç terimli', short: 'Çarpım c, toplam b',
      objective: '$x^2+bx+c$’yi çarpımı $c$, toplamı $b$ olan iki sayıyla $(x+p)(x+q)$ biçiminde ayırır; kök bilgisiyle çarpanı kurar.',
      misconception: 'Yalnız çarpımı $c$ olan çifti seçip toplamı denetlememek; işaretleri karıştırmak.',
      story: 'Alanı $x^2+7x+12$ olan dikdörtgen bir halı: bir kenarı $x+3$ ise diğeri? Karoları yeniden dizerek bul.',
      predict: {
        question: '$x^2+7x+12$ neye eşittir?',
        options: ['$(x+3)(x+4)$', '$(x+2)(x+6)$', '$(x+1)(x+12)$'],
        insight: [
          'Doğru: $3\\cdot4=12$, $3+4=7$.',
          '$2\\cdot6=12$ ama $2+6=8$.',
          '$1\\cdot12=12$ ama $1+12=13$.',
        ],
      },
      experiment: {
        prompt: '$p$ ve $q$’yu seç; $(x+p)(x+q)=x^2+7x+12$ olsun.',
        view: 'tiles', visualLabel: 'Karo modeli: x², x’ler ve birimler',
        controls: [{ key: 'p', label: '$p$', min: -6, max: 6, step: 1 }, { key: 'q', label: '$q$', min: -6, max: 6, step: 1 }],
        initial: { p: 2, q: 6 },
        compute: ({ p, q }) => ({ p, q, b: p + q, c: p * q }),
        readout: (_, r) => [['$(x+p)(x+q)$', `$(x${sgn(r.p)})(x${sgn(r.q)})$`], ['Açılım', `$x^2${sgn(r.b)}x${sgn(r.c)}$`]],
        target: {
          text: 'Hedef: $x^2+7x+12$.',
          test: (_, r) => r.b === 7 && r.c === 12,
          example: { p: 3, q: 4 },
          hint: '12’nin çarpan çiftlerini listele; toplamı 7 olanı seç.',
        },
        diagnose: (_, r) => `Çarpım ${r.c} (12 olmalı), toplam ${r.b} (7 olmalı).`,
        success: '$(x+3)(x+4)$: karolar $x+3$ ve $x+4$ kenarlı dikdörtgen oluşturur.',
      },
      reasons: [
        {
          question: 'Neden 3 ve 4?',
          options: ['Çarpımları sabit terim (12), toplamları $x$’in katsayısı (7).', '12’nin en büyük iki çarpanı oldukları için.', 'Ardışık sayılar oldukları için.'],
          answer: 0,
          feedback: ['', '6 ve 2 daha büyük çarpan ama toplam 8.', 'Ardışıklık tesadüf; $x^2+8x+12=(x+2)(x+6)$.'],
        },
        {
          question: '$x^2-x-12$ neye eşittir?',
          options: ['$(x-4)(x+3)$', '$(x+4)(x-3)$', '$(x-4)(x-3)$'],
          answer: 0,
          feedback: ['', 'Toplam $+1$ olur; katsayı $-1$.', 'Çarpım $+12$ olur; sabit $-12$.'],
        },
      ],
      proof: '$(x+p)(x+q)=x^2+(p+q)x+pq$. Katsayı eşitliği: $p+q=7$, $pq=12$. Tam sayı çiftleri $(1,12),(2,6),(3,4)$ ve negatifleri; yalnız $(3,4)$ toplamı 7 verir.',
      rule: '$x^2+bx+c$: çarpımı $c$, toplamı $b$ olan iki sayı. Baş katsayı $a\\neq1$ ise çapraz çarpım (çarpımı $ac$).',
      condition: 'Tam sayı çift yoksa ifade tam sayılarla ayrılmaz (ama gerçek köklü olabilir).',
      trap: 'İşaret: $c<0$ ise sayılar zıt işaretli, büyük olan $b$’nin işaretini alır.',
      transfer: [
        {
          id: 'uc-yakin', level: 'Yakın alıştırma', text: '$x^2-5x+6$ neye eşittir?',
          options: ['$(x-2)(x-3)$', '$(x+2)(x+3)$', '$(x-1)(x-6)$'], answer: 0,
          hints: ['Çarpım $+6$, toplam $-5$.', 'İki sayı da negatif.', '$-2$ ve $-3$.'],
          feedback: ['$(-2)(-3)=6$, $-2-3=-5$.', 'Çarpım doğru ama toplam $+5$ olur; işaret yanlış.', 'Çarpım 6 ama toplam $-7$; $-5$ olmalı.'],
        },
        {
          id: 'uc-kok', level: 'Denkleme aktar', text: '$x^2+2x-15=0$ denkleminin kökleri nelerdir?',
          options: ['$3$ ve $-5$', '$-3$ ve $5$', '$15$ ve $-1$'], answer: 0,
          hints: ['$(x+5)(x-3)=0$.', 'Çarpım sıfırsa çarpanlardan biri sıfır.', '$x=-5$ veya $x=3$.'],
          feedback: ['$9+6-15=0$ ✓.', '$x=5$: $25+10-15\\neq0$.', '$15\\cdot(-1)$ çarpım ama toplam uymuyor.'],
        },
        {
          id: 'uc-bas', level: 'Baş katsayı ≠ 1', text: '$2x^2+7x+3$ neye eşittir?',
          options: ['$(2x+1)(x+3)$', '$(2x+3)(x+1)$', '$(x+1)(x+3)$'], answer: 0,
          hints: ['Çarpımı $2\\cdot3=6$, toplamı 7: 1 ve 6.', '$2x^2+x+6x+3$.', '$x(2x+1)+3(2x+1)$.'],
          feedback: ['Açılım $2x^2+6x+x+3$ ✓.', 'Açılım $2x^2+5x+3$; $x$’in katsayısı 7 değil.', 'Baş katsayı 1 olurdu.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0094', answer: 'D', from: 'polinom-islemleri', why: '$P(1)=0$: $P=(x-1)(x^2+cx+2)$; ikinci çarpanın gerçek kökü olmasın.' },
      ],
    },
    {
      id: 'sadelestirme', label: 'Sadeleştirme', short: 'Yasak değer kalır',
      objective: 'Rasyonel ifadeyi çarpanlarına ayırıp sadeleştirir; asıl ifadenin tanımsız olduğu değerleri sadeleştirmeden sonra da korur.',
      misconception: 'Sadeleşen çarpanın sıfır yaptığı değeri sonradan serbest saymak; terim (çarpan değil) sadeleştirmek.',
      story: 'Bir formül sadeleşince daha kısa görünüyor; ama bir değer için asıl formül sıfıra bölmeyi gerektiriyordu. Kısa formül o değeri “kurtarır” mı?',
      predict: {
        question: '$\\dfrac{x^2-9}{x^2+x-6}$ ifadesi $x=-3$ için nedir?',
        options: ['Tanımsız', '$\\dfrac65$', '$0$'],
        insight: [
          'Doğru: payda $9-3-6=0$; asıl ifade tanımsız.',
          '$\\tfrac65$ sadeleşmiş $\\tfrac{x-3}{x-2}$’nin değeri; asıl ifade $-3$’te tanımsız.',
          'Pay da 0 ama payda 0 olduğu için $\\tfrac00$ tanımsızdır.',
        ],
      },
      experiment: {
        prompt: '$x$’i kaydır; sadeleşmiş ifade tanımlıyken asıl ifadenin tanımsız olduğu değeri bul.',
        view: 'cancel', visualLabel: 'Asıl ve sadeleşmiş ifadenin değer tablosu',
        controls: [{ key: 'x', label: '$x$', min: -5, max: 5, step: 1 }],
        initial: { x: 0 },
        compute: ({ x }) => ({ x, o: original(x), s: simplified(x) }),
        readout: (_, r) => [['Asıl ifade', r.o === null ? 'tanımsız' : fmt(r.o, 3)], ['$\\tfrac{x-3}{x-2}$', r.s === null ? 'tanımsız' : fmt(r.s, 3)]],
        target: {
          text: 'Hedef: asıl ifade tanımsız, sadeleşmiş ifade tanımlı.',
          test: (_, r) => r.o === null && r.s !== null,
          example: { x: -3 },
          hint: 'Asıl paydayı çarpanlarına ayır: $(x+3)(x-2)$. Hangi çarpan sadeleşip kayboldu?',
        },
        diagnose: (_, r) => (r.o === null ? 'İkisi de tanımsız: $x=2$ iki ifadede de yasak.' : `$x=${r.x}$’te ikisi de tanımlı ve eşit (${fmt(r.o, 3)}).`),
        success: '$x=-3$: kısa ifade $\\tfrac65$ verir ama asıl ifade tanımsız. Yasak değerler: $-3$ ve $2$.',
      },
      reasons: [
        {
          question: 'Asıl ifade $x=-3$’te neden tanımsız?',
          options: ['Asıl paydada $(x+3)$ çarpanı var; $x=-3$’te payda 0.', 'Pay 0 olduğu için.', 'Negatif sayı olduğu için.'],
          answer: 0,
          feedback: ['', 'Pay 0 olsa tek başına sorun olmazdı; sorun paydanın 0 olması.', '$x=-1$’de de negatif ama tanımlı.'],
        },
        {
          question: 'Sadeleştirmede neyi korumalısın?',
          options: ['Asıl ifadenin bütün yasak değerlerini.', 'Yalnız sadeleşmiş ifadenin yasak değerini.', 'Hiçbir şeyi; ifadeler eşittir.'],
          answer: 0,
          feedback: ['', 'Sadeleşmiş ifade yalnız $x=2$’yi yasaklar; $-3$ kaybolur.', 'Yalnız ortak tanım kümesinde eşittirler.'],
        },
      ],
      proof: '$\\tfrac{(x-3)(x+3)}{(x+3)(x-2)}=\\tfrac{x-3}{x-2}$ yalnız $x+3\\neq0$ iken (sıfıra bölmeden kaçınarak) yapılabilir. Bu yüzden eşitlik $x\\notin\\{-3,2\\}$ için geçerlidir.',
      rule: 'Önce pay ve paydayı çarpanlara ayır, yasak değerleri yaz, sonra ortak çarpanları sadeleştir.',
      condition: 'Yalnız çarpanlar sadeleşir; toplamdaki terimler sadeleşmez ($\\tfrac{x+3}{x}\\neq3$).',
      trap: 'Sadeleşen çarpanın yasak değerini unutmak; terim sadeleştirmek.',
      transfer: [
        {
          id: 'sad-yakin', level: 'Yakın alıştırma', text: '$\\dfrac{x^2-4}{x-2}$ neye eşittir?',
          options: ['$x+2$ ($x\\neq2$)', '$x-2$', '$x+2$ (her $x$ için)'], answer: 0,
          hints: ['$x^2-4=(x-2)(x+2)$.', '$(x-2)$ sadeleşir.', 'Yasak değer 2 kalır.'],
          feedback: ['Yasak değer korundu.', 'Sadeleşen $(x-2)$; kalan $x+2$.', '$x=2$’de asıl ifade tanımsız.'],
        },
        {
          id: 'sad-iki', level: 'Bölme', text: '$\\dfrac{a^2-b^2}{a+b}\\div(a-b)$ ifadesi ($a\\neq\\pm b$) neye eşittir?',
          options: ['$1$', '$a-b$', '$0$'], answer: 0,
          hints: ['$\\tfrac{(a-b)(a+b)}{a+b}=a-b$.', '$(a-b)\\div(a-b)$.', '1.'],
          feedback: ['$a\\neq\\pm b$ olduğu için 1.', '$a-b$’ye bulduğun ifadeyi yine $(a-b)$’ye bölmeyi unuttun.', 'Bölüm 1; fark 0 olurdu.'],
        },
        {
          id: 'sad-deger', level: 'Hesap kısa yolu', text: '$\\dfrac{x^2+5x+6}{x+2}$ ifadesinin $x=98$ için değeri kaçtır?',
          options: ['$101$', '$100$', '$98$'], answer: 0,
          hints: ['$x^2+5x+6=(x+2)(x+3)$.', 'Sadeleşince $x+3$.', '$98+3$.'],
          feedback: ['$x+3=101$.', '$x+2=100$; sadeleşen çarpan.', 'İfade $x$’e eşit değil.'],
        },
      ],
      realNote: 'Rasyonel ifade sadeleştirme isteyen kategori sorusu (AYT-0095) derste çözüldü; bankalarda görseli okunmuş başka uygun soru yok.',
    },
  ],
};
