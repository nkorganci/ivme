import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { categoryBranches } from '../categorySelection.js';
import { referenceTopics, distributionRows } from '../curriculumReference.js';
import DataGrid from '../components/DataGrid.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import './Curriculum.css';

const number = value => value == null ? '—' : value.toLocaleString('tr-TR');
const numeric = (field, headerName, extra = {}) => ({ field, headerName, cellDataType: 'number', minWidth: 85,
  valueFormatter: ({ value }) => number(value), ...extra });
const ALL_SUBJECTS = 'Bütün dersler';
// Header padding plus the select's padding, border and native arrow.
const SUBJECT_SELECT_EXTRA = 46;

// The lesson column is as wide as its longest visible text, measured in the grid's own font.
function SubjectHeader({ api, column, subjects, selectedSubject, onChange, allowAll, rowLabels }) {
  const sizer = useRef(null);
  const labels = [...new Set([selectedSubject ? subjects.find(s => s.id === selectedSubject)?.label : ALL_SUBJECTS, ...rowLabels])];
  const labelKey = labels.join('\n');
  useLayoutEffect(() => {
    const widest = Math.max(0, ...Array.from(sizer.current.children, e => e.getBoundingClientRect().width));
    api.setColumnWidths([{ key: column, newWidth: Math.ceil(widest) + SUBJECT_SELECT_EXTRA }]);
  }, [api, column, labelKey]);
  return <label className="curriculum-subject-header" onClick={event => event.stopPropagation()}
    onKeyDown={event => event.stopPropagation()}>
    <span>Ders</span><select aria-label="Ders seç" value={selectedSubject} onChange={event => onChange(event.target.value)}>
      {allowAll && <option value="">{ALL_SUBJECTS}</option>}
      {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.label}</option>)}
    </select>
    <span ref={sizer} className="curriculum-subject-sizer" aria-hidden="true">{labels.map(label => <span key={label}>{label}</span>)}</span>
  </label>;
}

function ExamHeader({ exam, onChange }) {
  return <label className="curriculum-subject-header" onClick={event => event.stopPropagation()}
    onKeyDown={event => event.stopPropagation()}>
    <span>Sınav</span><select aria-label="Sınav seç" value={exam} onChange={event => onChange(event.target.value)}>
      <option>TYT</option><option>AYT</option>
    </select>
  </label>;
}

