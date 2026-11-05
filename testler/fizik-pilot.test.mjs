import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { journey, motion, dynamics, friction, reaction } from '../frontend/src/learn/physics/models.js';
import { CHECKS, TRANSFER } from '../frontend/src/learn/physics/questions.js';
import { PHYSICS_PILOT, pilotForTopic } from '../frontend/src/learn/physics/registry.js';
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
test('geri dönmek alınan yolu silmez; sıfır ve negatif yer değiştirme', () => {
  assert.equal(journey().distance, 10); assert.equal(journey().displacement, 2);
  assert.equal(journey({ back: 6 }).displacement, 0); assert.equal(journey({ back: 6 }).distance, 12);
  assert.equal(journey({ back: 9 }).displacement, -3);
  for (let back = 0; back <= 12; back++) {
    const m = journey({ back, time: 5 }); near(m.x, m.displacement); near(m.travelled, m.distance);
    assert.ok(m.averageSpeed >= Math.abs(m.averageVelocity));
  }
});
test('konum eğimleri hızla; hız grafiğinin işaretli/mutlak alanları konum ve yolla tutarlı', () => {
  for (let back = 0; back <= 12; back++) {
    const m = journey({ back });
    const velocities = m.points.slice(1).map(([t, x], i) => (x - m.points[i][1]) / (t - m.points[i][0]));
    near(velocities[0] * 3 + velocities[1] * 2, m.displacement);
    near(Math.abs(velocities[0]) * 3 + Math.abs(velocities[1]) * 2, m.distance);
    near((journey({ back, time: 4.01 }).x - journey({ back, time: 4 }).x) / .01, velocities[1]);
  }
});
test('negatif hız ve pozitif ivme: önce yavaşlama, anlık durma, yön değiştirme', () => {
  assert.equal(motion({ time: 1 }).behaviour, 'Yavaşlıyor');
  const stop = motion({ time: 2 }); near(stop.velocity, 0); near(stop.x, -4);
  assert.equal(motion({ time: 3 }).behaviour, 'Süratleniyor'); near(motion({ time: 3 }).velocity, 2);
  assert.equal(motion({ initialVelocity: 2, acceleration: 1 }).turnTime, null);
});
test('net sıfır mevcut hızı korur; kütle ivmeyi değiştirir; farklı yönlerde işaretler', () => {
  const m = dynamics({ right: 5, left: 5, initialVelocity: 2, time: 5 });
  near(m.acceleration, 0); near(m.velocity, 2); near(m.x, 10);
  for (let mass = 1; mass <= 6; mass++) for (const net of [-8, 0, 8]) {
    const n = dynamics({ mass, right: Math.max(0, net), left: Math.max(0, -net) });
    near(n.mass * n.acceleration, net); near(n.normal - n.weight, 0);
  }
  assert.throws(() => dynamics({ mass: 0 }));
});
test('statik sürtünme uyarlanır: alt sınır, eşik eşitliği, kayma üstü', () => {
  for (const applied of [0, 3, 5, 8]) {
    const m = friction({ applied, time: 5 }); near(m.friction, applied); near(m.velocity, 0); assert.equal(m.regime, 'static');
  }
  const sliding = friction({ applied: 10 }); near(sliding.friction, 6); near(sliding.acceleration, 2);
  const threshold = friction({ mass: 3, muStatic: .5, muKinetic: .2, applied: 15 });
  near(threshold.acceleration, 0); assert.equal(threshold.regime, 'static');
});
test('kayarken çekiş sıfırlansa da sürtünme var; durma sonrası kendiliğinden geri hareket yok', () => {
  const m = friction({ applied: 0, initialVelocity: 3, time: .5 }); near(m.friction, 6); near(m.velocity, 1.5);
  for (const time of [1, 2, 5]) {
    const stopped = friction({ applied: 0, initialVelocity: 3, time }); near(stopped.x, 1.5); near(stopped.velocity, 0); near(stopped.friction, 0);
  }
});
test('etki-tepki ayrı cisimlerde eşit zıt; dış yatay kuvvet yokken momentum değişimi sıfır', () => {
  for (let massB = 40; massB <= 120; massB += 20) {
    const m = reaction({ massB }); near(m.forceA + m.forceB, 0);
    near(40 * m.accelerationA + massB * m.accelerationB, 0);
  }
});
test('pilot tek yayımlanmış Fizik kimliğine bağlı; Matematik konusuna taşınmaz', () => {
  const catalog = JSON.parse(readFileSync(new URL('../frontend/src/data/curriculumIdentities.json', import.meta.url))).canonicalUnits;
  const category = catalog.find(c => c.id === PHYSICS_PILOT.categoryId);
  assert.equal(category.subjectId, 'fizik'); assert.equal(category.topic, 'Hareket ve Kuvvet');
  assert.equal(pilotForTopic({ ids: [category.id] }).path, PHYSICS_PILOT.path);
  assert.equal(pilotForTopic({ ids: ['excel.tyt.matematik.any'] }), null);
});
test('bağımsız altı sorunun sonuçları sayısal fizik kontrolüyle uyumlu', () => {
  assert.deepEqual(TRANSFER.map(q => q.correct), [0, 1, 2, 0, 1, 2]);
  near(journey({ outward: 9, back: 3, firstTime: 8, secondTime: 4 }).averageSpeed, 1);
  near(journey({ outward: 9, back: 3, firstTime: 8, secondTime: 4 }).averageVelocity, .5);
  near((2 - 8) / 2, -3); near((-3 - (-6)) / 3, 1);
  near(dynamics({ mass: 4, right: 10, left: 6 }).acceleration, 1);
  near(friction({ mass: 3, applied: 15 }).acceleration, 2);
  near(reaction({ force: 60, massA: 30, massB: 60 }).accelerationB, 1);
});
test('yerel üretilmiş sekiz bölüm kaynak görüntülerine ve denetlenmiş modele bağlı', () => {
  const content = JSON.parse(readFileSync(new URL('../frontend/src/learn/physics/hareket-kuvvet.generated.json', import.meta.url)));
  assert.equal(content.provenance.teacherApproved, false);
  assert.equal(content.provenance.editoriallyCorrected, true);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../frontend/src/learn/physics/hareket-kuvvet.editorial.json', import.meta.url))).digest('hex'), content.provenance.editorialSha256);
  assert.deepEqual(content.provenance.models, ['gpt-oss:20b', 'qwen3.5:9b']);
  assert.equal(content.sections.length, 8);
  assert.deepEqual(content.sections.map(s => s.id), Object.keys(CHECKS));
  for (const section of content.sections) {
    for (const field of ['story', 'intuition', 'connection', 'deeper', 'workedQuestion', 'workedSolution', 'workedQuestion2', 'workedSolution2', 'shortcut', 'trap', 'inquiry', 'inquiryAnswer']) assert.ok(section[field].length >= 60, `${section.id}: ${field}`);
    assert.ok(section.sourceNotes.every(note => content.sources.some(source => source.note === note)));
  }
  for (const source of content.sources) for (const page of source.pages) {
    const file = new URL('../frontend/public' + page.image, import.meta.url);
    assert.ok(existsSync(file)); assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), page.imageSha256);
  }
});
