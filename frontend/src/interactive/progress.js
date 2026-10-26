import { useCallback, useState } from 'react';
import { useAuth } from '../auth.jsx';

const EMPTY = { studio: {}, tasks: {}, questions: {} };

function read(key) {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(key) ?? 'null') }; } catch { return EMPTY; }
}

/** Pilot ilerleme kaydı: kullanıcıya özel anahtarla tarayıcıda tutulur (sunucuya yazılmaz). */
export function useUnitProgress(unitKey) {
  const { user } = useAuth();
  const key = `ivme:interaktif:${unitKey}:${user?.id ?? 'anon'}:v1`;
  const [state, setState] = useState(() => read(key));
  const record = useCallback((area, id, value) => {
    setState((current) => {
      const next = { ...current, [area]: { ...current[area], [id]: { ...current[area]?.[id], ...value, at: new Date().toISOString() } } };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* özel kipte kayıt olmayabilir */ }
      return next;
    });
  }, [key]);
  return [state, record];
}
