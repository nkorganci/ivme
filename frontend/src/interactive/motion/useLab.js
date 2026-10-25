import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motionOf } from './model.js';

/** Katmanlar: öğrenci açıp kapatır; senaryo kendi varsayılanını verebilir. */
export const DEFAULT_LAYERS = { strobe: true, arrows: true, area: false, slope: false, disp: false, events: true, target: true };
export const LAYER_LABELS = [
  ['strobe', 'İz (eşit aralıklı)'],
  ['arrows', 'Hız ve ivme okları'],
  ['area', 'v-t alanı = yer değiştirme'],
  ['slope', 'Eğim (teğet)'],
  ['disp', 'Yer değiştirme oku'],
  ['events', 'Olay işaretleri'],
];
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8];
export const speedOptions = SPEEDS;

/** Oynatma hızı: bütün hareket yaklaşık 8 saniyede izlenir. */
export function defaultSpeed(T) {
  const wanted = T / 8;
  return SPEEDS.reduce((best, value) => (Math.abs(Math.log(value / wanted)) < Math.abs(Math.log(best / wanted)) ? value : best), 1);
}

/**
 * Laboratuvar durumu: senaryo (cisimler), zaman, oynatma, katmanlar ve seçili düğüm.
 * Soru stüdyosu ve görevler aynı kancayı kullanır; seek/load ile laboratuvarı yönlendirir.
 */
export function useLab(initial) {
  const [scenario, setScenario] = useState(initial);
  const [t, setT] = useState(initial.startTime ?? 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => defaultSpeed(initial.T));
  const [layers, setLayers] = useState(() => ({ ...DEFAULT_LAYERS, ...initial.layers }));
  const [focus, setFocus] = useState(initial.bodies[0]?.id);
  const [selected, setSelected] = useState(null);
  const timeRef = useRef(t);
  timeRef.current = t;

  useEffect(() => {
    if (!playing) return undefined;
    let last = performance.now();
    let frame;
    const tick = (now) => {
      const next = Math.min(scenario.T, timeRef.current + ((now - last) / 1000) * speed);
      last = now;
      timeRef.current = next;
      setT(next);
      if (next >= scenario.T) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, scenario.T]);

  const load = useCallback((next, { t: time = next.startTime ?? 0, keepLayers = false } = {}) => {
    setScenario(next);
    setT(time);
    setPlaying(false);
    setSpeed(defaultSpeed(next.T));
    if (!keepLayers) setLayers({ ...DEFAULT_LAYERS, ...next.layers });
    setFocus(next.bodies[0]?.id);
    setSelected(null);
  }, []);
  const seek = useCallback((time) => { setPlaying(false); setT(Math.min(scenario.T, Math.max(0, time))); }, [scenario.T]);
  const play = useCallback(() => {
    if (timeRef.current >= scenario.T - 1e-6) setT(0);
    setPlaying(true);
  }, [scenario.T]);
  const updateBody = useCallback((id, change) => {
    setScenario((current) => ({ ...current, bodies: current.bodies.map((body) => (body.id === id ? change(body) : body)) }));
  }, []);
  const setLayer = useCallback((key, value) => setLayers((current) => ({ ...current, [key]: value })), []);
  const motions = useMemo(() => scenario.bodies.map((body) => motionOf(body, scenario.T)), [scenario]);

  return {
    scenario, setScenario, load, updateBody, motions,
    t, seek, playing, play, pause: () => setPlaying(false), speed, setSpeed,
    layers, setLayers, setLayer, focus, setFocus, selected, setSelected,
  };
}
