import { useEffect, useRef, useState } from 'react';
import Segmented from '../../components/Segmented.jsx';
import Graphs from './Graphs.jsx';
import Scene from './Scene.jsx';
import { equalVelocityTimes, fmt, insertNode, meetings, motionKind, moveNode, removeNode, statsAt, straighten, unitsOf, zeroVelocityEvents } from './model.js';
import { LAYER_LABELS, speedOptions } from './useLab.js';
import { toneOf } from './svgKit.js';

function Controls({ lab }) {
  const { scenario, t, playing } = lab;
  const units = unitsOf(scenario);
  const T = scenario.T;
  const step = scenario.step ?? scenario.strobe ?? scenario.grid?.dt ?? 1;
  const stepTo = (direction) => lab.seek(Math.round(t / step) * step + direction * step);
  return <div className="ml-controls">
    <button type="button" className="btn btn-primary btn-sm ml-play" onClick={playing ? lab.pause : lab.play}>
      {playing ? '⏸ Durdur' : t >= T - 1e-6 ? '↻ Yeniden oynat' : '▶ Oynat'}</button>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => lab.seek(0)} title="Başa dön" aria-label="Başa dön">⏮</button>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => stepTo(-1)} disabled={t <= 0} aria-label={`${fmt(step, 2)} ${units.t} geri`}>−{fmt(step, 2)} {units.t}</button>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => stepTo(1)} disabled={t >= T - 1e-6} aria-label={`${fmt(step, 2)} ${units.t} ileri`}>+{fmt(step, 2)} {units.t}</button>
    <label className="ml-time">
      <span>t = <strong>{fmt(t, 2)}</strong> {units.t}</span>
      <input type="range" min="0" max={T} step={T / 600} value={t} onChange={(event) => lab.seek(Number(event.target.value))} aria-label="Zaman" />
    </label>
    <label className="ml-speed">Oynatma
      <select value={lab.speed} onChange={(event) => lab.setSpeed(Number(event.target.value))}>
        {speedOptions.map((value) => <option key={value} value={value}>{fmt(value, 2)}×</option>)}
      </select>
    </label>
  </div>;
}

function LayerToggles({ lab, only }) {
  const { scenario, layers } = lab;
  const items = LAYER_LABELS.filter(([key]) => !only || only.includes(key));
  return <div className="ml-layers" role="group" aria-label="Görünür katmanlar">
    {items.map(([key, label]) => <label key={key} className={`ml-layer${layers[key] ? ' on' : ''}`}>
      <input type="checkbox" checked={!!layers[key]} onChange={(event) => lab.setLayer(key, event.target.checked)} /> {label}</label>)}
    {scenario.bodies.length > 1 && <span className="ml-focus">
      <span className="muted small">Eğim/alan odağı</span>
      <Segmented label="Odak cisim" options={scenario.bodies.map((body) => ({ value: body.id, label: body.label }))} value={lab.focus} onChange={lab.setFocus} />
    </span>}
  </div>;
}

/** Olaylar: yan yana gelme, hızların eşitlendiği an, yön değiştirme ve durma. Tıklanınca o ana gidilir. */
function eventsOf(lab) {
  const { scenario, motions } = lab;
  const units = unitsOf(scenario);
  const out = [];
  if (motions.length === 2) {
    for (const item of meetings(motions[0], motions[1], scenario.T)) if (item.t > 1e-6 && !item.together) out.push({ t: item.t, text: 'yan yana' });
    for (const item of equalVelocityTimes(motions[0], motions[1], scenario.T)) if (!item.together) out.push({ t: item.t, text: 'hızlar eşit → aradaki uzaklık uç değerde' });
  }
  motions.forEach((motion, i) => {
    for (const item of zeroVelocityEvents(motion)) {
      out.push({ t: item.t, text: `${scenario.bodies[i].label} ${item.turn ? 'yön değiştirir' : item.end ? 'durur' : 'anlık durur, yönü aynı'}` });
    }
  });
  return out.sort((p, q) => p.t - q.t).map((item) => ({ ...item, label: `t = ${fmt(item.t, 2)} ${units.t}: ${item.text}` }));
}

