import { useState } from 'react';
import MotionLab from '../../interactive/motion/MotionLab.jsx';
import { useLab } from '../../interactive/motion/useLab.js';
import '../../interactive/interactive.css';

export default function HareketV2Deneyi({ tur = 'uc-grafik' }) {
  const [p, setP] = useState({ v: tur === 'karsilasma' ? 3 : 0, a: 2, vb: -2, x: 20 });
  const scenario = (s) => ({ T: 8, lessonLayout: true, step: .5, strobe: 1,
    graphs: ['x', 'v', 'a'], grid: { dt: .5, dv: 1, dx: 1 },
    layers: { strobe: true, arrows: true, area: true, slope: true, disp: true, events: true },
    bodies: [{ id: 'K', label: 'K', name: 'K aracı', tone: 'red', shape: 'car', x0: 0, nodes: [[0, s.v], [8, s.v + (tur === 'karsilasma' ? 0 : s.a) * 8]] },
      ...(tur === 'karsilasma' ? [{ id: 'L', label: 'L', name: 'L aracı', tone: 'blue', shape: 'car', x0: s.x, nodes: [[0, s.vb], [8, s.vb]] }] : [])] });
  const lab = useLab(scenario(p));
  const change = (key, v) => { const next = { ...p, [key]: v }; setP(next); lab.load(scenario(next), { keepLayers: true }); };
  const fields = tur === 'karsilasma' ? [['v', 'K hızı (m/s)', -8, 8], ['vb', 'L hızı (m/s)', -8, 8], ['x', 'İlk aralık (m)', 0, 40]] : [['v', 'İlk hız (m/s)', -10, 10], ['a', 'İvme (m/s²)', -4, 4]];
  return <div><div className="kp-v2-kontroller">{fields.map(([key, ad, min, max]) => <label key={key}>{ad}: <output>{p[key]}</output><input type="range" min={min} max={max} value={p[key]} onChange={e => change(key, Number(e.target.value))} /></label>)}</div>
    {tur === 'karsilasma' && <p role="status">Aradaki uzaklık: {Math.abs(p.x + (p.vb - p.v) * lab.t).toFixed(1)} m</p>}
    <MotionLab lab={lab} />
  </div>;
}
