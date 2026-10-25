import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ignoreHotkey, usePageTitle } from '../hooks.js';
import QuestionImage from '../components/QuestionImage.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';
import RichText from '../tutor/RichText.jsx';
import { AhaBlock, InsightBlock } from '../tutor/Insight.jsx';
import VisualPlayer from '../tutor/VisualPlayer.jsx';
import { DIFFICULTY, HINT_KIND, LEVEL, LEVEL_HELP, MASTERY, OUTCOME, ROUTE, STEP, formatDate, freeTextLabel,
  masteryPercent, subjectName } from '../tutor/tutorLabels.js';
import './Tutor.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function Choices({ count, wrong, correct, disabled, onSelect, label = 'Şıklar' }) {
  useEffect(() => {
    if (disabled) return undefined;
    const onKey = (e) => {
      if (ignoreHotkey(e)) return;
      const index = LETTERS.indexOf(e.key.toUpperCase());
      if (index >= 0 && index < count && !wrong.includes(LETTERS[index])) onSelect(LETTERS[index]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, wrong, disabled, onSelect]);
  return <div className="choices" role="group" aria-label={`${label} (kısayol: A–E)`}>
    {LETTERS.slice(0, count).map((letter) => {
      const state = letter === correct ? 'correct' : wrong.includes(letter) ? 'wrong' : '';
      return <button key={letter} type="button" className={`choice ${state}`} disabled={disabled || !!state}
        aria-label={`Şık ${letter}${state === 'correct' ? ', doğru' : state === 'wrong' ? ', yanlış denendi' : ''}`}
        onClick={() => onSelect(letter)}>{letter}
        {state && <span className="choice-mark" aria-hidden="true">{state === 'correct' ? '✓' : '✗'}</span>}</button>;
    })}
  </div>;
}

function Options({ options, onChoose, busy, result }) {
  return <div className="tutor-options">
    {options.map((option) => <button key={option.id} type="button" disabled={busy || !!result}
      className={`btn ${result?.optionId === option.id ? (result.correct ? 'btn-primary' : 'btn-secondary tutor-wrong') : 'btn-secondary'} tutor-option`}
      onClick={() => onChoose(option.id)}><RichText text={option.text} /></button>)}
  </div>;
}

function PatternCard({ card, title }) {
  return <>
    <h3>{title}: {card.name}</h3>
    <p className="tutor-big-idea"><RichText text={card.bigIdea} /></p>
    <InsightBlock insight={card.insight} />
    <dl className="tutor-pattern">
      <dt>Ne zaman?</dt><dd><RichText text={card.trigger} /></dd>
      <dt>Nasıl?</dt><dd><ol>{(card.method ?? []).map((step, i) => <li key={i}><RichText text={step} /></li>)}</ol></dd>
      <dt>Ne zaman değil?</dt><dd><RichText text={card.whenNot} /></dd>
      <dt>Sınav ipucu</dt><dd><RichText text={card.examTip} /></dd>
    </dl>
  </>;
}

function FreeText({ stepId, items, busy, onSend }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return <div className="tutor-free">
    {items.map((item, i) => <div key={i} className={`tutor-free-result ${item.label === 'CORRECT' ? 'ok' : item.label === 'TEACHER' ? 'warn' : ''}`}>
      <p className="muted">“{item.text}”</p>
      <p><strong>{freeTextLabel(item.label)}</strong> <span className="muted">({ROUTE[item.routedTo] ?? item.routedTo} değerlendirdi)</span></p>
      <p><RichText text={item.feedback} /></p>
    </div>)}
    {!open ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>Kendi cümlenle açıkla</button>
      : <form onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= 3) { onSend(stepId, text.trim()); setText(''); setOpen(false); } }}>
        <label className="sr-only" htmlFor={`ft-${stepId}`}>Bu adımın gerekçesini yaz</label>
        <textarea id={`ft-${stepId}`} rows="2" maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Bu adım neden doğru? Kendi cümlenle yaz." />
        <div className="tutor-row"><button type="submit" className="btn btn-primary btn-sm" disabled={busy || text.trim().length < 3}>Gönder</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Vazgeç</button></div>
      </form>}
  </div>;
}

