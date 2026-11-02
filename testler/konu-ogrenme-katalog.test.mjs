// TAS-03: Konuyu Öğrenelim ders/ünite/konu adları ve TYT/AYT kapsamı ortak katalogdan gelir.
// node --test testler/konu-ogrenme-katalog.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, parseLesson, scopeToTracks } from '../frontend/src/learn/content/parser.js';
import { validateLessons } from '../frontend/src/learn/content/validate.js';
import { UNITS } from '../frontend/src/learn/content/units.js';
import { catalogById, catalogUnits, lessonScope } from '../frontend/src/learn/catalog.js';
import { lessonProgress } from '../frontend/src/learn/engine/plan.js';
import { pickMixed } from '../frontend/src/learn/engine/selection.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'frontend/src/learn/content/dersler');
const lessons = readdirSync(DIR).filter((n) => n.endsWith('.ders')).sort()
  .map((n) => parseLesson(readFileSync(join(DIR, n), 'utf8'), n.replace(/\.ders$/, '')));
// Yerel kimlik projeksiyonu, çalışma anındaki DB metadata'sıyla aynı alanları taşır.
const snapshot = JSON.parse(readFileSync(join(ROOT, 'frontend/src/data/curriculumIdentities.json'), 'utf8')).canonicalUnits;
const index = buildIndex(lessons, UNITS);

test('ortak problem dersleri tek kimlikle iki sınava bağlı; AYT alt kapsamı otomatik genişletilmez', () => {
  const byId = catalogById(snapshot);
  for (const id of ['oran-oranti', 'sayi-kesir-problemleri', 'yas-isci-problemleri', 'yuzde-karisim', 'kar-zarar', 'hareket-problemleri', 'grafik-rutin-olmayan']) {
    assert.deepEqual(index.byId[id].exams, ['TYT', 'AYT'], id);
    assert.deepEqual(lessonScope(index.byId[id].categories, byId).exams, ['TYT', 'AYT'], id);
    assert.equal(index.concepts.filter((c) => c.id === id).length, 1, 'ortak ders çoğaltılmaz');
  }
  assert.deepEqual(index.byId['kosullu-olasilik'].exams, ['AYT'], 'geniş katalog kategorisi alt konunun TYT kanıtı değildir');
});

const BOLME = 'c15cc6aeffd9ec9ece58';
const VERI = 'd8fb8edba6e86247de33';

test('iki sınavdaki aynı katalog satırı tek konu, her iki rozetle; yalnız TYT konusu yalnız TYT', () => {
  const byId = catalogById(snapshot);
  const bolme = lessonScope(index.byId['bolme-bolunebilme'].categories, byId);
  const topic = bolme.topics.find((t) => t.key.endsWith(BOLME) || t.ids.some((id) => id.endsWith(BOLME)));
  assert.deepEqual(topic.exams, ['TYT', 'AYT']);
  assert.equal(new Set(bolme.topics.map((t) => t.key)).size, bolme.topics.length, 'konu tekrarlanmaz');
  const veri = lessonScope(index.byId['merkezi-egilim'].categories, byId);
  assert.deepEqual(veri.topics.map((t) => t.exams), [['TYT']]);
  assert.ok(veri.topics[0].ids.every((id) => id.endsWith(VERI)));
  assert.deepEqual(lessonScope(index.byId.binom.categories, byId).exams, ['AYT']);
});

test('katalogda ad düzeltmesi aynı kimlikle haritaya ve ders sayfasına yansır; ders dosyası değişmez', () => {
  const unitId = snapshot.find((c) => c.id.endsWith(BOLME)).unitId;
  const renamed = snapshot.map((c) => ({
    ...c,
    ...(c.unitId === unitId ? { unit: 'Sayılar (düzeltilmiş ünite)' } : {}),
    ...(c.id.endsWith(BOLME) ? { topic: 'Bölme ve Bölünebilme (düzeltilmiş ad)' } : {}),
  }));
  const before = lessonScope(index.byId['ebob-ekok'].categories, catalogById(snapshot));
  const after = lessonScope(index.byId['ebob-ekok'].categories, catalogById(renamed));
  assert.deepEqual(after.topics.map((t) => t.ids), before.topics.map((t) => t.ids), 'kimlikler aynı');
  assert.ok(after.topics.some((t) => t.topic === 'Bölme ve Bölünebilme (düzeltilmiş ad)'));
  assert.ok(!after.topics.some((t) => t.topic === before.topics.find((b) => b.ids[0].endsWith(BOLME)).topic));
  assert.ok(after.units.some((u) => u.name === 'Sayılar (düzeltilmiş ünite)'));
  const map = catalogUnits(index.concepts, catalogById(renamed));
  const placed = map.units.flatMap((u) => u.concepts.map((c) => c.meta.id));
  assert.equal(placed.length, index.concepts.length, 'her ders bir kez yerleşir');
  assert.ok(map.units.some((u) => u.concepts.some((c) => c.scope.topics.some((t) => t.topic.includes('düzeltilmiş ad')))));
});

test('seçilemeyen eski kimlik katalog yönlendirmesiyle güncel konuya bağlanır', () => {
  const current = snapshot.find((c) => c.id === `excel.tyt.matematik.${BOLME}`);
  const byId = catalogById([...snapshot, { id: 'excel.tyt.matematik.eski', exam: 'TYT', topic: 'Eski ad', selectable: false, canonicalTopicIds: [current.id] }]);
  const scope = lessonScope(['excel.tyt.matematik.eski'], byId);
  assert.deepEqual(scope.topics.map((t) => t.topic), [current.topic]);
  assert.deepEqual(lessonScope(['excel.yok'], byId).missing, ['excel.yok']);
});

