import assert from 'node:assert/strict';
import test from 'node:test';
import { addRow, changeDuration, changeInterval, cloneRows, makeRows, nextWeekRows, parseInterval, parseTimeRange, removeRow, rowHasContent, rowStart, validRows } from '../frontend/src/studentSchedule.js';

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

test('başlangıç ve bitiş düzenlemesi komşu aralıkları kaydırır', () => {
  let rows = changeInterval(makeRows(), 0, parseTimeRange('06:00-07:00'));
  assert.equal(rowStart(rows, 0), 6 * 60);
  assert.equal(rowStart(rows, 1), 7 * 60);
  rows = changeInterval(rows, 3, parseTimeRange('09:30-12:00'));
  assert.equal(rowStart(rows, 3), 9 * 60 + 30);
  assert.equal(rowStart(rows, 4), 12 * 60);
  assert.equal(rows[2].minutes, 90);
  assert.equal(validRows(rows), true);
});

test('09:00-12:00 ilk satırda sonraki saatleri kaydırır ve 24:00 sınırında durur', () => {
  const rows = changeInterval(makeRows(), 0, parseTimeRange('09:00-12:00'));
  assert.equal(rowStart(rows, 0), 9 * 60);
  assert.equal(rowStart(rows, 1), 12 * 60);
  assert.equal(rowStart(rows, rows.length - 1) + rows.at(-1).minutes, 24 * 60);
  assert.equal(rows.length, 13);
});

test('satır düzenleme kategori ve kaynak kimliklerini önceki kayıttan bağımsız tutar', () => {
  const rows = makeRows();
  rows[0].bindings = [{ categoryId: ['tyt.fizik.hareket-ve-kuvvet'], resourceKeys: ['pdf:12'], state: 'Tamamlandı', reviewDate: '2026-10-20' }, ...Array(6).fill(null)];
  const copy = cloneRows(rows);
  copy[0].bindings[0].categoryId.push('tyt.fizik.is-guc-ve-enerji');
  copy[0].bindings[0].resourceKeys.push('video:lesson:abc');
  assert.deepEqual(rows[0].bindings[0].resourceKeys, ['pdf:12']);
  assert.equal(rows[0].bindings[0].categoryId.length, 1);
  assert.equal(copy[0].bindings[0].state, 'Tamamlandı');
});

test('yeni haftaya kopyalamak not ve kimlikleri korur, bitiş ve tekrar tarihini taşımaz', () => {
  const rows = makeRows();
  rows[0].cells[0] = 'Kaynak sayfa 12–15';
  rows[0].bindings = [{ categoryId: ['tyt.fizik.hareket-ve-kuvvet'], resourceKeys: ['pdf:12'], state: 'Tamamlandı', reviewDate: '2026-10-20' }, ...Array(6).fill(null)];
  const copy = nextWeekRows(rows);
  assert.equal(copy[0].cells[0], rows[0].cells[0]);
  assert.deepEqual(copy[0].bindings[0].resourceKeys, ['pdf:12']);
  assert.equal(copy[0].bindings[0].state, 'Planlandı');
  assert.equal(copy[0].bindings[0].reviewDate, '');
  assert.equal(rows[0].bindings[0].state, 'Tamamlandı');
  assert.equal(rows[0].bindings[0].reviewDate, '2026-10-20');
  const blank = nextWeekRows(rows, false);
  assert.equal(blank[0].cells[0], '');
  assert.deepEqual(blank[0].bindings, Array(7).fill(null));
});

test('notu boş konu/kaynak kaydı dolu satır silme ve kısaltma korumasına girer', () => {
  const rows = makeRows();
  assert.equal(rowHasContent(rows[0]), false);
  rows[0].bindings = [{ resourceKeys: ['pdf:12'] }];
  assert.equal(rowHasContent(rows[0]), true);
});
