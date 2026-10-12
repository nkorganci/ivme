import assert from 'node:assert/strict';
import test from 'node:test';
import { addRow, changeDuration, cloneRows, makeRows, parseInterval, removeRow, rowStart, validRows } from '../frontend/src/studentSchedule.js';

test('16 başlangıç satırı ve 24 saatlik saat biçimi', () => {
  const rows = makeRows();
  assert.equal(rows.length, 16);
  assert.equal(rowStart(rows, 9), 9 * 60);
  assert.equal(parseInterval('09:00-1:00', rowStart(rows, 9)), 4 * 60);
});

test('bir aralığı uzatmak sonraki satırların başlangıcını kaydırır', () => {
  const rows = changeDuration(makeRows(), 9, 4 * 60);
  assert.equal(rowStart(rows, 10), 13 * 60);
  assert.equal(rows.length, 16);
  assert.equal(validRows(rows), true);
});

test('satır ekleme ve çıkarma çalışma notlarını koruyarak saatleri kaydırır', () => {
  const rows = makeRows();
  rows[2].cells[0] = 'Matematik';
  const added = addRow(rows, 0);
  assert.equal(added.length, 17);
  assert.equal(added[3].cells[0], 'Matematik');
  assert.equal(rowStart(added, 3), 3 * 60);
  const removed = removeRow(added, 1);
  assert.equal(removed.length, 16);
  assert.equal(removed[2].cells[0], 'Matematik');
});

test('24:00 sınırı aşılmaz; boş hafta saatleri korur', () => {
  const rows = makeRows();
  rows[0].cells[0] = 'Okuma';
  assert.equal(changeDuration(rows, 0, 10 * 60), null);
  const blank = cloneRows(rows, false);
  assert.equal(blank[0].minutes, rows[0].minutes);
  assert.equal(blank[0].cells[0], '');
  assert.equal(rows[0].cells[0], 'Okuma');
});
