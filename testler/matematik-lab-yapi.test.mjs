// Bütün konu laboratuvarları için yapı ve kabul bağı denetimi (matematik-laboratuvari.md §Her laboratuvarın öğretim kabulü).
// Matematik doğruluğu konuya özgü `testler/lab-<kimlik>.test.mjs` dosyalarında bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(ROOT, 'frontend/src/learn/lab/konular');
const csv = readFileSync(join(ROOT, 'veri/sorular-tum.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const head = csv[0].split(',');
const ANSWERS = Object.fromEntries(csv.slice(1).map((line) => { const c = line.split(','); return [c[0], c[head.indexOf('correct_answer')]]; }));
const files = readdirSync(DIR).filter((f) => f.endsWith('.js') && f !== 'index.js');
const registry = readFileSync(join(DIR, 'index.js'), 'utf8');

export const labs = await Promise.all(files.map(async (f) => (await import(pathToFileURL(join(DIR, f)).href)).default));
// Konuya özgü matematik testleri (testler/lab-<kimlik>.test.mjs) aynı çalıştırmada kaydolur; her lab dosyasının testi olmalı.
const TESTS = join(ROOT, 'testler');
for (const lab of labs) await import(pathToFileURL(join(TESTS, `lab-${lab.conceptId}.test.mjs`)).href);

const workedIn = (conceptId) => {
  const ders = join(ROOT, 'frontend/src/learn/content/dersler', `${conceptId}.ders`);
  return new Set([...readFileSync(ders, 'utf8').matchAll(/^::cikmis (\S+)/gm)].map((m) => m[1]));
};
const bankCodes = (conceptId) => new Set(JSON.parse(readFileSync(join(ROOT, 'frontend/src/learn/bank', `${conceptId}.json`), 'utf8')).questions.map((q) => q.c));
const choiceOk = (q, label) => {
  assert.ok(q.options.length >= 2, `${label}: en az iki seçenek`);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${label}: cevap aralıkta`);
  assert.equal(q.feedback.length, q.options.length, `${label}: her seçenek için geri bildirim`);
  q.feedback.forEach((f, i) => { if (i !== q.answer) assert.ok(f.length > 20, `${label}: yanlış seçenek ${i} düşünceye bağlı geri bildirim`); });
};

test('her lab dosyası kayıtlı, konu kimliği ve dersi var', () => {
  assert.ok(labs.length > 0);
  for (const lab of labs) {
    assert.ok(registry.includes(`'${lab.conceptId}':`), `${lab.conceptId} index.js kaydı`);
    assert.ok(readFileSync(join(ROOT, 'frontend/src/learn/content/dersler', `${lab.conceptId}.ders`), 'utf8').length > 0);
    assert.ok(lab.goals.length >= 1);
    assert.equal(new Set(lab.goals.map((g) => g.id)).size, lab.goals.length, 'hedef kimlikleri tekil');
  }
});

for (const lab of labs) {
  for (const goal of lab.goals) {
    const label = `${lab.conceptId}/${goal.id}`;
    test(`${label}: hedef, yanılgı ve gerçek soru bağı`, () => {
      assert.ok(goal.objective?.length > 30 && goal.misconception?.length > 30, 'ölçülebilir hedef ve yanılgı');
      const worked = workedIn(lab.conceptId);
      const bank = bankCodes(lab.conceptId);
      if (!goal.real?.length) assert.ok(goal.realNote?.length > 40, 'gerçek soru yoksa nedeni yazılı');
      for (const r of goal.real ?? []) {
        assert.equal(ANSWERS[r.code], r.answer, `${r.code} cevabı CSV ile aynı`);
        assert.ok(bank.has(r.code), `${r.code} konu bankasında (ortak pratik ekranında açılabilir)`);
        assert.ok(!worked.has(r.code), `${r.code} derste çözümü gösterilmiş; bağımsız aktarıma girmez`);
        assert.ok(r.why.length > 20);
      }
    });
    if (goal.custom) continue;
    test(`${label}: tahmin → deney → gerekçe → aktarım akışı`, () => {
      const { predict, experiment: ex } = goal;
      assert.equal(predict.insight.length, predict.options.length, 'her tahmine deney sonrası yorum');
      const start = ex.compute(ex.initial);
      assert.equal(ex.target.test(ex.initial, start), false, 'başlangıç durumu hedef değil: öğrenci hamle yapmalı');
      assert.ok(ex.diagnose(ex.initial, start).length > 20, 'hedef dışı kayda hataya özel yorum');
      const values = { ...ex.initial, ...ex.target.example };
      assert.equal(ex.target.test(values, ex.compute(values)), true, 'örnek hedef durumu gerçekten sağlar');
      for (const c of ex.controls) {
        const v = values[c.key];
        if (c.options) assert.ok(c.options.some(([o]) => o === v), `${c.key} seçeneği`);
        else assert.ok(v >= c.min && v <= c.max, `${c.key} aralıkta`);
      }
      assert.ok(ex.readout(values, ex.compute(values)).length >= 2);
      assert.ok(goal.reasons.length >= 1);
      goal.reasons.forEach((r, i) => choiceOk(r, `${label} gerekçe ${i + 1}`));
      for (const key of ['proof', 'rule', 'condition', 'trap']) assert.ok(goal[key]?.length > 20, `${key} yazılı`);
      assert.ok(goal.transfer.length >= 3, 'yakın → farklı sunum/yöntem aktarımı');
      assert.ok(new Set(goal.transfer.map((t) => t.level)).size >= 2, 'aktarım düzeyleri farklı');
      for (const t of goal.transfer) { choiceOk(t, `${label} ${t.id}`); assert.equal(t.hints.length, 3, `${t.id}: üç basamaklı ipucu`); }
    });
  }
}
