// Fizik · Hareket ünitesinin interaktif içeriği: laboratuvar hazırları, soru stüdyosu, görevler
// ve kalıp haritası. Saf veri + küçük denetim işlevleri; JSX yok (node testleri de içe aktarır).
import { fmt, isConstantVelocity, keepsDirection, meetings, motionOf, statsAt } from './model.js';

const car = (id, tone, nodes, extra = {}) => ({ id, label: id, tone, x0: 0, nodes, shape: 'car', ...extra });
const ball = (id, tone, nodes, extra = {}) => ({ id, label: id, tone, x0: 0, nodes, shape: 'ball', ...extra });
const grid = (dt = 1, dv = 1, dx = 5) => ({ dt, dv, dx });
const near = (value, expected, tolerance) => Math.abs(value - expected) <= tolerance;

export const UNIT = {
  id: 'hareket',
  subject: 'fizik',
  subjectName: 'Fizik',
  title: 'Hareket: konum, hız ve ivme',
  exams: 'TYT Hareket · AYT Bir boyutta sabit ivmeli hareket',
  summary: 'Bir aracı yolda gör, hız grafiğini elinle değiştir; konum, hız ve ivme grafikleri ve sahne birlikte değişsin. Çıkmış sorular aynı laboratuvarda modele dökülerek çözülür.',
};

/* ------------------------------------------------------------------ Laboratuvar hazırları */

const FREE_EDIT = { lockT: false, allowInsert: true, x0: true };

export const PRESETS = [
  { id: 'bos', title: 'İki araç: kendin kur', note: 'Noktaları sürükle, yeni nokta ekle, başlangıç konumlarını değiştir.',
    scenario: { T: 20, grid: grid(1, 1, 5), vRange: [-20, 30], strobe: 2, step: 1, bodies: [car('K', 'red', [[0, 10], [20, 10]]), car('L', 'blue', [[0, 0], [20, 20]])] } },
  { id: 'sabit', title: 'Sabit hız', note: 'İz eşit aralıklı; x–t düz çizgi; v–t yatay; a = 0.',
    scenario: { T: 10, grid: grid(1, 1), vRange: [-15, 15], strobe: 1, bodies: [car('K', 'red', [[0, 8], [10, 8]])] } },
  { id: 'hizlanan', title: 'Düzgün hızlanan', note: 'İz açılıyor; x–t yukarı kıvrılıyor; v–t yükselen doğru.',
    scenario: { T: 10, grid: grid(1, 1), vRange: [-5, 25], strobe: 1, bodies: [car('K', 'red', [[0, 0], [10, 20]])] } },
  { id: 'duran', title: 'Yavaşlayıp duran', note: 'v ve a zıt yönlü: araç yavaşlar; v = 0 olunca durur.',
    scenario: { T: 10, grid: grid(1, 1), vRange: [-5, 25], strobe: 1, bodies: [car('K', 'red', [[0, 20], [8, 0], [10, 0]])] } },
  { id: 'donen', title: 'Yön değiştiren', note: 'v–t ekseni kestiği anda araç döner; x–t tepe yapar.',
    scenario: { T: 10, grid: grid(1, 1), vRange: [-15, 15], strobe: 1, layers: { area: true }, bodies: [car('K', 'red', [[0, 10], [10, -10]])] } },
  { id: 'ayt2023', title: 'AYT 2023: iki araç', note: 'Hızlar 20. saniyede eşit, araçlar 30. saniyede yan yana.',
    scenario: { T: 30, grid: grid(1, 1), vRange: [-10, 25], strobe: 3, step: 1, layers: { area: true }, bodies: [car('K', 'red', [[0, 0], [15, 20], [30, 0]]), car('L', 'blue', [[0, 0], [30, 20]])] } },
  { id: 'yetisme', title: 'Önden giden araca yetişme', note: 'K 50 m önde; L duruştan hızlanıyor. Ne zaman yetişir?',
    scenario: { T: 20, grid: grid(1, 1, 5), vRange: [-5, 25], strobe: 2, step: 1, bodies: [car('K', 'red', [[0, 5], [20, 5]], { x0: 50 }), car('L', 'blue', [[0, 0], [20, 20]])] } },
  { id: 'dusme', title: 'Serbest düşme (dikey)', note: 'Yukarı +: ivme −10 m/s². Top ve tüy birlikte düşer.',
    scenario: { T: 1, orientation: 'vertical', grid: grid(0.1, 1, 1), vRange: [-15, 5], strobe: 0.1, step: 0.1,
      bodies: [ball('K', 'red', [[0, 0], [1, -10]], { x0: 5, name: 'Top (1 kg)', mass: 1 }), ball('L', 'blue', [[0, 0], [1, -10]], { x0: 5, name: 'Tüy (1 g)', mass: 0.001 })] } },
];
export const FREE_EDITABLE = FREE_EDIT;

/* ------------------------------------------------------------------ Soru stüdyosu */

const YES_NO = { yes: 'Doğru', no: 'Yanlış' };

const S1_TARGET = { T: 30, grid: grid(1, 1), vRange: [-10, 25], strobe: 3, step: 1,
  bodies: [car('K', 'red', [[0, 0], [15, 20], [30, 0]]), car('L', 'blue', [[0, 0], [30, 20]])] };

const S3_BASE = (back1, back2) => ({ T: 8, units: { t: 'h', x: 'km' }, grid: grid(0.5, 0.5, 1), vRange: [-4, 4], strobe: 1, step: 0.5,
  bodies: [ball('A', 'green', [[0, 0], [0.5, 2], [2, 2], [2.5, 0], [5.5, 0], [6, back1], [7.5, back2], [8, 0]], { name: 'Ali' })] });

const S4_BASE = (nodes) => ({ T: 30, grid: grid(1, 1), vRange: [-15, 25], strobe: 3, step: 1, layers: { disp: true }, bodies: [car('K', 'red', nodes, { name: 'Otomobil' })] });
const S5_BASE = (middle, ends = [4, 12]) => ({ T: 10, grid: grid(1, 1), vRange: [-6, 20], strobe: 1, layers: { area: true },
  bodies: [car('K', 'red', [[0, ends[0]], [5, middle], [10, ends[1]]], { name: 'Otomobil' })] });

const S6_MAKE = ({ v0, a, T }) => ({ T, grid: grid(1, 1), vRange: [-15, 15], strobe: 1, step: 1, layers: { arrows: true },
  bodies: [car('K', 'red', [[0, v0], [T, v0 + a * T]], { name: 'Araç' })] });

function fallTime(h, v0, a) {
  const disc = v0 * v0 - 2 * a * h;
  if (a >= 0 || disc < 0) return null;
  return (-v0 - Math.sqrt(disc)) / a;
}
const S7_MAKE = ({ h, v0, a }) => {
  const T = Number(fallTime(h, v0, a).toFixed(6));
  return { T, orientation: 'vertical', grid: grid(0.1, 1, 1), vRange: [-15, 5], strobe: 0.1, step: 0.1,
    bodies: [ball('K', 'red', [[0, v0], [T, v0 + a * T]], { x0: h, name: 'Top (1 kg)', mass: 1 }),
      ball('L', 'blue', [[0, v0], [T, v0 + a * T]], { x0: h, name: 'Tüy (1 g)', mass: 0.001 })] };
};

