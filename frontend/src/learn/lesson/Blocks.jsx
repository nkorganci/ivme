import { useMemo, useState } from 'react';
import DataGrid from '../../components/DataGrid.jsx';
import Plot, { COLORS } from '../../interactive/kit/Plot.jsx';
import { Slider } from '../../interactive/kit/controls.jsx';
import { makeFunction } from '../../interactive/kit/mathExpr.js';
import { MathText, Markdown } from '../math.jsx';
import { LEVELS } from '../ui.jsx';
import { LessonQuestion, BankQuestion } from '../items.jsx';
import { rng, shuffle } from '../engine/random.js';
import NumberLine from './NumberLine.jsx';
import Exploration from './Exploration.jsx';
import FigureZoom from './FigureZoom.jsx';
import GuidedExam from './GuidedExam.jsx';
import DailyInquiry from './DailyInquiry.jsx';
import { WORKED_EXAMS } from '../content/worked-exams.js';

const colorOf = (name) => COLORS[name] ?? (name === 'ink' ? COLORS.ink : COLORS.navy);

/** Ders görsellerindeki SVG ders deposunda yazılır; yine de betik, olay niteliği ve dış bağlantı ayıklanır. */
function sanitizeSvg(svg) {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'svg' || doc.querySelector('parsererror')) return '';
  root.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((node) => node.remove());
  for (const node of [root, ...root.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'xlink:href') && !attr.value.startsWith('#'))) node.removeAttribute(attr.name);
    }
  }
  root.setAttribute('focusable', 'false');
  root.setAttribute('aria-hidden', 'true');
  return new XMLSerializer().serializeToString(root);
}

function Visual({ block }) {
  const html = useMemo(() => sanitizeSvg(block.svg), [block.svg]);
  return <figure className="lr-figure">
    <div className="lr-svg" role="img" aria-label={block.alt} dangerouslySetInnerHTML={{ __html: html }} />
    {block.caption && <figcaption><MathText text={block.caption} /></figcaption>}
    <FigureZoom><div className="lr-svg" role="img" aria-label={block.alt} dangerouslySetInnerHTML={{ __html: html }} /></FigureZoom>
  </figure>;
}

function plotItems(spec, params = {}) {
  const items = [];
  const extra = Object.keys(params);
  for (const area of spec.areas ?? []) {
    const fn = makeFunction(area.expr, 'x', extra);
    const base = area.base ? makeFunction(area.base, 'x', extra) : null;
    if (fn.f) items.push({ type: 'area', f: (x) => fn.f(x, params), base: base?.f ? (x) => base.f(x, params) : undefined, from: area.from, to: area.to, color: colorOf(area.color), opacity: 0.22 });
  }
  for (const line of spec.vlines ?? []) items.push({ type: 'vline', x: line.x, color: COLORS.warn });
  for (const line of spec.hlines ?? []) items.push({ type: 'hline', y: line.y, color: COLORS.warn });
  for (const fn of spec.fns ?? []) {
    const compiled = makeFunction(fn.expr, 'x', extra);
    if (compiled.f) items.push({ type: 'fn', f: (x) => compiled.f(x, params), color: colorOf(fn.color), dashed: fn.dashed, domain: fn.domain ?? undefined });
  }
  for (const segment of spec.segments ?? []) items.push({ type: 'segment', from: segment.from, to: segment.to, color: colorOf(segment.color), dashed: segment.dashed });
  for (const text of spec.texts ?? []) items.push({ type: 'text', x: text.x, y: text.y, text: text.text, color: colorOf(text.color) });
  for (const line of spec.vlines ?? []) if (line.label) items.push({ type: 'text', x: line.x, y: spec.y[1], dy: 14, dx: 4, text: line.label, color: COLORS.warn, small: true });
  for (const point of spec.points ?? []) items.push({ type: 'point', x: point.x, y: point.y, label: point.label, color: colorOf(point.color), hollow: point.hollow });
  return items;
}

