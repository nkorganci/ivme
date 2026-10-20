import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

export function useDisplayPreference(key, fallback) {
  const { user } = useAuth();
  const [value, setValue] = useState(fallback);
  const [error, setError] = useState('');
  const changed = useRef(false);
  const pending = useRef(Promise.resolve());
  const epoch = useRef(0);

  useEffect(() => {
    let active = true;
    epoch.current += 1;
    changed.current = false;
    setValue(fallback);
    setError('');
    api.get(`/api/preferences/${key}`).then(saved => {
      if (active && !changed.current) setValue(saved.value);
    }).catch(reason => { if (active) setError(`Görünüm tercihi okunamadı: ${reason.message}`); });
    return () => { active = false; };
  }, [key, fallback, user?.id]);

  const update = next => {
    changed.current = true;
    setValue(next);
    setError('');
    const requestEpoch = epoch.current;
    pending.current = pending.current.catch(() => {}).then(() => {
      if (requestEpoch === epoch.current)
        return api.put(`/api/preferences/${key}`, { value: next })
          .catch(reason => setError(`Görünüm tercihi kaydedilemedi: ${reason.message}`));
      return null;
    });
  };
  return [value, update, error];
}
