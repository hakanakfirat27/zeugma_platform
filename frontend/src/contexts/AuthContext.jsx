import { createContext, useContext, useState, useEffect } from 'react';
import api, { fetchCsrfToken } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      await fetchCsrfToken();
      await checkAuth();
    } catch (error) {
      console.error('Auth init error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/accounts/me/');
      if (response.data && response.data.id) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    }
  };

  const login = async (username, password) => {
    await fetchCsrfToken();
    const response = await api.post('/api/accounts/login/', { username, password });
    await checkAuth();
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/api/accounts/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  };

  const signup = async (userData) => {
    await fetchCsrfToken();
    const response = await api.post('/api/accounts/signup/', userData);
    return response.data;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    signup,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'SUPERADMIN',
    isStaffAdmin: user?.role === 'STAFF_ADMIN' || user?.role === 'SUPERADMIN',
    isClient: user?.role === 'CLIENT',
    isGuest: user?.role === 'GUEST',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};