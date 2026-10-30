import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import DataGrid from '../../components/DataGrid.jsx';
import { useLearn } from '../LearnContext.jsx';
import { formatDay, relativeDay } from '../engine/dates.js';
import { mistakeRows } from '../engine/stats.js';
import { BASE } from '../ui.jsx';

const KIND = { missed: 'Yanlış', guess: 'Tahminle doğru', sibling: 'Kardeş soru' };

/** Hatalarım (spec §12): yanlış yapılan her soru, soru tipine ve kavrama göre gruplu, kuyruk durumuyla. */
export default function MistakesPage() {
  usePageTitle('Hatalarım · Konuyu Öğrenelim');
  const { state, index, today } = useLearn();
  const rows = useMemo(() => mistakeRows(state, index), [state, index]);
  const active = rows.filter((r) => r.status === 'active');
  const due = state.dueQueue.length;
  const groups = useMemo(() => {
    const map = new Map();
    for (const row of active) {
      const key = `${row.conceptId}:${row.archetypeId ?? '-'}`;
      if (!map.has(key)) map.set(key, { key, concept: row.concept, conceptId: row.conceptId, archetype: row.archetype, archetypeId: row.archetypeId, items: [] });
      map.get(key).items.push(row);
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length);
  }, [active]);
  const columnDefs = useMemo(() => [
    { headerName: 'Soru', field: 'code', minWidth: 150, cellRenderer: ({ value }) => <Link to={`/soru/${encodeURIComponent(value)}`}>{value}</Link> },
    { headerName: 'Kavram', field: 'concept', minWidth: 180, flex: 1 },
    { headerName: 'Soru tipi', field: 'archetype', minWidth: 180, flex: 1 },
    { headerName: 'Sınav', field: 'exam', width: 80 },
    { headerName: 'Tür', field: 'kind', width: 130, valueFormatter: ({ value }) => KIND[value] ?? value },
    { headerName: 'Durum', field: 'status', width: 120, valueFormatter: ({ value }) => (value === 'active' ? 'Kuyrukta' : 'Temizlendi') },
    { headerName: 'Sıradaki', field: 'dueDay', width: 130, valueFormatter: ({ value }) => (value ? relativeDay(value, today) : '—') },
    { headerName: 'Yanlış', field: 'wrongCount', width: 90, cellDataType: 'number' },
    { headerName: 'Art arda doğru', field: 'consecutiveCorrect', width: 130, cellDataType: 'number' },
    { headerName: '"Eminim" yanlışı', field: 'priority', width: 140, valueFormatter: ({ value }) => (value ? 'Evet' : '') },
  ], [today]);

  return <div className="lr-page lr-mistakes">
    <div className="page-head"><h1>Hatalarım</h1><span className="muted">{active.length} soru kuyrukta · {rows.length - active.length} temizlendi</span></div>
    <section className="card">
      <p>Yanlış yaptığın soru <strong>1 gün sonra</strong> aynen geri gelir; doğru çözersen 3, sonra 7 gün sonra. <strong>Art arda 2 doğru</strong> (“Eminim” deyip yanlış yaptıklarında 3) soruyu listeden çıkarır. Her yanlışın yanında aynı tipten görmediğin bir <strong>kardeş soru</strong> gelir: yöntemi ölçer, cevabın ezberini değil.</p>
      <div className="lr-actions">
        {due > 0 ? <Link className="btn btn-primary" to={`${BASE}/calis?tur=missed`}>Bugün gelen {due} soruyu çöz</Link> : <span className="badge badge-ok">Bugün geri gelen soru yok</span>}
      </div>
    </section>
    {groups.length > 0 && <section className="card">
      <h2>Soru tipine göre</h2>
      <ul className="lr-mistake-groups">
        {groups.map((group) => <li key={group.key}>
          <div><strong>{group.archetype}</strong> <span className="muted small">· {group.concept}</span></div>
          <span className="badge badge-bad">{group.items.length}</span>
          <span className="small muted">sıradaki {formatDay(group.items.map((i) => i.dueDay).filter(Boolean).sort()[0])}</span>
          <Link className="btn btn-secondary btn-sm" to={`${BASE}/konu/${group.conceptId}`}>Stratejiyi gör</Link>
        </li>)}
      </ul>
    </section>}
    <section className="card">
      <h2>Bütün hatalar</h2>
      <DataGrid rowData={rows} columnDefs={columnDefs} rowKey={(row) => row.key} exportFileName="konuyu-ogrenelim-hatalarim" columnSorting />
    </section>
  </div>;
}
