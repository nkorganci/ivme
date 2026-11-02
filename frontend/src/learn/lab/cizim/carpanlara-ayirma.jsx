// Çarpanlara Ayırma laboratuvarı çizimleri: dört parselli alan, iki kare farkı (L → dikdörtgen), cebir karoları,
// asıl/sadeleşmiş ifade değer tablosu.
import { fmt } from '../sayi.js';
import { original, simplified } from '../konular/carpanlara-ayirma.js';

function Area4({ result }) {
  const X = 80, Y = 60, s = 14;
  const w = X + result.p * s, h = Y + result.q * s;
  const ok = result.cx === 3 && result.cy === 2;
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`(x+${result.p})(y+${result.q}) alanı: xy + ${result.cx}x + ${result.cy}y + ${result.c}`}>
    <g transform="translate(20,14)">
      <rect x="0" y="0" width={X} height={Y} className="tl-rect" /><text x={X / 2} y={Y / 2 + 4} textAnchor="middle" className="tl-svg-label">xy</text>
      <rect x={X} y="0" width={w - X} height={Y} className="tl-bar tl-bar-odd" />{result.p > 0 && <text x={X + (w - X) / 2} y={Y / 2 + 4} textAnchor="middle" className="tl-svg-small">{result.p}y</text>}
      <rect x="0" y={Y} width={X} height={h - Y} className="tl-bar tl-bar-odd" />{result.q > 0 && <text x={X / 2} y={Y + (h - Y) / 2 + 4} textAnchor="middle" className="tl-svg-small">{result.q}x</text>}
      <rect x={X} y={Y} width={w - X} height={h - Y} className="tl-rect tl-rect-bad" />
      <text x={X / 2} y="-2" textAnchor="middle" className="tl-svg-small">x</text><text x={X + (w - X) / 2} y="-2" textAnchor="middle" className="tl-svg-small">{result.p}</text>
      <text x="-12" y={Y / 2} className="tl-svg-small">y</text><text x="-12" y={Y + (h - Y) / 2 + 4} className="tl-svg-small">{result.q}</text>
    </g>
    <text x="215" y="50" className="tl-svg-label">{ok ? 'Parseller eşleşti ✓' : 'Eşleşmiyor'}</text>
    <text x="215" y="74" className="tl-svg-small">Hedef parseller:</text>
    <text x="215" y="90" className="tl-svg-small">xy, 3x, 2y, 6</text>
  </svg>;
}

function DiffSquares({ result }) {
  if (result.invalid) return <svg className="tl-svg" viewBox="0 0 360 60" role="img" aria-label="Geçersiz seçim"><text x="20" y="34" className="tl-svg-label">b, a’dan küçük olmalı</text></svg>;
  const u = 9, A = result.a * u, B = result.b * u;
  return <svg className="tl-svg" viewBox="0 0 360 140" role="img" aria-label={`${result.a} kare eksi ${result.b} kare = ${result.a - result.b} çarpı ${result.a + result.b}`}>
    <rect x="14" y="14" width={A} height={A} className="tl-rect" /><rect x={14 + A - B} y={14 + A - B} width={B} height={B} style={{ fill: 'var(--surface)', stroke: 'var(--warn)', strokeDasharray: '4 3' }} />
    <text x={14 + A / 2} y={A + 30} textAnchor="middle" className="tl-svg-small">a² − b² (L şekli)</text>
    <rect x="150" y="30" width={Math.min(200, (result.a + result.b) * u * 0.9)} height={(result.a - result.b) * u} className="tl-rect" />
    <text x="152" y="24" className="tl-svg-small">(a + b) = {result.a + result.b}</text>
    <text x="150" y={42 + (result.a - result.b) * u} className="tl-svg-small">(a − b) = {result.a - result.b} · alan {result.diff}</text>
  </svg>;
}

function Tiles({ result }) {
  const big = 54, u = 9;
  const W = big + Math.abs(result.p) * u, H = big + Math.abs(result.q) * u;
  const negCls = (v) => (v < 0 ? 'tl-rect tl-rect-bad' : 'tl-bar tl-bar-odd');
  return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`(x ${result.p})(x ${result.q}) karo modeli`}>
    <g transform="translate(20,20)">
      <rect x="0" y="0" width={big} height={big} className="tl-rect" /><text x={big / 2} y={big / 2 + 4} textAnchor="middle" className="tl-svg-label">x²</text>
      {Array.from({ length: Math.abs(result.p) }, (_, i) => <rect key={`p${i}`} x={big + i * u} y="0" width={u - 1} height={big} className={negCls(result.p)} />)}
      {Array.from({ length: Math.abs(result.q) }, (_, i) => <rect key={`q${i}`} x="0" y={big + i * u} width={big} height={u - 1} className={negCls(result.q)} />)}
      {Array.from({ length: Math.abs(result.p * result.q) }, (_, i) => <rect key={`c${i}`} x={big + (i % Math.max(1, Math.abs(result.p))) * u} y={big + Math.floor(i / Math.max(1, Math.abs(result.p))) * u} width={u - 1} height={u - 1} className={result.p * result.q < 0 ? 'tl-rect tl-rect-bad' : 'tl-rect'} />)}
    </g>
    <text x={Math.max(150, W + 40)} y="50" className="tl-svg-label">{result.b >= 0 ? '+' : '−'}{Math.abs(result.b)} x-şeridi</text>
    <text x={Math.max(150, W + 40)} y="74" className="tl-svg-label">{result.c >= 0 ? '+' : '−'}{Math.abs(result.c)} birim kare</text>
    <text x={Math.max(150, W + 40)} y="98" className="tl-svg-small">kırmızı kesikli: negatif</text>
    <text x="20" y={Math.min(156, H + 36)} className="tl-svg-small">hedef: 7 şerit, 12 birim</text>
  </svg>;
}

function Cancel({ result }) {
  const xs = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const cell = (v) => (v === null ? '—' : fmt(v, 2));
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`x=${result.x}: asıl ${result.o === null ? 'tanımsız' : fmt(result.o, 2)}, sade ${result.s === null ? 'tanımsız' : fmt(result.s, 2)}`}>
    <text x="4" y="40" className="tl-svg-small">asıl</text><text x="4" y="70" className="tl-svg-small">sade</text><text x="4" y="16" className="tl-svg-small">x</text>
    {xs.map((x, i) => <g key={x}>
      {x === result.x && <rect x={34 + i * 30} y="2" width="30" height="80" style={{ fill: 'var(--tint)' }} />}
      <text x={49 + i * 30} y="16" textAnchor="middle" className="tl-svg-small">{x}</text>
      <text x={49 + i * 30} y="40" textAnchor="middle" className="tl-svg-small" style={{ fill: original(x) === null ? 'var(--warn)' : undefined }}>{cell(original(x))}</text>
      <text x={49 + i * 30} y="70" textAnchor="middle" className="tl-svg-small" style={{ fill: simplified(x) === null ? 'var(--warn)' : undefined }}>{cell(simplified(x))}</text>
    </g>)}
    <text x="4" y="108" className="tl-svg-small">— : payda sıfır (tanımsız)</text>
  </svg>;
}

export default { area4: Area4, 'diff-squares': DiffSquares, tiles: Tiles, cancel: Cancel };
