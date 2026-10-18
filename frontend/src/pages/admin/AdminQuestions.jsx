import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { PAGE_SIZE } from '../../config.js';
import { useAsync, useFilterRows } from '../../hooks.js';
import FilterSelects from '../../components/FilterSelects.jsx';
import Pager from '../../components/Pager.jsx';
import DataGrid from '../../components/DataGrid.jsx';
import { Field } from '../../components/Field.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../../components/States.jsx';
import { BANKS, bankShort, formatNumber } from '../../format.js';
import QuestionEditor from './QuestionEditor.jsx';

const NO_FILTER = { examType: '', subject: '', topic: '' };

export default function AdminQuestions() {
  const [bank, setBank] = useState(''); // boş = tüm koleksiyonlar
  const rows = useFilterRows(bank);
  const [params, setParams] = useSearchParams();
  const editId = params.get('duzenle');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(NO_FILTER);
  const [active, setActive] = useState('');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');

  const url = '/api/operator/questions' + qs({ query, bank, ...filter, active, page, size: PAGE_SIZE });
  const { data, loading, error, retry, reload } = useAsync(() => api.get(url), [url]);

  const search = (e) => {
    e.preventDefault();
    setQuery(draft.trim());
    setPage(0);
  };
  const changeFilter = (next) => {
    setFilter(next);
    setPage(0);
  };
  const clear = () => {
    setDraft('');
    setQuery('');
    setFilter(NO_FILTER);
    setBank('');
    setActive('');
    setPage(0);
  };
  const open = (id) => setParams({ sekme: 'sorular', duzenle: String(id) });
  const close = () => setParams({ sekme: 'sorular' });

  return (
    <>
      <section className="card">
        <form className="search-row" onSubmit={search} role="search">
          <Field label="Kod ara" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Kodda geçen metin" />
          <button type="submit" className="btn btn-primary">
            Ara
          </button>
        </form>
        <FilterSelects rows={rows} value={filter} onChange={changeFilter}>
          <Field
            as="select"
            label="Koleksiyon"
            value={bank}
            onChange={(e) => {
              setBank(e.target.value);
              setFilter(NO_FILTER);
              setPage(0);
            }}
          >
            <option value="">Hepsi</option>
            {Object.entries(BANKS).map(([key, b]) => (
              <option key={key} value={key}>
                {b.short}
              </option>
            ))}
          </Field>
          <Field
            as="select"
            label="Durum"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Hepsi</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </Field>
          <button type="button" className="btn btn-secondary" onClick={clear}>
            Filtreleri temizle
          </button>
        </FilterSelects>
        <p className="muted small">
          {data && <>{formatNumber(data.totalElements)} soru · </>}Ders/konu listeleri yalnızca aktif soruları içerir.
        </p>
      </section>

      {notice && <Alert type="success">{notice}</Alert>}
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && data.content.length === 0 && <Empty title="Aramaya uyan soru yok." />}
      {data && data.content.length > 0 && (
        <div className="card table-card">
          <DataGrid rowData={data.content} columnDefs={[
            { field: 'code', headerName: 'Kod' },
            { field: 'bank', headerName: 'Koleksiyon', cellRenderer: ({ value }) =>
              <span className="badge badge-muted">{bankShort(value)}</span> },
            { colId: 'subjectTopic', headerName: 'Ders / Konu', minWidth: 220,
              valueGetter: ({ data: q }) => [q.examType, q.subject, q.topic].filter(Boolean).join(' · ') },
            { field: 'correctAnswer', headerName: 'Cevap' },
            { field: 'active', headerName: 'Durum', valueFormatter: ({ value }) => value ? '✓ Aktif' : '✗ Pasif' },
            { field: 'openReportCount', headerName: 'Açık bildirim' },
            { field: 'avgRating', headerName: 'Puan', minWidth: 130,
              valueFormatter: ({ data: q }) => q.avgRating == null ? '—'
                : `★ ${Number(q.avgRating).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} (${q.ratingCount})` },
            { colId: 'edit', headerName: 'İşlem', sortable: false, filter: false,
              cellRenderer: ({ data: q }) => <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => open(q.id)}>Düzenle</button> },
          ]} gridOptions={{ pagination: false }} />
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {editId && (
        <QuestionEditor
          id={editId}
          rows={rows}
          onClose={close}
          onSaved={(q) => {
            setNotice(`${q.code} kodlu soru kaydedildi.`);
            close();
            reload();
          }}
        />
      )}
    </>
  );
}
