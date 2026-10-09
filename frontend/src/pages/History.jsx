import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, usePageParam, usePageTitle } from '../hooks.js';
import Pager from '../components/Pager.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { displayName, formatDate, formatDuration, formatPercent } from '../format.js';

const SIZE = 10;
const PRACTICE_MODE = { MIXED: 'Karışık', NEW: 'Yeni sorular', REPEAT: 'Önceki sorular', WRONG: 'Yanlış yaptıklarım' };

export default function History() {
  const [params] = useSearchParams();
  const practice = params.get('tab') === 'practice';
  usePageTitle('Geçmişim');
  return <>
    <h1>Geçmişim</h1>
    <nav className="history-tabs" aria-label="Geçmiş türü">
      <Link to="/gecmis" className={`btn ${practice ? 'btn-secondary' : 'btn-primary'}`} aria-current={!practice ? 'page' : undefined}>Sınavlar</Link>
      <Link to="/gecmis?tab=practice" className={`btn ${practice ? 'btn-primary' : 'btn-secondary'}`} aria-current={practice ? 'page' : undefined}>Pratikler</Link>
    </nav>
    {practice ? <PracticeHistory /> : <ExamHistory />}
  </>;
}

function PracticeHistory() {
  const [page, setPage] = usePageParam();
  const { data, loading, error, retry } = useAsync(() => api.get('/api/study-sessions' + qs({ page, size: SIZE })), [page]);
  return <section id="pratik">
    <h2 className="section-title">Pratik oturumların</h2>
    {loading && <Loading text="Pratik geçmişi yükleniyor…" />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data?.totalElements === 0 && <section className="card"><Empty title="Henüz pratik oturumun yok.">
      <p>İlk pratiğini başlatınca açık ve tamamlanan oturumların burada görünecek.</p>
      <Link to="/pratik/yeni" className="btn btn-primary">Pratik başlat</Link>
    </Empty></section>}
    {data?.totalElements > 0 && data.content.length === 0 && <section className="card">
      <Empty title="Bu sayfada pratik oturumu yok."><p>Önceki sayfaya dönerek kayıtlarını görebilirsin.</p></Empty>
    </section>}
    {data?.content.length > 0 && <div className="history-grid">
      {data.content.map((item) => <article key={item.id} className="card history-card">
        <h3>{item.questionCount} soruluk pratik</h3>
        <p className="muted small">{formatDate(item.startedAt)}</p>
        <p className="chips">
          <span className="chip">{PRACTICE_MODE[item.selectionMode] || 'Karışık'}</span>
          <span className="chip">{item.timeLimitSeconds ? `${item.timeLimitSeconds / 60} dakika` : 'Süresiz'}</span>
          <span className={`chip ${item.status === 'COMPLETED' ? 'chip-ok' : 'chip-primary'}`}>
            {item.status === 'COMPLETED' ? 'Tamamlandı' : 'Devam ediyor'}
          </span>
        </p>
        <Link to={`/pratik/${item.id}`} className="btn btn-secondary">
          {item.status === 'COMPLETED' ? 'Sonucu gör' : 'Devam et'}
        </Link>
      </article>)}
    </div>}
    {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
  </section>;
}

function ExamHistory() {
  const { user } = useAuth();
  const [page, setPage] = usePageParam();
  const { data, loading, error, retry } = useAsync(() => api.get('/api/exams' + qs({ page, size: SIZE })), [page]);

  return (
    <>
      <h2 className="section-title">{displayName(user)} · Sınav geçmişin</h2>
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
