import { useId, useRef, useState } from 'react';
import { MathText } from '../math.jsx';
import { SharedSetLink } from '../ui.jsx';
import { SCENARIOS, TRANSFER, VERDICTS, numberText, trial } from './parity.js';
import './parity-lab.css';

const STAGES = ['Tahmin et', 'Dene', 'Nedenini kur', 'Soruda kullan'];
const fresh = () => ({ phase: 0, maxPhase: 0, prediction: null, b: 2, trials: [], verdict: null, reason: null, checked: false });

function Choices({ label, options, value, onChange, disabled = false }) {
  return <div className="pl-choices" role="group" aria-label={label}>
    {options.map((option, i) => <button key={i} type="button" aria-pressed={value === i} disabled={disabled}
      onClick={() => onChange(i)}><span className="pl-choice-mark" aria-hidden="true">{value === i ? '●' : '○'}</span><MathText text={option} /></button>)}
  </div>;
}

function PairDrawing({ value }) {
  const n = Math.abs(value);
  const pairs = Math.floor(n / 2);
  return <div className="pl-pair-picture" role="img" aria-label={`${numberText(value)}: ${pairs} çift ve ${n % 2} artan. İşaret tekliği değiştirmez.`}>
    <div className="pl-pairs" aria-hidden="true">
      {Array.from({ length: pairs }, (_, i) => <span className="pl-pair" key={i}><i /><i /></span>)}
      {n % 2 === 1 && <span className="pl-unpaired"><i /></span>}
      {n === 0 && <span className="pl-zero">0<span>Artan yok</span></span>}
    </div>
    <span className="pl-picture-caption">{value < 0 ? 'Mutlak değerini eşleştir; eksi işareti tekliği değiştirmez.' : 'İkişer eşleştir. Artan var mı?'}</span>
  </div>;
}

function TransferPractice({ real }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const task = TRANSFER[index];
  const answer = answers[task.id] ?? { chosen: null, checked: false, hint: false, firstCorrect: null };
  const update = (patch) => setAnswers((old) => ({ ...old, [task.id]: { ...answer, ...patch } }));
  const correct = answer.chosen === task.answer;
  if (finished) {
    const first = Object.values(answers).filter((a) => a.firstCorrect).length;
    const hints = Object.values(answers).filter((a) => a.hint).length;
    return <div className="pl-complete">
      <span className="pl-eyebrow">Şimdi yöntemi yanında götür</span>
      <h2>Koşulu oku. İlişkiyi kur. Sonucu denetle.</h2>
      <p>Üç özgün alıştırmayı tamamladın. İlk kontrolde, ipucusuz {first}/3 doğru; {hints} soruda ipucu açtın. Bu kısa çalışma, konu ustalığı ölçümü değildir.</p>
      <ol className="pl-takeaways"><li>Tek çarpım → bütün çarpanlar tek.</li><li>Çift çarpım → en az bir çarpan çift; ikisi de çift olabilir.</li><li>Karşı örnek → koşulu sağlar, iddiayı bozar.</li></ol>
      <h3>Görseli okunmuş, tek–çift çıkarımı isteyen ÖSYM soruları</h3>
      <ul className="tl-real">{real.map((r) => <li key={r.code}><strong>{r.code.replace('_', ' ')}</strong> <MathText text={r.why} /></li>)}</ul>
      <div className="pl-actions">
        <SharedSetLink className="btn btn-primary" type="lab" conceptId="temel-kavramlar" archetype="lab-tek-cift" codes={real.map((r) => r.code)}>Bu {real.length} gerçek soruyu çöz</SharedSetLink>
        <SharedSetLink className="btn btn-secondary" type="practice" conceptId="temel-kavramlar" archetype="tek-cift">Daha çok tek–çift sorusu</SharedSetLink>
      </div>
      <p className="pl-note">Sorular yeni sekmede ortak pratik ekranında açılır; oradaki cevapların normal çalışma kaydına girer. “Daha çok” setindeki eşlemeler otomatiktir, tek tek görsel olarak doğrulanmadı.</p>
      <button className="pl-text-button" type="button" onClick={() => { setFinished(false); setIndex(0); }}>Alıştırmalarımı incele</button>
    </div>;
  }
  return <div className="pl-transfer">
    <span className="pl-eyebrow">Özgün alıştırma {index + 1} / {TRANSFER.length} · Görsel yardım olmadan</span>
    <h2><MathText text={task.text} /></h2>
    <Choices label="Aktarım cevabı" options={task.options} value={answer.chosen} disabled={answer.checked && correct}
      onChange={(chosen) => update({ chosen, checked: false })} />
    <div className="pl-actions">
      {!answer.checked && <button className="btn btn-primary" type="button" disabled={answer.chosen === null}
        onClick={() => update({ checked: true, firstCorrect: answer.firstCorrect ?? (correct && !answer.hint) })}>Cevabımı kontrol et</button>}
      {!(answer.checked && correct) && <button type="button" className="pl-text-button" onClick={() => update({ hint: true })}>Küçük bir ipucu</button>}
    </div>
    {answer.hint && <aside className="pl-feedback"><strong>Şuna bak</strong><p>{task.hint}</p></aside>}
    {answer.checked && <div className={`pl-feedback ${correct ? 'pl-success' : 'pl-retry'}`} role="status">
      <strong>{correct ? 'İlişkiyi doğru kurdun.' : 'Bir koşulu tekrar düşün.'}</strong><p>{task.feedback[answer.chosen]}</p>
      {correct && <button type="button" className="btn btn-primary" onClick={() => index < TRANSFER.length - 1 ? setIndex(index + 1) : setFinished(true)}>
        {index < TRANSFER.length - 1 ? 'Sonraki soru →' : 'Çalışmamı tamamla →'}</button>}
    </div>}
  </div>;
}

