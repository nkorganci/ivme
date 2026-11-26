import { useMemo, useState } from 'react';
import DataGrid from './DataGrid.jsx';
import { Empty } from './States.jsx';
import INVENTORY from '../data/teacher-pdf-inventory.json';

const number = value => Number(value || 0).toLocaleString('tr-TR');
const distinct = field => [...new Set(INVENTORY.documents.map(row => row[field]).filter(Boolean))]
  .sort((a, b) => String(a).localeCompare(String(b), 'tr'));

export default function TeacherPdfInventory() {
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState('');
  const [examYear, setExamYear] = useState('');
  const [publicationYear, setPublicationYear] = useState('');
  const [branch, setBranch] = useState('');
  const [type, setType] = useState('');
  const [publisher, setPublisher] = useState('');
  const [sourceGroup, setSourceGroup] = useState('');
  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr');
    return INVENTORY.documents.filter(row => (!exam || row.exam === exam)
      && (!examYear || String(row.examYear || '') === examYear)
      && (!publicationYear || String(row.publicationYear || '') === publicationYear)
      && (!branch || row.branch === branch) && (!type || row.resourceType === type)
      && (!publisher || row.publisher === publisher) && (!sourceGroup || row.sourceGroup === sourceGroup)
      && (!term || [row.bookTitle, row.fileName, row.publisher, row.exam, row.branch, row.resourceType,
        ...(row.sourcePaths || [])].join(' ').toLocaleLowerCase('tr').includes(term)));
  }, [search, exam, examYear, publicationYear, branch, type, publisher, sourceGroup]);
  const columns = [
    { field: 'bookTitle', headerName: 'Kitap / PDF başlığı', minWidth: 270, flex: 2, wrapText: true, autoHeight: true },
    { field: 'titleSource', headerName: 'Başlık kaynağı', minWidth: 125 },
    { field: 'fileName', headerName: 'Dosya adı', minWidth: 250, flex: 2, wrapText: true, autoHeight: true },
    { field: 'publisher', headerName: 'Yayınevi / marka', minWidth: 145 },
    { field: 'publisherEvidence', headerName: 'Künye eşleşmesi', minWidth: 210 },
    { field: 'exam', headerName: 'Sınav', minWidth: 130 },
    { field: 'examYear', headerName: 'Sınav yılı', minWidth: 95 },
    { field: 'publicationYear', headerName: 'Basım yılı', minWidth: 95 },
    { field: 'branch', headerName: 'Branş / ders', minWidth: 145 },
    { field: 'resourceType', headerName: 'Tür', minWidth: 155 },
    { field: 'sourceGroup', headerName: 'Yerel havuz', minWidth: 155 },
    { field: 'pageCount', headerName: 'Sayfa', minWidth: 85, cellDataType: 'number' },
    { field: 'copyCount', headerName: 'Kopya', minWidth: 85, cellDataType: 'number' },
    { field: 'contentStatus', headerName: 'Kaynak durumu', minWidth: 260, flex: 2, wrapText: true, autoHeight: true },
    { field: 'publicationStatus', headerName: 'Yayın durumu', minWidth: 225, wrapText: true, autoHeight: true },
    { field: 'sourcePaths', headerName: 'Yerel konum', minWidth: 300, flex: 2, wrapText: true, autoHeight: true,
      valueFormatter: ({ value }) => Array.isArray(value) ? value.join(' · ') : '' },
  ];

  return <div className="pdf-bank-audit-page">
    <div className="page-head"><h1>Öğretmenlik PDF kaynakları</h1>
      <span className="badge badge-primary">Öğretmenlik Sınavı</span></div>
    <p className="muted">Yerel arşivde {number(INVENTORY.localPdfCount)} dosya bulundu; aynı SHA-256 olan kopyalar bir satırda birleştirildi.
      Gösterilen {number(INVENTORY.uniquePdfCount)} benzersiz dosya yalnızca metaveridir; PDF’ler bu ekrandan açılmaz veya yayımlanmaz.</p>
    <p className="muted small">Kitap başlığı PDF başlığından veya dosya adından alınır. Yayınevi/marka dosya adı, PDF başlığı veya ilk sayfanın metin künyesinde eşleştiyse yazılır; bulunamayanlar tahmin edilmez.
      Basım yılı dosya adında bulunan yıl etiketidir, ayrıca doğrulanmış basım tarihi değildir. “Tam kaynak” durumu içerik kapsamını anlatır, yayın izni anlamına gelmez.</p>
    <section className="card teacher-pdf-filters" aria-label="PDF kaynaklarını filtrele">
      <label>Ad, yayınevi veya dosya konumu<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Örn. Pegem, Fizik, konu anlatımı" /></label>
      <label>Sınav<select value={exam} onChange={event => setExam(event.target.value)}><option value="">Tüm sınavlar</option>{distinct('exam').map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Sınav yılı<select value={examYear} onChange={event => setExamYear(event.target.value)}><option value="">Tüm yıllar</option>{distinct('examYear').map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Basım yılı<select value={publicationYear} onChange={event => setPublicationYear(event.target.value)}><option value="">Tüm basım yılları</option>{distinct('publicationYear').map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Branş / ders<select value={branch} onChange={event => setBranch(event.target.value)}><option value="">Tüm branşlar</option>{distinct('branch').map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Kaynak türü<select value={type} onChange={event => setType(event.target.value)}><option value="">Tüm türler</option>{distinct('resourceType').map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Yayınevi / marka<select value={publisher} onChange={event => setPublisher(event.target.value)}><option value="">Tümü</option>{distinct('publisher').map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Yerel havuz<select value={sourceGroup} onChange={event => setSourceGroup(event.target.value)}><option value="">Tüm havuzlar</option>{distinct('sourceGroup').map(x => <option key={x}>{x}</option>)}</select></label>
    </section>
    <p className="muted small">Filtrede {number(rows.length)} kaynak · {number(rows.reduce((sum, row) => sum + Number(row.pageCount || 0), 0))} sayfa</p>
    {rows.length ? <section className="card table-card" aria-label="Öğretmenlik PDF kaynak listesi">
      <DataGrid rowData={rows} columnDefs={columns} mode="worksheet" scrollable columnSorting rowNumbers
        gridOptions={{ getRowId: ({ data }) => data.sha256, onGridSizeChanged: ({ api, clientWidth }) => {
          if (clientWidth > 0) api.sizeColumnsToFit();
        } }} />
    </section> : <Empty title="Bu filtrelerle eşleşen PDF yok." />}
  </div>;
}
