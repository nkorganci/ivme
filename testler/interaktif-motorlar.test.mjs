// İnteraktif Öğrenme: bütün ünite motorlarının ve sınav sorusu cevaplarının bağımsız sağlaması.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as X from '../frontend/src/interactive/kit/mathExpr.js';
import * as G from '../frontend/src/interactive/kit/geometry.js';
import { exactValue, reduce } from '../frontend/src/interactive/units/matematik/trigEngine.js';
import { lineFromPoints, parseLine } from '../frontend/src/interactive/units/geometri/lineEngine.js';
import * as C from '../frontend/src/interactive/units/fizik/circuitEngine.js';
import { projectile } from '../frontend/src/interactive/units/fizik/projectile.js';
import { GASES, R, solveGas } from '../frontend/src/interactive/units/kimya/gasEngine.js';
import * as AB from '../frontend/src/interactive/units/kimya/acidbase.js';
import * as GEN from '../frontend/src/interactive/units/biyoloji/genetics.js';
import * as DNA from '../frontend/src/interactive/units/biyoloji/dna.js';
import * as SUN from '../frontend/src/interactive/units/cografya/sunEngine.js';
import * as CL from '../frontend/src/interactive/units/cografya/climateEngine.js';
import * as POP from '../frontend/src/interactive/units/cografya/popEngine.js';
import * as TX from '../frontend/src/interactive/units/turkce/textTools.js';
import * as PO from '../frontend/src/interactive/units/edebiyat/poetryEngine.js';
import { figureOf } from '../frontend/src/interactive/units/edebiyat/figures.js';
import { decimalYear, EVENTS } from '../frontend/src/interactive/units/tarih/events.js';

const close = (a, b, tol = 1e-6, label = '') => assert.ok(Math.abs(a - b) <= tol, `${label} ${a} ≠ ${b}`);
const f = (text, vars) => X.makeFunction(text, 'x', vars).f;

test('matematik · ifade motoru: türev, yazım, kökler, integral', () => {
  assert.equal(X.toText(X.derivative(X.parse('x^3 - 3x^2 + 2'))), '3x^2 - 6x');
  assert.equal(X.toText(X.derivative(X.parse('sin(2x)'))), '2cos(2x)');
  assert.deepEqual(X.toPolynomial(X.parse('(x+1)(x-2)')), [-2, -1, 1]);
  assert.equal(X.polynomialText([2, 0, -3, 1]), 'x^3 - 3x^2 + 2');
  assert.deepEqual(X.findRoots(f('(x-1)^2'), -5, 5), [1]);
  close(X.integrate(f('x^2-2x'), 0, 3, { abs: true }), 8 / 3, 1e-6, 'alan');
  assert.equal(X.quadraticRootsText(1, -8, 13), '4 ± √3');
  assert.equal(X.fractionText(8 / 3), '8/3');
});

test('matematik · fonksiyonlar soruları', () => {
  const shifted = X.toPolynomial(X.simplify({ t: 'add', a: X.substitute(X.parse('x^2 - 4x'), 'x', { t: 'sub', a: { t: 'var', n: 'x' }, b: { t: 'num', v: 2 } }), b: { t: 'num', v: 1 } }));
  const [c0, c1, c2] = shifted; const r = -c1 / (2 * c2);
  close(r, 4); close(c2 * r * r + c1 * r + c0, -3);
  const abs4 = (m) => X.findRoots((x) => Math.abs(x * x - 4) - m, -6, 6).length;
  assert.equal(abs4(2), 4); assert.equal(abs4(4), 3); assert.equal(abs4(5), 2);
  // Teğet: x² − 2x + 3 = 2x + n → Δ = 0 ⇒ n = −1
  const delta = (n) => 16 - 4 * (3 - n);
  close(delta(-1), 0);
  assert.equal(X.findRoots((x) => (Math.abs(x) ** 2 - 4 * Math.abs(x) + 3) - 1, -6, 6).length, 4);
});

test('matematik · türev ve integral soruları', () => {
  const fx = f('x^3 - 3x^2 + 2'); const d = X.compile(X.derivative(X.parse('x^3 - 3x^2 + 2')));
  assert.deepEqual(X.findRoots((x) => d({ x }), -4, 4), [0, 2]);
  close(fx(0), 2);
  const g = f('x^2 - 2x + 3'); const dg = X.numericDerivative(g, 3);
  close(dg, 4, 1e-6); close(g(3) - dg * 3, -6, 1e-6);
  const fp = (m) => (x) => 3 * x * x + 2 * m * x + 3;
  const minOf = (h) => Math.min(...Array.from({ length: 801 }, (_, i) => h(-4 + i * 0.01)));
  assert.ok(minOf(fp(3)) >= -1e-9 && minOf(fp(-3)) >= -1e-9 && minOf(fp(3.5)) < 0);
  const d2 = X.compile(X.derivative(X.parse('x^3/3 - 2x^2 + 3x')));
  assert.deepEqual(X.findRoots((x) => d2({ x }), -2, 6), [1, 3]);
});

