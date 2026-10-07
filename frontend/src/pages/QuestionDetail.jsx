import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { ignoreHotkey, useAsync, usePageTitle } from '../hooks.js';
import ChoiceButtons from '../components/ChoiceButtons.jsx';
import QuestionImage from '../components/QuestionImage.jsx';
import QuestionSide from '../components/QuestionSide.jsx';
import Strip from '../components/Strip.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';

const FILTER_KEYS = ['examType', 'subject', 'topic'];

export default function QuestionDetail() {
  const { code } = useParams();
  const [search] = useSearchParams();
  const { data: q, loading, error, retry, reload } = useAsync(() => api.get(`/api/questions/code/${encodeURIComponent(code)}`), [code]);
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, search.get(k) || '']));
  usePageTitle(q ? `Soru ${q.code}` : 'Soru');

  if (loading) return <Loading text="Soru yükleniyor…" />;
  if (error) {
    return (
      <>
        <ErrorBox error={error} onRetry={error.status === 404 ? undefined : retry} />
        <Link to={`/sorular${qs(filters)}`}>← Soru bankasına dön</Link>
      </>
    );
  }
  // key: başka soruya geçince tüm yerel durum (seçim, sonuç) sıfırlanır.
  return q ? <QuestionView key={q.id} q={q} filters={filters} reload={reload} /> : null;
}

function QuestionView({ q, filters, reload }) {
  const navigate = useNavigate();
  const filterQuery = qs(filters);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [moving, setMoving] = useState(false);

  const check = async () => {
    if (!selected || result || checking) return;
    setChecking(true);
    setError('');
    try {
      setResult(await api.post(`/api/questions/${q.id}/check`, { answer: selected }));
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setResult(null);
    setSelected(null);
  };

  const go = async (direction) => {
    if (moving) return;
    setMoving(true);
    setInfo('');
    setError('');
    try {
      const next = await api.get(`/api/questions/${q.id}/neighbor` + qs({ direction, ...filters }));
      if (!next) setInfo('Bu filtrede başka soru yok.');
      else navigate(`/soru/${encodeURIComponent(next.code)}${filterQuery}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  };

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

  const videoUrl = result?.solutionUrl && /^https?:\/\//i.test(result.solutionUrl) ? result.solutionUrl : null;

  return (
    <div className="qpage">
      <h1 className="sr-only">Soru {q.code}</h1>
      <div className="qstrip">
        <Link to={`/sorular${filterQuery}`}>← Soru bankası</Link>
        <strong className="code">{q.code}</strong>
        <span className="badge badge-primary">{q.examType}</span>
        <span className="badge badge-muted">{q.subject}</span>
        {q.topic && <span className="muted">{q.topic}</span>}
      </div>

      <div className="qlayout">
        <section className="card image-card">
          <QuestionImage id={q.id} alt={`${q.code} kodlu soru`} />
        </section>
        <QuestionSide q={q} onRated={reload} />
      </div>

      <div className="qdock">
        {result ? (
          <Strip tone={result.correct ? 'ok' : 'bad'}>
            <span>{result.correct ? '✓ Doğru!' : `✗ Yanlış. Doğru cevap: ${result.correctAnswer}`}</span>
            {videoUrl && (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                ▶ Video<span className="hide-sm"> çözümü</span>
              </a>
            )}
            <button type="button" className="btn btn-secondary push" onClick={reset}>
              Tekrar dene
            </button>
          </Strip>
        ) : error ? (
          <Strip tone="bad">✗ {error}</Strip>
        ) : info ? (
          <Strip tone="info">{info}</Strip>
        ) : null}
        <div className="qbar">
          <button type="button" className="btn btn-secondary" disabled={moving} onClick={() => go('prev')} title="Önceki soru (←)">
            ‹ Önceki
          </button>
          <ChoiceButtons count={q.choiceCount} value={selected} onSelect={setSelected} disabled={!!result} correct={result?.correctAnswer} />
          <button type="button" className="btn btn-primary" disabled={!selected || !!result || checking} onClick={check} title="Cevabı kontrol et (Enter)">
            {checking ? 'Kontrol ediliyor…' : 'Cevabı Kontrol Et'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={moving} onClick={() => go('next')} title="Sonraki soru (→)">
            Sonraki ›
          </button>
        </div>
      </div>
    </div>
  );
}
