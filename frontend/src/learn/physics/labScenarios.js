// Physics lesson adapters for the established Interactive Learning motion engine.
import { friction } from './models.js';
export const DEFAULT_EXPERIMENT = { back: 4, frame: 'peron', initialVelocity: -4, acceleration: 2, mass: 2, right: 6, left: 2, applied: 5, moving: false, massB: 80 };
export const EXPERIMENT_GUIDES = {
  referans: ['Aynı tren, iki gözlemci', 'Gözlemciyi değiştir. Yolcunun hangi sisteme göre durduğunu sahne ve hız grafiğinde karşılaştır.'],
  yol: ['Geri dönüş, alınan yolu silmez', 'Başlangıca dön hazır durumunu aç. Son ana git: yer değiştirme sıfırken alınan yolun neden sıfır olmadığını açıkla.'],
  hiz: ['İki ortalamanın payı farklı', 'Aynı hareketin yolunu ve yer değiştirmesini karşılaştır. Son ana gidip iki ortalamayı aynı 5 saniyeye böl.'],
  grafik: ['Sahne ile grafiği birlikte oku', 'Zamanı çizelgeden veya grafiğe dokunarak değiştir. Eğim ve alan katmanlarını sırayla aç; her birinin neyi ölçtüğünü bul.'],
  ivme: ['Hız başka, hızın değişimi başka', 'Yön değiştirme olayına tıkla. Hızın bir an sıfır olduğu yerde ivmenin neden sıfır olmadığını incele.'],
  'net-kuvvet': ['Önce kuvvet toplamı, sonra hareket', 'Dengeli hazır durumunu oynat. Kuvvetlerin toplamı sıfırken kutunun neden hareket etmeyi sürdürdüğünü açıkla.'],
  surtunme: ['Önce durumu belirle: duruyor mu, kayıyor mu?', 'Tutunuyor, Eşikte ve Kayma başlıyor durumlarını karşılaştır. Sonra kayarken ipi bırakıp durma anını incele.'],
  'etki-tepki': ['Eşit kuvvet, farklı cisimler', 'Eşit kütlelerle başla, sonra bir patenciyi ağırlaştır. İlk saniyelik itme bitince hızların nasıl korunduğunu izle.'],
};
export const EXPERIMENT_PRESETS = {
  referans: [['Perondan bak', { frame: 'peron' }], ['Trenden bak', { frame: 'tren' }]],
  yol: [['Gidiş–dönüş', { back: 4 }], ['Başlangıca dön', { back: 6 }], ['Başlangıcı geç', { back: 10 }]],
  hiz: [['Gidiş–dönüş', { back: 4 }], ['Başlangıca dön', { back: 6 }], ['Yalnız ileri', { back: 0 }]],
  grafik: [['Gidiş–dönüş', { back: 4 }], ['Başlangıca dön', { back: 6 }], ['Başlangıcı geç', { back: 10 }]],
  ivme: [['Yavaşla ve dön', { initialVelocity: -4, acceleration: 2 }], ['Sabit hız', { initialVelocity: 3, acceleration: 0 }], ['Süratlen', { initialVelocity: 1, acceleration: 1 }]],
  'net-kuvvet': [['Dengeli', { mass: 2, right: 6, left: 6 }], ['Sağa net kuvvet', { mass: 2, right: 6, left: 2 }], ['Sola net kuvvet', { mass: 2, right: 2, left: 6 }]],
  surtunme: [['Tutunuyor', { mass: 2, applied: 5, moving: false }], ['Eşikte', { mass: 2, applied: 8, moving: false }], ['Kayma başlıyor', { mass: 2, applied: 10, moving: false }], ['Kayarken ipi bırak', { mass: 2, applied: 0, moving: true }]],
  'etki-tepki': [['Ağır ve hafif', { massB: 80 }], ['Eşit kütle', { massB: 40 }], ['B daha ağır', { massB: 120 }]],
};
const body = (id, name, nodes, extra = {}) => ({ id, label: id, name, tone: id === 'B' ? 'blue' : 'red', shape: 'car', x0: 0, nodes, ...extra });
export function experimentScenario(sectionId, parameters = {}) {
  const p = { ...DEFAULT_EXPERIMENT, ...parameters }, T = 5;
  const base = { T, lessonLayout: true, grid: { dt: .25, dv: .5, dx: 1 }, step: .5, strobe: .5, graphs: ['x', 'v', 'a'],
    layers: { strobe: true, arrows: true, disp: false, area: false, slope: false, events: true } };
  if (sectionId === 'referans') return { ...base, graphs: ['x', 'v'], bodies: [
    body('T', 'Tren ve koltuğunda oturan yolcu', [[0, p.frame === 'peron' ? 4 : 0], [T, p.frame === 'peron' ? 4 : 0]], { shape: 'train' }),
    body('P', 'Perondaki işaret', [[0, p.frame === 'peron' ? 0 : -4], [T, p.frame === 'peron' ? 0 : -4]], { shape: 'landmark', tone: 'blue' }),
  ] };
  if (['yol', 'hiz', 'grafik'].includes(sectionId)) return { ...base, graphs: ['x', 'v'], layers: { ...base.layers, disp: true, area: sectionId !== 'yol' },
    bodies: [body('K', 'Gidiş–dönüş yapan araç', [[0, 2], [3, 2], [3, -p.back / 2], [T, -p.back / 2]])] };
  if (sectionId === 'ivme') return { ...base, vRange: [-15, 15], layers: { ...base.layers, slope: true }, bodies: [body('K', 'Hız ve ivmesi izlenen araç', [[0, p.initialVelocity], [T, p.initialVelocity + p.acceleration * T]])] };
  if (sectionId === 'net-kuvvet') {
    const a = (p.right - p.left) / p.mass;
    return { ...base, bodies: [body('K', `Kutu · ${p.mass} kg`, [[0, 2], [T, 2 + a * T]], { mass: p.mass, shape: 'crate' })] };
  }
  if (sectionId === 'surtunme') {
    const v0 = p.moving ? 3 : 0;
    const m = friction({ mass: p.mass, applied: p.applied, initialVelocity: v0, time: 0 });
    const stop = m.acceleration < 0 ? -v0 / m.acceleration : Infinity;
    const nodes = stop > 0 && stop < T ? [[0, v0], [stop, 0], [T, 0]] : [[0, v0], [T, v0 + m.acceleration * T]];
    return { ...base, bodies: [body('K', `Yüzeydeki kutu · ${p.mass} kg`, nodes, { mass: p.mass, shape: 'crate' })] };
  }
  return { ...base, layers: { ...base.layers, arrows: true }, bodies: [
    body('A', 'A patencisi · 40 kg', [[0, 0], [1, -80 / 40], [T, -80 / 40]], { mass: 40, shape: 'skater' }),
    body('B', `B patencisi · ${p.massB} kg`, [[0, 0], [1, 80 / p.massB], [T, 80 / p.massB]], { mass: p.massB, shape: 'skater' }),
  ] };
}
