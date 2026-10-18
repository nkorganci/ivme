import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { ignoreHotkey, useAsync, usePageTitle } from '../hooks.js';
import ChoiceButtons from '../components/ChoiceButtons.jsx';
import QuestionImage from '../components/QuestionImage.jsx';
import QuestionSide from '../components/QuestionSide.jsx';
import Strip from '../components/Strip.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';
import { bankLabel, bankPath } from '../format.js';
import { usePractice } from '../usePractice.js';
import PracticeTimer from '../components/PracticeTimer.jsx';
import AnswerFeedback from '../components/AnswerFeedback.jsx';
import ResourceContext from '../components/ResourceContext.jsx';
import Modal from '../components/Modal.jsx';

const FILTER_KEYS = ['bank', 'examType', 'subject', 'topic', 'page'];

export default function QuestionDetail() {
  const { code } = useParams();
  const [search] = useSearchParams();
  const { data: q, loading, error, retry, reload } = useAsync(() => api.get(`/api/questions/code/${encodeURIComponent(code)}`), [code]);
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, search.get(k) || '']));
  filters.questionTypeId=search.get('questionTypeId') || '';filters.teacherDifficulty=search.get('teacherDifficulty') || '';filters.categoryId=search.getAll('categoryId');filters.categoryMatch=search.get('categoryMatch') || 'ANY';
  filters.includeCandidates=search.get('includeCandidates')!=='false';
  const sessionId = search.get('sessionId');
  const { data: session, loading: sessionLoading, error: sessionError } = useAsync(
    () => sessionId ? api.get(`/api/study-sessions/${encodeURIComponent(sessionId)}`) : Promise.resolve(null), [sessionId]);
  usePageTitle(q ? `Soru ${q.code}` : 'Soru');

  // Adreste ?bank= yoksa (QR / doğrudan bağlantı) sol menüde sorunun koleksiyonu vurgulansın.
  const { setQuestionBank } = useOutletContext();
  useEffect(() => {
    if (q) setQuestionBank(q.bank);
  }, [q, setQuestionBank]);
  useEffect(() => () => setQuestionBank(''), [setQuestionBank]);

  if (loading) return <Loading text="Soru yükleniyor…" />;
  if (sessionId && sessionLoading) return <Loading text="Pratik oturumu yükleniyor…" />;
  if (sessionId && sessionError) return <ErrorBox error={sessionError} />;
  if (error) {
    return (
      <>
        <ErrorBox error={error} onRetry={error.status === 404 ? undefined : retry} />
        <Link to={bankPath(filters.bank) + qs({ ...filters, bank: '' })}>← {bankLabel(filters.bank || 'CIKMIS')}</Link>
      </>
    );
  }
  if (sessionId && q && !session?.questions?.some((item) => item.questionId === q.id)) {
    return <ErrorBox error={{ message: 'Bu soru pratik oturumunda yok.' }} />;
  }
  if (session?.status === 'COMPLETED') return <section className="card form-card">
    <h1>Pratik tamamlandı</h1><p>Yanıtlar sabitlendi. Sonucu oturum ekranında görebilirsin.</p>
    <Link className="btn btn-primary" to={`/pratik/${session.id}`}>Sonuca dön</Link>
  </section>;
  if (session?.status === 'ABANDONED') return <section className="card form-card">
    <h1>Pratik iptal edildi</h1><p>Bu çalışmanın cevapları istatistiklere katılmaz.</p>
    <Link className="btn btn-primary" to="/calisma/yarim-kalan">Yarım kalan çalışmalara dön</Link>
  </section>;
  // key: başka soruya geçince tüm yerel durum (seçim, sonuç, çözüm) sıfırlanır.
  return q ? <QuestionView key={`${q.id}:${sessionId || ''}`} q={q} filters={filters} session={session} reload={reload} /> : null;
}

