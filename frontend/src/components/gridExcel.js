// Export the current grid view, including rows outside the current pagination page.
export function buildGridWorkbook(api, ExcelJS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tablo');
  const cols = api.getAllDisplayedColumns().filter(col => {
    const def = col.getColDef();
    return col.getColId() === 'rowNumber' || def.field || def.valueGetter;
  });
  sheet.addRow(cols.map(col => col.getColDef().headerName || col.getColId()));
  let rowNumber = 0;
  api.forEachNodeAfterFilterAndSort(node => {
    if (!node.data || node.data.__inlineDetail) return;
    rowNumber += 1;
    sheet.addRow(cols.map(col => {
      if (col.getColId() === 'rowNumber') return rowNumber;
      const value = api.getCellValue({ rowNode: node, colKey: col });
      if (value == null) return '';
      if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
      if (typeof value === 'number' || typeof value === 'string') return value;
      return api.getCellValue({ rowNode: node, colKey: col, useFormatter: true }) || String(value);
    }));
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (cols.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  sheet.eachRow((row, index) => {
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    if (index === 1) row.font = { bold: true };
  });
  cols.forEach((col, index) => {
    const cells = sheet.getColumn(index + 1).values.slice(1);
    sheet.getColumn(index + 1).width = Math.min(60, Math.max(12, ...cells.map(value => String(value ?? '').length + 2)));
  });
  return workbook;
}
