import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, Loading } from '../../components/States.jsx';
import { MathText } from '../kit/controls.jsx';
import { pastQuestionsOf, unitKey } from '../registry.js';
import { useUnitProgress } from '../progress.js';

const TABS = [
  ['lab', 'Laboratuvar', 'Değerleri gir, değiştir, izle'],
  ['sorular', 'Sınav soruları', 'Soruyu laboratuvarda çöz'],
  ['kaliplar', 'Kalıplar', 'Soru tipi → nereye bakılır'],
  ['cikmis', 'Çıkmış sorular', 'Bu konunun gerçek soruları'],
];


/** Tek soru: tahmin et → laboratuvarda kur → gözle → sonucu gör. */
function QuestionRunner({ question, onSetup, record, onResult }) {
  const [predicted, setPredicted] = useState(null);
  const [applied, setApplied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const correct = predicted === question.answer;
  const apply = () => { onSetup(question.setup); setApplied(true); };
  const reveal = () => { setRevealed(true); onResult({ done: true, correct, assisted: applied }); };
  return <section className="card st-question qr" aria-label="Soru">
    <header>
      <span className="badge badge-primary">{question.exam ?? 'TYT'}{question.topic ? ` · ${question.topic}` : ''}</span>
      {record?.done && <span className={`badge ${record.correct ? 'badge-ok' : 'badge-warn'}`}>{record.correct ? 'Son deneme: doğru' : 'Son deneme: yanlış'}</span>}
    </header>
    <div className="qr-stem">{question.stem.split('\n').map((line, i) => <p key={i}><MathText text={line} /></p>)}</div>
    {question.statements && <ol className="st-statements">{question.statements.map((s, i) => <li key={i}><strong>{['I', 'II', 'III', 'IV', 'V'][i]}.</strong> <MathText text={s} /></li>)}</ol>}
    {question.ask && <p><strong>{question.ask}</strong></p>}
    <fieldset className="st-mc">
      <legend>{revealed ? 'Cevaplar' : predicted ? 'Tahminin kaydedildi; laboratuvarda doğrula.' : '1 · Önce tahmin et'}</legend>
      {Object.entries(question.choices).map(([key, text]) => <button key={key} type="button" disabled={revealed}
        className={`btn btn-secondary st-option${predicted === key ? ' picked' : ''}${revealed && key === question.answer ? ' right' : ''}${revealed && predicted === key && !correct ? ' bad' : ''}`}
        aria-pressed={predicted === key} onClick={() => setPredicted(key)}><strong>{key})</strong>&nbsp;<MathText text={text} /></button>)}
    </fieldset>
    <div className="qr-build">
      <p className="qr-step">2 · Laboratuvarda kur</p>
      <p><MathText text={question.build} /></p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={apply}>{applied ? '↻ Yeniden aktar' : 'Soruyu laboratuvara aktar'}</button>
      {applied && question.look && <p className="qr-look"><strong>3 · Gözle:</strong> <MathText text={question.look} /></p>}
    </div>
    {!revealed && <button type="button" className="btn btn-primary" disabled={!predicted} onClick={reveal}>{predicted ? 'Sonucu göster' : 'Önce bir şık seç'}</button>}
    {revealed && <div className={correct ? 'st-ok' : 'st-bad'} role="status">
      <p><strong>{correct ? 'Tahminin doğru.' : `Doğru cevap ${question.answer}) — senin tahminin ${predicted}).`}</strong></p>
      {question.explanation.split('\n').map((line, i) => <p key={i}><MathText text={line} /></p>)}
      {question.rule && <p className="qr-rule"><strong>Kalıp:</strong> <MathText text={question.rule} /></p>}
    </div>}
  </section>;
}

