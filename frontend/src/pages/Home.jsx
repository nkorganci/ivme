import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, usePageTitle } from '../hooks.js';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';
import { displayName, formatDate, formatDuration, formatNumber, formatPercent } from '../format.js';

function Stat({ label, value, tone }) {
  return (
    <div className={`card stat${tone ? ` stat-${tone}` : ''}`}>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  usePageTitle('Ana Sayfa');
  const { data, loading, error, retry } = useAsync(() => api.get('/api/exams/summary'), []);
  const active = data?.activeExam;
  const last = data?.lastExam;

  return (
    <>
      <h1>Merhaba, {displayName(user)} 👋</h1>
      <p className="muted lead">Bugün de bir adım ilerleyelim.</p>

      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}

      {data && (
        <>
          {active && (
            <section className="card resume">
              <div>
                <p className="resume-label">Devam eden sınavın var</p>
                <h2>{active.title}</h2>
                <p className="muted">
                  {active.questionCount} soru · Kalan süre: {active.remainingSeconds == null ? 'Süresiz' : formatDuration(active.remainingSeconds)}
                </p>
              </div>
              <Link to={`/sinav/${active.id}`} className="btn btn-primary">
                Sınava devam et
              </Link>
            </section>
          )}

          {data.examCount === 0 ? (
            !active && (
              <section className="card">
                <Empty title="İlk sınavına hazır mısın?">
                  <p>Henüz sınav çözmedin. Küçük başla: 10 soruluk bir deneme bile iyi bir başlangıç!</p>
                  <Link to="/sinav/yeni" className="btn btn-primary">
                    İlk sınavımı başlat
                  </Link>
                </Empty>
              </section>
            )
          ) : (
            <>
              <div className="stats">
                <Stat label="Çözülen sınav" value={formatNumber(data.examCount)} />
                <Stat label="Ortalama başarı" value={data.averagePercent == null ? '—' : formatPercent(data.averagePercent)} />
                <Stat label="✓ Toplam doğru" value={formatNumber(data.totalCorrect)} tone="ok" />
                <Stat label="✗ Toplam yanlış" value={formatNumber(data.totalWrong)} tone="bad" />
                <Stat label="— Toplam boş" value={formatNumber(data.totalBlank)} tone="warn" />
              </div>

              {last && (
                <section className="card last-exam">
                  <h2>Son sınavın</h2>
                  <p>
                    <strong>{last.title}</strong> <span className="muted">· {formatDate(last.submittedAt)}</span>
                  </p>
                  <p className="muted">
                    {formatPercent(last.percent)} · {last.correctCount} doğru · {last.wrongCount} yanlış · {last.blankCount} boş
                  </p>
                  <Link to={`/sinav/${last.id}/sonuc`} className="btn btn-secondary">
                    Sonucu gör
                  </Link>
                </section>
              )}
            </>
          )}
        </>
      )}

      <h2 className="section-title">Hızlı eylemler</h2>
      <div className="quick">
        <Link to="/sinav/yeni" className="btn btn-primary">
          Sınav başlat
        </Link>
        <Link to="/sorular" className="btn btn-secondary">
          Soru bankası
        </Link>
        <Link to="/gecmis" className="btn btn-secondary">
          Geçmiş
        </Link>
      </div>
    </>
  );
}
