// Birinci Dereceden Denklemler laboratuvarı: terazi ile denk işlem, çözüm kümesinin özel durumları, iki bilinmeyenli
// sistem, istenen ifadeyi denklemin katı olarak bulma. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

// 3x + 5 = x + 13 (çözüm 4) üzerinde: iki kefeden a tane x ve b birim çıkar, sonra iki tarafı d’ye böl.
export function balance({ a, b, d, side }) {
  const both = side === 'iki';
  const L = [(3 - a) / d, (5 - b) / d];
  const R = both ? [(1 - a) / d, (13 - b) / d] : [1, 13];
  return { L, R, both, holdsAt4: Math.abs(L[0] * 4 + L[1] - (R[0] * 4 + R[1])) < 1e-9 };
}
export const term = ([c, k]) => {
  const parts = [];
  if (Math.abs(c) > 1e-9) parts.push(`${c === 1 ? '' : c === -1 ? '-' : fmt(c)}x`);
  if (Math.abs(k) > 1e-9 || !parts.length) parts.push(parts.length && k > 0 ? `+${fmt(k)}` : fmt(k));
  return parts.join('').replace(/−/g, '-');
};
export const classify = (m, n) => (m !== 2 ? 'tek' : n === 3 ? 'sonsuz' : 'yok');

