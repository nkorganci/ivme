import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, trial } from '../frontend/src/learn/lab/parity.js';

test('tam sayı koşulu: çift katsayı toplamın tekliğini korur, negatifler ve sıfır dahil', () => {
  for (const scenario of SCENARIOS.slice(0, 2)) {
    for (let b = -1000; b <= 1000; b++) {
      const value = trial(scenario, b);
      assert.equal(value.a + scenario.coefficient * b, scenario.total);
      assert.equal(value.holds, scenario.total % 2 === 1);
    }
    assert.equal(trial(scenario, .5), null);
  }
});
test('tek katsayı: b’nin tekliği değişince iddia değişir', () => {
  const scenario = SCENARIOS[2];
  for (let b = -100; b <= 100; b++) assert.equal(trial(scenario, b).holds, b % 2 === 0);
});
test('gerçek sayılar: koşula uyan karşı örnek ve tam sayı olmayan sonuç', () => {
  assert.deepEqual(trial(SCENARIOS[3], .5), { a: 16, b: .5, parity: 'Çift', holds: false });
  assert.equal(trial(SCENARIOS[3], 0).holds, true);
  assert.equal(trial(SCENARIOS[3], .25).parity, 'Tam sayı değil');
  assert.equal(trial(SCENARIOS[1], 9).parity, 'Çift');
  assert.equal(trial(SCENARIOS[0], NaN), null);
});
test('aktarım: tek çarpımdan üç ifadenin sonucu negatif tam sayılarda da çıkar', () => {
  for (let a = -20; a <= 20; a++) for (let b = -20; b <= 20; b++) {
    if (Math.abs(a * (b + 1) % 2) !== 1) continue;
    assert.equal(Math.abs(a % 2), 1);
    assert.equal(Math.abs(b % 2), 0);
    assert.equal(Math.abs((a + b) % 2), 1);
    assert.equal(Math.abs(a * b % 2), 0);
    assert.equal(Math.abs((a ** 2 + b) % 2), 1);
  }
});
test('karşı örnek hem koşulu sağlamalı hem iddiayı çürütmeli', () => {
  const isCounterexample = (x, y) => x * y % 2 === 0 && (x + y) % 2 === 0;
  assert.equal(isCounterexample(2, 3), false);
  assert.equal(isCounterexample(1, 3), false);
  assert.equal(isCounterexample(2, 4), true);
});
