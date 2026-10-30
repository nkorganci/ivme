// Sınırlı ve deterministik görsel modeller. Kullanıcı girdisi kod olarak çalıştırılmaz.
const range = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
const select = (key, label, value, options) => ({ key, label, value, options });
const yesNo = [[0, 'Yanlış'], [1, 'Doğru']];
const variable = range('x', 'Girdi (x)', 2, -3, 5);
export const MODEL_CONTROLS = {
  'temel-kavramlar': [select('n', 'İnceleyeceğin sayı', 0, [[0, '3'], [1, '−3'], [2, '1/2'], [3, '√9'], [4, '√2'], [5, '0']])],
  'sayi-basamaklari': [range('a', 'Yüzler', 3, 1, 9), range('b', 'Onlar', 2, 0, 9), range('c', 'Birler', 4, 0, 9)],
  'bolme-bolunebilme': [range('n', 'Kitap sayısı', 23, 10, 30), range('d', 'Kutunun kapasitesi', 5, 2, 6)],
  'ebob-ekok': [range('d', 'Parça uzunluğu (cm)', 4, 1, 6)],
  'rasyonel-sayilar': [select('d', 'Bir bütündeki dilim sayısı', 2, [[2, '2 dilim'], [6, '6 dilim'], [12, '12 dilim']])],
  'uslu-ifadeler': [range('n', 'Üs', 3, 0, 5)],
  'koklu-ifadeler': [range('a', 'Karenin kenarı', 4, 1, 8)],
  'birinci-derece-denklemler': [range('s', 'İşlem adımı', 0, 0, 2)],
  'esitsizlikler': [select('s', 'İşlem', 0, [[0, 'Başlangıç: −2 < 3'], [1, 'İki tarafı −1 ile çarp']])],
  'mutlak-deger': [range('x', 'Noktanın konumu (x)', -1, -4, 8)],
  'oran-oranti': [range('k', 'Tarifin katı', 1, 1, 5)],
  'sayi-kesir-problemleri': [range('x', 'Saat sayısı', 2, 0, 6)],
  'yuzde-karisim': [range('p', 'Tuz yüzdesi (%)', 30, 0, 100, 5), range('n', 'Toplam karışım (g)', 200, 100, 400, 50)],
  'kar-zarar': [range('p', 'Maliyete göre kâr (%)', 25, 0, 50, 5)],
  'hareket-problemleri': [range('t', 'Geçen süre (saat)', 1, 0, 3, 0.25)],
  'yas-isci-problemleri': [range('t', 'Kaç yıl sonra?', 0, 0, 10)],
  'grafik-rutin-olmayan': [range('x', 'Yol (km)', 2, 0, 8)],
  'kumeler-temel': [range('n', 'Kümedeki eleman sayısı', 3, 1, 4)],
  'kume-islemleri': [select('op', 'Gösterilen bölge', 0, [[0, 'A ∪ B · birleşim'], [1, 'A ∩ B · kesişim'], [2, 'A − B · fark']])],
  'fonksiyon-kavrami': [variable],
  'bileske-ters': [variable, select('s', 'Makine sırası', 0, [[0, 'Önce +3, sonra ×2'], [1, 'Önce ×2, sonra +3']])],
  'fonksiyon-grafikleri': [variable],
  'polinom-islemleri': [range('x', 'x uzunluğu', 2, 1, 5)],
  'carpanlara-ayirma': [range('a', 'a uzunluğu', 4, 1, 6), range('b', 'b uzunluğu', 2, 1, 4)],
  'sayma-permutasyon': [range('a', 'Tişört seçeneği', 3, 1, 5), range('b', 'Pantolon seçeneği', 2, 1, 4)],
  'kombinasyon': [range('n', 'Kişi sayısı', 4, 2, 5)],
  'binom': [range('n', 'Parantez sayısı', 3, 1, 4)],
  'olasilik': [range('n', 'En az kaç gelsin?', 5, 1, 6)],
  'kosullu-olasilik': [select('s', 'Bilinen bilgi', 0, [[0, 'Koşul yok'], [1, 'Çift geldiği biliniyor']])],
  'onermeler': [select('p', 'p önermesi', 1, yesNo), select('q', 'q önermesi', 0, yesNo)],
  'kosullu-onerme': [select('p', 'p: koşul gerçekleşti', 1, yesNo), select('q', 'q: sonuç gerçekleşti', 0, yesNo)],
  'merkezi-egilim': [range('n', 'Son kişinin kitap sayısı', 6, 4, 30)],
  'veri-grafikleri': [range('p', 'Seçilen grubun yüzdesi (%)', 25, 0, 100, 5)],
};
export const initialValues = (id) => Object.fromEntries((MODEL_CONTROLS[id] ?? []).map((c) => [c.key, c.value]));
export const fmt = (n) => Number(n.toFixed(2)).toLocaleString('tr-TR');
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const fraction = (a, b) => { const g = gcd(a, b); return `${a / g}/${b / g}`; };

