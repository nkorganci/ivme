import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const LIMIT = 100;

function draw(canvas, strokes) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ink = getComputedStyle(canvas).getPropertyValue('--blue').trim();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 2.5;
  for (const stroke of strokes) {
    ctx.beginPath();
    stroke.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x * rect.width, y * rect.height);
      else ctx.lineTo(x * rect.width, y * rect.height);
    });
    if (stroke.length === 1) {
      ctx.arc(stroke[0][0] * rect.width, stroke[0][1] * rect.height, 1.25, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.stroke();
  }
}

/** Noktalar tahta ölçüsüne göre 0–1 aralığında saklanır; yeniden boyutlanınca çizim korunur. */
export default function QuestionBoard({ questionId, onUnavailable, height }) {
  const canvas = useRef(null);
  const strokesRef = useRef([]);
  const active = useRef(null);
  const version = useRef(0);
  const [strokes, setStrokes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [changed, setChanged] = useState(false);

  const replace = (next) => { strokesRef.current = next; setStrokes(next); };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const board = await api.get(`/api/questions/${questionId}/board`);
      version.current = board.version;
      replace(board.strokes);
      setChanged(false);
      setConflict(false);
      setError('');
    } catch (e) {
      if (e.status === 404) onUnavailable();
      else setError(e.message);
    }
    finally { setLoading(false); }
  }, [questionId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return undefined;
    const observer = new ResizeObserver(() => draw(target, strokesRef.current));
    observer.observe(target);
    draw(target, strokes);
    return () => observer.disconnect();
  }, [strokes]);

  const save = async (next) => {
    if (JSON.stringify(next).length > 65536) {
      setError('Karalama çok büyük. Birkaç çizgiyi geri al.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const board = await api.put(`/api/questions/${questionId}/board`, { version: version.current, strokes: next });
      version.current = board.version;
      setChanged(false);
      setConflict(false);
    } catch (e) {
      if (e.status === 409) {
        try {
          const remote = await api.get(`/api/questions/${questionId}/board`);
          if (JSON.stringify(remote.strokes) === JSON.stringify(next)) {
            version.current = remote.version;
            setChanged(false);
            setConflict(false);
            return;
          }
        } catch { /* Son kaydı da okuyamazsak yerel çizimi ekranda tut. */ }
        setConflict(true);
      }
      setError(e.message);
    } finally { setSaving(false); }
  };

  const point = (e) => {
    const rect = canvas.current.getBoundingClientRect();
    return [Math.round(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * 1000) / 1000,
      Math.round(Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) * 1000) / 1000];
  };
  const start = (e) => {
    if (loading || saving || conflict || strokesRef.current.length >= LIMIT || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = { id: e.pointerId, stroke: [point(e)] };
    replace([...strokesRef.current, active.current.stroke]);
    setChanged(true);
  };
  const move = (e) => {
    if (active.current?.id !== e.pointerId) return;
    const stroke = active.current.stroke;
    if (stroke.length >= 250) return;
    const next = point(e);
    const last = stroke[stroke.length - 1];
    if (Math.abs(next[0] - last[0]) + Math.abs(next[1] - last[1]) < 0.003) return;
    stroke.push(next);
    replace([...strokesRef.current]);
  };
  const finish = (e) => {
    if (active.current?.id !== e.pointerId) return;
    active.current = null;
    save(strokesRef.current);
  };
  const undo = () => { const next = strokesRef.current.slice(0, -1); replace(next); setChanged(true); save(next); };
  const clear = () => {
    if (!window.confirm('Bu sorunun karalamasını temizlemek istiyor musun?')) return;
    replace([]); setChanged(true); save([]);
  };

  return (
    <div className="board" style={height ? { '--board-height': `${height}px` } : undefined}>
      <canvas ref={canvas} className="board-canvas" aria-label="Soru için karalama alanı"
        onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
      <div className="board-tools">
        <button type="button" className="btn btn-secondary btn-sm" disabled={loading || saving || conflict || !strokes.length} onClick={undo}>Geri al</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={loading || saving || conflict || !strokes.length} onClick={clear}>Temizle</button>
        <span role="status" className={`board-status ${error ? 'board-error' : ''}`}>
          {loading ? 'Yükleniyor…' : saving ? 'Kaydediliyor…' : error || (changed ? 'Kaydedilmedi' : 'Kaydedildi')}
        </span>
      </div>
      {error && <div className="board-retry">
        {conflict
          ? <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Sunucudaki çizimi yükle</button>
          : <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => changed ? save(strokesRef.current) : load()}>Yeniden dene</button>}
      </div>}
      <p className="muted small board-help">Kalem veya parmağınla çiz. Her çizgi bitince kaydedilir.</p>
    </div>
  );
}
