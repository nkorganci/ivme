import { useEffect, useMemo, useRef, useState } from 'react';
import { compileExpr } from '../expr.js';
import { fill, formatNumber, prefersReducedMotion, stroke } from './svg.js';

const W = 420;
const H = 260;

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Parçacık modeli. gas: sıcaklık hızı, hacim kutu genişliğini belirler (çarpma sıklığı basınç gibi okunur).
 * reaction: A ⇌ B dönüşümü; kareler türlerin sayısını değiştirebilir (Le Chatelier).
 */
export default function Particles({ params, state, values = {} }) {
  const env = Object.fromEntries((params.sliders ?? []).map((s) => [s.name, values[s.name] ?? state?.set?.[s.name] ?? s.value]));
  const reduced = prefersReducedMotion();
  const counts = useMemo(() => Object.fromEntries((params.species ?? []).map((s) => [s.id, state?.set?.[s.id] ?? s.count])),
    [params.species, state]);
  const [tick, setTick] = useState(0);
  const sim = useRef(null);
  const widthRatio = Math.max(0.3, Math.min(1, env.V ?? params.volume ?? 1));
  const boxW = (W - 40) * widthRatio;
  if (!sim.current || sim.current.key !== JSON.stringify(counts)) {
    const random = seeded(7);
    const particles = [];
    for (const species of params.species ?? []) {
      for (let i = 0; i < counts[species.id]; i += 1) {
        const angle = random() * Math.PI * 2;
        particles.push({ species: species.id, x: 20 + random() * boxW, y: 20 + random() * (H - 40), dx: Math.cos(angle), dy: Math.sin(angle) });
      }
    }
    sim.current = { key: JSON.stringify(counts), particles, hits: 0, random };
  }
  useEffect(() => {
    if (reduced) return undefined;
    let frame;
    const speed = Math.sqrt(Math.max(1, env.T ?? params.temperature ?? 300) / 300) * 1.6;
    const step = () => {
      const s = sim.current;
      for (const p of s.particles) {
        p.x += p.dx * speed;
        p.y += p.dy * speed;
        if (p.x < 20 || p.x > 20 + boxW) { p.dx *= -1; p.x = Math.max(20, Math.min(20 + boxW, p.x)); s.hits += 1; }
        if (p.y < 20 || p.y > H - 20) { p.dy *= -1; p.y = Math.max(20, Math.min(H - 20, p.y)); s.hits += 1; }
        if (params.mode === 'reaction') {
          const r = params.reaction;
          if (p.species === r.from && s.random() < r.forward * 0.004) p.species = r.to;
          else if (p.species === r.to && s.random() < r.backward * 0.004) p.species = r.from;
        }
      }
      setTick((t) => (t + 1) % 1_000_000);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced, boxW, env.T, params.mode, params.reaction, params.temperature]);
  const live = {};
  for (const p of sim.current.particles) live[p.species] = (live[p.species] ?? 0) + 1;
  const readouts = (params.readouts ?? []).map((r) => {
    try { return { ...r, value: compileExpr(r.expr, Object.keys(env))(env) }; } catch { return { ...r, value: NaN }; }
  });
  const toneOf = Object.fromEntries((params.species ?? []).map((s) => [s.id, s.tone ?? 'navy']));
  return <figure className="viz-particles" data-tick={tick % 2}>
    <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Parçacık modeli">
      <rect x="18" y="18" width={boxW + 4} height={H - 36} fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      {params.mode === 'gas' && <rect x={22 + boxW} y="14" width="8" height={H - 28} fill="var(--navy)" rx="2" />}
      {sim.current.particles.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill={stroke(toneOf[p.species])} />)}
    </svg>
    <figcaption className="viz-measures">
      {(params.species ?? []).map((s) => <span key={s.id} className="chip" style={{ background: fill(s.tone ?? 'navy') }}>{s.label}: {live[s.id] ?? 0}</span>)}
      {readouts.map((r) => <span key={r.id} className="chip chip-primary">{r.label}: {formatNumber(r.value, 2)}</span>)}
      {reduced && <span className="muted">Hareket azaltma tercihin açık: parçacıklar durağan gösteriliyor.</span>}
    </figcaption>
  </figure>;
}
