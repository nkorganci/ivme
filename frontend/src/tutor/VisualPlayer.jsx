import { useEffect, useMemo, useState } from 'react';
import { frameState, validateVisual } from './visualSpec.js';
import { prefersReducedMotion } from './visuals/svg.js';
import NumberLine from './visuals/NumberLine.jsx';
import Timeline from './visuals/Timeline.jsx';
import Plot from './visuals/Plot.jsx';
import Geometry from './visuals/Geometry.jsx';
import Diagram from './visuals/Diagram.jsx';
import Venn from './visuals/Venn.jsx';
import Tokens from './visuals/Tokens.jsx';
import BarModel from './visuals/BarModel.jsx';
import Grid from './visuals/Grid.jsx';
import Particles from './visuals/Particles.jsx';
import Motion from './visuals/Motion.jsx';
import SunAngle from './visuals/SunAngle.jsx';
import TruthTable from './visuals/TruthTable.jsx';
import Circuit from './visuals/Circuit.jsx';

const COMPONENTS = {
  'number-line': NumberLine, timeline: Timeline, plot: Plot, geometry: Geometry, diagram: Diagram, venn: Venn,
  tokens: Tokens, 'bar-model': BarModel, grid: Grid, particles: Particles, motion: Motion, 'sun-angle': SunAngle,
  'truth-table': TruthTable, circuit: Circuit,
};
const SLIDER_TEMPLATES = new Set(['plot', 'particles']);

/** Otomatik oynatmada kare süresi alt yazının okunma süresine göre uzar (en az 2,6 sn). */
const readingTime = (caption = '') => Math.min(9000, Math.max(2600, 1200 + caption.length * 45));

/**
 * Tahmin et → izle → açıkla: tahmin sorusu varsa görsel tahminden sonra açılır; kareler öğrencinin
 * hızında ilerler (segmentasyon). Hareket azaltma tercihinde otomatik oynatma kapalıdır.
 */
export default function VisualPlayer({ visual, onPredict, busy = false, preview = false }) {
  const errors = useMemo(() => validateVisual({ recommended: true, ...visual }), [visual]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [values, setValues] = useState(() => Object.fromEntries((visual.params?.sliders ?? []).map((s) => [s.name, s.value])));
  const [localPredict, setLocalPredict] = useState(null);
  const frames = visual.frames ?? [];
  const state = frameState(visual, index);
  const predict = visual.predict;
  const result = predict?.result ?? localPredict;
  const locked = !!predict && !result;
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const set = frames[index]?.set;
    if (set) setValues((v) => ({ ...v, ...set }));
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= frames.length - 1) { setPlaying(false); return undefined; }
    const timer = setTimeout(() => setIndex((i) => Math.min(frames.length - 1, i + 1)), readingTime(frames[index]?.caption));
    return () => clearTimeout(timer);
  }, [playing, index, frames]);

  if (errors.length) {
    return <div className="alert alert-warn" role="status">Bu görsel çizilemedi; içerik öğretmen incelemesine bildirildi.</div>;
  }
  const Component = COMPONENTS[visual.template];
  const choosePredict = async (option) => {
    if (preview) { setLocalPredict({ optionId: option.id, correct: option.correct, feedback: option.feedback }); return; }
    await onPredict?.(option.id);
  };
  return <section className="tutor-visual" aria-label={visual.title}>
    <header className="tutor-visual-head">
      <h3>{visual.title}</h3>
      <p className="muted">{visual.reason}</p>
    </header>
    {predict && <div className={`tutor-predict${result ? ' done' : ''}`}>
      <p><strong>Önce tahmin et:</strong> {predict.prompt.replace(/^Önce tahmin et:\s*/u, '')}</p>
      <div className="tutor-options">
        {predict.options.map((option) => <button key={option.id} type="button" disabled={busy || !!result}
          className={`btn ${result?.optionId === option.id ? (result.correct ? 'btn-primary' : 'btn-secondary tutor-wrong') : 'btn-secondary'}`}
          onClick={() => choosePredict(option)}>{option.text}</button>)}
      </div>
      {result && <p className={result.correct ? 'tutor-ok' : 'tutor-bad'} role="status">{result.feedback}</p>}
    </div>}
    <div className={`tutor-visual-stage${locked ? ' locked' : ''}`} aria-hidden={locked}>
      {locked ? <p className="muted tutor-locked">Görsel, tahminini yaptıktan sonra açılır. Tahmin etmek, izlediğini anlamlı kılar.</p>
        : <Component params={visual.params} state={state} values={values} />}
    </div>
    {!locked && SLIDER_TEMPLATES.has(visual.template) && (visual.params.sliders ?? []).length > 0 && <div className="viz-controls">
      {visual.params.sliders.map((slider) => <label key={slider.name} className="viz-slider">{slider.label}: {String(values[slider.name]).replace('.', ',')}
        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={values[slider.name]}
          onChange={(e) => setValues((v) => ({ ...v, [slider.name]: Number(e.target.value) }))} /></label>)}
    </div>}
    {!locked && frames.length > 0 && <footer className="tutor-frames">
      <p key={index} className="tutor-caption" aria-live="polite"><span className="badge badge-primary">{index + 1}/{frames.length}</span> {state.caption}</p>
      <div className="tutor-frame-buttons">
        {frames.length > 1 && <span className="tutor-frame-dots" role="group" aria-label="Kareler">
          {frames.map((frame, i) => <button key={i} type="button" className={`tutor-frame-dot${i === index ? ' active' : i < index ? ' seen' : ''}`}
            aria-label={`Kare ${i + 1}`} aria-current={i === index ? 'step' : undefined} onClick={() => { setPlaying(false); setIndex(i); }} />)}
        </span>}
        <button type="button" className="btn btn-secondary btn-sm" disabled={index === 0} onClick={() => { setPlaying(false); setIndex((i) => i - 1); }}>◀ Önceki</button>
        {!reduced && frames.length > 1 && <button type="button" className={`btn btn-sm ${playing ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => { if (index >= frames.length - 1) setIndex(0); setPlaying((p) => !p); }}>{playing ? '⏸ Durdur' : index >= frames.length - 1 ? '↻ Baştan oynat' : '▶ Animasyonu oynat'}</button>}
        <button type="button" className="btn btn-secondary btn-sm" disabled={index >= frames.length - 1} onClick={() => { setPlaying(false); setIndex((i) => i + 1); }}>Sonraki ▶</button>
      </div>
    </footer>}
  </section>;
}
