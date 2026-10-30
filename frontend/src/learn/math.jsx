import { Fragment } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Ders metni: hafif Markdown (paragraf, - madde, 1. sıralı, > not, **kalın**, *eğik*) ve KaTeX ($…$, $$…$$).
const cache = new Map();

function renderTex(tex, display) {
  const key = `${display ? 'D' : 'I'}${tex}`;
  if (!cache.has(key)) {
    let html;
    try {
      html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' });
    } catch {
      html = null;
    }
    cache.set(key, html);
  }
  return cache.get(key);
}

function Tex({ tex, display = false }) {
  const html = renderTex(tex, display);
  if (html == null) return <code>{tex}</code>;
  const Tag = display ? 'div' : 'span';
  return <Tag className={display ? 'lr-math-display' : 'lr-math'} dangerouslySetInnerHTML={{ __html: html }} />;
}

const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function inlineMarkdown(text, keyBase) {
  const parts = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={`${keyBase}b${i}`}>{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={`${keyBase}i${i}`}>{match[2]}</em>);
    else parts.push(<code key={`${keyBase}c${i}`}>{match[3]}</code>);
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Satır içi metin: matematik + kalın/eğik. Satır sonları <br> olur. */
export function MathText({ text, className = '' }) {
  const value = String(text ?? '');
  const out = [];
  let last = 0;
  let i = 0;
  for (const match of value.matchAll(MATH)) {
    if (match.index > last) out.push(...withBreaks(value.slice(last, match.index), `t${i}`));
    out.push(<Tex key={`m${i}`} tex={match[1] ?? match[2]} display={!!match[1]} />);
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < value.length) out.push(...withBreaks(value.slice(last), `t${i}`));
  return <span className={className}>{out}</span>;
}

function withBreaks(text, keyBase) {
  return text.split('\n').flatMap((line, i, all) => {
    const items = inlineMarkdown(line, `${keyBase}-${i}`);
    return i < all.length - 1 ? [...items, <br key={`${keyBase}-br${i}`} />] : items;
  });
}

/** Blok düzeyi: paragraflar, listeler, not kutuları, ayrı satırdaki $$…$$. */
export function Markdown({ text, className = '' }) {
  const lines = String(text ?? '').split('\n');
  const blocks = [];
  let current = null;
  const push = () => {
    if (current) blocks.push(current);
    current = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      push();
      continue;
    }
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    const ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);
    if (/^\$\$.*\$\$$/.test(line.trim()) && line.trim().length > 4) {
      push();
      blocks.push({ type: 'math', text: line.trim().slice(2, -2) });
    } else if (bullet) {
      if (current?.type !== 'ul') { push(); current = { type: 'ul', items: [] }; }
      current.items.push(bullet[1]);
    } else if (ordered) {
      if (current?.type !== 'ol') { push(); current = { type: 'ol', items: [], start: Number(ordered[1]) }; }
      current.items.push(ordered[2]);
    } else if (quote) {
      if (current?.type !== 'quote') { push(); current = { type: 'quote', lines: [] }; }
      current.lines.push(quote[1]);
    } else if (current && (current.type === 'ul' || current.type === 'ol') && /^\s{2,}/.test(raw)) {
      current.items[current.items.length - 1] += ` ${line.trim()}`;
    } else {
      if (current?.type !== 'p') { push(); current = { type: 'p', lines: [] }; }
      current.lines.push(line);
    }
  }
  push();
  return <div className={`lr-md ${className}`}>{blocks.map((block, i) => {
    switch (block.type) {
      case 'math': return <Tex key={i} tex={block.text} display />;
      case 'ul': return <ul key={i}>{block.items.map((item, j) => <li key={j}><MathText text={item} /></li>)}</ul>;
      case 'ol': return <ol key={i} start={block.start}>{block.items.map((item, j) => <li key={j}><MathText text={item} /></li>)}</ol>;
      case 'quote': return <aside key={i} className="lr-callout"><MathText text={block.lines.join('\n')} /></aside>;
      default: return <p key={i}><MathText text={block.lines.join('\n')} /></p>;
    }
  })}</div>;
}

export function Plain({ children }) {
  return <Fragment>{children}</Fragment>;
}
