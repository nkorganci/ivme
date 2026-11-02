import { useId } from 'react';
import { MathText } from '../math.jsx';
import { SharedSetLink } from '../ui.jsx';
import { fmt } from './sayi.js';

// Ortak lab akışı (matematik-laboratuvari.md): tahmin → amaçlı deney → gerekçe → azalan yardımla aktarım → gerçek soru.
// Matematiksel model ve çizim konuya özgüdür (konular/<kimlik>.js + cizim/<kimlik>.jsx); burada yalnız akış vardır.
export const STAGES = ['Tahmin et', 'Dene', 'Nedenini kur', 'Soruda kullan'];

export const freshGoal = (goal) => ({
  phase: 0, maxPhase: 0, prediction: null, values: { ...(goal.experiment?.initial ?? {}) }, trials: [], found: false, misses: 0,
  picks: (goal.reasons ?? []).map(() => null), checked: false, transfer: { index: 0, answers: {}, finished: false },
});

export function Choices({ label, options, value, onChange, disabled = false }) {
  return <div className="pl-choices" role="group" aria-label={label}>
    {options.map((option, i) => <button key={i} type="button" aria-pressed={value === i} disabled={disabled}
      onClick={() => onChange(i)}><span className="pl-choice-mark" aria-hidden="true">{value === i ? '●' : '○'}</span><MathText text={option} /></button>)}
  </div>;
}

function Control({ control, value, onChange }) {
  const id = useId();
  if (control.options) {
    return <div className="tl-control"><span className="tl-control-label" id={id}>{control.label}</span>
      <div className="pl-presets" role="group" aria-labelledby={id}>{control.options.map(([v, label]) => <button key={String(v)} type="button"
        aria-pressed={value === v} onClick={() => onChange(v)}><MathText text={label} /></button>)}</div></div>;
  }
  const show = control.format ? control.format(value) : fmt(value);
  return <div className="tl-control">
    <label htmlFor={id}><MathText text={control.label} /> <output htmlFor={id}>{show}</output></label>
    <input id={id} type="range" min={control.min} max={control.max} step={control.step ?? 1} value={value}
      onChange={(e) => onChange(Number(e.target.value))} />
    <div className="pl-range-labels" aria-hidden="true"><span>{control.format ? control.format(control.min) : fmt(control.min)}</span><span>{control.format ? control.format(control.max) : fmt(control.max)}</span></div>
  </div>;
}

function Experiment({ goal, View, state, patch, go }) {
  const ex = goal.experiment;
  const result = ex.compute(state.values);
  const rows = ex.readout(state.values, result);
  const hit = ex.target.test(state.values, result);
  const record = () => {
    const key = JSON.stringify(state.values);
    const entry = { key, values: state.values, rows, hit, note: hit ? ex.success : ex.diagnose(state.values, result) };
    patch({ trials: [...state.trials.filter((t) => t.key !== key), entry].slice(-4), found: state.found || hit, misses: hit ? state.misses : state.misses + 1 });
  };
  return <>
    <div className="pl-experiment">
      <div className="pl-visual tl-visual" aria-live="polite">
        <span className="pl-eyebrow">{ex.visualLabel ?? 'Model'}</span>
        {View && <View values={state.values} result={result} goal={goal} />}
        <dl className="tl-readout">{rows.map(([k, v]) => <div key={k}><dt><MathText text={k} /></dt><dd><MathText text={String(v)} /></dd></div>)}</dl>
        {result.invalid && <p className="tl-invalid" role="status"><strong>Bu durum koşulu sağlamıyor.</strong> {result.invalid}</p>}
      </div>
      <div className="pl-controls tl-controls">
        {ex.controls.map((c) => <Control key={c.key} control={c} value={state.values[c.key]}
          onChange={(v) => patch({ values: { ...state.values, [c.key]: v } })} />)}
        <p><MathText text={ex.target.text} /></p>
        <button type="button" className="btn btn-primary" onClick={record}>Bu durumu kaydet</button>
        <p className="pl-note">Tahminin: <strong><MathText text={goal.predict.options[state.prediction] ?? '—'} /></strong></p>
      </div>
    </div>
    <div className="pl-experiment-log" aria-live="polite"><h3>Deney defterin <span>Son 4 farklı durum</span></h3>
      {!state.trials.length ? <p className="pl-note">Değerleri değiştir, bir durumu kaydet. Kayıt, neyin değiştiğini görmen için.</p>
        : <ul className="tl-log">{state.trials.map((t) => <li key={t.key} className={t.hit ? 'tl-hit' : ''}>
          <span>{t.rows.map(([k, v]) => <span key={k} className="tl-log-cell"><MathText text={`${k}: ${v}`} /></span>)}</span>
          <strong>{t.hit ? 'Hedef ✓' : 'Hedef değil'}</strong><p><MathText text={t.note} /></p></li>)}</ul>}
    </div>
    {!state.found && state.misses >= 2 && ex.target.hint && <aside className="pl-feedback"><strong>Küçük bir yönlendirme</strong><p><MathText text={ex.target.hint} /></p></aside>}
    {state.found && <div className="pl-feedback pl-success" role="status"><strong>Hedef durumu buldun.</strong>
      <p><MathText text={goal.predict.insight[state.prediction] ?? ''} /></p></div>}
    <div className="pl-actions"><button type="button" className="btn btn-primary" disabled={!state.found} onClick={() => go(2)}>Peki neden? →</button>
      <span className="pl-note">Bir örnek fikir verir; “her zaman” için gerekçe gerekir.</span></div>
  </>;
}

