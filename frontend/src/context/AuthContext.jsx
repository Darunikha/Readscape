import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthorized, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    if (!tokenStore.get()) return;
    api.get('/auth/me')
      .then(({ user: u }) => setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [logout]);

  const handleAuth = useCallback(({ token, user: u }) => {
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: (identifier, password) => api.post('/auth/login', { identifier, password }).then(handleAuth),
    register: (data) => api.post('/auth/register', data).then(handleAuth),
    logout,
    updateProfile: (data) => api.patch('/users/me', data).then(({ user: u }) => { setUser(u); return u; }),
  }), [user, loading, handleAuth, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
