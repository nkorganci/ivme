// Yaş, İşçi ve Havuz Problemleri laboratuvarı: yaş farkının sabitliği, grup yaş toplamının artışı, iş hızlarının
// toplanması, farklı verimle birim iş. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const AGES = { mother: 34, child: 10 };
export const RATES = { a: 6, b: 12 };
export const CREW = { job: 24, masterRate: 2, hours: 4 };

export default {
  conceptId: 'yas-isci-problemleri',
  title: 'Yaş, İşçi ve Havuz Problemleri',
  exam: 'TYT + AYT',
  hero: { title: 'Zaman herkes için akar', text: 'Yaş farkı değişmez, toplam kişi sayısı kadar artar; işte süreler değil hızlar toplanır.', art: ['+1 yıl', '=', '+1 yıl'] },
  goals: [
    {
      id: 'yas-fark', label: 'Yaş farkı', short: 'Fark sabit, oran değişir',
      objective: 'Zaman çizgisinde yaşları ilerletip geriletir; yaş farkının sabit, yaş oranının değişken olduğunu kullanarak denklem kurar.',
      misconception: 'Yaş oranının sabit kaldığını sanmak; geçen yılı yalnız bir kişiye eklemek.',
      story: 'Anne 34, kızı 10 yaşında. Kız “Bir gün annemin yarı yaşında olacağım” diyor. Ne zaman? Yoksa hiç mi?',
      predict: {
        question: 'Anne 34, kızı 10 yaşında. Kaç yıl sonra annenin yaşı kızınınkinin 2 katı olur?',
        options: ['$14$', '$7$', 'Hiçbir zaman'],
        insight: [
          'Doğru: 48 ve 24. Fark 24 hep aynı; kızın yaşı farka eşit olunca oran 2 olur.',
          '7 yıl sonra 41 ve 17; oran 2 değil.',
          'Oran değişiyor (3,4 → 2,4 → 2); fark sabit kaldığı için bir gün 2 olur.',
        ],
      },
      experiment: {
        prompt: 'Zamanı kaydır; annenin yaşı kızınınkinin tam 2 katı olsun.',
        view: 'ages', visualLabel: 'Yaş çubukları: fark sabit',
        controls: [{ key: 't', label: 'Kaç yıl sonra (eksi: önce)', min: -10, max: 30, step: 1 }],
        initial: { t: 7 },
        compute: ({ t }) => { const m = AGES.mother + t, c = AGES.child + t; return { t, m, c, diff: m - c, ratio: c > 0 ? m / c : null }; },
        readout: (_, r) => [['Anne', r.m], ['Kız', r.c > 0 ? r.c : 'doğmamış'], ['Fark', r.diff], ['Oran', r.ratio ? fmt(r.ratio, 2) : '—']],
        target: { text: 'Hedef: anne = 2 × kız.', test: (_, r) => r.ratio === 2, example: { t: 14 }, hint: 'Fark 24 hiç değişmiyor. Anne kızın 2 katıysa kız kaç yaşında olmalı?' },
        diagnose: (_, r) => (r.c <= 0 ? 'Kız henüz doğmamış.' : `Oran ${fmt(r.ratio, 2)}; fark ${r.diff}. Oran ${r.ratio > 2 ? 'büyük, zamanı ileri al' : 'küçük, geri al'}.`),
        success: 'Kız 24 (= fark) olunca anne 48: oran 2.',
      },
      reasons: [
        {
          question: 'Yaş farkı neden sabit?',
          options: ['Her yıl ikisi de 1 yaş büyür; fark değişmez.', 'Annelerle çocuklar arasındaki fark hep 24’tür.', 'Fark oranla birlikte azalır.'],
          answer: 0,
          feedback: ['', 'Bu ailede 24; sabit olmasının nedeni ikisine aynı yılın eklenmesi.', 'Oran azalır ama fark aynı kalır.'],
        },
        {
          question: 'Anne kızın 2 katıyken kız neden 24 yaşındadır?',
          options: ['$a=2k$ ve $a-k=24$ ise $k=24$.', 'Annenin yaşının yarısı her zaman 24’tür.', '$34-10=24$ olduğu için şimdi 24’tür.'],
          answer: 0,
          feedback: ['', 'Annenin yaşı değişiyor; yarısı sabit değil.', 'Şimdi kız 10 yaşında; 24 fark.'],
        },
      ],
      proof: '$t$ yıl sonra $34+t$ ve $10+t$; fark $24$ sabit. $34+t=2(10+t)\\Rightarrow t=14$. Genel: oran $n$ olunca küçük yaş $\\tfrac{\\text{fark}}{n-1}$.',
      rule: 'Yaş farkı sabittir; $n$ katı olduğu an küçüğün yaşı $\\text{fark}/(n-1)$.',
      condition: 'Herkes aynı süreyi yaşar; doğmamış kişi (negatif yaş) olamaz.',
      trap: 'Oranı sabit sanmak; yılı yalnız bir kişiye eklemek.',
      transfer: [
        {
          id: 'yf-yakin', level: 'Yakın alıştırma', text: 'Baba 40, oğlu 12 yaşında. Kaç yıl önce baba oğlunun 5 katı yaşındaydı?',
          options: ['$5$', '$4$', '$8$'], answer: 0,
          hints: ['Fark 28.', 'Oğul $28/4=7$ yaşındaydı.', '$12-7$.'],
          feedback: ['35 ve 7.', '4 yıl önce 36 ve 8; oran 4,5.', '8 yıl önce 32 ve 4; oran 8.'],
        },
        {
          id: 'yf-dogum', level: 'Yıl–yaş çevirme', text: 'Ahmet 1990’da doğdu. Kardeşi doğduğunda Ahmet 6 yaşındaydı. 2025’te yaşları toplamı kaçtır?',
          options: ['$64$', '$70$', '$58$'], answer: 0,
          hints: ['Ahmet 2025’te 35.', 'Kardeş 1996’da doğdu: 29.', '$35+29$.'],
          feedback: ['$35+29=64$.', '6 yıl fark eklenmiş: iki kardeş de 35 sayıldı.', 'Fark iki kez çıkarıldı.'],
        },
        {
          id: 'yf-oran', level: 'Oranın değişimi', text: 'Bugün Ece’nin yaşı Can’ın 3 katı; 10 yıl sonra 2 katı olacak. Can bugün kaç yaşında?',
          options: ['$10$', '$5$', '$20$'], answer: 0,
          hints: ['Can $c$, Ece $3c$; fark $2c$.', '10 yıl sonra Can $c+10$ ve $2c=c+10$.', '$c=10$.'],
          feedback: ['10 ve 30 → 20 ve 40.', '5 ve 15 → 15 ve 25; oran 2 değil.', 'Ece 20 olsaydı Can 6,7 olurdu.'],
        },
      ],
      real: [
        { code: 'TYT-0714', answer: 'E', why: 'Restoranın kuruluşu ve 40. yılı: dedenin ve torunun doğum yıllarını bul, 2022’ye taşı.' },
      ],
    },
    {
      id: 'grup-toplam', label: 'Yaş toplamı', short: 't yılda toplam kişi × t artar',
      objective: 'Bir grubun yaş toplamının $t$ yılda kişi sayısı × $t$ kadar arttığını kullanır; ortalama ve yeni katılımla toplamı ilişkilendirir.',
      misconception: 'Toplamın da yalnız $t$ kadar arttığını sanmak; ortalamaya yeni kişiyi eklerken eski toplamı unutmak.',
      story: 'Bir ailenin yaşları toplamı bugün 80. Dört yıl sonra 100 olacak. Ailede kaç kişi var?',
      predict: {
        question: 'Bir ailenin yaşları toplamı 80, 4 yıl sonra 100 olacak. Ailede kaç kişi var (bu sürede doğum yok)?',
        options: ['$5$', '$4$', '$20$'],
        insight: [
          'Doğru: her kişi 4 yaş büyür; artış $5\\cdot4=20$.',
          '4 yıl; kişi sayısı değil.',
          '20 toplam artış; kişi başına 4.',
        ],
      },
      experiment: {
        prompt: 'Kişi sayısını seç; 4 yılda toplam tam 20 artsın.',
        view: 'family', visualLabel: 'Her kişiye 4 yıl eklenir',
        controls: [{ key: 'k', label: 'Kişi sayısı', min: 2, max: 8, step: 1 }],
        initial: { k: 4 },
        compute: ({ k }) => ({ k, inc: 4 * k, later: 80 + 4 * k }),
        readout: (_, r) => [['Artış', `${r.k} × 4 = ${r.inc}`], ['4 yıl sonra', r.later]],
        target: { text: 'Hedef: 4 yıl sonra toplam 100.', test: (_, r) => r.later === 100, example: { k: 5 }, hint: 'Artış 20; her kişi 4 ekliyor.' },
        diagnose: (_, r) => `${r.k} kişi → artış ${r.inc}; toplam ${r.later}.`,
        success: '$5\\times4=20$: 5 kişi.',
      },
      reasons: [
        {
          question: 'Toplam neden 20 artar?',
          options: ['Her kişi 4 yaş büyür: $5\\cdot4$.', 'Toplam her yıl 5 artar.', 'Aile büyüdüğü için.'],
          answer: 0,
          feedback: ['', 'Yılda kişi sayısı kadar (5) artar; 4 yılda 20.', 'Doğum yok; yalnız herkes yaşlanıyor.'],
        },
        {
          question: 'Bu sürede bir bebek doğsaydı?',
          options: ['Bebek yalnız doğduktan sonraki yılları ekler; artış $5t$ formülünden sapar.', 'Hiçbir şey değişmez.', 'Toplam 4 azalır.'],
          answer: 0,
          feedback: ['', 'Yeni kişi yeni bir terim ekler.', 'Doğum toplamı azaltmaz.'],
        },
      ],
      proof: '$k$ kişinin her biri $t$ yılda $t$ yaş büyür; toplam $kt$ artar. $80+4k=100\\Rightarrow k=5$. Ortalamada: toplam = ortalama × kişi.',
      rule: 'Toplamın artışı = kişi sayısı × geçen yıl; ortalama sorularında önce toplama çevir.',
      condition: 'Grup değişmemeli (doğum, katılım yoksa). Değişirse eklenen kişinin yaşı ayrıca eklenir.',
      trap: 'Toplama yalnız $t$ eklemek.',
      transfer: [
        {
          id: 'gt-yakin', level: 'Yakın alıştırma', text: '3 kardeşin yaşları toplamı 30. 4 yıl sonra toplam kaç olur?',
          options: ['$42$', '$34$', '$38$'], answer: 0,
          hints: ['Her kardeş 4 yaş büyür.', '$3\\cdot4=12$.', '$30+12$.'],
          feedback: ['$30+12$.', 'Toplama yalnız 4 ekledin.', 'İki kardeşi saydın; üçü de 4 yaş büyür.'],
        },
        {
          id: 'gt-ortalama', level: 'Ortalama', text: '20 öğrencinin yaş ortalaması 15. Öğretmen katılınca ortalama 16 oluyor. Öğretmen kaç yaşında?',
          options: ['$36$', '$31$', '$16$'], answer: 0,
          hints: ['Öğrenci toplamı 300.', 'Yeni toplam $21\\cdot16=336$.', 'Fark 36.'],
          feedback: ['$336-300$.', '$15+16$ toplama değil, ortalama.', '16 yeni ortalama; öğretmenin yaşı toplam farkıdır.'],
        },
        {
          id: 'gt-aile', level: 'İki grup', text: 'Anne ile babanın yaşları toplamı 70, iki çocuğunki 14. Kaç yıl sonra ebeveynlerin toplamı çocuklarınkinin 2 katı olur?',
          options: ['$21$', '$14$', '$42$'], answer: 0,
          hints: ['Her grup yılda 2 artar.', '$70+2t=2(14+2t)$.', '$t=21$.'],
          feedback: ['112 ve 56.', '14 yıl sonra 98 ve 42.', '42, $2t$’nin değeri; $t$ değil.'],
        },
      ],
      real: [
        { code: 'TYT-0699', answer: 'C', why: 'Evin yaşı her yıl 1 artar: 1990, 2000 ve 2020’deki yaşları kişilerin bugünkü yaşlarıyla eşleştir.' },
      ],
    },
    {
      id: 'is-hiz', label: 'Birlikte çalışma', short: 'Hızlar toplanır, süreler değil',
      objective: 'Tek başına sürelerden saatlik iş hızlarını bulur, birlikte/zıt (gider) çalışmada hızları toplar ya da çıkarır.',
      misconception: 'Süreleri toplamak ya da ortalamasını almak; giderin etkisini toplamak.',
      story: 'A musluğu havuzu 6, B musluğu 12 saatte dolduruyor. İkisi birlikte açılırsa havuz ne zaman dolar?',
      predict: {
        question: 'A işi 6 saatte, B 12 saatte bitiriyor. Birlikte kaç saatte bitirirler?',
        options: ['$4$', '$9$', '$18$'],
        insight: [
          'Doğru: saatte $\\tfrac16+\\tfrac1{12}=\\tfrac14$.',
          'Ortalama süre; birlikte çalışınca A’dan da hızlı biter.',
          'Süreler toplanmaz; birlikte çalışmak süreyi kısaltır.',
        ],
      },
      experiment: {
        prompt: 'Süreyi seç; iki musluk birlikte havuzu tam doldursun.',
        view: 'tank', visualLabel: 'Havuz: A ve B’nin katkısı',
        controls: [{ key: 't', label: 'Saat', min: 0.5, max: 12, step: 0.5, format: (v) => fmt(v, 1) }],
        initial: { t: 9 },
        compute: ({ t }) => ({ t, a: t / RATES.a, b: t / RATES.b, fill: t / RATES.a + t / RATES.b }),
        readout: (_, r) => [['A’nın payı', fmt(r.a, 2)], ['B’nin payı', fmt(r.b, 2)], ['Dolu', `%${fmt(r.fill * 100, 0)}`]],
        target: { text: 'Hedef: havuz tam dolu (%100).', test: (_, r) => Math.abs(r.fill - 1) < 1e-9, example: { t: 4 }, hint: 'Saatte kaç havuz doluyor? $\\tfrac16+\\tfrac1{12}$.' },
        diagnose: (_, r) => `${fmt(r.t, 1)} saatte havuzun %${fmt(r.fill * 100, 0)}’i: ${r.fill > 1 ? 'taşıyor' : 'eksik'}.`,
        success: '$4\\cdot\\tfrac14=1$ havuz.',
      },
      reasons: [
        {
          question: 'Neden hızlar toplanır?',
          options: ['Saatte A $\\tfrac16$, B $\\tfrac1{12}$ havuz doldurur; aynı saatte ikisinin işi eklenir.', 'Süreler toplanır, sonra ikiye bölünür.', 'Büyük süre geçerlidir.'],
          answer: 0,
          feedback: ['', 'Ortalama 9 saat A’nın tek başına süresinden bile uzun; mantıksız.', 'Yavaş musluk süreyi belirlemez; hızlıya yardım eder.'],
        },
        {
          question: 'Birlikte süre neden en hızlıdan da kısa?',
          options: ['İki kaynak aynı anda çalışınca birim zamanda daha çok iş yapılır.', 'Kısa değildir.', 'Tesadüf.'],
          answer: 0,
          feedback: ['', '4 < 6: deneyde gördün.', 'Hızlar pozitifse her zaman kısa olur.'],
        },
      ],
      proof: 'Hızlar $\\tfrac1{t_A}$, $\\tfrac1{t_B}$. Birlikte $\\tfrac1{t}=\\tfrac16+\\tfrac1{12}=\\tfrac14$, $t=4$. Gider varsa hızı çıkarılır.',
      rule: '$\\dfrac1t=\\dfrac1{t_A}\\pm\\dfrac1{t_B}$ (gider/boşaltan için eksi).',
      condition: 'Hızlar sabit ve iş bölünebilir olmalı. Kısmi çalışmada her kişinin çalıştığı süre ayrı çarpılır.',
      trap: 'Süreleri toplamak ya da ortalamak.',
      transfer: [
        {
          id: 'ih-gider', level: 'Gider', text: 'Bir musluk havuzu 4 saatte dolduruyor, gider 12 saatte boşaltıyor. İkisi açıkken havuz kaç saatte dolar?',
          options: ['$6$', '$3$', '$8$'], answer: 0,
          hints: ['$\\tfrac14-\\tfrac1{12}$.', '$\\tfrac16$.', '6 saat.'],
          feedback: ['Saatte $\\tfrac16$.', 'Gideri ekledin; çıkarmalısın.', '$12-4$: süreler çıkarılmaz.'],
        },
        {
          id: 'ih-ters', level: 'Ters yön', text: 'A ve B birlikte bir işi 6 günde, A yalnız 10 günde bitiriyor. B yalnız kaç günde bitirir?',
          options: ['$15$', '$4$', '$16$'], answer: 0,
          hints: ['$\\tfrac16-\\tfrac1{10}$.', '$\\tfrac1{15}$.', '15.'],
          feedback: ['$\\tfrac1{10}+\\tfrac1{15}=\\tfrac16$.', '$10-6$: süreler çıkarılmaz.', '$6+10$: süreler toplanmaz, hızlar çıkarılır.'],
        },
        {
          id: 'ih-kismi', level: 'Kısmi çalışma', text: 'A bir işi yalnız 8, B yalnız 12 saatte bitiriyor. A 2 saat çalışıp ayrılıyor, kalanı B bitiriyor. B kaç saat çalışır?',
          options: ['$9$', '$10$', '$6$'], answer: 0,
          hints: ['A 2 saatte $\\tfrac28=\\tfrac14$.', 'Kalan $\\tfrac34$.', '$\\tfrac34\\cdot12$.'],
          feedback: ['$\\tfrac14+\\tfrac9{12}=1$.', '$12-2$: A’nın payı iş oranıyla düşülür.', '6 saat B için işin yarısı; kalan $\\tfrac34$.'],
        },
      ],
      realNote: 'Problem kategorisinin görseli okunan 50’yi aşkın sorusunda derste çözülmemiş işçi/havuz hızı sorusu bulunmadı; aktarım özgün alıştırmalarla yapılır.',
    },
    {
      id: 'verim', label: 'Farklı verim', short: 'Ustayı çırak cinsinden say',
      objective: 'Farklı verimdeki çalışanları ortak birime (çırak-saat) çevirip toplam işi ve gereken kişi/süreyi bulur.',
      misconception: 'Kişi sayısını verime bakmadan eşit saymak.',
      story: 'Bir usta, çırağın iki katı hızlı çalışıyor. Bir çırak işi 24 saatte bitiriyor. 4 saatte bitirmek için ustanın yanına kaç çırak gerekir?',
      predict: {
        question: 'Usta çırağın 2 katı hızlı. Bir çırak işi 24 saatte bitiriyor. Usta ile birlikte kaç çırak işi 4 saatte bitirir?',
        options: ['$4$', '$6$', '$5$'],
        insight: [
          'Doğru: iş 24 çırak-saat; saatte $2+4=6$ çırak gücü.',
          '6 çırak ustasız gerekendir; usta 2 çırak sayılır.',
          '5 çırakla güç 7; iş $24/7\\approx3{,}4$ saatte biter, tam 4 saat için 4 çırak yeter.',
        ],
      },
      experiment: {
        prompt: 'Çırak sayısını seç; usta ile birlikte iş tam 4 saatte bitsin.',
        view: 'crew', visualLabel: 'Ekip: usta 2 birim, çırak 1 birim',
        controls: [{ key: 'k', label: 'Çırak sayısı', min: 0, max: 8, step: 1 }],
        initial: { k: 6 },
        compute: ({ k }) => { const power = CREW.masterRate + k; return { k, power, time: CREW.job / power }; },
        readout: (_, r) => [['Ekip gücü', `${r.power} çırak/saat`], ['Süre', `${fmt(r.time, 2)} saat`]],
        target: { text: 'Hedef: tam 4 saat.', test: (_, r) => Math.abs(r.time - CREW.hours) < 1e-9, example: { k: 4 }, hint: '24 çırak-saat iş 4 saatte: saatte 6 çırak gücü gerekir.' },
        diagnose: (_, r) => `${r.power} çırak gücüyle ${fmt(r.time, 2)} saat; ${r.time > 4 ? 'uzun' : 'kısa'}. Usta 2 çırak sayılır.`,
        success: '$(2+4)\\cdot4=24$ çırak-saat.',
      },
      reasons: [
        {
          question: 'Usta neden 2 çırak sayılır?',
          options: ['Birim zamanda iki çırak kadar iş yapar.', 'Ustanın maaşı iki katı olduğu için.', 'Usta işi yarı sürede başlar.'],
          answer: 0,
          feedback: ['', 'Ücret değil, iş hızı.', 'Başlama zamanı değil, hız önemli.'],
        },
        {
          question: 'İşin büyüklüğü hangi birimle ölçülür?',
          options: ['24 çırak-saat.', '24 saat.', '1 usta.'],
          answer: 0,
          feedback: ['', 'Saat tek başına iş değildir; kişi ile çarpılır.', 'Usta bir çalışan; iş birimi değil.'],
        },
      ],
      proof: 'Çırak hızı $\\tfrac1{24}$ iş/saat, usta $\\tfrac2{24}$. $(2+k)\\cdot\\tfrac4{24}=1\\Rightarrow k=4$.',
      rule: 'Herkesi ortak verim birimine çevir; iş = toplam güç × süre.',
      condition: 'Verimler sabit olmalı; verim yüzde değişirse güç de aynı oranda değişir.',
      trap: 'Ustayı bir kişi saymak.',
      transfer: [
        {
          id: 've-yakin', level: 'Yakın alıştırma', text: 'Usta çırağın 2 katı hızlı. 2 usta ve 3 çırak bir işi 6 saatte bitiriyor. 1 usta ve 1 çırak kaç saatte bitirir?',
          options: ['$14$', '$12$', '$21$'], answer: 0,
          hints: ['Güç $2\\cdot2+3=7$.', 'İş $7\\cdot6=42$.', '$42/3$.'],
          feedback: ['3 çırak gücüyle 14 saat.', 'Kişi sayısıyla (5→2) orantı kurdun.', 'Ustayı 1 çırak saydın; 2 sayılmalı.'],
        },
        {
          id: 've-makine', level: 'Farklı bağlam', text: 'Bir makine diğerinin 3 katı hızlı. İkisi birlikte bir işi 6 saatte bitiriyor. Yavaş makine yalnız kaç saatte bitirir?',
          options: ['$24$', '$8$', '$18$'], answer: 0,
          hints: ['Güç $1+3=4$ birim.', 'İş $4\\cdot6=24$.', 'Yavaş 1 birim.'],
          feedback: ['24 saat.', '8, hızlı makinenin süresi.', '$6\\cdot3$: güç toplamı 4 birim, 3 değil.'],
        },
        {
          id: 've-yuzde', level: 'Yüzde verim', text: 'Bir ekip bir işi 20 günde bitiriyor. Verim %25 artarsa iş kaç günde biter?',
          options: ['$16$', '$15$', '$25$'], answer: 0,
          hints: ['Güç 1,25 katı.', 'Süre ters orantılı.', '$20/1{,}25$.'],
          feedback: ['$20\\div1{,}25$.', '%25 azaltma güç artışını ters çevirmez.', 'Verim artınca süre uzamaz, kısalır.'],
        },
      ],
      realNote: 'Problem kategorisinde farklı verim isteyen ve derste çözülmemiş, görseli okunmuş soru bulunmadı.',
    },
  ],
};
