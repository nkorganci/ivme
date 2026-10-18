import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../components/States.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate, formatNumber } from '../format.js';

function resumePath(item) {
  if (item.kind === 'EXAM') return `/sinav/${item.id}`;
  return item.resumeQuestionCode
    ? `/soru/${encodeURIComponent(item.resumeQuestionCode)}${qs({ sessionId: item.id, bank: item.resumeQuestionBank })}`
    : `/pratik/${item.id}`;
}

const COLUMNS = [
  { field: 'title', headerName: 'Pratik / deneme adı' },
  { field: 'kind', headerName: 'Tür', valueFormatter: ({ value }) => value === 'EXAM' ? 'Deneme' : 'Pratik' },
  { field: 'startedAt', headerName: 'Başlangıç', valueFormatter: ({ value }) => formatDate(value) },
  { field: 'questionCount', headerName: 'Toplam soru', cellDataType: 'number' },
  { field: 'solvedCount', headerName: 'Çözülen soru', cellDataType: 'number' },
];
const GRID_OPTIONS = { getRowId: ({ data }) => `${data.kind}-${data.id}`, rowHeight: 52 };

export default function UnfinishedStudies() {
  usePageTitle('Yarım kalan çalışmalar');
  const { data, loading, error, retry } = useAsync(() => api.get('/api/study-sessions/unfinished'), []);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [cancelError, setCancelError] = useState('');
  const columns = useMemo(() => [...COLUMNS,
    { colId: 'resume', headerName: 'İşlemler', pinned: 'right', width: 235, minWidth: 235, maxWidth: 235,
      suppressAutoSize: true, sortable: false, filter: false, resizable: false, suppressHeaderMenuButton: true,
      cellRenderer: ({ data: item }) => item && <div className="unfinished-study-actions">
        <Link className="btn btn-primary btn-sm" to={resumePath(item)}
          aria-label={`${item.title} oturumuna devam et`}><span aria-hidden="true">▶</span> Devam et</Link>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCancelError(''); setCancelling(item); }}
          aria-label={`${item.title} oturumunu iptal et`}>İptal et</button>
      </div> },
  ], []);
  const cancel = async () => {
    if (busyRef.current || !cancelling) return;
    busyRef.current = true;
    setBusy(true);
    setCancelError('');
    try {
      const path = cancelling.kind === 'EXAM' ? '/api/exams' : '/api/study-sessions';
      await api.post(`${path}/${cancelling.id}/cancel`);
      setCancelling(null);
      retry();
    } catch (e) { setCancelError(e.message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <>
    <div className="page-head">
      <div><h1>Yarım kalan çalışmalar</h1><p className="muted">Başladığın ve henüz bitirmediğin pratikler ile denemeler.</p></div>
      <Link to="/calisma/yeni" className="btn btn-secondary">Yeni çalışma</Link>
    </div>
    {loading ? <Loading text="Yarım kalan çalışmalar yükleniyor…" /> : error ? <ErrorBox error={error} onRetry={retry} /> :
      data?.length ? <section className="card table-card" aria-label="Yarım kalan pratikler ve denemeler">
        <h2>{formatNumber(data.length)} yarım kalan çalışma</h2>
        <p className="muted small">Devam et ile kaldığın yerden sürdürebilir veya çalışmayı iptal edebilirsin. Yarım kalan ve iptal edilen çalışmaların cevapları, genel doğru/yanlış geçmişine ve istatistiklere katılmaz.</p>
        <DataGrid fitContent rowData={data} columnDefs={columns} gridOptions={GRID_OPTIONS} />
      </section> : <section className="card"><Empty title="Yarım kalan çalışman yok.">
        <p>Yeni bir pratik veya deneme başlatabilirsin.</p>
      </Empty></section>}
    {cancelling && <Modal title="Çalışmayı iptal et" onClose={() => { if (!busyRef.current) setCancelling(null); }} footer={<>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setCancelling(null)}>Vazgeç</button>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={cancel}>{busy ? 'İptal ediliyor…' : 'Çalışmayı iptal et'}</button>
    </>}>
      <p><strong>{cancelling.title}</strong> iptal edilecek. Bu çalışmaya devam edemeyeceksin; cevapları istatistiklere katılmayacak.</p>
      {cancelError && <Alert type="error">{cancelError}</Alert>}
    </Modal>}
  </>;
}
