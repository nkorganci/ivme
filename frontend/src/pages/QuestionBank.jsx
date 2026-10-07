import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { PAGE_SIZE } from '../config.js';
import { useAuth } from '../auth.jsx';
import { useAsync, useFilterRows, usePageParam, usePageTitle } from '../hooks.js';
import FilterSelects from '../components/FilterSelects.jsx';
import Pager from '../components/Pager.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { displayName, formatNumber } from '../format.js';

export default function QuestionBank() {
  const { user } = useAuth();
  usePageTitle('Soru Bankası');
  const rows = useFilterRows();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const filter = {
    examType: params.get('examType') || '',
    subject: params.get('subject') || '',
    topic: params.get('topic') || '',
  };
  const hasFilter = Object.values(filter).some(Boolean);
  const filterQuery = qs(filter);

  // Filtre değişince sayfa 0'a döner (adres çubuğunda yalnız dolu filtreler tutulur).
  const setFilter = (next) => setParams(new URLSearchParams(qs(next).slice(1)));

  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/questions' + qs({ ...filter, page, size: PAGE_SIZE })),
    [filterQuery, page],
  );

  return (
    <>
      <div className="page-head">
        <h1>{displayName(user)} · Soru Bankası</h1>
        {data && <span className="muted">{formatNumber(data.totalElements)} soru bulundu</span>}
      </div>
      <section className="card">
        <FilterSelects rows={rows} value={filter} onChange={setFilter}>
          <button type="button" className="btn btn-secondary" disabled={!hasFilter} onClick={() => setFilter({})}>
            Filtreleri temizle
          </button>
        </FilterSelects>
      </section>

      {loading && <Loading text="Sorular yükleniyor…" />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && data.content.length === 0 && (
        <Empty title="Bu filtreye uyan soru yok.">
          <p>Filtreleri değiştirmeyi ya da temizlemeyi dene.</p>
        </Empty>
      )}

      {data && data.content.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ders</th>
                  <th>Konu</th>
                  <th>Yıl</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((q) => {
                  const to = `/soru/${encodeURIComponent(q.code)}${filterQuery}`;
                  return (
                    <tr key={q.id} onClick={() => navigate(to)}>
                      <td>
                        <Link to={to} onClick={(e) => e.stopPropagation()}>
                          {q.code}
                        </Link>
                      </td>
                      <td>
                        {q.examType} · {q.subject}
                      </td>
                      <td>{q.topic || '—'}</td>
                      <td>{q.year || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
