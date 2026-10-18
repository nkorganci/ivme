import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';
import PracticeTimer from '../components/PracticeTimer.jsx';
import { formatDate } from '../format.js';
import { STATISTICS_LABEL } from '../config.js';

const STATUS = { NOT_STARTED: 'Henüz başlanmadı', IN_PROGRESS: 'Çalışılıyor', COMPLETED: 'Tamamlandı' };
const MODE = { MIXED: 'Karışık', NEW: 'Yalnız yeni', REPEAT: 'Önceki sorular', WRONG: 'Yanlış yaptıklarım' };
const ANSWER = { CORRECT: 'Doğru', WRONG: 'Yanlış', BLANK: 'Boş' };

export default function PracticeSession() {
  const { id } = useParams();
  const [busy, setBusy] = useState(false);
  const [finishError, setFinishError] = useState('');
  usePageTitle('Pratik Oturumu');
  const { data, loading, error, retry, reload } = useAsync(() => api.get(`/api/study-sessions/${id}`), [id]);
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    setFinishError('');
    try { await api.post(`/api/study-sessions/${id}/finish`); reload(); }
    catch (e) { setFinishError(e.message); }
    finally { setBusy(false); }
  };
  if (loading) return <Loading text="Pratik oturumu yükleniyor…" />;
  if (error) return <ErrorBox error={error} onRetry={error.status === 404 ? undefined : retry} />;
  return (
    <>
      <div className="page-head">
        <div><h1>{data.status === 'COMPLETED' ? 'Pratik sonucu' : 'Pratik oturumun'}</h1><p className="muted">{data.questionCount} soru · {MODE[data.selectionMode] || 'Karışık'} · {data.timeLimitSeconds ? `${data.timeLimitSeconds / 60} dakika` : 'Süresiz'} · {formatDate(data.startedAt)}</p></div>
        <Link className="btn btn-secondary" to="/calisma/yeni">Yeni pratik</Link>
      </div>
      {data.status === 'IN_PROGRESS' && <p className="muted">Soru sırası kaydedildi. Bir soruyu çözdükten sonra Sonraki düğmesiyle devam edebilirsin.</p>}
      <p><Link to="/calisma/yarim-kalan">Yarım kalan tüm pratik ve denemeleri göster</Link></p>
      {data.status === 'ABANDONED' && <Alert>Bu pratik iptal edildi. Cevapları istatistiklere katılmaz.</Alert>}
      <PracticeTimer session={data} onExpire={retry} />
      {data.status === 'IN_PROGRESS' && <div className="practice-finish">
        <p className="muted">Bitirince yanıtlar sabitlenir; yanıtlanmayan sorular boş sayılır.</p>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={finish}>{busy ? 'Bitiriliyor…' : 'Pratiği bitir'}</button>
      </div>}
      {finishError && <Alert type="error">{finishError}</Alert>}
      {data.result && <section className="card practice-result" aria-label="Pratik sonucu">
        <h2>Son tur sonucu</h2>
        <p><strong>{data.result.correct} doğru · {data.result.wrong} yanlış · {data.result.blank} boş</strong></p>
        <p className="muted">İlk tur sonucu: {data.result.firstCorrect} doğru · {data.result.firstWrong} yanlış · {data.result.firstBlank} boş</p>
        <Link to="/gecmis?tab=practice" className="btn btn-secondary">{STATISTICS_LABEL}</Link>
      </section>}
      {(data.subject || data.topic || data.examType) && <p className="muted">Seçim: {[data.examType, data.subject, data.topic].filter(Boolean).join(' · ')}</p>}
      <ol className="card practice-list">
        {data.questions.map((q) => <li key={q.questionId}>
          {data.status !== 'IN_PROGRESS' ? <div className="practice-row">
            <strong>{q.position}. soru</strong><span>{q.code} · {q.subject}{q.topic ? ` · ${q.topic}` : ''}</span>
            <span className="practice-status">{data.status === 'COMPLETED' ? `İlk: ${ANSWER[q.firstResult]} · Son: ${ANSWER[q.lastResult]}` : 'İptal edildi'}</span>
          </div> : <Link to={`/soru/${encodeURIComponent(q.code)}${qs({ sessionId: data.id, bank: q.bank })}`}>
            <strong>{q.position}. soru</strong><span>{q.code} · {q.subject}{q.topic ? ` · ${q.topic}` : ''}</span>
            <span className={`practice-status practice-status-${q.status.toLowerCase()}`}>{STATUS[q.status]}</span>
          </Link>}
        </li>)}
      </ol>
    </>
  );
}
