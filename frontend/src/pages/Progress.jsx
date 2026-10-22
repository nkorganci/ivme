import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { formatNet } from '../format.js';
import { categoryBranches } from '../categorySelection.js';
import { progressCategories, topicProgressRows } from '../topicProgress.js';
import './Progress.css';

function SubjectHeader({ subjects, selectedSubject, onSubjectChange }) {
  return <label className="progress-subject-header" onClick={event => event.stopPropagation()}
    onKeyDown={event => event.stopPropagation()}>
    <span>Ders</span>
    <select aria-label="Ders seç" value={selectedSubject} onChange={event => onSubjectChange(event.target.value)}>
      {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.label} · {subject.categories} konu</option>)}
    </select>
  </label>;
}

const RESULT_COLUMNS = [
  { field: 'solved', headerName: 'Çözülen', minWidth: 95, headerTooltip: 'Doğru ve yanlış yanıtlanan tekil soru sayısı' },
  { field: 'correct', headerName: 'Doğru', minWidth: 85, cellClass: 'statistics-correct' },
  { field: 'wrong', headerName: 'Yanlış', minWidth: 85, cellClass: 'statistics-wrong' },
  { field: 'net', headerName: 'Net', minWidth: 90, headerTooltip: 'Net = doğru − yanlış / 4',
    valueFormatter: ({ value }) => formatNet(value) },
].map(column => ({ cellDataType: 'number', sortable: false, filter: false, ...column }));

export default function Progress() {
  const [subjectId, setSubjectId] = useState('');
  const { data, loading, error, retry } = useAsync(async () => {
    const [metadata, progress] = await Promise.all([
      api.get('/api/learning-resources/metadata'),
      api.get('/api/learning-resources/progress?classification=CURRENT'),
    ]);
    return { metadata, progress };
  }, []);
  const categories = useMemo(() => progressCategories(data?.metadata.categories ?? []), [data]);
  const subjects = useMemo(() => categoryBranches(categories), [categories]);
  const selectedSubject = subjects.find(subject => subject.id === subjectId)?.id ?? subjects[0]?.id ?? '';
  const rows = useMemo(() => topicProgressRows(categories, data?.progress.categories ?? [], selectedSubject),
    [categories, data, selectedSubject]);
  const columns = useMemo(() => [
    { colId: 'number', headerName: 'No', width: 56, minWidth: 52, maxWidth: 64, resizable: false,
      sortable: false, filter: false, cellDataType: 'number',
      valueGetter: ({ data: row }) => row?.topicNumber ?? null,
      valueFormatter: ({ value }) => value == null ? '' : `${value}.` },
    { field: 'subject', headerName: 'Ders', minWidth: 190, sortable: false, filter: false,
      headerComponent: SubjectHeader,
      headerComponentParams: { subjects, selectedSubject, onSubjectChange: setSubjectId } },
    { field: 'exam', headerName: 'Sınav', minWidth: 85, sortable: true, filter: false },
    { field: 'gradeLabel', headerName: 'Sınıf', minWidth: 125, sortable: true, filter: false,
      wrapText: true, autoHeight: true, cellStyle: {lineHeight:'1.35'} },
    { field: 'topicLabel', headerName: 'Ünite', minWidth: 280, flex: 2,
      wrapText: true, autoHeight: true, sortable: true, filter: false,
      comparator: (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'tr', { numeric: true }) },
    ...RESULT_COLUMNS,
  ], [subjects, selectedSubject]);
  return <section aria-label="İlerleme istatistikleri">
    {loading && <Loading text="İlerleme yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && (subjects.length ? <section className="card table-card" aria-label="Derse göre ilerleme tablosu">
      <DataGrid key={selectedSubject} columnDefs={columns} rowData={rows} mode="worksheet" scrollable columnSorting showSearch={false}
        gridOptions={{ headerHeight: 80, getRowId: ({ data: row }) => row.categoryId }} />
      <p className="statistics-table-note muted small">Tüm geçmişteki tamamlanmış test ve denemeler. Her sorunun ilk çözümü sayılır; tekrarlar toplamı artırmaz.</p>
    </section> : <Empty title="Henüz yayımlanmış ders ve konu bulunmuyor." />)}
  </section>;
}
