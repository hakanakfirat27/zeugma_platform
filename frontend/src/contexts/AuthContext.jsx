import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check current session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for storage changes (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        setUser(null);
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const response = await api.get('/accounts/user/');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      // Clear any existing session first
      await api.post('/accounts/logout/').catch(() => {});

      // Login with new credentials
      const response = await api.post('/accounts/login/', {
        username,
        password,
      });

      setUser(response.data.user);

      // Clear any logout events from other tabs
      localStorage.removeItem('logout-event');

      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const signup = async (formData) => {
    try {
      const response = await api.post('/accounts/signup/', {
        username: formData.username.toLowerCase().trim(),
        email: formData.email.toLowerCase().trim(),
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password1,
        role: 'GUEST', // Set default role for signup
      });

      return { success: true, user: response.data };
    } catch (error) {
      // Re-throw the error so the component can handle it
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/accounts/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);

      // Signal other tabs to logout
      localStorage.setItem('logout-event', Date.now().toString());
      setTimeout(() => localStorage.removeItem('logout-event'), 100);

      navigate('/login');
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;