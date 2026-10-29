import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';
import './PdfBankAudit.css';

const number = value => Number(value || 0).toLocaleString('tr-TR');
const describeRow = row => {
  const pending = Number(row.candidateCount || 0) + Number(row.reviewCount || 0);
  const reasons = row.coverageEvidence?.reasons || [];
  const unreadablePages = row.coverageEvidence?.unreadablePageNumbers || [];
  const textReviews = row.coverageEvidence?.providerPrintCheck?.textReviewNumbers || [];
  const imageReview = reasons.includes('PAGES_REQUIRE_OCR_OR_VISUAL_REVIEW') || reasons.includes('ENCODED_TEXT_REQUIRES_OCR_OR_VISUAL_REVIEW');
  const transferStatus = !row.sha256 ? 'Dosya eksik'
    : row.sourceIssueCount > 0 ? 'Kaynakta hata var'
    : row.status === 'Soru kaynağı değişmiş' ? 'Yeniden kontrol gerekli'
    : row.allQuestionsTaken ? 'Tamamı bankada'
    : row.extractionComplete ? 'YKS sorusu yok'
    : Number(row.reviewCount || 0) > 0 ? 'Soru içeriği incelemesi'
    : pending > 0 ? 'Soru eşleştirmesi gerekli'
    : imageReview ? 'Görsel içerik incelemesi'
    : reasons.includes('PDF_TEXT_CHECK_REQUIRES_VISUAL_REVIEW') ? 'Kaynak metni karşılaştırılacak'
    : 'Soru dökümü gerekli';
  const pendingLabel = !row.sha256 ? 'Dosya gerekli'
    : pending > 0 ? number(pending)
    : row.extractionComplete ? '0'
    : row.sourceIssueCount > 0 ? `${number(row.sourceIssueCount)} kaynak kaydı`
    : row.status === 'Soru kaynağı değişmiş' ? 'Banka bağı incelenecek'
    : unreadablePages.length ? `${number(unreadablePages.length)} sayfa`
    : textReviews.length ? `${number(textReviews.length)} soru metni`
    : `Belge: ${number(row.pages)} sayfa`;
  return { ...row, transferStatus, pendingRecords: pending,
    pendingLabel,
    fileStatus: row.archiveState === 'Arşivde' ? 'Arşivde' : row.available ? 'Açılabilir' : 'Dosya eksik' };
};
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
  const [fileFilter, setFileFilter] = useState('');
  const proofRef = useRef(null);
  useEffect(() => {
    if (selected != null) proofRef.current?.scrollIntoView({ block: 'start' });
  }, [selected]);
  const allRows = useMemo(() => (audit.data?.pdfs || []).map(describeRow), [audit.data]);
  const rows = useMemo(() => allRows.filter(row =>
    (!status || row.transferStatus === status) && (!fileFilter || row.fileStatus === fileFilter)), [allRows, status, fileFilter]);
  const counts = useMemo(() => allRows.reduce((groups, row) => {
    (groups[row.transferStatus] ||= []).push(row); return groups;
  }, {}), [allRows]);
  const selectedRow = allRows.find(row => row.id === selected);
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
    { field: 'pages', headerName: 'Sayfa', width: 65, minWidth: 60, cellDataType: 'number' },
    { field: 'questionCount', headerName: 'Bankada kayıtlı soru', width: 90, minWidth: 70, cellDataType: 'number',
      headerTooltip: 'Bu PDF ile eşleşmesi doğrulanan ve pratikte kullanılabilen soru sayısı.' },
    { field: 'pendingLabel', headerName: 'Kontrol bekleyen kayıt', width: 110, minWidth: 85,
      headerTooltip: 'Aktarım veya eşleşme kontrolü bekleyen soru ve sayfa bölgeleri. Kesin eksik soru sayısı değildir.' },
    { field: 'transferStatus', headerName: 'Aktarım durumu', width: 145, minWidth: 110,
      headerTooltip: 'Tamamı bankada: PDF’nin bütün YKS soruları kontrol edildi ve banka kayıtlarına bağlandı.' },
    { field: 'fileStatus', headerName: 'Dosya durumu', width: 80, minWidth: 65 },
    { colId: 'proof', headerName: 'Ayrıntılar', width: 80, minWidth: 70, valueGetter: () => 'Soruları ve kontrol notlarını incele',
      cellRenderer: ({ data }) => <button type="button" className="btn btn-secondary btn-sm" aria-label={`${data.title} ayrıntılarını incele`} onClick={() => openProof(data)}>İncele</button> },
  ].map(def => ({ wrapText: true, autoHeight: true, wrapHeaderText: true, autoHeaderHeight: true, ...def })), []);
  const questionColumns = useMemo(() => [
    { field: 'code', headerName: 'Soru kodu', minWidth: 150,
      cellRenderer: ({ data }) => <Link to={`/soru/${encodeURIComponent(data.code)}`}>{data.code}</Link> },
    { field: 'bank', headerName: 'Banka', minWidth: 70 },
    { field: 'page', headerName: 'PDF sayfası', minWidth: 65, cellDataType: 'number',
      cellRenderer: ({ data }) => data.page ? <Link to={`/konu-anlatimlari/${selected}#page=${data.page}`}>{data.page}</Link> : 'Belirsiz' },
    { field: 'matchType', headerName: 'Eşleşme', minWidth: 140, valueFormatter: ({ value }) => ({
      TYPOGRAPHIC_VARIANT: 'Yazım varyantı', PARAPHRASE: 'Anlatım varyantı',
      PUNCTUATION_PRESENTATION_VARIANT: 'Noktalama sunumu farklı',
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
    <div className="page-head"><h1>PDF envanteri</h1><button type="button" className="btn btn-secondary" onClick={audit.retry}>Bilgileri yenile</button></div>
    <p>Bu tablo yalnız TYT/AYT kaynaklarını gösterir. Sayılar ve kontrol sonuçları veritabanındaki güncel kayıtlardan alınır.</p>
    <div className="pdf-audit-summary" aria-label="Güncel soru toplamları">
      <div><strong>{number(audit.data.liveQuestionCount)}</strong><span>Pratikteki toplam soru</span></div>
      <div><strong>{number(audit.data.uniquePdfQuestionCount)}</strong><span>PDF kaynağı doğrulanan soru</span></div>
      <div><strong>{number(audit.data.sourceReviewQuestionCount)}</strong><span>PDF kaynağı henüz bulunamayan soru</span></div>
    </div>
    {audit.data.quarantinedQuestionCount > 0 && <p role="status">İçeriği kaynakta da eksik olan {number(audit.data.quarantinedQuestionCount)} kayıt pratik havuzundan çıkarıldı; eski çözüm geçmişleri korundu. İlgili PDF’ler tam işlenmiş sayılmaz.</p>}
    {!audit.data.current && <p role="alert">Soru bankası denetimden sonra değişti. Kanıtları güncellemek için PDF denetimini yeniden çalıştır.</p>}
    <div className="pdf-audit-guide">
      <p><strong>Bankada kayıtlı soru:</strong> Bu PDF ile eşleşmesi doğrulanan, pratikte kullanılabilen sorular. Aynı soru birkaç PDF’de varsa her ilgili satırda görünür; yukarıdaki toplamda bir kez sayılır.</p>
      <p><strong>Kontrol bekleyen kayıt:</strong> Tespit edilmiş soru veya sayfa bölgesi sayısı. Kesin eksik soru sayısı değildir. “Belge” ile başlayan değer, kapsam incelemesi gereken PDF’nin toplam sayfa sayısıdır; eksik soru sayısı olarak kullanılamaz.</p>
      <p><strong>Aktarım durumu:</strong> “Tamamı bankada” bütün YKS sorularının alındığının doğrulandığı anlamına gelir. Diğer durumlar gerekli kaynak, görsel, eşleştirme veya etiket incelemesini belirtir. Sıfır banka kaydı, PDF’de soru olmadığı anlamına gelmez.</p>
    </div>
    <p className="muted small">{number(audit.data.uniquePdfCount)} farklı PDF · {number(allRows.filter(row => row.allQuestionsTaken).length)} PDF’nin bütün soruları bankada · son kaynak denetimi: {new Date(audit.data.auditedAt).toLocaleString('tr-TR')}.</p>
    <div className="pdf-audit-filters">
    <label className="pdf-audit-status">Aktarım durumu <select value={status} onChange={event => setStatus(event.target.value)}>
      <option value="">Bütün durumlar ({number(audit.data.pdfs.length)})</option>
      {Object.entries(counts).map(([key, list]) => <option key={key} value={key}>{key} ({number(list.length)})</option>)}
    </select></label>
    <label className="pdf-audit-status">Dosya durumu <select value={fileFilter} onChange={event => setFileFilter(event.target.value)}>
      <option value="">Tümü</option><option value="Açılabilir">Açılabilir</option><option value="Arşivde">Arşivde</option><option value="Dosya eksik">Dosya eksik</option>
    </select></label>
    </div>
    <section className="card table-card" aria-label="PDF envanteri tablosu">
      <DataGrid rowData={rows} columnDefs={columns} mode="worksheet" className="pdf-audit-inventory-grid" scrollable columnSorting selectionFilters rowNumbers showSearch={false}
        gridOptions={auditGridOptions} />
    </section>
    {selected && <section ref={proofRef} className="card pdf-audit-proof" aria-label="Soru çıkarım kanıtı">
      <div className="pdf-audit-proof-head"><h2>{proof?.title || 'Kanıt yükleniyor…'}</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setProof(null); }}>Kapat</button></div>
      {busy && <Loading text="Kanıt yükleniyor…" />}{proofError && <ErrorBox error={proofError} />}
      {candidateError && <ErrorBox error={candidateError} />}
      {proof && <><p><strong>Aktarım durumu: {selectedRow?.transferStatus}</strong> · Bankada kayıtlı {number(proof.questionCount)} soru · kontrol bekleyen kayıt: {selectedRow?.pendingLabel}.</p>
        <p>{selectedRow?.allQuestionsTaken ? 'Bütün YKS soruları kontrol edildi ve bankaya bağlandı. Yeniden soru çıkarımı gerekmiyor.'
          : selectedRow?.extractionComplete ? 'Bu PDF’de bankaya alınacak YKS sorusu olmadığı doğrulandı.'
          : `Gerekli işlem: ${selectedRow?.transferStatus}. Bütün soruların banka kaydıyla eşleştiğine dair tamlık kanıtı yok.`}
          {proof.expectedQuestions != null && ` · PDF için tespit edilen toplam soru konumu: ${number(proof.expectedQuestions)}.`}</p>
        <details><summary>Kaynak bilgileri</summary><p>Kaynak serisi: {selectedRow?.source} · Dosya durumu: {selectedRow?.fileStatus}</p>
          <p className="muted">{proof.relativePath}</p><p className="muted small">Dosya kimliği (SHA-256): <code>{proof.sha256 || 'Dosya bulunamadı'}</code></p></details>
        <p>Planlanan işlem: {selectedRow?.workAction === 'EXTRACT' ? 'Soru çıkarma ve aktarım kontrolü' : selectedRow?.workAction === 'ARCHIVE_REVIEW' ? 'Arşivleme için inceleme' : 'İşlem listesine eklenmedi'}. Bu seçim, işlemin tamamlandığı anlamına gelmez.</p>
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
