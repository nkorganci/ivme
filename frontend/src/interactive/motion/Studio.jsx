import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAsync } from '../../hooks.js';
import QuestionImage from '../../components/QuestionImage.jsx';
import { Loading } from '../../components/States.jsx';
import MotionLab from './MotionLab.jsx';
import { useLab } from './useLab.js';
import { STUDIO } from './content.js';
import { firstNodeDifference, fmt, straighten, unitsOf } from './model.js';

const STEPS = [
  ['Oku ve tanı', 'Soru hangi kalıba giriyor?'],
  ['Tahmin et', 'Simülasyondan önce kararını ver.'],
  ['Modeli kur', 'Soruyu laboratuvara aktar.'],
  ['Simüle et ve gözle', 'Kilit anlarda dur, nedenini gör.'],
  ['Mantığı kur', 'Çözüm, kalıp ve tuzak.'],
  ['İkiz soru', 'Aynı fikir, yardımsız.'],
];

const romanSet = (text) => new Set(text.match(/\b(?:III|II|I)\b/g) ?? []);

/** Yargı tahminlerinden şık harfini bulur; hiçbir şıkka uymuyorsa null. */
function choiceFor(item, prediction) {
  const truths = new Set(item.statements.filter((s) => prediction[s.id]).map((s) => s.id));
  const match = Object.entries(item.choices).find(([, text]) => {
    const set = romanSet(text);
    return set.size === truths.size && [...set].every((id) => truths.has(id));
  });
  return match?.[0] ?? null;
}

const parseNumber = (text) => Number(String(text).trim().replace('−', '-').replace(',', '.'));

function QuestionText({ item }) {
  return <div className="st-qtext">
    <p>{item.stem}</p>
    {item.statements && <ol className="st-statements">{item.statements.map((s) => <li key={s.id}><strong>{s.id}.</strong> {s.text}</li>)}</ol>}
    {item.statements && <p><strong>{item.ask}</strong></p>}
    <ul className="st-choices">{Object.entries(item.choices).map(([key, text]) => <li key={key}><strong>{key})</strong> {text}</li>)}</ul>
  </div>;
}

function QuestionPanel({ item }) {
  const code = item.source?.code;
  const question = useAsync(() => (code ? api.get(`/api/questions/code/${encodeURIComponent(code)}`) : Promise.resolve(null)), [code]);
  return <section className="card st-question" aria-label="Soru">
    <header>
      {item.source ? <span className="badge badge-primary">Çıkmış soru · {item.source.label}</span> : <span className="badge badge-muted">Özgün soru</span>}
      <h3>{item.title}</h3>
    </header>
    {code && question.loading && <Loading text="Soru görseli yükleniyor…" />}
    {code && question.data && <div className="image-card st-image"><QuestionImage id={question.data.id} alt={`${code} kodlu soru`} /></div>}
    {(!code || question.error) && <QuestionText item={item} />}
    {code && !question.error && <details className="st-text-toggle"><summary>Metin olarak oku</summary><QuestionText item={item} /></details>}
    {code && <p className="small"><Link to={`/soru/${encodeURIComponent(code)}`}>Soruyu çıkmış sorular ekranında aç</Link></p>}
  </section>;
}

function Choices({ prompt, options, chosen, onChoose, name }) {
  return <fieldset className="st-mc">
    <legend>{prompt}</legend>
    {options.map((option, i) => <button key={option.text} type="button" disabled={chosen != null}
      className={`btn btn-secondary st-option${chosen === i ? (option.correct ? ' ok' : ' bad') : ''}${chosen != null && option.correct ? ' right' : ''}`}
      onClick={() => onChoose(i)} aria-describedby={chosen === i ? `${name}-fb` : undefined}>{option.text}</button>)}
    {chosen != null && <p id={`${name}-fb`} className={options[chosen].correct ? 'st-ok' : 'st-bad'} role="status">{options[chosen].feedback}</p>}
  </fieldset>;
}

function Stepper({ step, reached, onStep }) {
  return <ol className="st-steps">
    {STEPS.map(([title, hint], i) => <li key={title} className={i === step ? 'active' : i <= reached ? 'reached' : ''}>
      <button type="button" disabled={i > reached} onClick={() => onStep(i)} aria-current={i === step ? 'step' : undefined}>
        <span className="st-step-no">{i < reached ? '✓' : i + 1}</span>
        <span><strong>{title}</strong><small>{hint}</small></span>
      </button>
    </li>)}
  </ol>;
}

function TwinLab({ scenario }) {
  const lab = useLab(scenario);
  return <MotionLab lab={lab} compact layerKeys={['strobe', 'arrows', 'area', 'slope', 'disp']} />;
}