test('konu haritası katalog ünitesine göre gruplanır; ekranlarda elle yazılmış ünite adı yok', () => {
  const { units, unplaced } = catalogUnits(index.concepts, catalogById(snapshot));
  assert.deepEqual(unplaced, []);
  const catalogUnitNames = new Set(snapshot.map((c) => c.unit));
  for (const unit of units) {
    assert.ok(catalogUnitNames.has(unit.name), unit.name);
    const orders = unit.concepts.map((c) => c.meta.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b), `${unit.name}: öğretim sırası korunur`);
  }
  assert.ok(UNITS.every((u) => Object.keys(u).join() === 'id'), 'units.js yalnız öğrenme basamağı kimliği taşır');
});

const base = parseLesson(readFileSync(join(DIR, 'bolme-bolunebilme.ders'), 'utf8'), 'bolme-bolunebilme');

test('AYT bölümü TYT hedefinde zorunlu akışa ve ilerlemeye girmez', () => {
  const ayt = base.sections.at(-1).id;
  const lesson = { ...base, sections: base.sections.map((s) => s.id === ayt ? { ...s, exams: ['AYT'] } : s) };
  const tyt = scopeToTracks(lesson, ['TYT']);
  assert.ok(!tyt.sections.some((s) => s.id === ayt));
  assert.deepEqual(tyt.otherExamSections.map((s) => s.id), [ayt]);
  assert.equal(tyt.minutes, lesson.minutes - lesson.sections.at(-1).minutes);
  assert.ok(tyt.sessions.every((s) => s.sections.length && !s.sections.includes(ayt)));
  assert.equal(scopeToTracks(lesson, ['TYT', 'AYT']), lesson, 'iki hedefte bölüm listesi aynı');
  assert.equal(scopeToTracks(base, ['TYT']), base, 'kapsam yoksa değişmez');
  const meta = buildIndex([lesson], UNITS).byId[lesson.id];
  const concept = { sectionsDone: tyt.sections.map((s) => s.id) };
  assert.equal(lessonProgress(meta, concept, ['TYT']).done, true);
  assert.equal(lessonProgress(meta, concept, ['TYT', 'AYT']).done, false);
});

test('doğrulayıcı: rozet katalogla aynı, bölüm kapsamı dersin sınavları içinde', () => {
  const catalog = new Map(snapshot.map((c) => [c.id, c]));
  const errorsOf = (lesson) => validateLessons([lesson], { catalog }).errors.filter((e) => /sinav|sınav|katalog|kategori/.test(e));
  assert.deepEqual(errorsOf(base), []);
  assert.ok(errorsOf({ ...base, exams: ['TYT'] }).some((e) => e.includes('bağlı katalog konularının sınavlarıyla')));
  const tytOnly = parseLesson(readFileSync(join(DIR, 'merkezi-egilim.ders'), 'utf8'), 'merkezi-egilim');
  const wrong = { ...tytOnly, sections: tytOnly.sections.map((s, i) => i ? s : { ...s, exams: ['AYT'] }) };
  assert.ok(errorsOf(wrong).some((e) => e.includes('dersin sınavları içinde olmalı')));
  const redundant = { ...base, sections: base.sections.map((s, i) => i ? s : { ...s, exams: ['TYT', 'AYT'] }) };
  assert.ok(errorsOf(redundant).some((e) => e.includes('alanı boş bırak')));
  const old = { ...base, categories: [...base.categories, 'excel.tyt.matematik.gecmis'] };
  const withOld = new Map([...catalog, ['excel.tyt.matematik.gecmis', { id: 'excel.tyt.matematik.gecmis', exam: 'TYT', subjectId: 'matematik', selectable: false }]]);
  assert.ok(validateLessons([old], { catalog: withOld }).errors.some((e) => e.includes('seçilemeyen eski katalog kimliği')));
});

test('karma set: hedef sınavın soruları önce; diğer sınav sorusu yalnız ortak kavramda ve sonra', () => {
  const meta = (id, exams) => ({ id, exams, confused: [] });
  const idx = { concepts: [meta('ortak', ['TYT', 'AYT']), meta('tyt', ['TYT'])], byId: {} };
  for (const m of idx.concepts) idx.byId[m.id] = m;
  const q = (conceptId, n, exam) => ({ conceptId, code: `${conceptId}-${exam}-${n}`, exam, archetype: 'a', difficulty: 2, cikmis: false });
  const banks = {
    ortak: [q('ortak', 1, 'AYT'), q('ortak', 2, 'AYT'), q('ortak', 3, 'TYT'), q('ortak', 4, 'TYT')],
    tyt: [q('tyt', 1, 'TYT'), q('tyt', 2, 'AYT')],
  };
  const state = { queue: {}, seen: {}, now: new Date('2026-10-31T12:00:00'), concepts: { ortak: { masteryValid: true, mastery: 0 }, tyt: { masteryValid: true, mastery: 0 } } };
  const picked = pickMixed({ index: idx, banks, state, seed: 's', track: 'TYT', size: 6 });
  const ortak = picked.filter((p) => p.conceptId === 'ortak').map((p) => p.question.exam);
  assert.deepEqual(ortak, [...ortak].sort((a, b) => (a === 'TYT' ? 0 : 1) - (b === 'TYT' ? 0 : 1)), 'TYT kaynaklılar önce');
  assert.ok(!picked.some((p) => p.question.code === 'tyt-AYT-2'), 'yalnız TYT kavramına AYT sorusu girmez');
});
