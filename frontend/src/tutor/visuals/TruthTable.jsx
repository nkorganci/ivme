import { useMemo } from 'react';
import DataGrid from '../../components/DataGrid.jsx';
import { compileLogic, truthAssignments } from '../expr.js';
import { visible } from './svg.js';

const mark = (value) => (value ? 'D' : 'Y');

/** Doğruluk tablosu: değişkenlerin bütün atamaları ve önerme sütunları (AG Grid ile). */
export default function TruthTable({ params, state }) {
  const columns = (params.columns ?? []).filter((column) => visible(state, column.id));
  const rows = useMemo(() => {
    const compiled = Object.fromEntries((params.columns ?? []).map((c) => [c.id, compileLogic(c.expr, params.vars)]));
    return truthAssignments(params.vars).map((assignment, index) => ({
      key: index,
      ...Object.fromEntries(params.vars.map((name) => [name, mark(assignment[name])])),
      ...Object.fromEntries((params.columns ?? []).map((c) => [c.id, mark(compiled[c.id](assignment))])),
    }));
  }, [params]);
  const defs = [
    ...params.vars.map((name) => ({ field: name, headerName: name, maxWidth: 90 })),
    ...columns.map((column) => ({ field: column.id, headerName: column.label,
      cellClassRules: { 'viz-cell-true': ({ value }) => value === 'D', 'viz-cell-false': ({ value }) => value === 'Y' } })),
  ];
  return <DataGrid rowData={rows} columnDefs={defs} mode="sheet" showSearch={false} fitContent={false} dense
    rowKey={(row) => row.key} />;
}
