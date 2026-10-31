// TAS-05: ortak PRATIK seti seçimi gerçek banka dosyalarıyla — gösterilen sayı = kurulan set, aynı görsel ikinci kez yok.
// node --test testler/konu-ogrenme-ortak-set.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { collapseTwins, expandBank, lastSeen, pickMastery, pickPast, pickPractice, pickReview, tierOf } from '../frontend/src/learn/engine/selection.js';
import { PRACTICE_SIZE, TEST_SIZE, pickSharedSet, plannedSize, requestItems, sizeNote } from '../frontend/src/learn/engine/sharedSet.js';

const root = new URL('../frontend/src/learn/', import.meta.url);
const groups = JSON.parse(readFileSync(new URL('bank/_gorsel.json', root), 'utf8')).groups;
const lessons = Object.fromEntries(readdirSync(new URL('content/dersler/', root)).filter((n) => n.endsWith('.ders'))
  .map((n) => [n.replace(/\.ders$/, ''), parseLesson(readFileSync(new URL(`content/dersler/${n}`, root), 'utf8'), n.replace(/\.ders$/, ''))]));
const load = (id) => collapseTwins(expandBank(id, JSON.parse(readFileSync(new URL(`bank/${id}.json`, root), 'utf8')).questions), groups);
const state = (seen = {}) => ({ seen, queue: {}, concepts: {}, dueCards: [], now: new Date('2026-10-31T12:00:00Z') });
const concepts = Object.keys(lessons).filter((id) => { try { load(id); return true; } catch { return false; } });

test('temel-kavramlar: 413 kayıt, 53 kitapçık kopyası ayrılır → 360 tekil soru; 52 çıkmış soruda ikiz yok', () => {
  const raw = expandBank('temel-kavramlar', JSON.parse(readFileSync(new URL('bank/temel-kavramlar.json', root), 'utf8')).questions);
  const bank = load('temel-kavramlar');
  assert.equal(raw.length, 413);
  assert.equal(bank.length, 360);
  assert.equal(raw.filter((q) => q.cikmis).length, 52);
  assert.equal(bank.filter((q) => q.cikmis).length, 52, 'çıkmış sorular hiç elenmemeli');
  // Elenen her kod, tutulan bir sorunun ikizi olarak kayıtlıdır.
  const kept = new Set(bank.map((q) => q.code));
  const twinCodes = new Set(bank.flatMap((q) => q.twins ?? []));
  assert.equal(twinCodes.size, 53);
  for (const q of raw) assert.ok(kept.has(q.code) || twinCodes.has(q.code), q.code);
});

test('çıkmış sorular: gizli 40 sınırı yok; bütün 52 soru açılır ve gösterilen sayıyla aynıdır', () => {
  const bank = load('temel-kavramlar');
  assert.equal(plannedSize('cikmis', bank), 52);
  const items = pickSharedSet({ type: 'cikmis', meta: lessons['temel-kavramlar'], bank, state: state(), seed: 's' });
  assert.equal(items.length, 52);
  assert.equal(new Set(items.map((i) => i.question.code)).size, 52);
  assert.ok(items.every((i) => i.question.cikmis));
  const years = items.map((i) => i.question.year);
  assert.deepEqual(years, [...years].sort((a, b) => a - b), 'yıl sırası');
  assert.equal(pickPast({ bank }).length, 52);
});

test('her kavramda: konu testi boyutu = min(12, tekil soru), kod ve görsel tekil, kararlı tohum aynı seti verir', () => {
  assert.ok(concepts.length >= 30);
  for (const id of concepts) {
    const bank = load(id);
    const want = Math.min(TEST_SIZE, bank.length);
    assert.equal(plannedSize('test', bank), want, id);
    for (const seed of ['a', 'b', 'c']) {
      const items = pickSharedSet({ type: 'test', meta: lessons[id], bank, state: state(), seed });
      assert.equal(items.length, want, `${id} ${seed}`);
      const codes = items.map((i) => i.question.code);
      assert.equal(new Set(codes).size, codes.length, `${id}: yinelenen kod`);
      const images = items.map((i) => groups[i.question.code] ?? i.question.code);
      assert.equal(new Set(images).size, images.length, `${id}: aynı görsel iki kez`);
      for (const item of items) for (const twin of item.question.twins ?? []) assert.ok(!codes.includes(twin), `${id}: ikiz ${twin} sette`);
    }
    const a = pickSharedSet({ type: 'test', meta: lessons[id], bank, state: state(), seed: 'x' }).map((i) => i.question.code);
    const b = pickSharedSet({ type: 'test', meta: lessons[id], bank, state: state(), seed: 'x' }).map((i) => i.question.code);
    assert.deepEqual(a, b, id);
  }
});

test('küçük havuz: gerçek sayı söylenir, aynı soruyla doldurulmaz', () => {
  const meta = lessons['temel-kavramlar'];
  const bank = load('temel-kavramlar').slice(0, 5);
  assert.equal(plannedSize('test', bank), 5);
  assert.match(sizeNote('test', bank), /5 tekil soru/);
  const items = pickSharedSet({ type: 'test', meta, bank, state: state(), seed: 'k' });
  assert.equal(items.length, 5);
  assert.equal(new Set(items.map((i) => i.question.code)).size, 5);
  assert.equal(sizeNote('test', load('temel-kavramlar')), '');
  assert.equal(pickSharedSet({ type: 'test', meta, bank: [], state: state(), seed: 'k' }).length, 0);
});