function Card({ card, act, busy, view }) {
  switch (card.kind) {
    case 'PATTERN':
      return <article className="tutor-card pattern"><PatternCard card={card} title="Büyük fikir" /></article>;
    case 'STRATEGY':
      return <article className={`tutor-card ${card.correct ? 'ok' : 'bad'}`}>
        <h3>İlk hamle {card.correct ? '✓' : '✗'}</h3>
        <p><strong>Seçimin:</strong> <RichText text={card.chosen} /></p>
        <p><RichText text={card.feedback} /></p>
        {card.better && <p className="tutor-better"><strong>Daha iyi ilk hamle:</strong> <RichText text={card.better} /> — <RichText text={card.betterFeedback} /></p>}
      </article>;
    case 'HINT':
      return <article className="tutor-card hint">
        <h3><span className="badge badge-primary">{card.level}/3</span> {HINT_KIND[card.hintKind] ?? 'İpucu'}</h3>
        <p><RichText text={card.text} /></p>
      </article>;
    case 'ANSWER':
      return <article className={`tutor-card ${card.correct ? 'ok' : 'bad'}`}>
        <h3>{card.choice} şıkkı {card.correct ? '— doğru ✓' : '— doğru değil'}</h3>
        {card.misconception && <dl className="tutor-misconception">
          <dt>Muhtemel düşünce</dt><dd><RichText text={card.misconception.mistake} /></dd>
          <dt>Neden olur?</dt><dd><RichText text={card.misconception.cause} /></dd>
          <dt>Düzeltme</dt><dd><RichText text={card.misconception.fix} /></dd>
          <dt>Kendine sor</dt><dd><RichText text={card.misconception.guidingQuestion} /></dd>
        </dl>}
        {!card.correct && !card.misconception && card.guidingQuestion && <p><strong>Kendine sor:</strong> <RichText text={card.guidingQuestion} /></p>}
      </article>;
    case 'STEP':
      return <article className="tutor-card step">
        <h3>Adım {card.index}/{card.total} {card.verified && <span className="badge badge-ok" title="Bu adımın hesabı bağımsız olarak denetlendi">denetlendi</span>}</h3>
        <p><RichText text={card.text} /></p>
        {card.selfExplain && <div className="tutor-explain">
          <p><strong>Neden?</strong> <RichText text={card.selfExplain.prompt} /></p>
          <Options options={card.selfExplain.options} busy={busy} result={card.selfExplain.result}
            onChoose={(optionId) => act({ type: 'EXPLAIN', stepId: card.stepId, optionId })} />
          {card.selfExplain.result && <p className={card.selfExplain.result.correct ? 'tutor-ok' : 'tutor-bad'}><RichText text={card.selfExplain.result.feedback} /></p>}
        </div>}
        {card.why && <p className="tutor-why"><strong>Çünkü:</strong> <RichText text={card.why} /></p>}
        {view.status === 'OPEN' && <FreeText stepId={card.stepId} items={card.freeTexts ?? []} busy={busy}
          onSend={(stepId, text) => act({ type: 'FREE_TEXT', stepId, text })} />}
        {view.status !== 'OPEN' && (card.freeTexts ?? []).length > 0 && <FreeText stepId={card.stepId} items={card.freeTexts} busy onSend={() => {}} />}
      </article>;
    case 'FINAL':
      return <article className="tutor-card ok">
        <h3>Doğru cevap: {card.choice} <span className="muted">({card.value})</span></h3>
        <AhaBlock aha={card.aha} sanityCheck={card.sanityCheck} />
        <p className="muted">Aynı çözümü farklı derinlikte görmek için bir anlatım seç:</p>
        <div className="tutor-row">{card.levels.map((level) => <button key={level} type="button" className="btn btn-secondary btn-sm" disabled={busy || view.status !== 'OPEN'}
          title={LEVEL_HELP[level]} onClick={() => act({ type: 'LEVEL', level })}>{LEVEL[level]}</button>)}</div>
      </article>;
    case 'LEVEL':
      return <article className="tutor-card level">
        <h3>{LEVEL[card.level]} <span className="muted">· {LEVEL_HELP[card.level]}</span></h3>
        {card.text && <p><RichText text={card.text} /></p>}
        {card.steps && <ol>{card.steps.map((step, i) => <li key={i}><RichText text={step.text} /><br /><span className="muted"><RichText text={step.why} /></span></li>)}</ol>}
      </article>;
    case 'ALTERNATIVE':
      return <article className="tutor-card level"><h3>Başka bir yol: {card.title}</h3><p><RichText text={card.text} /></p></article>;
    case 'VISUAL':
      return <article className="tutor-card visual" id="tutor-visual">
        <VisualPlayer visual={card} busy={busy} onPredict={(optionId) => act({ type: 'PREDICT', optionId })} />
      </article>;
    case 'TWIN':
      return <TwinCard card={card} act={act} busy={busy} />;
    case 'TWIN_RESULT':
      return <article className={`tutor-card ${card.correct ? 'ok' : 'bad'}`}>
        <h3>İkiz soru: {card.choice} {card.correct ? '— doğru ✓' : `— doğru cevap ${card.answer}`}</h3>
        <p><RichText text={card.solution} /></p>
      </article>;
    case 'SUMMARY':
      return <article className="tutor-card summary">
        <h3>Özet: {OUTCOME[card.outcome] ?? card.outcome}</h3>
        <p className="tutor-progress">Ustalık tahmini: %{masteryPercent(card.masteryBefore)} → <strong>%{masteryPercent(card.masteryAfter)}</strong>
          {card.nextReviewAt && <> · Sonraki tekrar: {formatDate(card.nextReviewAt)}</>}</p>
        <AhaBlock aha={card.aha} />
        <PatternCard card={card} title="Kalıp kartın" />
        <h4>Bu kalıpta sık yapılan hatalar</h4>
        <ul>{card.misconceptions.map((item, i) => <li key={i}><RichText text={item.mistake} /> <span className="muted">→ <RichText text={item.fix} /></span></li>)}</ul>
        <Link className="btn btn-primary" to="/akilli-ogretmen">Başka bir kalıp çalış</Link>
      </article>;
    default:
      return null;
  }
}

