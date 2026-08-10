import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const token = localStorage.getItem('pitchgrill_token');
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    getMe()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        localStorage.removeItem('pitchgrill_token');
        setStatus('unauthenticated');
      });
  }, []);

  function loginWithToken(token, me) {
    localStorage.setItem('pitchgrill_token', token);
    setUser(me);
    setStatus('authenticated');
  }

  function logout() {
    localStorage.removeItem('pitchgrill_token');
    setUser(null);
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ user, status, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
