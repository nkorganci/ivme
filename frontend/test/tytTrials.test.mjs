import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTytChartData, calculateTrial, estimateTytRank, sortTrialsByDate, validTrial } from '../src/tytTrials.js';

test('denemeleri eski tarihten yeni tarihe, sonuçlarıyla birlikte sıralar', () => {
  const trials = [
    { id: 'new', date: '2026-10-12', testNets: { math: '15' } },
    { id: 'blank', date: '', testNets: { math: '4' } },
    { id: 'old', date: '2026-09-01', testNets: { math: '26' } },
  ];
  const sorted = sortTrialsByDate(trials);
  assert.deepEqual(sorted.map(({ id }) => id), ['old', 'new', 'blank']);
  assert.equal(sorted[0].testNets.math, '26');
  assert.equal(trials[0].id, 'new');
});

test('grafik tarih sırasını korur ve boş branşları sıfır saymaz', () => {
  const newer = { id: 'new', date: '2026-10-12', answers: {}, testNets: {
    math: '15', turkish: '26', science: '11', social: '14',
  } };
  const older = { id: 'old', date: '2026-09-01', answers: {}, testNets: { math: '8' } };
  const rows = [newer, older].map((trial) => ({ ...trial, ...calculateTrial(trial) }));
  const points = buildTytChartData(rows);
  assert.deepEqual(points.map(({ id }) => id), ['old', 'new']);
  assert.equal(points[0].math, 8);
  assert.equal(points[0].turkish, null);
  assert.equal(points[0].net, null);
  assert.equal(points[0].score, null);
  assert.equal(points[1].net, 66);
  assert.equal(Number(points[1].score.toFixed(2)), 320);
});

test('verilen 2026 örneğindeki yaklaşık puanı ve OBP katkısını hesaplar', () => {
  const trial = { id: 'example', date: '2026-06-20', name: 'Referans', answers: {
    turkce: { correct: 26, wrong: 14 },
    matematik: { correct: 8, wrong: 4 },
    tarih: { correct: 4, wrong: 1 },
    cografya: { correct: 4, wrong: 1 },
    felsefe: { correct: 4, wrong: 1 },
    din: { correct: 2, wrong: 3 },
    fizik: { correct: 3, wrong: 3 },
    kimya: { correct: 3, wrong: 3 },
    biyoloji: { correct: 3, wrong: 3 },
  } };
  assert.equal(validTrial(trial), true);
  const result = calculateTrial(trial, 454.472);
  assert.equal(result.totals.turkish, 22.5);
  assert.equal(result.totals.math, 7);
  assert.equal(result.totals.social, 12.5);
  assert.equal(result.totals.science, 6.75);
  assert.equal(result.net, 48.75);
  assert.equal(Number(result.score.toFixed(2)), 262.58);
  assert.equal(Number((result.placement - result.score).toFixed(5)), 54.53664);
});

test('ders soru sınırını aşan kayıtları reddeder', () => {
  assert.equal(validTrial({ id: 'a', date: '2026-10-12', name: '', answers: { fizik: { correct: 7, wrong: 1 } } }), false);
});

test('doğrudan girilen netleri toplar ve eski doğru-yanlış kayıtlarını korur', () => {
  const trial = { id: 'net', date: '2026-10-12', name: '', answers: {
    matematik: { correct: 8, wrong: 4 },
    fizik: { correct: 3, wrong: 1 },
  }, nets: { matematik: '12,5', fizik: '3,25', kimya: '2,5' } };
  assert.equal(validTrial(trial), true);
  const result = calculateTrial(trial);
  assert.equal(result.totals.math, 12.5);
  assert.equal(result.totals.science, 5.75);
  assert.equal(result.net, 18.25);
  assert.equal(Number(result.score.toFixed(2)), 160.72);
  trial.nets.matematik = '';
  assert.equal(calculateTrial(trial).totals.math, 0);
});

test('dört test netinden TYT toplamını ve puanını hesaplar', () => {
  const trial = { id: 'groups', date: '2026-10-12', name: '', answers: {}, nets: {}, testNets: {
    math: '24,5', turkish: '31,25', science: '12,75', social: '15,5',
  } };
  assert.equal(validTrial(trial), true);
  const result = calculateTrial(trial);
  assert.equal(result.net, 84);
  assert.equal(result.totals.math, 24.5);
  assert.equal(result.totals.social, 15.5);
  assert.equal(Number(result.score.toFixed(2)), 379.64);
});

test('dershane referansı 66 net için 320 puan verir', () => {
  const trial = { id: 'calibration', date: '2026-10-12', name: '', answers: {}, testNets: {
    math: '15', turkish: '26', social: '14', science: '11',
  } };
  const result = calculateTrial(trial);
  assert.equal(result.net, 66);
  assert.equal(Number(result.score.toFixed(2)), 320);
});

test('TYT sırası 2026 resmi eşiklerinden arada hesaplanır', () => {
  assert.equal(estimateTytRank(300), 417935);
  assert.equal(estimateTytRank(290), Math.round((417935 + 577094) / 2));
  assert.equal(estimateTytRank(110), null);
});
