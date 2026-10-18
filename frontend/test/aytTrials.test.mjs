import test from 'node:test';
import assert from 'node:assert/strict';
import { AYT_AREAS, calculateAytTrial, estimateAytRank, latestTytTrial, validAytTrial } from '../src/aytTrials.js';
import { calculateTrial } from '../src/tytTrials.js';

test('alan ağırlıkları %60 eder ve ilgili dersleri gösterir', () => {
  for (const config of Object.values(AYT_AREAS)) {
    assert.equal(Object.values(config.weights).reduce((sum, weight) => sum + weight, 0), 60);
  }
  assert.deepEqual(Object.keys(AYT_AREAS.SAY.weights), ['math', 'physics', 'chemistry', 'biology']);
  assert.deepEqual(Object.keys(AYT_AREAS.EA.weights), ['math', 'literature', 'history1', 'geography1']);
  assert.deepEqual(Object.keys(AYT_AREAS.DIL.weights), ['language']);
});

test('alan puanı son TYT puanı, AYT ağırlıkları ve OBP ile hesaplanır', () => {
  const tytRows = [
    { id: 'new', date: '2026-10-12', answers: {}, nets: {}, testNets: { math: '15', turkish: '26', social: '14', science: '11' } },
    { id: 'old', date: '2026-09-12', answers: {}, nets: {}, testNets: { math: '20', turkish: '25' } },
  ];
  const last = latestTytTrial(tytRows);
  assert.equal(last.id, 'new');
  const tytScore = calculateTrial(last).score;
  const result = calculateAytTrial({ testNets: { math: '20', physics: '7', chemistry: '6,5', biology: '6,5' } }, 'SAY', tytScore, 400);
  assert.equal(result.net, 40);
  assert.equal(result.score, 100 + 0.4 * (tytScore - 100) + 400 * (0.3 * 20 / 40 + 0.1 * 7 / 14 + 0.1 * 6.5 / 13 + 0.1 * 6.5 / 13));
  assert.equal(result.placement, result.score + 48);
  assert.ok(result.rank > 0);
});

test('TYT veya alan neti olmadan alan puanı üretilmez', () => {
  const row = { testNets: { literature: '12' } };
  assert.equal(calculateAytTrial(row, 'SOZ', null).score, null);
  assert.equal(calculateAytTrial({ testNets: {} }, 'SOZ', 300).score, null);
  assert.equal(calculateAytTrial({ testNets: { literature: '0,25' } }, 'SOZ', 300).score, null);
});

test('net sınırı ve 2026 sıra eşiği doğrulanır', () => {
  assert.equal(validAytTrial({ id: '1', date: '2026-10-12', testNets: { physics: '14' } }), true);
  assert.equal(validAytTrial({ id: '1', date: '2026-10-12', testNets: { physics: '15' } }), false);
  assert.equal(estimateAytRank(400, 'SAY'), 58728);
  assert.equal(estimateAytRank(400, 'EA'), 4545);
});
