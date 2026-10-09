import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { PAGE_SIZE } from '../config.js';
import { useAuth } from '../auth.jsx';
import { useAsync, useFilterRows, usePageParam, usePageTitle } from '../hooks.js';
import FilterSelects from '../components/FilterSelects.jsx';
import Pager from '../components/Pager.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { bankLabel, displayName, formatNumber } from '../format.js';

/**
 * Soru koleksiyonu listesi; iki sayfada kullanılır:
 * bank = CIKMIS → "AYT-TYT Çıkmış Sorular" (sütun: Yıl), bank = OGM → "Soru Bankası" (sütun: Kaynak).
 */
export default function QuestionCollection({ bank }) {
  const { user } = useAuth();
  const label = bankLabel(bank);
  usePageTitle(label);
  const rows = useFilterRows(bank);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const filter = {
    examType: params.get('examType') || '',
    subject: params.get('subject') || '',
    topic: params.get('topic') || '',
  };
  const hasFilter = Object.values(filter).some(Boolean);
  const detailQuery = qs({ bank, ...filter }); // soru sayfasına taşınan filtreler

  // Filtre değişince sayfa 0'a döner (adres çubuğunda yalnız dolu filtreler tutulur).
  const setFilter = (next) => setParams(new URLSearchParams(qs(next).slice(1)));

  const { data, loading, error, retry } = useAsync(
    () => api.get('/api/questions' + qs({ bank, ...filter, page, size: PAGE_SIZE })),
    [bank, qs(filter), page],
  );
  const last = bank === 'OGM' ? 'Kaynak' : 'Yıl';

  return (
    <>
      <div className="page-head">
        <h1>
          {displayName(user)} · {label}
        </h1>
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
          {/* Dar ekranda tablo yerine kart satırlar gösterilir (CSS ile değişir) */}
          <ul className="qcards">
            {data.content.map((q) => {
              const to = `/soru/${encodeURIComponent(q.code)}${detailQuery}`;
              return (
                <li key={q.id}>
                  <Link to={to} className="qcard">
                    <span className="qcard-top">
                      <strong className="qcard-code">{q.code}</strong>
                      {bank !== 'OGM' && q.year && <span className="muted">{q.year}</span>}
                    </span>
                    <span className="qcard-mid">
                      <span>
                        <span className="badge badge-muted">
                          {q.examType} · {q.subject}
                        </span>{' '}
                        {q.topic}
                      </span>
                    </span>
                    {bank === 'OGM' && q.source && <span className="qcard-src">{q.source}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="table-wrap qtable-view">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ders / Konu</th>
                  <th>{last}</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((q) => {
                  const to = `/soru/${encodeURIComponent(q.code)}${detailQuery}`;
                  const topic = [q.examType, q.subject, q.topic].filter(Boolean).join(' · ');
                  return (
                    <tr key={q.id} onClick={() => navigate(to)}>
                      <td>
                        <Link to={to} onClick={(e) => e.stopPropagation()}>
                          {q.code}
                        </Link>
                      </td>
                      <td className="cell-clip" title={topic}>
                        {topic}
                      </td>
                      <td className="cell-clip" title={bank === 'OGM' ? q.source || '' : undefined}>
                        {(bank === 'OGM' ? q.source : q.year) || '—'}
                      </td>
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
