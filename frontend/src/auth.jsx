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
    setUser(u);
    return u;
  }, []);

  // Kayıt sonrası oturum açılmış mı belirsiz olduğundan ayrıca giriş yapılır.
  const register = useCallback(
    async (username, email, phone, password, category) => {
      await api.post('/api/auth/register', { username, email, phone, password, category });
      return login(username, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, devAutoLogin, login, register, logout, refreshUser }),
    [user, loading, devAutoLogin, login, register, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