function PlotBlock({ block }) {
  const { spec } = block;
  const legend = spec.fns.filter((fn) => fn.label);
  return <figure className="lr-figure">
    <Plot x={spec.x} y={spec.y} items={plotItems(spec)} piTicks={spec.pi} equal={spec.equal} ariaLabel={block.alt} xLabel={spec.xLabel ?? 'x'} yLabel={spec.yLabel ?? 'y'} height={320} />
    {legend.length > 0 && <p className="lr-legend small">{legend.map((fn) => <span key={fn.expr}><i style={{ background: colorOf(fn.color) }} /> <MathText text={fn.label} /></span>)}</p>}
    {block.caption && <figcaption><MathText text={block.caption} /></figcaption>}
  </figure>;
}

function SliderSim({ block }) {
  const { spec } = block;
  const [params, setParams] = useState(() => Object.fromEntries(spec.params.map((p) => [p.name, p.value])));
  return <section className="lr-slider-sim">
    {block.title && <h4><MathText text={block.title} /></h4>}
    <div className="lr-slider-grid">
      <Plot x={spec.x} y={spec.y} items={plotItems({ fns: spec.fns, x: spec.x, y: spec.y }, params)} ariaLabel={block.title || 'Etkileşimli grafik'} height={300} xLabel="x" yLabel="y" />
      <div className="lr-slider-controls">
        {spec.params.map((p) => <Slider key={p.name} label={p.name} value={params[p.name]} min={p.min} max={p.max} step={p.step}
          onChange={(value) => setParams((current) => ({ ...current, [p.name]: value }))} />)}
        <p className="small lr-slider-expr"><MathText text={spec.fns.map((fn) => fn.label || fn.expr).join(' · ')} /></p>
      </div>
    </div>
    {spec.prompt && <p className="lr-slider-prompt"><strong>Dene:</strong> <MathText text={spec.prompt} /></p>}
  </section>;
}

function TableBlock({ block }) {
  const columnDefs = useMemo(() => block.columns.map((name, i) => ({
    headerName: name.replace(/\$/g, ''), field: `c${i}`, flex: 1, minWidth: 110, wrapText: true, autoHeight: true, sortable: false, filter: false,
    cellRenderer: ({ value }) => <MathText text={value} />,
  })), [block.columns]);
  const rows = useMemo(() => block.rows.map((row, r) => ({ key: r, ...Object.fromEntries(row.map((cell, i) => [`c${i}`, cell])) })), [block.rows]);
  return <figure className="lr-figure lr-table">
    {block.caption && <figcaption className="lr-table-caption"><MathText text={block.caption} /></figcaption>}
    <DataGrid rowData={rows} columnDefs={columnDefs} mode="sheet" showSearch={false} fitContent={false} rowKey={(row) => row.key} />
  </figure>;
}

function Leveled({ block, level, setLevel }) {
  const available = LEVELS.filter((l) => block.levels[l.id]);
  const current = block.levels[level] ? level : 'L2';
  const meta = LEVELS.find((l) => l.id === current);
  return <section className="lr-leveled" data-level={current}>
    <div className="lr-leveled-head">
      <span className="lr-leveled-label">Seçtiğin anlatım: {meta?.label}</span>
      <div className="lr-level-switch" role="group" aria-label="Anlatım düzeyi">
        {available.map((l) => <button key={l.id} type="button" className={l.id === current ? 'active' : ''} aria-pressed={l.id === current} title={l.hint} onClick={() => setLevel(l.id)}>{l.label}</button>)}
      </div>
    </div>
    {block.title && <h4><MathText text={block.title} /></h4>}
    <div key={current} className="lr-leveled-body"><Markdown text={block.levels[current]} /></div>
    {current !== level && <p className="small muted">Bu kutuda “{LEVELS.find((l) => l.id === level)?.label}” anlatımı yok; en yakın anlatım gösteriliyor.</p>}
  </section>;
}

