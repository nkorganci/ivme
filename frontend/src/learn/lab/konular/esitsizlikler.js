// Eşitsizlikler laboratuvarı: aralıkta açık/kapalı uç ve tam sayı sayımı, negatifle çarpınca yön değişimi, iki aralıktan
// ifade aralığı, iki bilinmeyenli tam sayı koşulları. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export function integersIn(a, b, openA, openB) {
  const out = [];
  for (let n = Math.ceil(a) || 0; n <= Math.floor(b); n++) {
    if (n === a && openA) continue;
    if (n === b && openB) continue;
    out.push(n);
  }
  return out;
}
export const mapInterval = (k, c, [lo, hi]) => { const p = k * lo + c, q = k * hi + c; return [Math.min(p, q), Math.max(p, q)]; };
const X_RANGE = [2, 5];
const bracket = (open, left) => (left ? (open ? '(' : '[') : (open ? ')' : ']'));

export default {
  conceptId: 'esitsizlikler',
  title: 'Aralıklar ve Birinci Dereceden Eşitsizlikler',
  exam: 'TYT + AYT',
  hero: { title: 'Sınır nerede?', text: 'Uç dahil mi, yön döner mi, ifade nereye kadar gider? Sayı doğrusunda dene, sınırın nedenini bul.', art: ['a < x', '≤', 'b'] },
  goals: [
    {
      id: 'aralik', label: 'Aralık ve tam sayılar', short: 'Açık uç, kapalı uç',
      objective: 'Aralığı açık/kapalı uçlarıyla sayı doğrusunda gösterir; içindeki tam sayıları uç koşuluna göre doğru sayar.',
      misconception: 'Aralıktaki tam sayı sayısını aralığın uzunluğu sanmak; açık ucu dahil etmek.',
      story: 'Bir asansör “en az 2, en fazla 6 kişi” taşıyor, bir diğeri “2’den fazla, 6’dan az”. İki asansörde kaç farklı kişi sayısı mümkün?',
      predict: {
        question: 'Uzunluğu 4 olan bir aralıkta kaç tam sayı bulunur?',
        options: ['Her zaman 4.', '3, 4 ya da 5 olabilir.', 'Her zaman 5.'],
        insight: [
          '$(0,4)$’te 3, $[0,4]$’te 5 tam sayı var. Sayı, uçların tam sayı olup olmamasına ve dahil edilmesine bağlı.',
          'Doğru: uçlar tam sayıyken açık 3, yarı açık 4, kapalı 5; uçlar tam sayı değilse 4.',
          '$(0,4)$’te yalnız 1, 2, 3 var.',
        ],
      },
      experiment: {
        prompt: 'Uçları ve açık/kapalı oluşunu seç; uzunluğu 4 olup içinde **tam 3** tam sayı bulunan bir aralık kur.',
        view: 'interval', visualLabel: 'Sayı doğrusu: dolu nokta dahil, boş nokta hariç',
        controls: [
          { key: 'a', label: 'Sol uç $a$', min: -5, max: 5, step: 0.5, format: (v) => fmt(v, 1) },
          { key: 'b', label: 'Sağ uç $b$', min: -5, max: 5, step: 0.5, format: (v) => fmt(v, 1) },
          { key: 'oa', label: 'Sol uç', options: [[false, 'Dahil [ '], [true, 'Hariç (']] },
          { key: 'ob', label: 'Sağ uç', options: [[false, 'Dahil ]'], [true, 'Hariç )']] },
        ],
        initial: { a: 0, b: 4, oa: false, ob: false },
        compute: ({ a, b, oa, ob }) => ({ a, b, oa, ob, len: b - a, ints: b >= a ? integersIn(a, b, oa, ob) : [], invalid: b < a ? 'Sağ uç sol uçtan küçük; aralık boş.' : null }),
        readout: (_, r) => [['Aralık', `$${bracket(r.oa, true)}${fmt(r.a, 1)},\\ ${fmt(r.b, 1)}${bracket(r.ob, false)}$`], ['Uzunluk', fmt(r.len, 1)], ['Tam sayılar', r.ints.length ? `${r.ints.join(', ')} (${r.ints.length} tane)` : 'yok']],
        target: {
          text: 'Hedef: uzunluk 4 ve tam 3 tam sayı.',
          test: (_, r) => !r.invalid && r.len === 4 && r.ints.length === 3,
          example: { a: -1, b: 3, oa: true, ob: true },
          hint: 'Uçlar tam sayıyken iki uç da dahilse 5 tam sayı olur. Hangi uçları çıkarırsan 3 kalır?',
        },
        diagnose: (_, r) => r.invalid ? 'Önce $a\\le b$ olsun.' : r.len !== 4 ? `Uzunluk ${fmt(r.len, 1)}; 4 olmalı.` : `Uzunluk 4 ama ${r.ints.length} tam sayı var. ${r.ints.length > 3 ? 'Dahil olan tam sayı uçları hariç yap.' : 'Bir ucu dahil et ya da uçları tam sayıya getir.'}`,
        success: 'Uçlar tam sayı ve ikisi de hariç: $(a,\\ a+4)$ içinde 3 tam sayı.',
      },
      reasons: [
        {
          question: '$(-1,3)$ aralığında neden 3 tam sayı vardır?',
          options: ['Uçlar dahil değil: yalnız $0,1,2$.', 'Uzunluk 4 olduğu için 4 değil 3’tür, çünkü 0 sayılmaz.', '$-1$ negatif olduğu için sayılmaz.'],
          answer: 0,
          feedback: ['', '0 bir tam sayıdır ve aralıkta; sayılmayanlar uçlar.', '$-1$ negatif olduğu için değil, açık uç olduğu için dışarıda.'],
        },
        {
          question: 'Uçları tam sayı olan $a,b$ için tam sayı sayısı nedir?',
          options: ['Kapalı $b-a+1$, yarı açık $b-a$, açık $b-a-1$.', 'Her durumda $b-a$.', 'Her durumda $b-a+1$.'],
          answer: 0,
          feedback: ['', 'Yalnız yarı açıkta $b-a$; uçları sayıp sayılmamasına göre değişir.', 'Yalnız kapalı aralıkta.'],
        },
      ],
      proof: '$[a,b]$ içindeki tam sayılar $a,a+1,\\dots,b$: $b-a+1$ tane. Her açık uç bir tam sayıyı dışarıda bırakır. Uçlar tam sayı değilse $\\lfloor b\\rfloor-\\lceil a\\rceil+1$ tane vardır.',
      rule: 'Tam sayıları say: en küçük ve en büyük dahil tam sayıyı bul, farkına 1 ekle.',
      condition: 'Açık uçta o sayı dahil değildir; uç tam sayı değilse açık/kapalı fark etmez.',
      trap: 'Uzunluğu tam sayı sayısı sanmak; $<$ ile $\\le$ arasındaki farkı atlamak.',
      transfer: [
        {
          id: 'aralik-yakin', level: 'Yakın alıştırma', text: '$-3<x\\le2$ eşitsizliğini sağlayan kaç tam sayı vardır?',
          options: ['$5$', '$6$', '$4$'], answer: 0,
          hints: ['En küçük dahil tam sayı $-2$.', 'En büyük dahil tam sayı $2$.', '$2-(-2)+1$.'],
          feedback: ['$-2,-1,0,1,2$.', '$-3$ dahil değil ($<$ işareti); $-3$’ü saydın.', '2 dahil; $\\le$ işaretine bak.'],
        },
        {
          id: 'aralik-cift', level: 'Ek koşul', text: '$2<x<7$ ve $x$ çift tam sayı ise $x$ kaç farklı değer alır?',
          options: ['$2$', '$3$', '$4$'], answer: 0,
          hints: ['Aralıktaki tam sayılar: 3, 4, 5, 6.', 'Çift olanlar.', '4 ve 6.'],
          feedback: ['4 ve 6.', '2 dahil değil ($2<x$); 2’yi saydın.', 'Tek sayıları da saydın.'],
        },
        {
          id: 'aralik-mutlak', level: 'Farklı gösterim', text: '$|x|<3{,}5$ eşitsizliğini sağlayan kaç tam sayı vardır?',
          options: ['$7$', '$6$', '$3$'], answer: 0,
          hints: ['$|x|<3{,}5\\iff-3{,}5<x<3{,}5$.', 'Uçlar tam sayı değil.', '$-3$’ten $3$’e.'],
          feedback: ['$-3,\\dots,3$: 7 tane.', '0’ı unutma; o da bir tam sayı.', 'Negatifleri de say: $-3,-2,-1$.'],
        },
      ],
      real: [
        { code: 'TYT-0625', answer: 'B', why: '$|x-4|<3$ → $1<x<7$; gol farkı tam sayı ve ek eşitlikle olası toplamları ele.' },
        { code: 'AYT_Sayisal-0007', answer: 'E', from: 'temel-kavramlar', why: '$x=0$ sağlıyor, $x=4$ sağlamıyor: $a$’nın aralığında hangi uç dahil?' },
      ],
    },
    {
      id: 'yon', label: 'Yön değişimi', short: 'Negatifle çarpınca ters döner',
      objective: '$x$’in aralığından $kx+c$’nin aralığını bulur; negatif katsayıda eşitsizlik yönünün neden döndüğünü açıklar ve eşitsizliği çözer.',
      misconception: 'Negatif sayıyla çarpıp bölerken eşitsizlik yönünü korumak; uçları sırasıyla eşleştirip ters aralık yazmak.',
      story: 'Bir dağda her 100 m yükseldikçe sıcaklık düşüyor. Yükseklik aralığı belliyse sıcaklık aralığı nasıl yazılır? Daha yüksek nokta daha soğuk.',
      predict: {
        question: '$2<x<5$ ise $-2x+3$ hangi aralıktadır?',
        options: ['$-7<-2x+3<-1$', '$-1<-2x+3<-7$', '$7<-2x+3<13$'],
        insight: [
          'Doğru: $x=2\\to-1$, $x=5\\to-7$; büyük $x$ küçük değer verir, uçlar yer değiştirir.',
          '$-1<\\dots<-7$ olamaz: $-1$, $-7$’den büyüktür. Negatifle çarpınca yön döner.',
          'İşaret kaybolmuş: $-2x$ negatif bir sayıdır.',
        ],
      },
      experiment: {
        prompt: '$k$ ve $c$’yi seç; $2<x<5$ aralığını $-7<kx+c<-1$ aralığına dönüştür.',
        view: 'flip', visualLabel: 'Üstte x, altta kx + c',
        controls: [{ key: 'k', label: 'Katsayı $k$', options: [[2, '$2$'], [1, '$1$'], [-1, '$-1$'], [-2, '$-2$']] }, { key: 'c', label: 'Sabit $c$', min: -5, max: 5, step: 1 }],
        initial: { k: 2, c: 0 },
        compute: ({ k, c }) => { const [lo, hi] = mapInterval(k, c, X_RANGE); return { k, c, lo, hi, flips: k < 0 }; },
        readout: (_, r) => [['$kx+c$ aralığı', `$${fmt(r.lo)}<${r.k}x${r.c >= 0 ? '+' : ''}${r.c}<${fmt(r.hi)}$`], ['Uçlar', r.flips ? 'yer değiştirdi ($x=5$ küçük uca gitti)' : 'sırası korundu']],
        target: {
          text: 'Hedef aralık: $(-7,\\ -1)$.',
          test: (_, r) => r.lo === -7 && r.hi === -1,
          example: { k: -2, c: 3 },
          hint: 'Aralığın uzunluğu 6 = $|k|\\cdot3$. Değerler negatif ve büyük $x$ küçük değere gidiyor: $k$’nın işareti?',
        },
        diagnose: (_, r) => (r.hi - r.lo !== 6 ? `Aralık uzunluğu ${fmt(r.hi - r.lo)}; $|k|\\cdot3=6$ olmalı.` : `Uzunluk doğru; aralık $(${fmt(r.lo)},${fmt(r.hi)})$. $c$’yi ayarla.`),
        success: '$k=-2$, $c=3$: $x=2\\to-1$, $x=5\\to-7$; uçlar ters döndü.',
      },
      reasons: [
        {
          question: 'Negatifle çarpınca yön neden değişir?',
          options: ['Sayı doğrusu ters döner: $2<5$ ama $-4>-10$.', 'Negatif sayılar her zaman küçük olduğu için.', 'Kural öyle olduğu için; nedeni yok.'],
          answer: 0,
          feedback: ['', '$-4$ ve $-10$ ikisi de negatif; hangisinin büyük olduğu çarpmadan önceki sıranın tersi.', 'Nedeni var: $a<b\\Rightarrow b-a>0\\Rightarrow -a-(-b)>0\\Rightarrow -a>-b$.'],
        },
        {
          question: '$-x>3$ eşitsizliğinin çözümü nedir?',
          options: ['$x<-3$', '$x>-3$', '$x>3$'],
          answer: 0,
          feedback: ['', '$-1$’e bölünce yön döner; $x>-3$ yönü korur.', '$x=4$ için $-4>3$ yanlış.'],
        },
      ],
      proof: '$a<b$ ve $k<0$ ise $kb-ka=k(b-a)<0$, yani $ka>kb$. Sabit eklemek sırayı korur. Bu yüzden $2<x<5\\Rightarrow-10<-2x<-4\\Rightarrow-7<-2x+3<-1$.',
      rule: 'Pozitifle çarpma/bölme yönü korur, negatifle çarpma/bölme yönü çevirir; toplama/çıkarma hiç değiştirmez.',
      condition: 'Çarpılan sayının işareti bilinmeli. İşareti bilinmeyen bir harfle ($a$) çarparken iki durumu ayrı incele.',
      trap: 'İşareti belirsiz bir değişkenle (ör. $a$) çarpıp yönü korumak; uçları sırayla eşleştirip ters aralık yazmak.',
      transfer: [
        {
          id: 'yon-yakin', level: 'Yakın alıştırma', text: '$-3x+1>7$ eşitsizliğinin çözüm kümesi nedir?',
          options: ['$x<-2$', '$x>-2$', '$x<2$'], answer: 0,
          hints: ['İki taraftan 1 çıkar: $-3x>6$.', '$-3$’e böl; yön döner.', '$x<-2$.'],
          feedback: ['$x=-3$: $10>7$ ✓.', '$-3$’e bölünce yön dönmeli; $x=0$ ile dene: $1>7$ yanlış.', 'İşaret hatası: $6/(-3)=-2$, $+2$ değil.'],
        },
        {
          id: 'yon-cift', level: 'Çift taraflı', text: '$1\\le3-2x<7$ ise $x$ hangi aralıktadır?',
          options: ['$-2<x\\le1$', '$-2\\le x<1$', '$1\\le x<-2$'], answer: 0,
          hints: ['Her taraftan 3 çıkar: $-2\\le-2x<4$.', '$-2$’ye böl, yön döner: $1\\ge x>-2$.', 'Dahil olan uç da yer değiştirir.'],
          feedback: ['$x=1$ dahil, $x=-2$ hariç.', 'Uçlar yer değişince dahil/hariç bilgisi de onlarla gider.', '$1\\le x<-2$ boş aralık.'],
        },
        {
          id: 'yon-harf', level: 'Koşullu işaret', text: '$a<0$ ve $ax>5a$ ise $x$ için ne söylenir?',
          options: ['$x<5$', '$x>5$', '$x>5a$'], answer: 0,
          hints: ['İki tarafı $a$’ya böl.', '$a$ negatif.', 'Yön döner.'],
          feedback: ['$a<0$ olduğu için $x<5$.', '$a$ pozitif olsaydı doğru olurdu.', '$a$’ya bölünce $5a/a=5$.'],
        },
      ],
      real: [
        { code: 'TYT-0622', answer: 'A', why: 'Kâr ve zarar koşullarını iki eşitsizliğe çevir ($b>10$ bin, $b<30$ bin); aralığı mutlak değerle yaz.' },
      ],
    },
    {
      id: 'aralik-ifade', label: 'İfadenin aralığı', short: 'Farkta çapraz uçlar',
      objective: 'İki değişkenin aralıklarından toplam, fark, çarpım ve kare ifadelerinin en küçük/en büyük değerini doğru uç seçimiyle bulur.',
      misconception: 'Farkta uçları sırayla çıkarmak ($-2-1$, $3-4$); karede yalnız uçların karesine bakıp 0’ı kaçırmak.',
      story: 'Bir pazarda kâr = satış − maliyet. Satış fiyatı 4–7 TL, maliyet 1–4 TL arasında değişiyorsa en kötü kâr hangi iki ucun eşleşmesinden çıkar?',
      predict: {
        question: '$-2\\le x\\le3$ ve $1\\le y\\le4$ ise $x-y$’nin en küçük değeri kaçtır?',
        options: ['$-6$', '$-3$', '$-1$'],
        insight: [
          'Doğru: $x$ en küçük ($-2$), $y$ en büyük (4).',
          '$-2-1$: $y$’yi en küçük aldın; çıkarılan büyüdükçe fark küçülür.',
          '$3-4=-1$ en küçük değil; $x$’i de küçült.',
        ],
      },
      experiment: {
        prompt: '$x$ ve $y$’yi aralıklarında gezdir; $x-y$’nin **en küçük** değerini bul.',
        view: 'box', visualLabel: 'x–y düzleminde izinli dikdörtgen',
        controls: [{ key: 'x', label: '$x\\in[-2,3]$', min: -2, max: 3, step: 0.5, format: (v) => fmt(v, 1) }, { key: 'y', label: '$y\\in[1,4]$', min: 1, max: 4, step: 0.5, format: (v) => fmt(v, 1) }],
        initial: { x: -2, y: 1 },
        compute: ({ x, y }) => ({ x, y, d: x - y, sq: x * x }),
        readout: (_, r) => [['$x-y$', fmt(r.d, 1)], ['$x^2$', fmt(r.sq, 2)]],
        target: {
          text: 'Hedef: $x-y$ en küçük.',
          test: (_, r) => r.d === -6,
          example: { x: -2, y: 4 },
          hint: 'Bir farkı küçültmek için ilk sayıyı küçült, çıkarılanı büyüt.',
        },
        diagnose: ({ x, y }, r) => `$x-y=${fmt(r.d, 1)}$. ${x > -2 ? '$x$ daha küçük olabilir. ' : ''}${y < 4 ? '$y$ büyüdükçe fark küçülür.' : ''}`,
        success: '$x=-2$, $y=4$: $-6$. Farkta çapraz uçlar eşleşir.',
      },
      reasons: [
        {
          question: 'Neden $-2-4$?',
          options: ['Farkı küçültmek için $x$ en küçük, $y$ en büyük seçilir.', 'Uçlar sırayla çıkarılır: $-2-1$.', 'En büyük sayılar çıkarılır.'],
          answer: 0,
          feedback: ['', 'Sırayla çıkarma $-3$ verir ama $x=-2$, $y=4$ ile $-6$ elde edilir; daha küçük.', 'İki sayının en büyükleri $3-4=-1$ verir; en küçük değil.'],
        },
        {
          question: '$x^2$’nin aralığı nedir?',
          options: ['$[0,9]$', '$[4,9]$', '$[-4,9]$'],
          answer: 0,
          feedback: ['', '$x=0$ aralıkta; kare 0 olabilir.', 'Kare negatif olamaz; alt sınır en az 0.'],
        },
      ],
      proof: '$x-y$, $x$ ile artan, $y$ ile azalan bir ifadedir; en küçüğü $\\min x-\\max y=-2-4$, en büyüğü $\\max x-\\min y=3-1$. $x^2$ ise $x=0$’da en küçüktür; aralık sıfırı içerdiği için alt sınır 0, üst sınır $\\max(4,9)=9$.',
      rule: 'Toplamda uçlar aynı yönde, farkta çapraz eşleşir. Kare/çarpımda işaret değiştiren aralıkta 0 ve uçları ayrıca dene.',
      condition: 'Değişkenler birbirinden bağımsız olmalı. Kesirde payda sıfırı içermemeli.',
      trap: 'Farkta uçları sırayla çıkarmak; $x^2$ için $(-2)^2=4$’ü alt sınır sanmak.',
      transfer: [
        {
          id: 'ifade-toplam', level: 'Yakın alıştırma', text: '$1<a<3$ ve $-2<b<5$ ise $a+b$ hangi aralıktadır?',
          options: ['$(-1,\\ 8)$', '$(3,\\ 2)$', '$(-1,\\ 2)$'], answer: 0,
          hints: ['Toplamda uçlar aynı yönde toplanır.', 'En küçük: $1+(-2)$.', 'En büyük: $3+5$.'],
          feedback: ['$-1<a+b<8$.', 'Çapraz eşleştirme toplamda değil, farkta yapılır.', 'Alt uç doğru ama üst uç $3+5=8$.'],
        },
        {
          id: 'ifade-kare', level: 'Kare ve sıfır', text: '$-3\\le x\\le2$ ise $x^2+1$’in en büyük değeri kaçtır?',
          options: ['$10$', '$5$', '$1$'], answer: 0,
          hints: ['Kare, mutlak değeri büyük olan uçta büyüktür.', '$|-3|>|2|$.', '$9+1$.'],
          feedback: ['$x=-3$: $10$.', '$x=2$: 5; ama $x=-3$ daha büyük.', '1 en küçük değer ($x=0$).'],
        },
        {
          id: 'ifade-bolum', level: 'Bölüm', text: '$2<a<6$ ve $1<b<3$ pozitif sayılarsa $\\dfrac ab$ hangi aralıktadır?',
          options: ['$\\left(\\tfrac23,\\ 6\\right)$', '$(2,\\ 2)$', '$(1,\\ 2)$'], answer: 0,
          hints: ['Bölümü küçültmek için pay küçük, payda büyük.', 'En küçük $\\tfrac23$.', 'En büyük $\\tfrac61$.'],
          feedback: ['Bölümde de çapraz uçlar.', 'Uçları sırayla böldün: $2/1$ ve $6/3$.', '$\\tfrac61=6$ mümkün değer sınırı; $(1,2)$ çok dar.'],
        },
      ],
      realNote: 'Kategorinin bankalardaki görselleri tarandı; iki aralıktan ifade aralığı isteyen uygun soru (TYT-0613) derste çözüldü. Aktarım özgün alıştırmalarla yapılır.',
    },
    {
      id: 'bolge', label: 'İki bilinmeyen', short: 'Koşulları sağlayan noktalar',
      objective: 'İki bilinmeyenli eşitsizlik sistemini tam sayı noktalarını tarayarak çözer; en büyük/en küçük değeri koşullara uyan adaylar arasından seçer.',
      misconception: 'Bir koşulu sağlayıp diğerini atlamak; tam sayı koşulunu unutup sınırdaki gerçek sayıyı almak.',
      story: 'Bir kafeye en fazla 6 kişi sığıyor; yetişkin sayısı çocuk sayısından fazla olmalı ve en az bir çocuk var. Yetişkin × çocuk en çok kaç olur?',
      predict: {
        question: '$x,y$ pozitif tam sayılar, $x>y$ ve $x+y<7$ ise $x\\cdot y$ en çok kaçtır?',
        options: ['$8$', '$9$', '$6$'],
        insight: [
          'Doğru: $(4,2)$. $(3,3)$ çarpımı 9 ama $x>y$ koşulunu bozuyor.',
          '$(3,3)$: $x>y$ değil. İki koşulu birlikte uygula.',
          '$(3,2)$ izinli ama $(4,2)$ daha büyük.',
        ],
      },
      experiment: {
        prompt: 'Bir nokta seç; $x>y$, $x+y<7$ koşullarında $x\\cdot y$’yi **en büyük** yap.',
        view: 'grid', visualLabel: 'Tam sayı noktaları ve izinli bölge',
        controls: [{ key: 'x', label: '$x$', min: 1, max: 6, step: 1 }, { key: 'y', label: '$y$', min: 1, max: 6, step: 1 }],
        initial: { x: 2, y: 1 },
        compute: ({ x, y }) => ({ x, y, ok1: x > y, ok2: x + y < 7, p: x * y }),
        readout: (_, r) => [['$x>y$', r.ok1 ? '✓' : '✗'], ['$x+y<7$', r.ok2 ? '✓' : `✗ (${r.x + r.y})`], ['$x\\cdot y$', r.p]],
        target: {
          text: 'Hedef: iki koşul sağlanıyor ve çarpım en büyük.',
          test: (_, r) => r.ok1 && r.ok2 && r.p === 8,
          example: { x: 4, y: 2 },
          hint: 'İzinli noktaları sırayla dene: $x+y=6$ çizgisinin hemen içindekiler en umut verici.',
        },
        diagnose: (_, r) => (!r.ok1 ? '$x>y$ sağlanmıyor.' : !r.ok2 ? '$x+y<7$ sağlanmıyor.' : `İzinli nokta, çarpım ${r.p}. Daha büyüğü var mı?`),
        success: 'İzinli noktalar arasında en büyük çarpım $(4,2)$: 8.',
      },
      reasons: [
        {
          question: 'Neden 9 değil?',
          options: ['$(3,3)$ “$x>y$” koşulunu bozar; izinli en büyük çarpım $(4,2)$.', '9 tek sayı olduğu için.', '$x+y=6<7$ olduğu için 9 olmaz.'],
          answer: 0,
          feedback: ['', 'Teklik bu soruda koşul değil.', '$3+3=6<7$ sağlanıyor; bozulan koşul $x>y$.'],
        },
        {
          question: 'Tam sayı koşulu neden önemli?',
          options: ['Gerçek sayılarda $x=3{,}5$, $y=3{,}4$ gibi çarpımı 8’den büyük noktalar olur; tam sayılarda aday listesi sonludur.', 'Önemli değil, sonuç aynıdır.', 'Tam sayılar daha büyük olduğu için.'],
          answer: 0,
          feedback: ['', '$3{,}5\\cdot3{,}4=11{,}9>8$; sonuç değişir.', 'Büyüklük değil; izinli noktaların kümesi değişir.'],
        },
      ],
      proof: '$y\\ge1$, $x\\ge y+1$, $x+y\\le6$ (tam sayı). Adaylar: $(2,1),(3,1),(4,1),(5,1),(3,2),(4,2)$; çarpımlar 2, 3, 4, 5, 6, 8. En büyük 8.',
      rule: 'Önce koşulları tam sayı sınırlarına çevir ($<7\\Rightarrow\\le6$), sonra adayları sistemli listele.',
      condition: 'Değişkenler tam sayıysa kesin eşitsizlik bir eksik/fazla sınıra dönüşür. Gerçek sayılarda en büyük değer olmayabilir (yalnız üst sınır).',
      trap: 'Koşullardan birini unutup sınırdaki noktayı almak.',
      transfer: [
        {
          id: 'bolge-yakin', level: 'Yakın alıştırma', text: '$a,b$ doğal sayılar, $a+2b=10$ ve $a>b$ ise $a+b$’nin en küçük değeri kaçtır?',
          options: ['$7$', '$6$', '$10$'], answer: 0,
          hints: ['$a+b=10-b$; $b$ büyüdükçe küçülür.', '$a=10-2b>b\\Rightarrow b<\\tfrac{10}3$.', '$b=3$, $a=4$.'],
          feedback: ['$(4,3)$: 7.', '$b=4$ ise $a=2<b$; $a>b$ bozulur.', '10, $b=0$ iken en büyük değer.'],
        },
        {
          id: 'bolge-say', level: 'Sayım', text: '$x,y$ pozitif tam sayılar, $2x+y=11$ ve $y<x$ ise $x$ kaç farklı değer alır?',
          options: ['$2$', '$3$', '$5$'], answer: 0,
          hints: ['$y=11-2x>0\\Rightarrow x\\le5$.', '$11-2x<x\\Rightarrow x>\\tfrac{11}3$.', '$x=4,5$.'],
          feedback: ['$(4,3)$ ve $(5,1)$.', '$x=3$ ise $y=5>x$; koşul bozulur.', '$y<x$ koşulunu uygula.'],
        },
        {
          id: 'bolge-tek', level: 'Tek değişken, tam sayı', text: '$x$ tam sayı ve $-3<2x+1<6$ ise $x$ kaç farklı değer alır?',
          options: ['$4$', '$5$', '$3$'], answer: 0,
          hints: ['$-4<2x<5$.', '$-2<x<2{,}5$.', '$-1,0,1,2$.'],
          feedback: ['4 tam sayı.', '$-2$ dahil değil; $2(-2)+1=-3$ sınırda.', '2 dahil: $2\\cdot2+1=5<6$.'],
        },
      ],
      real: [
        { code: 'AYT_Sayisal-0042', answer: 'C', from: 'temel-kavramlar', why: 'Asal adayları $20<p(p+2q)<25$ ile ele, sonra $45<r(p+q)<50$.' },
        { code: 'AYT_Sayisal-0033', answer: 'E', from: 'temel-kavramlar', why: 'Rakamlarda $ab<45<bc<50<ac$ zincirini adaylarla tara.' },
      ],
    },
  ],
};
