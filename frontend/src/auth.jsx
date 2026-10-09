import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const current = await api.get('/api/auth/me');
    setUser(current);
    return current;
  }, []);

  // İlk açılışta oturum kontrolü; başka bir istek 401 dönerse oturum düşürülür.
  useEffect(() => {
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
    async (username, email, phone, password) => {
      await api.post('/api/auth/register', { username, email, phone, password });
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

  const value = useMemo(() => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
