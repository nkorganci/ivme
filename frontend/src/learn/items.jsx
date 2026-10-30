import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QuestionImage from '../components/QuestionImage.jsx';
import ChoiceButtons from '../components/ChoiceButtons.jsx';
import { MathText, Markdown } from './math.jsx';
import { ConfidencePicker } from './ui.jsx';
import { makeEvent } from './api.js';

const elapsed = (start) => Math.max(0, Math.round(performance.now() - start));

/**
 * Ders sorusu (lesson_q). Akış: şık → güven → seçilen şıkkın geri bildirimi + açıklama.
 * silent: ön testte cevap gösterilmez ("Dersin sonunda bu sorulara döneceğiz").
 */
export function LessonQuestion({ question, onAnswered, silent = false, initial = null, compact = false }) {
  const [chosen, setChosen] = useState(initial?.chosen ?? null);
  const [result, setResult] = useState(initial);
  const [hintOpen, setHintOpen] = useState(false);
  const started = useRef(performance.now());
  useEffect(() => {
    setChosen(initial?.chosen ?? null);
    setResult(initial);
    setHintOpen(false);
    started.current = performance.now();
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (confidence) => {
    const correct = chosen === question.answer;
    const value = { chosen, correct, confidence, timeMs: elapsed(started.current), hintUsed: hintOpen };
    setResult(value);
    onAnswered?.(value);
  };
  const choiceOf = (key) => question.choices.find((c) => c.key === key);
  const answered = !!result;
  return <div className={`lr-question${compact ? ' compact' : ''}`}>
    <div className="lr-stem"><Markdown text={question.stem} /></div>
    <div className="lr-choices" role="radiogroup" aria-label="Şıklar">
      {question.choices.map((choice) => {
        let state = choice.key === chosen ? 'selected' : '';
        if (answered && !silent) {
          if (choice.key === question.answer) state = 'correct';
          else if (choice.key === chosen) state = 'wrong';
          else state = '';
        }
        return <button key={choice.key} type="button" role="radio" aria-checked={choice.key === chosen} disabled={answered}
          className={`lr-choice ${state}`} onClick={() => setChosen(choice.key)}>
          <span className="lr-choice-key">{choice.key}</span><MathText text={choice.text} />
        </button>;
      })}
    </div>
    {!answered && question.hint && <div className="lr-hint">
      {hintOpen ? <p className="lr-hint-text"><strong>İpucu:</strong> <MathText text={question.hint} /></p>
        : <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHintOpen(true)}>İpucu</button>}
    </div>}
    {!answered && chosen && <ConfidencePicker onPick={submit} />}
    {answered && silent && <p className="lr-feedback neutral" role="status">Kaydedildi. Dersin sonunda bu soruya döneceğiz ve cevabını o zaman göreceksin.</p>}
    {answered && !silent && <div className={`lr-feedback ${result.correct ? 'good' : 'bad'}`} role="status">
      <p className="lr-feedback-title">{result.correct ? 'Doğru!' : `Doğru cevap ${question.answer}.`}{result.correct && result.confidence === 1 ? ' Tahmin ettin ama doğru — 3 gün sonra bir kez daha karşına çıkacak.' : ''}</p>
      {choiceOf(result.chosen)?.feedback && <p><MathText text={choiceOf(result.chosen).feedback} /></p>}
      {!result.correct && choiceOf(question.answer)?.feedback && <p className="small"><strong>{question.answer}:</strong> <MathText text={choiceOf(question.answer).feedback} /></p>}
      {question.explain && <div className="lr-explain"><Markdown text={question.explain} /></div>}
      {!result.correct && result.confidence === 3 && <p className="small lr-hyper">“Eminim” dediğin bir yanlış en değerli fırsattır: bu düşünceyi şimdi düzeltirsen kalıcı olur.</p>}
    </div>}
  </div>;
}

/**
 * Banka sorusu: özgün görsel, A–E, güven; puanlama sunucuda yapılır (cevap anahtarı önceden gelmez).
 * Yanlışta çözüm görseli (varsa) açılabilir.
 */
export function BankQuestion({ question, conceptId, context, setId, archetypeId, answerBank, onAnswered, before = null, approach = null }) {
  const [chosen, setChosen] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState(false);
  const started = useRef(performance.now());
  useEffect(() => {
    setChosen(null); setResult(null); setError(''); setSolution(false);
    started.current = performance.now();
  }, [question.code]);

  const submit = async (confidence) => {
    setBusy(true);
    setError('');
    const event = makeEvent('attempt', {
      itemType: 'bank', itemId: question.code, questionId: question.id, conceptId: question.conceptId ?? conceptId,
      archetypeId: archetypeId ?? question.archetype ?? null, difficulty: question.difficulty, context, chosen, confidence,
      timeMs: elapsed(started.current), hintUsed: false, exam: question.exam, ...(setId ? { setId } : {}),
    });
    try {
      const response = await answerBank(event);
      const value = { chosen, confidence, correct: response.correct, correctAnswer: response.correctAnswer, hasSolution: response.hasSolution, event: response.event };
      setResult(value);
      onAnswered?.(value);
    } catch (problem) {
      setError(problem.status === 0 ? 'Bağlantı yok: banka soruları sunucuda puanlanır. Bağlantı gelince tekrar dene.' : problem.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="lr-bank">
    {before}
    <div className="lr-bank-meta small muted">
      <span>{question.cikmis ? `${question.year ?? ''} ${question.exam} çıkmış soru`.trim() : `${question.exam} · ${question.source || 'OGM'}`}</span>
      <Link to={`/soru/${encodeURIComponent(question.code)}`} target="_blank" rel="noreferrer">Soru sayfasında aç ↗</Link>
    </div>
    <div className="lr-bank-image"><QuestionImage id={question.id} alt={`Soru ${question.code}`} /></div>
    <ChoiceButtons count={question.choices} value={chosen} onSelect={(letter) => !result && setChosen(letter)} disabled={!!result || busy}
      correct={result?.correctAnswer ?? null} wrong={result && !result.correct ? result.chosen : null} />
    {!result && chosen && <ConfidencePicker onPick={submit} disabled={busy} />}
    {error && <p className="field-error" role="alert">{error}</p>}
    {result && <div className={`lr-feedback ${result.correct ? 'good' : 'bad'}`} role="status">
      <p className="lr-feedback-title">{result.correct ? 'Doğru!' : `Yanlış — doğru cevap ${result.correctAnswer}.`}</p>
      {!result.correct && context !== 'placement' && <p className="small">Bu soru yarın yeniden sorulacak; aynı tipten görmediğin bir kardeş soru da gelecek (yöntemi ölçmek için).</p>}
      {result.correct && result.confidence === 1 && context !== 'placement' && <p className="small">Tahminle doğru: 3 gün sonra bir kez daha kontrol edeceğiz.</p>}
      {result.hasSolution && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSolution((v) => !v)}>{solution ? 'Çözümü gizle' : 'Çözümü gör'}</button>}
      {solution && <div className="lr-bank-image"><QuestionImage id={question.id} solution alt={`Soru ${question.code} çözümü`} /></div>}
    </div>}
    {result && approach && <aside className="lr-approach">
      <span className="lr-check-label">Çözüm yaklaşımı{approach.title ? `: ${approach.title}` : ''}</span>
      {approach.cue && <p className="small"><strong>Bunu görünce:</strong> <MathText text={approach.cue} /></p>}
      <p><MathText text={approach.strategy} /></p>
    </aside>}
  </div>;
}

/** Kart: ön yüz → çevir → "Bilemedim / Emin değildim / Bildim" (FSRS puanı cevaptan türetilir). */
export function FlashcardItem({ card, onAnswered }) {
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(null);
  const started = useRef(performance.now());
  useEffect(() => { setFlipped(false); setDone(null); started.current = performance.now(); }, [card.id]);
  const rate = (correct, confidence) => {
    const value = { correct, confidence, timeMs: elapsed(started.current) };
    setDone(value);
    onAnswered?.(value);
  };
  return <div className="lr-flashcard">
    <button type="button" className={`lr-card-face${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(true)} aria-label={flipped ? 'Kartın arka yüzü' : 'Kartı çevir'}>
      <span className="lr-card-side small muted">{flipped ? 'Arka yüz' : 'Ön yüz — cevabı düşün, sonra çevir'}</span>
      <span className="lr-card-text"><MathText text={flipped ? card.back : card.front} /></span>
    </button>
    {!flipped && <button type="button" className="btn btn-primary" onClick={() => setFlipped(true)}>Çevir</button>}
    {flipped && !done && <div className="lr-card-rate" role="group" aria-label="Ne kadar bildin?">
      <button type="button" className="btn btn-secondary lr-rate-again" onClick={() => rate(false, 3)}>Bilemedim</button>
      <button type="button" className="btn btn-secondary lr-rate-hard" onClick={() => rate(true, 2)}>Emin değildim</button>
      <button type="button" className="btn btn-primary" onClick={() => rate(true, 3)}>Bildim</button>
    </div>}
    {done && <p className="small muted" role="status">{done.correct ? 'Kart bir sonraki tekrar için planlandı.' : 'Bu kart yakında yeniden gelecek.'}</p>}
  </div>;
}
