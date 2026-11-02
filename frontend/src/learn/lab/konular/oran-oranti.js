// Oran ve Orantı laboratuvarı: oranı koruyarak tüketme (yetmeyen bileşen), doğru/ters orantı ve doğrusal ilişkinin
// farkı, oranla paylaştırma, bileşik orantı (birim iş). `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const RECIPE = { lemon: 12, sugar: 10, rl: 3, rs: 2 };
export const POINTS = [[2, 6], [3, 4], [6, 2]];
export const WORK = { workers: 6, days: 8, walls: 4, newWorkers: 9, newWalls: 6 };

export default {
  conceptId: 'oran-oranti',
  title: 'Oran ve Orantı',
  exam: 'TYT + AYT',
  hero: { title: 'Ne ile ne birlikte değişiyor?', text: 'Tarifi koru, tablodan orantıyı tanı, payı birimle böl, işi birim verime indir.', art: ['3 : 2', '=', '12 : 8'] },
  goals: [
    {
      id: 'oran-koru', label: 'Oranı koruma', short: 'Hangisi yetmez, hangisi artar?',
      objective: 'Sabit oranlı karışımda hangi bileşenin sınırlayıcı olduğunu bulur; kullanılanı ve artanı oranı koruyarak hesaplar.',
      misconception: 'Miktarı çok olan bileşenin her zaman artacağını sanmak; oranı farkla (3:2’yi “1 fazla”) yorumlamak.',
      story: 'Bir limonata tarifinde limon suyu ile şeker 3:2 oranında. Elinde 12 bardak limon suyu ve 10 bardak şeker var. Hepsini kullanabilir misin?',
      predict: {
        question: '12 bardak limon suyu ve 10 bardak şekerle 3:2 oranında limonata yapılıyor. Hangisi artar?',
        options: ['Şeker artar.', 'Limon suyu artar.', 'Hiçbiri artmaz.'],
        insight: [
          'Doğru: 12 limona 8 şeker yeter; 2 bardak şeker artar.',
          '10 şekerin hepsi için 15 limon gerekir; 12 limon yetmez, limon tükenir.',
          '$12:10\\neq3:2$; biri mutlaka artar.',
        ],
      },
      experiment: {
        prompt: 'Kullanılacak şekeri seç; oranı koru, eldekini aşma, olabildiğince çok limonata yap.',
        view: 'recipe', visualLabel: 'Eldeki ve kullanılan miktarlar',
        controls: [{ key: 's', label: 'Kullanılan şeker (bardak)', min: 0, max: 10, step: 1 }],
        initial: { s: 10 },
        compute: ({ s }) => { const l = (s * RECIPE.rl) / RECIPE.rs; return { s, l, over: l > RECIPE.lemon, leftL: RECIPE.lemon - l, leftS: RECIPE.sugar - s }; },
        readout: (_, r) => [['Gereken limon', fmt(r.l)], ['Artan limon', r.over ? 'yetmiyor' : fmt(r.leftL)], ['Artan şeker', fmt(r.leftS)]],
        target: {
          text: 'Hedef: oran 3:2, limon yetiyor ve kullanılan en fazla.',
          test: (_, r) => !r.over && r.s === 8,
          example: { s: 8 },
          hint: 'Önce limonun tamamını kullanırsan kaç şeker gerekir? $12\\cdot\\tfrac23$.',
        },
        diagnose: (_, r) => (r.over ? `${r.s} şekere ${fmt(r.l)} limon gerekir; elde 12 var. Limon sınırlayıcı.` : `Limon ${fmt(r.leftL)} bardak artıyor; daha fazla şeker kullanabilirsin.`),
        success: '12 limon ↔ 8 şeker: limon tükendi, 2 şeker arttı.',
      },
      reasons: [
        {
          question: 'Neden şeker artar?',
          options: ['10 şekere 15 limon gerekir ama 12 var; 12 limona 8 şeker yeter.', 'Şeker daha ucuz olduğu için.', 'Oranın küçük sayısı şeker olduğu için.'],
          answer: 0,
          feedback: ['', 'Fiyat değil, oran belirler.', 'Oranın küçük tarafı olmak artmayı belirlemez; elde 20 limon olsaydı limon artardı.'],
        },
        {
          question: '3:2 oranı ne anlatır?',
          options: ['Her 2 birim şekere 3 birim limon; şeker başına 1,5 limon.', 'Limon şekerden 1 birim fazladır.', 'Toplam 5 bardak kullanılır.'],
          answer: 0,
          feedback: ['', 'Oran fark değildir: 12:8’de fark 4.', '5 birim bir kalıptır; toplam herhangi bir 5 katı olabilir.'],
        },
      ],
      proof: 'Oran $l:s=3:2\\iff l=\\tfrac32s$. Kısıt $l\\le12$, $s\\le10$: $s\\le8$. En çok $s=8$, $l=12$; artan şeker $10-8=2$.',
      rule: 'Her bileşenin tek başına kaç “oran kalıbı” yaptığını hesapla ($12/3=4$, $10/2=5$); küçük olan sınırlayıcıdır.',
      condition: 'Oran sabit kalmalı ve bileşenler bölünebilir olmalı. Bileşen sayısı arttıkça her biri için kalıp sayısına bak.',
      trap: 'Çok olan artar sanmak; oranı farkla karıştırmak.',
      transfer: [
        {
          id: 'oran-yakin', level: 'Yakın alıştırma', text: '$\\dfrac ab=\\dfrac35$ ve $a+b=32$ ise $b$ kaçtır?',
          options: ['$20$', '$12$', '$15$'], answer: 0,
          hints: ['$a=3k$, $b=5k$.', '$8k=32$.', '$b=5\\cdot4$.'],
          feedback: ['$a=12$, $b=20$.', '12, $a$’nın değeri; soru $b$’yi soruyor.', '$b=15$ ise $a=9$, toplam 24.'],
        },
        {
          id: 'oran-zincir', level: 'Oran zinciri', text: '$x:y=2:3$ ve $y:z=4:5$ ise $x:z$ nedir?',
          options: ['$8:15$', '$2:5$', '$6:20$'], answer: 0,
          hints: ['Ortak terim $y$: 3 ve 4’ün EKOK’u 12.', '$x:y=8:12$, $y:z=12:15$.', '$x:z=8:15$.'],
          feedback: ['$y$’yi 12’de eşitledin.', 'Oranlar doğrudan birleştirilmez; $y$’yi eşitle.', '$6:20=3:10$; $y$ eşitlenmedi.'],
        },
        {
          id: 'oran-esit', level: 'Eşit oranlar', text: '$\\dfrac a3=\\dfrac b4=\\dfrac c5$ ve $a+b+c=36$ ise $b$ kaçtır?',
          options: ['$12$', '$9$', '$15$'], answer: 0,
          hints: ['Ortak değer $k$: $a=3k$, $b=4k$, $c=5k$.', '$12k=36$.', '$b=4\\cdot3$.'],
          feedback: ['$k=3$.', '9, $a$’nın değeri; soru $b$’yi soruyor.', '15, $c$’nin değeri; soru $b$’yi soruyor.'],
        },
      ],
      real: [
        { code: 'TYT-0702', answer: 'B', from: 'grafik-rutin-olmayan', why: 'İlk imalathanede kullanılan şeker 12, fındık 42: oran 7:2. İkincide şeker sınırlayıcı, artan fındığı bul.' },
        { code: 'TYT-0726', answer: 'E', why: 'Sarı sütunda 4, mavi sütunda 6 fayans; alan oranı 3/4’ten sütun sayılarını bul.' },
      ],
    },
    {
      id: 'dogru-ters', label: 'Doğru / ters orantı', short: 'Bölüm mü sabit, çarpım mı?',
      objective: 'Tablodan sabit bölümü (doğru orantı) ya da sabit çarpımı (ters orantı) tanır; doğrusal ama orantısız ilişkiyi (sabit terimli) ayırır.',
      misconception: '“Biri artınca diğeri de artıyorsa doğru orantılıdır” sanmak (açılış ücretli taksi); ters orantıda farkın sabit olduğunu düşünmek.',
      story: '2 musluk bir havuzu 6 saatte, 3 musluk 4 saatte, 6 musluk 2 saatte dolduruyor. Musluk sayısı ile süre arasında hangi büyüklük değişmiyor?',
      predict: {
        question: 'Musluk sayısı ile dolma süresi nasıl orantılıdır?',
        options: ['Ters orantılı', 'Doğru orantılı', 'Orantılı değil'],
        insight: [
          'Doğru: çarpım sabit, $2\\cdot6=3\\cdot4=6\\cdot2=12$.',
          'Musluk artınca süre azalıyor; bölüm sabit değil.',
          'Çarpım sabit; bu ters orantıdır.',
        ],
      },
      experiment: {
        prompt: 'Modeli ve sabiti seç; eğri üç ölçümün hepsinden geçsin.',
        view: 'proportion', visualLabel: 'Ölçümler ve seçtiğin model',
        controls: [{ key: 'mode', label: 'Model', options: [['dogru', '$y=kx$'], ['ters', '$y=\\tfrac kx$']] }, { key: 'k', label: 'Sabit $k$', min: 1, max: 15, step: 1 }],
        initial: { mode: 'dogru', k: 3 },
        compute: ({ mode, k }) => {
          const f = (x) => (mode === 'dogru' ? k * x : k / x);
          const fits = POINTS.map(([x, y]) => Math.abs(f(x) - y) < 1e-9);
          return { mode, k, fits, all: fits.every(Boolean) };
        },
        readout: (_, r) => POINTS.map(([x, y], i) => [`${x} musluk`, `${y} saat ${r.fits[i] ? '✓' : '✗'}`]),
        target: {
          text: 'Hedef: üç ölçüm de modelde.',
          test: (_, r) => r.all,
          example: { mode: 'ters', k: 12 },
          hint: 'Her ölçümde $y/x$’i ve $x\\cdot y$’yi hesapla; hangisi hep aynı?',
        },
        diagnose: ({ mode }, r) => (mode === 'dogru' ? `$y/x$: ${POINTS.map(([x, y]) => fmt(y / x, 2)).join(', ')} — sabit değil, doğru orantı olamaz.` : `$x\\cdot y$ = 12 her ölçümde; $k=${r.k}$ ile ${r.fits.filter(Boolean).length} ölçüm uyuyor.`),
        success: '$xy=12$: ters orantı. 12 “musluk-saat” iş.',
      },
      reasons: [
        {
          question: 'Neden ters orantı?',
          options: ['Çarpım sabit: $2\\cdot6=3\\cdot4=12$ musluk-saatlik iş.', 'Biri artınca diğeri azaldığı için her azalma ters orantıdır.', 'Sayılar küçüldüğü için.'],
          answer: 0,
          feedback: ['', '$y=10-x$ de azalır ama çarpım sabit değil; ters orantı değildir.', 'Ölçek değil, sabit kalan büyüklük önemli.'],
        },
        {
          question: 'Doğru orantıda sabit kalan nedir?',
          options: ['Bölüm $y/x$; grafik orijinden geçen doğru.', 'Fark $y-x$.', 'Toplam $x+y$.'],
          answer: 0,
          feedback: ['', 'Sabit fark doğrusal ilişki olabilir ama orantı değildir.', 'Sabit toplam ters yönlü doğrusal ilişkidir.'],
        },
      ],
      proof: 'Doğru orantı: $y=kx$, $y/x=k$. Ters orantı: $y=k/x$, $xy=k$. Tablodaki $xy$ değerleri 12, 12, 12; $y/x$ değerleri 3, 1,33, 0,33. Doğrusal $y=ax+b$ ($b\\neq0$) ilişkide ne bölüm ne çarpım sabittir.',
      rule: 'Doğru orantı: bölüm sabit; ters orantı: çarpım sabit. Sabit terim varsa ($y=ax+b$) orantı değildir, önce sabit terimi çıkar.',
      condition: 'Değişkenler sıfırdan farklı ve aynı birimde ölçülmeli. Grafiği orijinden geçmeyen doğru, doğru orantı değildir.',
      trap: 'Açılış ücretli tarifeyi doğru orantılı sanıp ölçeklemek.',
      transfer: [
        {
          id: 'dt-isci', level: 'Yakın alıştırma', text: '8 işçi bir işi 15 günde bitiriyor. Aynı hızda 12 işçi kaç günde bitirir?',
          options: ['$10$', '$22{,}5$', '$12$'], answer: 0,
          hints: ['İş = işçi × gün sabit.', '$8\\cdot15=120$.', '$120/12$.'],
          feedback: ['$12\\cdot10=120$.', 'Doğru orantı kurdun; işçi artınca süre azalır.', '12 işçi sayısı; gün sayısı değil.'],
        },
        {
          id: 'dt-hiz', level: 'Farklı bağlam', text: 'Bir araç bir yolu 60 km/sa hızla 5 saatte alıyor. 75 km/sa hızla kaç saatte alır?',
          options: ['$4$', '$6{,}25$', '$3$'], answer: 0,
          hints: ['Yol = hız × süre sabit.', '$60\\cdot5=300$.', '$300/75$.'],
          feedback: ['$75\\cdot4=300$.', 'Hız artınca süre artmaz.', '$75\\cdot3=225\\neq300$.'],
        },
        {
          id: 'dt-taksi', level: 'Doğrusal ≠ orantılı', text: 'Taksi açılışı 20 TL, kilometre başına 10 TL. 2 km 40 TL tutuyorsa 4 km kaç TL tutar?',
          options: ['$60$', '$80$', '$40$'], answer: 0,
          hints: ['Ücret $=20+10x$.', 'Açılış ücreti iki katına çıkmaz.', '$20+40$.'],
          feedback: ['$20+10\\cdot4=60$.', 'Doğru orantı kurdun; açılış ücreti sabit.', 'Kilometre arttı; ücret de artmalı.'],
        },
      ],
      real: [
        { code: 'TYT-0652', answer: 'A', from: 'grafik-rutin-olmayan', why: 'Numara standartları doğrusal ama orantılı değil: $(7,34)$’ten $(13,46)$’ya her birim 2 artış.' },
        { code: 'TYT-0715', answer: 'B', from: 'grafik-rutin-olmayan', why: 'Otobüs uçağın 6 katı; tren ve uçak toplam ücretleri eşit: kişi sayısı ücretle ters orantılı.' },
      ],
    },
    {
      id: 'paylastirma', label: 'Paylaştırma', short: 'Toplam ÷ toplam pay = bir birim',
      objective: 'Bir toplamı verilen oranda (doğru ya da ters) paylaştırır; bir birimi bulup her payı hesaplar, ek koşulla birimi belirler.',
      misconception: 'Toplamı oran sayısına (3 kişi) bölmek; ters orantılı paylaşımı doğrudan $2:3:6$ almak.',
      story: 'Üç arkadaş bir yarışmada 120 TL kazandı; katkılarına göre 2:3:5 oranında paylaşacaklar. Herkes kaç TL alır?',
      predict: {
        question: '120 TL 2:3:5 oranında paylaştırılırsa en büyük pay kaç TL olur?',
        options: ['$60$', '$40$', '$50$'],
        insight: [
          'Doğru: 10 birim, bir birim 12; $5\\cdot12=60$.',
          '120’yi 3 kişiye eşit bölmek oranı yok sayar.',
          '50, payı 5 değil 10 birimden hesaplamak gibi; bir birim 12.',
        ],
      },
      experiment: {
        prompt: 'Bir birimin değerini seç; paylar toplamı 120 TL olsun.',
        view: 'shares', visualLabel: '2 : 3 : 5 birimlik şeritler',
        controls: [{ key: 'u', label: 'Bir birim (TL)', min: 1, max: 20, step: 1 }],
        initial: { u: 10 },
        compute: ({ u }) => ({ u, shares: [2 * u, 3 * u, 5 * u], total: 10 * u }),
        readout: (_, r) => [['Paylar', r.shares.join(' · ')], ['Toplam', `${r.total} TL`]],
        target: {
          text: 'Hedef: toplam 120 TL.',
          test: (_, r) => r.total === 120,
          example: { u: 12 },
          hint: 'Toplam kaç birim? $2+3+5$.',
        },
        diagnose: (_, r) => `Toplam ${r.total} TL; 10 birim × ${r.u}. 120 için bir birim ${r.total < 120 ? 'büyümeli' : 'küçülmeli'}.`,
        success: 'Bir birim 12 TL: 24, 36, 60.',
      },
      reasons: [
        {
          question: 'Bir birim neden 12?',
          options: ['Toplam $2+3+5=10$ birim; $120/10=12$.', '$120/3=40$, sonra $40/3$.', 'En büyük pay 5 olduğu için $120/5$.'],
          answer: 0,
          feedback: ['', 'Kişi sayısına bölmek oranı yok sayar.', '$120/5=24$ bir kişinin payı değil.'],
        },
        {
          question: 'Ters orantılı paylaşımda (2, 3, 6 ile ters) oran nedir?',
          options: ['$\\tfrac12:\\tfrac13:\\tfrac16=3:2:1$', '$2:3:6$', '$6:3:2$'],
          answer: 0,
          feedback: ['', '$2:3:6$ doğru orantıdır; büyük yaşa büyük pay verir.', '$6:3:2$ yalnız sırayı ters çevirir; $\\tfrac12:\\tfrac13:\\tfrac16$’yı 6 ile çarp.'],
        },
      ],
      proof: 'Paylar $2u,3u,5u$; toplam $10u=120\\Rightarrow u=12$. Ters orantıda paylar $\\tfrac k2,\\tfrac k3,\\tfrac k6$; paydaların EKOK’u 6 ile çarpınca $3:2:1$.',
      rule: 'Bir birim = toplam ÷ oran toplamı; pay = oran × bir birim. Ters orantıda önce oranları ters çevir, EKOK ile tam sayıya getir.',
      condition: 'Paylaşılan miktar tam olarak dağıtılmalı. Ek koşul (fark, artış) varsa birimi o koşuldan bul.',
      trap: 'Kişi sayısına eşit bölmek; ters orantıyı ters sıralama sanmak.',
      transfer: [
        {
          id: 'pay-fark', level: 'Farktan birim', text: '$a:b:c=2:3:4$ ve $c-a=10$ ise $a+b+c$ kaçtır?',
          options: ['$45$', '$90$', '$30$'], answer: 0,
          hints: ['$c-a=2$ birim.', 'Bir birim 5.', '$9\\cdot5$.'],
          feedback: ['$10,15,20$.', 'Bir birim 10 değil 5.', '$30=6$ birim; toplam 9 birim.'],
        },
        {
          id: 'pay-ters', level: 'Ters orantılı', text: '2, 3 ve 6 yaşındaki çocuklara yaşlarıyla ters orantılı 60 şeker dağıtılıyor. En küçük çocuk kaç şeker alır?',
          options: ['$30$', '$10$', '$20$'], answer: 0,
          hints: ['Oran $\\tfrac12:\\tfrac13:\\tfrac16=3:2:1$.', '6 birim, bir birim 10.', 'En küçük çocuk 3 birim.'],
          feedback: ['En küçük yaş en çok payı alır.', '10, en büyük çocuğun payı.', '20, ortanca yaştaki çocuğun payı.'],
        },
        {
          id: 'pay-degisim', level: 'Değişen oran', text: 'Bir sınıfta kız:erkek $=3:4$. Sınıfa 6 kız katılınca oran $1:1$ oluyor. Başta sınıfta kaç öğrenci vardı?',
          options: ['$42$', '$36$', '$48$'], answer: 0,
          hints: ['Kız $3k$, erkek $4k$.', '$3k+6=4k$.', '$k=6$, toplam $7k$.'],
          feedback: ['18 kız, 24 erkek.', '$k=6$ ama toplam $7k$.', '6 kız eklenmiş hâli 48.'],
        },
      ],
      real: [
        { code: 'TYT-0707', answer: 'C', from: 'grafik-rutin-olmayan', why: 'İlk iki sefer 4:5 → $4k$, $5k$; üçüncü $91-9k$; her sefer 20–35 aralığında olmalı.' },
      ],
    },
    {
      id: 'bilesik', label: 'Bileşik orantı', short: 'Birim işe in',
      objective: 'Birden çok niceliğin birlikte değiştiği işi birim verime (işçi-gün, makine-saat) indirerek çözer; hangi niceliğin doğru, hangisinin ters orantılı olduğunu ayırır.',
      misconception: 'Bütün oranları aynı yönde çarpmak; birim işi bulmadan orantı kurmak.',
      story: '6 usta 8 günde 4 duvar örüyor. Yeni bir şantiyede 9 usta 6 duvar örecek. Kaç gün sürer?',
      predict: {
        question: '6 işçi 8 günde 4 duvar örüyor. Aynı hızda 9 işçi 6 duvarı kaç günde örer?',
        options: ['$8$', '$12$', '$6$'],
        insight: [
          'Doğru: bir duvar 12 işçi-gün; 6 duvar 72; $72/9=8$.',
          '12, yalnız duvar artışını hesaba katar; işçi de arttı.',
          '6, yalnız işçi artışını hesaba katar; duvar da arttı.',
        ],
      },
      experiment: {
        prompt: 'Gün sayısını seç; 9 işçi 6 duvarı tam bitirsin.',
        view: 'workgrid', visualLabel: 'İşçi-gün kareleri: 12 kare = 1 duvar',
        controls: [{ key: 'd', label: 'Gün', min: 1, max: 16, step: 1 }],
        initial: { d: 12 },
        compute: ({ d }) => { const unit = (WORK.workers * WORK.days) / WORK.walls; const done = (WORK.newWorkers * d) / unit; return { d, unit, cells: WORK.newWorkers * d, done }; },
        readout: (_, r) => [['Bir duvar', `${r.unit} işçi-gün`], ['Yapılan iş', `${r.cells} işçi-gün = ${fmt(r.done, 2)} duvar`]],
        target: {
          text: 'Hedef: tam 6 duvar.',
          test: (_, r) => r.done === WORK.newWalls,
          example: { d: 8 },
          hint: '6 duvar kaç işçi-gün? 9 işçiyle kaç gün?',
        },
        diagnose: (_, r) => `${r.d} günde ${fmt(r.done, 2)} duvar; ${r.done < 6 ? 'eksik' : 'fazla'}.`,
        success: '$9\\cdot8=72=6\\cdot12$ işçi-gün.',
      },
      reasons: [
        {
          question: 'Birim iş nedir?',
          options: ['Bir duvar $\\tfrac{6\\cdot8}4=12$ işçi-gün.', 'Bir duvar 8 gün.', 'Bir işçi 4 duvar.'],
          answer: 0,
          feedback: ['', '8 gün 6 işçiyle 4 duvarın süresi; tek duvar için değil.', 'Bir işçi 8 günde $\\tfrac46$ duvar örer.'],
        },
        {
          question: 'İşçi sayısı ve duvar sayısı gün sayısını nasıl etkiler?',
          options: ['Gün, duvarla doğru; işçiyle ters orantılı.', 'İkisiyle de doğru orantılı.', 'İkisiyle de ters orantılı.'],
          answer: 0,
          feedback: ['', 'İşçi artınca gün azalır.', 'Duvar artınca gün artar.'],
        },
      ],
      proof: 'İş = işçi × gün (aynı verimle). $6\\cdot8=48$ işçi-gün 4 duvar → 12 işçi-gün/duvar. $9\\cdot d=6\\cdot12\\Rightarrow d=8$. Kısaca $d=8\\cdot\\tfrac69\\cdot\\tfrac64$.',
      rule: 'Önce birim işi bul (işçi-gün, makine-saat); sonra yeni durumda toplam işi böl.',
      condition: 'Verim sabit olmalı. Verim farklıysa (usta–çırak) önce verimleri eşitle.',
      trap: 'Bütün çarpanları aynı yönde (hep doğru) almak.',
      transfer: [
        {
          id: 'bil-makine', level: 'Yakın alıştırma', text: '5 makine 6 saatte 300 parça üretiyor. 8 makine 4 saatte kaç parça üretir?',
          options: ['$320$', '$400$', '$240$'], answer: 0,
          hints: ['Bir makine-saat kaç parça?', '$300/30=10$.', '$8\\cdot4\\cdot10$.'],
          feedback: ['32 makine-saat × 10.', 'Saat azaldı; yalnız makine artışını kullandın.', 'Makine artışını unuttun.'],
        },
        {
          id: 'bil-musluk', level: 'Ara değişim', text: '4 musluk bir havuzu 9 saatte dolduruyor. 3 musluk 4 saat açık kalıyor, sonra bir musluk daha açılıyor. Havuz toplam kaç saatte dolar?',
          options: ['$10$', '$12$', '$9$'], answer: 0,
          hints: ['Havuz 36 musluk-saat.', 'İlk 4 saatte 12.', 'Kalan 24, 4 muslukla 6 saat.'],
          feedback: ['$4+6=10$.', '12, 3 muslukla tüm havuz.', '9, baştan 4 musluk olsaydı.'],
        },
        {
          id: 'bil-disli', level: 'Ters orantı (dişli)', text: '20 dişli bir çark 15 tur attığında ona bağlı 12 dişli çark kaç tur atar?',
          options: ['$25$', '$9$', '$18$'], answer: 0,
          hints: ['Geçen diş sayısı aynı.', '$20\\cdot15=300$.', '$300/12$.'],
          feedback: ['Diş × tur sabit.', 'Doğru orantı kurdun; küçük çark daha çok döner.', '$12\\cdot18=216\\neq300$; geçen diş sayısı eşit olmalı.'],
        },
      ],
      realNote: 'Kategorinin görseli okunmuş sorularında bileşik orantı isteyen uygun soru (TYT-0740) derste çözüldü. Aktarım özgün alıştırmalarla yapılır.',
    },
  ],
};
