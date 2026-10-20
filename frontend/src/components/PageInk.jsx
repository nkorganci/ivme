import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { shapePoints } from './inkGeometry.js';
import GraphPaper from './GraphPaper.jsx';
import ScientificCalculator from './ScientificCalculator.jsx';

const MAX_STROKES = 100;
const MAX_POINTS = 250;
const COLORS = ['BLACK', 'RED', 'BLUE', 'GREEN'];
const COLOR_LABELS = { BLACK: 'Siyah', RED: 'Kırmızı', BLUE: 'Mavi', GREEN: 'Yeşil' };
const DEFAULT_GRAPH = { open: false, xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const SHAPES = { LINE: 'Doğru', RECTANGLE: 'Dikdörtgen', TRIANGLE: 'Üçgen', ELLIPSE: 'Çember / elips', ANGLE: 'Açı' };
const MODE_LABEL = { click: 'Tıklama', write: 'Yazma', erase: 'Silgi', area: 'Alan silme', shape: 'Şekil çizimi' };

function paint(canvas, strokes, preview) {
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(box.width * ratio);
  canvas.height = Math.round(box.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of [...strokes, ...(preview ? [preview] : [])]) {
    const points = stroke.points || stroke;
    if (stroke.color === 'AREA_ERASE') {
      const x1 = points[0][0] * box.width, y1 = points[0][1] * box.height;
      const x2 = points[1][0] * box.width, y2 = points[1][1] * box.height;
      ctx.clearRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      continue;
    }
    const color = COLORS.includes(stroke.color) ? stroke.color.toLowerCase() : 'blue';
    ctx.globalCompositeOperation = stroke.color === 'ERASE' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue(`--pen-${color}`).trim();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = stroke.color === 'ERASE' ? 24 : 2.5;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x * box.width, y * box.height) : ctx.moveTo(x * box.width, y * box.height));
    if (points.length === 1) {
      ctx.arc(points[0][0] * box.width, points[0][1] * box.height, stroke.color === 'ERASE' ? 12 : 1.25, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Parent is the whole annotatable surface; coordinates are relative to it. */
export default function PageInk({ type, id, page = 1, onBoardAction }) {
  const path = `/api/page-annotations/${type}/${encodeURIComponent(id)}/${page}`;
  const canvas = useRef(null);
  const current = useRef([]);
  const active = useRef(null);
  const version = useRef(0);
  const graphRef = useRef(DEFAULT_GRAPH);
  const [strokes, setStrokes] = useState([]);
  const [mode, setMode] = useState('click');
  const [color, setColor] = useState('BLACK');
  const [shape, setShape] = useState('LINE');
  const [panel, setPanel] = useState(null);
  const [graph, setGraph] = useState(DEFAULT_GRAPH);
  const [selection, setSelection] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const replace = (next) => { current.current = next; setStrokes(next); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(path);
      version.current = result.version;
      replace(result.strokes);
      graphRef.current = result.graph || DEFAULT_GRAPH;
      setGraph(graphRef.current);
      setDirty(false);
      setConflict(false);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!canvas.current) return undefined;
    const target = canvas.current;
    const observer = new ResizeObserver(() => paint(target, current.current, preview));
    observer.observe(target);
    paint(target, strokes, preview);
    return () => observer.disconnect();
  }, [strokes, preview]);

  const save = async (next, nextGraph = graphRef.current) => {
    if (JSON.stringify(next).length > 65536) {
      setError('Karalama çok büyük. Birkaç çizgiyi geri al.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await api.put(path, { version: version.current, strokes: next, graph: nextGraph });
      version.current = result.version;
      setDirty(false);
      setConflict(false);
    } catch (e) {
      if (e.status === 409) setConflict(true);
      setError(e.message);
    } finally { setSaving(false); }
  };
  const point = (e) => {
    const box = canvas.current.getBoundingClientRect();
    return [Math.round(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * 1000) / 1000,
      Math.round(Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)) * 1000) / 1000];
  };
  const boardPoint = (e, rect) => [
    Math.round(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * 1000) / 1000,
    Math.round(Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) * 1000) / 1000,
  ];
  const boardAt = (e) => {
    if (type !== 'QUESTION' || !onBoardAction) return null;
    const board = document.querySelector('.qside .board-canvas, .exam-tool-card .board-canvas');
    const rect = board?.getBoundingClientRect();
    return rect?.width && rect?.height && e.clientX >= rect.left && e.clientX <= rect.right
      && e.clientY >= rect.top && e.clientY <= rect.bottom ? rect : null;
  };
  const updateGraph = (next) => {
    if (loading || saving || conflict) return;
    graphRef.current = next;
    setGraph(next);
    setDirty(true);
    save(current.current, next);
  };
  const start = (e) => {
    if (loading || saving || conflict || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const boardRect = (mode === 'erase' || mode === 'area') ? boardAt(e) : null;
    if (!boardRect && current.current.length >= MAX_STROKES) { setError('En fazla 100 işlem olabilir. Önce geri al veya tümünü sil.'); return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    const origin = point(e);
    if (boardRect) {
      active.current = { id: e.pointerId, kind: `board-${mode}`, origin, boardRect,
        boardPoints: [boardPoint(e, boardRect)] };
      if (mode === 'area') setSelection({ start: origin, end: origin });
      else if (current.current.length < MAX_STROKES) {
        active.current.stroke = { color: 'ERASE', points: [origin] };
        replace([...current.current, active.current.stroke]);
        setDirty(true);
      }
      return;
    }
    active.current = { id: e.pointerId, kind: mode, origin, last: origin, dirty: false };
    if (mode === 'write' || mode === 'erase') {
      active.current.stroke = { color: mode === 'erase' ? 'ERASE' : color, points: [origin] };
      replace([...current.current, active.current.stroke]);
      setDirty(true);
    } else if (mode === 'area') setSelection({ start: origin, end: origin });
    else if (mode === 'shape') setPreview({ color, points: shapePoints(shape, origin, origin) });
  };
  const move = (e) => {
    if (active.current?.id !== e.pointerId) return;
    if (active.current.kind === 'board-area') { setSelection({ start: active.current.origin, end: point(e) }); return; }
    if (active.current.kind === 'board-erase') {
      const points = active.current.boardPoints;
      const next = boardPoint(e, active.current.boardRect);
      const last = points[points.length - 1];
      if (points.length < MAX_POINTS && Math.abs(next[0] - last[0]) + Math.abs(next[1] - last[1]) >= .003) {
        points.push(next);
        if (active.current.stroke) {
          active.current.stroke.points.push(point(e));
          replace([...current.current]);
        }
      }
      return;
    }
    if (active.current.kind === 'area') { setSelection({ start: active.current.origin, end: point(e) }); return; }
    if (active.current.kind === 'shape') { setPreview({ color, points: shapePoints(shape, active.current.origin, point(e)) }); return; }
    const stroke = active.current.stroke.points;
    if (stroke.length >= MAX_POINTS) return;
    const next = point(e);
    const last = stroke[stroke.length - 1];
    if (Math.abs(next[0] - last[0]) + Math.abs(next[1] - last[1]) < .003) return;
    stroke.push(next);
    replace([...current.current]);
  };
  const finish = (e) => {
    if (active.current?.id !== e.pointerId) return;
    const operation = active.current;
    active.current = null;
    if (operation.kind === 'board-area') {
      setSelection(null);
      const end = boardPoint(e, operation.boardRect);
      if (Math.abs(end[0] - operation.boardPoints[0][0]) + Math.abs(end[1] - operation.boardPoints[0][1]) >= .01) {
        onBoardAction({ questionId: id, kind: 'area', points: [operation.boardPoints[0], end] });
        if (current.current.length < MAX_STROKES) {
          const next = [...current.current, { color: 'AREA_ERASE', points: [operation.origin, point(e)] }];
          replace(next); setDirty(true); save(next);
        }
      }
    } else if (operation.kind === 'board-erase') {
      onBoardAction({ questionId: id, kind: 'erase', points: operation.boardPoints });
      if (operation.stroke) save(current.current);
    } else if (operation.kind === 'area') {
      const end = point(e);
      setSelection(null);
      if (Math.abs(end[0] - operation.origin[0]) + Math.abs(end[1] - operation.origin[1]) < .01) return;
      const next = [...current.current, { color: 'AREA_ERASE', points: [operation.origin, end] }];
      replace(next); setDirty(true); save(next);
    } else if (operation.kind === 'shape') {
      setPreview(null);
      const end = point(e);
      if (Math.abs(end[0] - operation.origin[0]) + Math.abs(end[1] - operation.origin[1]) < .01) return;
      const next = [...current.current, { color, points: shapePoints(shape, operation.origin, end) }];
      replace(next);
      setDirty(true);
      save(next);
    } else if (operation.kind === 'write' || operation.kind === 'erase') save(current.current);
  };
  const cancel = (e) => {
    if (active.current?.id !== e.pointerId) return;
    const operation = active.current;
    active.current = null;
    setSelection(null);
    setPreview(null);
    if (operation.kind === 'write' || operation.kind === 'erase' || operation.kind === 'board-erase' && operation.stroke) save(current.current);
  };
  const undo = () => {
    const next = current.current.slice(0, -1);
    replace(next);
    setDirty(true);
    save(next);
  };
  const clear = () => {
    if (!window.confirm('Bu sayfadaki bütün işaretlemeleri silmek istiyor musun?')) return false;
    if (current.current.length) {
      replace([]);
      setDirty(true);
      save([]);
    }
    if (type === 'QUESTION') onBoardAction?.({ questionId: id, kind: 'clear' });
    return true;
  };
  const chooseMode = (next) => { setMode(next); setPanel(null); };
  const togglePanel = (next) => setPanel((old) => old === next ? null : next);
  const toggleGraph = () => {
    if (graph.open) { updateGraph({ ...graph, open: false }); setPanel(null); }
    else { updateGraph({ ...graph, open: true }); setPanel('graph'); }
  };
  const chooseErase = (value, select) => {
    if (value === 'clear') {
      if (clear()) chooseMode('click');
      else select.value = mode === 'erase' || mode === 'area' ? mode : '';
    }
    else chooseMode(value || 'click');
  };

  return <div className="page-ink" aria-label="Sayfa karalaması">
    {type !== 'QUESTION' && graph.open && <GraphPaper graph={graph} onApply={updateGraph} onClose={() => { updateGraph({ ...graph, open: false }); setPanel(null); }}
      saving={saving} showSettings={panel === 'graph'} />}
    <canvas ref={canvas} className={`page-ink-canvas${mode !== 'click' ? ` writing mode-${mode}` : ''}`}
      aria-label={`Sayfanın tamamı: ${MODE_LABEL[mode]} modu`}
      onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} />
    {selection && <div className="page-ink-selection" style={{ left: `${Math.min(selection.start[0], selection.end[0]) * 100}%`,
      top: `${Math.min(selection.start[1], selection.end[1]) * 100}%`, width: `${Math.abs(selection.end[0] - selection.start[0]) * 100}%`,
      height: `${Math.abs(selection.end[1] - selection.start[1]) * 100}%` }} />}
    <div className="page-ink-tools" role="group" aria-label="Karalama modu ve işlemleri">
      <span className="page-ink-label">Tüm sayfa · {mode === 'shape' ? SHAPES[shape] : MODE_LABEL[mode]}</span>
      <button type="button" className="btn btn-secondary btn-sm" aria-pressed={mode === 'click'} onClick={() => chooseMode('click')}>Tıkla</button>
      <button type="button" className="btn btn-secondary btn-sm" aria-pressed={mode === 'write'} disabled={loading || conflict} onClick={() => chooseMode('write')}>Yaz</button>
      <span className="page-ink-colors" role="group" aria-label="Kalem rengi">
        {COLORS.map((value) => <button key={value} type="button" className={`page-ink-color color-${value.toLowerCase()}`}
          aria-label={`${COLOR_LABELS[value]} kalem`} title={COLOR_LABELS[value]} aria-pressed={color === value}
          onClick={() => setColor(value)}><span aria-hidden="true" /></button>)}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={loading || saving || conflict || !strokes.length} onClick={undo}>Geri al</button>
      <select className="page-ink-erase btn btn-secondary btn-sm" aria-label="Silme" value={mode === 'erase' || mode === 'area' ? mode : ''}
        disabled={loading || saving || conflict} onChange={(event) => chooseErase(event.target.value, event.currentTarget)}>
        <option value="">Silme</option><option value="erase">Silgi</option><option value="area">Alan sil</option><option value="clear">Tümünü sil</option>
      </select>
      {type !== 'QUESTION' && <>
        <button type="button" className="btn btn-secondary btn-sm" aria-expanded={panel === 'shapes'} onClick={() => togglePanel('shapes')}>Şekiller</button>
        <button type="button" className="btn btn-secondary btn-sm" aria-expanded={panel === 'calculator'} onClick={() => togglePanel('calculator')}>Hesap makinesi</button>
        <button type="button" className="btn btn-secondary btn-sm" aria-pressed={graph.open} disabled={loading || saving || conflict} onClick={toggleGraph}>Grafik</button>
      </>}
      <span role="status" className="page-ink-status">{loading ? 'Yükleniyor…' : saving ? 'Kaydediliyor…' : error || (dirty ? 'Kaydedilmedi' : 'Kaydedildi')}</span>
      {error && <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => conflict ? load() : dirty ? save(current.current) : load()}>{conflict ? 'Sunucudaki çizimi yükle' : 'Yeniden dene'}</button>}
    </div>
    {panel === 'shapes' && <section className="page-ink-panel" aria-label="Geometri şekilleri">
      <div className="page-ink-panel-head"><strong>Geometri şekilleri</strong><button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(null)} aria-label="Şekilleri kapat">✕</button></div>
      <p className="small muted">Şekli seçip sayfada başlangıçtan bitişe sürükle.</p>
      <div className="page-ink-panel-actions">{Object.entries(SHAPES).map(([key, label]) => <button key={key} type="button" className="btn btn-secondary btn-sm"
        aria-pressed={mode === 'shape' && shape === key} onClick={() => { setShape(key); chooseMode('shape'); }}>{label}</button>)}</div>
    </section>}
    {panel === 'calculator' && <ScientificCalculator onClose={() => setPanel(null)} />}
    <p className="sr-only">Yaz modunda soru, şıklar ve boşluklar üzerine çizebilirsin. Tıkla modunda normal seçim ve gezinme çalışır. Silgi ve alan silme çizgileri kaldırır. Her çizgi bitince kaydedilir.</p>
  </div>;
}
