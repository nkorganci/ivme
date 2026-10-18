import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync } from '../hooks.js';
import { formatNumber } from '../format.js';
import DataGrid from './DataGrid.jsx';
import { ErrorBox, Loading } from './States.jsx';
import { QUESTION_SOURCES as SOURCES, writeQuestionSources } from '../questionSources.js';

export default function QuestionPoolSummary() {
  const [, setParams] = useSearchParams();
  const { data, loading, error, retry, reload } = useAsync(async () => {
    const [overall, ...sources] = await Promise.all([
      api.get('/api/questions/availability'),
      ...SOURCES.map(({ bank, examType }) => api.get('/api/questions/availability' + qs({ bank, examType }))),
    ]);
    return [{ ...overall, ...Object.fromEntries(SOURCES.map((source, index) => [source.field, sources[index].total])) }];
  }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const selectSource = ({ id }) => setParams(current => {
    const next = writeQuestionSources(new URLSearchParams(current), [id]);
    for (const key of ['subject', 'topic', 'branchId', 'categoryId', 'categoryMatch', 'includeCandidates', 'questionTypeId', 'teacherDifficulty', 'topicPdfId']) next.delete(key);
    next.delete('scope');
    return next;
  }, { replace: true });
  const columns = [
    { field: 'total', headerName: 'Toplam' },
    ...SOURCES.map(source => ({ field: source.field, headerName: source.headerName,
      ...(source.bank === 'OGM' ? { flex: 1.8, minWidth: 108 } : {}),
      cellRenderer: ({ value }) => <button type="button" className="study-pool-link"
        aria-label={`${source.headerName}${source.bank === 'CIKMIS' ? ' çıkmış sorular' : ''}: ${formatNumber(value)} soru, filtrele`}
        onClick={() => selectSource(source)}>{formatNumber(value)}</button> })),
    { field: 'solved', headerName: 'Çözülen' },
    { field: 'correct', headerName: 'Doğru' },
    { field: 'remaining', headerName: 'Kalan' },
  ];

  return <section className="card table-card form-card study-pool-summary" aria-label="Soru havuzu ve çözüm özeti">
    {loading ? <Loading text="Soru özeti yükleniyor…" /> : error ? <ErrorBox error={error} onRetry={retry} />
      : <DataGrid mode="summary" dense columnDefs={columns} rowData={data} />}
    <p className="muted small statistics-table-note">AYT ve TYT: çıkmış sorular. Kaynak sayısına tıklayarak filtrele.
      {' '}Çözülen ve doğru sayıları ilk yanıtına göre hesaplanır; tekrarlar sayıyı artırmaz.</p>
  </section>;
}
