import { useCallback, useEffect, useRef, useState } from 'react';
import { api, qs } from './api.js';
import { ActiveTime } from './activeTime.js';

/** Görünür ve odaklı sekmede, son etkileşimden sonraki en çok 60 saniyeyi yaklaşık aktif süre sayar. */
function useActiveSeconds(questionId) {
  const focused = () => document.hasFocus() || window.matchMedia('(pointer: coarse)').matches;
  const clock = useRef(null);
  if (!clock.current) clock.current = new ActiveTime(performance.now(), document.visibilityState === 'visible', focused());
  useEffect(() => {
    clock.current = new ActiveTime(performance.now(), document.visibilityState === 'visible', focused());
    const mark = () => clock.current.interact(performance.now());
    const onVisibility = () => clock.current.setVisibility(performance.now(), document.visibilityState === 'visible');
    const onFocus = () => clock.current.setFocus(performance.now(), focused());
    const onBlur = () => clock.current.setFocus(performance.now(), focused());
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [questionId]);
  return { read: () => clock.current.read(performance.now()), reset: () => clock.current.reset(performance.now()) };
}

/** Kaybolan ağ yanıtında aynı olay kimliğini tekrar kullanır; sunucu çift kayıt açmaz. */
export function usePractice(questionId, sessionId = null) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const active = useActiveSeconds(questionId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setState(await api.get(`/api/questions/${questionId}/practice` + qs({ sessionId }))); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [questionId, sessionId]);
  useEffect(() => { load(); }, [load]);

  const submit = async (eventType, answer = null) => {
    if (busy || loading) return null;
    const key = `${sessionId || ''}:${eventType}:${answer || ''}`;
    if (!pending.current || pending.current.key !== key) {
      pending.current = { key, id: crypto.randomUUID(), seconds: active.read() };
    }
    setBusy(true);
    setError('');
    try {
      const next = await api.post(`/api/questions/${questionId}/practice`, {
        clientEventId: pending.current.id,
        eventType,
        answer,
        activeSeconds: pending.current.seconds,
        sessionId: sessionId || undefined,
      });
      setState(next);
      pending.current = null;
      active.reset();
      return next;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { state, loading, busy, error, setError, load, submit,
    selectionChanged: () => { pending.current = null; } };
}