function TwinCard({ card, act, busy }) {
  const locked = busy || card.answered;
  const letters = Object.keys(card.choices ?? {});
  return <article className="tutor-card twin" id="tutor-twin">
    <h3>İkiz soru — yardımsız dene</h3>
    <p className="muted">Aynı düşünme yolu, farklı yüzey. Bu soruda ipucu yok; kalıbı aktarabildiğini gösterir.</p>
    <p><RichText text={card.text} /></p>
    <ul className="tutor-twin-choices">{letters.map((letter) => <li key={letter}>
      <button type="button" className="btn btn-secondary" disabled={locked} onClick={() => act({ type: 'TWIN_ANSWER', choice: letter })}>
        <strong>{letter})</strong>&nbsp;<RichText text={card.choices[letter]} /></button></li>)}</ul>
  </article>;
}

export default function TutorSession() {
  const { code } = useParams();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmSolution, setConfirmSolution] = useState(false);
  const endRef = useRef(null);
  usePageTitle(view ? `Akıllı Öğretmen · ${view.question.unitName}` : 'Akıllı Öğretmen');

  useEffect(() => {
    let active = true;
    setView(null); setError(null);
    api.post('/api/tutor/sessions', { code }).then((data) => active && setView(data), (e) => active && setError(e));
    return () => { active = false; };
  }, [code]);

  const act = async (body) => {
    if (!view || busy) return;
    setBusy(true); setActionError(''); setConfirmSolution(false);
    try {
      const next = await api.post(`/api/tutor/sessions/${view.sessionId}/actions`, body);
      setView(next);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    } catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  };

  if (error) return <div className="tutor-page"><ErrorBox error={error} /><Link to="/akilli-ogretmen">← Akıllı Öğretmen</Link></div>;
  if (!view) return <Loading text="Öğretim oturumu hazırlanıyor…" />;
  const q = view.question;
  const open = view.status === 'OPEN';
  const next = view.nextStep;
  const correct = view.answeredCorrectly ? view.cards.find((c) => c.kind === 'FINAL')?.choice : null;
  const finalChoice = view.cards.find((c) => c.kind === 'FINAL')?.choice ?? null;
  const cta = {
    PREVIEW: ['Büyük fikri göster', { type: 'PREVIEW' }],
    HINT: [`İpucu al (${view.available.hintsLeft} kaldı)`, { type: 'HINT' }],
    WORKED: [view.available.stepsLeft ? 'Sonraki adımı aç' : null, { type: 'STEP' }],
    DONE: [open ? 'Özeti gör ve bitir' : null, { type: 'FINISH' }],
  }[next.type];
  return <div className="tutor-page tutor-session">
    <div className="page-head">
      <div>
        <Link to="/akilli-ogretmen" className="muted">← Akıllı Öğretmen</Link>
        <h1>{q.unitName}</h1>
        <p className="muted">{subjectName(q.subjectId)} · {q.exam} · {q.subtopic}</p>
      </div>
      <div className="tutor-head-badges">
        <span className="badge badge-muted">{DIFFICULTY[q.difficulty] ?? q.difficulty}</span>
        {view.content.status === 'PILOT' && <span className="badge badge-warn" title="Otomatik doğrulandı; öğretmen onayı bekliyor">Pilot içerik</span>}
        <span className="badge badge-primary" title="Bu kalıptaki ustalık tahminin">{view.pattern.name}: {MASTERY[view.skill.level]} %{masteryPercent(view.skill.mastery)}</span>
      </div>
    </div>
    <div className="tutor-session-grid">
      <section className="card tutor-question" aria-label="Soru">
        <QuestionImage id={q.questionId} alt={`Soru ${q.code}`} />
        <Choices count={q.choiceCount} wrong={view.wrongChoices} correct={correct ?? (view.solved ? finalChoice : null)}
          disabled={busy || !view.available.answer} onSelect={(choice) => act({ type: 'ANSWER', choice })} />
        {open && <div className="tutor-actions">
          {view.available.hint && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act({ type: 'HINT' })}>
            İpucu ({view.available.hintsLeft})</button>}
          {view.available.preview && !view.solved && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act({ type: 'PREVIEW' })}>
            Büyük fikir</button>}
          {view.available.step && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act({ type: 'STEP' })}>
            {view.cards.some((c) => c.kind === 'STEP') ? 'Sonraki adım' : 'Adım adım çöz'}</button>}
          {view.available.solution && !view.solved && (!confirmSolution
            ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirmSolution(true)}>Çözümü göster</button>
            : <span className="tutor-confirm">Önce bir ipucu denemek ister misin?
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => act({ type: 'SOLUTION' })}>Yine de göster</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => act({ type: 'HINT' })} disabled={!view.available.hint}>İpucu al</button></span>)}
          {view.available.finish && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act({ type: 'FINISH' })}>Bitir ve özeti gör</button>}
        </div>}
        {actionError && <p className="tutor-bad" role="alert">{actionError}</p>}
      </section>
      <section className="tutor-coach" aria-label="Öğretmen paneli">
        {view.cards.map((card, i) => <Card key={`${card.kind}-${i}`} card={card} act={act} busy={busy} view={view} />)}
        <div className={`card tutor-next step-${next.type.toLowerCase()}`} aria-live="polite">
          <p className="tutor-next-label">{STEP[next.type] ?? next.type}</p>
          <h2>{next.title}</h2>
          <p>{next.reason}</p>
          {cta?.[0] && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(cta[1])}>{cta[0]}</button>}
          {next.type === 'VISUAL' && <a className="btn btn-primary" href="#tutor-visual">Görsele git</a>}
          {next.type === 'TWIN' && <a className="btn btn-primary" href="#tutor-twin">İkiz soruya git</a>}
          {['ATTEMPT', 'RETRY_MISCONCEPTION'].includes(next.type) && <p className="muted">Sorudaki şıklardan birini seç (klavyede A–E).</p>}
        </div>
        {view.prompts.map((prompt) => <article key={prompt.kind} className="card tutor-card prompt">
          {prompt.kind === 'STRATEGY' && <>
            <h3>{prompt.suggested ? 'İlk hamleni seç' : 'İstersen önce ilk hamleni seç'}</h3>
            <p><RichText text={prompt.prompt} /></p>
            <Options options={prompt.options} busy={busy} onChoose={(optionId) => act({ type: 'STRATEGY', optionId })} />
          </>}
          {prompt.kind === 'EXPLAIN' && <>
            <h3>Neden doğru?</h3>
            <p className="muted"><RichText text={prompt.stepText} /></p>
            <p><strong><RichText text={prompt.prompt} /></strong></p>
            <Options options={prompt.options} busy={busy} onChoose={(optionId) => act({ type: 'EXPLAIN', stepId: prompt.stepId, optionId })} />
          </>}
        </article>)}
        <div ref={endRef} />
      </section>
    </div>
  </div>;
}