test('matematik · trigonometri', () => {
  assert.equal(exactValue('sin', 150).text, '1/2');
  assert.equal(exactValue('cos', 240).text, '−1/2');
  assert.deepEqual(reduce(240), { a: 240, quadrant: 3, ref: 60 });
  const angle = 180 - (Math.atan(3 / 4) * 180) / Math.PI;
  close(Math.sin((angle * Math.PI) / 180) + Math.cos((angle * Math.PI) / 180), -1 / 5, 1e-9);
  close((2 * Math.PI) / 2, Math.PI); // 3sin(2x − π/3) + 1 periyodu
});

test('geometri · üçgen, dörtgen, çember, doğru', () => {
  const A = [1, 1]; const B = [1, 7]; const Cc = [9, 1];
  const t = G.triangleInfo(A, B, Cc);
  assert.equal(t.rightAt, 'A'); close(G.dist(A, G.foot(A, B, Cc)), 4.8);
  const p = G.placeBySides(10, 9, 6);
  const D = G.lerp(p.B, p.C, 6 / 15); close(G.dist(p.B, D), 4);
  const q = G.placeBySides(8, 6, 4); close(G.dist(q.A, G.mid(q.B, q.C)), Math.sqrt(10));
  const quad = G.quadInfo([0, 0], [6, 0], [8, 4], [2, 4]);
  assert.equal(quad.type, 'paralelkenar'); close(quad.area, 24);
  const L = parseLine('3x + 4y - 12 = 0'); close(Math.abs(L.c) / Math.hypot(L.a, L.b), 12 / 5);
  const p1 = parseLine('2x - y + 3 = 0'); const p2 = parseLine('a x + 2y - 1 = 0', -4);
  close(p1.a * p2.b - p2.a * p1.b, 0);
  const ab = lineFromPoints([1, 2], [5, 10]); close(-ab.a / ab.b, 2);
  close(2 - (-1 / 2) * 1, 5 / 2); // dik doğrunun y-kesişimi
});

test('fizik · elektrik devreleri', () => {
  const R1 = (id, r, type = 'R') => ({ id, type, r, name: id });
  const karisik = { id: 'g1', type: 'S', children: [R1('e1', 6), { id: 'g2', type: 'P', children: [R1('e2', 6), R1('e3', 3)] }] };
  const s = C.solveCircuit(karisik, 24, 0);
  close(s.Req, 8); close(s.I, 3); close(s.values.get('e3').I, 2);
  const lamps = (closed) => ({ id: 'g1', type: 'S', children: [R1('K', 6, 'L'), { id: 'g2', type: 'P', children: [R1('L', 6, 'L'), { id: 'g3', type: 'S', children: [{ id: 'A1', type: 'K', closed, r: 0 }, R1('M', 6, 'L')] }] }] });
  const on = C.solveCircuit(lamps(true), 12); const off = C.solveCircuit(lamps(false), 12);
  close(on.values.get('K').V, 8); close(on.values.get('L').V, 4); close(off.values.get('K').V, 6); close(off.values.get('L').V, 6);
  const par = C.solveCircuit({ id: 'g', type: 'P', children: [R1('X', 6, 'L'), R1('Y', 12, 'L')] }, 12);
  close(par.values.get('X').P / par.values.get('Y').P, 2);
  const short = C.solveCircuit({ id: 'g', type: 'S', children: [R1('K', 6, 'L'), { id: 'p', type: 'P', children: [R1('L', 6, 'L'), { id: 'A', type: 'K', closed: true, r: 0 }] }] }, 12);
  close(short.values.get('L').I, 0); close(short.values.get('K').V, 12);
});

test('fizik · atışlar', () => {
  const base = { mode: 'polar', h0: 0, g: 10 };
  close(projectile({ ...base, v0: 20, angle: 0, h0: 45 }).range, 60);
  const e = projectile({ ...base, v0: 50, angle: 53 }); close(e.range, 240); close(e.hMax, 80); close(e.T, 8);
  close(projectile({ ...base, v0: 20, angle: 90, h0: 25 }).T, 5);
  const K = projectile({ mode: 'components', vx: 40, vy: 30, h0: 0, g: 10 }); const L = projectile({ mode: 'components', vx: 20, vy: 30, h0: 0, g: 10 });
  close(K.T, L.T); close(K.range, 2 * L.range);
});

