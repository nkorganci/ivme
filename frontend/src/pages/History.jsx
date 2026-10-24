import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAsync, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { formatDate, formatDuration, formatNet, formatPercent } from '../format.js';
import { STATISTICS_LABEL } from '../config.js';
import { examBranchesFor, loadStudyHistory, practiceDurationSeconds, practiceScope, prepareExamHistory, summarizeExamRows } from '../studyStatistics.js';
import { useExamTrack } from '../examTrack.jsx';
import { loadSharedCatalog } from '../components/SharedCategorySelect.jsx';

const PRACTICE_MODE = { MIXED: 'Öncekiler dahil', NEW: 'Yalnız yeni', REPEAT: 'Önceki sorular', WRONG: 'Yanlış yaptıklarım' };
const DATE_COLUMN = {
  field: 'date', headerName: 'Tarih', minWidth: 185, cellDataType: false, sort: 'desc',
  valueFormatter: ({ value }) => formatDate(value),
  getQuickFilterText: ({ value }) => formatDate(value),
  filter: 'agDateColumnFilter',
  filterParams: { comparator: (filterDate, value) => {
    const date = new Date(value); date.setHours(0, 0, 0, 0);
    return date.getTime() - filterDate.getTime();
  } },
};
const RESULT_COLUMNS = [
  { field: 'questionCount', headerName: 'Soru', minWidth: 85 },
  { field: 'correct', headerName: 'Doğru', minWidth: 90, cellClass: 'statistics-correct' },
  { field: 'wrong', headerName: 'Yanlış', minWidth: 90, cellClass: 'statistics-wrong' },
  { field: 'blank', headerName: 'Boş', minWidth: 85 },
  { field: 'percent', headerName: 'Başarı', minWidth: 105, valueFormatter: ({ value }) => formatPercent(value) },
].map(column => ({ cellDataType: 'number', valueFormatter: ({ value }) => value == null ? '—' : value.toLocaleString('tr-TR'), ...column }));
const shortDate = value => value == null ? '—' : new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
const compactColumn = (column, width) => ({ filter: false, ...column, width, minWidth: width, flex: width });
const examColumns = branches => [
  compactColumn({ field: 'number', headerName: 'N', cellDataType: 'number' }, 30),
  compactColumn({ field: 'title', headerName: 'Deneme', filter: true, maxWidth: 64, tooltipField: 'title', cellRenderer: ({ data }) => data &&
    <Link to={`/sinav/${data.id}/sonuc`} title={data.title}>{data.title.replace(/ denemesi$/i, '').replace('Sayısal', 'Say.').replace('Eşit Ağırlık', 'EA').replace('Sözel', 'Söz.')}</Link> }, 64),
  compactColumn({ ...DATE_COLUMN, valueFormatter: ({ value }) => shortDate(value), filterParams: { selectionType: 'date' } }, 52),
  ...branches.map(branch => compactColumn({
    colId: `branch-${branch.key}`, headerName: branch.label, headerTooltip: `${branch.subjects[0]} · Doğru / Yanlış`,
    valueGetter: ({ data }) => { const value = data?.branches[branch.key]; return value ? `${value.correct} / ${value.wrong}` : null; },
    valueFormatter: ({ value }) => value ?? '—',
    cellRenderer: ({ data }) => { const value = data?.branches[branch.key]; return !value ? '—' :
      <span className="statistics-branch-pair" aria-label={`${branch.label}: ${value.correct} doğru, ${value.wrong} yanlış`}>
        <span className="statistics-correct">{value.correct}</span><span>/</span><span className="statistics-wrong">{value.wrong}</span>
      </span>; },
    tooltipValueGetter: ({ data }) => {
      const entries = data?.bySubject.filter(item => branch.subjects.includes(item.subject)) ?? [];
      return entries.length ? entries.map(item => `${item.subject}: ${item.total} soru, ${item.correct} doğru, ${item.wrong} yanlış, ${item.blank} boş, ${formatNet(item.net)} net`).join(' · ') : 'Bu denemede bu branştan soru yok.';
    },
    ...(branch.key === 'religion' ? { maxWidth: 40 } : {}),
  }, branch.key === 'religion' ? 40 : 51)),
  ...[['questionCount', 'S', 'Soru'], ['correct', 'D', 'Doğru'], ['wrong', 'Y', 'Yanlış']].map(([field, headerName, headerTooltip]) =>
    compactColumn({ field, headerName, headerTooltip, cellDataType: 'number', cellClass: field === 'correct' ? 'statistics-correct' : field === 'wrong' ? 'statistics-wrong' : undefined }, 32)),
  compactColumn({ field: 'net', headerName: 'Net', cellDataType: 'number', valueFormatter: ({ value }) => formatNet(value) }, 48),
];
const PRACTICE_COLUMNS = [
  { field: 'title', headerName: 'Pratik', minWidth: 110, cellRenderer: ({ data }) => data &&
    <Link to={`/pratik/${data.id}`}>{data.status === 'COMPLETED' ? 'Sonucu gör' : data.status === 'ABANDONED' ? 'Kaydı gör' : 'Devam et'}</Link> },
  { ...DATE_COLUMN, minWidth: 110, valueFormatter: ({ value }) => shortDate(value), filterParams: { selectionType: 'date' } },
  { field: 'subject', headerName: 'Ders', minWidth: 120 },
  { field: 'topic', headerName: 'Konu', minWidth: 160, tooltipField: 'topic' },
  { field: 'modeLabel', headerName: 'Soru geçmişi', minWidth: 125 },
  ...RESULT_COLUMNS.filter(column => column.field !== 'blank').map(column => ({ ...column, minWidth: 80 })),
  { field: 'timeLimitSeconds', headerName: 'Süre sınırı', minWidth: 108, cellDataType: 'number',
    valueFormatter: ({ value }) => value ? formatDuration(value) : 'Süresiz' },
  { field: 'durationSeconds', headerName: 'Bitirme süresi', minWidth: 128, cellDataType: 'number',
    headerTooltip: 'Pratiğe başlama ile bitirme arasında geçen süre', valueFormatter: ({ value }) => value == null ? '—' : formatDuration(value) },
].map(column => {
  const interactive = ['title', 'date', 'subject'].includes(column.field);
  return { ...column, filter: interactive, sortable: interactive };
});
const SUMMARY_COLUMNS = [
  { field: 'sessions', headerName: 'Kayıt', minWidth: 90 },
  ...RESULT_COLUMNS.map(column => column.field === 'questionCount' ? { ...column, field: 'questions' } : column),
];
const examSummaryColumns = examLabel => [
  { field: 'examType', headerName: 'Tür', minWidth: 65, valueFormatter: ({ value }) => examLabel(value) }, ...SUMMARY_COLUMNS,
];
export default function History() {
  const [params] = useSearchParams();
  const tab = params.get('tab') === 'practice' ? 'practice' : 'exams';
  usePageTitle(STATISTICS_LABEL);
  if (params.get('tab') === 'progress') return <Navigate to="/dersler-ve-konular?tab=konular" replace />;
  return <div className="study-statistics">
    <h1>{STATISTICS_LABEL}</h1>
    <p className="muted">Deneme sonuçlarını ve pratiklerini tek yerden takip et.</p>
    <nav className="history-tabs" aria-label="Çalışma istatistikleri bölümleri">
      {[['exams', 'Denemeler'], ['practice', 'Pratikler']].map(([value, label]) =>
        <Link key={value} to={value === 'exams' ? '/gecmis' : `/gecmis?tab=${value}`}
          className={`btn ${tab === value ? 'btn-primary' : 'btn-secondary'}`} aria-current={tab === value ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <HistoryTable key={tab} practice={tab === 'practice'} />
  </div>;
}

function HistoryTable({ practice }) {
  const path = practice ? '/api/study-sessions' : '/api/exams';
  const { exams, examLabel, kpss } = useExamTrack();
  const branches = useMemo(() => examBranchesFor(exams, kpss), [exams, kpss]);
  const { data, loading, error, retry } = useAsync(async () => {
    const [items, metadata] = await Promise.all([loadStudyHistory(path), practice ? loadSharedCatalog() : Promise.resolve(null)]);
    return { items, categories: metadata?.categories || [] };
  }, [path]);
  const [visibleRows, setVisibleRows] = useState([]);
  const rows = useMemo(() => practice ? (data?.items ?? []).map(item => ({
    ...item, title: `${item.questionCount} soruluk pratik`, date: Date.parse(item.startedAt),
    ...practiceScope(item, data.categories),
    statusLabel: item.status === 'COMPLETED' ? 'Tamamlandı' : item.status === 'ABANDONED' ? 'İptal edildi' : 'Devam ediyor',
    modeLabel: PRACTICE_MODE[item.selectionMode] || '—',
    correct: item.result?.correct ?? null, wrong: item.result?.wrong ?? null, blank: item.result?.blank ?? null,
    percent: item.result && item.questionCount ? item.result.correct * 100 / item.questionCount : null,
    durationSeconds: practiceDurationSeconds(item),
  })) : prepareExamHistory(data?.items ?? [], branches), [data, practice, branches]);
  const columns = useMemo(() => practice ? PRACTICE_COLUMNS : examColumns(branches), [rows, practice, branches]);
  const summary = useMemo(() => summarizeExamRows(visibleRows, exams.map(e => e.id)), [visibleRows, exams]);

  return <section aria-label={practice ? 'Pratik istatistikleri' : 'Deneme istatistikleri'}>
    <h2 className="section-title">{practice ? 'Pratiklerim' : 'Deneme sonuçlarım'}</h2>
    {loading && <Loading text="Çalışma kayıtların yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data?.items.length === 0 && <section className="card"><Empty title={practice ? 'Henüz pratik oturumun yok.' : 'Henüz tamamlanmış bir denemen yok.'}>
      <p>Çalışmaya başladığında kayıtlarını ve sonuçlarını burada görebilirsin.</p>
      <Link to={practice ? '/calisma/yeni' : '/calisma/yeni?mode=sinav'} className="btn btn-primary">{practice ? 'Pratik başlat' : 'Deneme başlat'}</Link>
    </Empty></section>}
    {data?.items.length > 0 && <>
      {!practice && <section className="card table-card statistics-summary" aria-label="Filtrelenen çalışmaların özeti">
        <DataGrid mode="summary" rowData={summary} columnDefs={examSummaryColumns(examLabel)} />
      </section>}
      <section className="card table-card" aria-label={practice ? 'Pratik kayıtları' : 'Deneme sonuçları detaylı'}>
        <h3>{practice ? 'Pratik kayıtları' : 'Deneme sonuçları detaylı'}</h3>
        <DataGrid rowData={rows} columnDefs={columns}
          showSearch={false} selectionFilters compactColumns={!practice} onFilteredRowsChange={practice ? undefined : setVisibleRows} />
      </section>
    </>}
  </section>;
}