export default function Curriculum() {
  usePageTitle('Dersler');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'dagilim' ? 'dagilim' : 'konular';
  const exam = tab === 'dagilim' ? '' : params.get('sinav') === 'AYT' ? 'AYT' : 'TYT';
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
  const coverage = useAsync(() => tab === 'konular' && selectedSubject ? api.get('/api/learning-resources/coverage' + qs({ exam, subject: selectedSubject })) : Promise.resolve(null), [tab, exam, selectedSubject]);
  const byCoverage = new Map((coverage.data?.categories || []).map(c => [c.categoryId, c]));
  const byProgress = new Map((progress.data?.categories || []).map(c => [c.categoryId, c]));
  const completed = { ...Object.fromEntries((completion.data || []).map(row => [row.topicId, Boolean(row.completedAt)])), ...saved };
  const change = patch => {
    const next = new URLSearchParams(params);
    for (const [key,value] of Object.entries(patch)) next.set(key, value);
    setParams(next);
  };
  const toggle = async row => {
    setPending(p => ({ ...p, [row.id]: true })); setSaveError(null);
    try {
      const response = await api.put('/api/curriculum/progress/' + encodeURIComponent(row.id), { completed: !completed[row.id] });
      setSaved(current => ({ ...current, [row.id]: Boolean(response.completedAt) }));
    } catch (error) { setSaveError(error); }
    finally { setPending(p => ({ ...p, [row.id]: false })); }
  };
  const topicRows = scope.map(c => {
    const count = byProgress.get(c.id), bank = byCoverage.get(c.id)?.bankCounts;
    return { ...c, done: Boolean(completed[c.id]), correct: count?.correct || 0, wrong: count?.wrong || 0,
      solved: (count?.correct || 0) + (count?.wrong || 0), ogm: bank?.OGM || 0, cikmis: bank?.CIKMIS || 0 };
  });
  const distribution = useMemo(() => distributionRows(categories).filter(row => (!selectedSubject || row.subjectId === selectedSubject)
    && (!exam || row[exam.toLowerCase()])), [categories, selectedSubject, exam]);
  const rows = tab === 'dagilim' ? distribution : topicRows;
  const subjectColumn = { field: 'subject', headerName: 'Ders', suppressSizeToFit: true, wrapText: true, autoHeight: true, cellClass: 'curriculum-text-cell',
    sortable: false, filter: false, headerComponent: SubjectHeader,
    headerComponentParams: { subjects, selectedSubject, onChange: id => change({ ders: id || 'all' }), allowAll: tab === 'dagilim',
      rowLabels: [...new Set(rows.map(row => row.subject))] } };
  const baseColumns = [
    { field: 'unit', headerName: 'Ünite', minWidth: 160, flex: 1, wrapText: true, autoHeight: true, cellClass: 'curriculum-text-cell' },
    { field: 'topic', headerName: 'Konu', minWidth: 260, flex: 2, wrapText: true, autoHeight: true, cellClass: 'curriculum-text-cell' },
    { field: 'gradeLabel', headerName: 'Sınıf', minWidth: 85, maxWidth: 100 },
  ];
  const bankLink = (row, bank, count) => <Link to={(bank === 'OGM' ? '/soru-bankasi' : '/cikmis-sorular') + qs({ examType: exam, categoryId: [row.id] })}
    aria-label={`${number(count)} soru`}>{number(count)}</Link>;
  const topicColumns = [
    subjectColumn,
    { field: 'exam', headerName: 'Sınav', minWidth: 85, maxWidth: 100, sortable: false, filter: false,
      headerComponent: ExamHeader, headerComponentParams: { exam, onChange: sinav => change({ sinav }) } },
    // Topic tracking gives the topic 20% less room than the distribution table; long names wrap.
    ...baseColumns.map(column => column.field === 'topic' ? { ...column, minWidth: 208, flex: 1.6 } : column),
    numeric('ogm', 'Soru bankası', { cellRenderer: ({ data }) => data && bankLink(data, 'OGM', data.ogm) }),
    numeric('cikmis', 'Çıkmış soru', { cellRenderer: ({ data }) => data && bankLink(data, 'CIKMIS', data.cikmis) }),
    numeric('solved', 'Çözdüğüm'), numeric('correct', 'Doğru'), numeric('wrong', 'Yanlış'),
    { colId: 'actions', headerName: 'Çalış', minWidth: 215, filter: false, sortable: false, autoHeight: true,
      cellRenderer: ({ data }) => data && <div className="curriculum-cell-links">
        <Link to={'/calisma/yeni' + qs({ examType: exam, categoryId: [data.id] })}>Pratik yap</Link>
        <Link to={'/konular-ve-kaynaklar' + qs({ exam, subject: selectedSubject, categoryId: [data.id] })}>PDF · video · not</Link>
      </div> },
    { field: 'done', headerName: 'Durum', minWidth: 140, maxWidth: 160, filter: false, autoHeight: true,
      cellRenderer: ({ data }) => data && <button type="button" className={`curriculum-done${data.done ? ' done' : ''}`}
        aria-label={`${data.topic}: ${data.done ? 'tamamlamayı geri al' : 'tamamlandı işaretle'}`} aria-pressed={data.done}
        disabled={completion.loading || Boolean(completion.error) || pending[data.id]} onClick={() => toggle(data)}>
        {pending[data.id] ? 'Kaydediliyor…' : data.done ? 'Bitti ✓' : 'Bitti işaretle'}</button> },
  ];
  const distributionColumns = [
    subjectColumn,
    ...baseColumns.map(column => ({ ...column, minWidth: column.field === 'topic' ? 220 : column.field === 'unit' ? 135 : 85 })),
    numeric('tytTotal', 'TYT 2018–2026', { minWidth: 110 }), numeric('aytTotal', 'AYT 2018–2026', { minWidth: 110 }),
    numeric('recent', 'Son 3 yıl 2024–2026', { minWidth: 125 }),
  ];
  const source = metadata.data?.summary.curriculumReference || categories[0]?.curriculumReference;
  if (metadata.loading) return <Loading text="Ders, ünite ve konular yükleniyor…" />;
  if (metadata.error) return <ErrorBox error={metadata.error} onRetry={metadata.retry} />;
  return <div className="curriculum-page curriculum-reference-page">
    <div className="page-head"><h1>Dersler</h1></div>
    <p className="muted lead">Dersini tablodan seç; konularını takip et ve soru dağılımını incele.</p>
    <nav className="history-tabs" aria-label="Dersler bölümleri">
      <button className={tab === 'konular' ? 'selected' : ''} type="button" aria-pressed={tab === 'konular'} onClick={() => change({ tab: 'konular' })}>Konu takibi</button>
      <button className={tab === 'dagilim' ? 'selected' : ''} type="button" aria-pressed={tab === 'dagilim'} onClick={() => change({ tab: 'dagilim' })}>Konu ve soru dağılımı</button>
    </nav>
    {saveError && <ErrorBox error={saveError} />}
    {completion.error && <ErrorBox error={completion.error} onRetry={completion.retry} />}
    {tab === 'konular' && <>
      {coverage.loading && <p role="status" className="muted small">Soru bankası sayıları yükleniyor…</p>}
      {coverage.error && <ErrorBox error={coverage.error} onRetry={coverage.retry} />}
      {progress.error && <ErrorBox error={progress.error} onRetry={progress.retry} />}
    </>}
    {rows.length ? <section className="card table-card curriculum-reference-grid" aria-label={tab === 'dagilim' ? 'Konu ve soru dağılımı tablosu' : 'Ders ünite konu takibi'}>
      <DataGrid key={`${tab}:${exam}`} rowData={rows}
        columnDefs={tab === 'dagilim' ? distributionColumns : topicColumns}
        mode="worksheet" scrollable columnSorting rowNumbers showSearch={false}
        gridOptions={{ headerHeight: 85, rowHeight: 26, getRowId: ({ data }) => data.id }} />
    </section> : <Empty title="Bu seçimde konu bulunamadı." />}
    <p className="muted small">{tab === 'dagilim'
      ? '— Kaynakta boş; 0 kapsamda olup soru çıkmamış. Başlıklara tıklayarak sıralayabilir, uzun listeleri tablonun içinde aşağı kaydırabilirsin.'
      : 'Soru sayıları bankadaki tekil sorulardır. Kaynak başlığından yapılan eşleşmeler tahminidir; konu alt toplamları örtüşebilir. Çözdüğüm, bitirilen pratik ve denemelerde ilk yanıtlanan soruları sayar; Bitti işareti ayrı kaydedilir.'}</p>
    <p className="curriculum-sources muted small">Tek müfredat kaynağı: {source?.file?.split('/').pop() || 'YKS_TYT_AYT_Konu_Soru_Dagilimi_2018-2026.xlsx'} · yalnız ilk sayfa ({source?.sheet || 'KONULAR'}).
      Dersler ve Soru Çöz aynı ders, ünite ve konu kayıtlarını kullanır.</p>
  </div>;
}
