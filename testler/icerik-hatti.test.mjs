// TAS-09 içerik hattının ortak kabulü: her görev tanımı (icerik-hatti/gorevler/*.json) için yayımlanan kanıt
// dersle, çözümlerle ve ortak konu testi seçimiyle tutarlı mı? Konuya özgü hesap testleri görev tanımındaki
// `tests` listesindedir. IVME_ICERIK_KAVRAM verilirse yalnız o konu denetlenir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseLesson, scopeToTracks } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { EVIDENCE } from '../frontend/src/learn/content/kanit/index.js';
import { evidenceForQuestion } from '../frontend/src/learn/content/evidence.js';
import { expandBank, collapseTwins } from '../frontend/src/learn/engine/selection.js';
import { plannedSize, pickSharedSet } from '../frontend/src/learn/engine/sharedSet.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url));
const json = (path) => JSON.parse(read(path));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const TASKS = 'icerik-hatti/gorevler/';
// Henüz derlenmemiş (taslak aşamasındaki) görevin yayımlanmış kanıtı yoktur; yalnız derlenmiş görevler denetlenir.
const specs = readdirSync(new URL('../' + TASKS, import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => json(TASKS + f))
  .filter((s) => existsSync(new URL('../' + s.output, import.meta.url)));
const only = process.env.IVME_ICERIK_KAVRAM;
const twins = json('frontend/src/learn/bank/_gorsel.json').groups;
const state = { now: new Date('2026-10-31T12:00:00Z'), seen: {}, queue: {}, concepts: {}, dueCards: [], hidden: new Set(), again: new Set() };

test('kayıt modülü: kanıtı derlenmiş her görev tarayıcıya aynı dosyayla gider', () => {
  const published = specs;
  assert.deepEqual(Object.keys(EVIDENCE).sort(), published.map((s) => s.conceptId).sort());
  for (const spec of published) assert.deepEqual(EVIDENCE[spec.conceptId], json(spec.output), spec.conceptId);
  const codes = published.flatMap((s) => Object.keys(s.questions));
  assert.equal(new Set(codes).size, codes.length, 'bir soru yalnız bir konunun kaynaklı çözümü olabilir');
});

for (const spec of specs.filter((s) => !only || s.conceptId === only)) {
  const id = spec.conceptId;
  const evidence = json(spec.output);
  const lessonBytes = read(spec.lesson);
  const lesson = parseLesson(lessonBytes.toString());
  const decisions = existsSync(new URL(`../icerik-hatti/kararlar/${id}.json`, import.meta.url))
    ? json(`icerik-hatti/kararlar/${id}.json`) : { decisions: [], observations: [] };

  test(`${id}: kaynak, bölüm ve çözüm sürümü; değişen içerik eski kanıtla kabul edilmez`, () => {
    assert.equal(evidence.conceptId, id);
    assert.equal(digest(lessonBytes), evidence.lessonSha256);
    assert.deepEqual(Object.keys(evidence.sections), lesson.sections.map((s) => s.id));
    assert.match(evidence.primarySource.sha256, /^[a-f0-9]{64}$/);
    for (const section of lesson.sections) {
      const bound = evidence.sections[section.id];
      assert.deepEqual(section.exams.length ? section.exams : lesson.exams, bound.exams, section.id);
      assert.ok(bound.claims.length > 0, `${section.id}: kaynak iddiası yok`);
      for (const ref of bound.claims) {
        const claim = evidence.claims[ref];
        assert.ok(claim, `${section.id}: ${ref} tanımsız`);
        assert.ok(claim.blocks.length > 0 && claim.blocks.every((b) => b.bbox.length === 4 && /^[a-f0-9]{64}$/.test(b.textSha256)));
        assert.equal(claim.url, `${evidence.primarySource.url}#page=${claim.page}`);
      }
    }
    for (const track of lesson.exams) assert.ok(scopeToTracks(lesson, [track]).sections.length > 0);
    for (const [code, source] of Object.entries(evidence.questions)) {
      const solution = WORKED_EXAMS[code];
      assert.ok(solution, `${code}: çözüm yok`);
      assert.equal(solution.conceptId, id, code);
      assert.equal(digest(JSON.stringify(solution)), source.solutionSha256, `${code}: çözüm kanıttan sonra değişti`);
      assert.equal(solution.answer, source.answerKey, code);
      assert.ok(solution.steps.length && solution.steps.every((s) => s.text && s.why), code);
      assert.ok(solution.check && solution.tip && solution.mistake && solution.cue, code);
      assert.equal(solution.teachingRole ?? 'guided', source.role, code);
      assert.equal(source.role === 'guided', lesson.practiceIds.includes(code), code);
      assert.ok(source.claims.every((ref) => evidence.claims[ref]), code);
      assert.match(source.imageSha256, /^[a-f0-9]{64}$/);
      assert.equal(evidenceForQuestion(code)?.conceptId, id);
    }
    for (const code of lesson.practiceIds) assert.ok(evidence.questions[code], `${code}: derste çözülen soru kaynaklı listede yok`);
    assert.deepEqual(evidence.independentCodes, Object.entries(evidence.questions).filter(([, q]) => q.role === 'independent').map(([c]) => c));
  });

  test(`${id}: öğretmen onayı ve öğrenci gözlemi yalnız insan kaydından gelir`, () => {
    const accepted = decisions.decisions.some((d) => d.role === 'ogretmen' && d.decision === 'KABUL');
    if (!accepted) {
      assert.equal(evidence.review.teacherApproved, false);
      assert.ok(Object.values(evidence.questions).every((q) => q.teacherApproved === false));
    }
    if (!decisions.observations.length) assert.equal(evidence.review.studentTransferObserved, false);
  });

  test(`${id}: konu testi yalnız bağımsız ve açıklamalı sorular; eksik soru başka soruyla doldurulmaz`, () => {
    const bank = collapseTwins(expandBank(id, json(`frontend/src/learn/bank/${id}.json`).questions), twins);
    const pick = (pool, student = state) => pickSharedSet({ type: 'test', meta: lesson, bank: pool, state: student, seed: 'tas09' });
    const present = evidence.independentCodes.filter((code) => bank.some((q) => q.code === code));
    assert.deepEqual(present, evidence.independentCodes, 'bağımsız aktarım soruları konu bankasında olmalı');
    assert.deepEqual(pick(bank).map((i) => i.question.code).sort(), [...present].sort());
    for (const q of pick(bank)) assert.ok(!lesson.practiceIds.includes(q.question.code));
    const hidden = new Set(bank.filter((q) => evidence.independentCodes.includes(q.code)).map((q) => q.id));
    assert.equal(plannedSize('test', bank, null, { ...state, hidden }), 0);
    assert.deepEqual(pick(bank, { ...state, hidden }), []);
  });
}
