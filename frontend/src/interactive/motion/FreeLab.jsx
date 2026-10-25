import { useEffect } from 'react';
import MotionLab from './MotionLab.jsx';
import { useLab } from './useLab.js';
import { FREE_EDITABLE, PRESETS } from './content.js';

const SECOND = { id: 'L', label: 'L', tone: 'blue', x0: 0, shape: 'car' };

/** Serbest laboratuvar: hazır durumlardan başla, her şeyi değiştir. */
export default function FreeLab({ presetId, onPreset }) {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const lab = useLab(preset.scenario);
  useEffect(() => { lab.load(preset.scenario); }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const { scenario } = lab;
  const vertical = scenario.orientation === 'vertical';
  const toggleSecond = () => {
    if (scenario.bodies.length > 1) { lab.setScenario({ ...scenario, bodies: scenario.bodies.slice(0, 1) }); lab.setFocus(scenario.bodies[0].id); return; }
    const first = scenario.bodies[0];
    lab.setScenario({ ...scenario, bodies: [first, { ...SECOND, shape: first.shape, x0: first.x0, nodes: first.nodes.map(([t, v]) => [t, Math.round(v / 2)]) }] });
  };
  const panelTop = <div className="fl-presets">
    <label className="field"><span className="field-label">Hazır durum</span>
      <select value={preset.id} onChange={(e) => onPreset(e.target.value)}>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
    </label>
    <p className="muted small">{preset.note}</p>
    {!vertical && <button type="button" className="btn btn-secondary btn-sm" onClick={toggleSecond}>{scenario.bodies.length > 1 ? 'İkinci aracı kaldır' : 'İkinci araç ekle'}</button>}
  </div>;
  return <MotionLab lab={lab} editable={FREE_EDITABLE} panelTop={panelTop} onReset={() => lab.load(preset.scenario)} />;
}
