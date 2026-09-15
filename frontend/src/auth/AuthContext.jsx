import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(!!getToken());
  const [error, setError] = useState('');

  const fetchMe = useCallback(async () => {
    const data = await apiFetch('/api/me');
    setCurrentUser(data.user);
    setDashboard(data.dashboard || {});
    return data;
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .catch(() => {
        setToken('');
        setTokenState('');
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
  }, [token, fetchMe]);

  const login = useCallback(
    async (email, password) => {
      setError('');
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      setToken(data.token);
      setTokenState(data.token);
      setLoading(true);
      try {
        await fetchMe();
      } finally {
        setLoading(false);
      }
      return data;
    },
    [fetchMe]
  );

  const logout = useCallback(() => {
    setToken('');
    setTokenState('');
    setCurrentUser(null);
    setDashboard({});
  }, []);

  const value = useMemo(
    () => ({ token, currentUser, dashboard, loading, error, setError, login, logout, refresh: fetchMe }),
    [token, currentUser, dashboard, loading, error, login, logout, fetchMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