test('soru tipi alıştırması: yalnız o tipten, en çok 6; sayı seçimle eşleşir', () => {
  const meta = lessons['temel-kavramlar'];
  const bank = load('temel-kavramlar');
  for (const archetype of meta.archetypes.map((a) => a.id)) {
    const items = pickSharedSet({ type: 'practice', meta, bank, state: state(), seed: 'p', archetype });
    assert.equal(items.length, plannedSize('practice', bank, archetype), archetype);
    assert.ok(items.length <= PRACTICE_SIZE);
    assert.ok(items.every((i) => i.question.archetype === archetype));
  }
});

test('görsel ikizi görülmüşse tutulan soru da görülmüş sayılır (yakın tekrar korunur)', () => {
  const bank = load('temel-kavramlar');
  const withTwin = bank.find((q) => q.twins?.length);
  assert.ok(withTwin);
  const twin = withTwin.twins[0];
  const seen = state({ [twin]: '2026-10-30T10:00:00.000Z' });
  assert.equal(lastSeen(withTwin, seen), '2026-10-30T10:00:00.000Z');
  assert.equal(tierOf(withTwin, seen), 2);
  assert.equal(tierOf(withTwin, state()), 0);
});

test('sunucu isteği: soru kimliği, tip ve zorluk taşır', () => {
  const bank = load('temel-kavramlar');
  const items = pickSharedSet({ type: 'practice', meta: lessons['temel-kavramlar'], bank, state: state(), seed: 'r', archetype: 'isaret' });
  const body = requestItems(items);
  assert.equal(body.length, items.length);
  assert.ok(body.every((b) => Number.isInteger(b.questionId) && b.archetypeId === 'isaret' && [1, 2, 3].includes(b.difficulty)));
});

test('ikiz haritası: her grup en az iki kodu aynı bankada barındırır', () => {
  const byGroup = new Map();
  for (const [code, group] of Object.entries(groups)) byGroup.set(group, [...(byGroup.get(group) ?? []), code]);
  for (const [group, codes] of byGroup) assert.ok(codes.length >= 2, group);
  const owners = new Map();
  for (const id of concepts) for (const q of expandBank(id, JSON.parse(readFileSync(new URL(`bank/${id}.json`, root), 'utf8')).questions)) owners.set(q.code, id);
  for (const codes of byGroup.values()) assert.ok(new Set(codes.map((c) => owners.get(c))).size === 1 || codes.every((c) => owners.has(c)));
});

test('TAS-06: “Tekrar gösterme” dediği sorular hiçbir otomatik sette yer almaz; gösterilen sayı = kurulan set', () => {
  const meta = lessons['temel-kavramlar'];
  const bank = load('temel-kavramlar');
  const hiddenQuestions = [...bank.filter((q) => q.cikmis).slice(0, 3), ...bank.filter((q) => !q.cikmis).slice(0, 60)];
  const hidden = new Set(hiddenQuestions.map((q) => q.id));
  const hiding = { ...state(), hidden };
  const codes = (items) => items.map((i) => i.question.code);
  for (const type of ['test', 'cikmis']) {
    const items = pickSharedSet({ type, meta, bank, state: hiding, seed: 'g' });
    assert.ok(items.every((i) => !hidden.has(i.question.id)), type);
    assert.equal(items.length, plannedSize(type, bank, null, hiding), type);
  }
  assert.equal(plannedSize('cikmis', bank, null, hiding), 49, '52 çıkmıştan 3 gizli');
  assert.equal(plannedSize('cikmis', bank, null, state()), 52);
  for (const archetype of meta.archetypes.map((a) => a.id)) {
    const items = pickSharedSet({ type: 'practice', meta, bank, state: hiding, seed: 'g', archetype });
    assert.ok(items.every((i) => !hidden.has(i.question.id)), archetype);
    assert.equal(items.length, plannedSize('practice', bank, archetype, hiding), archetype);
  }
  assert.ok(pickMastery({ meta, bank, state: hiding, seed: 'g', practicePool: [] }).every((i) => !hidden.has(i.question.id)));
  assert.ok(pickReview({ meta, bank, state: hiding, seed: 'g' }).filter((i) => i.question).every((i) => !hidden.has(i.question.id)));
  // Gizli soru yoksa hiçbir şey değişmez.
  assert.deepEqual(codes(pickSharedSet({ type: 'test', meta, bank, state: { ...state(), hidden: new Set() }, seed: 'g' })), codes(pickSharedSet({ type: 'test', meta, bank, state: state(), seed: 'g' })));
});

test('TAS-06: bekleyen “Tekrar göster” sorusu yakın zamanda görülmüş olsa da öne alınır', () => {
  const meta = lessons['temel-kavramlar'];
  const bank = load('temel-kavramlar');
  const archetype = meta.archetypes[0].id;
  const target = bank.filter((q) => q.archetype === archetype && !q.cikmis)[5];
  const recent = state({ [target.code]: '2026-10-31T10:00:00.000Z' });
  const without = pickPractice({ bank, state: recent, archetype, count: 6, seed: 'a' });
  assert.ok(!without.some((i) => i.question.id === target.id), 'yakın zamanda görülen soru normalde seçilmez');
  const wanting = { ...recent, again: new Set([target.id]) };
  for (const seed of ['a', 'b', 'c']) assert.ok(pickPractice({ bank, state: wanting, archetype, count: 6, seed }).some((i) => i.question.id === target.id), seed);
  assert.ok(pickSharedSet({ type: 'practice', meta, bank, state: wanting, seed: 'a', archetype }).some((i) => i.question.id === target.id));
  // Gizli ve tekrar aynı anda: gizli kazanır.
  assert.ok(!pickPractice({ bank, state: { ...wanting, hidden: new Set([target.id]) }, archetype, count: 6, seed: 'a' }).some((i) => i.question.id === target.id));
});