test('kimya · gazlar ve çözeltiler', () => {
  const n = 6 / 22.4;
  close(solveGas({ solveFor: 'P', V: 6, T: 273, n }).P, 1); close(solveGas({ solveFor: 'P', V: 2, T: 273, n }).P, 3);
  const n2 = 3 / (R * 300); close(solveGas({ solveFor: 'V', P: 1, T: 400, n: n2 }).V, 4);
  close(solveGas({ solveFor: 'P', V: 5.6, T: 273, n: 0.5 }).P, 2); close((0.2 / 0.5) * 2, 0.8);
  close(Math.sqrt(GASES.CH4 / GASES.He), 2);
  close(4 / 40 / 0.5, 0.2); close((0.4 * 200) / 800, 0.1); close(AB.mixMolarity(0.2, 300, 0.6, 100), 0.3);
  close(AB.titrationPH({ analyte: 'guclu', Ca: 0.2, Va: 100, Cb: 0.1, Vb: 100 }), -Math.log10(0.05), 1e-6);
  close(AB.titrationPH({ analyte: 'zayif', Ca: 0.1, Va: 50, Cb: 0.1, Vb: 25, Ka: 1e-5 }), 5, 0.01);
  close(AB.titrationPH({ analyte: 'guclu', Ca: 0.1, Va: 50, Cb: 0.1, Vb: 50 }), 7, 1e-6);
  assert.ok(AB.titrationPH({ analyte: 'zayif', Ca: 0.1, Va: 50, Cb: 0.1, Vb: 50, Ka: 1e-5 }) > 8);
});

test('biyoloji · kalıtım ve DNA', () => {
  const two = [{ letter: 'A', type: 'tam' }, { letter: 'B', type: 'tam' }];
  const r = GEN.cross(['Aa', 'Bb'], ['Aa', 'Bb'], two);
  close(GEN.probability(r, (c) => GEN.phenotypeOf(c.pairs[0], two[0]) === 'A: baskın' && GEN.phenotypeOf(c.pairs[1], two[1]) === 'B: çekinik'), 3 / 16);
  const kan = [{ letter: 'A', type: 'kan' }]; close(GEN.cross(['IAi'], ['IBi'], kan).phenotypeDist.get('0 grubu'), 1 / 4);
  const x = [{ letter: 'A', type: 'X', names: ['normal', 'renk körü'] }]; const xr = GEN.cross(['XAXa'], ['XAY'], x);
  close(GEN.probability(xr, (c) => GEN.phenotypeOf(c.pairs[0], x[0]) === 'erkek renk körü', 'male'), 1 / 2);
  const ek = [{ letter: 'A', type: 'eksik', label: 'Çiçek rengi' }]; close(GEN.cross(['Aa'], ['Aa'], ek).phenotypeDist.get('Çiçek rengi: ara fenotip'), 1 / 2);
  assert.equal(GEN.cross(['Aa', 'Bb', 'Dd'], ['aa', 'bb', 'dd'], [{ letter: 'A', type: 'tam' }, { letter: 'B', type: 'tam' }, { letter: 'D', type: 'tam' }]).phenotypeDist.size, 8);
  const tr = DNA.translate(DNA.transcribe('TACAAACCGATT'));
  assert.deepEqual(tr.protein, ['Met', 'Phe', 'Gly']); assert.equal(tr.protein.length - 1, 2);
  assert.equal(DNA.countsFromComposition(60, 40).hBonds, 240);
  assert.equal(DNA.anticodon('GCU'), 'CGA');
  const before = DNA.translate(DNA.transcribe('TACGGTCTTAAACGTACCATT'));
  const after = DNA.translate(DNA.transcribe(DNA.mutate('TACGGTCTTAAACGTACCATT', { kind: 'eksilme', position: 4 })));
  assert.match(DNA.classify(before, after, 'eksilme'), /çerçeve kayması/);
});

test('coğrafya · güneş, iklim, nüfus', () => {
  assert.equal(SUN.dms(SUN.noonAltitude(40, SUN.declination(172))), '73°27′');
  assert.ok(SUN.noonAltitude(36, SUN.declination(355)) > SUN.noonAltitude(42, SUN.declination(355)));
  assert.ok(SUN.dayLength(42, SUN.declination(355)) < SUN.dayLength(36, SUN.declination(355)));
  close(SUN.declination(106), 10, 0.3); assert.ok(SUN.dayLength(40, 10) > 12);
  assert.equal(SUN.dayLength(-90, 10), 0); close(SUN.dayLength(0, 10), 12, 1e-9); assert.equal(SUN.shadow(0, SUN.declination(80)).length, 0);
  const type = (id) => { const p = CL.CLIMATE_PRESETS.find((x) => x.id === id); return CL.classifyClimate(p.T, p.P); };
  assert.equal(type('antalya').type, 'Akdeniz iklimi'); assert.equal(type('perth').type, 'Akdeniz iklimi'); assert.ok(type('perth').metrics.south);
  assert.equal(type('mumbai').type, 'Muson iklimi'); assert.equal(type('ankara').metrics.dryMonths.length, 4);
  assert.equal(type('kahire').type, 'Çöl iklimi'); assert.equal(type('singapur').type, 'Ekvatoral iklim');
  const tr = POP.POP_PRESETS.find((p) => p.id === 'turkiye');
  const now = POP.structure(tr.pop); const later = POP.structure(POP.project(tr.pop, tr, 8));
  assert.ok(later.youngShare < now.youngShare && later.oldShare > now.oldShare && later.median > now.median);
  assert.equal(POP.structure(POP.POP_PRESETS.find((p) => p.id === 'genc').pop).type, 'Genişleyen (üçgen) piramit');
  close(((20 + 15) / 65) * 100, 53.85, 0.01);
});

