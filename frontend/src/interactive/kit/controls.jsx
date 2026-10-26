import { Fragment, useEffect, useId, useState } from 'react';
import Segmented from '../../components/Segmented.jsx';
import { clamp, fmt, parseNumber } from './num.js';

/** Kaydırıcı + yazılabilir sayı kutusu: öğrenci sorudaki değeri tam olarak girebilir. */
export function Slider({ label, value, onChange, min, max, step = 1, unit = '', digits = 2, hint }) {
  const id = useId();
  const [text, setText] = useState(fmt(value, digits));
  useEffect(() => { setText(fmt(value, digits)); }, [value, digits]);
  return <div className="kit-slider">
    <div className="kit-slider-head">
      <label htmlFor={`${id}-r`}>{label}</label>
      <span className="kit-slider-value">
        <input value={text} inputMode="decimal" aria-label={`${typeof label === 'string' ? label : 'Değer'} (yazarak gir)`}
          onChange={(e) => { setText(e.target.value); const v = parseNumber(e.target.value); if (Number.isFinite(v)) onChange(v); }}
          onBlur={() => setText(fmt(value, digits))} />
        {unit && <span className="kit-unit">{unit}</span>}
      </span>
    </div>
    <input id={`${id}-r`} type="range" min={min} max={max} step={step} value={clamp(value, min, max)} onChange={(e) => onChange(Number(e.target.value))} />
    {hint && <small className="muted">{hint}</small>}
  </div>;
}

/** Tek sayı alanı (kaydırıcısız). */
export function NumberField({ label, value, onChange, unit = '', digits = 3, width }) {
  const [text, setText] = useState(fmt(value, digits));
  useEffect(() => { setText(fmt(value, digits)); }, [value, digits]);
  return <label className="kit-number" style={width ? { width } : undefined}>
    <span>{label}</span>
    <span className="kit-number-box">
      <input value={text} inputMode="decimal" onChange={(e) => { setText(e.target.value); const v = parseNumber(e.target.value); if (Number.isFinite(v)) onChange(v); }}
        onBlur={() => setText(fmt(value, digits))} />
      {unit && <span className="kit-unit">{unit}</span>}
    </span>
  </label>;
}

/** Serbest metin/ifade alanı; hata iletisi altında görünür. */
export function TextField({ label, value, onChange, error, placeholder, hint, wide = false }) {
  return <label className={`kit-text${wide ? ' wide' : ''}${error ? ' has-error' : ''}`}>
    <span>{label}</span>
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoCapitalize="off" />
    {error ? <small className="field-error">{error}</small> : hint ? <small className="muted">{hint}</small> : null}
  </label>;
}

export function Toggle({ label, checked, onChange }) {
  return <label className={`ml-layer${checked ? ' on' : ''}`}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}

export function Choice({ label, options, value, onChange }) {
  return <div className="kit-choice">
    {label && <span className="kit-choice-label">{label}</span>}
    <Segmented label={typeof label === 'string' ? label : 'Seçim'} options={options} value={value} onChange={onChange} />
  </div>;
}

/** Okuma listesi: [etiket, değer, vurgu?]. */
export function Readouts({ items, title }) {
  return <section className="kit-readouts">
    {title && <h4>{title}</h4>}
    <dl>{items.filter(Boolean).map(([label, value, tone]) => <Fragment key={label}>
      <dt>{label}</dt><dd className={tone ? `tone-${tone}` : undefined}>{value}</dd>
    </Fragment>)}</dl>
  </section>;
}

/** x^2, v_0, a^(n+1) gibi yazımları üst/alt simgeyle gösterir. */
export function MathText({ text, className = '' }) {
  const parts = [];
  // Matematiksel eksi: " - " ve "(-2" gibi yerlerde gerçek eksi işareti.
  const source = String(text ?? '').replace(/ - /g, ' − ').replace(/(^|[\s(=;,[/])-(?=[\d(√|a-zA-Zπ])/g, '$1−');
  const pattern = /\^(\([^()]*\)|[-−]?[0-9A-Za-zπ.,/]+)|_(\{[^}]*\}|\d+|[A-Za-zı](?![A-Za-zı]))/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(source))) {
    if (match.index > last) parts.push(source.slice(last, match.index));
    if (match[1] !== undefined) parts.push(<sup key={match.index}>{match[1].replace(/^\((.*)\)$/, '$1')}</sup>);
    else parts.push(<sub key={match.index}>{match[2].replace(/^\{(.*)\}$/, '$1')}</sub>);
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return <span className={`kit-math ${className}`}>{parts}</span>;
}

/** Denklem satırları: genel formül → değerler yerine konmuş → sonuç. */
export function Steps({ title, lines }) {
  return <section className="kit-steps">
    {title && <h4>{title}</h4>}
    <ol>{lines.filter(Boolean).map((line, i) => <li key={i}><MathText text={line} /></li>)}</ol>
  </section>;
}

export function Note({ tone = 'info', children }) {
  return <div className={`kit-note ${tone}`}>{children}</div>;
}

/** Standart yerleşim: solda görsel, sağda denetimler; dar kapsayıcıda alt alta. */
export function LabGrid({ visual, side, top }) {
  return <div className="kit-lab">
    {top && <div className="kit-top">{top}</div>}
    <div className="kit-body">
      <div className="kit-visual">{visual}</div>
      <aside className="kit-side">{side}</aside>
    </div>
  </div>;
}

export function Panel({ title, children, className = '' }) {
  return <section className={`kit-panel ${className}`}>{title && <h4>{title}</h4>}{children}</section>;
}
