import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { useExamTrack } from '../examTrack.jsx';
import DataGrid from './DataGrid.jsx';
import { Empty, ErrorBox, Loading } from './States.jsx';

const roles = { SORU_KITAPCIGI: 'Çıkmış sorular', CEVAP_ANAHTARI: 'Cevap anahtarı', YARDIMCI: 'Kapsam / konu kaynağı' };
const numeric = (field, headerName) => ({ field, headerName, minWidth: 95, cellDataType: 'number' });

export default function ExamPdfInventory() {
  usePageTitle('PDF envanteri');
  const { track } = useExamTrack();
  const { data, loading, error, retry } = useAsync(() => api.get('/api/exam-content'), [track.id]);
  if (loading) return <Loading text="Sınavın PDF envanteri yükleniyor…" />;
  if (error) return <ErrorBox error={error} onRetry={retry} />;
  const rows = data?.documents || [];
  const columns = [
    { field: 'path', headerName: 'PDF', minWidth: 280, flex: 3, wrapText: true, autoHeight: true,
      cellRenderer: ({ data }) => <a href={'/api/exam-content/document' + qs({ path: data.path })} target="_blank" rel="noopener noreferrer">{data.path.split('/').pop()}</a> },
    { field: 'role', headerName: 'İçerik', minWidth: 160, valueFormatter: ({ value }) => roles[value] || value },
    numeric('pageCount', 'Sayfa'), numeric('expectedCount', 'Anahtardaki soru'),
    numeric('questionCount', 'Çıkarılan soru'), numeric('activeCount', 'Pratikteki soru'),
    { colId: 'missing', headerName: 'Çıkarılamayan no', minWidth: 150, valueGetter: ({ data }) => data.missingNumbers.join(', ') || '—' },
    { colId: 'unanswered', headerName: 'İptal / anahtarsız no', minWidth: 160, valueGetter: ({ data }) => data.unansweredNumbers.join(', ') || '—' },
    { field: 'note', headerName: 'Durum', minWidth: 250, flex: 2, wrapText: true, autoHeight: true },
  ];
  return <div className="pdf-bank-audit-page">
    <div className="page-head"><h1>PDF envanteri</h1><span className="badge badge-primary">{track.name}</span></div>
    <p className="muted">{rows.length.toLocaleString('tr-TR')} PDF · Yalnız bu sınavın çıkmış soruları, kapsam kılavuzu ve konu kaynakları.</p>
    <p className="muted small">Konu kaynağı listelenmesi sorularının aktarıldığı anlamına gelmez. İptal edilen veya geçerli cevabı okunamayan sorular pratiğe alınmaz.</p>
    {rows.length ? <section className="card table-card" aria-label="Yurt dışı öğretmenlik PDF kaynakları">
      <DataGrid rowData={rows} columnDefs={columns} mode="worksheet" scrollable columnSorting rowNumbers
        gridOptions={{ getRowId: ({ data }) => data.path }} />
    </section> : <Empty title="Bu sınav için PDF envanteri henüz kaydedilmedi." />}
  </div>;
}