/** Tek sorunun öğrenme döngüsü: tanı → tahmin → model → simülasyon → mantık → ikiz soru. */
function StudioItem({ item, record, onRecord }) {
  const build = item.build;
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [recognized, setRecognized] = useState(null);
  const [prediction, setPrediction] = useState({});
  const [predictedChoice, setPredictedChoice] = useState(null);
  const [locked, setLocked] = useState(false);
  const [buildDone, setBuildDone] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [message, setMessage] = useState(null);
  const [found, setFound] = useState(() => new Set());
  const [variant, setVariant] = useState(build.variants?.[0]?.id ?? null);
  const [values, setValues] = useState(() => Object.fromEntries((build.fields ?? []).map((f) => [f.id, ''])));
  const [fieldErrors, setFieldErrors] = useState({});
  const [observed, setObserved] = useState(() => new Set());
  const [obsIndex, setObsIndex] = useState(null);
  const [explained, setExplained] = useState(null);
  const [twinChoice, setTwinChoice] = useState(null);
  const [showQuestion, setShowQuestion] = useState(true);
  const memo = useRef({});
  const lab = useLab(build.start ?? build.solution);
  const units = unitsOf(lab.scenario);

  const editable = step === 2 && !(build.mode === 'parameters') && !(buildDone && ['match', 'points'].includes(build.mode))
    ? (build.variants?.find((v) => v.id === variant)?.editable ?? build.editable) : null;
  const liveMode = build.mode === 'constraint' || build.mode === 'counterexample';
  const requirementMet = liveMode ? build.require.every((id) => found.has(id)) : buildDone;

  memo.current.variant = variant;
  // Model değişince eski "uyuşmuyor" uyarısı geçersizleşir.
  useEffect(() => { if (!buildDone) setMessage((current) => (current && !current.ok ? null : current)); }, [lab.scenario]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (step !== 2 || !liveMode) return;
    const fresh = build.found.filter((f) => !found.has(f.id) && f.test(lab.motions, lab.scenario, memo.current));
    if (fresh.length) setFound((current) => new Set([...current, ...fresh.map((f) => f.id)]));
  }, [lab.scenario, variant, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (next) => {
    setStep(next);
    setReached((current) => Math.max(current, next));
    if (next === 3 && obsIndex == null) show(0);
  };

  function show(index) {
    const obs = item.observe[index];
    const base = obs.scenario ?? build.solution;
    lab.load(base, { t: obs.t, keepLayers: true });
    if (obs.layers) lab.setLayers((current) => ({ ...current, ...obs.layers }));
    setObserved((current) => new Set([...current, index]));
    setObsIndex(index);
  }

  const assist = () => {
    setAssisted(true);
    setMessage({ ok: true, text: 'Model senin yerine kuruldu. Değerleri soruyla karşılaştırıp neden böyle olduğuna bak.' });
    if (build.mode === 'parameters') setValues(Object.fromEntries(build.fields.map((f) => [f.id, String(f.value)])));
    lab.load(build.solution, { keepLayers: true });
    if (liveMode) setFound(new Set(build.found.map((f) => f.id)));
    setBuildDone(true);
  };

  const checkModel = () => {
    if (build.mode === 'match') {
      for (const target of build.solution.bodies) {
        const mine = lab.scenario.bodies.find((b) => b.id === target.id);
        const diff = firstNodeDifference(mine, target, lab.scenario.T);
        if (diff) {
          setMessage({ ok: false, text: diff.kind === 'x0' ? `${target.label}'nin başlangıç konumunu yeniden oku.`
            : `${target.label} grafiğinin t = ${fmt(diff.t)} ${units.t} noktası soruyla uyuşmuyor (sende ${fmt(diff.actual)} ${units.v}). Sorudaki grafikte o anki hız kaç?` });
          return;
        }
      }
    }
    if (build.mode === 'points') {
      const motion = lab.motions[0];
      const miss = lab.scenario.target.points.find(([t, x]) => Math.abs(motion.x(t) - x) > 0.6);
      if (miss) {
        setMessage({ ok: false, text: `x–t çizgin t = ${fmt(miss[0])} ${units.t} halkasından geçmiyor: sende ${fmt(motion.x(miss[0]))} ${units.x}, tabloda ${fmt(miss[1])} ${units.x}.` });
        return;
      }
    }
    setBuildDone(true);
    setMessage({ ok: true, text: 'Model soruyla uyuşuyor. Şimdi oynatıp neler olduğunu izleyebilirsin.' });
  };

  const submitParameters = () => {
    const errors = {};
    const parsed = {};
    for (const field of build.fields) {
      const value = parseNumber(values[field.id]);
      parsed[field.id] = value;
      if (!Number.isFinite(value) || Math.abs(value - field.value) > 1e-6) errors[field.id] = field.hint;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setMessage({ ok: false, text: 'Bazı değerler soruyla uyuşmuyor; işaretli alanların ipucuna bak.' }); return; }
    lab.load(build.make(parsed), { keepLayers: true });
    setBuildDone(true);
    setMessage({ ok: true, text: 'Model kuruldu. Oynat ve cisimlerin nasıl hareket ettiğine bak.' });
  };

  const chooseVariant = (id) => {
    setVariant(id);
    const next = build.variants.find((v) => v.id === id);
    if (next.editable.linear) lab.updateBody(lab.scenario.bodies[0].id, (body) => straighten(body, lab.scenario.T));
  };

  const finalChoice = item.statements ? choiceFor(item, prediction) : predictedChoice;
  const statementsReady = item.statements ? item.statements.every((s) => prediction[s.id] != null) : predictedChoice != null;
  const allObserved = observed.size >= item.observe.length;

  const answerTwin = (letter) => {
    setTwinChoice(letter);
    onRecord({ done: true, predictOk: finalChoice === item.answer, twinOk: letter === item.twin.answer, assisted });
  };

  const buildPanel = step === 2 && <div className="st-build-panel">
    <p className="st-intro">{build.intro}</p>
    {build.variants && <div className="st-variants" role="radiogroup" aria-label="Durum">
      {build.variants.map((v) => <label key={v.id} className={`ml-layer${variant === v.id ? ' on' : ''}`}>
        <input type="radio" name={`${item.id}-variant`} checked={variant === v.id} onChange={() => chooseVariant(v.id)} /> {v.label}</label>)}
    </div>}
    {liveMode && <ul className="st-checks">{build.checks.map((check) => {
      if (check.info) return <li key={check.id} className="info"><span>{check.label}</span><strong>{check.info(lab.motions)}</strong></li>;
      const ok = check.test(lab.motions, lab.scenario);
      return <li key={check.id} className={ok ? 'ok' : 'bad'}><span>{check.label}</span><strong>{ok ? '✓ evet' : '✗ hayır'}</strong></li>;
    })}</ul>}
    {liveMode && <ul className="st-found">{build.found.map((f) => <li key={f.id} className={found.has(f.id) ? 'done' : ''}>
      <span aria-hidden="true">{found.has(f.id) ? '★' : '☆'}</span> {found.has(f.id) ? f.label : `${build.require.includes(f.id) ? 'Bulunacak' : 'İsteğe bağlı'}: ${f.label.split(':')[0]}`}</li>)}</ul>}
    {build.note && <p className="muted small">{build.note}</p>}
    {['match', 'points'].includes(build.mode) && !buildDone && <button type="button" className="btn btn-primary" onClick={checkModel}>Kontrol et</button>}
    {message && <p className={message.ok ? 'st-ok' : 'st-bad'} role="status">{message.text}</p>}
    {!requirementMet && <button type="button" className="btn btn-secondary btn-sm" onClick={assist}>{liveMode ? 'Bana örnekleri göster' : 'Modeli benim yerime kur'}</button>}
  </div>;

  return <div className="st-item">
    <Stepper step={step} reached={reached} onStep={goTo} />
    <div className="st-toolbar"><button type="button" className="btn btn-secondary btn-sm" aria-pressed={!showQuestion}
      onClick={() => setShowQuestion((v) => !v)}>{showQuestion ? 'Soruyu gizle (laboratuvarı genişlet)' : 'Soruyu göster'}</button></div>
    <div className={`st-work${showQuestion ? '' : ' solo'}`}>
      {showQuestion && <QuestionPanel item={item} />}
      <div className="st-stage">
        {step === 0 && <section className="card st-card">
          <h3>1 · Oku ve tanı</h3>
          <p className="muted">Soruyu oku. Çözmeden önce tek bir şeye karar ver: bu soru hangi fikirle çözülür?</p>
          <Choices name={`${item.id}-rec`} prompt={item.recognize.prompt} options={item.recognize.options} chosen={recognized} onChoose={setRecognized} />
          <div className="st-nav"><button type="button" className="btn btn-primary" disabled={recognized == null} onClick={() => goTo(1)}>Tahmine geç ▶</button></div>
        </section>}

        {step === 1 && <section className="card st-card">
          <h3>2 · Tahmin et</h3>
          <p className="muted">Simülasyonu görmeden kararını ver. Yanılsan da sorun değil: tahmin etmek, izlediğini anlamlı kılar.</p>
          {item.statements ? <div className="st-predict">
            {item.statements.map((s) => <div key={s.id} className="st-predict-row">
              <span><strong>{s.id}.</strong> {s.text}</span>
              <span className="st-yesno" role="group" aria-label={`${s.id}. yargı`}>
                {[[true, item.statementLabels.yes], [false, item.statementLabels.no]].map(([value, label]) => <button key={label} type="button" disabled={locked}
                  className={`btn btn-sm ${prediction[s.id] === value ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={prediction[s.id] === value}
                  onClick={() => setPrediction((current) => ({ ...current, [s.id]: value }))}>{label}</button>)}
              </span>
            </div>)}
            {statementsReady && <p className="st-derived">{finalChoice ? <>Tahminin şu şıkka karşılık geliyor: <strong>{finalChoice}) {item.choices[finalChoice]}</strong></>
              : 'Bu tahmin hiçbir şıkka uymuyor. Şıkların yapısı da ipucudur: yeniden düşün.'}</p>}
          </div> : <div className="st-letters" role="group" aria-label="Şık seç">
            {Object.entries(item.choices).map(([key, text]) => <button key={key} type="button" disabled={locked}
              className={`btn ${predictedChoice === key ? 'btn-primary' : 'btn-secondary'} st-option`} onClick={() => setPredictedChoice(key)}>{key}) {text}</button>)}
          </div>}
          <div className="st-nav">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(0)}>◀ Geri</button>
            {!locked ? <button type="button" className="btn btn-primary" disabled={!statementsReady || (item.statements && !finalChoice)}
              onClick={() => { setLocked(true); goTo(2); }}>Tahminimi kaydet ve modeli kur ▶</button>
              : <button type="button" className="btn btn-primary" onClick={() => goTo(2)}>Modeli kur ▶</button>}
          </div>
        </section>}

        {step === 2 && <section className="st-card-plain">
          <h3>3 · Modeli kur</h3>
          {build.mode === 'parameters' && !buildDone && <form className="card st-params" onSubmit={(e) => { e.preventDefault(); submitParameters(); }}>
            <p className="st-intro">{build.intro}</p>
            <div className="st-fields">{build.fields.map((field) => <label key={field.id} className={`field${fieldErrors[field.id] ? ' has-error' : ''}`}>
              <span className="field-label">{field.label} ({field.unit})</span>
              <input inputMode="decimal" value={values[field.id]} onChange={(e) => setValues((current) => ({ ...current, [field.id]: e.target.value }))} placeholder="?" />
              {fieldErrors[field.id] && <span className="field-error">{fieldErrors[field.id]}</span>}
            </label>)}</div>
            <div className="st-nav"><button type="submit" className="btn btn-primary">Modeli kur</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={assist}>Benim yerime doldur</button></div>
            {message && !message.ok && <p className="st-bad" role="status">{message.text}</p>}
          </form>}
          {(build.mode !== 'parameters' || buildDone) && <MotionLab lab={lab} editable={editable} lead={buildPanel} compact
            onReset={editable ? () => { lab.load(build.start, { keepLayers: true }); setMessage(null); } : undefined} />}
          <div className="st-nav">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(1)}>◀ Geri</button>
            <button type="button" className="btn btn-primary" disabled={!requirementMet} onClick={() => goTo(3)}>Simüle et ve gözle ▶</button>
          </div>
        </section>}

        {step === 3 && <section className="st-card-plain">
          <h3>4 · Simüle et ve gözle</h3>
          <MotionLab lab={lab} compact lead={<div className="st-observe">
            <p className="muted small">Kilit anlar: her birine tıkla, laboratuvar o ana gider ve ilgili katmanı açar. İstersen baştan oynat.</p>
            <ol>{item.observe.map((obs, i) => <li key={i} className={`${obsIndex === i ? 'active' : ''}${observed.has(i) ? ' seen' : ''}`}>
              <button type="button" onClick={() => show(i)}><span className="st-step-no">{i + 1}</span><span>{obs.text}</span></button>
            </li>)}</ol>
          </div>} />
          {allObserved && <section className="card st-report">
            <h4>Karne: tahminin ve gerçek</h4>
            {item.statements ? <ul>{item.statements.map((s) => {
              const ok = prediction[s.id] === s.truth;
              return <li key={s.id} className={ok ? 'ok' : 'bad'}><strong>{s.id}.</strong> {s.truth ? item.statementLabels.yes : item.statementLabels.no} — {s.why}
                <span className="st-verdict">{ok ? '✓ tahminin doğru' : `✗ sen "${prediction[s.id] ? item.statementLabels.yes : item.statementLabels.no}" demiştin`}</span></li>;
            })}</ul> : null}
            <p className={finalChoice === item.answer ? 'st-ok' : 'st-bad'}>Doğru cevap: <strong>{item.answer}) {item.choices[item.answer]}</strong>
              {finalChoice === item.answer ? ' · tahminin tuttu.' : finalChoice ? ` · senin tahminin ${finalChoice} idi.` : ''}</p>
          </section>}
          <div className="st-nav">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(2)}>◀ Model</button>
            <button type="button" className="btn btn-primary" disabled={!allObserved} onClick={() => goTo(4)}>{allObserved ? 'Mantığı kur ▶' : `Kilit anları gör (${observed.size}/${item.observe.length})`}</button>
          </div>
        </section>}

        {step === 4 && <section className="card st-card">
          <h3>5 · Mantığı kur</h3>
          <h4>Çözüm</h4>
          <ol className="st-solution">{item.solution.map((line) => <li key={line}>{line}</li>)}</ol>
          <div className="st-rule"><strong>Kalıp</strong><p>{item.rule}</p></div>
          <div className="st-trap"><strong>Tuzak</strong><p>{item.trap}</p></div>
          <Choices name={`${item.id}-exp`} prompt={`Kendi cümlenle: ${item.explain.prompt}`} options={item.explain.options} chosen={explained} onChoose={setExplained} />
          <div className="st-nav">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(3)}>◀ Simülasyon</button>
            <button type="button" className="btn btn-primary" disabled={explained == null} onClick={() => goTo(5)}>İkiz soruya geç ▶</button>
          </div>
        </section>}

        {step === 5 && <section className="card st-card">
          <h3>6 · İkiz soru</h3>
          <p className="muted">Aynı fikir, farklı sayılar. Bu kez simülasyon yok: önce kendin çöz.</p>
          <p className="st-twin-stem">{item.twin.stem}</p>
          <div className="st-letters" role="group" aria-label="İkiz soru şıkları">
            {Object.entries(item.twin.choices).map(([key, text]) => <button key={key} type="button" disabled={twinChoice != null}
              className={`btn btn-secondary st-option${twinChoice === key ? (key === item.twin.answer ? ' ok' : ' bad') : ''}${twinChoice != null && key === item.twin.answer ? ' right' : ''}`}
              onClick={() => answerTwin(key)}>{key}) {text}</button>)}
          </div>
          {twinChoice != null && <>
            <p className={twinChoice === item.twin.answer ? 'st-ok' : 'st-bad'} role="status">
              {twinChoice === item.twin.answer ? 'Doğru! Kalıbı yardımsız uyguladın.' : `Doğru cevap ${item.twin.answer}.`} {item.twin.explanation}</p>
            {item.twin.scenario && <details className="st-twin-lab"><summary>İkiz soruyu simülasyonda gör</summary><TwinLab scenario={item.twin.scenario} /></details>}
            {record?.done && <p className="muted small">Bu soru tamamlandı olarak kaydedildi{assisted ? ' (model kurulurken yardım alındı)' : ''}.</p>}
          </>}
          <div className="st-nav"><button type="button" className="btn btn-secondary" onClick={() => goTo(4)}>◀ Mantık</button></div>
        </section>}
      </div>
    </div>
  </div>;
}

/** Soru stüdyosu: soru listesi + seçili sorunun öğrenme döngüsü. */
export default function Studio({ activeId, onSelect, progress, onRecord }) {
  const item = STUDIO.find((s) => s.id === activeId) ?? STUDIO[0];
  const doneCount = useMemo(() => STUDIO.filter((s) => progress[s.id]?.done).length, [progress]);
  return <div className="st">
    <nav className="st-list" aria-label="Sorular">
      <p className="muted small">{doneCount}/{STUDIO.length} soru tamamlandı</p>
      {STUDIO.map((s, i) => <button key={s.id} type="button" className={`st-list-item${s.id === item.id ? ' active' : ''}${progress[s.id]?.done ? ' done' : ''}`}
        onClick={() => onSelect(s.id)} aria-current={s.id === item.id ? 'true' : undefined}>
        <span className="st-step-no">{progress[s.id]?.done ? '✓' : i + 1}</span>
        <span><strong>{s.title}</strong><small>{s.source ? `Çıkmış soru · ${s.source.label}` : 'Özgün soru'}</small></span>
      </button>)}
    </nav>
    <StudioItem key={item.id} item={item} record={progress[item.id]} onRecord={(value) => onRecord(item.id, value)} />
  </div>;
}
