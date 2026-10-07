import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, usePageParam, usePageTitle } from '../hooks.js';
import Pager from '../components/Pager.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { displayName, formatDate, formatDuration, formatPercent } from '../format.js';

const SIZE = 10;

export default function History() {
  const { user } = useAuth();
  usePageTitle('Sınav Geçmişi');
  const [page, setPage] = usePageParam();
  const { data, loading, error, retry } = useAsync(() => api.get('/api/exams' + qs({ page, size: SIZE })), [page]);

  return (
    <>
      <h1>{displayName(user)} · Sınav Geçmişin</h1>
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && data.content.length === 0 && (
        <section className="card">
          <Empty title="Henüz tamamlanmış bir sınavın yok.">
            <p>İlk sınavını çözdüğünde sonuçların burada listelenecek.</p>
            <Link to="/sinav/yeni" className="btn btn-primary">
              Sınav başlat
            </Link>
          </Empty>
        </section>
      )}
      {data && data.content.length > 0 && (
        <div className="history-grid">
          {data.content.map((e) => (
            <article key={e.id} className="card history-card">
              <h2>{e.title}</h2>
              <p className="muted small">{formatDate(e.submittedAt)}</p>
              <p className="chips">
                <span className="chip">{e.questionCount} soru</span>
                <span className="chip chip-ok">{e.correctCount} doğru</span>
                <span className="chip chip-bad">{e.wrongCount} yanlış</span>
                <span className="chip chip-warn">{e.blankCount} boş</span>
                <span className="chip chip-primary">{formatPercent(e.percent)}</span>
                <span className="chip">{formatDuration(e.durationSeconds, true)}</span>
              </p>
              <Link to={`/sinav/${e.id}/sonuc`} className="btn btn-secondary">
                Detay
              </Link>
            </article>
          ))}
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
