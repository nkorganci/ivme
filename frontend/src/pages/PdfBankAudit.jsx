import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';
import './PdfBankAudit.css';

const number = value => Number(value || 0).toLocaleString('tr-TR');
const auditGridOptions = { getRowId: ({ data }) => String(data.id),
  onGridSizeChanged: ({ api, clientWidth }) => { if (clientWidth > 0) api.sizeColumnsToFit(); } };
const codeGridOptions = { rowHeight: 34, getRowId: ({ data }) => `${data.code}:${data.page ?? data.pdfPage ?? ''}`,
  onGridSizeChanged: auditGridOptions.onGridSizeChanged };

export default function PdfBankAudit() {
  usePageTitle('PDF envanteri');
  const audit = useAsync(() => api.get('/api/pdf-bank-audit'), []);
  const [selected, setSelected] = useState(null);
  const [proof, setProof] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [candidateError, setCandidateError] = useState(null);
  const [proofError, setProofError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [workBusy, setWorkBusy] = useState(false);
  const [workError, setWorkError] = useState(null);
  const [status, setStatus] = useState('');
  const [archiveFilter, setArchiveFilter] = useState('');
  const [processingFilter, setProcessingFilter] = useState('');
  const proofRef = useRef(null);
  useEffect(() => {
    if (selected != null) proofRef.current?.scrollIntoView({ block: 'start' });
  }, [selected]);
  const rows = useMemo(() => (audit.data?.pdfs || []).filter(row =>
    (!status || row.status === status) && (!archiveFilter || row.archiveState === archiveFilter)
    && (!processingFilter || row.processingLabel === processingFilter)), [audit.data, status, archiveFilter, processingFilter]);
  const counts = useMemo(() => (audit.data?.pdfs || []).reduce((groups, row) => {
    (groups[row.status] ||= []).push(row); return groups;
  }, {}), [audit.data]);
  const openProof = async row => {
    setSelected(row.id); setProof(null); setCandidates(null); setProofError(null); setCandidateError(null); setWorkError(null); setBusy(true);
    try {
      setProof(await api.get(`/api/pdf-bank-audit/${row.id}/proof`));
      if (row.candidatePackageAvailable ?? row.candidateCount > 0) {
        try { setCandidates(await api.get(`/api/pdf-bank-audit/${row.id}/candidates`)); }
        catch (error) { setCandidateError(error); }
      }
    }
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
    // Every row opens the viewer; it explains why a PDF that cannot be opened (archived, missing, changed, video-only) is unavailable.
    { field: 'title', headerName: 'PDF', width: 87, minWidth: 87, maxWidth: 87, autoHeight: true,
      cellRenderer: ({ data }) => <Link to={`/konu-anlatimlari/${data.id}`}>{data.title}</Link> },
    { field: 'exam', headerName: 'Sınav', width: 55, minWidth: 42 },
    { field: 'subject', headerName: 'Ders', width: 70, minWidth: 55 },
    { field: 'category', headerName: 'İçerik', width: 70, minWidth: 55 },
    { field: 'source', headerName: 'Kaynak serisi', width: 78, minWidth: 60 },
    { field: 'pages', headerName: 'Sayfa', width: 50, minWidth: 40, cellDataType: 'number' },
    { field: 'questionCount', headerName: 'Bankadaki soru', width: 60, minWidth: 44, cellDataType: 'number' },
    { field: 'candidateCount', headerName: 'Çıkarım adayı', width: 60, minWidth: 44, cellDataType: 'number' },
    { field: 'completionLabel', headerName: 'Bütün sorular alındı', width: 70, minWidth: 58,
      valueFormatter: ({ value }) => value || 'Doğrulanmadı' },
    { field: 'processingLabel', headerName: 'İşlem etiketi', width: 90, minWidth: 66 },
    { field: 'archiveState', headerName: 'Arşiv', width: 62, minWidth: 46 },
    { field: 'status', headerName: 'Soru durumu', width: 90, minWidth: 66 },
    { field: 'workAction', headerName: 'İşlem seçimi', width: 82, minWidth: 60,
      valueFormatter: ({ value }) => value === 'EXTRACT' ? 'Soru çıkarma' : value === 'ARCHIVE_REVIEW' ? 'Arşiv incelemesi' : 'Seçilmedi' },
    { field: 'available', headerName: 'Dosya', width: 56, minWidth: 44, valueGetter: ({ data }) => data.archiveState === 'Arşivde' ? 'Arşivde' : data.available ? 'Var' : 'Eksik' },
    { colId: 'proof', headerName: 'Kanıt', width: 74, minWidth: 64, valueGetter: ({ data }) => data.questionCount > 0 ? 'Soru kanıtı var' : 'Soru kanıtı yok',
      cellRenderer: ({ data }) => <button type="button" className="btn btn-secondary btn-sm" aria-label={`${data.title} kanıtını göster`} onClick={() => openProof(data)}>Göster</button> },
  ].map(def => ({ wrapText: true, autoHeight: true, wrapHeaderText: true, autoHeaderHeight: true, ...def })), []);
  const questionColumns = useMemo(() => [
    { field: 'code', headerName: 'Soru kodu', minWidth: 150,
      cellRenderer: ({ data }) => <Link to={`/soru/${encodeURIComponent(data.code)}`}>{data.code}</Link> },
    { field: 'bank', headerName: 'Banka', minWidth: 70 },
    { field: 'page', headerName: 'PDF sayfası', minWidth: 65, cellDataType: 'number',
      cellRenderer: ({ data }) => data.page ? <Link to={`/konu-anlatimlari/${selected}#page=${data.page}`}>{data.page}</Link> : 'Belirsiz' },
    { field: 'matchType', headerName: 'Eşleşme', minWidth: 140, valueFormatter: ({ value }) => ({
      TYPOGRAPHIC_VARIANT: 'Yazım varyantı', PARAPHRASE: 'Anlatım varyantı',
      REVIEWED_PARAPHRASE: 'Anlatım karşılaştırıldı',
      DISTRACTOR_VARIANT: 'Çeldirici varyantı', OPTION_PRESENTATION: 'Seçenek sunumu farklı',
      OPTION_PERMUTATION: 'Seçenek sırası farklı', SAME_DIAGRAM_AND_OPTIONS: 'Şekil ve seçenekler aynı',
      EXACT_TEXT: 'Metin birebir', EXACT_QUESTION_TEXT_OPTIONS_AND_ANSWER: 'Metin, seçenek ve cevap aynı',
      TYPOGRAPHY_AND_CONNECTOR_VARIANT: 'Yazım veya bağlaç farkı',
      SOURCE_ANSWER_CORRECTION: 'Kaynak cevabı düzeltildi',
      NEW_SOURCE_QUESTION: 'Bu PDF’den alındı',
      SOURCE_IDENTITY: 'Özgün kaynak bağı',
    }[value] || value || 'Özgün kaynak bağı') },
    { field: 'sourceRef', headerName: 'Özgün kayıt kanıtı', minWidth: 180 },
  ].map(def => ({ wrapText: true, autoHeight: true, wrapHeaderText: true, autoHeaderHeight: true, ...def })), [selected]);
  const candidateColumns = useMemo(() => [
    { field: 'bankStatus', headerName: 'Banka durumu', width: 110, minWidth: 90, valueFormatter: ({ value }) => value === 'LINKED' ? 'Bankada var' : value === 'EXCLUDED' ? 'Kapsam dışı' : value === 'NEEDS_REVIEW' ? 'İnceleme bekliyor' : 'Aktarım bekliyor' },
    { field: 'code', headerName: 'Aday kodu', minWidth: 140 },
    { field: 'printedNumber', headerName: 'Basılı no', minWidth: 55, cellDataType: 'number' },
    { field: 'pdfPage', headerName: 'PDF sayfası', minWidth: 65, cellDataType: 'number',
      cellRenderer: ({ data }) => <Link to={`/konu-anlatimlari/${selected}#page=${data.pdfPage}`}>{data.pdfPage}</Link> },
    { field: 'answer', headerName: 'Kaynak anahtarı', minWidth: 90,
      valueGetter: ({ data }) => data.sourceAnswerCorrected ? `${data.answer} → ${data.bankAnswer} (düzeltildi)` : data.answer },
    { field: 'text', headerName: 'Çıkarılan metin', minWidth: 190, wrapText: true, autoHeight: true,
      cellStyle: { lineHeight: '1.4', paddingBlock: '6px' } },
    { field: 'sourceReviewNote', headerName: 'İnceleme notu', minWidth: 140, wrapText: true, autoHeight: true },
    { colId: 'candidateImage', headerName: 'Kırpım', minWidth: 65, valueGetter: () => 'Görsel var',
      cellRenderer: ({ data }) => <a href={`/api/pdf-bank-audit/${selected}/candidates/${encodeURIComponent(data.code)}/image`}
        target="_blank" rel="noreferrer">Görsel</a> },
  ].map(def => ({ wrapText: true, autoHeight: true, wrapHeaderText: true, autoHeaderHeight: true, ...def })), [selected]);
  if (audit.loading) return <Loading text="PDF envanteri yükleniyor…" />;
  if (audit.error) return <ErrorBox error={audit.error} onRetry={audit.retry} />;
  return <div className="pdf-bank-audit">
    <div className="page-head"><h1>PDF envanteri</h1></div>
    <p className="muted">{number(audit.data.physicalPdfCount)} fiziksel PDF · {number(audit.data.pdfs.length)} envanter satırı · {number(audit.data.liveQuestionCount)} canlı banka sorusu · denetim: {new Date(audit.data.auditedAt).toLocaleString('tr-TR')}.</p>
    {audit.data.uniquePdfCount != null && <p className="muted">{number(audit.data.uniquePdfCount)} farklı PDF içeriği · PDF ile eşleşen {number(audit.data.uniquePdfQuestionCount)} tekil banka sorusu · kaynak eşleştirmesi bekleyen {number(audit.data.sourceReviewQuestionCount)} soru. Aynı dosyanın katalog kopyaları bir satırda birleştirilir. Aynı soru farklı PDF’lerde bulunabildiği için sütun toplamı tekil banka toplamından farklı olabilir.</p>}
    {audit.data.quarantinedQuestionCount > 0 && <p role="status">İçeriği kaynakta da eksik olan {number(audit.data.quarantinedQuestionCount)} kayıt pratik havuzundan çıkarıldı; eski çözüm geçmişleri korundu. İlgili PDF’ler tam işlenmiş sayılmaz.</p>}
    {!audit.data.current && <p role="alert">Soru bankası denetimden sonra değişti. Kanıtları güncellemek için PDF denetimini yeniden çalıştır.</p>}
    <p className="muted">Kanıtlı banka sorusu, PDF dosyasının içerik kimliği, kaynak konumu ve canlı soru kodunun eşleşmesine dayanır. “Bütün sorular alındı: Evet” yalnız tam soru dökümü, bağımsız sayfa kontrolü ve banka eşleşmesi birlikte doğrulandığında gösterilir. “Doğrulanmadı” eksik soru bulunabileceğini belirtir. Sıfır eşleşme, PDF’de soru olmadığı anlamına gelmez.</p>
    <label className="pdf-audit-status">Soru durumu <select value={status} onChange={event => setStatus(event.target.value)}>
      <option value="">Bütün durumlar ({number(audit.data.pdfs.length)})</option>
      {Object.entries(counts).map(([key, list]) => <option key={key} value={key}>{key} ({number(list.length)})</option>)}
    </select></label>
    <label className="pdf-audit-status">Arşiv <select value={archiveFilter} onChange={event => setArchiveFilter(event.target.value)}>
      <option value="">Tümü</option><option value="Aktif">Aktif</option><option value="Arşivde">Arşivde</option>
    </select></label>
    <label className="pdf-audit-status">İşlem etiketi <select value={processingFilter} onChange={event => setProcessingFilter(event.target.value)}>
      <option value="">Tümü</option>{[...new Set(audit.data.pdfs.map(row => row.processingLabel))].map(value => <option key={value}>{value}</option>)}
    </select></label>
    <section className="card table-card" aria-label="PDF envanteri tablosu">
      <DataGrid rowData={rows} columnDefs={columns} mode="worksheet" className="pdf-audit-inventory-grid" scrollable columnSorting selectionFilters rowNumbers showSearch={false}
        gridOptions={auditGridOptions} />
    </section>
    {selected && <section ref={proofRef} className="card pdf-audit-proof" aria-label="Soru çıkarım kanıtı">
      <div className="pdf-audit-proof-head"><h2>{proof?.title || 'Kanıt yükleniyor…'}</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setProof(null); }}>Kapat</button></div>
      {busy && <Loading text="Kanıt yükleniyor…" />}{proofError && <ErrorBox error={proofError} />}
      {candidateError && <ErrorBox error={candidateError} />}
      {proof && <><p className="muted">Kaynak: {proof.relativePath} · SHA-256: <code>{proof.sha256}</code> · arşiv: {audit.data.pdfs.find(row => row.id === proof.id)?.archiveState} · hash kontrolü: {proof.hashVerified === true ? 'doğrulandı' : proof.hashVerified === false ? 'uyuşmuyor' : 'soru bağı yok'} · bankadaki {number(proof.questionCount)} soru · çıkarılan {number(proof.candidateCount)} aday.</p>
        <p>İşlem seçimi: {audit.data.pdfs.find(row => row.id === proof.id)?.workAction === 'EXTRACT' ? 'Soru çıkarma' : audit.data.pdfs.find(row => row.id === proof.id)?.workAction === 'ARCHIVE_REVIEW' ? 'Arşiv incelemesi' : 'Seçilmedi'}</p>
        <p>Bütün sorular alındı: {audit.data.pdfs.find(row => row.id === proof.id)?.completionLabel || 'Doğrulanmadı'}
          {proof.expectedQuestions != null && ` · Tespit edilen soru sayısı: ${number(proof.expectedQuestions)}`}
          {audit.data.pdfs.find(row => row.id === proof.id)?.reviewCount > 0 && ` · Karşılaştırma bekleyen: ${number(audit.data.pdfs.find(row => row.id === proof.id)?.reviewCount)}`}</p>
        {audit.data.pdfs.find(row => row.id === proof.id)?.sourceIssueCount > 0 && <p role="status">Bu PDF’de soru içeriği eksik olan {number(audit.data.pdfs.find(row => row.id === proof.id)?.sourceIssueCount)} kayıt var. Kaynak onarılana kadar tamlık doğrulanamaz.</p>}
        {audit.data.pdfs.find(row => row.id === proof.id)?.excludedOtherExamCount > 0 && <p>Kapsam dışındaki sınavlara ait {number(audit.data.pdfs.find(row => row.id === proof.id)?.excludedOtherExamCount)} örnek bankaya alınmadı. Tamlık TYT/AYT kapsamı için gösterilir.</p>}
        <div className="pdf-audit-work">
          <button type="button" className="btn btn-secondary btn-sm" disabled={workBusy || !proof.available || !audit.data.current || audit.data.pdfs.find(row => row.id === proof.id)?.extractionComplete || audit.data.pdfs.find(row => row.id === proof.id)?.allQuestionsTaken || audit.data.pdfs.find(row => row.id === proof.id)?.archiveState === 'Arşivde'} onClick={() => changeWork('EXTRACT')}>Soru çıkarma listesine al</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={workBusy || !proof.available || !audit.data.current || audit.data.pdfs.find(row => row.id === proof.id)?.archiveState === 'Arşivde'} onClick={() => changeWork('ARCHIVE_REVIEW')}>Arşiv incelemesine al</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={workBusy} onClick={() => changeWork('')}>İşlem seçimini kaldır</button>
        </div>
        <p className="muted small">İşlem seçimi PDF’yi değiştirmez. Arşivleme için tüm soruların bankadaki kanıtı ve kalan PDF bağlantılarının kontrolü gerekir.</p>
        {workError && <ErrorBox error={workError} />}
        {proof.questionCount ? <DataGrid rowData={proof.proof} columnDefs={questionColumns} mode="worksheet" scrollable columnSorting selectionFilters rowNumbers showSearch={false} fitAllRows
          gridOptions={codeGridOptions} />
          : <p>Bu PDF’ye kesin bağlanan canlı banka sorusu bulunamadı. PDF’yi açıp soru içerip içermediğini incele.</p>}</>}
      {candidates && <div className="pdf-audit-candidates"><h3>PDF’deki sorular ve aktarım durumu</h3>
        <p className="muted">{number(candidates.questionCount)} sorunun kaynak cevabı iki yöntemle okundu. {number(candidates.linkedCount || 0)} soru bankadaki kayda bağlı; {number(candidates.pendingCount ?? candidates.questionCount)} soru kontrol bekliyor; {number(candidates.excludedCount || 0)} örnek kapsam dışında. Kaynak anahtarındaki doğrulanmış hata ayrı gösterilir.</p>
        <DataGrid rowData={candidates.cards} columnDefs={candidateColumns} mode="worksheet" scrollable columnSorting selectionFilters rowNumbers showSearch={false} fitAllRows
          gridOptions={codeGridOptions} />
      </div>}
    </section>}
  </div>;
}
