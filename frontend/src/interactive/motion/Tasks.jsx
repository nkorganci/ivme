import { useEffect, useState } from 'react';
import MotionLab from './MotionLab.jsx';
import { useLab } from './useLab.js';
import { TASKS } from './content.js';
import { fmt, unitsOf } from './model.js';

function TaskRunner({ task, done, onDone }) {
  const lab = useLab(task.scenario);
  const [moment, setMoment] = useState(null);
  const [shown, setShown] = useState(false);
  const result = task.check ? task.check(lab.motions) : null;
  const units = unitsOf(lab.scenario);
  const momentOk = moment != null && task.answer(moment);

  useEffect(() => {
    if ((result?.done || momentOk) && !done) onDone(shown);
  }, [result?.done, momentOk]); // eslint-disable-line react-hooks/exhaustive-deps

  const panelTop = <div className={`tk-goal${result?.done || momentOk ? ' done' : ''}`}>
    <h3>{task.title}</h3>
    <p>{task.goal}</p>
    {result && <p className={result.done ? 'st-ok' : 'tk-status'} role="status">{result.done ? '✓ Başardın! ' : ''}{result.status}</p>}
    {task.kind === 'moment' && <div className="tk-moment">
      <button type="button" className="btn btn-primary" onClick={() => setMoment(lab.t)}>Bu an! (t = {fmt(lab.t, 2)} {units.t})</button>
      {moment != null && <p className={momentOk ? 'st-ok' : 'st-bad'} role="status">
        {momentOk ? `✓ Doğru. ${task.answerText}` : `t = ${fmt(moment, 2)} ${units.t} değil. Aradaki uzaklığa bak: o anda hâlâ açılıyor mu, kapanıyor mu?`}</p>}
    </div>}
    <details className="tk-hint"><summary>İpucu</summary><p>{task.hint}</p></details>
    {task.solution && !result?.done && <button type="button" className="btn btn-secondary btn-sm"
      onClick={() => { setShown(true); lab.load({ ...task.scenario, bodies: task.solution }, { keepLayers: true }); }}>Bir çözüm göster</button>}
  </div>;

  return <MotionLab lab={lab} editable={task.editable} lead={panelTop} onReset={task.editable ? () => lab.load(task.scenario) : undefined} />;
}

/** Görevler: hedefi olan, otomatik denetlenen keşif etkinlikleri (PhET oyun kipine benzer). */
export default function Tasks({ activeId, onSelect, progress, onRecord }) {
  const task = TASKS.find((t) => t.id === activeId) ?? TASKS[0];
  const doneCount = TASKS.filter((t) => progress[t.id]).length;
  return <div className="st">
    <nav className="st-list" aria-label="Görevler">
      <p className="muted small">{doneCount}/{TASKS.length} görev tamamlandı</p>
      {TASKS.map((t, i) => <button key={t.id} type="button" className={`st-list-item${t.id === task.id ? ' active' : ''}${progress[t.id] ? ' done' : ''}`}
        onClick={() => onSelect(t.id)} aria-current={t.id === task.id ? 'true' : undefined}>
        <span className="st-step-no">{progress[t.id] ? '✓' : i + 1}</span>
        <span><strong>{t.title}</strong></span>
      </button>)}
    </nav>
    <div className="st-item"><TaskRunner key={task.id} task={task} done={!!progress[task.id]} onDone={(helped) => onRecord(task.id, { done: true, helped })} /></div>
  </div>;
}