function Readouts({ lab }) {
  const { scenario, motions, t } = lab;
  const units = unitsOf(scenario);
  const vertical = scenario.orientation === 'vertical';
  const events = eventsOf(lab);
  const stats = motions.map((motion) => statsAt(motion, t));
  return <div className="ml-readouts">
    {scenario.bodies.map((body, i) => {
      const s = stats[i];
      const kind = motionKind(s.v, s.a);
      const direction = s.v > 1e-3 ? (vertical ? 'yukarı (+)' : 'ileri (+)') : s.v < -1e-3 ? (vertical ? 'aşağı (−)' : 'geri (−)') : 'yok';
      return <section key={body.id} className={`ml-readout${lab.focus === body.id ? ' focus' : ''}`} style={{ '--tone': toneOf(body) }}>
        <header>
          <button type="button" className="ml-readout-name" onClick={() => lab.setFocus(body.id)} aria-pressed={lab.focus === body.id}
            title="Eğim ve alan katmanlarını bu cisim için göster"><span className="ml-swatch" aria-hidden="true" />{body.name ?? body.label}</button>
          <span className={`badge ${kind.key === 'slower' ? 'badge-warn' : kind.key === 'faster' ? 'badge-ok' : 'badge-muted'}`}>{kind.text}</span>
        </header>
        <dl>
          <dt>{vertical ? 'Yükseklik' : 'Konum'}</dt><dd>{fmt(s.x, 2)} {units.x}</dd>
          <dt>Hız</dt><dd>{fmt(s.v, 2)} {units.v} · yön: {direction}</dd>
          <dt>İvme</dt><dd>{fmt(s.a, 2)} {units.a}</dd>
          <dt>Yer değiştirme</dt><dd>{fmt(s.disp, 2)} {units.x}</dd>
          <dt>Alınan yol</dt><dd>{fmt(s.path, 2)} {units.x}</dd>
          <dt>Ortalama hız</dt><dd>{fmt(s.avgVelocity, 2)} {units.v}</dd>
          <dt>Ortalama sürat</dt><dd>{fmt(s.avgSpeed, 2)} {units.v}</dd>
          {body.mass != null && <><dt>Net kuvvet (m·a)</dt><dd>{fmt(Math.abs(body.mass * s.a), 3)} N</dd></>}
        </dl>
      </section>;
    })}
    {stats.length === 2 && <p className="ml-relation">
      {Math.abs(stats[0].x - stats[1].x) < 1e-3 ? <strong>Yan yanalar.</strong>
        : <>Aradaki uzaklık <strong>{fmt(Math.abs(stats[0].x - stats[1].x), 2)} {units.x}</strong> · {stats[0].x > stats[1].x ? scenario.bodies[0].label : scenario.bodies[1].label} {vertical ? 'daha yukarıda' : 'önde'}</>}
    </p>}
    {events.length > 0 && <div className="ml-events">
      <span className="muted small">Olaylar (tıkla, o ana git)</span>
      {events.map((item) => <button key={item.label} type="button" className="ml-event-chip" onClick={() => lab.seek(item.t)}>{item.label}</button>)}
    </div>}
  </div>;
}

