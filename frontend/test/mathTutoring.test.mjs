import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLessonDate, formatLessonDuration, formatSummaryDateRange, lessonDateBounds, lessonChanges, lessonFields, parseLessonRange, parseSummaryDateRange, sortLessons, summarizeLessons } from '../src/mathTutoring.js';

test('toplu kayıt tüm değişen derslerin son değerlerini alır, boş yeni satırı eklemez', () => {
  const first = { id: 1, date: '2026-10-15', start: '09:00', end: '10:00', topic: 'Konu', homework: '', note: '', status: 'PLANNED' };
  const second = { ...first, id: 2 };
  const drafts = { 1: { note: 'Son not' }, 2: { homework: 'Test 4', learning: { teacherEvaluation: 'Öğretmen notu' } } };
  const changes = lessonChanges([first, second], drafts, first);
  assert.deepEqual(changes.map((change) => change.id), [1, 2]);
  assert.equal(changes[0].fields.note, 'Son not');
  assert.equal(changes[1].fields.homework, 'Test 4');
  assert.equal(changes[1].fields.learning.teacherEvaluation, 'Öğretmen notu');
  assert.equal(lessonChanges([first], {}, first).length, 0);
  assert.equal(lessonChanges([first], {}, first, true)[0].id, 'new');
});

test('toplu kayıt herhangi bir ders geçersizse istek hazırlamadan hata verir', () => {
  const row = { id: 1, date: '2026-10-15', start: '09:00', end: '10:00', topic: '', homework: '', status: 'PLANNED' };
  assert.throws(() => lessonChanges([row, { ...row, id: 2 }], { 1: { note: 'Geçerli' }, 2: { timeRange: 'hatalı' } }, row), /2\. ders: Saat aralığını/);
});

test('saat aralığı yalnız seçili dersin saatlerine dönüşür', () => {
  const row = { date: '2026-10-11', start: '00:00:00', end: '01:00:00',
    timeRange: '09:30-10:45', topic: 'Konu', homework: 'Ödev', status: 'PLANNED', note: 'Tekrar et' };
  assert.deepEqual(lessonFields(row), { date: '2026-10-11', start: '09:30', end: '10:45',
    topic: 'Konu', homework: 'Ödev', status: 'PLANNED', note: 'Tekrar et' });
  assert.equal(row.start, '00:00:00');
  assert.equal(row.end, '01:00:00');
  assert.equal(parseLessonRange('23:00-01:00'), null);
  assert.equal(parseLessonRange('09:00-09:00'), null);
});

test('araya eski tarih eklenince ders sırası yeniden belirlenir', () => {
  const rows = [{ id: 2, date: '2026-10-14', start: '12:00' },
    { id: 3, date: '2026-10-12', start: '13:00' },
    { id: 1, date: '2026-10-12', start: '09:00' }];
  assert.deepEqual(sortLessons(rows).map((row) => row.id), [1, 3, 2]);
});

test('kaydedilen saatler duruma göre ve toplamda dakika hassasiyetinde sayılır', () => {
  const rows = [
    { start: '09:00:00', end: '10:30:00', status: 'PLANNED' },
    { start: '12:00:00', end: '14:00:00', status: 'COMPLETED' },
    { start: '15:15:00', end: '15:45:00', status: 'CANCELLED' },
  ];
  assert.deepEqual(summarizeLessons(rows), { planned: 90, completed: 120, cancelled: 30, total: 240 });
  assert.equal(formatLessonDuration(90), '1 sa 30 dk');
  assert.equal(formatLessonDuration(0), '0 sa');
});

test('seçilen tarihin ayı, günü ve haftanın günü otomatik gösterilir', () => {
  assert.equal(formatLessonDate('2026-10-12'), 'Ekim 12, Pazartesi');
  assert.equal(formatLessonDate('2026-10-13'), 'Ekim 13, Salı');
  assert.equal(formatLessonDate(''), 'Tarih seçin');
});

test('özet tarih aralığı uç günleri dahil ederek saatleri süzer', () => {
  const rows = [
    { date: '2026-10-10', start: '09:00', end: '10:00', status: 'PLANNED' },
    { date: '2026-10-12', start: '09:00', end: '10:30', status: 'COMPLETED' },
    { date: '2026-10-14', start: '09:00', end: '10:00', status: 'CANCELLED' },
  ];
  assert.deepEqual(lessonDateBounds(rows, '2026-10-12'), { start: '2026-10-10', end: '2026-10-14' });
  assert.deepEqual(lessonDateBounds([], '2026-10-12'), { start: '2026-10-12', end: '2026-10-12' });
  assert.deepEqual(summarizeLessons(rows, { start: '2026-10-12', end: '2026-10-14' }),
    { planned: 0, completed: 90, cancelled: 60, total: 150 });
});

test('özet tarih aralığı tek alanda gösterilir ve geçerli tarihlere dönüşür', () => {
  const range = { start: '2026-10-11', end: '2026-10-14' };
  assert.equal(formatSummaryDateRange(range), '11.10.2026 – 14.10.2026');
  assert.deepEqual(parseSummaryDateRange('11.10.2026 – 14.10.2026'), range);
  assert.equal(parseSummaryDateRange('31.02.2026 – 14.10.2026'), null);
  assert.equal(parseSummaryDateRange('14.10.2026 – 11.10.2026'), null);
});