test('türkçe · metin araçları', () => {
  const options = ['Bu nedenle erken yaşta başlamak önemlidir.', 'Ayrıca düzenli tekrar da gereklidir.', 'Yabancı dil öğrenmek, sabır ve süreklilik isteyen bir süreçtir.', 'Örneğin her gün on kelime öğrenmek mümkündür.', 'Çünkü dil, kullanılmadıkça unutulur.'];
  assert.deepEqual(options.map(TX.canBeIntro), [false, false, true, false, false]);
  assert.equal(TX.splitSentences('Bir cümle. İkinci cümle! Üçüncü mü?').length, 3);
  assert.equal(TX.connectorsIn('Kelimesi az olan ise duygularını geçiştirir.')[0].kind, 'karşılaştırma');
});

test('edebiyat · şiir ve söz sanatları', () => {
  const yunus = ['Gelin tanış olalım', 'İşi kolay kılalım', 'Sevelim sevilelim', 'Dünya kimseye kalmaz'];
  assert.deepEqual(yunus.map((l) => PO.lineSyllables(l).length), [7, 7, 7, 7]);
  const pair = PO.rhymePair(yunus[0], yunus[1]); assert.equal(pair.type, 'yarım kafiye'); assert.equal(pair.kafiye, 'l');
  assert.equal(PO.rhymeScheme(yunus), 'aaab');
  assert.equal(PO.rhymeScheme(['Bahçede güller açtı', 'Bülbüller dala kaçtı', 'Sevdiğim uzaklarda', 'Gönlüme hasret saçtı']), 'aaba');
  const marks = (line) => PO.lineSyllables(line).map((s) => (s.open ? '.' : '–')).join('');
  const second = PO.aruzMatch(marks("Felekler yandı âhımdan murâdım şem'i yanmaz mı"))[0];
  assert.equal(second.name, 'Mefâîlün Mefâîlün Mefâîlün Mefâîlün'); assert.deepEqual(second.mismatches, []);
  assert.deepEqual(PO.aruzMatch(marks('Beni candan usandırdı cefâdan yâr usanmaz mı'))[0].mismatches, [1, 7]);
  const parts = { benzeyen: 'yüzü', benzetilen: 'ay', yon: 'parlak', edat: 'gibi', ozellik: 'doğdu' };
  assert.equal(figureOf(parts, { benzeyen: true, benzetilen: true, yon: false, edat: false }).name, 'Teşbih-i beliğ (güçlü benzetme)');
  assert.equal(figureOf({ ...parts, benzeyen: 'asker', benzetilen: 'aslan', ozellik: 'kükredi' }, { benzeyen: true, benzetilen: false, yon: false, edat: false }).name, 'Kapalı istiare');
  assert.equal(figureOf(parts, { benzeyen: false, benzetilen: true, yon: false, edat: false }).name, 'Açık istiare');
});

test('tarih · kronoloji sıralamaları', () => {
  const at = (id) => decimalYear(EVENTS.find((e) => e.id === id).date);
  const ordered = (ids) => ids.every((id, i) => i === 0 || at(ids[i - 1]) < at(id));
  assert.ok(ordered(['havza', 'amasya', 'erzurum', 'sivas', 'misak']));
  assert.ok(ordered(['gumru', 'moskova', 'sakarya', 'kars', 'ankaraant', 'taarruz', 'mudanya', 'lozan']));
  assert.ok(ordered(['halifelik', 'sapka', 'harf', 'soyadi']));
  assert.ok(ordered(['mete', 'gokturk', 'uygur', 'karahanli']));
  for (const ev of EVENTS) for (const c of ev.causes) assert.ok(at(c) <= at(ev.id), `${c} → ${ev.id}`);
  assert.equal(new Set(EVENTS.map((e) => e.id)).size, EVENTS.length);
});

test('çıkmış soru eşlemesi her üniteyi kapsar', () => {
  const past = JSON.parse(fs.readFileSync(new URL('../frontend/src/interactive/pastQuestions.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(past).length, 25);
  assert.ok(Object.values(past).filter((list) => list.length > 0).length >= 24);
});
