// Sayı ve Kesir Problemleri laboratuvarı çizimleri: kuyruk, kesir şeridi, bilet sayımı, işlem zinciri.
import { fmt } from '../sayi.js';
import { CHAIN, QUEUE, TICKET } from '../konular/sayi-kesir-problemleri.js';

function Queue({ result }) {
  const w = Math.min(13, 330 / result.n);
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`${result.n} kişilik kuyruk; Ali baştan ${QUEUE.front}., sondan ${result.fromBack}.`}>
    {Array.from({ length: result.n }, (_, i) => <circle key={i} cx={16 + i * w + w / 2} cy="50" r={w / 2 - 1} className={i === QUEUE.front - 1 ? 'tl-dot' : 'tl-dot-ok'} />)}
    <text x="16" y="24" className="tl-svg-small">baş →</text>
    <text x={16 + (QUEUE.front - 1) * w + w / 2} y="80" textAnchor="middle" className="tl-svg-label">Ali</text>
    <text x="16" y="102" className="tl-svg-small">önünde {QUEUE.front - 1} · arkasında {result.n - QUEUE.front}</text>
  </svg>;
}

function Remain({ result }) {
  const W = 320, s = W / result.m;
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`Kira ${fmt(result.rent)}, fatura ${fmt(result.bill)}, kalan ${fmt(result.left)}`}>
    <rect x="20" y="24" width={result.rent * s} height="34" className="tl-bar" />
    <rect x={20 + result.rent * s} y="24" width={result.bill * s} height="34" className="tl-bar tl-bar-odd" />
    <rect x={20 + (result.rent + result.bill) * s} y="24" width={result.left * s} height="34" className={result.left === 900 ? 'tl-rect' : 'tl-set'} />
    <text x={20 + (result.rent * s) / 2} y="78" textAnchor="middle" className="tl-svg-small">kira ⅓</text>
    <text x={20 + result.rent * s + (result.bill * s) / 2} y="78" textAnchor="middle" className="tl-svg-small">fatura (kalanın ¼’ü)</text>
    <text x={20 + (result.rent + result.bill) * s + (result.left * s) / 2} y="78" textAnchor="middle" className="tl-svg-label">{fmt(result.left)}</text>
    <text x="20" y="102" className="tl-svg-small">Kalan = maaşın ½’si</text>
  </svg>;
}

function Tickets({ result }) {
  return <svg className="tl-svg" viewBox="0 0 360 100" role="img" aria-label={`${result.t} tam, ${result.s} öğrenci; ${result.sum} TL`}>
    {Array.from({ length: TICKET.total }, (_, i) => <rect key={i} x={16 + i * 16} y="20" width="13" height="30" rx="2" className={i < result.t ? 'tl-bar' : 'tl-bar tl-bar-odd'} />)}
    <text x="16" y="74" className="tl-svg-small">300 TL taban (hepsi 15) + {result.t} × 10 TL = {result.sum} TL</text>
  </svg>;
}

function Chain({ result }) {
  const vals = [result.x, ...result.steps];
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`Zincir ${vals.join(' → ')}`}>
    {vals.map((v, i) => <g key={i}><rect x={10 + i * 88} y="20" width="60" height="34" rx="8" className={i === vals.length - 1 && v === 21 ? 'tl-rect' : 'tl-set'} />
      <text x={40 + i * 88} y="42" textAnchor="middle" className="tl-svg-label">{v}</text>
      {i < CHAIN.length && <text x={84 + i * 88} y="16" textAnchor="middle" className="tl-svg-small">{CHAIN[i][0]}{CHAIN[i][1]}</text>}
      {i < CHAIN.length && <text x={84 + i * 88} y="42" textAnchor="middle" className="tl-svg-label">→</text>}</g>)}
    <text x="10" y="84" className="tl-svg-small">Ters zincir (sağdan sola): +5, ÷2, −3</text>
    <text x="10" y="104" className="tl-svg-small">21 → 26 → 13 → 10</text>
  </svg>;
}

export default { queue: Queue, remain: Remain, tickets: Tickets, chain: Chain };