function Reasons({ goal, state, patch, go }) {
  const allCorrect = state.checked && goal.reasons.every((r, i) => state.picks[i] === r.answer);
  const firstWrong = goal.reasons.findIndex((r, i) => state.picks[i] !== r.answer);
  return <div className="pl-reason">
    {goal.reasons.map((r, i) => <div key={i} className="tl-reason-step">
      <h3><MathText text={r.question} /></h3>
      <Choices label={i ? `Gerekçe ${i + 1}` : 'Gerekçen'} options={r.options} value={state.picks[i]}
        onChange={(v) => patch({ picks: state.picks.map((p, j) => (j === i ? v : p)), checked: false })} />
    </div>)}
    <button type="button" className="btn btn-primary" disabled={state.picks.some((p) => p === null)} onClick={() => patch({ checked: true })}>Gerekçemi kontrol et</button>
    {state.checked && <div className={`pl-feedback ${allCorrect ? 'pl-success' : 'pl-retry'}`} role="status">
      <strong>{allCorrect ? 'Artık nedenini biliyorsun.' : 'Bir adım daha düşün.'}</strong>
      {allCorrect ? <>
        <p><MathText text={goal.proof} /></p>
        <dl className="tl-rule">
          <div><dt>Kısa yol</dt><dd><MathText text={goal.rule} /></dd></div>
          <div><dt>Ne zaman geçerli</dt><dd><MathText text={goal.condition} /></dd></div>
          <div><dt>Yanıltacağı durum</dt><dd><MathText text={goal.trap} /></dd></div>
        </dl>
        <div className="pl-actions"><button type="button" className="btn btn-primary" onClick={() => go(3)}>Yeni soruda kullan →</button></div>
      </> : <>
        <p><MathText text={goal.reasons[firstWrong].feedback[state.picks[firstWrong]]} /></p>
        <button type="button" className="pl-text-button" onClick={() => go(1)}>Deneye dön</button>
      </>}
    </div>}
  </div>;
}

