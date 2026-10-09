import { useCallback, useEffect, useRef, useState } from 'react';
import { api, qs } from './api.js';

/** Görünür ve odaklı sekmede, son etkileşimden sonraki en çok 60 saniyeyi yaklaşık aktif süre sayar. */
function useActiveSeconds(questionId) {
  const seconds = useRef(0);
  const lastInteraction = useRef(Date.now());
  useEffect(() => {
    seconds.current = 0;
    lastInteraction.current = Date.now();
    const mark = () => { lastInteraction.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()
          && Date.now() - lastInteraction.current < 60000) seconds.current += 1;
    }, 1000);
    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [questionId]);
  return { read: () => Math.min(21600, seconds.current), reset: () => { seconds.current = 0; } };
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
