// Yaş, İşçi ve Havuz Problemleri laboratuvarı çizimleri: yaş çubukları, aile toplamı, havuz dolumu, ekip gücü.
import { fmt } from '../sayi.js';

function Ages({ result }) {
  const s = 4.2;
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`Anne ${result.m}, kız ${result.c}; fark ${result.diff}`}>
    <text x="8" y="34" className="tl-svg-small">anne</text><rect x="50" y="20" width={Math.max(0, result.m) * s} height="22" className="tl-bar" />
    <text x={56 + result.m * s} y="36" className="tl-svg-label">{result.m}</text>
    <text x="8" y="74" className="tl-svg-small">kız</text><rect x="50" y="60" width={Math.max(0, result.c) * s} height="22" className="tl-bar tl-bar-odd" />
    <text x={56 + Math.max(0, result.c) * s} y="76" className="tl-svg-label">{Math.max(0, result.c)}</text>
    {result.c > 0 && <line x1={50 + result.c * s} x2={50 + result.m * s} y1="51" y2="51" className="tl-mean" />}
    <text x="8" y="108" className="tl-svg-small">Kesikli çizgi: fark = {result.diff} (hep aynı)</text>
  </svg>;
}

function Family({ result }) {
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`${result.k} kişi, 4 yılda toplam ${result.inc} artar`}>
    {Array.from({ length: result.k }, (_, i) => <g key={i}><rect x={20 + i * 40} y="30" width="30" height="40" className="tl-rect" /><rect x={20 + i * 40} y="16" width="30" height="14" className="tl-bar" />
      <text x={35 + i * 40} y="27" textAnchor="middle" className="tl-svg-small tl-dot-text">+4</text></g>)}
    <text x="20" y="96" className="tl-svg-label">80 + {result.k} × 4 = {result.later}</text>
  </svg>;
}

function Tank({ result }) {
  const H = 110, a = Math.min(1, result.a), b = Math.min(1 - a, result.b);
  return <svg className="tl-svg" viewBox="0 0 360 140" role="img" aria-label={`Havuz yüzde ${fmt(result.fill * 100, 0)} dolu`}>
    <rect x="40" y="14" width="120" height={H} className="tl-set" />
    <rect x="40" y={14 + H - a * H} width="120" height={a * H} className="tl-bar" />
    <rect x="40" y={14 + H - (a + b) * H} width="120" height={b * H} className="tl-bar tl-bar-odd" />
    {result.fill > 1 && <text x="100" y="10" textAnchor="middle" className="tl-svg-small">taşıyor!</text>}
    <text x="180" y="40" className="tl-svg-small">A: saatte 1/6 (koyu)</text>
    <text x="180" y="60" className="tl-svg-small">B: saatte 1/12 (açık)</text>
    <text x="180" y="90" className="tl-svg-label">%{fmt(Math.min(result.fill, 9) * 100, 0)} dolu</text>
  </svg>;
}

function Crew({ result }) {
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`Usta ve ${result.k} çırak; güç ${result.power}`}>
    <rect x="16" y="20" width="44" height="44" rx="6" className="tl-bar" /><text x="38" y="47" textAnchor="middle" className="tl-svg-small tl-dot-text">usta 2</text>
    {Array.from({ length: result.k }, (_, i) => <g key={i}><rect x={68 + i * 30} y="31" width="24" height="24" rx="4" className="tl-bar tl-bar-odd" /><text x={80 + i * 30} y="47" textAnchor="middle" className="tl-svg-small">1</text></g>)}
    <text x="16" y="92" className="tl-svg-label">24 çırak-saat ÷ {result.power} = {fmt(result.time, 2)} saat</text>
  </svg>;
}

export default { ages: Ages, family: Family, tank: Tank, crew: Crew };
