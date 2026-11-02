// Mutlak Değer laboratuvarı: uzaklık olarak mutlak değer, işarete göre açma (parçalı ifade), bant biçiminde eşitsizlik,
// uzaklıklar toplamının en küçüğü (ortanca). `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const POINTS = [-3, 0, 6];
export const sumDist = (x, pts = POINTS) => pts.reduce((s, p) => s + Math.abs(x - p), 0);
// |x − 3| + |x + 1| ifadesinin bölgeye göre açılmış biçimi.
export function opened(x) {
  if (x < -1) return { region: '$x<-1$', form: '$-2x+2$', a: -2, b: 2 };
  if (x < 3) return { region: '$-1\\le x<3$', form: '$4$', a: 0, b: 4 };
  return { region: '$x\\ge3$', form: '$2x-2$', a: 2, b: -2 };
}

export default {
  conceptId: 'mutlak-deger',
  title: 'Mutlak Değer',
  exam: 'TYT + AYT',
  hero: { title: 'Ne kadar uzak?', text: 'Mutlak değer işaret değil, uzaklık ölçer. Noktaları kaydır, ifadeyi aç, bandı kur, en kısa yolu bul.', art: ['|x−a|', '↔', 'uzaklık'] },
  goals: [
    {
      id: 'uzaklik', label: 'Uzaklık', short: '|x − a| = r: iki nokta',
      objective: '$|x-a|$’yı $x$ ile $a$ arasındaki uzaklık olarak okur; $|x-a|=r$ denkleminin iki, bir ya da sıfır çözümünü belirler.',
      misconception: '$|x-2|=5$’in yalnız $x=7$ çözümünü bulmak; sağ taraf negatifken çözüm aramak.',
      story: 'Bir otobüs durağı 2. km’de. Durağa 5 km uzaklıktaki bir eve gidiyorsun ama hangi yönde olduğunu bilmiyorsun. Kaç olası ev konumu var?',
      predict: {
        question: '$|x-2|=5$ denkleminin kaç çözümü vardır?',
        options: ['$2$', '$1$', '$0$'],
        insight: [
          'Doğru: 2’nin sağında 7, solunda $-3$.',
          '$x=7$’yi buldun ama sol tarafta da 5 birim uzakta bir nokta var: $-3$.',
          'Sağ taraf pozitif; uzaklığı 5 olan noktalar var.',
        ],
      },
      experiment: {
        prompt: '$x$’i kaydır; 2’ye uzaklığı 5 olan **negatif** çözümü bul.',
        view: 'distance', visualLabel: 'Sayı doğrusu: 2 ile x arasındaki uzaklık',
        controls: [{ key: 'x', label: '$x$', min: -8, max: 8, step: 0.5, format: (v) => fmt(v, 1) }],
        initial: { x: 4 },
        compute: ({ x }) => ({ x, d: Math.abs(x - 2) }),
        readout: (_, r) => [['$x-2$', fmt(r.x - 2, 1)], ['$|x-2|$', fmt(r.d, 1)]],
        target: {
          text: 'Hedef: $|x-2|=5$ ve $x<0$.',
          test: (_, r) => r.d === 5 && r.x < 0,
          example: { x: -3 },
          hint: '2’den sola doğru 5 birim git.',
        },
        diagnose: (_, r) => (r.d === 5 ? 'Uzaklık 5 ama bu pozitif çözüm; diğer yönde de 5 birim var.' : `$x$ ile 2 arasındaki uzaklık ${fmt(r.d, 1)}; 5 olmalı.`),
        success: '$x=-3$: $|{-3}-2|=|{-5}|=5$. İkinci çözüm $7$.',
      },
      reasons: [
        {
          question: '$|x-2|$ neyi ölçer?',
          options: ['$x$ ile 2 arasındaki uzaklığı.', '$x$’in 2’den büyük olup olmadığını.', '$x-2$’nin işaretini.'],
          answer: 0,
          feedback: ['', 'Mutlak değer büyüklük karşılaştırmaz; $x=-3$ için de 5 verir.', 'İşaret kaybolur; geriye uzaklık kalır.'],
        },
        {
          question: '$|x+3|=4$’ün çözümleri nedir?',
          options: ['$1$ ve $-7$', '$7$ ve $-1$', '$1$ ve $7$'],
          answer: 0,
          feedback: ['', '$|x+3|=|x-(-3)|$: merkez $-3$, 3 değil.', '$-7$’yi unuttun; merkezin iki yanına git.'],
        },
      ],
      proof: '$|u|=r$ ($r>0$) ⇔ $u=r$ veya $u=-r$. $u=x-2$: $x=7$ veya $x=-3$. $r=0$ ise tek çözüm, $r<0$ ise çözüm yok çünkü uzaklık negatif olamaz.',
      rule: '$|x-a|=r$: $r>0$ ise $x=a\\pm r$; $r=0$ ise $x=a$; $r<0$ ise çözüm yok.',
      condition: 'Sağ taraf $x$ içeriyorsa ($|x-1|=2x$ gibi) bulunan adaylar sağ tarafın $\\ge0$ olmasıyla denetlenir.',
      trap: 'Yalnız pozitif çözümü yazmak; $|x+3|$’te merkezi $+3$ almak.',
      transfer: [
        {
          id: 'uz-yakin', level: 'Yakın alıştırma', text: '$|2x-1|=7$ denkleminin çözümleri toplamı kaçtır?',
          options: ['$1$', '$4$', '$8$'], answer: 0,
          hints: ['$2x-1=7$ veya $2x-1=-7$.', '$x=4$ veya $x=-3$.', '$4+(-3)$.'],
          feedback: ['$4+(-3)=1$.', 'Yalnız pozitif çözümü aldın.', '$7+1$: çözümleri toplamadın.'],
        },
        {
          id: 'uz-saat', level: 'Günlük bağlam', text: 'A ile B şehirleri arasında 2 saat, B ile C arasında 5 saat fark var. A’da saat 10.00 iken C’de saat aşağıdakilerden hangisi **olamaz**?',
          options: ['15.00', '13.00', '07.00'], answer: 0,
          hints: ['B: $10\\pm2$.', 'C: B$\\pm5$.', 'Olasılıklar 17, 13, 7, 3.'],
          feedback: ['15.00 hiçbir işaret seçimiyle çıkmaz.', '$10-2+5=13$ mümkün; olamaz değil.', '$10+2-5=7$ mümkün; olamaz değil.'],
        },
        {
          id: 'uz-negatif', level: 'Sınır durumu', text: '$|x+4|=-2$ denkleminin çözüm kümesi nedir?',
          options: ['Boş küme', '$\\{-6,\\,-2\\}$', '$\\{-2\\}$'], answer: 0,
          hints: ['Mutlak değer bir uzaklıktır.', 'Uzaklık negatif olabilir mi?', 'Hiçbir $x$ sağlamaz.'],
          feedback: ['Uzaklık $-2$ olamaz.', '$|-6+4|=2\\neq-2$; uzaklık negatif olamaz.', '$|-2+4|=2\\neq-2$; uzaklık negatif olamaz.'],
        },
      ],
      real: [
        { code: 'TYT-0619', answer: 'D', from: 'esitsizlikler', why: 'Saat farkı yön belirtmez: C’nin saati $14\\pm4\\pm3$; olmayanı bul.' },
        { code: 'AYT_Sayisal-0034', answer: 'E', from: 'temel-kavramlar', why: '$|1-y|=3$ ve $|x|=y+2$’yi uzaklık olarak oku; sayı doğrusundaki sırayla adayları ele.' },
      ],
    },
    {
      id: 'tanim-acma', label: 'İşarete göre açma', short: 'İçerisi negatifse işaret döner',
      objective: 'Mutlak değerli ifadeyi içinin işaretine göre açar; kritik noktalarla bölgeleri ayırıp her bölgedeki sade biçimi yazar.',
      misconception: 'Çizgileri her durumda kaldırmak ($|x-3|=x-3$); $|-a|=a$’yı $a$ negatifken de doğru sanmak.',
      story: 'İki şehre olan uzaklıklarının toplamı bir köyün konumuna göre değişiyor: köy şehirlerin arasındaysa toplam sabit, dışındaysa artıyor. Bunu formülle görmek için ifadeyi bölgelere ayırırız.',
      predict: {
        question: '$x<-1$ iken $|x-3|+|x+1|$ neye eşittir?',
        options: ['$-2x+2$', '$2x-2$', '$4$'],
        insight: [
          'Doğru: iki iç de negatif; $(3-x)+(-x-1)=-2x+2$.',
          '$2x-2$, $x\\ge3$ bölgesindeki biçim. $x<-1$’de içler negatif.',
          '4, $-1\\le x<3$ bölgesinde. Dışarı çıkınca toplam büyür.',
        ],
      },
      experiment: {
        prompt: '$x$’i kaydır; ifadenin $2x-2$ olarak açıldığı bölgeden bir $x$ seç.',
        view: 'pieces', visualLabel: 'y = |x − 3| + |x + 1| ve bölgeler',
        controls: [{ key: 'x', label: '$x$', min: -5, max: 6, step: 0.5, format: (v) => fmt(v, 1) }],
        initial: { x: 0 },
        compute: ({ x }) => ({ x, ...opened(x), v: Math.abs(x - 3) + Math.abs(x + 1), s1: x - 3 >= 0, s2: x + 1 >= 0 }),
        readout: (_, r) => [['Bölge', r.region], ['$|x-3|$', r.s1 ? '$x-3$' : '$3-x$'], ['$|x+1|$', r.s2 ? '$x+1$' : '$-x-1$'], ['Toplam', `${r.form} $=${fmt(r.v, 1)}$`]],
        target: {
          text: 'Hedef: açılmış biçim $2x-2$.',
          test: (_, r) => r.a === 2 && r.b === -2,
          example: { x: 4 },
          hint: '$2x-2$ için iki içerinin de pozitif olması gerekir. Hangi $x$’ten sonra $x-3\\ge0$?',
        },
        diagnose: (_, r) => `Bu bölgede (${r.region}) ifade ${r.form}. ${r.s1 ? '' : '$x-3<0$ olduğu için $|x-3|=3-x$.'}`,
        success: '$x\\ge3$: iki iç de pozitif, $(x-3)+(x+1)=2x-2$.',
      },
      reasons: [
        {
          question: '$x<3$ iken $|x-3|$ neden $3-x$’tir?',
          options: ['İçerisi negatif; mutlak değer işaretini değiştirir: $-(x-3)$.', 'Mutlak değer her zaman çizgileri kaldırır.', '3 büyük olduğu için önce yazılır.'],
          answer: 0,
          feedback: ['', '$x=0$: $|0-3|=3$ ama $0-3=-3$. Çizgiyi kaldırmak negatif verir.', 'Sıra değil, işaret değişir: $-(x-3)=3-x$.'],
        },
        {
          question: 'Bölgeler hangi noktalarda değişir?',
          options: ['İçlerin sıfır olduğu $x=3$ ve $x=-1$’de.', '$x=0$’da.', 'Her tam sayıda.'],
          answer: 0,
          feedback: ['', '0, iki içi de sıfır yapmaz; kritik noktalar $3$ ve $-1$.', 'İşaret yalnız içler sıfırdan geçince değişir.'],
        },
      ],
      proof: '$|u|=u$ ($u\\ge0$), $|u|=-u$ ($u<0$). Kritik noktalar $-1$ ve $3$ sayı doğrusunu üç bölgeye ayırır; her bölgede iki içerinin işareti sabittir, bu yüzden ifade doğrusal bir biçim alır: $-2x+2$, $4$, $2x-2$.',
      rule: 'Önce içleri sıfır yapan noktaları bul, bölgelere ayır; her bölgede içerinin işaretine göre ya aynen ya da $-1$ ile çarparak aç.',
      condition: 'İçerinin işareti bölge boyunca sabit olmalı. Sınır noktasında iki biçim de aynı değeri verir.',
      trap: '$a<0$ iken $|a|=a$ yazmak; $|a-b|$’yi $a-b$ diye açmak ($a<b$ iken).',
      transfer: [
        {
          id: 'acma-yakin', level: 'Yakın alıştırma', text: '$a<0<b$ ise $|a|+|b-a|-|b|$ ifadesinin eşiti nedir?',
          options: ['$-2a$', '$2b$', '$0$'], answer: 0,
          hints: ['$|a|=-a$, $|b|=b$.', '$b-a>0$: $|b-a|=b-a$.', '$-a+b-a-b$.'],
          feedback: ['$-2a$ pozitif bir sayı.', '$b$’ler sadeleşir; geriye $a$’lı terim kalır.', '$a<0$ iken $|a|=-a$; $a$ değil.'],
        },
        {
          id: 'acma-iki', level: 'Aynı uzaklık iki yazım', text: '$x<2$ ise $|x-2|+|2-x|+x$ neye eşittir?',
          options: ['$4-x$', '$x-4$', '$3x-4$'], answer: 0,
          hints: ['$|x-2|=|2-x|=2-x$.', 'İkisi toplamı $4-2x$.', '$+x$ ekle.'],
          feedback: ['$2(2-x)+x$.', 'İşaretleri ters açtın.', '$x-2$ olarak açtın; $x<2$’de içerisi negatif.'],
        },
        {
          id: 'acma-kosul', level: 'Tersine okuma', text: '$|a-b|=b-a$ ise aşağıdakilerden hangisi kesinlikle doğrudur?',
          options: ['$b\\ge a$', '$b<0$', '$b>0$'], answer: 0,
          hints: ['$|u|=-u$ ancak $u\\le0$ iken.', '$u=a-b$.', '$a-b\\le0$.'],
          feedback: ['$a\\le b$.', '$b$’nin işareti hakkında bilgi yok.', '$a=-5$, $b=-1$ de sağlar.'],
        },
      ],
      real: [
        { code: 'TYT-0628', answer: 'C', why: 'Kapanan çizginin yerini dene: hangi grubun mutlak değeri sonucu 3 yapar?' },
        { code: 'AYT_Sayisal-0040', answer: 'E', from: 'temel-kavramlar', why: '$|abc|=ab$, $|a-c|=|c|$, $|c-b|=-b$: işaret bilgilerini çıkar, sonra aç.' },
      ],
    },
    {
      id: 'bant', label: 'Mutlak değer bandı', short: '|x − a| ≤ r: merkez ve yarıçap',
      objective: 'Kapalı/açık aralığı $|x-a|\\le r$ biçimine (merkez = orta nokta, $r$ = yarı uzunluk) ve tersine çevirir; $>$ ile bandın dışını ayırır.',
      misconception: 'Merkezi aralığın sol ucu, $r$’yi aralığın tüm uzunluğu almak.',
      story: 'Paraşüt 300 ile 400 m yükseklik arasında açılmalı. Bu güvenli bandı tek bir “hedef ± tolerans” cümlesiyle nasıl söylersin?',
      predict: {
        question: '$2\\le x\\le8$ aralığı hangi eşitsizlikle aynıdır?',
        options: ['$|x-5|\\le3$', '$|x-2|\\le8$', '$|x-3|\\le5$'],
        insight: [
          'Doğru: orta nokta 5, yarı uzunluk 3.',
          '$|x-2|\\le8$: $-6\\le x\\le10$; merkez sol uç değil.',
          '$|x-3|\\le5$: $-2\\le x\\le8$; merkez yanlış.',
        ],
      },
      experiment: {
        prompt: 'Merkezi ve yarıçapı seç; $|x-a|\\le r$ bandını $[2,\\,8]$ aralığına oturt.',
        view: 'band', visualLabel: 'Bant: merkez a, iki yana r',
        controls: [{ key: 'a', label: 'Merkez $a$', min: -5, max: 10, step: 1 }, { key: 'r', label: 'Yarıçap $r$', min: 0, max: 8, step: 1 }],
        initial: { a: 2, r: 6 },
        compute: ({ a, r }) => ({ a, r, lo: a - r, hi: a + r }),
        readout: (_, r) => [['Bant', `$|x-${r.a}|\\le${r.r}$`], ['Aralık', `$[${r.lo},\\ ${r.hi}]$`]],
        target: {
          text: 'Hedef: bant tam olarak $[2,\\,8]$.',
          test: (_, r) => r.lo === 2 && r.hi === 8,
          example: { a: 5, r: 3 },
          hint: 'Merkez iki ucun ortası, yarıçap uzunluğun yarısı.',
        },
        diagnose: (_, r) => `Bant $[${r.lo},${r.hi}]$. ${r.hi - r.lo !== 6 ? `Uzunluk ${r.hi - r.lo}; 6 olmalı, yani $r=3$.` : 'Uzunluk doğru; merkezi kaydır.'}`,
        success: '$a=\\tfrac{2+8}2=5$, $r=\\tfrac{8-2}2=3$.',
      },
      reasons: [
        {
          question: 'Merkez neden 5?',
          options: ['Aralığın orta noktası: $\\tfrac{2+8}2$.', 'Uçların farkının yarısı.', '$8-3$ olduğu için.'],
          answer: 0,
          feedback: ['', 'Farkın yarısı (3) yarıçaptır; merkez değil.', 'Sonuç doğru ama gerekçe değil; merkez uçların ortalamasıdır.'],
        },
        {
          question: '$|x-5|>3$ neyi verir?',
          options: ['$x<2$ veya $x>8$: bandın dışı.', '$2<x<8$', '$x>8$'],
          answer: 0,
          feedback: ['', 'Bu bandın içi; $>$ dışarıyı anlatır.', '$x<2$ tarafını unuttun.'],
        },
      ],
      proof: '$|x-a|\\le r \\iff -r\\le x-a\\le r \\iff a-r\\le x\\le a+r$. Uçları $m$ ve $M$ olan aralık için $a=\\tfrac{m+M}2$, $r=\\tfrac{M-m}2$.',
      rule: '$[m,M]=\\{x: |x-\\tfrac{m+M}2|\\le\\tfrac{M-m}2\\}$; $<$ açık aralık, $>$ iki dış ışın.',
      condition: '$r\\ge0$ olmalı. $|x-a|<0$ boş, $|x-a|\\le0$ yalnız $x=a$.',
      trap: '$|2x-6|\\le4$’te katsayıyı unutup merkezi 6 almak.',
      transfer: [
        {
          id: 'bant-yakin', level: 'Yakın alıştırma', text: '$|x+1|<4$ eşitsizliğini sağlayan kaç tam sayı vardır?',
          options: ['$7$', '$8$', '$9$'], answer: 0,
          hints: ['$-4<x+1<4$.', '$-5<x<3$.', '$-4$’ten $2$’ye.'],
          feedback: ['$-4,\\dots,2$.', 'Uçlar ($-5$ ve 3) dahil değil.', 'Açık aralık: $-5$ ve 3 hariç.'],
        },
        {
          id: 'bant-sicaklik', level: 'Sözelden banda', text: 'Bir makinede sıcaklık 18 ile 26 °C arasında (uçlar dahil) tutulmalı. Hangi eşitsizlik bunu anlatır?',
          options: ['$|T-22|\\le4$', '$|T-18|\\le8$', '$|T-4|\\le22$'], answer: 0,
          hints: ['Merkez $\\tfrac{18+26}2$.', 'Yarıçap $\\tfrac{26-18}2$.', '$|T-22|\\le4$.'],
          feedback: ['$18\\le T\\le26$.', 'Merkezi sol uç aldın: $10\\le T\\le26$.', 'Merkez ile yarıçapı karıştırdın.'],
        },
        {
          id: 'bant-katsayi', level: 'Katsayılı', text: '$|2x-6|\\le4$ ise $x$ hangi aralıktadır?',
          options: ['$[1,\\ 5]$', '$[-1,\\ 5]$', '$[1,\\ 10]$'], answer: 0,
          hints: ['$-4\\le2x-6\\le4$.', '$2\\le2x\\le10$.', '$1\\le x\\le5$.'],
          feedback: ['Merkez 3, yarıçap 2.', 'Sol uçta $6-4=2$, $2/2=1$.', '2’ye bölmeyi unuttun.'],
        },
      ],
      real: [
        { code: 'TYT-0615', answer: 'A', from: 'esitsizlikler', why: '800 m’den 400–500 m düşüş: açılış yüksekliği 300–400 m; bandı merkez ± yarıçapla yaz.' },
        { code: 'TYT-0622', answer: 'A', from: 'esitsizlikler', why: 'Kâr/zarar koşullarından $10<b<30$ (bin); bandın merkezi 20, yarıçapı 10.' },
      ],
    },
    {
      id: 'minimum', label: 'Uzaklıklar toplamı', short: 'En küçük: ortanca',
      objective: '$\\sum|x-p_i|$ toplamının en küçük değerini ortanca noktada bulur; iki noktada aradaki her $x$’in aynı değeri verdiğini açıklar.',
      misconception: 'En küçük değeri ortalamada aramak; iki nokta durumunda tek bir minimum noktası beklemek.',
      story: 'Bir koridorda 3 sınıf var: 0. m’de, 6. m’de ve −3. m’de. Su sebilini nereye koyarsan öğrencilerin toplam yürüyüşü en az olur?',
      predict: {
        question: '$|x+3|+|x|+|x-6|$ en küçük değerini hangi $x$’te alır?',
        options: ['$x=0$ (ortanca)', '$x=1$ (ortalama)', '$x=-3$'],
        insight: [
          'Doğru: ortancada 9, ortalamada 10.',
          '$x=1$’de toplam 10; ortancada 9. Ortalama uç noktalara duyarlıdır.',
          '$x=-3$’te toplam 12.',
        ],
      },
      experiment: {
        prompt: '$x$’i kaydır; $|x+3|+|x|+|x-6|$ toplamını **en küçük** yap.',
        view: 'sum-dist', visualLabel: 'Üç noktaya uzaklık ve toplam grafiği',
        controls: [{ key: 'x', label: '$x$', min: -6, max: 9, step: 0.5, format: (v) => fmt(v, 1) }],
        initial: { x: 3 },
        compute: ({ x }) => ({ x, total: sumDist(x), parts: POINTS.map((p) => Math.abs(x - p)) }),
        readout: (_, r) => [['Uzaklıklar', r.parts.map((p) => fmt(p, 1)).join(' + ')], ['Toplam', fmt(r.total, 1)]],
        target: {
          text: 'Hedef: toplam en küçük.',
          test: (_, r) => r.total === 9,
          example: { x: 0 },
          hint: 'Sağa doğru yarım adım attığında kaç noktaya yaklaşıyor, kaçından uzaklaşıyorsun?',
        },
        diagnose: (_, r) => {
          const left = POINTS.filter((p) => p < r.x).length, right = POINTS.filter((p) => p > r.x).length;
          return `Toplam ${fmt(r.total, 1)}. Solunda ${left}, sağında ${right} nokta var; ${left > right ? 'sola' : 'sağa'} kayınca toplam azalır.`;
        },
        success: 'Ortanca $x=0$: iki yanında eşit sayıda nokta, toplam 9.',
      },
      reasons: [
        {
          question: 'En küçük değer neden ortancada?',
          options: ['Ortancadan kayınca bir noktaya yaklaşıp iki noktadan uzaklaşırsın; toplam artar.', 'Ortanca her zaman ortalamaya eşittir.', 'Ortanca 0 olduğu için.'],
          answer: 0,
          feedback: ['', 'Burada ortalama 1, ortanca 0; farklılar.', 'Noktalar $-1,2,5$ olsaydı minimum 2’de olurdu; 0 olduğu için değil, ortanca olduğu için.'],
        },
        {
          question: 'Yalnız iki nokta olsaydı ($|x-a|+|x-b|$, $a<b$)?',
          options: ['$a$ ile $b$ arasındaki her $x$ en küçük değeri ($b-a$) verir.', 'Yalnız orta noktada en küçük.', 'Yalnız $x=a$’da en küçük.'],
          answer: 0,
          feedback: ['', 'Arada kaydıkça birine yaklaşıp diğerinden aynı miktar uzaklaşırsın; toplam değişmez.', '$a$ ile $b$ arası her nokta aynı toplamı verir.'],
        },
      ],
      proof: 'Toplamın eğimi, solundaki nokta sayısı eksi sağındaki nokta sayısıdır. Eğim ortancanın solunda negatif, sağında pozitiftir; bu yüzden en küçük değer ortancadadır. Çift sayıda noktada iki orta nokta arasında eğim 0’dır.',
      rule: '$\\sum|x-p_i|$: tek sayıda noktada ortancada, çift sayıda iki orta nokta arasında en küçük. İki noktada en küçük değer $|a-b|$.',
      condition: 'Katsayılar eşit olmalı. $2|x-1|+|x-5|$ gibi ağırlıklı toplamda ağırlıklı ortanca gerekir.',
      trap: 'Ortalamayı almak; iki nokta durumunda tek çözüm beklemek.',
      transfer: [
        {
          id: 'min-yakin', level: 'Yakın alıştırma', text: '$|x-1|+|x-5|$ ifadesinin en küçük değeri kaçtır?',
          options: ['$4$', '$6$', '$0$'], answer: 0,
          hints: ['İki nokta: 1 ve 5.', 'Arada her $x$ aynı toplamı verir.', '$5-1$.'],
          feedback: ['$x=3$: $2+2=4$.', '6, $1+5$; uzaklık değil.', 'İki uzaklık aynı anda 0 olamaz.'],
        },
        {
          id: 'min-denklem', level: 'Denkleme aktar', text: '$|x+2|+|x-4|=6$ denkleminin kaç tam sayı çözümü vardır?',
          options: ['$7$', '$2$', '$6$'], answer: 0,
          hints: ['En küçük değer $4-(-2)=6$.', 'Bu değer $-2\\le x\\le4$’te alınır.', '$-2$’den 4’e tam sayılar.'],
          feedback: ['$-2,\\dots,4$: 7 tane.', 'Yalnız uçları buldun; aradakiler de sağlar.', 'Uçlar da çözüm: $-2$ ve 4’ü say.'],
        },
        {
          id: 'min-kapi', level: 'Günlük bağlam', text: 'Bir koridorda 2, 5 ve 9 numaralı kapılar var. Bir dolap nereye konursa üç kapıya toplam uzaklık en az olur?',
          options: ['5 numaranın önüne', 'Ortalamaya: 5,33', '2 ile 9 arasında her yer'], answer: 0,
          hints: ['Üç nokta: ortanca.', 'Sıralı: 2, 5, 9.', 'Ortanca 5.'],
          feedback: ['Toplam $3+0+4=7$.', '5,33’te toplam 7,33; ortanca daha iyi.', 'Üç noktada tek en küçük nokta var; “arası” iki nokta durumu.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0013', answer: 'B', from: 'temel-kavramlar', why: '$|t|+|t-1|\\ge1$ ($t=2x+y$): toplam 1 ise $|x-3|=0$ ve $0\\le t\\le1$.' },
      ],
    },
  ],
};