export const STUDIO = [
  {
    id: 'iki-arac-alan',
    title: 'İki araç, tek v–t grafiği',
    source: { code: 'AYT_Sayisal-0362', label: 'AYT 2023' },
    pattern: 'alan',
    stem: 'Başlangıçta (t = 0) yan yana durmaktayken doğrusal yatay bir yolda harekete başlayan K ve L otomobillerinin hız–zaman grafiği veriliyor: K\'nin hızı 15. saniyede 20 m/s\'ye çıkıp 30. saniyede sıfıra iniyor; L\'nin hızı 30 saniyede düzgün olarak 20 m/s\'ye çıkıyor.',
    statements: [
      { id: 'I', text: 'K otomobili önce hızlanmış daha sonra yavaşlayıp durmuştur.', truth: true, why: 'Hız 0 → 20 artıyor, sonra 20 → 0 azalıyor; 30. saniyede sıfır: durmuş.' },
      { id: 'II', text: 'K otomobili 30. saniyede başlangıç konumuna geri dönmüştür.', truth: false, why: 'Hız hiç negatif olmadı; K 300 m ileride durdu.' },
      { id: 'III', text: '30. saniyede L otomobili K otomobilinden daha ileridedir.', truth: false, why: 'Alanlar eşit (300 m = 300 m): yan yanalar.' },
    ],
    statementLabels: YES_NO,
    ask: 'yargılarından hangileri doğrudur?',
    choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'Yalnız III', D: 'I ve II', E: 'I ve III' },
    answer: 'A',
    recognize: {
      prompt: '"Kim nerede?" sorusunu v–t grafiğinde neye bakarak çözersin?',
      options: [
        { text: 'Grafiğin altında kalan alana', correct: true, feedback: 'Evet: v–t grafiğinde alan = yer değiştirme. "Yan yana", "ileride", "başlangıca döndü" hep konum sorusudur.' },
        { text: 'Çizgilerin kesiştiği noktaya', correct: false, feedback: 'Kesişme hızların eşit olduğu andır, yan yana gelme anı değil. Bu sorunun tuzağı tam olarak bu.' },
        { text: 'Grafiğin en yüksek noktasına', correct: false, feedback: 'En yüksek nokta en büyük hızı söyler; konum hakkında bir şey söylemez.' },
      ],
    },
    build: {
      mode: 'match',
      intro: 'Sorudaki grafiği oku: K ve L\'nin içi boş noktalarını doğru hız değerlerine sürükle, sonra "Kontrol et".',
      start: { ...S1_TARGET, bodies: [car('K', 'red', [[0, 0], [15, 0], [30, 0]]), car('L', 'blue', [[0, 0], [30, 0]])] },
      editable: { lockT: true, locked: { K: [0], L: [0] } },
      solution: S1_TARGET,
    },
    observe: [
      { t: 15, layers: { arrows: true, area: false }, text: 't = 15 s: K en büyük hızına (20 m/s) ulaştı. Bundan sonra yavaşlıyor ama hızı hâlâ pozitif: K ileri gitmeye devam ediyor.' },
      { t: 20, layers: { area: true }, text: 't = 20 s: hızlar eşit (13,3 m/s). Yan yana değiller; tam tersine K\'nin öndeliği en büyük: 100 m. Hızlar eşitken ara ne açılır ne kapanır.' },
      { t: 30, layers: { area: true, disp: true }, text: 't = 30 s: K durdu ve hiç geri gitmedi, 300 m ileride. L\'nin alanı da 300 m: ikisi yan yana. II ve III yanlış.' },
    ],
    solution: [
      'I: K\'nin hızı önce artıyor, sonra azalıp 30. saniyede sıfır oluyor → doğru.',
      'II: Geri dönmek için hızın negatif olması gerekir. K\'nin hızı hiç eksiye inmiyor; alan 300 m → yanlış.',
      'III: L\'nin alanı ½·30·20 = 300 m, K\'nin alanı ½·30·20 = 300 m. Aynı yerden başladılar → yan yanalar, yanlış.',
      'Cevap: Yalnız I (A).',
    ],
    rule: 'v–t grafiğinde konum sorulursa alana bak. Aynı yerden başlayan iki araç, alanları eşitlendiği anda yan yana gelir. Hızların eşit olduğu an, aradaki uzaklığın en büyük ya da en küçük olduğu andır.',
    trap: '"Grafik aşağı iniyor, araç geri dönüyor" sanmak. Aşağı inen hız grafiği yavaşlamadır; geri dönüş ancak grafik zaman eksenini kesip negatife geçince başlar.',
    explain: {
      prompt: 'II. yargı neden yanlış?',
      options: [
        { text: 'K\'nin hızı hiç negatif olmadı; hep ileri gitti ve 300 m ötede durdu.', correct: true, feedback: 'Tam olarak bu. Yönü hızın işareti belirler; konumu alan.' },
        { text: '30. saniyede hızı sıfır olduğu için başlangıçta değildir.', correct: false, feedback: 'Hızın sıfır olması yalnız durduğunu söyler; nerede durduğunu alan söyler.' },
        { text: 'İvmesi negatif olduğu için geri gitmiştir.', correct: false, feedback: 'Negatif ivme hızın azaldığını söyler, yönün değiştiğini değil. Hız pozitif kaldıkça araç ileri gider.' },
      ],
    },
    twin: {
      stem: 'Aynı noktadan aynı anda harekete geçen iki araçtan K, 10 m/s sabit hızla; L ise duruştan başlayıp 2 m/s² sabit ivmeyle aynı yönde gidiyor. L, K\'ye kaçıncı saniyede yetişir?',
      choices: { A: '5', B: '10', C: '15', D: '20', E: '25' },
      answer: 'B',
      explanation: 'Hızlar 5. saniyede eşitlenir; o an ara en büyüktür (25 m), yetişme değil. Alanlar eşitlenince yetişir: 10·t = ½·2·t² → t = 10 s (ikisi de 100 m).',
      scenario: { T: 14, grid: grid(1, 1), vRange: [0, 30], strobe: 2, step: 1, layers: { area: true }, bodies: [car('K', 'red', [[0, 10], [14, 10]]), car('L', 'blue', [[0, 0], [14, 28]])] },
    },
  },
  {
    id: 'tablodan-grafige',
    title: 'Tablodan sürat grafiğine',
    source: { code: 'TYT-0909', label: 'TYT 2018' },
    pattern: 'egim',
    stem: 'Bir hareketlinin zamana göre aldığı yol tabloda verilmiştir: t = 0, 1, 2, 3, 4 s anlarında yol 0, 5, 10, 15, 20 m. Bu hareketlinin sürat–zaman grafiği hangisi gibi olabilir?',
    ask: 'Şıklardaki grafiklerden hangisi?',
    choices: { A: '6 m/s\'de yatay çizgi', B: '0\'dan 20 m/s\'ye yükselen doğru', C: '5 m/s\'de yatay çizgi', D: '0\'dan 8 m/s\'ye yükselen doğru', E: '3 m/s\'de yatay çizgi' },
    answer: 'C',
    recognize: {
      prompt: 'Yol tablosundan sürat grafiğine geçerken hangi ilişkiyi kullanırsın?',
      options: [
        { text: 'Her saniyede alınan yol = sürat (x–t eğimi)', correct: true, feedback: 'Evet: sürat, yolun ne kadar hızlı arttığıdır; yani x–t grafiğinin eğimi.' },
        { text: 'Tablodaki yol değerlerini doğrudan sürat eksenine yazarım', correct: false, feedback: 'Bu, grafiği resim gibi okumaktır: yolun değerleri süratin değeri değildir (B şıkkının tuzağı).' },
        { text: 'Toplam yolu toplam süreye bölerim, o kadar', correct: false, feedback: 'Bu ortalama sürati verir; süratin zamanla değişip değişmediğini söylemez. Her aralığa ayrı bakmalısın.' },
      ],
    },
    build: {
      mode: 'points',
      intro: 'x–t grafiğindeki kesikli halkalar tablodaki noktalar. v–t noktalarını sürükle; x–t çizgin bütün halkalardan geçsin.',
      start: { T: 4, grid: grid(1, 1), vRange: [-2, 12], strobe: 1, step: 1, target: { kind: 'x-points', points: [[1, 5], [2, 10], [3, 15], [4, 20]] },
        bodies: [car('K', 'red', [[0, 0], [2, 0], [4, 0]], { name: 'Hareketli' })] },
      editable: { lockT: true },
      solution: { T: 4, grid: grid(1, 1), vRange: [-2, 12], strobe: 1, step: 1, target: { kind: 'x-points', points: [[1, 5], [2, 10], [3, 15], [4, 20]] },
        bodies: [car('K', 'red', [[0, 5], [2, 5], [4, 5]], { name: 'Hareketli' })] },
    },
    observe: [
      { t: 4, layers: { strobe: true, slope: false }, text: 'İz noktaları eşit aralıklı: her saniye 5 m. Eşit sürede eşit yol = sabit sürat.' },
      { t: 2, layers: { slope: true }, text: 'x–t bir doğru; eğimi her yerde aynı: 10 m / 2 s = 5 m/s. v–t\'de bu, 5 yüksekliğinde yatay çizgidir.' },
      { t: 4, layers: { area: true, slope: false }, text: 'Ters yönden sağlama: v–t\'nin altındaki alan 5 · 4 = 20 m; tablonun son değeri.' },
    ],
    solution: [
      'Her saniyede alınan yol: 5, 5, 5, 5 m → sürat sabit.',
      'Sürat = 5 m / 1 s = 5 m/s → v–t\'de 5 m/s\'de yatay çizgi.',
      'Sağlama: alan 5 · 4 = 20 m, tabloyla aynı. Cevap C.',
    ],
    rule: 'Grafik çevirme: x–t\'nin eğimi hızı, v–t\'nin eğimi ivmeyi, v–t\'nin alanı yer değiştirmeyi verir. Eşit aralıklı iz sabit hız, açılan iz hızlanma, kapanan iz yavaşlama demektir.',
    trap: 'Grafiği resim gibi okumak: bir grafikteki sayıları (burada yol değerlerini) olduğu gibi başka bir grafiğin eksenine taşımak.',
    explain: {
      prompt: 'Yol sürekli arttığı hâlde sürat neden artmıyor?',
      options: [
        { text: 'Yolun artış hızı sabit: her saniye aynı 5 m ekleniyor.', correct: true, feedback: 'Evet. Sürat yolun büyüklüğü değil, büyüme hızıdır.' },
        { text: 'Yol arttıkça sürat de artar; tablo yanlış olmalı.', correct: false, feedback: 'Yolun büyümesi değil, ne kadar hızlı büyüdüğü sürattir. "Hızlı büyüme" eğimdir.' },
        { text: 'İvme verilmediği için sürat değişemez.', correct: false, feedback: 'İvme verilmese de tablodan bulunur: eşit aralıklarla aynı yol → ivme sıfır. Gerekçe tablodan gelmeli.' },
      ],
    },
    twin: {
      stem: 'Bir hareketlinin t = 0, 1, 2, 3, 4 s anlarındaki konumları 0, 2, 8, 18, 32 m\'dir. Hareketli t = 0 anında duruyorsa hız–zaman grafiği nasıldır?',
      choices: { A: '2 m/s\'de yatay çizgi', B: '0\'dan başlayıp her saniye 4 m/s artan doğru', C: '0\'dan başlayıp her saniye 2 m/s artan doğru', D: '8 m/s\'de yatay çizgi', E: '0\'dan 32 m/s\'ye yükselen doğru' },
      answer: 'B',
      explanation: 'Her saniyede alınan yollar 2, 6, 10, 14 m: her saniye 4 m fazla. Açılan iz düzgün hızlanmadır: a = 4 m/s², v = 4t. Sağlama: alan ½ · 4 · 16 = 32 m.',
      scenario: { T: 4, grid: grid(1, 1), vRange: [0, 20], strobe: 1, step: 1, layers: { area: true }, target: { kind: 'x-points', points: [[1, 2], [2, 8], [3, 18], [4, 32]] },
        bodies: [car('K', 'red', [[0, 0], [4, 16]], { name: 'Hareketli' })] },
    },
  },
  {
    id: 'eve-donen-ali',
    title: 'Eve dönen Ali: ortalama hız',
    source: { code: 'TYT-0912', label: 'TYT 2025' },
    pattern: 'yol-yer',
    stem: 'Ali saat 08.00\'de evinin dış kapısından çıkıyor ve 16.00\'da aynı noktaya geri dönüyor. Akıllı saati bu sürede 10.000 adım attığını gösteriyor. Ali\'nin bir adımı ortalama 80 cm olduğuna göre bu saatler arasındaki ortalama hızının büyüklüğü kaç km/h\'tir?',
    ask: 'Ortalama hızın büyüklüğü kaç km/h?',
    choices: { A: '0', B: '2', C: '4', D: '6', E: '8' },
    answer: 'A',
    recognize: {
      prompt: 'Soru "ortalama hız" istiyor. Hangi bilgi belirleyicidir?',
      options: [
        { text: 'Başladığı ve bitirdiği yer (aynı kapı)', correct: true, feedback: 'Evet: ortalama hız = yer değiştirme / süre. Aynı kapıya dönen için yer değiştirme sıfırdır.' },
        { text: 'Adım sayısı ve adım boyu', correct: false, feedback: 'Bunlar alınan yolu (8 km) verir; o da ortalama sürat için gerekir, ortalama hız için değil.' },
        { text: 'Gün içinde ne kadar hızlı yürüdüğü', correct: false, feedback: 'Anlık hızlar ortalama hızı belirlemez; yalnız başlangıç ve bitiş noktası önemlidir.' },
      ],
    },
    build: {
      mode: 'constraint',
      intro: 'Ali\'nin dönüş yürüyüşü eksik: 16.00\'da kapıya varamıyor. Dönüşteki iki noktayı sürükleyip onu kapıya getir. Sonra başka bir dönüş biçimi dene.',
      start: S3_BASE(-1, -1),
      editable: { lockT: true, locked: { A: [0, 1, 2, 3, 4, 7] } },
      checks: [
        { id: 'home', label: '16.00\'da (t = 8 h) kapıda: x = 0', test: (motions) => near(motions[0].x(8), 0, 0.05) },
      ],
      found: [
        { id: 'home', label: 'Ali\'yi kapıya getirdin', test: (motions) => near(motions[0].x(8), 0, 0.05) },
        { id: 'second', label: 'Başka bir dönüş biçimiyle de kapıya getirdin: ortalama hız yine 0', test: (motions, scenario, memo) => {
          if (!near(motions[0].x(8), 0, 0.05)) return false;
          memo.routes ??= new Set();
          memo.routes.add(JSON.stringify(scenario.bodies[0].nodes));
          return memo.routes.size >= 2;
        } },
      ],
      require: ['home'],
      solution: S3_BASE(-2, -2),
    },
    observe: [
      { t: 2.5, text: 't = 2,5 h (10.30): Ali 4 km uzakta. Şimdiye kadarki ortalama hızı 4 km / 2,5 h = 1,6 km/h.' },
      { t: 5.5, text: 't = 5,5 h (13.30): Ali bir süredir duruyor (v = 0); yer değiştirmesi hâlâ +4 km.' },
      { t: 8, layers: { disp: true }, text: 't = 8 h (16.00): kapıda. Yer değiştirme 0 → ortalama hız 0. Alınan yol 8 km → ortalama sürat 1 km/h. Adımlar yolu verir, yer değiştirmeyi değil.' },
    ],
    solution: [
      'Ortalama hız = yer değiştirme / süre.',
      'Ali aynı kapıya döndü: yer değiştirme = 0 → ortalama hız = 0 (A).',
      'Adım bilgisi yolu verir: 10.000 · 0,8 m = 8 km → ortalama sürat 8 km / 8 h = 1 km/h. Soru ortalama hızı sorduğu için adım bilgisi çeldiricidir.',
    ],
    rule: 'Ortalama hız = yer değiştirme / süre (yönlüdür); ortalama sürat = alınan yol / süre. Başladığı yere dönen her hareketlinin ortalama hızı sıfırdır, yol ne kadar uzun olursa olsun.',
    trap: 'Soruda verilen her sayıyı kullanmak zorunda olduğunu düşünmek: adım sayısı ve adım boyu yalnız yolu, yani ortalama sürati bulmaya yarar.',
    explain: {
      prompt: 'Dönüş grafiğini değiştirdiğinde ortalama hız neden hep sıfır kaldı?',
      options: [
        { text: 'Kapıya döndüğü sürece yer değiştirme sıfır; ortalama hız yalnız ona bağlı.', correct: true, feedback: 'Evet. Yol uzayıp kısalabilir, ortalama hız değişmez.' },
        { text: 'Dönüşteki negatif hız gidişteki hızı sıfırlıyor.', correct: false, feedback: 'Hızlar toplanmaz; sıfırlanan, gidiş ve dönüşteki yer değiştirmelerin (alanların) toplamıdır.' },
        { text: 'Ali gün ortasında durduğu için.', correct: false, feedback: 'Durması ortalama hızı sıfırlamaz; bitiş noktası başlangıçla aynı olduğu için sıfırdır.' },
      ],
    },
    twin: {
      stem: 'Bir koşucu, 400 m\'lik pistte başladığı noktadan iki tam tur atarak 200 saniyede aynı noktaya dönüyor. Koşucunun ortalama sürati ve ortalama hızının büyüklüğü sırasıyla kaç m/s\'dir?',
      choices: { A: '0 ve 0', B: '4 ve 0', C: '4 ve 4', D: '2 ve 0', E: '0 ve 4' },
      answer: 'B',
      explanation: 'Yol 2 · 400 = 800 m → ortalama sürat 800 / 200 = 4 m/s. Başladığı noktaya döndü → yer değiştirme 0 → ortalama hız 0.',
    },
  },
  {
    id: 'kesinlikle-karsi-ornek',
    title: '"Kesinlikle": karşı örnek avı',
    source: { code: 'TYT-0911', label: 'TYT 2023' },
    pattern: 'kesin',
    stem: 'Otoyolda hareket eden bir otomobilin 30 saniye boyunca yaptığı toplam yer değiştirmenin büyüklüğü ile bu sürede aldığı toplam yolun birbirine eşit olduğu gözlenmiştir.',
    statements: [
      { id: 'I', text: 'Sabit hızla hareket etmiştir.', truth: false, why: 'Hızlanarak hep ileri giden araç da koşulu sağlar.' },
      { id: 'II', text: 'Sürekli aynı yönde gitmiştir.', truth: true, why: 'Yön değişirse geri gidilen kısım yola eklenir, yer değiştirmeden düşülür.' },
      { id: 'III', text: 'Doğrusal bir yolda hareket etmiştir.', truth: true, why: 'Eğri yolda yol her zaman yer değiştirmeden uzundur.' },
    ],
    statementLabels: { yes: 'Kesin', no: 'Kesin değil' },
    ask: 'yargılarından hangileri kesinlikle doğrudur?',
    choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'I ve II', D: 'II ve III', E: 'I, II ve III' },
    answer: 'D',
    recognize: {
      prompt: '"Kesinlikle doğrudur" ifadesini görünce ne yapmalısın?',
      options: [
        { text: 'Koşulu sağlayıp yargıyı bozan bir örnek (karşı örnek) aramalıyım.', correct: true, feedback: 'Evet. Karşı örnek bulursan yargı kesin değildir.' },
        { text: 'Aklıma gelen ilk örnekte yargılar doğruysa işaretlerim.', correct: false, feedback: 'İlk örnek (genelde sabit hız) her şeyi doğru gösterir; tuzak budur. Koşulu sağlayan başka hareketleri de denemelisin.' },
        { text: 'Formül yazıp hesap yaparım.', correct: false, feedback: 'Bu soruda sayı yok; yargıları örneklerle sınamak gerekir.' },
      ],
    },
    build: {
      mode: 'counterexample',
      intro: 'Laboratuvar "yer değiştirme = yol" koşulunu canlı denetliyor. 1) Koşulu bozmadan I\'i bozan bir hareket kur. 2) II\'yi bozmayı dene: bir noktayı sıfırın altına çek ve koşula bak.',
      start: S4_BASE([[0, 10], [10, 10], [20, 10], [30, 10]]),
      editable: { lockT: true },
      checks: [
        { id: 'cond', label: 'Koşul: |yer değiştirme| = yol', test: (motions) => { const s = statsAt(motions[0], 30); return near(Math.abs(s.disp), s.path, 0.5); } },
        { id: 'I', label: 'I. Hız sabit', test: (motions) => isConstantVelocity(motions[0]) },
        { id: 'II', label: 'II. Yön hiç değişmedi', test: (motions) => keepsDirection(motions[0]) },
      ],
      found: [
        { id: 'cexI', label: 'I için karşı örnek buldun: koşul sağlanıyor ama hız sabit değil → I kesin değil', test: (motions) => {
          const s = statsAt(motions[0], 30); return near(Math.abs(s.disp), s.path, 0.5) && !isConstantVelocity(motions[0]);
        } },
        { id: 'tryII', label: 'II\'yi bozdun: yön değişince koşul da bozuldu → II\'yi bozan her hareket koşulu da bozar', test: (motions) => !keepsDirection(motions[0]) },
      ],
      require: ['cexI', 'tryII'],
      note: 'III bu düz yol laboratuvarında sınanamaz: eğri bir yolda alınan yol, iki nokta arasındaki düz çizgiden (yer değiştirmeden) hep uzundur. Eşitlik varsa yol düz olmak zorunda.',
      solution: S4_BASE([[0, 0], [10, 10], [20, 20], [30, 20]]),
    },
    observe: [
      { scenario: S4_BASE([[0, 0], [10, 10], [20, 20], [30, 20]]), t: 30, layers: { disp: true }, text: 'Hızlanarak ileri giden araç: hızı sabit değil ama yönü hiç değişmedi → yol = |Δx| = 400 m. I kesin değil.' },
      { scenario: S4_BASE([[0, 15], [20, -5], [30, -5]]), t: 30, layers: { disp: true, area: true }, text: 'Geri dönen araç: geri gidilen kısım yola eklenir, yer değiştirmeden düşülür → yol 175 m, |Δx| 50 m. Eşitlik için yön değişmemeli: II kesin.' },
      { scenario: S4_BASE([[0, 15], [20, -5], [30, -5]]), t: 15, text: 'III: Eğri bir yolda yol, başlangıç ile bitişi birleştiren düz çizgiden hep uzundur. Eşitlik varsa yol düzdür → III kesin.' },
    ],
    solution: [
      'Koşul: |yer değiştirme| = yol.',
      'I: Hızlanarak hep ileri giden araç koşulu sağlar ama hızı sabit değildir → kesin değil.',
      'II: Araç bir an geri giderse o kısım yola eklenir, yer değiştirmeden düşülür; eşitlik bozulur → kesin.',
      'III: Eğri yolda yol, yer değiştirmeden uzundur; eşitlik için yol düz olmalı → kesin.',
      'Cevap: II ve III (D).',
    ],
    rule: '"Kesinlikle" sorusunda her yargı için koşulu sağlayıp yargıyı bozan bir örnek ara. Bulursan yargı kesin değildir; hiçbir örnek bozamıyorsa ve nedenini söyleyebiliyorsan kesindir.',
    trap: 'Akla gelen ilk örneği (sabit hız) tek olasılık sanmak. "Yol = yer değiştirme" yalnız yönü ve yolun biçimini kısıtlar, hızın büyüklüğünü değil.',
    explain: {
      prompt: 'II neden kesinlikle doğru?',
      options: [
        { text: 'Geri gidilen her metre yola eklenir ama yer değiştirmeden düşülür; yön değişirse eşitlik bozulur.', correct: true, feedback: 'Evet. Bu gerekçe her olası hareket için geçerli; kesinliği sağlayan da bu.' },
        { text: 'Sabit hızla gittiği için aynı yönde gider.', correct: false, feedback: 'I\'in kesin olmadığını gördün; II\'nin gerekçesi hızın sabit olması olamaz.' },
        { text: 'Otoyolda geri gidilmez.', correct: false, feedback: 'Gerekçe fiziksel olmalı: koşulun kendisi yönü kısıtlıyor.' },
      ],
    },
    twin: {
      stem: 'Bir aracın 20 s\'lik hareketinde ortalama hızının büyüklüğü ortalama süratine eşittir. Buna göre; I. Araç hiç durmamıştır. II. Araç yön değiştirmemiştir. III. Aracın ivmesi sıfırdır. yargılarından hangileri kesinlikle doğrudur?',
      choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'I ve II', D: 'II ve III', E: 'I, II ve III' },
      answer: 'B',
      explanation: 'Ortalama hız = ortalama sürat demek |Δx| = yol demektir → yön değişmez (II kesin). Araç bir an durup aynı yöne devam edebilir: I kesin değil (aşağıdaki simülasyon). Hızlanıp yavaşlayabilir: III kesin değil.',
      scenario: { T: 20, grid: grid(1, 1), vRange: [-2, 12], strobe: 2, step: 1, layers: { disp: true }, bodies: [car('K', 'red', [[0, 10], [10, 0], [20, 10]], { name: 'Araç' })] },
    },
  },
  {
    id: 'uc-hizlar-yeter-mi',
    title: 'Uç hızlar yeter mi? Sabit ivme',
    source: { code: 'AYT_Sayisal-0364', label: 'AYT 2025' },
    pattern: 'sabit-ivme',
    stem: 'Yatay ve doğrusal bir yol boyunca hareket eden bir otomobilin yalnız K ve L noktalarındaki t_K ve t_L zaman değerleri ile bu anlardaki anlık hız değerleri bilinmektedir. Otomobilin t_K – t_L aralığındaki ortalama hızının büyüklüğünü bulabilmek için hangi bilgilerin verilmesi yeterlidir?',
    statements: [
      { id: 'I', text: 'İvmesinin sabit olduğu', truth: true, why: 'Sabit ivmede alan yamuktur: ortalama hız = (v_K + v_L)/2.' },
      { id: 'II', text: 'Yön değiştirmediği', truth: false, why: 'Yön değişmese de aradaki grafik bükülür, alan değişir.' },
      { id: 'III', text: 'Kütlesi', truth: false, why: 'Kütle konum–hız–zaman ilişkisinde yer almaz.' },
    ],
    statementLabels: { yes: 'Yeterli', no: 'Yetmez' },
    ask: 'bilgilerinden hangilerinin verilmesi yeterlidir?',
    choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'I ve III', D: 'II ve III', E: 'I, II ve III' },
    answer: 'A',
    recognize: {
      prompt: 'Ortalama hızı bulmak için aslında neyi bilmen gerekir?',
      options: [
        { text: 'Bu aralıktaki yer değiştirmeyi (v–t alanını)', correct: true, feedback: 'Evet: ortalama hız = Δx / Δt. Δt biliniyor; eksik olan alan. Alanı kesin belirleyen bilgi yeterlidir.' },
        { text: 'Yalnız iki anlık hızı', correct: false, feedback: 'İki uç hız aradaki grafiğin biçimini belirlemez; alan değişebilir.' },
        { text: 'Kütleyi', correct: false, feedback: 'Kütle kuvvet hesabında gerekir; konum–hız–zaman ilişkisinde yer almaz.' },
      ],
    },
    build: {
      mode: 'counterexample',
      intro: 'Uç hızlar sabit (4 ve 12 m/s). Ortadaki noktayı oynat: ortalama hız değişiyor mu? Sonra "İvme sabit" seçeneğini aç ve uç hızları değiştir.',
      start: S5_BASE(12),
      editable: { lockT: true, locked: { K: [0, 2] } },
      variants: [
        { id: 'free', label: 'İvme serbest', editable: { lockT: true, locked: { K: [0, 2] } } },
        { id: 'linear', label: 'İvme sabit (I. bilgi)', editable: { lockT: true, locked: { K: [1] }, linear: true } },
      ],
      checks: [
        { id: 'ends', label: 'Uç hızlar', info: (motions) => `v_K = ${fmt(motions[0].v(0), 2)} m/s · v_L = ${fmt(motions[0].v(10), 2)} m/s` },
        { id: 'avg', label: 'Ortalama hız = Δx / Δt', info: (motions) => `${fmt((motions[0].x(10) - motions[0].x0) / 10, 2)} m/s` },
        { id: 'mean', label: '(v_K + v_L) / 2', info: (motions) => `${fmt((motions[0].v(0) + motions[0].v(10)) / 2, 2)} m/s` },
        { id: 'equal', label: 'Ortalama hız = (v_K + v_L) / 2', test: (motions) => near((motions[0].x(10) - motions[0].x0) / 10, (motions[0].v(0) + motions[0].v(10)) / 2, 0.05) },
        { id: 'II', label: 'II. Yön değişmedi', test: (motions) => keepsDirection(motions[0]) },
      ],
      found: [
        { id: 'cexII', label: 'II yetmez: yön değişmeden ortalama hız (v_K + v_L)/2\'den farklı çıktı', test: (motions) =>
          keepsDirection(motions[0]) && !near((motions[0].x(10) - motions[0].x0) / 10, (motions[0].v(0) + motions[0].v(10)) / 2, 0.25) },
        { id: 'linear', label: 'I yeter: ivme sabitken uç hızlar ne olursa olsun ortalama hız (v_K + v_L)/2', test: (motions, scenario, memo) =>
          memo.variant === 'linear' && (motions[0].v(0) !== 4 || motions[0].v(10) !== 12) },
      ],
      require: ['cexII', 'linear'],
      solution: S5_BASE(8),
    },
    observe: [
      { scenario: S5_BASE(12), t: 10, layers: { area: true }, text: 'Orta nokta yukarıda: alan 100 m → ortalama hız 10 m/s. Uç hızlar yine 4 ve 12 m/s.' },
      { scenario: S5_BASE(2), t: 10, layers: { area: true }, text: 'Orta nokta aşağıda, hız hep pozitif (yön değişmedi): alan 50 m → ortalama hız 5 m/s. II bilgisi alanı sabitlemiyor.' },
      { scenario: S5_BASE(8), t: 10, layers: { area: true }, text: 'Düz çizgi = sabit ivme: alan bir yamuk, (4 + 12)/2 · 10 = 80 m → ortalama hız 8 m/s = (v_K + v_L)/2.' },
    ],
    solution: [
      'Ortalama hız = Δx / Δt; Δt biliniyor, Δx (v–t alanı) bilinmiyor.',
      'I: İvme sabitse grafik düz çizgi, alan yamuk: Δx = (v_K + v_L)/2 · Δt → yeterli.',
      'II: Yön değişmese de aradaki grafik eğilip bükülebilir, alan değişir → yetmez.',
      'III: Kütle kinematikte yer almaz → yetmez. Cevap: Yalnız I (A).',
    ],
    rule: 'Sabit ivmede v–t grafiği düz çizgidir ve ortalama hız = (ilk hız + son hız)/2 olur. İvme sabit değilse uç hızlar ortalama hızı belirlemez; alanı bilmek gerekir.',
    trap: '(v₁ + v₂)/2 kısayolunu her harekette kullanmak. Bu kısayol yalnız sabit ivmede geçerlidir.',
    explain: {
      prompt: 'Kütle bilgisi neden işe yaramaz?',
      options: [
        { text: 'Konum, hız ve zaman arasındaki ilişki kütleye bağlı değildir; kütle yalnız kuvvet sorulunca gerekir.', correct: true, feedback: 'Evet. Kinematik (hareketin tarifi) kütle içermez.' },
        { text: 'Kütle verilmediği için hesaplanamaz.', correct: false, feedback: 'Soru "verilirse yeter mi" diye soruyor; kütle verilse bile alanı belirlemez.' },
        { text: 'Ağır araç daha yavaş gider.', correct: false, feedback: 'Hareket bilgisi verilmişken kütle, konum–hız ilişkisini değiştirmez.' },
      ],
    },
    twin: {
      stem: 'Sabit ivmeyle hızlanan bir aracın hızı 4 saniyede 6 m/s\'den 14 m/s\'ye çıkıyor. Araç bu sürede kaç m yol alır?',
      choices: { A: '20', B: '32', C: '40', D: '48', E: '56' },
      answer: 'C',
      explanation: 'Sabit ivme → ortalama hız (6 + 14)/2 = 10 m/s → yol 10 · 4 = 40 m (yamuk alanı).',
      scenario: { T: 4, grid: grid(1, 1), vRange: [0, 16], strobe: 1, step: 1, layers: { area: true }, bodies: [car('K', 'red', [[0, 6], [4, 14]], { name: 'Araç' })] },
    },
  },
  {
    id: 'pozitif-ivme-yavaslama',
    title: 'Pozitif ivmeyle yavaşlamak',
    source: null,
    pattern: 'isaret',
    stem: 'Doğrusal bir yolda hareket eden bir aracın t = 0 anındaki hızı −10 m/s\'dir (geri yönde). Aracın ivmesi sabit ve +2 m/s²\'dir. Aracın 0–10 s aralığındaki hareketi için:',
    statements: [
      { id: 'I', text: '0–5 s arasında yavaşlar.', truth: true, why: 'v negatif, a pozitif: zıt işaret → yavaşlar.' },
      { id: 'II', text: '5. saniyede yön değiştirir.', truth: true, why: 'v = −10 + 2·5 = 0, sonra pozitife geçer.' },
      { id: 'III', text: '10. saniyede başladığı noktadadır.', truth: true, why: '−25 m + 25 m = 0.' },
    ],
    statementLabels: YES_NO,
    ask: 'yargılarından hangileri doğrudur?',
    choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'I ve II', D: 'II ve III', E: 'I, II ve III' },
    answer: 'E',
    recognize: {
      prompt: 'Bir aracın hızlanıp yavaşladığını nasıl anlarsın?',
      options: [
        { text: 'Hız ile ivmenin işaretlerini karşılaştırırım: aynıysa hızlanır, zıtsa yavaşlar.', correct: true, feedback: 'Evet. İvmenin işareti tek başına bir şey söylemez.' },
        { text: 'İvme pozitifse hızlanır, negatifse yavaşlar.', correct: false, feedback: 'En yaygın yanılgı. Geri giden (v < 0) araca pozitif ivme onu yavaşlatır.' },
        { text: 'v–t grafiği yükseliyorsa hızlanır.', correct: false, feedback: 'Yükselen v–t, hızın sayısal değerinin arttığını söyler; −10\'dan −6\'ya yükselen hızın büyüklüğü azalıyor.' },
      ],
    },
    build: {
      mode: 'parameters',
      intro: 'Sorudaki bilgileri modele çevir. İşaretlere dikkat: ileri yön +, geri yön −.',
      fields: [
        { id: 'v0', label: 'İlk hız v₀', unit: 'm/s', value: -10, hint: '"Geri yönde" hız negatif yazılır.' },
        { id: 'a', label: 'İvme a', unit: 'm/s²', value: 2, hint: 'Soruda ivme +2 m/s² veriliyor.' },
        { id: 'T', label: 'Süre', unit: 's', value: 10, hint: '0–10 s aralığı soruluyor.' },
      ],
      make: S6_MAKE,
      solution: S6_MAKE({ v0: -10, a: 2, T: 10 }),
    },
    observe: [
      { t: 2, layers: { arrows: true }, text: 't = 2 s: v = −6 m/s, a = +2 m/s². İşaretler zıt → yavaşlıyor (hızın büyüklüğü 10\'dan 6\'ya indi), ivme pozitif olduğu hâlde.' },
      { t: 5, layers: { arrows: true }, text: 't = 5 s: v = 0. Araç anlık durdu ve yön değiştirdi; en geri nokta −25 m.' },
      { t: 10, layers: { area: true, disp: true }, text: 't = 10 s: negatif alan (−25 m) + pozitif alan (+25 m) = 0 → başlangıç noktasında. Alınan yol ise 50 m.' },
    ],
    solution: [
      '0–5 s: v negatif, a pozitif → zıt işaret → yavaşlar (I doğru).',
      't = 5 s: v = −10 + 2 · 5 = 0, sonra pozitife geçer → yön değiştirir (II doğru).',
      'Alan: 0–5 s arası −25 m, 5–10 s arası +25 m → Δx = 0 (III doğru). Cevap E.',
    ],
    rule: 'Hızlanma mı, yavaşlama mı? v ile a aynı işaretliyse hızlanır, zıt işaretliyse yavaşlar. İvmenin işareti tek başına bir şey söylemez; yönü hız belirler.',
    trap: '"Pozitif ivme = hızlanma, negatif ivme = yavaşlama" ezberi.',
    explain: {
      prompt: '0–5 s arasında araç neden yavaşlar?',
      options: [
        { text: 'Hız negatif, ivme pozitif; zıt yönlü oldukları için hızın büyüklüğü azalır.', correct: true, feedback: 'Evet. Sahnedeki oklar da zıt yönlüydü.' },
        { text: 'İvme pozitif olduğu için hızlanır; yargı yanlıştır.', correct: false, feedback: 'İvme hızı + yöne doğru değiştirir: −10 → −6 → −2. Büyüklük azalıyor: yavaşlama.' },
        { text: 'v–t grafiği yükseldiği için yavaşlar.', correct: false, feedback: 'Grafiğin yükselmesi tek başına bir şey söylemez; burada sıfıra yaklaştığı için yavaşlıyor.' },
      ],
    },
    twin: {
      stem: 'Hızı +12 m/s olan bir araç, sabit −3 m/s² ivmeyle hareket ediyor. Araç kaçıncı saniyede başladığı noktaya geri döner?',
      choices: { A: '4', B: '6', C: '8', D: '10', E: '12' },
      answer: 'C',
      explanation: '4. saniyede durur (en uzak nokta 24 m). Simetriden 4 s daha geri gelir: t = 8 s. Denklemle: 12t − 1,5t² = 0 → t = 8 s.',
      scenario: { T: 8, grid: grid(1, 1), vRange: [-15, 15], strobe: 1, step: 1, layers: { area: true, disp: true }, bodies: [car('K', 'red', [[0, 12], [8, -12]], { name: 'Araç' })] },
    },
  },
  {
    id: 'top-ve-tuy',
    title: 'Top ve tüy: serbest düşme',
    source: { code: 'AYT_Sayisal-0363', label: 'AYT 2024' },
    pattern: 'serbest',
    stem: 'Batur, biri sağ diğeri sol elinde bulunan 1 kg kütleli bir top ile 1 g kütleli bir kuş tüyünü hava direncinin ihmal edildiği bir ortamda, yerden 5 m yükseklikten ilk hızsız olarak aynı anda serbest bırakmıştır.',
    statements: [
      { id: 'I', text: 'Hareket süresince etki eden net kuvvet', truth: false, why: 'Net kuvvet = ağırlık = m·g: 10 N ve 0,01 N.' },
      { id: 'II', text: 'Hareketin ivmesi', truth: true, why: 'a = F/m = g: ikisi için de 10 m/s².' },
      { id: 'III', text: 'Yere düşme süresi', truth: true, why: 'Aynı yükseklik, aynı ilk hız, aynı ivme → aynı süre.' },
    ],
    statementLabels: { yes: 'Eşit', no: 'Farklı' },
    ask: 'niceliklerinden hangilerinin birbirine eşit olması beklenir?',
    choices: { A: 'Yalnız I', B: 'Yalnız II', C: 'Yalnız III', D: 'I ve II', E: 'II ve III' },
    answer: 'E',
    recognize: {
      prompt: 'Hava direnci yokken düşen bir cismin hareketini ne belirler?',
      options: [
        { text: 'Yalnız yer çekimi ivmesi g; kütleden bağımsız', correct: true, feedback: 'Evet. Bu yüzden hareket (konum, hız, süre) kütleden bağımsızdır; kuvvet değildir.' },
        { text: 'Kütle: ağır cisim daha hızlı düşer', correct: false, feedback: 'Günlük deneyimdeki fark hava direncinden gelir; soruda hava direnci yok.' },
        { text: 'Cismin büyüklüğü', correct: false, feedback: 'Hava direnci yokken boyutun da etkisi yoktur.' },
      ],
    },
    build: {
      mode: 'parameters',
      intro: 'Yukarıyı + kabul ederek düşmeyi modele çevir. Laboratuvar iki cismi de aynı bilgilerle bırakacak.',
      fields: [
        { id: 'h', label: 'Başlangıç yüksekliği', unit: 'm', value: 5, hint: 'Yerden 5 m yükseklikten bırakılıyor.' },
        { id: 'v0', label: 'İlk hız', unit: 'm/s', value: 0, hint: '"İlk hızsız" serbest bırakma: v₀ = 0.' },
        { id: 'a', label: 'İvme (yukarı +)', unit: 'm/s²', value: -10, hint: 'Yer çekimi aşağı yönlüdür; yukarı + seçildiyse a = −10 m/s².' },
      ],
      make: S7_MAKE,
      solution: S7_MAKE({ h: 5, v0: 0, a: -10 }),
    },
    observe: [
      { t: 0.5, layers: { arrows: true, strobe: true }, text: 't = 0,5 s: ikisi de aynı yükseklikte (3,75 m) ve aynı hızla (−5 m/s) iniyor. İvmeleri aynı: g.' },
      { t: 0.5, text: 'Net kuvvetlere bak: top 10 N, tüy 0,01 N. Kuvvet 1000 kat büyük ama kütle de 1000 kat büyük: a = F/m aynı kalıyor.' },
      { t: 1, layers: { strobe: true }, text: 't = 1 s: ikisi aynı anda yere değiyor. 5 = ½ · 10 · t² → t = 1 s.' },
    ],
    solution: [
      'Hava direnci yok → tek kuvvet ağırlık: F = m·g. Kütleler farklı → net kuvvetler farklı (I eşit değil).',
      'a = F/m = m·g/m = g → ivmeler eşit (II).',
      'Aynı yükseklik, aynı ilk hız, aynı ivme → aynı süre (III). Cevap: II ve III (E).',
    ],
    rule: 'Hava direnci yoksa düşen her cismin ivmesi g\'dir; süre ve hız kütleye bağlı değildir. Ağırlık (net kuvvet) ise kütleyle orantılıdır.',
    trap: '"Ağır cisim daha hızlı düşer" sezgisi; günlük hayattaki fark hava direncinden gelir.',
    explain: {
      prompt: 'Net kuvvetler farklıyken ivmeler neden eşit?',
      options: [
        { text: 'a = F/m: kuvvet de kütle de aynı oranda (1000 kat) büyüyor.', correct: true, feedback: 'Evet. Oran değişmediği için ivme aynı: g.' },
        { text: 'Net kuvvetler de aslında eşittir.', correct: false, feedback: 'Ağırlık = m·g; kütle 1000 kat büyükse ağırlık da 1000 kat büyüktür.' },
        { text: 'İvme kuvvetten bağımsızdır.', correct: false, feedback: 'İvme kuvvete bağlıdır (a = F/m); burada kuvvet ve kütle aynı oranda değiştiği için sonuç aynı.' },
      ],
    },
    twin: {
      stem: 'Hava direncinin ihmal edildiği bir ortamda 20 m yükseklikten serbest bırakılan bir cisim kaç saniyede yere düşer? (g = 10 m/s²)',
      choices: { A: '1', B: '2', C: '3', D: '4', E: '5' },
      answer: 'B',
      explanation: 'h = ½ g t² → 20 = 5 t² → t = 2 s. Kütle verilmemiş; gerekmiyor.',
      scenario: { T: 2, orientation: 'vertical', grid: grid(0.1, 1, 1), vRange: [-25, 5], strobe: 0.2, step: 0.2, bodies: [ball('K', 'red', [[0, 0], [2, -20]], { x0: 20, name: 'Cisim' })] },
    },
  },
];