function Steps({ block, faded = false }) {
  const [open, setOpen] = useState({});
  const [shown, setShown] = useState(1);
  const [notes, setNotes] = useState({});
  const allRevealed = shown >= block.steps.length && block.steps.every((s, i) => !s.hidden || open[i]);
  return <section className={`lr-worked${faded ? ' faded' : ''}`}>
    <h4>{faded ? 'Sıra sende' : 'Çözümlü örnek'}{block.title ? `: ${block.title}` : ''}</h4>
    {block.problem && <div className="lr-worked-problem"><Markdown text={block.problem} /></div>}
    <p className="small muted">{faded ? 'Eksik adımda önce kendi işlemini yaz. Sonra çözümle karşılaştır.' : 'Her adımda ne yaptığımıza ve neden yaptığımıza birlikte bakalım.'}</p>
    <ol className="lr-steps lr-guided-steps">
      {block.steps.slice(0, shown).map((step, i) => <li key={i}>
        {step.hidden && !open[i]
          ? <div className="lr-step-hidden"><label>Bu adımda ne yapardın?<input aria-label={`${i + 1}. adım için düşüncen`} value={notes[i] || ''} onChange={(e) => setNotes((n) => ({ ...n, [i]: e.target.value }))} placeholder="İşlemini veya gerekçeni yaz…" /></label><button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((o) => ({ ...o, [i]: true }))}>Adımı göster</button></div>
          : <><Markdown text={step.text} />
            {notes[i] && <p className="small muted"><strong>Senin düşüncen:</strong> {notes[i]}</p>}
            {step.why && <p className="lr-why"><strong>Neden bu işlem?</strong> <MathText text={step.why} /></p>}</>}
      </li>)}
    </ol>
    {shown < block.steps.length && <div className="lr-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setShown((n) => n + 1)}>Sonraki çözüm adımı ({shown}/{block.steps.length})</button>
      <button type="button" className="lr-link small" onClick={() => setShown(block.steps.length)}>Bütün adımları incele</button></div>}
    {block.answer && allRevealed && <p className="lr-worked-answer"><strong>Sonuç ve kontrol:</strong> <MathText text={block.answer} /></p>}
  </section>;
}

function RevealSteps({ block }) {
  const [shown, setShown] = useState(1);
  return <section className="lr-reveal">
    {block.title && <h4><MathText text={block.title} /></h4>}
    {block.problem && <Markdown text={block.problem} />}
    <ol className="lr-steps">{block.steps.slice(0, shown).map((step, i) => <li key={i}><Markdown text={step.text} /></li>)}</ol>
    {shown < block.steps.length ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShown((v) => v + 1)}>Sonraki adım ({shown}/{block.steps.length})</button>
      : block.answer && <p className="lr-worked-answer"><MathText text={block.answer} /></p>}
  </section>;
}

function FlipCards({ block }) {
  const [flipped, setFlipped] = useState({});
  return <section className="lr-flips">
    {block.title && <h4><MathText text={block.title} /></h4>}
    <div className="lr-flip-grid">
      {block.cards.map((card, i) => <button key={i} type="button" className={`lr-flip${flipped[i] ? ' flipped' : ''}`} aria-pressed={!!flipped[i]}
        onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}>
        <MathText text={flipped[i] ? card.back : card.front} />
      </button>)}
    </div>
  </section>;
}

function parseAnswer(text) {
  const value = String(text).trim().replace(/\s+/g, '').replace(',', '.').replace('−', '-');
  const fraction = value.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return value === '' ? NaN : Number(value);
}