// Tek–çift pilotu (MAT-LAB-01): Temel Kavramlar laboratuvarının ilk hedefi olarak TopicLab içinde açılır.
export default function ParityWorkbench({ real = [] }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [states, setStates] = useState(() => Object.fromEntries(SCENARIOS.map((s) => [s.id, fresh()])));
  const heading = useRef(null);
  const sliderId = useId();
  const scenario = SCENARIOS[scenarioIndex];
  const state = states[scenario.id];
  const result = trial(scenario, state.b);
  const patch = (changes) => setStates((old) => ({ ...old, [scenario.id]: { ...old[scenario.id], ...changes } }));
  const go = (phase) => { patch({ phase, maxPhase: Math.max(state.maxPhase, phase) }); requestAnimationFrame(() => heading.current?.focus()); };
  const proven = state.checked && state.verdict === scenario.verdict && state.reason === scenario.answer;
  const completed = SCENARIOS.filter((s) => states[s.id].maxPhase === 3).length;
  const equation = `a + ${scenario.coefficient}b = ${scenario.total}`;
  const record = () => patch({ trials: [...state.trials.filter((t) => t.b !== state.b), result].slice(-4) });
  return <>
    <div className="pl-scenario-heading"><h2>Ya şöyle olsaydı?</h2><span>{completed}/4 gerekçe kuruldu</span></div>
    <nav className="pl-scenarios" aria-label="Deney koşulları">
      {SCENARIOS.map((s, i) => <button key={s.id} type="button" aria-pressed={scenarioIndex === i}
        onClick={() => { setScenarioIndex(i); requestAnimationFrame(() => heading.current?.focus()); }}>
        <span className="pl-scenario-number" aria-hidden="true">{states[s.id].maxPhase === 3 ? '✓' : `0${i + 1}`}</span>
        <span><strong>{s.label}</strong><small>{s.change}</small></span>
      </button>)}
    </nav>
    <section className="pl-workbench" aria-label="Tek–çift deney alanı">
      <nav className="pl-stages" aria-label="Öğrenme adımları">{STAGES.map((label, i) => <button type="button" key={label}
        disabled={i > state.maxPhase} aria-current={state.phase === i ? 'step' : undefined} onClick={() => go(i)}><span>{i + 1}</span>{label}</button>)}</nav>
      <div className="pl-workbench-body">
        <div className="pl-task-heading" ref={heading} tabIndex={-1}>
          <span className="pl-eyebrow">{STAGES[state.phase]} / {scenario.label}</span>
          {state.phase < 3 && <><h2>{scenario.prompt}</h2><p>{scenario.context} <strong className="pl-inline-equation">{equation}</strong></p></>}
        </div>
        {state.phase === 0 && <div className="pl-predict">
          <div className="pl-claim"><span>Sınayacağın iddia</span><strong>“a tektir.”</strong><p>Verilen koşullarda bu iddia ne zaman doğru?</p></div>
          <Choices label="Tahminin" options={VERDICTS} value={state.prediction} onChange={(prediction) => patch({ prediction })} />
          <div className="pl-actions"><button type="button" className="btn btn-primary" disabled={state.prediction === null} onClick={() => go(1)}>Tahminimi sına →</button>
            <span className="pl-note">Yanılabilirsin. Deney bunun için var.</span></div>
        </div>}
        {state.phase === 1 && <>
          <div className="pl-experiment">
            <div className="pl-visual">
              <span className="pl-eyebrow">b’yi sen seç · a eşitliği korusun</span>
              <div className="pl-equation" aria-label={`${numberText(result.a)} + ${scenario.coefficient} çarpı (${numberText(state.b)}) = ${scenario.total}`}>
                <div><small>a</small><strong>{numberText(result.a)}</strong></div><span>+</span>
                <div><small>{scenario.coefficient}b</small><strong>{numberText(scenario.coefficient * state.b)}</strong></div><span>=</span>
                <div><small>toplam</small><strong>{scenario.total}</strong></div>
              </div>
              <PairDrawing value={result.a} />
              <div className={`pl-parity ${result.holds ? 'pl-parity-odd' : 'pl-parity-even'}`} aria-live="polite"><span>a = {numberText(result.a)}</span><strong>{result.parity}</strong></div>
            </div>
            <div className="pl-controls">
              <label htmlFor={sliderId}>b değerini değiştir <output htmlFor={sliderId}>{numberText(state.b)}</output></label>
              <input id={sliderId} type="range" min={-6} max={12} step={scenario.integers ? 1 : 0.5} value={state.b}
                onChange={(e) => patch({ b: Number(e.target.value) })} />
              <div className="pl-range-labels"><span>−6</span><span>12</span></div>
              <div className="pl-presets" aria-label="Örnek b değerleri">{(scenario.integers ? [-3, 0, 1, 2, 5] : [0, 0.5, 1, 1.5]).map((b) => <button key={b} type="button" aria-pressed={state.b === b} onClick={() => patch({ b })}>{numberText(b)}</button>)}</div>
              <p>{scenario.integers ? 'Negatifleri ve sıfırı da dene. Teklik, pozitif olmak demek değildir.' : 'Tam sayı şartını kaldırdık. Kaydırıcı bu deneyde yarım adımlarla ilerliyor.'}</p>
              <button type="button" className="btn btn-primary" onClick={record}>Bu örneği kaydet</button>
              <p className="pl-note">Tahminin: <strong>{VERDICTS[state.prediction]}</strong></p>
            </div>
          </div>
          <div className="pl-experiment-log" aria-live="polite"><h3>Deney defterin <span>Son 4 farklı örnek</span></h3>
            {!state.trials.length ? <p className="pl-note">Bir değer seç ve örneği kaydet. İddiayı çürüten bir değer bulabilecek misin?</p> : <ul>{state.trials.map((t) => <li key={t.b}>
              <span>b = {numberText(t.b)} → a = {numberText(t.a)}</span><strong>{t.holds ? 'İddiaya uyuyor' : 'Karşı örnek ✓'}</strong></li>)}</ul>}
          </div>
          <div className="pl-actions"><button type="button" className="btn btn-primary" disabled={!state.trials.length} onClick={() => go(2)}>Peki neden? →</button><span className="pl-note">Örnekler fikir verir. “Her zaman” için gerekçe gerekir.</span></div>
        </>}
        {state.phase === 2 && <div className="pl-reason">
          <div className="pl-claim"><span>Deneyden sonra kararın</span><strong>“a tektir.”</strong></div>
          <Choices label="Son kararın" options={VERDICTS} value={state.verdict} onChange={(verdict) => patch({ verdict, checked: false })} />
          <h3>{scenario.question}</h3>
          <Choices label="Gerekçen" options={scenario.reasons} value={state.reason} onChange={(reason) => patch({ reason, checked: false })} />
          <button type="button" className="btn btn-primary" disabled={state.verdict === null || state.reason === null} onClick={() => patch({ checked: true })}>Kararımı ve gerekçemi kontrol et</button>
          {state.checked && <div className={`pl-feedback ${proven ? 'pl-success' : 'pl-retry'}`} role="status">
            <strong>{proven ? 'Artık nedenini biliyorsun.' : 'Bir adım daha düşün.'}</strong>
            <p>{state.reason !== scenario.answer ? scenario.feedback[state.reason] : state.verdict !== scenario.verdict ? 'Gerekçen doğru. Şimdi bu gerekçenin “a tektir” iddiasını her zaman mı, bazen mi, yoksa hiç mi sağladığını kontrol et.' : scenario.proof}</p>
            {proven && <><p className="pl-rule">{scenario.lesson}</p><div className="pl-actions">
              <button type="button" className="btn btn-primary" onClick={() => go(3)}>Yeni soruda kullan →</button>
              {scenarioIndex < SCENARIOS.length - 1 && <button type="button" className="btn btn-secondary" onClick={() => { patch({ maxPhase: 3 }); setScenarioIndex(scenarioIndex + 1); requestAnimationFrame(() => heading.current?.focus()); }}>Bir koşulu değiştir →</button>}
            </div></>}
            {!proven && <button type="button" className="pl-text-button" onClick={() => go(1)}>Deneye dön</button>}
          </div>}
        </div>}
        <div hidden={state.phase !== 3}><TransferPractice real={real} /></div>
      </div>
    </section>
  </>;
}