function QuestionView({ q, filters, session, reload }) {
  const navigate = useNavigate();
  const sessionId = session?.id;
  const sessionPosition = session?.questions.findIndex((item) => item.questionId === q.id) ?? -1;
  // Koleksiyon adres çubuğunda yoksa (örn. QR ile gelindiyse) sorunun kendi koleksiyonu kullanılır.
  const scope = { ...filters, bank: filters.bank || q.bank };
  const backQuery = qs({ ...scope, bank: '' });
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [moving, setMoving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [solution, setSolution] = useState(false);
  const [hint, setHint] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [hintError, setHintError] = useState('');
  const answering = useRef(false);
  const practice = usePractice(q.id, sessionId);
  const state = practice.state;
  useEffect(() => {
    if (state?.attempts?.length) setReady(false);
  }, [state?.round, state?.attempts?.length]);
  const lastAnswer = state?.attempts?.findLast((a) => a.eventType === 'ANSWER');
  const canChoose = !!state && !practice.loading && !practice.busy && ready
    && (state.canAnswer || state.roundComplete);

  const choose = async (answer) => {
    if (!answer || !canChoose || answering.current) return;
    answering.current = true;
    setSelected(answer);
    setError('');
    try {
      const next = await practice.submit('ANSWER', answer);
      if (next) {
        setSelected(null);
        setReady(false);
        setSolution(false);
      }
    } finally { answering.current = false; }
  };

  const retry = () => {
    setSelected(null);
    setReady(true);
    setSolution(false);
    setHint(null);
    setExplanation(null);
    practice.selectionChanged();
  };

  const reveal = async () => {
    const next = await practice.submit('REVEAL');
    if (next) { setSelected(null); setReady(false); }
  };

  const skip = async () => {
    const next = await practice.submit('SKIP');
    if (next) { setSelected(null); setReady(false); }
  };

  const loadHelp = async (kind) => {
    if (hintBusy) return;
    setHintBusy(true);
    setHintError('');
    try {
      const result = await api.get(`/api/questions/${q.id}/${kind}`);
      if (kind === 'hint') setHint(result);
      else setExplanation(result);
      if (!result) setHintError('Bu soru için onaylı içerik henüz yok.');
    } catch (e) { setHintError(e.message); }
    finally { setHintBusy(false); }
  };

  const go = async (direction) => {
    if (practice.busy || answering.current) return;
    if (sessionId) {
      const next = session.questions[sessionPosition + (direction === 'next' ? 1 : -1)];
      if (!next) setInfo(direction === 'next' ? 'Oturumun son sorusundasın.' : 'Oturumun ilk sorusundasın.');
      else navigate(`/soru/${encodeURIComponent(next.code)}${qs({ sessionId, bank: next.bank })}`);
      return;
    }
    if (moving) return;
    setMoving(true);
    setInfo('');
    setError('');
    try {
      const next = await api.get(`/api/questions/${q.id}/neighbor` + qs({ direction, ...scope }));
      if (!next) setInfo('Bu filtrede başka soru yok.');
      else navigate(`/soru/${encodeURIComponent(next.code)}${qs(scope)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  };
  const finishSession = async () => {
    if (!sessionId || finishing) return;
    setFinishing(true);
    setError('');
    try {
      await api.post(`/api/study-sessions/${sessionId}/finish`);
      navigate(`/pratik/${sessionId}`);
    } catch (e) {
      setError(e.message);
      setFinishing(false);
    }
  };

  // Şık seçimi cevabı kaydeder; ok tuşları sorular arasında gezinir.
  useEffect(() => {
    const onKey = (e) => {
      if (ignoreHotkey(e)) return;
      if (e.key === 'ArrowLeft') go('prev');
      else if (e.key === 'ArrowRight') go('next');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const videoUrl = !ready && state?.solutionUrl && /^https?:\/\//i.test(state.solutionUrl) ? state.solutionUrl : null;
  const status = ready && state?.roundComplete ? '' : state?.roundComplete
    ? state.correctAnswer
      ? lastAnswer?.correct ? '✓ Doğru!' : `Cevap gösterildi: ${state.correctAnswer}`
      : 'Soru atlandı.'
    : lastAnswer && !ready
      ? `✗ Yanlış. ${state.remainingAttempts ? 'Bir kez daha deneyebilirsin.' : 'Cevabı gösterebilir veya soruyu atlayabilirsin.'}`
      : '';

  return (
    <div className="qpage">
      <h1 className="sr-only">Soru {q.code}</h1>
      <div className="qlayout">
        <div className="qmain">
          <div className="qstrip">
            <Link to={sessionId ? `/pratik/${sessionId}` : bankPath(q.bank) + backQuery}>
              ← {sessionId ? 'Pratik soruları' : bankLabel(q.bank)}
            </Link>
            <strong className="code">{q.code}</strong>
            {sessionId && <strong>{sessionPosition + 1} / {session.questions.length}</strong>}
            <span className="badge badge-primary">{q.examType}</span>
            <span className="badge badge-muted">{q.subject}</span>
            {q.topic && <span className="muted qtopic" title={q.topic}>{q.topic}</span>}
            <ResourceContext compact itemKey={`question:${q.code}`} />
            {session?.deadlineAt && <PracticeTimer compact session={session} onExpire={() => navigate(`/pratik/${session.id}`)} />}
          </div>

          <section className="card image-card">
            <QuestionImage id={q.id} alt={`${q.code} kodlu soru`} />
          </section>
          <div className="qdock">
            {practice.loading ? <Strip tone="info">Deneme geçmişi yükleniyor…</Strip> : null}
            {(practice.error || error) && <Strip tone="bad">✗ {practice.error || error}
              {!state && <button type="button" className="btn btn-secondary" onClick={practice.load}>Yeniden dene</button>}
            </Strip>}
            {status && (
              <Strip tone={lastAnswer?.correct ? 'ok' : state?.correctAnswer ? 'info' : 'bad'}>
                <span>{status}</span>
                {!ready && lastAnswer && <AnswerFeedback correct={lastAnswer.correct} questionId={q.id} />}
                {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer">▶ Video<span className="hide-sm"> çözümü</span></a>}
                {q.hasSolutionImage && !!state?.correctAnswer && !solution && (
                  <button type="button" className="btn btn-secondary" onClick={() => setSolution(true)}>Çözümü göster</button>
                )}
                {!ready && (state?.roundComplete || state?.canAnswer) && (
                  <button type="button" className="btn btn-secondary push" onClick={retry}>
                    {state.roundComplete ? 'Yeniden çalış' : 'Tekrar dene'}
                  </button>
                )}
              </Strip>
            )}
            {info && !status && !error && !practice.error && <Strip tone="info">{info}</Strip>}
            <div className="qbar">
              <button type="button" className="btn btn-secondary" disabled={moving || practice.busy || (sessionId && sessionPosition === 0)} onClick={() => go('prev')} title="Önceki soru (←)">‹ Önceki</button>
              <ChoiceButtons count={q.choiceCount} value={selected || (!ready ? lastAnswer?.selectedAnswer : null)}
                onSelect={choose} disabled={!canChoose}
                correct={!ready ? state?.correctAnswer : null} wrong={!ready && !state?.correctAnswer && lastAnswer?.selectedAnswer} />
              {state?.canReveal && !practice.busy && <>
                <button type="button" className="btn btn-secondary" onClick={reveal}>Cevabı göster</button>
                <button type="button" className="btn btn-secondary" onClick={skip}>Soruyu atla</button>
              </>}
              {sessionId && sessionPosition === session.questions.length - 1
                ? <button type="button" className="btn btn-primary" disabled={finishing || practice.busy} onClick={finishSession} title="Pratiği bitir ve sonucu gör">
                  {finishing ? 'Bitiriliyor…' : 'Bitir'}
                </button>
                : <button type="button" className="btn btn-secondary" disabled={moving || practice.busy} onClick={() => go('next')} title="Sonraki soru (→)">Sonraki ›</button>}
            </div>
            {practice.busy && <p className="small answer-saving" role="status">Kaydediliyor…</p>}
          </div>
          {q.hasApprovedHint && <section className="card hint-card" aria-label="Kaynaklı öğrenme desteği">
            {!state?.correctAnswer && !hint && <button type="button" className="btn btn-secondary"
              disabled={hintBusy} onClick={() => loadHelp('hint')}>
              {hintBusy ? 'İpucu yükleniyor…' : 'İpucu iste'}
            </button>}
            {!state?.correctAnswer && hint && <p><strong>İpucu:</strong> {hint.text}</p>}
            {state?.correctAnswer && !explanation && <button type="button" className="btn btn-secondary"
              disabled={hintBusy} onClick={() => loadHelp('explanation')}>
              {hintBusy ? 'Açıklama yükleniyor…' : 'Kısa açıklamayı göster'}
            </button>}
            {state?.correctAnswer && explanation && <>
              <p><strong>Kısa açıklama:</strong> {explanation.text}</p>
              <a href={explanation.sourcePdfUrl} target="_blank" rel="noopener noreferrer">Kaynak notun sayfasını aç</a>
            </>}
            {hintError && <p role="alert" className="text-danger">{hintError}</p>}
          </section>}
          {solution && (
            <Modal title="Çözüm" wide onClose={() => setSolution(false)}>
              <QuestionImage id={q.id} solution alt={`${q.code} çözümü`} />
            </Modal>
          )}
        </div>
        <QuestionSide q={q} onRated={reload} canVote={!!state?.attempts?.some((a) => a.eventType !== 'SKIP')} />
      </div>

    </div>
  );
}
