// İnteraktif Öğrenme · Fizik Hareket: motor doğruluğu ve içerikteki her sayısal iddianın motorla sağlaması.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as M from '../frontend/src/interactive/motion/model.js';
import { PATTERNS, PRESETS, STUDIO, TASKS } from '../frontend/src/interactive/motion/content.js';

const close = (actual, expected, tolerance = 1e-6, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} ≠ ${expected}`);
const motions = (scenario) => scenario.bodies.map((body) => M.motionOf(body, scenario.T));
const item = (id) => STUDIO.find((s) => s.id === id);
const romanSet = (text) => new Set(text.match(/\b(?:III|II|I)\b/g) ?? []);

test('motor: AYT 2023 iki araç — yan yana 30 s, hızlar eşit 20 s, ara 100 m', () => {
  const [k, l] = motions(item('iki-arac-alan').build.solution);
  close(k.x(30), 300); close(l.x(30), 300); close(k.path(30), 300);
  assert.deepEqual(M.meetings(k, l, 30).map((m) => m.t), [0, 30]);
  assert.deepEqual(M.equalVelocityTimes(k, l, 30).map((m) => Number(m.t.toFixed(6))), [20]);
  close(k.x(20) - l.x(20), 100, 1e-6, 'ara');
  assert.ok(M.keepsDirection(k));
});

test('motor: yön değiştiren hareket, alan ayrımı, yol ve olaylar', () => {
  const m = M.motionOf({ x0: 0, nodes: [[0, -10], [10, 10]] }, 10);
  assert.deepEqual(M.signedAreas(m, 10), { positive: 25, negative: -25 });
  close(m.path(10), 50); close(m.x(10), 0); close(m.x(5), -25);
  assert.deepEqual(M.zeroVelocityEvents(m), [{ t: 5, turn: true }]);
  assert.equal(M.motionKind(m.v(2), m.a(2)).key, 'slower');
  assert.equal(M.motionKind(m.v(7), m.a(7)).key, 'faster');
  assert.ok(!M.keepsDirection(m));
});

test('motor: düğüm düzenleme ızgaraya oturur, komşuları aşmaz; sabit ivme kısıtı', () => {
  const body = { x0: 0, nodes: [[0, 0], [15, 20], [30, 0]] };
  assert.deepEqual(M.moveNode(body, 1, [40, 17.4], { T: 30, grid: { dt: 1, dv: 1 }, vRange: [-10, 25] }).nodes[1], [29, 17]);
  assert.deepEqual(M.moveNode(body, 1, [10, 99], { T: 30, grid: { dt: 1, dv: 1 }, vRange: [-10, 25], lockT: true }).nodes[1], [15, 25]);
  assert.deepEqual(M.insertNode(body, 7.6, { T: 30, grid: { dt: 1, dv: 1 } }).nodes[1], [8, 11]);
  assert.deepEqual(M.straighten({ x0: 0, nodes: [[0, 4], [5, 30], [10, 12]] }, 10).nodes[1], [5, 8]);
  assert.equal(M.fmt(-2.5), '−2,5');
  assert.equal(M.fmt(-0.01), '0');
});

test('stüdyo: yargı doğrulukları cevap şıkkını, cevaplar şıkları gösterir', () => {
  for (const s of STUDIO) {
    assert.ok(s.choices[s.answer], `${s.id} cevap şıkkı`);
    assert.ok(s.twin.choices[s.twin.answer], `${s.id} ikiz cevap şıkkı`);
    assert.equal(s.recognize.options.filter((o) => o.correct).length, 1, `${s.id} tanı tek doğru`);
    assert.equal(s.explain.options.filter((o) => o.correct).length, 1, `${s.id} gerekçe tek doğru`);
    if (s.statements) {
      const truths = new Set(s.statements.filter((st) => st.truth).map((st) => st.id));
      assert.deepEqual([...romanSet(s.choices[s.answer])].sort(), [...truths].sort(), `${s.id} yargılar ↔ cevap`);
    }
  }
});

test('stüdyo: model kurma başlangıçta tamam değil, çözüm modeli tamam', () => {
  for (const s of STUDIO) {
    const b = s.build;
    if (b.mode === 'match') {
      assert.ok(b.solution.bodies.some((target) => M.firstNodeDifference(b.start.bodies.find((x) => x.id === target.id), target, b.start.T)), `${s.id} başlangıç`);
    }
    if (b.mode === 'points') {
      const [start] = motions(b.start);
      const [solution] = motions(b.solution);
      assert.ok(b.start.target.points.some(([t, x]) => Math.abs(start.x(t) - x) > 0.6));
      for (const [t, x] of b.solution.target.points) close(solution.x(t), x, 0.6, `${s.id} nokta ${t}`);
    }
    if (b.mode === 'constraint' || b.mode === 'counterexample') {
      const memo = { variant: b.variants?.[0]?.id };
      const startFound = b.found.filter((f) => f.test(motions(b.start), b.start, memo)).map((f) => f.id);
      assert.ok(!b.require.every((id) => startFound.includes(id)), `${s.id} başlangıç zaten tamam`);
    }
    if (b.mode === 'parameters') {
      assert.deepEqual(b.make(Object.fromEntries(b.fields.map((f) => [f.id, f.value]))), b.solution, `${s.id} parametre modeli`);
    }
  }
  const ali = item('eve-donen-ali').build;
  assert.ok(ali.found[0].test(motions(ali.solution), ali.solution, {}));
  const cex = item('kesinlikle-karsi-ornek');
  assert.ok(cex.build.found.find((f) => f.id === 'cexI').test(motions(cex.build.solution)));
  assert.ok(cex.build.found.find((f) => f.id === 'tryII').test(motions(cex.observe[1].scenario)));
  assert.ok(!cex.build.checks[0].test(motions(cex.observe[1].scenario)), 'yön değişince koşul bozulur');
  const ends = item('uc-hizlar-yeter-mi');
  assert.ok(ends.build.found.find((f) => f.id === 'cexII').test(motions(ends.observe[1].scenario)));
  const linear = M.straighten({ ...ends.build.start.bodies[0], nodes: [[0, 6], [5, 8], [10, 10]] }, 10);
  assert.ok(ends.build.found.find((f) => f.id === 'linear').test([M.motionOf(linear, 10)], null, { variant: 'linear' }));
});

test('stüdyo: gözlem ve ikiz metinlerindeki sayılar motorla tutarlı', () => {
  const [ali] = motions(item('eve-donen-ali').build.solution);
  close(ali.x(2.5), 4); close(ali.x(2.5) / 2.5, 1.6); close(ali.v(5.5), 0); close(ali.x(5.5), 4); close(ali.x(8), 0); close(ali.path(8) / 8, 1);
  const cex = item('kesinlikle-karsi-ornek').observe;
  const [fwd] = motions(cex[0].scenario);
  close(fwd.path(30), 400); close(fwd.x(30), 400);
  const [rev] = motions(cex[1].scenario);
  close(rev.path(30), 175); close(rev.x(30), 50);
  const [hi, lo, mid] = item('uc-hizlar-yeter-mi').observe.map((o) => motions(o.scenario)[0]);
  close(hi.x(10), 100); close(lo.x(10), 50); close(mid.x(10), 80); assert.ok(M.keepsDirection(lo));
  const [neg] = motions(item('pozitif-ivme-yavaslama').build.solution);
  close(neg.v(2), -6); close(neg.v(5), 0); close(neg.x(5), -25); close(neg.x(10), 0); close(neg.path(10), 50);
  const fall = motions(item('top-ve-tuy').build.solution);
  close(item('top-ve-tuy').build.solution.T, 1); close(fall[0].x(0.5), 3.75); close(fall[1].v(0.5), -5); close(fall[0].x(1), 0, 1e-9);
  const twin1 = motions(item('iki-arac-alan').twin.scenario);
  assert.equal(M.meetings(twin1[0], twin1[1], 14).find((m) => m.t > 0).t, 10);
  close(M.equalVelocityTimes(twin1[0], twin1[1], 14)[0].t, 5); close(twin1[0].x(5) - twin1[1].x(5), 25);
  const twin2 = item('tablodan-grafige').twin.scenario;
  const [t2] = motions(twin2);
  for (const [t, x] of twin2.target.points) close(t2.x(t), x);
  const [t4] = motions(item('kesinlikle-karsi-ornek').twin.scenario);
  close(Math.abs(t4.x(20)), t4.path(20)); assert.ok(M.keepsDirection(t4));
  const [t5] = motions(item('uc-hizlar-yeter-mi').twin.scenario);
  close(t5.path(4), 40);
  const [t6] = motions(item('pozitif-ivme-yavaslama').twin.scenario);
  close(t6.x(8), 0); close(t6.x(4), 24);
  const [t7] = motions(item('top-ve-tuy').twin.scenario);
  close(t7.x(2), 0);
});

test('görevler: başlangıç tamamlanmış değil, örnek çözüm görevi tamamlar', () => {
  for (const task of TASKS) {
    if (task.kind === 'moment') { assert.ok(task.answer(6) && !task.answer(5)); continue; }
    assert.equal(task.check(motions(task.scenario)).done, false, `${task.id} başlangıç`);
    assert.equal(task.check(motions({ ...task.scenario, bodies: task.solution })).done, true, `${task.id} çözüm`);
  }
});

test('kalıp haritası ve hazırlar: bütün bağlantılar var', () => {
  const studioIds = new Set(STUDIO.map((s) => s.id));
  const taskIds = new Set(TASKS.map((t) => t.id));
  const presetIds = new Set(PRESETS.map((p) => p.id));
  for (const pattern of PATTERNS) {
    assert.ok(presetIds.has(pattern.preset), pattern.id);
    for (const id of pattern.studio) assert.ok(studioIds.has(id), `${pattern.id} → ${id}`);
    for (const id of pattern.tasks) assert.ok(taskIds.has(id), `${pattern.id} → ${id}`);
  }
  for (const s of STUDIO) assert.ok(PATTERNS.some((p) => p.id === s.pattern), s.id);
  const ayt = PRESETS.find((p) => p.id === 'ayt2023').scenario.bodies;
  assert.deepEqual(ayt.map((b) => b.nodes), item('iki-arac-alan').build.solution.bodies.map((b) => b.nodes));
});
