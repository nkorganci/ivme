// Column widths that fit the text of every row, not only the rows AG Grid has rendered.
// AG Grid's own auto-size reads the DOM, so a scrolled-away long title would be clipped.
const numberFormatter = new Intl.NumberFormat('tr-TR');
// Sort arrow, filter button and header padding around the header label.
const HEADER_EXTRA = 62;
const WRAPPED_COLUMN_LIMIT = 480;

let context;
const measurer = font => text => {
  context ||= document.createElement('canvas').getContext('2d');
  if (context.font !== font) context.font = font;
  return context.measureText(text).width;
};

export const columnKey = def => def.colId ?? def.field;

export function leafColumns(defs) {
  return defs.flatMap(def => def.children ? leafColumns(def.children) : [def]);
}

function displayedText(def, row) {
  const value = def.valueGetter ? def.valueGetter({ data: row, colDef: def })
    : def.field ? def.field.split('.').reduce((item, key) => item?.[key], row) : undefined;
  if (def.valueFormatter) return String(def.valueFormatter({ value, data: row, colDef: def }) ?? '');
  if (def.cellDataType === 'number' && typeof value === 'number') return numberFormatter.format(value);
  return value == null ? '' : String(value);
}

export function measureColumnWidths(defs, rows, wrapper, rowNumbers = false) {
  const style = getComputedStyle(wrapper);
  const family = `${style.fontSize} ${style.fontFamily}`;
  const headerText = wrapper.querySelector('.ag-header-cell-text');
  const bodyWidth = measurer(family);
  const headerWidth = measurer(`${headerText ? getComputedStyle(headerText).fontWeight : 600} ${family}`);
  const cell = wrapper.querySelector('.ag-cell');
  const padding = (cell ? parseFloat(getComputedStyle(cell).paddingLeft) : 17) * 2 + 2;
  const widths = {};
  // The row number column grows with the number of digits (up to the row count).
  if (rowNumbers) widths.rowNumber = Math.max(48, Math.ceil(bodyWidth(String(rows.length)) + padding));
  for (const def of leafColumns(defs)) {
    const key = columnKey(def);
    if (!key || (def.maxWidth != null && def.maxWidth === def.minWidth)) continue;
    let widest = headerWidth(def.headerName ?? def.field ?? '') + HEADER_EXTRA;
    for (const row of rows) widest = Math.max(widest, bodyWidth(displayedText(def, row)) + padding);
    widths[key] = Math.ceil(def.autoHeight ? Math.min(widest, def.maxWidth ?? WRAPPED_COLUMN_LIMIT) : widest);
  }
  return widths;
}
