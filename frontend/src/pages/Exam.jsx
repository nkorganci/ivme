import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api.js';
import { ignoreHotkey, useAsync, useCountdown, usePageTitle } from '../hooks.js';
import ChoiceButtons from '../components/ChoiceButtons.jsx';
import ExamNavigator from '../components/ExamNavigator.jsx';
import Modal from '../components/Modal.jsx';
import QuestionImage from '../components/QuestionImage.jsx';
import Strip from '../components/Strip.jsx';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';
import { formatClock } from '../format.js';

export default function Exam() {
  const { id } = useParams();
  const navigate = useNavigate();
  usePageTitle('Sınav');
  const { data: exam, loading, error, retry } = useAsync(() => api.get(`/api/exams/${id}`), [id]);
  const submitted = exam?.status === 'SUBMITTED';

  // Gönderilmiş sınav çözülemez; sonuca yönlendir.
  useEffect(() => {
    if (submitted) navigate(`/sinav/${id}/sonuc`, { replace: true });
  }, [submitted, id, navigate]);

  if (loading || submitted) {
    return (
      <div className="container">
        <Loading text="Sınav yükleniyor…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container">
        <ErrorBox error={error} onRetry={error.status === 404 ? undefined : retry} />
        <Link to="/">← Ana sayfaya dön</Link>
      </div>
    );
  }
  return exam ? <ExamRunner key={exam.id} exam={exam} /> : null;
}