/** Laboratuvar + sınav soruları + kalıplar + çıkmış sorular: modül tabanlı ünitelerin ortak kabuğu. */
export default function ModuleUnit({ unit }) {
  const [params, setParams] = useSearchParams();
  const [mod, setMod] = useState(null);
  const [error, setError] = useState(null);
  const [state, setState] = useState(null);
  const [showQuestion, setShowQuestion] = useState(true);
  const [progress, record] = useUnitProgress(unitKey(unit).replace('/', '-'));
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'lab';
  const past = pastQuestionsOf(unit);

  useEffect(() => {
    let active = true;
    setMod(null); setError(null);
    unit.load().then((loaded) => { if (!active) return; setMod(loaded.default); setState(loaded.default.initial); })
      .catch((err) => active && setError(err));
    return () => { active = false; };
  }, [unit]);

  const questions = mod?.questions ?? [];
  const activeQuestion = useMemo(() => questions.find((q) => q.id === params.get('soru')) ?? questions[0], [questions, params]);
  const go = (next) => setParams((current) => { const p = new URLSearchParams(current); for (const [k, v] of Object.entries(next)) p.set(k, v); return p; }, { replace: true });

  if (error) return <ErrorBox error={error} />;
  if (!mod || !state) return <Loading text="Laboratuvar yükleniyor…" />;
  const { Lab } = mod;
  const doneCount = questions.filter((q) => progress.questions?.[q.id]?.done).length;

  return <>
    <nav className="tabs study-tabs il-tabs" aria-label="Ünite bölümleri">
      {TABS.map(([id, label, hint]) => <a key={id} href={`?tab=${id}`} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); go({ tab: id }); }}><span><strong>{label}{id === 'sorular' ? ` (${questions.length})` : id === 'cikmis' ? ` (${past.length})` : ''}</strong><small>{hint}</small></span></a>)}
    </nav>

    {tab === 'lab' && <div className="mu-lab">
      {mod.intro && <p className="muted mu-intro"><MathText text={mod.intro} /></p>}
      <Lab value={state} onChange={setState} />
      <div className="mu-reset"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setState(mod.initial)}>Başlangıç hâline dön</button></div>
    </div>}

    {tab === 'sorular' && <div className="st">
      <nav className="st-list" aria-label="Sorular">
        <p className="muted small">{doneCount}/{questions.length} soru tamamlandı · Her soruda önce tahmin et, sonra soruyu laboratuvara aktarıp doğrula.</p>
        {questions.map((q, i) => <button key={q.id} type="button" className={`st-list-item${q.id === activeQuestion?.id ? ' active' : ''}${progress.questions?.[q.id]?.done ? ' done' : ''}`}
          onClick={() => go({ soru: q.id })} aria-current={q.id === activeQuestion?.id ? 'true' : undefined}>
          <span className="st-step-no">{progress.questions?.[q.id]?.done ? '✓' : i + 1}</span>
          <span><strong>{q.title}</strong><small>{q.exam ?? 'TYT'}{q.topic ? ` · ${q.topic}` : ''}</small></span>
        </button>)}
      </nav>
      {activeQuestion && <div className="st-item">
        <div className="st-toolbar"><button type="button" className="btn btn-secondary btn-sm" aria-pressed={!showQuestion} onClick={() => setShowQuestion((v) => !v)}>
          {showQuestion ? 'Soruyu gizle (laboratuvarı genişlet)' : 'Soruyu göster'}</button></div>
        <div className={`st-work${showQuestion ? '' : ' solo'}`}>
          {showQuestion && <QuestionRunner key={activeQuestion.id} question={activeQuestion} record={progress.questions?.[activeQuestion.id]}
            onSetup={(setup) => setState(typeof setup === 'function' ? setup(mod.initial) : { ...mod.initial, ...setup })}
            onResult={(value) => record('questions', activeQuestion.id, value)} />}
          <div className="st-stage"><Lab value={state} onChange={setState} /></div>
        </div>
      </div>}
    </div>}

    {tab === 'kaliplar' && <div className="pm">
      <p className="muted">Bu ünitedeki soruların çoğu aşağıdaki kalıplardan birine girer. Soruda işareti gör → laboratuvarda nereye bakacağını bil → kuralı uygula.</p>
      <div className="pm-grid">{(mod.tips ?? []).map((tip) => <article key={tip.title} className="card pm-card">
        <h3>{tip.title}</h3>
        <dl>
          {tip.see && <><dt>Soruda görürsen</dt><dd><MathText text={tip.see} /></dd></>}
          {tip.look && <><dt>Laboratuvarda</dt><dd><MathText text={tip.look} /></dd></>}
          <dt>Kural</dt><dd><MathText text={tip.rule} /></dd>
          {tip.trap && <><dt>Tuzak</dt><dd><MathText text={tip.trap} /></dd></>}
        </dl>
      </article>)}</div>
    </div>}

    {tab === 'cikmis' && <div className="mu-past card">
      {past.length === 0 ? <p>Bu konu için veri setinde çıkmış soru yok; laboratuvar ve sınav soruları konuyu kapsar.</p> : <>
        <p className="muted">Bu konudaki gerçek sınav soruları ({past.length}). Bir soruyu aç, kalıbını bul, aynı durumu laboratuvarda kur.</p>
        <div className="mu-past-list">{past.map((q) => <Link key={q.code} className="ml-event-chip" to={`/soru/${encodeURIComponent(q.code)}`}>{q.exam} {q.year} · {q.code}</Link>)}</div>
      </>}
    </div>}
  </>;
}