function Transfer({ goal, conceptId, state, patch }) {
  const t = state.transfer;
  const setT = (changes) => patch({ transfer: { ...t, ...changes } });
  const task = goal.transfer[t.index];
  const answer = t.answers[task.id] ?? { chosen: null, checked: false, hints: 0, firstCorrect: null };
  const update = (changes) => setT({ answers: { ...t.answers, [task.id]: { ...answer, ...changes } } });
  const correct = answer.chosen === task.answer;
  if (t.finished) {
    const list = Object.values(t.answers);
    const first = list.filter((a) => a.firstCorrect).length;
    const hinted = list.filter((a) => a.hints > 0).length;
    return <div className="pl-complete tl-complete">
      <span className="pl-eyebrow">Bu hedefte yardım azaldı · Sıra gerçek soruda</span>
      <h2>{goal.label}: yöntemi yanında götür</h2>
      <p>{goal.transfer.length} özgün alıştırmada ilk kontrolde, ipucusuz {first}/{goal.transfer.length} doğru; {hinted} soruda ipucu açtın. Bu kısa çalışma ustalık ölçümü değildir.</p>
      <p className="pl-rule"><MathText text={goal.rule} /></p>
      {goal.real?.length ? <>
        <h3>Görseli okunmuş, bu hedefle eşleşmiş ÖSYM soruları</h3>
        <ul className="tl-real">{goal.real.map((r) => <li key={r.code}><strong>{r.code.replace('_', ' ')}</strong> <MathText text={r.why} /></li>)}</ul>
        <div className="pl-actions">
          <SharedSetLink className="btn btn-primary" type="lab" conceptId={conceptId} archetype={`lab-${goal.id}`} codes={goal.real.map((r) => r.code)} sources={[...new Set(goal.real.map((r) => r.from).filter(Boolean))]}>Bu {goal.real.length} gerçek soruyu çöz</SharedSetLink>
        </div>
        <p className="pl-note">Sorular yeni sekmede ortak pratik ekranında açılır; oradaki cevapların normal çalışma kaydına girer. Laboratuvar denemeleri girmez.</p>
      </> : <p className="pl-note"><MathText text={goal.realNote ?? 'Bu hedefe görseli okunarak eşlenmiş gerçek soru henüz yok.'} /></p>}
      <button className="pl-text-button" type="button" onClick={() => setT({ finished: false, index: 0 })}>Alıştırmalarımı incele</button>
    </div>;
  }
  return <div className="pl-transfer tl-transfer">
    <span className="pl-eyebrow">Özgün alıştırma {t.index + 1} / {goal.transfer.length} · {task.level}</span>
    <h2><MathText text={task.text} /></h2>
    <Choices label="Aktarım cevabı" options={task.options} value={answer.chosen} disabled={answer.checked && correct}
      onChange={(chosen) => update({ chosen, checked: false })} />
    <div className="pl-actions">
      {!(answer.checked && correct) && <button className="btn btn-primary" type="button" disabled={answer.chosen === null}
        onClick={() => update({ checked: true, firstCorrect: answer.firstCorrect ?? (correct && answer.hints === 0) })}>Cevabımı kontrol et</button>}
      {!(answer.checked && correct) && answer.hints < task.hints.length && <button type="button" className="pl-text-button"
        onClick={() => update({ hints: answer.hints + 1 })}>{['Küçük bir ipucu', 'Biraz daha yardım', 'Çözüm adımını göster'][answer.hints]}</button>}
    </div>
    {answer.hints > 0 && <aside className="pl-feedback tl-hints"><strong>İpucu {answer.hints} / {task.hints.length}</strong>
      <ol>{task.hints.slice(0, answer.hints).map((h, i) => <li key={i}><MathText text={h} /></li>)}</ol></aside>}
    {answer.checked && <div className={`pl-feedback ${correct ? 'pl-success' : 'pl-retry'}`} role="status">
      <strong>{correct ? 'İlişkiyi doğru kurdun.' : 'Bu seçenekteki düşünceyi kontrol et.'}</strong><p><MathText text={task.feedback[answer.chosen]} /></p>
      {correct && <button type="button" className="btn btn-primary" onClick={() => (t.index < goal.transfer.length - 1 ? setT({ index: t.index + 1 }) : setT({ finished: true }))}>
        {t.index < goal.transfer.length - 1 ? 'Sonraki soru →' : 'Hedefi tamamla →'}</button>}
    </div>}
  </div>;
}

export default function GoalWorkbench({ goal, View, conceptId, state, patch, headingRef }) {
  const go = (phase) => { patch({ phase, maxPhase: Math.max(state.maxPhase, phase) }); requestAnimationFrame(() => headingRef.current?.focus()); };
  return <section className="pl-workbench tl-workbench" aria-label={`${goal.label} deney alanı`}>
    <nav className="pl-stages" aria-label="Öğrenme adımları">{STAGES.map((label, i) => <button type="button" key={label}
      disabled={i > state.maxPhase} aria-current={state.phase === i ? 'step' : undefined} onClick={() => go(i)}><span>{i + 1}</span>{label}</button>)}</nav>
    <div className="pl-workbench-body">
      <div className="pl-task-heading" ref={headingRef} tabIndex={-1}>
        <span className="pl-eyebrow">{STAGES[state.phase]} / {goal.label}</span>
        {state.phase < 3 && <><h2><MathText text={state.phase === 1 ? goal.experiment.prompt : state.phase === 2 ? 'Gördüğünü gerekçeye çevir' : goal.predict.question} /></h2>
          {state.phase === 0 && <p><MathText text={goal.story} /></p>}</>}
      </div>
      {state.phase === 0 && <div className="pl-predict tl-predict">
        <p className="tl-objective"><strong>Hedef:</strong> <MathText text={goal.objective} /></p>
        <Choices label="Tahminin" options={goal.predict.options} value={state.prediction} onChange={(prediction) => patch({ prediction })} />
        <div className="pl-actions"><button type="button" className="btn btn-primary" disabled={state.prediction === null} onClick={() => go(1)}>Tahminimi sına →</button>
          <span className="pl-note">Yanılabilirsin. Deney bunun için var.</span></div>
      </div>}
      {state.phase === 1 && <Experiment goal={goal} View={View} state={state} patch={patch} go={go} />}
      {state.phase === 2 && <Reasons goal={goal} state={state} patch={patch} go={go} />}
      {state.phase === 3 && <Transfer goal={goal} conceptId={conceptId} state={state} patch={patch} />}
    </div>
  </section>;
}
