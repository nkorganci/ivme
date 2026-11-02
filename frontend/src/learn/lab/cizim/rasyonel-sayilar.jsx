// Rasyonel Sayılar laboratuvarı çizimleri: ortak ızgaralı şeritler, eş bölmeli ölçek, devirli alt alta yazım, sayı doğrusu.
import { fmt } from '../sayi.js';
import { SCALE } from '../konular/rasyonel-sayilar.js';

function Parts({ result }) {
  const W = 300, x0 = 40, n = result.n;
  const strip = (y, d, label, fits) => <g>
    <text x="8" y={y + 22} className="tl-svg-label">{label}</text>
    <rect x={x0} y={y} width={W / d} height="34" className="tl-bar tl-bar-odd" />
    {Array.from({ length: d + 1 }, (_, i) => <line key={`d${i}`} x1={x0 + (i * W) / d} x2={x0 + (i * W) / d} y1={y - 4} y2={y + 38} className="tl-axis" />)}
    {Array.from({ length: n + 1 }, (_, i) => <line key={`n${i}`} x1={x0 + (i * W) / n} x2={x0 + (i * W) / n} y1={y} y2={y + 34} className="tl-mean" style={{ strokeWidth: 1 }} />)}
    <rect x={x0} y={y} width={W} height="34" className="tl-set" />
    <text x={x0 + W + 4} y={y + 22} className="tl-svg-small">{fits ? '✓' : '✗'}</text>
  </g>;
  return <svg className="tl-svg" viewBox="0 0 360 140" role="img" aria-label={`${n} parçalı ızgara: 1/3 ${result.fit3 ? 'uyuyor' : 'uymuyor'}, 1/4 ${result.fit4 ? 'uyuyor' : 'uymuyor'}`}>
    {strip(12, 3, '1/3', result.fit3)}{strip(70, 4, '1/4', result.fit4)}
    <text x="40" y="132" className="tl-svg-small">Kalın çizgi: kesrin sınırı · kesikli: {n} parçalı ortak ızgara</text>
  </svg>;
}

function Scale({ result }) {
  const x0 = 30, W = 300, n = SCALE.parts;
  const X = (k) => x0 + (k * W) / n;
  return <svg className="tl-svg" viewBox="0 0 360 134" role="img" aria-label={`Ölçekte ${result.k}. çizgi: ${fmt(result.value)}`}>
    <line x1={x0} x2={x0 + W} y1="60" y2="60" className="tl-axis" />
    {Array.from({ length: n + 1 }, (_, k) => <g key={k}><line x1={X(k)} x2={X(k)} y1={k % n === 0 ? 44 : 50} y2="70" className="tl-axis" />
      <text x={X(k)} y="102" textAnchor="middle" className="tl-svg-small">{k}</text></g>)}
    <text x={x0} y="36" textAnchor="middle" className="tl-svg-label">{SCALE.from}</text><text x={x0 + W} y="36" textAnchor="middle" className="tl-svg-label">{SCALE.to}</text>
    <path d={`M${X(result.k)},72 l-7,14 h14 z`} className="tl-dot-ok" />
    <text x={X(result.k)} y="126" textAnchor="middle" className="tl-svg-label tl-halo">{fmt(result.value)}</text>
  </svg>;
}

function Repeat({ result }) {
  const ab = `${result.a}${result.b}`;
  return <svg className="tl-svg" viewBox="0 0 360 140" role="img" aria-label={`100x eksi x eşittir ${result.a * 10 + result.b}`}>
    <text x="20" y="34" className="tl-svg-label" style={{ fontFamily: 'monospace', fontSize: 18 }}>100x = {ab},{ab}{ab}{ab}…</text>
    <text x="20" y="64" className="tl-svg-label" style={{ fontFamily: 'monospace', fontSize: 18 }}>{'   '}x = {' '}0,{ab}{ab}{ab}…</text>
    <line x1="20" x2="300" y1="76" y2="76" className="tl-axis" />
    <text x="20" y="102" className="tl-svg-label" style={{ fontFamily: 'monospace', fontSize: 18 }}>{' '}99x = {result.a * 10 + result.b}</text>
    <text x="20" y="128" className="tl-svg-small">Virgülden sonraki kuyruklar aynı: çıkarınca sıfırlanır.</text>
  </svg>;
}

function Between({ result }) {
  const lo = 0.8, hi = 0.9, X = (v) => 20 + ((Math.max(lo - 0.005, Math.min(hi + 0.005, v)) - lo) / (hi - lo)) * 320;
  return <svg className="tl-svg" viewBox="0 0 360 130" role="img" aria-label={`${result.p}/${result.q} sayı doğrusunda; 5/6 ile 6/7 ${result.inside ? 'arasında' : 'dışında'}`}>
    <line x1="20" x2="340" y1="70" y2="70" className="tl-axis" />
    {[0.8, 0.85, 0.9].map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="64" y2="76" className="tl-axis" /><text x={X(t)} y="96" textAnchor="middle" className="tl-svg-small">{fmt(t)}</text></g>)}
    <rect x={X(5 / 6)} y="60" width={X(6 / 7) - X(5 / 6)} height="20" className="tl-set tl-set-q" />
    <text x={X(5 / 6)} y="52" textAnchor="middle" className="tl-svg-small">5/6</text><text x={X(6 / 7)} y="52" textAnchor="middle" className="tl-svg-small">6/7</text>
    <circle cx={X(result.v)} cy="70" r="7" className={result.inside ? 'tl-dot-ok' : 'tl-dot'} />
    <text x={X(result.v)} y="120" textAnchor="middle" className="tl-svg-label tl-halo">{result.p}/{result.q}{result.v < lo || result.v > hi ? (result.v < lo ? ' ←' : ' →') : ''}</text>
  </svg>;
}

export default { parts: Parts, scale: Scale, repeat: Repeat, between: Between };
