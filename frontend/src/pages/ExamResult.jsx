import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, usePageTitle } from '../hooks.js';
import ProgressRing from '../components/ProgressRing.jsx';
import DataGrid from '../components/DataGrid.jsx';
import QuestionImage from '../components/QuestionImage.jsx';
import Segmented from '../components/Segmented.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../components/States.jsx';
import { displayName, formatDate, formatDuration, formatNet, formatPercent } from '../format.js';
import AnswerFeedback from '../components/AnswerFeedback.jsx';

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
          <DataGrid rowData={r.bySubject.map((s) => ({ ...s,
            percent: s.total ? (s.correct / s.total) * 100 : 0,
          }))} columnDefs={[
            { field: 'subject', headerName: 'Ders', minWidth: 170,
              cellRenderer: ({ data }) => <>{data.subject} <span className="muted">({data.total})</span></> },
            { field: 'correct', headerName: 'Doğru' },
            { field: 'wrong', headerName: 'Yanlış' },
            { field: 'blank', headerName: 'Boş' },
            { field: 'percent', headerName: 'Başarı', minWidth: 180,
              cellRenderer: ({ data }) => <div className="bar-cell">
                <div className="progress" role="img" aria-label={`${data.subject} başarısı ${formatPercent(data.percent)}`}>
                  <span style={{ width: `${data.percent}%` }} />
                </div><span className="bar-text">{formatPercent(data.percent)}</span>
              </div> },
          ]} />
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
                    {q.archiveProvisional && <span className="badge badge-warn">Tahmini soru</span>}
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
                    {q.status !== 'BLANK' && <p><AnswerFeedback correct={q.status === 'CORRECT'} questionId={q.questionId} /></p>}
                    <Link to={`/soru/${encodeURIComponent(q.code)}`} className="btn btn-secondary">
                      Soru sayfasını aç
                    </Link>
                    {q.hasExplanation && <ExamExplanation examId={r.id} questionId={q.questionId} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="quick">
        <Link to="/calisma/yeni?mode=sinav" className="btn btn-primary">
          Yeni sınav
        </Link>
        <Link to="/gecmis" className="btn btn-secondary">
          Geçmişe dön
        </Link>
      </div>
    </>
  );
}

function ExamExplanation({ examId, questionId }) {
  const [content, setContent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.get(`/api/exams/${examId}/questions/${questionId}/explanation`);
      if (result) setContent(result);
      else setError('Bu soru için onaylı açıklama artık mevcut değil.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="hint-card">
    {!content && <button type="button" className="btn btn-secondary" disabled={busy} onClick={load}>
      {busy ? 'Açıklama yükleniyor…' : 'Kısa açıklamayı göster'}
    </button>}
    {content && <><p><strong>Kısa açıklama:</strong> {content.text}</p>
      <a href={content.sourcePdfUrl} target="_blank" rel="noopener noreferrer">Kaynak notun sayfasını aç</a></>}
    {error && <p role="alert" className="text-danger">{error}</p>}
  </div>;
}
