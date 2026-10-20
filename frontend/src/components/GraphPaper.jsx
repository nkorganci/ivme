import { useEffect, useMemo, useState } from 'react';

function ticks(min, max) {
  const span = max - min;
  const scale = 10 ** Math.floor(Math.log10(span / 10));
  const step = [1, 2, 5, 10].map((part) => part * scale).find((value) => span / value <= 16) || 10 * scale;
  const first = Math.ceil(min / step) * step;
  return Array.from({ length: Math.min(42, Math.floor((max - first) / step) + 1) }, (_, i) => first + i * step);
}

export default function GraphPaper({ graph, onApply, onClose, saving, showSettings }) {
  const [input, setInput] = useState(graph);
  const [error, setError] = useState('');
  useEffect(() => { setInput(graph); }, [graph]);
  const xTicks = useMemo(() => ticks(graph.xMin, graph.xMax), [graph.xMin, graph.xMax]);
  const yTicks = useMemo(() => ticks(graph.yMin, graph.yMax), [graph.yMin, graph.yMax]);
  const x = (value) => 100 * (value - graph.xMin) / (graph.xMax - graph.xMin);
  const y = (value) => 100 * (graph.yMax - value) / (graph.yMax - graph.yMin);
  const apply = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(['xMin', 'xMax', 'yMin', 'yMax'].map((key) => [key, Number(input[key])]));
    if (Object.values(next).some((value) => !Number.isFinite(value) || Math.abs(value) > 1000000)
      || next.xMin >= next.xMax || next.yMin >= next.yMax) {
      setError('Alt sınırlar üst sınırdan küçük olmalı; değerler ±1.000.000 içinde kalmalı.');
      return;
    }
    setError('');
    onApply({ open: true, ...next });
  };
  return <>
    <div className="page-ink-graph" aria-label="Kareli x-y grafik kağıdı">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {xTicks.map((value) => <line key={`x${value}`} className="graph-grid-line" x1={x(value)} y1="0" x2={x(value)} y2="100" />)}
        {yTicks.map((value) => <line key={`y${value}`} className="graph-grid-line" x1="0" y1={y(value)} x2="100" y2={y(value)} />)}
        {graph.xMin <= 0 && graph.xMax >= 0 && <line className="graph-axis" x1={x(0)} y1="0" x2={x(0)} y2="100" />}
        {graph.yMin <= 0 && graph.yMax >= 0 && <line className="graph-axis" x1="0" y1={y(0)} x2="100" y2={y(0)} />}
      </svg>
      <span className="graph-y-label">y: {graph.yMax} … {graph.yMin}</span>
      <span className="graph-x-label">x: {graph.xMin} … {graph.xMax}</span>
    </div>
    {showSettings && <form className="page-ink-panel graph-settings" onSubmit={apply} aria-label="Grafik koordinatları">
      <div className="page-ink-panel-head"><strong>x‑y grafik penceresi</strong><button type="button" className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Grafiği kapat">✕</button></div>
      <p className="small muted">Kareli kağıdın sınırlarını ayarla, ardından Yaz ile üzerine çiz.</p>
      <div className="graph-fields">{[['xMin', 'x alt'], ['xMax', 'x üst'], ['yMin', 'y alt'], ['yMax', 'y üst']].map(([key, label]) => <label key={key}>{label}
        <input type="number" step="any" value={input[key]} onChange={(event) => setInput((old) => ({ ...old, [key]: event.target.value }))} />
      </label>)}</div>
      {error && <p role="alert" className="text-danger small">{error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Koordinatları uygula</button>
    </form>}
  </>;
}
