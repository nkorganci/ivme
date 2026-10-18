import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileExpr, compileLogic, truthAssignments } from '../src/tutor/expr.js';
import { balanced, parseRich } from '../src/tutor/richText.js';
import { frameState, validateVisual } from '../src/tutor/visualSpec.js';

const ROOT = fileURLToPath(new URL('../../ornek-veri/ogretim-pilotu/', import.meta.url));

function contents() {
  return readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((dir) =>
    readdirSync(join(ROOT, dir.name)).filter((f) => f.endsWith('.json')).map((file) => ({
      file: `${dir.name}/${file}`, content: JSON.parse(readFileSync(join(ROOT, dir.name, file), 'utf8')),
    })));
}

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, out));
  return out;
}

test('her pilot içeriğin görseli şablon sözleşmesine uyar ve ön yüzde çizilebilir', () => {
  const all = contents();
  assert.ok(all.length >= 5, 'pilot içerik bulunamadı');
  for (const { file, content } of all) {
    assert.deepEqual(validateVisual(content.visual), [], file);
    if (content.visual.recommended) {
      for (let i = 0; i < content.visual.frames.length; i += 1) assert.ok(frameState(content.visual, i).caption, `${file} kare ${i}`);
    }
  }
});

test('içerik metinlerinde üs/alt simge işaretlemesi dengeli', () => {
  for (const { file, content } of contents()) {
    for (const text of strings(content)) assert.ok(balanced(text), `${file}: ${text.slice(0, 60)}`);
  }
});

test('üs ve alt simge ayrıştırılır, düz metin bozulmaz', () => {
  assert.deepEqual(parseRich('x^2 + a_{n+1}'), [
    { type: 'text', value: 'x' }, { type: 'sup', value: '2' }, { type: 'text', value: ' + a' }, { type: 'sub', value: 'n+1' }]);
  assert.deepEqual(parseRich('C(25, 2) = 300'), [{ type: 'text', value: 'C(25, 2) = 300' }]);
  assert.deepEqual(parseRich('^ başta'), [{ type: 'text', value: '^ başta' }]);
});

test('ifade çözücü eval kullanmaz, bilinmeyen adı reddeder', () => {
  const f = compileExpr('(2*x^2 - 8)/((x - 2)*(x - 6))');
  assert.equal(f({ x: 3 }), (2 * 9 - 8) / (1 * -3));
  assert.equal(compileExpr('a*x + b', ['x', 'a', 'b'])({ x: 2, a: 3, b: 1 }), 7);
  assert.equal(compileExpr('-x^2')({ x: 3 }), -9);
  assert.equal(compileExpr('sqrt(16) + pi*0')({}), 4);
  assert.throws(() => compileExpr('alert(1)'));
  assert.throws(() => compileExpr('constructor'));
  assert.throws(() => compileExpr('x; y'));
});

test('önerme derleyicisi doğruluk tablosunu doğru üretir', () => {
  const implication = compileLogic('p → q', ['p', 'q']);
  const rows = truthAssignments(['p', 'q']).map((row) => implication(row));
  assert.deepEqual(rows, [true, false, true, true]);
  const contrapositive = compileLogic('¬q → ¬p', ['p', 'q']);
  assert.ok(truthAssignments(['p', 'q']).every((row) => implication(row) === contrapositive(row)));
  assert.throws(() => compileLogic('p → x', ['p', 'q']));
});

test('geçersiz görsel parametresi sessizce çizilmez, hata listesi döner', () => {
  const errors = validateVisual({ recommended: true, template: 'number-line', params: { min: 5, max: 1, rows: [] }, frames: [{ caption: 'x', show: ['yok'] }] });
  assert.ok(errors.some((e) => e.includes('min < max')));
  assert.ok(errors.some((e) => e.includes('bilinmeyen öğe')));
  assert.deepEqual(validateVisual({ recommended: false, reason: 'gerek yok' }), []);
});