function FillBlank({ block, onResult, answered }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(answered ?? null);
  const check = () => {
    const numeric = parseAnswer(text);
    const correct = block.answers.some((answer) => {
      const expected = parseAnswer(answer);
      return Number.isFinite(expected) && Number.isFinite(numeric)
        ? Math.abs(expected - numeric) <= Math.max(block.tolerance, 1e-9)
        : answer.trim().toLocaleLowerCase('tr') === text.trim().toLocaleLowerCase('tr');
    });
    const value = { correct, chosen: text.slice(0, 40), confidence: 3 };
    setResult(value);
    onResult?.(value);
  };
  return <section className="lr-fill">
    <div className="lr-stem"><Markdown text={block.prompt} /></div>
    <div className="lr-fill-row">
      <input value={text} onChange={(e) => setText(e.target.value)} disabled={!!result} inputMode="decimal" aria-label="Cevabın"
        onKeyDown={(e) => e.key === 'Enter' && text.trim() && !result && check()} />
      {block.unit && <span className="muted">{block.unit}</span>}
      {!result && <button type="button" className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={check}>Kontrol et</button>}
    </div>
    {result && <div className={`lr-feedback ${result.correct ? 'good' : 'bad'}`} role="status">
      <p className="lr-feedback-title">{result.correct ? 'Doğru!' : `Cevap: ${block.answers[0]}`}</p>
      {block.explain && <Markdown text={block.explain} />}
    </div>}
  </section>;
}

function MatchPairs({ block, onResult, answered, seed }) {
  const rights = useMemo(() => shuffle(block.pairs.map((p) => p[1]), rng(`${block.id}:${seed}`)), [block, seed]);
  const [chosen, setChosen] = useState({});
  const [result, setResult] = useState(answered ?? null);
  const check = () => {
    const correct = block.pairs.every(([, right], i) => chosen[i] === right);
    const value = { correct, chosen: `${block.pairs.filter(([, right], i) => chosen[i] === right).length}/${block.pairs.length}`, confidence: 3 };
    setResult(value);
    onResult?.(value);
  };
  return <section className="lr-match">
    {block.title && <h4><MathText text={block.title} /></h4>}
    <ul>
      {block.pairs.map(([left, right], i) => <li key={i} className={result ? (chosen[i] === right ? 'good' : 'bad') : ''}>
        <span className="lr-match-left"><MathText text={left} /></span>
        <span className="lr-match-options" role="group" aria-label="Eşini seç">
          {rights.map((option) => <button key={option} type="button" disabled={!!result} className={chosen[i] === option ? 'selected' : ''} aria-pressed={chosen[i] === option}
            onClick={() => setChosen((c) => ({ ...c, [i]: option }))}><MathText text={option} /></button>)}
        </span>
        {result && chosen[i] !== right && <span className="small lr-match-fix">Doğrusu: <MathText text={right} /></span>}
      </li>)}
    </ul>
    {!result && <button type="button" className="btn btn-primary btn-sm" disabled={Object.keys(chosen).length < block.pairs.length} onClick={check}>Kontrol et</button>}
    {result && <p className={`lr-feedback ${result.correct ? 'good' : 'bad'}`} role="status">{result.correct ? 'Hepsi doğru eşleşti!' : `${result.chosen} doğru. Doğrularını yukarıda görebilirsin.`}</p>}
  </section>;
}

