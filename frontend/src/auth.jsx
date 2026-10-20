import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

function ActiveTimeRecorder({ userId, onError }) {
  useEffect(() => {
    let lastTick = Date.now();
    let lastInteraction = lastTick;
    const lockKey = `ivme.active-heartbeat.${userId}`;
    const interacted = () => { lastInteraction = Date.now(); };
    const resetTick = () => { lastTick = Date.now(); };
    const heartbeat = () => {
      const now = Date.now();
      const activeSeconds = Math.min(90, Math.round((now - lastTick) / 1000));
      lastTick = now;
      if (document.visibilityState !== 'visible' || !navigator.onLine || now - lastInteraction > 90_000 || activeSeconds < 1) return;
      if (navigator.locks?.request) {
        navigator.locks.request(lockKey, { ifAvailable: true }, async lock => {
          if (!lock) return;
          try { await api.post('/api/auth/activity', { activeSeconds }); onError(''); }
          catch (error) { onError(`Etkinlik süresi kaydedilemedi: ${error.message}`); }
          await new Promise(resolve => window.setTimeout(resolve, 28_000));
        }).catch(error => onError(`Etkinlik süresi kaydedilemedi: ${error.message}`));
      } else {
        api.post('/api/auth/activity', { activeSeconds })
          .then(() => onError(''))
          .catch(error => onError(`Etkinlik süresi kaydedilemedi: ${error.message}`));
      }
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, interacted, { passive: true }));
    document.addEventListener('visibilitychange', resetTick);
    const timer = window.setInterval(heartbeat, 30_000);
    return () => {
      window.clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, interacted));
      document.removeEventListener('visibilitychange', resetTick);
    };
  }, [userId, onError]);
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devAutoLogin, setDevAutoLogin] = useState(false);
  const [activityError, setActivityError] = useState('');
  const initialized = useRef(false);

  const refreshUser = useCallback(async () => {
    let current;
    try {
      current = await api.get('/api/auth/me');
    } catch (error) {
      if (error.status !== 401) throw error;
      if (['/giris', '/kayit'].includes(window.location.pathname) || sessionStorage.getItem('ivme.signed-out')) throw error;
      try {
        current = await api.post('/api/auth/dev-login');
        setDevAutoLogin(true);
      } catch {
        throw error;
      }
    }
    setUser(current);
    return current;
  }, []);

  // İlk açılışta oturum kontrolü; başka bir istek 401 dönerse oturum düşürülür.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setUnauthorizedHandler(() => setUser(null));
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (loginName, password) => {
    const u = await api.post('/api/auth/login', { login: loginName, password });
    sessionStorage.removeItem('ivme.signed-out');
    setDevAutoLogin(false);
    setActivityError('');
    setUser(u);
    return u;
  }, []);

  // Registration creates a pending account; only administrator approval opens access.
  const register = useCallback(
    async (username, email, phone, password, category) => {
      return api.post('/api/auth/register', { username, email, phone, password, category });
    },
    [],
  );

  const switchAccount = useCallback(async role => {
    const current = await api.post(`/api/auth/dev-switch/${role}`);
    sessionStorage.removeItem('ivme.signed-out');
    setDevAutoLogin(true);
    setActivityError('');
    setUser(current);
    return current;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    try { sessionStorage.setItem('ivme.signed-out', '1'); }
    catch { /* Sunucudaki çıkış tamamlandı; tarayıcı depolaması zorunlu değil. */ }
    setDevAutoLogin(false);
    setActivityError('');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, devAutoLogin, activityError, login, register, logout, refreshUser, switchAccount }),
    [user, loading, devAutoLogin, activityError, login, register, logout, refreshUser, switchAccount]);
  return <AuthContext.Provider value={value}>{children}{user && <ActiveTimeRecorder key={user.id} userId={user.id} onError={setActivityError} />}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