export default {
  conceptId: 'birinci-derece-denklemler',
  title: 'Birinci Dereceden Denklemler ve Denklem Sistemleri',
  exam: 'TYT + AYT',
  hero: { title: 'Dengeyi koru', text: 'İki kefeye aynı şeyi yap, bilinmeyeni yalnız bırak. Çözüm yoksa ya da her sayı çözümse nedenini gör.', art: ['3x+5', '=', 'x+13'] },
  goals: [
    {
      id: 'denge', label: 'Denk işlem', short: 'İki kefeye aynı işlem',
      objective: 'Denklemi iki tarafa aynı işlemi uygulayarak $x=\\dots$ biçimine getirir; her adımın çözümü neden korumasını açıklar ve sözel durumu denkleme çevirir.',
      misconception: 'Terimi “karşıya atınca” yalnız bir tarafı değiştirmek; işaret/katsayı hatasıyla dengeyi bozmak.',
      story: 'Terazinin sol kefesinde 3 kutu ve 5 bilye, sağında 1 kutu ve 13 bilye var; terazi dengede. Her kutuda eşit sayıda bilye var. Kutuyu açmadan içini bulabilir misin?',
      predict: {
        question: '$3x+5=x+13$ denkleminde iki taraftan $x$ çıkarırsak çözüm değişir mi?',
        options: ['Değişmez.', 'Değişir.', 'Denklem bozulur.'],
        insight: [
          'Doğru: $2x+5=13$ de $x=4$ ile sağlanır; iki kefeden aynı şeyi almak dengeyi korur.',
          '$x=4$ hem $3x+5=x+13$’ü hem $2x+5=13$’ü sağlıyor; çözüm aynı kaldı.',
          'Yalnız bir kefeden çıkarsaydın bozulurdu; iki taraftan çıkarmak bozmaz.',
        ],
      },
      experiment: {
        prompt: 'Adımları seç; denklemi $x=$ sayı biçimine getir.',
        view: 'balance', visualLabel: 'Terazi: kutu = x, nokta = 1 birim',
        controls: [
          { key: 'side', label: 'İşlem nereye?', options: [['iki', 'İki kefeye'], ['tek', 'Yalnız sol kefeye']] },
          { key: 'a', label: 'Çıkarılan $x$ sayısı', min: 0, max: 3, step: 1 },
          { key: 'b', label: 'Çıkarılan birim', min: 0, max: 13, step: 1 },
          { key: 'd', label: 'İki taraf kaça bölünsün?', min: 1, max: 4, step: 1 },
        ],
        initial: { side: 'iki', a: 0, b: 0, d: 1 },
        compute: (v) => { const r = balance(v); return { ...r, eq: `$${term(r.L)}=${term(r.R)}$` }; },
        readout: (_, r) => [['Denklem', r.eq], ['$x=4$ hâlâ çözüm mü?', r.holdsAt4 ? 'evet' : 'hayır: denge bozuldu']],
        target: {
          text: 'Hedef: denge korunarak $x=4$ yazılsın (solda yalnız $x$, sağda yalnız sayı).',
          test: (_, r) => r.both && Math.abs(r.L[0] - 1) < 1e-9 && Math.abs(r.L[1]) < 1e-9 && Math.abs(r.R[0]) < 1e-9 && Math.abs(r.R[1] - 4) < 1e-9,
          example: { side: 'iki', a: 1, b: 5, d: 2 },
          hint: 'Önce sağdaki $x$’i yok edecek kadar $x$ çıkar, sonra soldaki 5’i yok edecek kadar birim; en son $x$’in katsayısına böl.',
        },
        diagnose: (_, r) => {
          if (!r.both) return 'Yalnız sol kefeden çıkardın: terazi bozuldu, $x=4$ artık çözüm değil. Aynı işlemi iki kefeye uygula.';
          if (Math.abs(r.R[0]) > 1e-9) return `Sağda hâlâ ${fmt(r.R[0])}x var; iki taraftan $x$ çıkar.`;
          if (Math.abs(r.L[1]) > 1e-9) return `Solda hâlâ ${fmt(r.L[1])} birim var; iki taraftan birim çıkar.`;
          return `Solda ${fmt(r.L[0])}x kaldı; iki tarafı $x$’in katsayısına böl.`;
        },
        success: 'Her adımda $x=4$ çözüm kaldı: $3x+5=x+13 \\to 2x+5=13 \\to 2x=8 \\to x=4$.',
      },
      reasons: [
        {
          question: 'İki tarafa aynı işlemi uygulamak neden çözümü korur?',
          options: ['Eşit iki miktara aynı şey yapılınca yine eşit kalırlar; $x=4$ her adımda sağlanır.', 'Çünkü sonuç her zaman tam sayı çıkar.', 'Yalnız toplama ve çıkarmada korur, bölmede korumaz.'],
          answer: 0,
          feedback: ['', 'Çözüm kesirli de olabilir: $2x=3$ → $x=1{,}5$; tam sayılık konu değil.', 'Sıfırdan farklı bir sayıya bölmek de eşitliği korur: $2x=8\\iff x=4$.'],
        },
        {
          question: 'Hangi işlem çözüm kümesini değiştirebilir?',
          options: ['İki tarafı 0 ile çarpmak ya da $x$ içeren bir ifadeye bölmek.', 'İki tarafa 5 eklemek.', 'İki tarafı 2’ye bölmek.'],
          answer: 0,
          feedback: ['', '5 eklemek eşitliği ve çözümü korur.', 'Sıfır olmayan sayıya bölmek çözümü korur.'],
        },
      ],
      proof: '$A=B$ ise her $c$ için $A+c=B+c$ ve $c\\neq0$ için $\\tfrac Ac=\\tfrac Bc$; bu işlemler geri alınabildiği için çözüm kümesi aynı kalır. $3x+5=x+13 \\iff 2x=8 \\iff x=4$.',
      rule: 'Bilinmeyenleri bir tarafa, sayıları diğer tarafa topla; katsayıya böl. “Karşıya atmak” iki tarafa aynı işlemin kısa adıdır.',
      condition: 'Çarpma/bölme sıfırdan farklı sayıyla yapılmalı. $x$ içeren ifadeye bölerken o ifadenin sıfır olduğu durumu ayrıca incele.',
      trap: 'Terimin işaretini değiştirmeden karşıya geçirmek; yalnız bir terimi bölmek ($\\tfrac{2x+6}2=x+6$ yazmak).',
      transfer: [
        {
          id: 'denge-yakin', level: 'Yakın alıştırma', text: '$5x-7=2x+8$ ise $x$ kaçtır?',
          options: ['$5$', '$3$', '$1$'], answer: 0,
          hints: ['İki taraftan $2x$ çıkar.', '$3x-7=8$; iki tarafa 7 ekle.', '$3x=15$.'],
          feedback: ['$3x=15$, $x=5$.', '$3x=15$’te 15’i 3’e böl; 3 katsayı.', '7’yi çıkarmak yerine eklemek gerekiyordu.'],
        },
        {
          id: 'denge-kur', level: 'Sözelden denkleme', text: 'Kalem 3 TL, defter 7 TL. Toplam 10 ürün için 46 TL ödendi. Kaç defter alındı?',
          options: ['$4$', '$6$', '$3$'], answer: 0,
          hints: ['Defter sayısı $d$ ise kalem $10-d$.', '$3(10-d)+7d=46$.', '$30+4d=46$.'],
          feedback: ['4 defter (28 TL) + 6 kalem (18 TL).', '6, kalem sayısı; soru defteri soruyor.', '$3\\cdot7+7\\cdot3=42\\neq46$.'],
        },
        {
          id: 'denge-kesir', level: 'Kesirli katsayı', text: '$\\dfrac x3+\\dfrac x4=7$ ise $x$ kaçtır?',
          options: ['$12$', '$7$', '$84$'], answer: 0,
          hints: ['Paydaları yok etmek için iki tarafı 12 ile çarp.', '$4x+3x=84$.', '$7x=84$.'],
          feedback: ['$4+3=7$: kontrol doğru.', '$x=7$ için $\\tfrac73+\\tfrac74\\neq7$.', '84, $7x$’in değeri; 7’ye böl.'],
        },
      ],
      real: [
        { code: 'TYT-0603', answer: 'D', from: 'esitsizlikler', why: 'Cetvel boylarını ($10+2\\cdot0{,}8$ ve $6+2\\cdot0{,}2$) eşitle; hizalanan noktayı denklemle bul.' },
        { code: 'TYT-0624', answer: 'C', from: 'esitsizlikler', why: 'Her şeridin son sayısını yaz: $a-1=b+3=c-2$; eşitlikten sıralamayı çıkar.' },
      ],
    },
    {
      id: 'ozel-durum', label: 'Çözüm yok / sonsuz', short: '0·x = ?',
      objective: '$ax=b$ biçimindeki denklemde katsayı sıfır olduğunda çözümsüz ve sonsuz çözümlü durumları ayırır; istenen çözüm türü için parametre bulur.',
      misconception: '$0\\cdot x=0$’ı “çözüm 0” sanmak; $0\\cdot x=2$’de iki tarafı 0’a bölmeye çalışmak.',
      story: 'İki telefon tarifesi karşılaştırılıyor: dakika ücreti ve sabit ücret. Hangi konuşma süresinde faturalar eşit olur? Bazen hiçbir sürede, bazen her sürede.',
      predict: {
        question: '$(m-2)x=n-3$ denkleminin **her** $x$ için doğru olması için ne gerekir?',
        options: ['$m=2$ ve $n=3$', 'Yalnız $m=2$', 'Yalnız $n=3$'],
        insight: [
          'Doğru: iki taraf da sıfırlanır, $0\\cdot x=0$ her $x$ için doğrudur.',
          '$m=2$, $n=5$ iken $0\\cdot x=2$: hiçbir $x$ sağlamaz.',
          '$n=3$, $m=5$ iken $3x=0$: yalnız $x=0$.',
        ],
      },
      experiment: {
        prompt: '$m$ ve $n$’yi seç; $(m-2)x=n-3$ denkleminin çözüm kümesini **bütün gerçek sayılar** yap.',
        view: 'pair-lines', visualLabel: 'Sol taraf y = (m−2)x, sağ taraf y = n−3',
        controls: [{ key: 'm', label: '$m$', min: -2, max: 6, step: 1 }, { key: 'n', label: '$n$', min: -2, max: 6, step: 1 }],
        initial: { m: 4, n: 5 },
        compute: ({ m, n }) => ({ m, n, kind: classify(m, n), x: m !== 2 ? (n - 3) / (m - 2) : null }),
        readout: (_, r) => [['Denklem', `$${r.m - 2}x=${r.n - 3}$`], ['Çözüm', r.kind === 'tek' ? `tek: $x=${fmt(r.x)}$` : r.kind === 'sonsuz' ? 'her gerçek sayı' : 'yok']],
        target: {
          text: 'Hedef: çözüm kümesi $\\mathbb R$.',
          test: (_, r) => r.kind === 'sonsuz',
          example: { m: 2, n: 3 },
          hint: 'Sol taraf $x$’ten bağımsız olmalı (katsayı 0) ve sağ taraf da 0 olmalı.',
        },
        diagnose: (_, r) => r.kind === 'tek' ? `Katsayı ${r.m - 2} ≠ 0: tek çözüm $x=${fmt(r.x)}$. Doğrular bir noktada kesişiyor.` : `Katsayı 0 ama sağ taraf ${r.n - 3}: $0\\cdot x=${r.n - 3}$ hiçbir $x$ için doğru değil; doğrular paralel.`,
        success: '$0\\cdot x=0$: iki doğru çakışık, her $x$ çözüm.',
      },
      reasons: [
        {
          question: '$m=2$, $n=5$ iken neden çözüm yoktur?',
          options: ['$0\\cdot x=2$: hangi sayıyı 0 ile çarparsan çarp 2 elde edemezsin.', 'Çözüm $x=0$’dır.', '$x=\\tfrac20$ çözümdür.'],
          answer: 0,
          feedback: ['', '$x=0$ dene: $0\\cdot0=0\\neq2$; sağlamıyor.', '$\\tfrac20$ tanımsızdır; 0’a bölünemez.'],
        },
        {
          question: '$m\\neq2$ ise ne olur?',
          options: ['Tek çözüm: $x=\\tfrac{n-3}{m-2}$.', 'Çözüm yoktur.', 'Sonsuz çözüm vardır.'],
          answer: 0,
          feedback: ['', 'Katsayı sıfır değilse iki tarafı ona bölebilirsin; tam bir çözüm çıkar.', 'Sonsuz çözüm için katsayının sıfır olması gerekir.'],
        },
      ],
      proof: '$ax=b$: $a\\neq0$ ise $x=\\tfrac ba$ tek çözüm. $a=0$ ise denklem $0=b$ olur: $b=0$ ise her $x$ sağlar, $b\\neq0$ ise hiçbiri. Grafikte $y=ax$ ile $y=b$: kesişen, çakışık ya da paralel.',
      rule: '$ax=b$: $a\\neq0$ tek çözüm; $a=0,b=0$ sonsuz; $a=0,b\\neq0$ çözüm yok.',
      condition: 'Önce denklemi $ax=b$ biçimine getir (bütün $x$’ler bir tarafa). Parametre sorusunda iki koşulu birlikte yaz.',
      trap: '$0\\cdot x=0$’ı “$x=0$” diye okumak; $a=0$ durumunu unutup $x=\\tfrac ba$ yazmak.',
      transfer: [
        {
          id: 'ozel-yakin', level: 'Yakın alıştırma', text: '$(a-1)x+4=3x+b$ denkleminin çözüm kümesi $\\mathbb R$ ise $a+b$ kaçtır?',
          options: ['$8$', '$4$', '$7$'], answer: 0,
          hints: ['Her $x$ için doğru: katsayılar ve sabitler ayrı ayrı eşit.', '$a-1=3$ ve $4=b$.', '$a=4$, $b=4$.'],
          feedback: ['$a=4$, $b=4$.', 'Yalnız $b$ bulundu; $a$ da gerekli.', '$a=3$ alındı; $a-1=3$ ise $a=4$.'],
        },
        {
          id: 'ozel-yok', level: 'Çözümsüzlük koşulu', text: '$2(x+3)=2x+k$ denkleminin çözümü yoksa $k$ için ne söylenir?',
          options: ['$k\\neq6$', '$k=6$', '$k=0$'], answer: 0,
          hints: ['Sol taraf $2x+6$.', '$2x$’ler sadeleşir: $6=k$.', 'Bu eşitlik yanlışsa çözüm yok.'],
          feedback: ['$6=k$ yanlış olmalı.', '$k=6$ ise her $x$ çözüm.', '$k=0$ yalnız bir örnek; bütün $k\\neq6$ çözümsüzdür.'],
        },
        {
          id: 'ozel-tek', level: 'Tek çözümün değeri', text: '$k\\neq5$ olmak üzere $kx+2=5x+2$ denkleminin çözümü kaçtır?',
          options: ['$0$', '$k-5$', 'Belirlenemez'], answer: 0,
          hints: ['$(k-5)x=0$.', '$k-5\\neq0$, iki tarafı ona böl.', '$x=0$.'],
          feedback: ['$x=\\tfrac0{k-5}=0$.', '$k-5$ katsayıdır, çözüm değil.', 'Katsayı sıfır olmadığı için tek çözüm var ve $k$’dan bağımsız.'],
        },
      ],
      realNote: 'Bu konunun kategorisindeki (Birinci Dereceden Denklemler ve Eşitsizlikler) 28 TYT sorusunun görselleri tarandı; çözümsüz/sonsuz çözüm parametresini soran tek soru (TYT-0611) derste çözüldü. Aktarım özgün alıştırmalarla yapılır.',
    },
    {
      id: 'sistem', label: 'Denklem sistemi', short: 'İki koşul, tek nokta',
      objective: 'İki bilinmeyenli iki denklemi yok etme/yerine koyma ile çözer; tek denklemin neden yetmediğini ve toplama/çıkarma kısa yolunu açıklar.',
      misconception: 'Tek denklemden iki bilinmeyeni bulmaya çalışmak; yok etmede yalnız bir tarafı çarpmak.',
      story: 'Bir kafede 2 çay ve 1 simit 11 TL, 1 çay ve 3 simit 13 TL. Fiyatları nasıl bulursun? Tek fiş yeterli olur muydu?',
      predict: {
        question: 'Yalnız $2a+b=11$ bilinirse $a$ bulunabilir mi?',
        options: ['Hayır; sonsuz çok $(a,b)$ çifti sağlar.', 'Evet, $a=5{,}5$.', 'Evet, $a=4$.'],
        insight: [
          'Doğru: $(4,3)$, $(5,1)$, $(3,5)$… hepsi ilk denklemi sağlıyor; ikinci denklem tek noktayı seçti.',
          '$a=5{,}5$ yalnız $b=0$ iken; $b$ bilinmiyor.',
          '$a=4$ iki denklem birlikte kullanılınca çıktı; tek denklemle $a=5,b=1$ de olurdu.',
        ],
      },
      experiment: {
        prompt: '$a$ ve $b$’yi seç; $2a+b=11$ ve $a+3b=13$’ü **birlikte** sağla.',
        view: 'system', visualLabel: 'İki doğru ve seçtiğin nokta',
        controls: [{ key: 'a', label: '$a$ (çay)', min: 0, max: 8, step: 0.5, format: (v) => fmt(v, 1) }, { key: 'b', label: '$b$ (simit)', min: 0, max: 8, step: 0.5, format: (v) => fmt(v, 1) }],
        initial: { a: 5, b: 1 },
        compute: ({ a, b }) => ({ a, b, e1: 2 * a + b, e2: a + 3 * b }),
        readout: (_, r) => [['$2a+b$', `${fmt(r.e1)} ${r.e1 === 11 ? '✓' : '≠ 11'}`], ['$a+3b$', `${fmt(r.e2)} ${r.e2 === 13 ? '✓' : '≠ 13'}`]],
        target: {
          text: 'Hedef: iki denklem de sağlansın.',
          test: (_, r) => r.e1 === 11 && r.e2 === 13,
          example: { a: 4, b: 3 },
          hint: 'İkinci denklemi 2 ile çarp: $2a+6b=26$. Birinciyi çıkarınca $a$ yok olur.',
        },
        diagnose: (_, r) => r.e1 === 11 ? `İlk denklem sağlandı ama $a+3b=${fmt(r.e2)}$. İlk denklemin doğrusu üzerinde kalarak ilerle.` : r.e2 === 13 ? `İkinci denklem tamam, $2a+b=${fmt(r.e1)}$.` : 'İkisi de sağlanmıyor; önce birini sağla, sonra o doğru üzerinde kay.',
        success: 'Kesişim $(4,3)$: $5b=15$ → $b=3$, $a=4$.',
      },
      reasons: [
        {
          question: 'Neden iki denklem gerekir?',
          options: ['Tek denklem bir doğru boyunca sonsuz çift verir; ikinci denklem kesişim noktasını seçer.', 'Denklemler her zaman çift sayıda yazılır.', 'İkinci denklem yalnız kontrol içindir.'],
          answer: 0,
          feedback: ['', 'Sayı kuralı değil; bilinmeyen sayısı kadar bağımsız bilgi gerekir.', 'Deneyde ilk denklemi sağlayan $(5,1)$ ikinciyi sağlamadı; ikinci denklem çözümü belirliyor.'],
        },
        {
          question: 'Yok etme adımı hangisidir?',
          options: ['İkinci denklemi 2 ile çarp ($2a+6b=26$), birinciyi çıkar: $5b=15$.', 'İki denklemi toplayıp 2’ye böl.', 'Yalnız sol tarafları çıkar.'],
          answer: 0,
          feedback: ['', '$3a+4b=24$ bulunur; bilinmeyen yok olmaz.', 'Sağ tarafları da çıkar; yoksa eşitlik bozulur.'],
        },
      ],
      proof: '$a+3b=13$’ü 2 ile çarp: $2a+6b=26$. Bundan $2a+b=11$’i çıkar: $5b=15$, $b=3$; $a=13-9=4$. İki doğru tek noktada kesişir çünkü eğimleri farklı ($-2$ ve $-\\tfrac13$).',
      rule: 'Bir bilinmeyenin katsayılarını eşitle, denklemleri çıkar (ya da birini yalnız bırakıp yerine koy). İstenen $a+b$ gibi bir ifadeyse önce denklemleri toplamayı/çıkarmayı dene.',
      condition: 'Denklemler birbirinin katı olmamalı (aksi hâlde sonsuz çözüm) ve çelişmemeli (paralel doğrular, çözüm yok).',
      trap: 'Çarparken yalnız sol tarafı çarpmak; bulunan değeri tek denklemde kontrol edip yetinmek.',
      transfer: [
        {
          id: 'sistem-yakin', level: 'Yakın alıştırma', text: '$x+y=10$ ve $x-y=4$ ise $x$ kaçtır?',
          options: ['$7$', '$3$', '$14$'], answer: 0,
          hints: ['İki denklemi topla.', '$2x=14$.', '$x=7$.'],
          feedback: ['$y=3$; kontrol: $7-3=4$.', '3, $y$’nin değeri; soru $x$’i soruyor.', '14, $2x$’in değeri; 2’ye böl.'],
        },
        {
          id: 'sistem-toplam', level: 'Kısa yol', text: '3 kalem + 2 defter = 34 TL, 2 kalem + 3 defter = 36 TL. 1 kalem + 1 defter kaç TL?',
          options: ['$14$', '$70$', '$12$'], answer: 0,
          hints: ['İki denklemi topla.', '$5k+5d=70$.', '$k+d=14$.'],
          feedback: ['Toplayınca katsayılar eşitlenir: $5(k+d)=70$.', '70, 5 kalem + 5 defter.', '$k=6$, $d=8$: toplam 14.'],
        },
        {
          id: 'sistem-uclu', level: 'Üç bilinmeyen', text: '$a+b=7$, $b+c=9$, $a+c=10$ ise $a+b+c$ kaçtır?',
          options: ['$13$', '$26$', '$9$'], answer: 0,
          hints: ['Üç denklemi topla.', '$2(a+b+c)=26$.', '$a+b+c=13$.'],
          feedback: ['Her harf iki kez sayıldı: $26/2$.', '26, $2(a+b+c)$; her harf iki kez sayıldı.', '9 yalnız $b+c$; $a$’yı da ekle.'],
        },
      ],
      real: [
        { code: 'TYT-0617', answer: 'E', from: 'esitsizlikler', why: 'Üç içecekten bileşen fiyatları için sistem kur; istenen karışımın fiyatını hesapla.' },
        { code: 'TYT-0626', answer: 'B', from: 'esitsizlikler', why: 'Doğru ve yanlış hesap için iki denklem; toplayıp çıkararak tereyi bul.' },
        { code: 'TYT-0609', answer: 'C', from: 'esitsizlikler', why: 'Eş aralık $\\theta$ ve boşluk $g$ için $\\theta+g=150$, $7\\theta+g=360$.' },
      ],
    },
    {
      id: 'ifade-degeri', label: 'İstenen ifade', short: 'Bilinmeyeni bulmadan',
      objective: 'İstenen ifadeyi verilen denklemin katı/birleşimi olarak yazar; bilinmeyenler tek tek bulunamasa da ifadenin değerini hesaplar.',
      misconception: 'Her soruda önce $x$ ve $y$’yi tek tek bulmaya çalışmak; bulunamayınca “belirlenemez” demek.',
      story: 'Bir duvara eş kare tablolar asılıyor; tablo kenarını kimse söylemiyor. Yine de duvarın kenarına kalan boşluğu hesaplayabilirsin. Nasıl?',
      predict: {
        question: '$2x+3y=12$ ise $4x+6y+1$ kaçtır? ($x$ ve $y$ ayrı ayrı bilinmiyor.)',
        options: ['$25$', 'Bulunamaz.', '$13$'],
        insight: [
          'Doğru: $4x+6y=2(2x+3y)=24$; $+1$ ile 25.',
          '$x$ ve $y$ bulunamaz ama ifadenin değeri bellidir; deneyde her nokta 24 verdi.',
          '$12+1$: ifade denklemin iki katı, 2 ile çarpmayı unutma.',
        ],
      },
      experiment: {
        prompt: 'Denklemi kaç katına alacağını seç; $4x+6y$ ifadesini elde et. Sonra $x$’i değiştirip değerin değişip değişmediğine bak.',
        view: 'multiple', visualLabel: 'k·(2x + 3y) = k·12',
        controls: [{ key: 'k', label: 'Kat $k$', min: 1, max: 4, step: 1 }, { key: 'x', label: 'Denklemi sağlayan bir $x$', min: -3, max: 6, step: 1 }],
        initial: { k: 1, x: 0 },
        compute: ({ k, x }) => { const y = (12 - 2 * x) / 3; return { k, x, y, lhs: [2 * k, 3 * k], rhs: 12 * k, target: 4 * x + 6 * y }; },
        readout: (_, r) => [['$k$ katı', `$${r.lhs[0]}x+${r.lhs[1]}y=${r.rhs}$`], ['Seçilen nokta', `$x=${fmt(r.x)}$, $y=${fmt(r.y, 2)}$`], ['$4x+6y$', fmt(r.target)]],
        target: {
          text: 'Hedef: sol taraf tam olarak $4x+6y$ olsun.',
          test: (_, r) => r.lhs[0] === 4 && r.lhs[1] === 6,
          example: { k: 2 },
          hint: '$4x$, $2x$’in kaç katı? $6y$, $3y$’nin kaç katı?',
        },
        diagnose: (_, r) => `$${r.lhs[0]}x+${r.lhs[1]}y$ elde edildi; katsayılar 4 ve 6 olmalı. ($x$ değişince $4x+6y$ yine ${fmt(r.target)} — fark ettin mi?)`,
        success: '$2(2x+3y)=24$: her $(x,y)$ çözümünde $4x+6y=24$.',
      },
      reasons: [
        {
          question: '$x$ ve $y$ bilinmeden değer nasıl bulundu?',
          options: ['İstenen ifade, verilen ifadenin 2 katı; denklemin iki tarafı 2 ile çarpılır.', '$x=0$ alınarak bulundu.', 'Tahminle bulundu.'],
          answer: 0,
          feedback: ['', 'Tek bir $x$ seçmek bir örnektir; değerin her çözümde aynı olduğunu gösteren, ifadenin denklemin katı olmasıdır.', 'Tahmin değil; cebirsel özdeşlik: $4x+6y=2(2x+3y)$.'],
        },
        {
          question: 'Hangi ifadenin değeri bu bilgiyle bulunamaz?',
          options: ['$4x+3y$', '$6x+9y$', '$-2x-3y$'],
          answer: 0,
          feedback: ['', '$6x+9y=3(2x+3y)=36$; bulunur.', '$-(2x+3y)=-12$; bulunur.'],
        },
      ],
      proof: '$2x+3y=12$’nin her çözümü için $4x+6y=2(2x+3y)=24$. $4x+3y=2(2x+3y)-3y=24-3y$ ise $y$’ye bağlıdır; $y$ bilinmediği için değeri sabit değildir.',
      rule: 'Önce istenen ifadeyi verilenlerin katı/toplamı olarak yazmayı dene; bilinmeyenler sadeleşiyorsa tek tek bulmaya gerek yok.',
      condition: 'İstenen ifade verilen ifadelerin doğrusal birleşimi olmalı. Değilse ek bilgi gerekir.',
      trap: 'Bir örnek nokta seçip sonucu genel sanmak (ifade katı değilse sonuç noktaya göre değişir).',
      transfer: [
        {
          id: 'ifade-yakin', level: 'Yakın alıştırma', text: '$a-2b=5$ ise $3a-6b-4$ kaçtır?',
          options: ['$11$', '$15$', '$1$'], answer: 0,
          hints: ['$3a-6b=3(a-2b)$.', '$3\\cdot5=15$.', '$15-4$.'],
          feedback: ['$15-4=11$.', '$3(a-2b)=15$ doğru ama sondaki $-4$’ü unuttun.', '$5-4$: önce 3 ile çarp.'],
        },
        {
          id: 'ifade-fark', level: 'İki denklemin farkı', text: '$x+y=6$ ve $y+z=8$ ise $x-z$ kaçtır?',
          options: ['$-2$', '$2$', '$14$'], answer: 0,
          hints: ['İlk denklemden ikinciyi çıkar.', '$(x+y)-(y+z)=6-8$.', '$y$ sadeleşir.'],
          feedback: ['$x-z=-2$.', 'Çıkarma sırası: $6-8$.', '14, iki denklemin toplamından gelir; fark istendi.'],
        },
        {
          id: 'ifade-duvar', level: 'Sadeleşen bilinmeyen', text: 'Bir ip iki eş parçaya ayrılıyor; parçalardan birine 3 m ip ekleniyor. İki parçanın farkı kaç metredir?',
          options: ['$3$', 'İpin boyu bilinmeden bulunamaz.', '$1{,}5$'], answer: 0,
          hints: ['Parça boyu $p$ olsun.', 'Parçalar $p$ ve $p+3$.', 'Fark $3$; $p$ sadeleşti.'],
          feedback: ['$(p+3)-p=3$.', 'Boy bilinmese de fark bellidir.', '3 m bölünmüyor; yalnız bir parçaya eklendi.'],
        },
      ],
      real: [
        { code: 'TYT-0629', answer: 'D', from: 'esitsizlikler', why: 'Tablo kenarı ve aralık bilinmiyor; satır denklemlerini taraf tarafa çıkarınca bilinmeyenler sadeleşir.' },
      ],
    },
  ],
};