function DragOrder({ block, onResult, answered, seed }) {
  const [items, setItems] = useState(() => {
    let order = shuffle(block.items, rng(`${block.id}:${seed}`));
    if (order.join() === block.items.join()) order = [...order.slice(1), order[0]];
    return order;
  });
  const [result, setResult] = useState(answered ?? null);
  const move = (i, delta) => setItems((list) => {
    const next = [...list];
    const j = i + delta;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const check = () => {
    const correct = items.join('\u0001') === block.items.join('\u0001');
    const value = { correct, chosen: '', confidence: 3 };
    setResult(value);
    onResult?.(value);
  };
  return <section className="lr-order">
    {block.title && <h4><MathText text={block.title} /></h4>}
    <ol>
      {items.map((item, i) => <li key={item} className={result ? (block.items[i] === item ? 'good' : 'bad') : ''}>
        <span className="lr-order-text"><MathText text={item} /></span>
        {!result && <span className="lr-order-moves">
          <button type="button" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
          <button type="button" aria-label="Aşağı taşı" disabled={i === items.length - 1} onClick={() => move(i, 1)}>▼</button>
        </span>}
      </li>)}
    </ol>
    {!result && <button type="button" className="btn btn-primary btn-sm" onClick={check}>Kontrol et</button>}
    {result && <div className={`lr-feedback ${result.correct ? 'good' : 'bad'}`} role="status">
      <p className="lr-feedback-title">{result.correct ? 'Sıra doğru!' : 'Doğru sıra:'}</p>
      {!result.correct && <ol>{block.items.map((item) => <li key={item}><MathText text={item} /></li>)}</ol>}
    </div>}
  </section>;
}

function Categorize({ block, onResult, answered, seed }) {
  const all = useMemo(() => shuffle(block.groups.flatMap((g) => g.items.map((item) => ({ item, group: g.name }))), rng(`${block.id}:${seed}`)), [block, seed]);
  const [placed, setPlaced] = useState({});
  const [result, setResult] = useState(answered ?? null);
  const check = () => {
    const right = all.filter((entry) => placed[entry.item] === entry.group).length;
    const value = { correct: right === all.length, chosen: `${right}/${all.length}`, confidence: 3 };
    setResult(value);
    onResult?.(value);
  };
  return <section className="lr-sort">
    {block.title && <h4><MathText text={block.title} /></h4>}
    <ul>
      {all.map((entry) => <li key={entry.item} className={result ? (placed[entry.item] === entry.group ? 'good' : 'bad') : ''}>
        <span className="lr-sort-item"><MathText text={entry.item} /></span>
        <span className="lr-sort-groups" role="group" aria-label="Grubunu seç">
          {block.groups.map((g) => <button key={g.name} type="button" disabled={!!result} className={placed[entry.item] === g.name ? 'selected' : ''} aria-pressed={placed[entry.item] === g.name}
            onClick={() => setPlaced((p) => ({ ...p, [entry.item]: g.name }))}>{g.name}</button>)}
        </span>
        {result && placed[entry.item] !== entry.group && <span className="small lr-match-fix">→ {entry.group}</span>}
      </li>)}
    </ul>
    {!result && <button type="button" className="btn btn-primary btn-sm" disabled={Object.keys(placed).length < all.length} onClick={check}>Kontrol et</button>}
    {result && <p className={`lr-feedback ${result.correct ? 'good' : 'bad'}`} role="status">{result.correct ? 'Hepsi doğru grupta!' : `${result.chosen} doğru.`}</p>}
  </section>;
}

/**
 * Tek bir ders bloğu. ctx: { level, setLevel, onCheck(item, value), answers (önceki cevaplar), seed, archetypeTitle, answerBank, conceptId }.
 */
export function Block({ block, ctx }) {
  switch (block.type) {
    case 'exploration': return <Exploration conceptId={block.conceptId} level={ctx.level} />;
    case 'markdown': return <Markdown text={block.text} />;
    case 'key_idea': return <aside className="lr-key"><span className="lr-key-label">{block.title || 'Ana fikir'}</span><Markdown text={block.text} /></aside>;
    case 'note': return <aside className={`lr-note lr-note-${block.tone}`}>{block.title && <strong>{block.title}</strong>}<Markdown text={block.text} /></aside>;
    case 'leveled': return <Leveled block={block} level={ctx.level} setLevel={ctx.setLevel} />;
    case 'visual': return <Visual block={block} />;
    case 'plot': return <PlotBlock block={block} />;
    case 'numberline': return <NumberLine spec={block.spec} alt={block.alt} caption={block.caption} />;
    case 'table': return <TableBlock block={block} />;
    case 'quick_check': return <section className="lr-check"><span className="lr-check-label">Kontrol sorusu</span>
      <LessonQuestion question={block.question} initial={ctx.answers?.[block.question.id] ?? null} onAnswered={(value) => ctx.onCheck(block.question, value)} /></section>;
    case 'misconception': return <aside className="lr-misconception">
      <span className="lr-mis-label">Yaygın yanılgı</span>
      <p className="lr-mis-wrong"><span aria-hidden="true">✗</span> <MathText text={block.wrong} /></p>
      <p className="lr-mis-why"><strong>Neden yanlış?</strong> <MathText text={block.why} /></p>
      <p className="lr-mis-right"><span aria-hidden="true">✓</span> <MathText text={block.right} /></p>
    </aside>;
    case 'worked': return <Steps block={block} />;
    case 'faded': return <Steps block={block} faded />;
    case 'strategy': return <section className="lr-strategy">
      <h4>Strateji{block.archetype ? `: ${ctx.archetypeTitle?.(block.archetype) ?? ''}` : ''}{block.title ? ` — ${block.title}` : ''}</h4>
      {block.cue && <p className="lr-cue"><strong>Bunu görünce:</strong> <MathText text={block.cue} /></p>}
      <ol className="lr-steps">{block.steps.map((s, i) => <li key={i}><MathText text={s.text} /></li>)}</ol>
    </section>;
    case 'must_know': return <section className="lr-must"><h4>{block.title || 'Bilmen gerekenler'}</h4><ul>{block.items.map((item, i) => <li key={i}><MathText text={item} /></li>)}</ul></section>;
    case 'summary': return <section className="lr-summary"><h4>{block.title || 'Özet'}</h4><ul>{block.items.map((item, i) => <li key={i}><MathText text={item} /></li>)}</ul></section>;
    case 'reveal_steps': return <RevealSteps block={block} />;
    case 'flip_cards': return <FlipCards block={block} />;
    case 'fill_blank': return <FillBlank block={block} answered={ctx.answers?.[block.id]} onResult={(value) => ctx.onCheck(block, value)} />;
    case 'match_pairs': return <MatchPairs block={block} seed={ctx.seed} answered={ctx.answers?.[block.id]} onResult={(value) => ctx.onCheck(block, value)} />;
    case 'drag_order': return <DragOrder block={block} seed={ctx.seed} answered={ctx.answers?.[block.id]} onResult={(value) => ctx.onCheck(block, value)} />;
    case 'categorize': return <Categorize block={block} seed={ctx.seed} answered={ctx.answers?.[block.id]} onResult={(value) => ctx.onCheck(block, value)} />;
    case 'slider_sim': return <SliderSim block={block} />;
    case 'past_question': return <PastQuestion block={block} ctx={ctx} />;
    case 'inquiry': return <DailyInquiry block={block} />;
    default: return null;
  }
}

function PastQuestion({ block, ctx }) {
  const question = ctx.pastQuestion?.(block.code);
  const [open, setOpen] = useState(false);
  if (!question) return <aside className="lr-note">Bu örneğin özgün soru görseli şu anda yüklenemedi. Bölümdeki çözümlü örneklerle devam edebilirsin.</aside>;
  if (WORKED_EXAMS[block.code]) return <GuidedExam question={question} guide={WORKED_EXAMS[block.code]} />;
  return <section className="lr-past">
    <span className="lr-check-label">Çıkmış soruyla dene</span>
    {block.note && <p className="small"><MathText text={block.note} /></p>}
    {open ? <BankQuestion question={question} conceptId={ctx.conceptId} context="practice" archetypeId={block.archetype ?? question.archetype} answerBank={ctx.answerBank} />
      : <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>Soruyu aç ({question.year ?? ''} {question.exam})</button>}
  </section>;
}

export const CHECK_BLOCKS = new Set(['quick_check', 'fill_blank', 'match_pairs', 'drag_order', 'categorize']);
export const checkId = (block) => (block.type === 'quick_check' ? block.question.id : block.id);
