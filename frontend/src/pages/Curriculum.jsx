import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { categoryBranches } from '../categorySelection.js';
import { referenceTopics, referenceUnits, distributionRows } from '../curriculumReference.js';
import DataGrid from '../components/DataGrid.jsx';
import Modal from '../components/Modal.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import './Curriculum.css';

const number = value => value == null ? '—' : value.toLocaleString('tr-TR');
const numeric = (field, headerName, extra = {}) => ({ field, headerName, cellDataType: 'number', minWidth: 85,
  valueFormatter: ({ value }) => number(value), ...extra });

function DistributionDetail({ item }) {
  return <div className="curriculum-reference-detail">
    <strong>{item.unit} · {item.topic}</strong>
    <p>{item.verification || 'Kaynakta doğrulama notu yok.'}</p>
    <p>{item.note || 'Bu konu için ek not bulunmuyor.'}</p>
    <p className="muted small">KONULAR · Excel satırı {item.row}. ✓ kapsamda · ✓* sorular başka bir başlıkta toplandı.
      “—” boş kaynak hücresidir; 0, kapsamda olup soru çıkmadığını belirtir.</p>
  </div>;
}

export default function Curriculum() {
  usePageTitle('Dersler');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'dagilim' ? 'dagilim' : 'konular';
  const exam = tab === 'dagilim' && (!params.get('sinav') || params.get('sinav') === 'all') ? '' : params.get('sinav') === 'AYT' ? 'AYT' : 'TYT';
  const [unitId, setUnitId] = useState('');
  const [years, setYears] = useState(false);
  const [notes, setNotes] = useState(null);
  const [saved, setSaved] = useState({});
  const [pending, setPending] = useState({});
  const [saveError, setSaveError] = useState(null);
  const metadata = useAsync(() => api.get('/api/learning-resources/metadata'), []);
  const completion = useAsync(() => api.get('/api/curriculum/progress'), []);
  const progress = useAsync(() => api.get('/api/learning-resources/progress?classification=CURRENT'), []);
  const categories = useMemo(() => referenceTopics(metadata.data?.categories || []), [metadata.data]);
  const subjects = useMemo(() => categoryBranches(categories.filter(c => !exam || c.exam === exam)), [categories, exam]);
  const selectedSubject = tab === 'dagilim' && (!params.get('ders') || params.get('ders') === 'all') ? '' : subjects.find(s => s.id === params.get('ders'))?.id || subjects[0]?.id || '';
  const scope = useMemo(() => categories.filter(c => (!exam || c.exam === exam) && (!selectedSubject || c.subjectId === selectedSubject)), [categories, exam, selectedSubject]);
  const units = useMemo(() => referenceUnits(scope), [scope]);
  const selectedUnit = units.some(u => u.id === unitId) ? unitId : '';
  const coverage = useAsync(() => tab === 'konular' && selectedSubject ? api.get('/api/learning-resources/coverage' + qs({ exam, subject: selectedSubject })) : Promise.resolve(null), [tab, exam, selectedSubject]);
  const byCoverage = new Map((coverage.data?.categories || []).map(c => [c.categoryId, c]));
  const byProgress = new Map((progress.data?.categories || []).map(c => [c.categoryId, c]));
  const completed = { ...Object.fromEntries((completion.data || []).map(row => [row.topicId, Boolean(row.completedAt)])), ...saved };
  const change = patch => {
    const next = new URLSearchParams(params);
    for (const [key,value] of Object.entries(patch)) next.set(key, value);
    setParams(next); setUnitId(''); setNotes(null);
  };
  const toggle = async row => {
    setPending(p => ({ ...p, [row.id]: true })); setSaveError(null);
    try {
      const response = await api.put('/api/curriculum/progress/' + encodeURIComponent(row.id), { completed: !completed[row.id] });
      setSaved(current => ({ ...current, [row.id]: Boolean(response.completedAt) }));
    } catch (error) { setSaveError(error); }
    finally { setPending(p => ({ ...p, [row.id]: false })); }
  };
  const topicRows = scope.filter(c => !selectedUnit || c.unitId === selectedUnit).map(c => {
    const count = byProgress.get(c.id), bank = byCoverage.get(c.id)?.bankCounts;
    return { ...c, done: Boolean(completed[c.id]), correct: count?.correct || 0, wrong: count?.wrong || 0,
      solved: (count?.correct || 0) + (count?.wrong || 0), ogm: bank?.OGM || 0, cikmis: bank?.CIKMIS || 0 };
  });
  const distribution = useMemo(() => distributionRows(categories).filter(row => (!selectedSubject || row.subjectId === selectedSubject)
    && (!exam || row[exam.toLowerCase()]) && (!selectedUnit || row.unitId === selectedUnit)), [categories, selectedSubject, exam, selectedUnit]);
  const baseColumns = [
    { field: 'unit', headerName: 'Ünite', minWidth: 160, flex: 1, wrapText: true, autoHeight: true },
    { field: 'topic', headerName: 'Konu', minWidth: 260, flex: 2, wrapText: true, autoHeight: true },
    { field: 'gradeLabel', headerName: 'Sınıf', minWidth: 75, maxWidth: 100 },
  ];
  const bankLink = (row, bank, count) => <Link to={(bank === 'OGM' ? '/soru-bankasi' : '/cikmis-sorular') + qs({ examType: exam, categoryId: [row.id] })}>{number(count)} soru</Link>;
  const topicColumns = [
    ...baseColumns,
    numeric('ogm', 'Soru bankası', { cellRenderer: ({ data }) => data && bankLink(data, 'OGM', data.ogm) }),
    numeric('cikmis', 'Çıkmış soru', { cellRenderer: ({ data }) => data && bankLink(data, 'CIKMIS', data.cikmis) }),
    numeric('solved', 'Çözdüğüm'), numeric('correct', 'Doğru'), numeric('wrong', 'Yanlış'),
    { colId: 'actions', headerName: 'Çalış', minWidth: 165, filter: false, sortable: false, autoHeight: true,
      cellRenderer: ({ data }) => data && <div className="curriculum-cell-links">
        <Link to={'/calisma/yeni' + qs({ examType: exam, categoryId: [data.id] })}>Pratik yap</Link>
        <Link to={'/konular-ve-kaynaklar' + qs({ exam, subject: selectedSubject, categoryId: [data.id] })}>PDF · video · not</Link>
      </div> },
    { field: 'done', headerName: 'Durum', minWidth: 110, maxWidth: 140, filter: false,
      cellRenderer: ({ data }) => data && <button type="button" className={`curriculum-done${data.done ? ' done' : ''}`}
        aria-label={`${data.topic}: ${data.done ? 'tamamlamayı geri al' : 'tamamlandı işaretle'}`} aria-pressed={data.done}
        disabled={completion.loading || Boolean(completion.error) || pending[data.id]} onClick={() => toggle(data)}>
        {pending[data.id] ? 'Kaydediliyor…' : data.done ? 'Bitti ✓' : 'Bitti işaretle'}</button> },
  ];
  const distributionColumns = [
    { field: 'subject', headerName: 'Ders', minWidth: 130, flex: 1, wrapText: true, autoHeight: true },
    ...baseColumns,
    { field: 'tyt', headerName: 'TYT', minWidth: 65, maxWidth: 85, valueFormatter: ({ value }) => value || '—' },
    { field: 'ayt', headerName: 'AYT', minWidth: 65, maxWidth: 85, valueFormatter: ({ value }) => value || '—' },
    numeric('tytTotal', 'TYT 2018–2026'), numeric('aytTotal', 'AYT 2018–2026'),
    numeric('total', 'Toplam soru'), numeric('recent', 'Son 3 yıl 2024–2026'),
    ...(years ? (exam ? [exam] : ['TYT','AYT']).flatMap(session => (distribution[0]?.years || []).map((year,index) => numeric(`${session}-${year}`, `${session} ${year}`,
      { valueGetter: ({ data }) => data?.[`${session.toLowerCase()}Years`]?.[index] }))) : []),
    { colId: 'notes', headerName: 'Açıklama', pinned: 'right', width: 110, minWidth: 110, maxWidth: 120, filter: false, sortable: false,
      cellRenderer: ({ data }) => data && <button className="btn btn-secondary" type="button" aria-haspopup="dialog"
        onClick={() => setNotes(data)}>Notları aç</button> },
  ];
  const done = scope.filter(c => completed[c.id]).length;
  const source = metadata.data?.summary.curriculumReference || categories[0]?.curriculumReference;
  if (metadata.loading) return <Loading text="Ders, ünite ve konular yükleniyor…" />;
  if (metadata.error) return <ErrorBox error={metadata.error} onRetry={metadata.retry} />;
  return <div className="curriculum-page curriculum-reference-page">
    <div className="page-head"><h1>Dersler</h1><span className="curriculum-source-pill">2018–2026 · KONULAR</span></div>
    <p className="muted lead">Dersini ve üniteni seç; konularını takip et, soru çöz veya yıllara göre soru dağılımını incele.</p>
    <nav className="history-tabs" aria-label="Dersler bölümleri">
      <button className={tab === 'konular' ? 'selected' : ''} type="button" aria-pressed={tab === 'konular'} onClick={() => change({ tab: 'konular' })}>Konu takibi</button>
      <button className={tab === 'dagilim' ? 'selected' : ''} type="button" aria-pressed={tab === 'dagilim'} onClick={() => change({ tab: 'dagilim' })}>Konu ve soru dağılımı</button>
    </nav>
    <section className="card curriculum-reference-filters" aria-label="Müfredat filtreleri">
      <label>Sınav<select aria-label="Sınav" value={exam} onChange={e => change({ sinav: e.target.value || 'all' })}>{tab === 'dagilim' && <option value="">TYT + AYT</option>}<option>TYT</option><option>AYT</option></select></label>
      <label>Ders<select aria-label="Ders" value={selectedSubject} onChange={e => change({ ders: e.target.value || 'all' })}>
        {tab === 'dagilim' && <option value="">Bütün dersler</option>}
        {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select></label>
      <label>Ünite<select aria-label="Ünite" value={selectedUnit} onChange={e => { setUnitId(e.target.value); setNotes(null); }}>
        <option value="">Bütün üniteler</option>{units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
      </select></label>
      {tab === 'dagilim' && <label className="curriculum-years-toggle"><input type="checkbox" checked={years} onChange={e => setYears(e.target.checked)} />Yılları göster ({exam || 'TYT + AYT'})</label>}
    </section>
    <div className="curriculum-reference-summary" aria-live="polite">
      <span><strong>{units.length}</strong> ünite</span><span><strong>{new Set(scope.map(c => c.excelRowId || c.id)).size}</strong> konu</span>
      {tab === 'konular' && <span><strong>{done}/{scope.length}</strong> tamamlandı</span>}
      <span><strong>{tab === 'dagilim' ? distribution.length : topicRows.length}</strong> satır gösteriliyor</span>
    </div>
    {saveError && <ErrorBox error={saveError} />}
    {completion.error && <ErrorBox error={completion.error} onRetry={completion.retry} />}
    {tab === 'konular' && <>
      {coverage.loading && <p role="status" className="muted small">Soru bankası sayıları yükleniyor…</p>}
      {coverage.error && <ErrorBox error={coverage.error} onRetry={coverage.retry} />}
      {progress.error && <ErrorBox error={progress.error} onRetry={progress.retry} />}
    </>}
    {(tab === 'dagilim' ? distribution : topicRows).length ? <section className="card table-card curriculum-reference-grid" aria-label={tab === 'dagilim' ? 'Konu ve soru dağılımı tablosu' : 'Ders ünite konu takibi'}>
      <DataGrid key={`${tab}:${exam}`} rowData={tab === 'dagilim' ? distribution : topicRows}
        columnDefs={tab === 'dagilim' ? distributionColumns : topicColumns} showColumnFilters
        gridOptions={{ getRowId: ({ data }) => data.id }} />
    </section> : <Empty title="Bu seçimde konu bulunamadı." />}
    <p className="muted small">{tab === 'dagilim'
      ? '✓ Kapsamda · ✓* Sorular toplu bir başlıkta sayılmış. — Kaynakta boş; 0 kapsamda olup soru çıkmamış. Yılları açabilir, sütunlardan sıralayıp filtreleyebilir ve tabloda arayabilirsin.'
      : 'Soru sayıları bankadaki tekil sorulardır. Kaynak başlığından yapılan eşleşmeler tahminidir; konu alt toplamları örtüşebilir. Çözdüğüm, ilk yanıtlanan soruları sayar; Bitti işareti ayrı kaydedilir.'}</p>
    <p className="curriculum-sources muted small">Tek müfredat kaynağı: {source?.file?.split('/').pop() || 'YKS_TYT_AYT_Konu_Soru_Dagilimi_2018-2026.xlsx'} · yalnız ilk sayfa ({source?.sheet || 'KONULAR'}).
      Dersler, Soru Çöz ve İlerlemem aynı ders, ünite ve konu kayıtlarını kullanır.</p>
    {notes && <Modal title="Konu açıklaması" onClose={() => setNotes(null)}><DistributionDetail item={notes} /></Modal>}
  </div>;
}
