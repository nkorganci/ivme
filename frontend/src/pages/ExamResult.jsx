import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, usePageTitle } from '../hooks.js';
import ProgressRing from '../components/ProgressRing.jsx';
import QuestionImage from '../components/QuestionImage.jsx';
import Segmented from '../components/Segmented.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../components/States.jsx';
import { displayName, formatDate, formatDuration, formatNet, formatPercent } from '../format.js';

export default function ExamResult() {
  const { id } = useParams();
  usePageTitle('Sonuç');
  const { data: r, loading, error, retry } = useAsync(() => api.get(`/api/exams/${id}/result`), [id]);

  if (loading) return <Loading text="Sonuç yükleniyor…" />;
  if (error?.status === 409) {
    return (
      <Alert type="warn">
        Bu sınav henüz bitirilmedi. <Link to={`/sinav/${id}`}>Sınava dön</Link>
      </Alert>
    );
  }
  if (error) return <ErrorBox error={error} onRetry={retry} />;
  return r ? <ResultView r={r} /> : null;
}

function ResultView({ r }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [open, setOpen] = useState(() => new Set());

  const count = (s) => r.questions.filter((q) => q.status === s).length;
  const options = [
    { value: 'ALL', label: `Hepsi (${r.questions.length})` },
    { value: 'WRONG', label: `Yanlışlar (${count('WRONG')})` },
    { value: 'BLANK', label: `Boşlar (${count('BLANK')})` },
  ];
  const shown = filter === 'ALL' ? r.questions : r.questions.filter((q) => q.status === filter);

  const toggle = (qid) =>
    setOpen((s) => {
      const next = new Set(s);
      if (!next.delete(qid)) next.add(qid);
      return next;
    });

  return (
    <>
      <h1>{displayName(user)}, sonucun hazır</h1>
      <p className="muted">
        {r.title} · {formatDate(r.submittedAt)}
      </p>

      <section className="card result-top">
        <ProgressRing percent={r.percent} />
        <div className="stats stats-5">
          <div className="stat stat-ok">
            <p className="stat-value">{r.correctCount}</p>
            <p className="stat-label">✓ Doğru</p>
          </div>
          <div className="stat stat-bad">
            <p className="stat-value">{r.wrongCount}</p>
            <p className="stat-label">✗ Yanlış</p>
          </div>
          <div className="stat stat-warn">
            <p className="stat-value">{r.blankCount}</p>
            <p className="stat-label">— Boş</p>
          </div>
          <div className="stat">
            <p className="stat-value">{formatNet(r.net)}</p>
            <p className="stat-label">Net</p>
          </div>
          <div className="stat">
            <p className="stat-value">{formatDuration(r.durationSeconds)}</p>
            <p className="stat-label">Süre</p>
          </div>
        </div>
      </section>

      {r.bySubject?.length > 0 && (
        <section className="card table-card">
          <h2>Ders bazında</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Doğru</th>
                  <th>Yanlış</th>
                  <th>Boş</th>
                  <th>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {r.bySubject.map((s) => {
                  const pct = s.total ? (s.correct / s.total) * 100 : 0;
                  return (
                    <tr key={s.subject}>
                      <td>
                        {s.subject} <span className="muted">({s.total})</span>
                      </td>
                      <td>{s.correct}</td>
                      <td>{s.wrong}</td>
                      <td>{s.blank}</td>
                      <td>
                        <div className="bar-cell">
                          <div className="progress" role="img" aria-label={`${s.subject} başarısı ${formatPercent(pct)}`}>
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <span className="bar-text">{formatPercent(pct)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <h2 className="section-title">Sorular</h2>
      <Segmented label="Soru filtresi" options={options} value={filter} onChange={setFilter} />
      {shown.length === 0 ? (
        <Empty title="Bu filtrede soru yok." />
      ) : (
        <ul className="qlist">
          {shown.map((q) => {
            const isOpen = open.has(q.questionId);
            return (
              <li key={q.questionId} className={`card qrow qrow-${q.status.toLowerCase()}`}>
                <button type="button" className="qrow-head" aria-expanded={isOpen} onClick={() => toggle(q.questionId)}>
                  <span className="qnum">{q.position}</span>
                  <span className="qcode">{q.code}</span>
                  <span className="qtopic">
                    {q.subject}
                    {q.topic ? ` · ${q.topic}` : ''}
                  </span>
                  <span>
                    Cevabın: <b>{q.selectedAnswer || '—'}</b>
                  </span>
                  <span>
                    Doğru: <b>{q.correctAnswer}</b>
                  </span>
                  <StatusBadge status={q.status} />
                </button>
                {isOpen && (
                  <div className="qrow-body">
                    <QuestionImage id={q.questionId} alt={`${q.position}. soru`} />
                    <p>
                      Senin cevabın: <span className="chip">{q.selectedAnswer || 'Boş'}</span> Doğru cevap: <span className="chip chip-ok">{q.correctAnswer}</span>
                    </p>
                    <Link to={`/soru/${encodeURIComponent(q.code)}`} className="btn btn-secondary">
                      Soru sayfasını aç
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="quick">
        <Link to="/sinav/yeni" className="btn btn-primary">
          Yeni sınav
        </Link>
        <Link to="/gecmis" className="btn btn-secondary">
          Geçmişe dön
        </Link>
      </div>
    </>
  );
}