/* ------------------------------------------------------------------ Görevler */

const rms = (first, second, T) => {
  let sum = 0;
  for (let i = 0; i <= 100; i += 1) { const t = (T * i) / 100; sum += (first.x(t) - second.x(t)) ** 2; }
  return Math.sqrt(sum / 101);
};
const MATCH_TARGET = car('H', 'black', [[0, 0], [4, 8], [6, 0], [10, -4]]);

export const TASKS = [
  {
    id: 'yetis', title: 'Tam 8. saniyede yetiş', pattern: 'alan',
    goal: 'K 10 m/s sabit hızla gidiyor. L aynı yerden, duruştan başlıyor. L\'nin hız grafiğini öyle ayarla ki K\'ye tam t = 8 s\'de yetişsin.',
    hint: 'Yetişme = alanlar eşit. 8. saniyede K\'nin alanı 10 · 8 = 80 m; L\'nin alanı da o anda 80 m olmalı.',
    scenario: { T: 12, grid: grid(1, 1), vRange: [0, 35], strobe: 2, step: 1, layers: { events: true }, bodies: [car('K', 'red', [[0, 10], [12, 10]]), car('L', 'blue', [[0, 0], [12, 0]])] },
    editable: { bodies: ['L'], lockT: false, allowInsert: true, locked: { L: [0] } },
    check: (motions) => {
      const first = meetings(motions[0], motions[1], 12).find((m) => m.t > 0.1);
      return { done: !!first && near(first.t, 8, 0.15), status: first ? `İlk yetişme: t = ${fmt(first.t, 2)} s` : 'L henüz K\'ye yetişmiyor.' };
    },
    solution: [car('K', 'red', [[0, 10], [12, 10]]), car('L', 'blue', [[0, 0], [12, 30]])],
  },
  {
    id: 'en-uzak', title: 'Ara en çok ne zaman açılır?', pattern: 'esit-hiz', kind: 'moment',
    goal: 'K 12 m/s sabit hızla, L duruştan 2 m/s² ivmeyle aynı yerden çıkıyor. Zamanı L\'nin K\'den en çok geride olduğu ana getir ve "Bu an!" düğmesine bas.',
    hint: 'K daha hızlıyken ara açılır, L daha hızlı olunca kapanır. Açılmanın durduğu an hangisi?',
    scenario: { T: 12, grid: grid(1, 1), vRange: [0, 26], strobe: 2, step: 1, layers: { events: false }, bodies: [car('K', 'red', [[0, 12], [12, 12]]), car('L', 'blue', [[0, 0], [12, 24]])] },
    editable: null,
    answer: (t) => near(t, 6, 0.25),
    answerText: 't = 6 s: hızlar eşit (12 m/s). Öncesinde K daha hızlı, ara açılıyor; sonrasında L daha hızlı, ara kapanıyor. En büyük ara 36 m.',
  },
  {
    id: 'geri-don', title: 'Uzaklaş ve geri dön', pattern: 'yol-yer',
    goal: 'Araç 12. saniyede başladığı noktada olsun; ama arada başlangıçtan en az 20 m uzaklaşsın.',
    hint: 'Önce pozitif alan, sonra eşit büyüklükte negatif alan. Yön değiştirmek için v–t ekseni kesmeli.',
    scenario: { T: 12, grid: grid(1, 1), vRange: [-15, 15], strobe: 1, step: 1, layers: { area: true }, bodies: [car('K', 'red', [[0, 0], [3, 0], [6, 0], [9, 0], [12, 0]])] },
    editable: { lockT: false, allowInsert: true, locked: { K: [0] } },
    check: (motions) => {
      const motion = motions[0];
      let far = 0;
      for (let i = 0; i <= 240; i += 1) far = Math.max(far, Math.abs(motion.x((12 * i) / 240) - motion.x0));
      const end = motion.x(12) - motion.x0;
      return { done: near(end, 0, 0.5) && far >= 20 - 1e-6, status: `Son konum ${fmt(end)} m · en uzak ${fmt(far)} m` };
    },
    solution: [car('K', 'red', [[0, 0], [3, 8], [6, 0], [9, -8], [12, 0]])],
  },
  {
    id: 'iki-kat-yol', title: 'Aynı yer değiştirme, iki kat yol', pattern: 'yol-yer',
    goal: 'K 10 s\'de 50 m ilerliyor (yol da 50 m). L\'nin 10 s\'deki yer değiştirmesi yine 50 m olsun ama aldığı yol 100 m olsun.',
    hint: 'İleri giden alan F, geri gelen alan B ise: F − B = 50 ve F + B = 100.',
    scenario: { T: 10, grid: grid(0.5, 1), vRange: [-20, 35], strobe: 1, step: 0.5, layers: { area: true },
      bodies: [car('K', 'red', [[0, 5], [10, 5]]), car('L', 'blue', [[0, 0], [2.5, 0], [5, 0], [7.5, 0], [10, 0]])] },
    editable: { bodies: ['L'], lockT: false, allowInsert: true },
    check: (motions) => {
      const s = statsAt(motions[1], 10);
      return { done: near(s.disp, 50, 1.5) && near(s.path, 100, 2.5), status: `L: yer değiştirme ${fmt(s.disp)} m · yol ${fmt(s.path)} m` };
    },
    solution: [car('K', 'red', [[0, 5], [10, 5]]), car('L', 'blue', [[0, 0], [2.5, 30], [5, 0], [7.5, -10], [10, 0]])],
  },
  {
    id: 'geri-yavasla', title: 'Geri giderken yavaşla', pattern: 'isaret',
    goal: 'Araç bir süre geri (−) yönde giderken yavaşlasın ve 10. saniyede ileri (+) yönde gidiyor olsun.',
    hint: 'Geri giderken yavaşlamak: v < 0 iken a > 0. v–t grafiği eksenin altında ve sıfıra doğru yükseliyor olmalı.',
    scenario: { T: 10, grid: grid(1, 1), vRange: [-15, 15], strobe: 1, step: 1, bodies: [car('K', 'red', [[0, 5], [5, 5], [10, 5]])] },
    editable: { lockT: false, allowInsert: true },
    check: (motions) => {
      const motion = motions[0];
      const slowingBack = motion.segs.some((seg) => seg.a > 1e-6 && seg.v0 < -0.5);
      const forward = motion.v(10) > 1e-6;
      return { done: slowingBack && forward, status: `${slowingBack ? '✓' : '✗'} geri giderken yavaşlama · ${forward ? '✓' : '✗'} sonda ileri yönde` };
    },
    solution: [car('K', 'red', [[0, -8], [10, 8]])],
  },
  {
    id: 'eslestir', title: 'Grafik eşleştir: x–t\'yi v–t ile çiz', pattern: 'egim',
    goal: 'x–t grafiğindeki kesikli çizgiyi takip et: yalnız v–t noktalarını oynatarak kırmızı x–t çizgisini kesikli çizginin üstüne getir.',
    hint: 'x–t dikleşiyorsa hız büyük; tepe noktasında hız sıfır; x azalıyorsa hız negatif.',
    scenario: { T: 10, grid: grid(1, 1), vRange: [-10, 12], strobe: 1, step: 1, layers: { strobe: false, events: false }, target: { kind: 'x-curve', body: MATCH_TARGET },
      bodies: [car('K', 'red', [[0, 0], [4, 0], [6, 0], [10, 0]])] },
    editable: { lockT: true },
    check: (motions) => {
      const error = rms(motions[0], motionOf(MATCH_TARGET, 10), 10);
      return { done: error <= 0.6, status: `Ortalama sapma ${fmt(error, 2)} m (hedef ≤ 0,6 m)` };
    },
    solution: [car('K', 'red', [[0, 0], [4, 8], [6, 0], [10, -4]])],
  },
];

