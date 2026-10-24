import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';
import './PdfBankAudit.css';

const number = value => Number(value || 0).toLocaleString('tr-TR');

export default function PdfBankAudit() {
  usePageTitle('PDF envanteri');
  const audit = useAsync(() => api.get('/api/pdf-bank-audit'), []);
  const [selected, setSelected] = useState(null);
  const [proof, setProof] = useState(null);
  const [proofError, setProofError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [workBusy, setWorkBusy] = useState(false);
  const [workError, setWorkError] = useState(null);
  const [status, setStatus] = useState('');
  const rows = useMemo(() => (audit.data?.pdfs || []).filter(row => !status || row.status === status), [audit.data, status]);
  const counts = useMemo(() => (audit.data?.pdfs || []).reduce((groups, row) => {
    (groups[row.status] ||= []).push(row); return groups;
  }, {}), [audit.data]);
  const openProof = async row => {
    setSelected(row.id); setProof(null); setProofError(null); setWorkError(null); setBusy(true);
    try { setProof(await api.get(`/api/pdf-bank-audit/${row.id}/proof`)); }
    catch (error) { setProofError(error); }
    finally { setBusy(false); }
  };
  const changeWork = async action => {
    if (!proof) return;
    setWorkBusy(true); setWorkError(null);
    try {
      if (action) await api.put(`/api/pdf-bank-audit/${proof.id}/work`, { action, sourceSha256: proof.sha256 });
      else await api.delete(`/api/pdf-bank-audit/${proof.id}/work`);
      audit.retry();
    } catch (error) { setWorkError(error); }
    finally { setWorkBusy(false); }
  };
  const columns = useMemo(() => [
    { field: 'title', headerName: 'PDF', minWidth: 260, flex: 2, wrapText: true, autoHeight: true,
      cellRenderer: ({ data }) => data.available ? <Link to={`/konu-anlatimlari/${data.id}`}>{data.title}</Link> : data.title },
    { field: 'exam', headerName: 'Sınav', minWidth: 90 },
    { field: 'subject', headerName: 'Ders', minWidth: 120 },
    { field: 'category', headerName: 'İçerik', minWidth: 155 },
    { field: 'source', headerName: 'Kaynak serisi', minWidth: 150 },
    { field: 'pages', headerName: 'Sayfa', minWidth: 85, cellDataType: 'number' },
    { field: 'questionCount', headerName: 'Bankadaki soru', minWidth: 115, cellDataType: 'number' },
    { field: 'status', headerName: 'Soru durumu', minWidth: 165 },
    { field: 'workAction', headerName: 'İşlem seçimi', minWidth: 135,
      valueFormatter: ({ value }) => value === 'EXTRACT' ? 'Soru çıkarma' : value === 'DELETE_REVIEW' ? 'Silme incelemesi' : 'Seçilmedi' },
    { field: 'available', headerName: 'Dosya', minWidth: 100, valueGetter: ({ data }) => data.available ? 'Var' : 'Eksik' },
    { colId: 'proof', headerName: 'Kanıt', minWidth: 100, filter: false, sortable: false,
      cellRenderer: ({ data }) => <button type="button" className="btn btn-secondary btn-sm" onClick={() => openProof(data)}>Göster</button> },
  ], []);
  const questionColumns = useMemo(() => [
    { field: 'code', headerName: 'Soru kodu', minWidth: 220, flex: 1,
      cellRenderer: ({ data }) => <Link to={`/soru/${encodeURIComponent(data.code)}`}>{data.code}</Link> },
    { field: 'bank', headerName: 'Banka', minWidth: 110 },
    { field: 'page', headerName: 'PDF sayfası', minWidth: 120, cellDataType: 'number',
      cellRenderer: ({ data }) => data.page ? <Link to={`/konu-anlatimlari/${selected}#page=${data.page}`}>{data.page}</Link> : 'Belirsiz' },
    { field: 'sourceRef', headerName: 'Özgün kayıt kanıtı', minWidth: 300, flex: 2 },
  ], [selected]);
  if (audit.loading) return <Loading text="PDF envanteri yükleniyor…" />;
  if (audit.error) return <ErrorBox error={audit.error} onRetry={audit.retry} />;
  return <div className="pdf-bank-audit">
    <div className="page-head"><h1>PDF envanteri</h1></div>
    <p className="muted">{number(audit.data.physicalPdfCount)} fiziksel PDF · {number(audit.data.pdfs.length)} katalog kaydı · {number(audit.data.liveQuestionCount)} canlı banka sorusu · denetim: {new Date(audit.data.auditedAt).toLocaleString('tr-TR')}.</p>
    {!audit.data.current && <p role="alert">Soru bankası denetimden sonra değişti. Kanıtları güncellemek için PDF denetimini yeniden çalıştır.</p>}
    <p className="muted">Kanıtlı banka sorusu, özgün PDF dosya yolu, kaynak SHA-256 değeri ve canlı soru kodunun eşleşmesine dayanır. Sayfa ve soru kodlarını Kanıt düğmesinden inceleyebilirsin. Sıfır eşleşme, PDF’de soru olmadığı veya henüz çıkarılmadığı anlamına gelmez.</p>
    <label className="pdf-audit-status">Soru durumu <select value={status} onChange={event => setStatus(event.target.value)}>
      <option value="">Bütün durumlar ({number(audit.data.pdfs.length)})</option>
      {Object.entries(counts).map(([key, list]) => <option key={key} value={key}>{key} ({number(list.length)})</option>)}
    </select></label>
    <section className="card table-card" aria-label="PDF envanteri tablosu">
      <DataGrid rowData={rows} columnDefs={columns} mode="worksheet" scrollable columnSorting selectionFilters rowNumbers showSearch={false}
        gridOptions={{ getRowId: ({ data }) => String(data.id) }} />
    </section>
    {selected && <section className="card pdf-audit-proof" aria-label="Soru çıkarım kanıtı">
      <div className="pdf-audit-proof-head"><h2>{proof?.title || 'Kanıt yükleniyor…'}</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setProof(null); }}>Kapat</button></div>
      {busy && <Loading text="Kanıt yükleniyor…" />}{proofError && <ErrorBox error={proofError} />}
      {proof && <><p className="muted">Kaynak: {proof.relativePath} · SHA-256: <code>{proof.sha256}</code> · hash kontrolü: {proof.hashVerified === true ? 'doğrulandı' : proof.hashVerified === false ? 'uyuşmuyor' : 'soru bağı yok'} · bankadaki {number(proof.questionCount)} soru.</p>
        <p>İşlem seçimi: {audit.data.pdfs.find(row => row.id === proof.id)?.workAction === 'EXTRACT' ? 'Soru çıkarma' : audit.data.pdfs.find(row => row.id === proof.id)?.workAction === 'DELETE_REVIEW' ? 'Silme incelemesi' : 'Seçilmedi'}</p>
        <div className="pdf-audit-work">
          <button type="button" className="btn btn-secondary btn-sm" disabled={workBusy || !proof.available || !audit.data.current} onClick={() => changeWork('EXTRACT')}>Soru çıkarma listesine al</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={workBusy} onClick={() => changeWork('DELETE_REVIEW')}>Silme incelemesine al</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={workBusy} onClick={() => changeWork('')}>İşlem seçimini kaldır</button>
        </div>
        <p className="muted small">İşlem seçimi PDF’yi değiştirmez. Soru ekleme için kırpım, cevap ve kaynak doğrulaması; silme için ortak arşiv kararı gerekir.</p>
        {workError && <ErrorBox error={workError} />}
        {proof.questionCount ? <DataGrid rowData={proof.proof} columnDefs={questionColumns} mode="worksheet" scrollable columnSorting selectionFilters rowNumbers showSearch={false}
          gridOptions={{ getRowId: ({ data }) => data.code }} />
          : <p>Bu PDF’ye kesin bağlanan canlı banka sorusu bulunamadı. PDF’yi açıp soru içerip içermediğini incele.</p>}</>}
    </section>}
  </div>;
}
