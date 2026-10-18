import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devAutoLogin, setDevAutoLogin] = useState(false);
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
    setUser(current);
    return current;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      sessionStorage.setItem('ivme.signed-out', '1');
      setDevAutoLogin(false);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, devAutoLogin, login, register, logout, refreshUser, switchAccount }),
    [user, loading, devAutoLogin, login, register, logout, refreshUser, switchAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
