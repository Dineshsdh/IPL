import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('ipl_token');
    const savedUser = localStorage.getItem('ipl_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('ipl_token', newToken);
    localStorage.setItem('ipl_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, teamName, role = 'team') => {
    const res = await api.post('/auth/register', { name, email, password, teamName, role });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('ipl_token', newToken);
    localStorage.setItem('ipl_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ipl_token');
    localStorage.removeItem('ipl_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isTeam = user?.role === 'team';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
