import { useMemo, useState } from 'react';
import { selectionKey, selectionPasses } from '../gridSelection.js';

// A Community custom filter, with a checklist rather than Enterprise Set Filter.
export default function GridSelectionFilter({ api, column, colDef, getValue, model, onModelChange, selectionType = 'text' }) {
  const [search, setSearch] = useState('');
  const options = useMemo(() => {
    const values = new Map();
    api.forEachLeafNode(node => {
      if (!node.data || node.data.__inlineDetail) return;
      const value = getValue(node);
      const key = selectionKey(value, selectionType);
      const label = value == null ? '(Boş)' : selectionType === 'date' ? new Date(value).toLocaleDateString('tr-TR') : colDef.valueFormatter
        ? api.getCellValue({ rowNode: node, colKey: column, useFormatter: true }) : String(value);
      if (!values.has(key)) values.set(key, { key, value, label: label || '(Boş)' });
    });
    return [...values.values()].sort((a, b) => selectionType === 'text'
      ? a.label.localeCompare(b.label, 'tr', { numeric: true }) : (a.value ?? -Infinity) - (b.value ?? -Infinity));
  }, [api, column, colDef, getValue, selectionType]);
  const shown = options.filter(item => item.label.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
  const selected = new Set(model?.values ?? options.map(item => item.key));
  const change = patch => {
    const next = { ...model, ...patch };
    onModelChange(next.values == null && !next.from && !next.until ? null : next);
  };
  const toggle = keys => {
    const next = new Set(selected);
    const remove = keys.every(key => next.has(key));
    keys.forEach(key => remove ? next.delete(key) : next.add(key));
    change({ values: next.size === options.length ? null : [...next] });
  };
  const sort = direction => api.applyColumnState({ state: [{ colId: column.getColId(), sort: direction }], defaultState: { sort: null } });
  const labels = selectionType === 'date' ? ['Eskiden yeniye', 'Yeniden eskiye']
    : selectionType === 'number' ? ['Küçükten büyüğe', 'Büyükten küçüğe'] : ['A → Z sırala', 'Z → A sırala'];
  return <div className="grid-selection-filter" aria-label={`${colDef.headerName} filtresi`}>
    <div className="grid-selection-actions">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => sort('asc')}>{labels[0]}</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => sort('desc')}>{labels[1]}</button>
    </div>
    {selectionType === 'date' && <div className="grid-selection-dates">
      <label>Başlangıç<input type="date" value={model?.from || ''} onChange={event => change({ from: event.target.value })} /></label>
      <label>Bitiş<input type="date" value={model?.until || ''} onChange={event => change({ until: event.target.value })} /></label>
    </div>}
    <input type="search" aria-label="Filtre değerlerinde ara" placeholder="Değerlerde ara" value={search} onChange={event => setSearch(event.target.value)} />
    <label className="grid-selection-choice"><input type="checkbox" checked={shown.length > 0 && shown.every(item => selected.has(item.key))}
      onChange={() => toggle(shown.map(item => item.key))} />Tümünü seç</label>
    <div className="grid-selection-values">
      {shown.map(item => <label className="grid-selection-choice" key={item.key}>
        <input type="checkbox" checked={selected.has(item.key)} onChange={() => toggle([item.key])} />{item.label}
      </label>)}
      {!shown.length && <p className="muted small">Eşleşen değer yok.</p>}
    </div>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { onModelChange(null); setSearch(''); }}>Bu filtreyi temizle</button>
  </div>;
}

export const selectionFilter = {
  component: GridSelectionFilter,
  doesFilterPass: ({ model, node, handlerParams }) => selectionPasses(
    handlerParams.getValue(node), model, handlerParams.filterParams.selectionType),
};
