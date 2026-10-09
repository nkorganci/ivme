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

const FILTER_KEYS = ['bank', 'examType', 'subject', 'topic'];

export default function QuestionDetail() {
  const { code } = useParams();
  const [search] = useSearchParams();
  const { data: q, loading, error, retry, reload } = useAsync(() => api.get(`/api/questions/code/${encodeURIComponent(code)}`), [code]);
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, search.get(k) || '']));
  const sessionId = search.get('sessionId');
  usePageTitle(q ? `Soru ${q.code}` : 'Soru');

  // Adreste ?bank= yoksa (QR / doğrudan bağlantı) sol menüde sorunun koleksiyonu vurgulansın.
  const { setQuestionBank } = useOutletContext();
  useEffect(() => {
    if (q) setQuestionBank(q.bank);
  }, [q, setQuestionBank]);
  useEffect(() => () => setQuestionBank(''), [setQuestionBank]);

  if (loading) return <Loading text="Soru yükleniyor…" />;
  if (error) {
    return (
      <>
        <ErrorBox error={error} onRetry={error.status === 404 ? undefined : retry} />
        <Link to={bankPath(filters.bank) + qs({ ...filters, bank: '' })}>← {bankLabel(filters.bank || 'CIKMIS')}</Link>
      </>
    );
  }
  // key: başka soruya geçince tüm yerel durum (seçim, sonuç, çözüm) sıfırlanır.
  return q ? <QuestionView key={q.id} q={q} filters={filters} sessionId={sessionId} reload={reload} /> : null;
}

function QuestionView({ q, filters, sessionId, reload }) {
  const navigate = useNavigate();
  // Koleksiyon adres çubuğunda yoksa (örn. QR ile gelindiyse) sorunun kendi koleksiyonu kullanılır.
  const scope = { ...filters, bank: filters.bank || q.bank };
  const backQuery = qs({ ...scope, bank: '' });
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [moving, setMoving] = useState(false);
  const [solution, setSolution] = useState(false);
  const solutionRef = useRef(null);
  const practice = usePractice(q.id);
  const state = practice.state;
  useEffect(() => {
    if (state?.attempts?.length) setReady(false);
  }, [state?.round, state?.attempts?.length]);
  const lastAnswer = state?.attempts?.findLast((a) => a.eventType === 'ANSWER');
  const canChoose = !!state && !practice.loading && !practice.busy && ready
    && (state.canAnswer || state.roundComplete);

  const check = async () => {
    if (!selected || !canChoose) return;
    setError('');
    const next = await practice.submit('ANSWER', selected);
    if (next) {
      setSelected(null);
      setReady(false);
      setSolution(false);
    }
  };

  const retry = () => {
    setSelected(null);
    setReady(true);
    setSolution(false);
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

  const go = async (direction) => {
    if (sessionId) return;
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

  // Çözüm kartı açılınca (ve görseli yüklenip kart büyüyünce) görünür alana kaydır.
  const showSolution = () => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  useEffect(() => {
    if (solution) showSolution();
  }, [solution]);

  // Kısayollar: Enter kontrol, ← önceki, → sonraki (A–E / 1–5 şık seçimi ChoiceButtons'ta).
  useEffect(() => {
    const onKey = (e) => {
      if (ignoreHotkey(e)) return;
      if (e.key === 'ArrowLeft') go('prev');
      else if (e.key === 'ArrowRight') go('next');
      else if (e.key === 'Enter' && !e.target.closest?.('a, summary, button:not(.choice)')) {
        e.preventDefault();
        check();
      }
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
      <div className="qstrip">
        <Link to={sessionId ? `/pratik/${sessionId}` : bankPath(q.bank) + backQuery}>
          ← {sessionId ? 'Pratik soruları' : bankLabel(q.bank)}
        </Link>
        <strong className="code">{q.code}</strong>
        <span className="badge badge-primary">{q.examType}</span>
        <span className="badge badge-muted">{q.subject}</span>
        {q.topic && <span className="muted">{q.topic}</span>}
      </div>

      <div className="qlayout">
        <div className="qmain">
          <section className="card image-card">
            <QuestionImage id={q.id} alt={`${q.code} kodlu soru`} />
          </section>
          {solution && (
            <section className="card image-card solution-card" ref={solutionRef} aria-label="Çözüm">
              <div className="solution-head">
                <strong>Çözüm</strong>
                <button type="button" className="icon-btn" aria-label="Çözümü kapat" title="Çözümü kapat" onClick={() => setSolution(false)}>
                  ×
                </button>
              </div>
              <QuestionImage id={q.id} solution alt={`${q.code} çözümü`} onReady={showSolution} />
            </section>
          )}
        </div>
        <QuestionSide q={q} onRated={reload} />
      </div>

      <div className="qdock">
        {practice.loading ? <Strip tone="info">Deneme geçmişi yükleniyor…</Strip> : null}
        {(practice.error || error) && <Strip tone="bad">✗ {practice.error || error}
          {!state && <button type="button" className="btn btn-secondary" onClick={practice.load}>Yeniden dene</button>}
        </Strip>}
        {status && (
          <Strip tone={lastAnswer?.correct ? 'ok' : state?.correctAnswer ? 'info' : 'bad'}>
            <span>{status}</span>
            {videoUrl && (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                ▶ Video<span className="hide-sm"> çözümü</span>
              </a>
            )}
            {q.hasSolutionImage && !!state?.correctAnswer && !solution && (
              <button type="button" className="btn btn-secondary" onClick={() => setSolution(true)}>
                Çözümü göster
              </button>
            )}
            {!ready && (state?.roundComplete || state?.canAnswer) && (
              <button type="button" className="btn btn-secondary push" onClick={retry}>
                {state.roundComplete ? 'Yeniden çalış' : 'Tekrar dene'}
              </button>
            )}
          </Strip>
        )}
        {info && !status && !error && !practice.error && (
          <Strip tone="info">{info}</Strip>
        )}
        {state?.canReveal && !practice.busy && <div className="practice-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={reveal}>Cevabı göster</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={skip}>Soruyu atla</button>
        </div>}
        <div className="qbar">
          {!sessionId && <button type="button" className="btn btn-secondary" disabled={moving} onClick={() => go('prev')} title="Önceki soru (←)">
            ‹ Önceki
          </button>}
          <ChoiceButtons count={q.choiceCount} value={selected || (!ready ? lastAnswer?.selectedAnswer : null)}
            onSelect={(answer) => { setSelected(answer); practice.selectionChanged(); }} disabled={!canChoose}
            correct={!ready ? state?.correctAnswer : null} wrong={!ready && !state?.correctAnswer && lastAnswer?.selectedAnswer} />
          <button type="button" className="btn btn-primary" disabled={!selected || !canChoose} onClick={check} title="Cevabı kontrol et (Enter)">
            {practice.busy ? 'Kaydediliyor…' : 'Cevabı Kontrol Et'}
          </button>
          {!sessionId && <button type="button" className="btn btn-secondary" disabled={moving} onClick={() => go('next')} title="Sonraki soru (→)">
            Sonraki ›
          </button>}
        </div>
      </div>
    </div>
  );
}
