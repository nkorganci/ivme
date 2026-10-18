import { useEffect, useState } from 'react';
import { formatNumber } from './svg.js';

/** Öğle vakti güneş ışınlarının geliş açısı: 90° − |enlem − güneşin dik geldiği enlem|. */
export const noonAngle = (latitude, declination) => 90 - Math.abs(latitude - declination);

export default function SunAngle({ params, state }) {
  const [latitude, setLatitude] = useState(params.latitude);
  const [declination, setDeclination] = useState(params.declination);
  useEffect(() => {
    if (state?.set?.latitude !== undefined) setLatitude(state.set.latitude);
    if (state?.set?.declination !== undefined) setDeclination(state.set.declination);
  }, [state]);
  const cx = 200;
  const cy = 170;
  const R = 120;
  const toXY = (lat) => [cx + R * Math.cos((lat * Math.PI) / 180), cy - R * Math.sin((lat * Math.PI) / 180)];
  const [px, py] = toXY(latitude);
  const angle = noonAngle(latitude, declination);
  const [dx, dy] = toXY(declination);
  const tangent = [-Math.sin((latitude * Math.PI) / 180), -Math.cos((latitude * Math.PI) / 180)];
  return <figure className="viz-sun">
    <svg viewBox="0 0 560 340" className="viz-svg" role="img" aria-label="Güneş ışınlarının geliş açısı">
      <circle cx={cx} cy={cy} r={R} fill="var(--tint)" stroke="var(--navy)" strokeWidth="2" />
      <line x1={cx - R - 10} x2={cx + R + 10} y1={cy} y2={cy} stroke="var(--line)" strokeDasharray="5 4" />
      <text x={cx - R - 14} y={cy + 4} textAnchor="end" className="viz-small">Ekvator</text>
      {[23.5, -23.5].map((lat) => <line key={lat} x1={cx - R * Math.cos((lat * Math.PI) / 180)} x2={cx + R * Math.cos((lat * Math.PI) / 180)}
        y1={cy - R * Math.sin((lat * Math.PI) / 180)} y2={cy - R * Math.sin((lat * Math.PI) / 180)} stroke="var(--line)" strokeDasharray="2 4" />)}
      {Array.from({ length: 7 }, (_, i) => <line key={i} x1={dx + 160} y1={dy - 60 + i * 20} x2={cx + R + 2} y2={dy - 60 + i * 20}
        stroke="var(--warn)" strokeWidth="2" opacity=".7" />)}
      <text x={540} y={40} textAnchor="end" className="viz-label">Güneş ışınları →</text>
      <circle cx={dx} cy={dy} r="5" fill="var(--warn)" />
      <text x={dx + 8} y={dy - 6} className="viz-small">dik geliş ({formatNumber(declination, 1)}°)</text>
      <line x1={px + tangent[0] * -60} y1={py + tangent[1] * -60} x2={px + tangent[0] * 60} y2={py + tangent[1] * 60} stroke="var(--ink)" strokeWidth="2" />
      <circle cx={px} cy={py} r="7" fill="var(--bad)" />
      <text x={px + 10} y={py + 20} className="viz-label">{formatNumber(latitude, 1)}° enlemi</text>
      <text x={330} y={300} className="viz-label">Öğle güneşi açısı = 90° − |{formatNumber(latitude, 1)} − {formatNumber(declination, 1)}| = {formatNumber(angle, 1)}°</text>
    </svg>
    <figcaption className="viz-controls">
      <label className="viz-slider">Enlem: {formatNumber(latitude, 1)}°
        <input type="range" min="-66" max="66" step="0.5" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} aria-label="Enlem" /></label>
      <label className="viz-slider">Güneşin dik geldiği enlem: {formatNumber(declination, 1)}°
        <input type="range" min="-23.5" max="23.5" step="0.5" value={declination} onChange={(e) => setDeclination(Number(e.target.value))} aria-label="Dik geliş enlemi" /></label>
      {(params.places ?? []).map((place) => <span key={place.id} className="chip chip-primary">{place.label}: {formatNumber(noonAngle(place.latitude, declination), 1)}°</span>)}
    </figcaption>
  </figure>;
}
