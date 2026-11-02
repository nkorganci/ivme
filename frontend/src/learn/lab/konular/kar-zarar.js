// Kâr–Zarar ve İndirim laboratuvarı: kâr yüzdesinin maliyet tabanı, kampanya ve ardışık indirimin gerçek oranı,
// kâr/zarar farkından maliyet, fire ile birim satış fiyatı. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const near = (a, b) => Math.abs(a - b) < 1e-9;
export const COST = 80;
export const CAMPAIGNS = [['ikinci50', 'İkincisi %50'], ['hepsi30', 'Hepsine %30'], ['3al2', '3 al 2 öde']];
export function campaignPay(kind, n, price = 100) {
  if (kind === 'ikinci50') return Math.floor(n / 2) * 1.5 * price + (n % 2) * price;
  if (kind === 'hepsi30') return n * price * 0.7;
  return (n - Math.floor(n / 3)) * price;
}
export const EGGS = { bought: 100, cost: 200, broken: 10, profit: 0.35 };

export default {
  conceptId: 'kar-zarar',
  title: 'Kâr–Zarar ve İndirim Problemleri',
  exam: 'TYT + AYT',
  hero: { title: 'Yüzde neyin üzerinden?', text: 'Kâr maliyetten, indirim etiketten hesaplanır. Kampanyaların gerçek oranını, farktan maliyeti ve firenin etkisini gör.', art: ['maliyet', '→', 'satış'] },
  goals: [
    {
      id: 'maliyet-tabani', label: 'Kâr yüzdesi', short: 'Taban maliyettir',
      objective: 'Kâr ve zarar yüzdesini maliyete göre hesaplar; satış fiyatından ya da kâr oranından maliyeti geri bulur.',
      misconception: 'Kâr yüzdesini satış fiyatına göre almak (80’e alıp 100’e satınca %20 sanmak).',
      story: 'Bir kırtasiyeci defteri 80 TL’ye alıp 100 TL’ye satıyor. “%20 kâr ediyorum” diyor. Haklı mı?',
      predict: {
        question: '80 TL’ye alınan ürün 100 TL’ye satılırsa kâr yüzdesi kaçtır?',
        options: ['%25', '%20', '%80'],
        insight: [
          'Doğru: kâr 20, maliyet 80; $20/80$.',
          '%20, kârın satış fiyatına oranı; kâr yüzdesi maliyete göredir.',
          '80 maliyetin kendisi.',
        ],
      },
      experiment: {
        prompt: 'Satış fiyatını seç; 80 TL’lik üründen tam %25 kâr et.',
        view: 'margin', visualLabel: 'Maliyet çubuğu ve kâr parçası',
        controls: [{ key: 's', label: 'Satış fiyatı (TL)', min: 60, max: 160, step: 5 }],
        initial: { s: 90 },
        compute: ({ s }) => ({ s, gain: s - COST, pct: (100 * (s - COST)) / COST, pctSale: (100 * (s - COST)) / s }),
        readout: (_, r) => [['Kâr/zarar', `${r.gain} TL`], ['Maliyete göre', `%${fmt(r.pct, 1)}`], ['Satışa göre (yanlış taban)', `%${fmt(r.pctSale, 1)}`]],
        target: { text: 'Hedef: maliyete göre %25 kâr.', test: (_, r) => near(r.pct, 25), example: { s: 100 }, hint: '80’in %25’i kaç?' },
        diagnose: (_, r) => `Maliyete göre %${fmt(r.pct, 1)} ${r.gain >= 0 ? 'kâr' : 'zarar'}. %25 için kâr 20 TL olmalı.`,
        success: '$80\\cdot1{,}25=100$: kâr 20 TL = maliyetin %25’i (satışın %20’si).',
      },
      reasons: [
        {
          question: 'Neden %25?',
          options: ['Kâr 20 TL, maliyetin (80) yüzdesi: $20/80$.', 'Satış fiyatına göre: $20/100$.', 'Her ürün %25 kârla satılır.'],
          answer: 0,
          feedback: ['', 'Bu kâr marjıdır; kâr yüzdesi maliyet tabanlıdır.', 'Oran ürüne göre değişir.'],
        },
        {
          question: 'Zarar yüzdesi neye göre hesaplanır?',
          options: ['Yine maliyete göre.', 'Satış fiyatına göre.', 'Etiket fiyatına göre.'],
          answer: 0,
          feedback: ['', 'Kâr da zarar da maliyet tabanlı.', 'Etiket indirimin tabanıdır.'],
        },
      ],
      proof: 'Kâr $=S-M$, kâr yüzdesi $=\\tfrac{S-M}M\\cdot100$. $S=M(1+\\tfrac p{100})$; %25 için $S=80\\cdot1{,}25=100$.',
      rule: 'Satış = maliyet × (1 ± oran); maliyet = satış ÷ (1 ± oran).',
      condition: 'Soruda başka taban (satış, etiket) belirtilmemişse kâr/zarar maliyete göredir.',
      trap: 'Kârı satış fiyatına bölmek; geri hesapta satıştan yüzde çıkarmak.',
      transfer: [
        {
          id: 'mt-yakin', level: 'Yakın alıştırma', text: '%20 kârla 96 TL’ye satılan bir ürünün maliyeti kaç TL’dir?',
          options: ['$80$', '$76{,}8$', '$76$'], answer: 0,
          hints: ['$1{,}2M=96$.', '$96\\div1{,}2$.', '80.'],
          feedback: ['$80\\cdot1{,}2=96$.', '96’dan %20 çıkardın; taban maliyet.', '$96-20$: yüzde bir TL miktarı değildir.'],
        },
        {
          id: 'mt-zarar', level: 'Zarar', text: '%25 zararla 60 TL’ye satılan ürünün maliyeti kaç TL’dir?',
          options: ['$80$', '$75$', '$45$'], answer: 0,
          hints: ['$0{,}75M=60$.', '$60\\div0{,}75$.', '80.'],
          feedback: ['$80\\cdot0{,}75=60$.', '$60\\cdot1{,}25$: zararı satışa göre aldın.', '$60\\cdot0{,}75$: maliyet satıştan büyük olmalı.'],
        },
        {
          id: 'mt-kg', level: 'Toplu alım', text: 'Bir esnaf 30 kg malı kilogramı 40 TL’den aldı, kilogramı 50 TL’den sattı. Kâr yüzdesi kaçtır?',
          options: ['%25', '%20', '%10'], answer: 0,
          hints: ['Kilogram başına kâr 10.', '$10/40$.', '%25.'],
          feedback: ['Miktar oranı değiştirmez.', '$10/50$: satış tabanı.', '10 TL kâr yüzde değil.'],
        },
      ],
      real: [
        { code: 'TYT-0649', answer: 'D', why: 'Evin metrekaresi, arsanın dönümü: alış–satış zinciri; arsa kârını maliyet farkıyla bul.' },
      ],
    },
    {
      id: 'kampanya', label: 'Kampanya ve indirim', short: 'Gerçek indirim oranı',
      objective: 'Kampanyaların (ikincisi %50, 3 al 2 öde, ardışık indirim) toplam tutara göre gerçek indirim oranını hesaplar ve karşılaştırır.',
      misconception: '“İkincisi %50” kampanyasını bütün alışverişte %50 indirim sanmak; ardışık indirimleri toplamak.',
      story: 'Bir mağaza “ikincisi %50 indirimli”, diğeri “hepsine %30”, bir başkası “3 al 2 öde” diyor. Hangisi gerçekte kaç indirim?',
      predict: {
        question: '“İkincisi %50 indirimli” kampanyada 2 ürün alan toplamda yüzde kaç indirim kazanır?',
        options: ['%25', '%50', '%75'],
        insight: [
          'Doğru: 200 yerine 150; $50/200$.',
          'İndirim yalnız ikinci üründe.',
          '%75 ikinci ürünün ödenen kısmı ile karışıyor.',
        ],
      },
      experiment: {
        prompt: 'Kampanyayı ve adedi seç; toplamda tam %25 indirim alan seçimi bul.',
        view: 'campaign', visualLabel: 'Ödenen ve kazanılan tutar',
        controls: [{ key: 'kind', label: 'Kampanya', options: CAMPAIGNS }, { key: 'n', label: 'Adet', min: 1, max: 6, step: 1 }],
        initial: { kind: 'hepsi30', n: 2 },
        compute: ({ kind, n }) => { const pay = campaignPay(kind, n); return { kind, n, pay, full: 100 * n, pct: 100 - (100 * pay) / (100 * n) }; },
        readout: (_, r) => [['Etiket toplamı', `${r.full} TL`], ['Ödenen', `${fmt(r.pay)} TL`], ['Gerçek indirim', `%${fmt(r.pct, 1)}`]],
        target: { text: 'Hedef: gerçek indirim %25.', test: (_, r) => near(r.pct, 25), example: { kind: 'ikinci50', n: 2 }, hint: 'Hangi kampanyada indirim yalnız ürünlerin bir kısmına uygulanıyor?' },
        diagnose: (_, r) => `Etiket toplamına göre gerçek indirim %${fmt(r.pct, 1)}. ${r.kind === 'ikinci50' && r.n % 2 ? 'Tek adette son ürün tam fiyat.' : 'Hedef %25.'}`,
        success: '“İkincisi %50”: her iki üründe 50 TL indirim, 200 TL’nin %25’i.',
      },
      reasons: [
        {
          question: 'Neden %25?',
          options: ['İndirim yalnız ikinci ürüne; iki ürünün toplamına göre $50/200$.', '%50’nin yarısı her zaman %25’tir.', 'Kampanyalar hep %25 verir.'],
          answer: 0,
          feedback: ['', 'Tesadüf değil: indirim iki ürünün birine uygulanıyor.', '3 al 2 öde %33,3 verir.'],
        },
        {
          question: 'Ardışık %10 ve %20 indirim toplamda kaç?',
          options: ['%28', '%30', '%15'],
          answer: 0,
          feedback: ['', 'İkinci indirim indirimli fiyattan: $0{,}9\\cdot0{,}8=0{,}72$.', 'Ortalama alınmaz; çarpanlar çarpılır.'],
        },
      ],
      proof: 'İki ürün: $100+50=150$, oran $\\tfrac{50}{200}$. Ardışık indirim çarpanları çarpılır: $(1-a)(1-b)$.',
      rule: 'Gerçek indirim = (etiket toplamı − ödenen) ÷ etiket toplamı.',
      condition: 'Kampanyanın hangi ürünlere uygulandığını oku; adet tek/çift olunca oran değişebilir.',
      trap: 'Kampanya oranını bütün sepete uygulamak.',
      transfer: [
        {
          id: 'kp-yakin', level: 'Yakın alıştırma', text: 'Etiketi 200 TL olan ürüne önce %10, sonra %20 indirim yapılıyor. Kaç TL ödenir?',
          options: ['$144$', '$140$', '$160$'], answer: 0,
          hints: ['$200\\cdot0{,}9=180$.', '$180\\cdot0{,}8$.', '144.'],
          feedback: ['$200\\cdot0{,}72$.', '%30 toplandı; ikinci indirim 180’den.', 'Yalnız ikinci indirim.'],
        },
        {
          id: 'kp-kar', level: 'İndirim ve kâr', text: 'Bir ürün 120 TL’ye satılınca maliyetine göre %20 kâr ediliyor. Maliyet kaç TL’dir?',
          options: ['$100$', '$96$', '$150$'], answer: 0,
          hints: ['$1{,}2M=120$.', '$M=100$.', 'Etiket bilgisi gereksiz.'],
          feedback: ['$100\\cdot1{,}2=120$.', '120’nin %80’i; taban yanlış.', '$120\\div0{,}8$: etiket indirimini maliyet sandın.'],
        },
        {
          id: 'kp-kiyas', level: 'Karşılaştırma', text: 'A mağazası “3 al 2 öde”, B mağazası “her şeye %30 indirim” yapıyor. 3 ürün alan biri için hangisi daha avantajlı?',
          options: ['A', 'B', 'Eşit'], answer: 0,
          hints: ['A: 3 ürüne 2 ürün parası.', 'A’da indirim $\\tfrac13\\approx\\%33$.', 'B %30.'],
          feedback: ['%33,3 > %30.', 'B %30; A biraz daha avantajlı.', '%33,3 ile %30 farklı.'],
        },
      ],
      real: [
        { code: 'TYT-0672', answer: 'A', why: 'Kırmızıda 2 kalem: $1+0{,}5$; mavide 2 kalem: $2\\cdot0{,}7$. Fark $0{,}1f=4{,}5$.' },
        { code: 'TYT-0710', answer: 'D', from: 'grafik-rutin-olmayan', why: 'A: çanta alana kalem yarı fiyat; B: aynı türden ikinciye %40. İki sepetin tutarını ayrı hesapla.' },
        { code: 'TYT-0658', answer: 'D', why: '50 TL eşiği: son ürünle toplam 50’yi geçince beş üründe 2’şer TL indirim.' },
      ],
    },
    {
      id: 'fark', label: 'Kâr–zarar farkı', short: 'Fark = maliyetin yüzde farkı',
      objective: 'İki farklı satış senaryosu arasındaki TL farkını maliyetin yüzde farkına eşitleyip maliyeti bulur.',
      misconception: 'Yüzde farkını satış fiyatına uygulamak; kâr ve zarar yüzdelerini aynı işaretle almak.',
      story: 'Bir satıcı “Bunu %20 kârla sattım; 30 TL ucuza satsaydım %5 zarar edecektim” diyor. Ürünün maliyeti ne?',
      predict: {
        question: '%20 kârla satılan bir ürün 30 TL ucuza satılsaydı %5 zarar edilecekti. Maliyet kaç TL?',
        options: ['$120$', '$100$', '$150$'],
        insight: [
          'Doğru: %20 kâr ile %5 zarar arası maliyetin %25’i = 30 TL.',
          '100 ile fark 25 TL olur.',
          '150 ile fark 37,5 TL olur.',
        ],
      },
      experiment: {
        prompt: 'Maliyeti seç; iki satış fiyatı arasındaki fark 30 TL olsun.',
        view: 'gap', visualLabel: 'Maliyet, %5 zararlı ve %20 kârlı fiyat',
        controls: [{ key: 'c', label: 'Maliyet (TL)', min: 60, max: 200, step: 10 }],
        initial: { c: 100 },
        compute: ({ c }) => ({ c, hi: c * 1.2, lo: c * 0.95, gap: c * 0.25 }),
        readout: (_, r) => [['%20 kârlı', fmt(r.hi, 1)], ['%5 zararlı', fmt(r.lo, 1)], ['Fark', `${fmt(r.gap, 1)} TL`]],
        target: { text: 'Hedef: fark 30 TL.', test: (_, r) => near(r.gap, 30), example: { c: 120 }, hint: 'Fark maliyetin kaç yüzdesi? $20-(-5)$.' },
        diagnose: (_, r) => `Fark maliyetin %25’i: ${fmt(r.gap, 1)} TL.`,
        success: '$0{,}25c=30\\Rightarrow c=120$.',
      },
      reasons: [
        {
          question: '30 TL neye karşılık gelir?',
          options: ['%20 kâr ile %5 zarar arası: maliyetin %25’i.', 'Maliyetin %15’i ($20-5$).', 'Satış fiyatının %25’i.'],
          answer: 0,
          feedback: ['', 'Zarar negatif: $20-(-5)=25$.', 'Tabanlar maliyettir, satış fiyatı değil.'],
        },
        {
          question: 'Bu yöntemi ne zaman kullanırsın?',
          options: ['Aynı maliyetin iki farklı yüzdeyle satışı arasındaki TL farkı verilince.', 'Maliyet doğrudan verilince.', 'Hiçbir zaman, hep denklem kurulur.'],
          answer: 0,
          feedback: ['', 'Maliyet bilinirse doğrudan hesaplarsın.', 'Denklem de aynı sonuca varır; bu onun kısa hâli.'],
        },
      ],
      proof: '$1{,}2c-0{,}95c=0{,}25c=30\\Rightarrow c=120$.',
      rule: 'TL farkı = maliyet × (yüzde farkı); kârı +, zararı − al.',
      condition: 'İki satış aynı maliyete dayanmalı.',
      trap: 'Zararı + almak (%15); farkı satışa göre almak.',
      transfer: [
        {
          id: 'fk-yakin', level: 'Yakın alıştırma', text: '%10 kârla 110 TL’ye satılan ürün %30 kârla satılsaydı kaç TL’ye satılırdı?',
          options: ['$130$', '$143$', '$120$'], answer: 0,
          hints: ['Maliyet 100.', '$100\\cdot1{,}3$.', '130.'],
          feedback: ['Maliyet 100.', '$110\\cdot1{,}3$: taban satış alındı.', '120, %20 kârlı fiyat; %30 değil.'],
        },
        {
          id: 'fk-yarim', level: 'Karma satış', text: 'Bir esnaf malının yarısını %20 kârla, kalanını %10 zararla satıyor. Toplam kâr yüzdesi kaçtır?',
          options: ['%5', '%10', '%15'], answer: 0,
          hints: ['Eşit maliyetli iki yarı.', '$\\tfrac{20+(-10)}2$.', '%5.'],
          feedback: ['Ağırlıklar eşit: ortalama 5.', '$20-10$: yarıya bölmedin.', 'Zararı + aldın; $\\tfrac{20+10}2=15$ olur.'],
        },
        {
          id: 'fk-adet', level: 'Adet', text: 'Maliyeti 50 TL olan üründen 20 adet satılınca toplam kâr 300 TL. Bir ürünün satış fiyatı kaç TL?',
          options: ['$65$', '$60$', '$80$'], answer: 0,
          hints: ['Ürün başına kâr $300/20$.', '15 TL.', '$50+15$.'],
          feedback: ['$20\\cdot15=300$.', 'Ürün başına kâr 10 değil 15.', '$50+300/10$: adet 20, 10 değil.'],
        },
      ],
      realNote: 'Kâr–zarar kategorisindeki görseli okunmuş sorularda iki satış senaryosu farkından maliyet isteyen soru bulunmadı; aktarım özgün alıştırmalarla yapılır.',
    },
    {
      id: 'fire', label: 'Fire ve birim fiyat', short: 'Kâr, satılabilen adetten',
      objective: 'Toptan alımda bozulan/fire kısmı düşüp kalan adetle hedef kâr için birim satış fiyatını hesaplar.',
      misconception: 'Toplam hedef geliri satın alınan adede bölmek; fireyi maliyetten düşmek.',
      story: 'Bir bakkal 100 yumurtayı 200 TL’ye aldı; taşırken 10’u kırıldı. Toplamda %35 kâr etmek için kalan yumurtaların tanesini kaça satmalı?',
      predict: {
        question: '100 yumurta 200 TL; 10’u kırıldı. %35 kâr için tanesi kaç TL olmalı?',
        options: ['$3$', '$2{,}7$', '$2{,}43$'],
        insight: [
          'Doğru: hedef gelir 270, satılabilen 90: $270/90$.',
          '2,7, 270’i 100 yumurtaya bölmek; 10’u satılamaz.',
          '2,43 fireyi iki kez düşmek.',
        ],
      },
      experiment: {
        prompt: 'Birim fiyatı seç; 90 yumurtadan elde edilen gelirle tam %35 kâr et.',
        view: 'eggs', visualLabel: 'Satılan ve kırılan yumurtalar',
        controls: [{ key: 'p', label: 'Tane fiyatı (TL)', min: 2, max: 4, step: 0.1, format: (v) => fmt(v, 1) }],
        initial: { p: 2.7 },
        compute: ({ p }) => { const revenue = (EGGS.bought - EGGS.broken) * p; return { p, revenue, pct: (100 * (revenue - EGGS.cost)) / EGGS.cost }; },
        readout: (_, r) => [['Gelir', `${fmt(r.revenue, 1)} TL`], ['Kâr yüzdesi', `%${fmt(r.pct, 1)}`]],
        target: { text: 'Hedef: %35 kâr.', test: (_, r) => near(r.pct, 35), example: { p: 3 }, hint: 'Hedef gelir $200\\cdot1{,}35$; kaç yumurta satılabiliyor?' },
        diagnose: (_, r) => `Gelir ${fmt(r.revenue, 1)} TL: %${fmt(r.pct, 1)}. Hedef gelir 270 TL, satılan 90 yumurta.`,
        success: '$90\\cdot3=270=200\\cdot1{,}35$.',
      },
      reasons: [
        {
          question: 'Neden 90’a bölünür?',
          options: ['Kırılan 10 yumurta satılamaz; gelir yalnız 90 yumurtadan gelir.', 'Maliyet 90 TL’ye düştüğü için.', 'Kırılanlar iade edildiği için.'],
          answer: 0,
          feedback: ['', 'Maliyet değişmez; 200 TL ödendi.', 'İade yok; fire kayıptır.'],
        },
        {
          question: 'Maliyet neden hâlâ 200 TL?',
          options: ['Kırılanlar da parası ödenmiş mallardır.', 'Maliyet kırılanlar kadar azalır.', 'Kâr hesabında maliyet kullanılmaz.'],
          answer: 0,
          feedback: ['', 'Para geri gelmez; maliyet aynı.', 'Kâr = gelir − maliyet.'],
        },
      ],
      proof: 'Gelir $=90p$, maliyet 200. $90p=1{,}35\\cdot200=270\\Rightarrow p=3$.',
      rule: 'Birim fiyat = maliyet × (1 + kâr oranı) ÷ satılabilen adet.',
      condition: 'Fire satılamaz ama maliyete dahildir.',
      trap: 'Geliri alınan adede bölmek; maliyetten fire düşmek.',
      transfer: [
        {
          id: 'fr-yakin', level: 'Yakın alıştırma', text: '50 kalem 100 TL’ye alınıp tanesi 3 TL’den hepsi satılırsa kâr yüzdesi kaçtır?',
          options: ['%50', '%33', '%150'], answer: 0,
          hints: ['Gelir 150.', 'Kâr 50.', '$50/100$.'],
          feedback: ['%50.', '$50/150$: satış tabanı.', 'Gelirin maliyete oranı.'],
        },
        {
          id: 'fr-domates', level: 'Fireli satış', text: 'Bir manav 20 kg domatesi 120 TL’ye aldı; %10’u çürüdü. Kalanını kilogramı 8 TL’den satarsa kaç TL kâr eder?',
          options: ['$24$', '$40$', '$16$'], answer: 0,
          hints: ['Satılan 18 kg.', 'Gelir 144.', '$144-120$.'],
          feedback: ['%20 kâr.', '20 kg satılmış gibi hesaplandı; 2 kg çürük.', 'Fire iki kez düşüldü.'],
        },
        {
          id: 'fr-oran', level: 'Oran', text: 'Bir ürünün satış fiyatı maliyetinin $\\tfrac54$’ü ise kâr yüzdesi kaçtır?',
          options: ['%25', '%20', '%125'], answer: 0,
          hints: ['Kâr $\\tfrac14$ maliyet.', '%25.', 'Maliyet tabanı.'],
          feedback: ['$\\tfrac14=\\%25$.', '$\\tfrac15$ satışa göre.', 'Satışın maliyete oranı.'],
        },
      ],
      realNote: 'Kâr–zarar kategorisindeki görseli okunmuş sorularda fire/birim fiyat isteyen soru bulunmadı.',
    },
  ],
};