function ExamRunner({ exam }) {
  const navigate = useNavigate();
  const questions = useMemo(() => [...exam.questions].sort((a, b) => a.position - b.position), [exam]);
  const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((q) => [q.questionId, q.selectedAnswer || null])));
  const [flags, setFlags] = useState(() => new Set());
  const [unsaved, setUnsaved] = useState(() => new Set()); // sunucuya yazılamayan sorular
  const [index, setIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const remaining = useCountdown(exam.remainingSeconds);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const leaving = useRef(false); // true ise sayfa kapatma uyarısı verilmez
  const sending = useRef(false);

  const q = questions[index];
  const qid = q?.questionId;
  const answeredCount = questions.filter((x) => answers[x.questionId]).length;
  const blankCount = questions.length - answeredCount;

  const toResult = useCallback(() => {
    leaving.current = true;
    navigate(`/sinav/${exam.id}/sonuc`, { replace: true });
  }, [exam.id, navigate]);

  const submit = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    setSubmitting(true);
    setSubmitError('');
    setConfirming(false);
    const payload = {};
    Object.entries(answersRef.current).forEach(([k, v]) => v && (payload[k] = v));
    try {
      await api.post(`/api/exams/${exam.id}/submit`, { answers: payload });
      toResult();
    } catch (e) {
      sending.current = false;
      setSubmitting(false);
      setSubmitError(e.message);
    }
  }, [exam.id, toResult]);

  // Süre bitince otomatik gönder.
  useEffect(() => {
    if (remaining === 0) submit();
  }, [remaining, submit]);

  // Sayfa kapatılırken uyar.
  useEffect(() => {
    const warn = (e) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Sıradaki sorunun görselini önceden yükle.
  useEffect(() => {
    const next = questions[index + 1];
    if (next) new Image().src = imageUrl(next.questionId);
  }, [index, questions]);

  const choose = useCallback(
    async (letter) => {
      setAnswers((a) => ({ ...a, [qid]: letter }));
      try {
        await api.put(`/api/exams/${exam.id}/answers`, { questionId: qid, answer: letter });
        setUnsaved((s) => {
          const next = new Set(s);
          next.delete(qid);
          return next;
        });
      } catch (e) {
        if (e.status === 409) toResult();
        else setUnsaved((s) => new Set(s).add(qid));
      }
    },
    [exam.id, qid, toResult],
  );

  const toggleFlag = () =>
    setFlags((s) => {
      const next = new Set(s);
      if (!next.delete(qid)) next.add(qid);
      return next;
    });

  const go = (i) => {
    setIndex(Math.min(questions.length - 1, Math.max(0, i)));
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  };

  // Kısayollar: ← önceki, → sonraki (A–E / 1–5 şık seçimi ChoiceButtons'ta).
  useEffect(() => {
    const onKey = (e) => {
      if (ignoreHotkey(e)) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'ArrowRight') go(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!q) return <ErrorBox error={{ message: 'Bu sınavda soru bulunamadı.' }} />;
  const danger = remaining != null && remaining < 300;
  const flagged = flags.has(qid);

  return (
    <div className="exam-page">
      <header className="exam-bar">
        <div className="exam-bar-inner">
          <Link to="/" className="exam-exit" title="Sınav devam eder; Ana Sayfa'dan geri dönebilirsin">
            ← <span>Ana Sayfa</span>
          </Link>
          <h1 className="exam-title">{exam.title}</h1>
          <div className={`timer${danger ? ' danger' : ''}`} role="timer" aria-label="Kalan süre">
            <span aria-hidden="true">{danger ? '⚠' : '⏱'}</span> {remaining == null ? 'Süresiz' : formatClock(remaining)}
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirming(true)} disabled={submitting}>
            Sınavı Bitir
          </button>
        </div>
      </header>

      <div className="container wide qpage">
        <div className="qstrip">
          <strong>
            Soru {index + 1} / {questions.length}
          </strong>
          <span className="badge badge-muted">{q.subject}</span>
          {flagged && <span className="badge badge-warn">⚑ İşaretli</span>}
        </div>

        <div className="exam-layout">
          <section className="card image-card">
            <QuestionImage id={qid} alt={`Soru ${index + 1}`} />
          </section>
          <ExamNavigator questions={questions} answers={answers} flags={flags} current={index} onGo={go} open={navOpen} />
        </div>

        <div className="qdock">
          {submitError ? (
            <Strip tone="bad">✗ {submitError}</Strip>
          ) : (
            unsaved.size > 0 && <Strip tone="warn">⚠ Bazı cevaplar sunucuya kaydedilemedi; sınavı bitirirken birlikte gönderilecek.</Strip>
          )}
          <div className="qbar">
            <button type="button" className="btn btn-secondary" disabled={index === 0} onClick={() => go(index - 1)} title="Önceki soru (←)">
              ‹ Önceki
            </button>
            <ChoiceButtons count={q.choiceCount} value={answers[qid]} onSelect={choose} />
            <button type="button" className="btn btn-secondary" disabled={!answers[qid]} onClick={() => choose(null)}>
              Temizle
            </button>
            <button type="button" className="btn btn-secondary" aria-pressed={flagged} aria-label={flagged ? 'İşareti kaldır' : 'İşaretle'} onClick={toggleFlag}>
              {flagged ? '⚑' : '⚐'} <span className="hide-sm">{flagged ? 'İşareti kaldır' : 'İşaretle'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary only-sm"
              aria-expanded={navOpen}
              aria-controls="soru-gezgini"
              onClick={() => setNavOpen((o) => !o)}
            >
              ▦ {answeredCount}/{questions.length}
            </button>
            <button type="button" className="btn btn-secondary" disabled={index === questions.length - 1} onClick={() => go(index + 1)} title="Sonraki soru (→)">
              Sonraki ›
            </button>
          </div>
        </div>
      </div>

      {confirming && (
        <Modal
          title="Sınavı bitir"
          onClose={() => setConfirming(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
                Sınava dön
              </button>
              <button type="button" className="btn btn-primary" onClick={submit}>
                Evet, bitir
              </button>
            </div>
          }
        >
          <p>{blankCount > 0 ? `${blankCount} soru boş. Yine de bitirmek istiyor musun?` : 'Tüm soruları cevapladın. Sınavı bitirmek istiyor musun?'}</p>
          {flags.size > 0 && <p className="muted">{flags.size} soruyu işaretlemiştin.</p>}
        </Modal>
      )}

      {(submitting || remaining === 0) && (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Sınav gönderiliyor">
          <div className="card overlay-card">
            {submitError ? (
              <>
                <Alert type="error">{submitError}</Alert>
                <button type="button" className="btn btn-primary" onClick={submit}>
                  Tekrar dene
                </button>
              </>
            ) : (
              <Loading text={remaining === 0 ? 'Süre doldu, sınavın gönderiliyor…' : 'Sınavın gönderiliyor…'} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
