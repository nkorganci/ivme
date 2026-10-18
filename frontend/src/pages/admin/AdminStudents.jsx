import { useState } from 'react';
import { api, qs } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { formatDate, formatNumber } from '../../format.js';
import DataGrid from '../../components/DataGrid.jsx';
import Pager from '../../components/Pager.jsx';
import { Field } from '../../components/Field.jsx';
import { Empty, ErrorBox, Loading } from '../../components/States.jsx';

const COLUMNS = [
  { field: 'username', headerName: 'Kullanıcı adı', minWidth: 150 },
  { field: 'email', headerName: 'E-posta', minWidth: 220 },
  { colId: 'status', headerName: 'Durum', minWidth: 125,
    valueGetter: ({ data }) => data.archivedAt ? 'Arşivlendi' : data.enabled ? 'Etkin' : 'Duraklatıldı' },
  { field: 'createdAt', headerName: 'Kayıt tarihi', minWidth: 165,
    valueFormatter: ({ value }) => formatDate(value) },
];

export default function AdminStudents() {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const url = '/api/admin/students' + qs({ query, page, size: 25 });
  const { data, loading, error, retry } = useAsync(() => api.get(url), [url]);
  const search = event => {
    event.preventDefault();
    setQuery(draft.trim());
    setPage(0);
  };
  const clear = () => { setDraft(''); setQuery(''); setPage(0); };
  return <section aria-label="Kayıtlı öğrenciler">
    <h2>Kayıtlı öğrenciler</h2>
    <form className="filter-row" onSubmit={search}>
      <Field label="Öğrenci ara" type="search" value={draft} maxLength={100}
        onChange={event => setDraft(event.target.value)} placeholder="Kullanıcı adı veya e-posta" />
      <button type="submit" className="btn btn-primary">Ara</button>
      {query && <button type="button" className="btn btn-secondary" onClick={clear}>Aramayı temizle</button>}
    </form>
    {loading && <Loading />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && <>
      <p className="muted">{formatNumber(data.totalElements)} öğrenci{query ? ' bulundu' : ' kayıtlı'}.</p>
      {data.content.length ? <div className="card table-card">
        <DataGrid rowData={data.content} columnDefs={COLUMNS} showSearch={false}
          gridOptions={{ pagination: false }} />
      </div> : <Empty title={query ? 'Aramaya uyan öğrenci yok.' : 'Henüz kayıtlı öğrenci yok.'} />}
      <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </>}
  </section>;
}