export function calculateModel(id, v) {
  switch (id) {
    case 'temel-kavramlar': {
      const values = [{ name: '3', tier: 0 }, { name: '−3', tier: 1 }, { name: '1/2', tier: 2 }, { name: '√9 = 3', tier: 0 }, { name: '√2', tier: 3 }, { name: '0', tier: 0 }];
      const item = values[v.n];
      return { kind: 'nested', ...item, equation: item.name,
        observation: item.tier === 3 ? '√2 gerçektir ama iki tam sayının oranı olarak yazılamaz; rasyonellerin dışındadır.' : `${item.name}: ${['doğal, tam, rasyonel ve gerçek', 'tam, rasyonel ve gerçek', 'rasyonel ve gerçek'][item.tier]} sayı. İçteki bir kutuya ait olmak, onu çevreleyen kutulara da ait olmaktır.` };
    }
    case 'sayi-basamaklari': return { kind: 'place', ...v, result: 100 * v.a + 10 * v.b + v.c,
      equation: `${v.a} × 100 + ${v.b} × 10 + ${v.c} = ${100 * v.a + 10 * v.b + v.c}`,
      observation: 'Yüzler kutusundaki her bir rakam artışı 100; onlar kutusunda 10; birler kutusunda 1 ekler. Konum değeri değiştirir.' };
    case 'bolme-bolunebilme': {
      const q = Math.floor(v.n / v.d), r = v.n % v.d;
      return { kind: 'division', ...v, q, r, equation: `${v.n} = ${v.d} × ${q} + ${r}`,
        observation: `${q} tam kutu, ${r} artan kitap. ${r === 0 ? 'Artan olmadığı için tam bölünür.' : `Kalan ${r}, kutu kapasitesi ${v.d}’ten küçük; yeni kutu henüz dolmuyor.`}` };
    }
    case 'ebob-ekok': return { kind: 'rulers', ...v, exact: 12 % v.d === 0 && 18 % v.d === 0,
      equation: `12 = ${v.d} × ${Math.floor(12 / v.d)} + ${12 % v.d}   ·   18 = ${v.d} × ${Math.floor(18 / v.d)} + ${18 % v.d}`,
      observation: 12 % v.d || 18 % v.d ? 'En az bir şeritte artan var. Bu uzunluk ikisi için ortak bölen değil.' : `İkisi de kalansız bölündü. ${v.d === 6 ? '6 cm en uzun ortak parça; EBOB=6.' : 'Bu bir ortak bölen; daha uzun ortak parçayı aramaya devam et.'}` };
    case 'rasyonel-sayilar': return { kind: 'fractions', ...v, equation: v.d === 2 ? '1/2 + 1/3 → parçaları önce eşitle' : `${v.d / 2}/${v.d} + ${v.d / 3}/${v.d} = ${v.d * 5 / 6}/${v.d} = 5/6`,
      observation: v.d === 2 ? 'Üstteki yarım ve alttaki üçte bir farklı boyda parçalardan oluşuyor. 6 dilimi seçerek aynı ölçü birimine geç.' : 'Çizgiler çoğaldı ama boyalı miktarlar değişmedi. Payda ortak olduğunda paylar aynı boydaki parçaları sayar.' };
    case 'uslu-ifadeler': return { kind: 'power', ...v, result: 2 ** v.n, equation: `2${['⁰', '¹', '²', '³', '⁴', '⁵'][v.n]} = ${v.n ? Array(v.n).fill('2').join(' × ') : '1'}${v.n ? ` = ${2 ** v.n}` : ''}`,
      observation: v.n ? `${v.n} tane 2 çarpanı, ${2 ** v.n} birim üretir. Üsü bir artırmak miktarı 2 artırmaz; 2 katına çıkarır.` : 'Üs 1’den 0’a inerken 2’ye böleriz: 2÷2=1. Boş çarpımın başlangıç değeri 1’dir.' };
    case 'koklu-ifadeler': return { kind: 'square', ...v, result: v.a ** 2, equation: `${v.a} × ${v.a} = ${v.a ** 2}   ↔   √${v.a ** 2} = ${v.a}`,
      observation: `${v.a} satırın her birinde ${v.a} birim kare var. Alan ${v.a ** 2} birim²; kenar ${v.a} birim. Kök, alandan kenara dönüşü sorar.` };
    case 'birinci-derece-denklemler': return { kind: 'balance', ...v, equation: ['2x + 3 = 11', '2x = 8', 'x = 4'][v.s],
      observation: ['İki eş kutu ve üç birim, 11 birime eşit. Kutuların içindeki miktarı bilmiyoruz.', 'İki taraftan 3 çıkardık. Eşit miktarlar azaldığı için denge korunur; iki kutu toplam 8.', 'İki tarafı da 2’ye böldük. İki eş kutu 8 ise tek kutu 4.'][v.s] };
    case 'esitsizlikler': return { kind: 'line', a: v.s ? 2 : -2, b: v.s ? -3 : 3, min: -5, max: 5, labels: ['A', 'B'],
      equation: v.s ? '2 > −3' : '−2 < 3', observation: v.s ? '−1 ile çarpınca iki nokta da sıfıra göre yansıdı. A artık B’nin sağında, yani daha büyük. Eşitsizlik yönü bu yüzden döndü.' : 'A noktası B’nin solunda; A küçüktür B. Şimdi her iki değeri −1 ile çarp.' };
    case 'mutlak-deger': return { kind: 'line', a: 2, b: v.x, min: -4, max: 8, distance: Math.abs(v.x - 2), labels: ['Merkez 2', `x=${v.x}`],
      equation: `|${v.x} − 2| = ${Math.abs(v.x - 2)}`, observation: `${v.x}, 2’nin ${v.x === 2 ? 'tam üstünde' : v.x < 2 ? 'solunda' : 'sağında'}. Aradaki uzaklık ${Math.abs(v.x - 2)} birim; yön değişse de uzaklık negatif olmaz.` };
    case 'oran-oranti': return { kind: 'bars', values: [2 * v.k, 3 * v.k], max: 15, labels: ['Öz (bardak)', 'Su (bardak)'],
      equation: `${2 * v.k}/${3 * v.k} = 2/3   ·   toplam ${5 * v.k} bardak`, observation: `İki miktar da ${v.k} ile çarpıldı. Özün suya oranı 2/3; bütün içeceğe oranı ise 2/5. Aynı payda kullanılmaz.` };
    case 'sayi-kesir-problemleri': return { kind: 'machine', values: [v.x, 2 * v.x, 2 * v.x + 3], operations: ['×2', '+3'], equation: `2 × ${v.x} + 3 = ${2 * v.x + 3}`,
      observation: 2 * v.x + 3 === 11 ? 'Hedef 11’e ulaştın: 4 saat. Hem saatlik ücret hem sabit ücret hesaba katıldı.' : 'Önce saatlik 2 TL ile çarp, sonra sabit 3 TL ekle. Hedef 11 TL olacak saat sayısını ara.' };
    case 'yuzde-karisim': return { kind: 'hundred', ...v, result: v.p * v.n / 100, equation: `${v.n} × ${v.p}/100 = ${fmt(v.p * v.n / 100)} g tuz`,
      observation: `100 kutunun ${v.p} tanesi boyalı. Her kutu ${fmt(v.n / 100)} gramı temsil ediyor; kutu sayısı yüzdeyi, gram miktarı seçtiğin bütünü kullanır.` };
    case 'kar-zarar': return { kind: 'price', cost: 80, profit: 80 * v.p / 100, equation: `80 + ${fmt(80 * v.p / 100)} = ${fmt(80 * (1 + v.p / 100))} TL`,
      observation: `%${v.p} kârın referansı 80 TL maliyet. Kâr ${fmt(80 * v.p / 100)} TL; satış fiyatı maliyetle bu farkın toplamı.` };
    case 'hareket-problemleri': return { kind: 'motion', ...v, a: 60 * v.t, b: 300 - 40 * v.t, gap: 300 - 100 * v.t,
      equation: `${fmt(60 * v.t)} + ${fmt(40 * v.t)} + ${fmt(300 - 100 * v.t)} = 300 km`, observation: v.t === 3 ? 'Ara sıfırlandı: 3 saatte karşılaştılar. Soldan 180 km; orta nokta olan 150 km değil.' : `A ${fmt(60 * v.t)} km, B ${fmt(40 * v.t)} km ilerledi. Kalan ara ${fmt(300 - 100 * v.t)} km. Her saat 100 km kapanıyor.` };
    case 'yas-isci-problemleri': return { kind: 'bars', values: [8 + v.t, 14 + v.t], max: 24, labels: ['Küçük kardeş', 'Büyük kardeş'], equation: `${14 + v.t} − ${8 + v.t} = 6 yıl`,
      observation: `İkisi de ${v.t} yıl büyüdü. Fark hâlâ 6; toplam ${22 + 2 * v.t}. Küçüğün büyüğe yaş oranı ${8 + v.t}/${14 + v.t}; bu oran sabit değil.` };
    case 'grafik-rutin-olmayan': return { kind: 'graph', ...v, slope: 10, intercept: 30, minX: 0, maxX: 8, minY: 0, maxY: 120, xLabel: 'Yol (km)', yLabel: 'Ücret (TL)',
      equation: `Ücret = 30 + 10 × ${v.x} = ${30 + 10 * v.x} TL`, observation: 'Çizgi (0,30)’dan başlar; yol sıfırken bile açılış ücreti var. Bir km sağa gidince 10 TL yukarı çıkar; ücret/yol oranı sabit değildir.' };
    case 'kumeler-temel': return { kind: 'subsets', ...v, subsets: Array.from({ length: 2 ** v.n }, (_, mask) => 'ABCD'.slice(0, v.n).split('').filter((_, i) => mask & (1 << i)).join(', ')),
      equation: `2${['', '¹', '²', '³', '⁴'][v.n]} = ${2 ** v.n} alt küme`, observation: 'Her eleman için al/alma kararı var. Boş küme hiçbirini almadığın, kümenin kendisi hepsini aldığın durum. Bir yeni eleman her eski seçeneği ikiye ayırır.' };
    case 'kume-islemleri': return { kind: 'venn', ...v, regions: v.op === 0 ? [true, true, true] : v.op === 1 ? [false, true, false] : [true, false, false],
      equation: ['8 + 4 + 6 = 18 kişi', 'Ortak: 4 kişi', 'Yalnız A: 12 − 4 = 8 kişi'][v.op], observation: ['A’da 12, B’de 10 kişi var. Ortadaki 4 kişi her iki listede; birleşimde bir kez sayılır.', 'Yalnız hem A’da hem B’de bulunan kişiler seçildi. “Ve” ortak bölgeyi ister.', 'A’nın içinden B’ye de ait olanları çıkardık. A−B, B−A ile aynı değildir.'][v.op] };
    case 'fonksiyon-kavrami': return { kind: 'machine', values: [v.x, 2 * v.x, 2 * v.x + 3], operations: ['×2', '+3'], equation: `f(${v.x}) = 2 × (${v.x}) + 3 = ${2 * v.x + 3}`, observation: 'Her girdi bu kuralla tek bir çıktı üretiyor. f(x) çarpım değil, makinenin verdiği sonucun adı.' };
    case 'bileske-ters': return { kind: 'machine', values: [v.x, v.s ? 2 * v.x : v.x + 3, v.s ? 2 * v.x + 3 : 2 * (v.x + 3)], operations: v.s ? ['×2', '+3'] : ['+3', '×2'],
      equation: v.s ? `g(f(${v.x})) = ${2 * v.x + 3}` : `f(g(${v.x})) = ${2 * (v.x + 3)}`, observation: `Aynı girdide diğer sıra ${v.s ? 2 * (v.x + 3) : 2 * v.x + 3} verir. Önce +3 yaparsan bu eklenen 3 de sonraki ×2 işlemine girer; fark buradan doğar.` };
    case 'fonksiyon-grafikleri': return { kind: 'graph', ...v, slope: 2, intercept: 1, minX: -3, maxX: 5, minY: -6, maxY: 12, xLabel: 'Girdi x', yLabel: 'Çıktı y',
      equation: `(${v.x}, ${2 * v.x + 1})   ·   f(${v.x}) = ${2 * v.x + 1}`, observation: 'Kesikli çizgiler noktadan eksenlere nasıl okunacağını gösteriyor. Yatay konum girdi; dikey konum çıktı. x bir artınca y iki artar.' };
    case 'polinom-islemleri': return { kind: 'polynomial', ...v, result: v.x ** 2 + v.x + 1, equation: `x² + x + 1 = ${v.x ** 2} + ${v.x} + 1 = ${v.x ** 2 + v.x + 1}`, observation: 'Kare x², şerit x, küçük kare 1. Aynı tür terimleri birleştirebiliriz; farklı türleri tek bir katsayıya toplayamayız.' };
    case 'carpanlara-ayirma': return { kind: 'area', ...v, equation: `(${v.a}+${v.b})² = ${v.a ** 2} + ${v.a * v.b} + ${v.a * v.b} + ${v.b ** 2} = ${(v.a + v.b) ** 2}`, observation: 'İki çapraz dikdörtgenin alanları eşit: her biri a×b. Bu nedenle toplamda 2ab var. Köşelerdeki iki kareyi toplamak bu alanları atlar.' };
    case 'sayma-permutasyon': return { kind: 'choices', rows: v.a, cols: v.b, equation: `${v.a} × ${v.b} = ${v.a * v.b} kıyafet`, observation: `Her tişört için ${v.b} pantolon seçeneği var. ${v.a} satırın her biri aynı sayıda eşleşme üretir. Hücreleri tek tek sayarak çarpımı kontrol et.` };
    case 'kombinasyon': return { kind: 'pairs', ...v, result: v.n * (v.n - 1) / 2, equation: `${v.n} × ${v.n - 1} ÷ 2 = ${v.n * (v.n - 1) / 2} ekip`, observation: 'Köşegende aynı kişi iki kez seçiliyor: geçersiz. Köşegenin iki yanındaki AB ve BA aynı ekip; yalnız bir tarafı sayıyoruz.' };
    case 'binom': {
      const paths = Array.from({ length: 2 ** v.n }, (_, i) => Array.from({ length: v.n }, (_, j) => i & (1 << j) ? 'B' : 'A').join(''));
      const counts = Array.from({ length: v.n + 1 }, (_, k) => paths.filter((p) => [...p].filter((c) => c === 'B').length === k).length);
      return { kind: 'binomial', ...v, paths, counts, equation: `Katsayılar: ${counts.join(' · ')}   |   Toplam yol: ${2 ** v.n}`, observation: 'Her parantezden A veya B seçiliyor. Aynı sayıda B içeren yollar aynı terimi üretir. Bu yolların sayısı o terimin katsayısıdır.' };
    }
    case 'olasilik': return { kind: 'dice', available: [1, 2, 3, 4, 5, 6], desired: [1, 2, 3, 4, 5, 6].filter((i) => i >= v.n), equation: `P(en az ${v.n}) = ${7 - v.n}/6 = ${fraction(7 - v.n, 6)}`, observation: `${7 - v.n} uygun yüz / 6 eş olasılıklı yüz. “En az ${v.n}” ifadesi ${v.n}’i de içerir.` };
    case 'kosullu-olasilik': return { kind: 'dice', available: v.s ? [2, 4, 6] : [1, 2, 3, 4, 5, 6], desired: v.s ? [6] : [5, 6], equation: v.s ? 'P(4’ten büyük | çift) = 1/3' : 'P(4’ten büyük) = 2/6 = 1/3', observation: v.s ? 'Koşul nedeniyle 1,3,5 dışarıda. Payda 3; bunlar içinde uygun olan yalnız 6. Oran aynı çıksa da pay ve payda değişti.' : 'Koşul yok: altı yüz de mümkün. 5 ve 6 istenenler. Şimdi “çift geldi” bilgisini ekle.' };
    case 'onermeler': return { kind: 'logic', ...v, conditional: false, results: [!!(v.p && v.q), !!(v.p || v.q)], equation: `p ∧ q = ${v.p && v.q ? 1 : 0}   ·   p ∨ q = ${v.p || v.q ? 1 : 0}`, observation: 'Ve için iki koşul birlikte gerekli. Veya için en az biri yeterli. Yeşil/✓ doğru, taralı/× yanlış; yalnız renge bakmadan da okuyabilirsin.' };
    case 'kosullu-onerme': return { kind: 'logic', ...v, conditional: true, results: [!v.p || !!v.q], equation: `p ⇒ q = ${!v.p || v.q ? 1 : 0}`, observation: v.p && !v.q ? 'Koşul gerçekleşti ama söz verilen sonuç gerçekleşmedi. Sözün bozulduğu tek durum bu.' : 'Bu durumda koşullu söz bozulmuyor. p yanlışken bu söz q’nun ne olacağını belirlemez.' };
    case 'merkezi-egilim': return { kind: 'mean', values: [2, 4, 4, v.n], mean: (10 + v.n) / 4, median: 4, equation: `Ortalama = (2+4+4+${v.n})/4 = ${fmt((10 + v.n) / 4)}   ·   Ortanca = 4`, observation: 'Son değeri büyütünce ortalama yükselir. Ortadaki iki değer 4 kaldığı için ortanca değişmez. Uç değer ortalamayı kendine doğru çeker.' };
    case 'veri-grafikleri': return { kind: 'pie', ...v, angle: v.p * 3.6, count: 120 * v.p / 100, equation: `%${v.p} → ${fmt(v.p * 3.6)}° → ${120 * v.p / 100} kişi (120 kişide)`, observation: 'Dilim, 360°’nin hangi payıysa kişi sayısı da 120’nin aynı payıdır. Bütün değişseydi aynı açı farklı kişi sayısına karşılık gelirdi.' };
    default: throw new Error(`Görsel model eksik: ${id}`);
  }
}