/* ------------------------------------------------------------------ Kalıp haritası */

export const PATTERNS = [
  { id: 'alan', title: 'Alan = yer değiştirme', see: ['v–t grafiği + "kaç m", "yan yana", "önde", "başlangıca döner"'],
    look: 'v–t alanı katmanını aç; her aracın alanını karşılaştır.', rule: 'Aynı yerden başlayanlar alanları eşitlenince yan yana gelir. Eksen altı alan geri gidiştir.',
    trap: 'Çizgilerin kesişmesini yan yana gelme sanmak.', studio: ['iki-arac-alan', 'pozitif-ivme-yavaslama'], tasks: ['yetis', 'geri-don'], codes: ['AYT_Sayisal-0362'], preset: 'ayt2023' },
  { id: 'esit-hiz', title: 'Hızlar eşit → ara uç değerde', see: ['İki araç, "en uzak", "en yakın", "arayı kapatır"'],
    look: 'v–t çizgilerinin kesiştiği anı bul; sahnede aradaki uzaklığa bak.', rule: 'Hızlar eşitken ara ne açılır ne kapanır: en büyük ya da en küçük değerindedir.',
    trap: 'Hızların eşitlendiği anı yetişme anı sanmak.', studio: ['iki-arac-alan'], tasks: ['en-uzak'], codes: ['AYT_Sayisal-0362'], preset: 'yetisme' },
  { id: 'egim', title: 'Eğim: x–t → v, v–t → a', see: ['"Hangisi gibi olabilir?", şıklarda grafik, tablo verisi'],
    look: 'Eğim katmanını aç; iz noktalarının aralığına bak.', rule: 'x–t eğimi hızdır, v–t eğimi ivmedir. Eşit aralıklı iz sabit hız, açılan iz hızlanma demektir.',
    trap: 'Grafiği resim gibi okumak: değerleri başka grafiğe aynen taşımak.', studio: ['tablodan-grafige'], tasks: ['eslestir'], codes: ['TYT-0909'], preset: 'hizlanan' },
  { id: 'yol-yer', title: 'Yol ≠ yer değiştirme', see: ['"Geri döner", "tur atar", "aynı noktaya", "ortalama hız / sürat"'],
    look: 'Yer değiştirme okunu aç; okumalarda yol ile yer değiştirmeyi karşılaştır.', rule: 'Ortalama hız = yer değiştirme / süre; ortalama sürat = yol / süre. Başlangıca dönenin ortalama hızı sıfırdır.',
    trap: 'Adım, tur gibi yol bilgisini yer değiştirme sanmak.', studio: ['eve-donen-ali'], tasks: ['geri-don', 'iki-kat-yol'], codes: ['TYT-0912', 'TYT-0910', 'TYT-0913'], preset: 'donen' },
  { id: 'kesin', title: '"Kesinlikle" → karşı örnek ara', see: ['"kesinlikle doğrudur", "yeterlidir", "olabilir"'],
    look: 'Koşulu sağlayan farklı hareketler kur; yargının bozulup bozulmadığına bak.', rule: 'Koşulu sağlayıp yargıyı bozan tek bir örnek, yargının kesin olmadığını gösterir.',
    trap: 'İlk akla gelen örneği (sabit hız) tek olasılık sanmak.', studio: ['kesinlikle-karsi-ornek', 'uc-hizlar-yeter-mi'], tasks: [], codes: ['TYT-0911', 'AYT_Sayisal-0364'], preset: 'bos' },
  { id: 'isaret', title: 'Hızlanma = v ve a aynı işaret', see: ['Negatif hız, "geri yönde", "yavaşlar mı?"'],
    look: 'Hız ve ivme oklarını aç; aynı yöndeler mi, zıt mı?', rule: 'v ile a aynı işaretliyse hızlanır, zıt işaretliyse yavaşlar. Yön, hızın işaretidir.',
    trap: '"Negatif ivme = yavaşlama" ezberi.', studio: ['pozitif-ivme-yavaslama'], tasks: ['geri-yavasla'], codes: [], preset: 'donen' },
  { id: 'sabit-ivme', title: 'Sabit ivmede ortalama hız = (v₁ + v₂)/2', see: ['"ivmesi sabit", iki anlık hız, "ortalama hız"'],
    look: 'Alanı aç; v–t düz çizgiyken alan yamuktur.', rule: 'Yalnız sabit ivmede ortalama hız ilk ve son hızın ortalamasıdır.',
    trap: '(v₁ + v₂)/2 kısayolunu ivme değişirken de kullanmak.', studio: ['uc-hizlar-yeter-mi'], tasks: [], codes: ['AYT_Sayisal-0364'], preset: 'hizlanan' },
  { id: 'serbest', title: 'Serbest düşme kütleden bağımsız', see: ['"hava direnci ihmal", "serbest bırakılıyor", farklı kütleler'],
    look: 'Dikey sahnede iki cismi birlikte bırak; net kuvvetleri karşılaştır.', rule: 'Hava direnci yoksa ivme g; süre ve hız kütleye bağlı değil. Ağırlık ise kütleyle orantılı.',
    trap: '"Ağır cisim daha hızlı düşer" sezgisi.', studio: ['top-ve-tuy'], tasks: [], codes: ['AYT_Sayisal-0363'], preset: 'dusme' },
];

/* ------------------------------------------------------------------ Ünite listesi (giriş sayfası) */

export const PLANNED_UNITS = [
  { subject: 'Fizik', title: 'İki boyutta hareket (atışlar)', idea: 'Hızı yatay ve düşey bileşenlere ayıran atış laboratuvarı: süreyi düşey verir, menzili yatay.' },
  { subject: 'Fizik', title: 'Elektrik devreleri', idea: 'Pil, direnç ve ampulü bağlayıp akım ile gerilimi canlı ölçen devre tahtası.' },
  { subject: 'Fizik', title: 'Kuvvet ve Newton yasaları', idea: 'Serbest cisim diyagramı ile hareket aynı ekranda: net kuvvet değişince ivme ve grafikler değişir.' },
  { subject: 'Fizik', title: 'Basit harmonik hareket', idea: 'Yay–kütle ve sarkaç: periyodu neyin belirlediğini, neyin belirlemediğini dene.' },
];