function Editor({ lab, editable, onReset }) {
  const { scenario, motions, t, selected } = lab;
  const units = unitsOf(scenario);
  const ids = editable.bodies ?? scenario.bodies.map((body) => body.id);
  const grid = scenario.grid ?? {};
  return <div className="ml-editor">
    {scenario.bodies.map((body, i) => {
      if (!ids.includes(body.id)) return null;
      const motion = motions[i];
      const selectedHere = selected?.bodyId === body.id ? selected.index : null;
      const canRemove = editable.allowInsert && selectedHere != null && selectedHere > 0 && selectedHere < motion.nodes.length - 1;
      return <section key={body.id} className="ml-editor-body" style={{ '--tone': toneOf(body) }}>
        <h4><span className="ml-swatch" aria-hidden="true" />{body.label} hareketini kur</h4>
        {editable.x0 && <div className="ml-stepper">
          <span>Başlangıç konumu x₀</span>
          <button type="button" className="btn btn-secondary btn-sm" aria-label="x₀ azalt"
            onClick={() => lab.updateBody(body.id, (b) => ({ ...b, x0: (b.x0 ?? 0) - (grid.dx ?? 1) }))}>−</button>
          <strong>{fmt(body.x0 ?? 0, 2)} {units.x}</strong>
          <button type="button" className="btn btn-secondary btn-sm" aria-label="x₀ artır"
            onClick={() => lab.updateBody(body.id, (b) => ({ ...b, x0: (b.x0 ?? 0) + (grid.dx ?? 1) }))}>+</button>
        </div>}
        <ol className="ml-segments">
          {motion.segs.map((seg) => <li key={seg.t0}>
            <span>{fmt(seg.t0, 2)}–{fmt(seg.t1, 2)} {units.t}</span>
            <span>v: {fmt(seg.v0, 2)} → {fmt(seg.v1, 2)}</span>
            <span>a = {fmt(seg.a, 2)}</span>
          </li>)}
        </ol>
        {editable.allowInsert && <div className="ml-editor-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => lab.updateBody(body.id, (b) => insertNode(b, t, { T: scenario.T, grid }))}>
            + {fmt(t, 1)} {units.t} anına nokta</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!canRemove}
            onClick={() => { lab.updateBody(body.id, (b) => removeNode(b, selectedHere, scenario.T)); lab.setSelected(null); }}>Seçili noktayı sil</button>
        </div>}
      </section>;
    })}
    <p className="muted small ml-editor-hint">v–t grafiğindeki içi boş noktaları sürükle (ya da seçip ok tuşlarını kullan); diğer grafikler ve sahne anında değişir.</p>
    {onReset && <button type="button" className="btn btn-secondary btn-sm" onClick={onReset}>Başlangıç hâline dön</button>}
  </div>;
}

/**
 * Hareket laboratuvarı: sahne + senkron grafikler + okumalar. `editable` verilirse v–t düğümleri
 * sürüklenir; `editable.linear` her düzenlemeden sonra iç düğümleri doğruya oturtur (sabit ivme).
 */
export default function MotionLab({ lab, editable = null, lead = null, panel = null, panelTop = null, layerKeys, showLayers = true, readouts = true, compact = false, onReset }) {
  const { scenario } = lab;
  const rootRef = useRef(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 620));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const onNodeMove = (bodyId, index, point) => {
    lab.updateBody(bodyId, (body) => {
      const moved = moveNode(body, index, point, { T: scenario.T, grid: scenario.grid, vRange: scenario.vRange, lockT: editable?.lockT });
      return editable?.linear ? straighten(moved, scenario.T) : moved;
    });
  };
  return <div ref={rootRef} className={`ml${compact ? ' compact' : ''}`}>
    {lead && <div className="ml-lead">{lead}</div>}
    <div className="ml-stage"><Scene scenario={scenario} motions={lab.motions} t={lab.t} layers={lab.layers} narrow={narrow} /></div>
    <Controls lab={lab} />
    {showLayers && <LayerToggles lab={lab} only={layerKeys} />}
    <div className="ml-main">
      <Graphs lab={lab} editable={editable} onNodeMove={onNodeMove} compact={compact} narrow={narrow} />
      <aside className="ml-side">
        {panelTop}
        {readouts && <Readouts lab={lab} />}
        {editable && <Editor lab={lab} editable={editable} onReset={onReset} />}
        {panel}
      </aside>
    </div>
  </div>;
}
