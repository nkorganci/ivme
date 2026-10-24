import assert from 'node:assert/strict';
import ExcelJS from '../frontend/node_modules/exceljs/excel.js';
import { buildGridWorkbook } from '../frontend/src/components/gridExcel.js';

const column = (id, field, headerName) => ({
  getColId: () => id,
  getColDef: () => ({ field, headerName }),
});
const columns = [column('rowNumber', null, 'No'), column('topic', 'topic', 'Konu'),
  column('count', 'count', 'Sayı'), column('done', 'done', 'Durum'), column('actions', null, 'İşlem')];
const visible = [{ data: { topic: 'Üçgenler', count: 12, done: true } },
  { data: { topic: 'İç ayrıt', count: 0, done: false } },
  { data: { __inlineDetail: true } }];
const api = {
  getAllDisplayedColumns: () => columns,
  forEachNodeAfterFilterAndSort: callback => visible.forEach(callback),
  getCellValue: ({ rowNode, colKey }) => rowNode.data[colKey.getColId()],
};
const bytes = await buildGridWorkbook(api, ExcelJS).xlsx.writeBuffer();
const loaded = new ExcelJS.Workbook();
await loaded.xlsx.load(bytes);
const sheet = loaded.getWorksheet('Tablo');
assert.deepEqual(sheet.getRow(1).values.slice(1), ['No', 'Konu', 'Sayı', 'Durum']);
assert.deepEqual(sheet.getRow(2).values.slice(1), [1, 'Üçgenler', 12, 'Evet']);
assert.deepEqual(sheet.getRow(3).values.slice(1), [2, 'İç ayrıt', 0, 'Hayır']);
assert.equal(sheet.rowCount, 3);
assert.equal(sheet.getCell('B2').alignment.horizontal, 'center');
assert.equal(sheet.getCell('B2').alignment.wrapText, true);
assert.equal(sheet.views[0].ySplit, 1);
console.log('Grid XLSX: filtered rows, types, headers and centered wrapping verified.');
