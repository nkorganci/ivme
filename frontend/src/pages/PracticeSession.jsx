import { Link, useParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { ErrorBox, Loading } from '../components/States.jsx';
import { formatDate } from '../format.js';

const STATUS = { NOT_STARTED: 'Henüz başlanmadı', IN_PROGRESS: 'Çalışılıyor', COMPLETED: 'Tamamlandı' };
const MODE = { MIXED: 'Karışık', NEW: 'Yalnız yeni', REPEAT: 'Önceki sorular', WRONG: 'Yanlış yaptıklarım' };

export default function PracticeSession() {
  const { id } = useParams();
  usePageTitle('Pratik Oturumu');
  const { data, loading, error, retry } = useAsync(() => api.get(`/api/study-sessions/${id}`), [id]);
  if (loading) return <Loading text="Pratik oturumu yükleniyor…" />;
  if (error) return <ErrorBox error={error} onRetry={error.status === 404 ? undefined : retry} />;
  return (
    <>
      <div className="page-head">
        <div><h1>Pratik oturumun</h1><p className="muted">{data.questionCount} soru · {MODE[data.selectionMode] || 'Karışık'} · Süresiz · {formatDate(data.startedAt)}</p></div>
        <Link className="btn btn-secondary" to="/pratik/yeni">Yeni pratik</Link>
      </div>
      <p className="muted">Soru sırası kaydedildi. Bir sorudan sonra bu listeye dönüp sıradakini açabilirsin.</p>
      {(data.subject || data.topic || data.examType) && <p className="muted">Seçim: {[data.examType, data.subject, data.topic].filter(Boolean).join(' · ')}</p>}
      <ol className="card practice-list">
        {data.questions.map((q) => <li key={q.questionId}>
          <Link to={`/soru/${encodeURIComponent(q.code)}${qs({ sessionId: data.id, bank: q.bank })}`}>
            <strong>{q.position}. soru</strong><span>{q.code} · {q.subject}{q.topic ? ` · ${q.topic}` : ''}</span>
            <span className={`practice-status practice-status-${q.status.toLowerCase()}`}>{STATUS[q.status]}</span>
          </Link>
        </li>)}
      </ol>
    </>
  );
}
