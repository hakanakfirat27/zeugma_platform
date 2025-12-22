import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { markSessionValid, markSessionEnded } from '../utils/api';
import SessionLockScreen from '../components/auth/SessionLockScreen';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUser, setLockedUser] = useState(null);
  const [sessionSettings, setSessionSettings] = useState({
    timeoutMinutes: 0,
    rememberMe: false,
  });
  const navigate = useNavigate();
  
  // Refs for activity tracking
  const lastActivityRef = useRef(Date.now());
  const timeoutCheckIntervalRef = useRef(null);
  const justUnlockedRef = useRef(false);
  const activityEventsRef = useRef(['mousedown', 'keydown', 'scroll', 'touchstart', 'click']);

  // Clear the timeout interval
  const clearTimeoutInterval = useCallback(() => {
    if (timeoutCheckIntervalRef.current) {
      clearInterval(timeoutCheckIntervalRef.current);
      timeoutCheckIntervalRef.current = null;
    }
  }, []);

  // Check if session should be locked due to inactivity
  const checkSessionTimeout = useCallback(() => {
    // Skip if we just unlocked
    if (justUnlockedRef.current) {
      return;
    }

    const timeoutMinutes = sessionSettings.timeoutMinutes;
    const rememberMe = sessionSettings.rememberMe;

    if (!user || isLocked || timeoutMinutes <= 0) {
      return;
    }

    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity >= timeoutMs) {
      // Clear interval first to prevent multiple triggers
      clearTimeoutInterval();
      
      if (rememberMe) {
        // Lock the session (sleep mode)
        setIsLocked(true);
        setLockedUser({
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
        });
      } else {
        // Full logout
        markSessionEnded();
        setUser(null);
        setIsLocked(false);
        setLockedUser(null);
        
        sessionStorage.setItem('logoutReason', 'session_expired');
        sessionStorage.setItem('logoutMessage', 'Your session has expired due to inactivity. Please log in again.');
        
        navigate('/login');
      }
    }
  }, [user, isLocked, sessionSettings, navigate, clearTimeoutInterval]);

  // Set up activity tracking and timeout checking
  useEffect(() => {
    clearTimeoutInterval();

    if (!user || isLocked) {
      return;
    }

    if (sessionSettings.timeoutMinutes <= 0) {
      return;
    }

    // Add activity event listeners
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      justUnlockedRef.current = false;
    };

    activityEventsRef.current.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Reset activity timestamp
    lastActivityRef.current = Date.now();

    // Check every 10 seconds if session should be locked
    timeoutCheckIntervalRef.current = setInterval(() => {
      checkSessionTimeout();
    }, 10000);

    return () => {
      activityEventsRef.current.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeoutInterval();
    };
  }, [user, isLocked, sessionSettings.timeoutMinutes, sessionSettings.rememberMe, checkSessionTimeout, clearTimeoutInterval]);

  // Check current session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for storage changes (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        setUser(null);
        setIsLocked(false);
        setLockedUser(null);
        markSessionEnded();
        sessionStorage.setItem('showLogoutToast', 'true');
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  // Set up API interceptor for session lock detection
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const data = error.response.data;
          
          if (data?.error === 'session_locked' && data?.locked) {
            clearTimeoutInterval();
            setIsLocked(true);
            setLockedUser(data.user);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [clearTimeoutInterval]);

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/session-status/');
      
      if (response.data.status === 'locked') {
        setIsLocked(true);
        setLockedUser(response.data.user);
        setUser(null);
        markSessionValid();
      } else if (response.data.authenticated) {
        setUser(response.data.user);
        setIsLocked(false);
        setLockedUser(null);
        markSessionValid();
        
        setSessionSettings({
          timeoutMinutes: response.data.session_timeout_minutes || 0,
          rememberMe: response.data.remember_me || false,
        });
        
        lastActivityRef.current = Date.now();
      } else {
        setUser(null);
        setIsLocked(false);
        setLockedUser(null);
      }
    } catch (error) {
      if (error.response?.data?.error === 'session_locked') {
        setIsLocked(true);
        setLockedUser(error.response.data.user);
        markSessionValid();
      } else {
        setUser(null);
        setIsLocked(false);
        setLockedUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      await api.post('/accounts/logout/').catch(() => {});

      const response = await api.post('/accounts/login/', {
        username,
        password,
        remember_me: rememberMe,
      });

      setUser(response.data.user);
      setIsLocked(false);
      setLockedUser(null);
      markSessionValid();
      lastActivityRef.current = Date.now();

      localStorage.removeItem('logout-event');

      try {
        const statusResponse = await api.get('/api/auth/session-status/');
        setSessionSettings({
          timeoutMinutes: statusResponse.data.session_timeout_minutes || 0,
          rememberMe: statusResponse.data.remember_me || false,
        });
      } catch (e) {
        console.error('Failed to fetch session settings:', e);
      }

      return { success: true, user: response.data.user, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
        data: error.response?.data,
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
        role: 'GUEST',
      });

      return { success: true, user: response.data };
    } catch (error) {
      throw error;
    }
  };

  const logout = async (showMessage = true) => {
    try {
      await api.post('/accounts/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTimeoutInterval();
      setUser(null);
      setIsLocked(false);
      setLockedUser(null);
      setSessionSettings({ timeoutMinutes: 0, rememberMe: false });
      markSessionEnded();

      localStorage.setItem('logout-event', Date.now().toString());
      setTimeout(() => localStorage.removeItem('logout-event'), 100);

      if (showMessage) {
        sessionStorage.setItem('showLogoutToast', 'true');
      }
      
      navigate('/login');
    }
  };

  // Handle session unlock
  const handleUnlock = useCallback(async (userData) => {
    justUnlockedRef.current = true;
    lastActivityRef.current = Date.now();
    
    setUser(userData);
    setIsLocked(false);
    setLockedUser(null);
    markSessionValid();
    
    try {
      const statusResponse = await api.get('/api/auth/session-status/');
      setSessionSettings({
        timeoutMinutes: statusResponse.data.session_timeout_minutes || 0,
        rememberMe: statusResponse.data.remember_me || false,
      });
    } catch (e) {
      console.error('Failed to fetch session settings after unlock:', e);
    }
    
    setTimeout(() => {
      justUnlockedRef.current = false;
    }, 2000);
  }, []);

  const handleLockScreenLogout = useCallback(() => {
    logout(false);
  }, []);

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isLocked,
    sessionSettings,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLocked && (
        <SessionLockScreen
          user={lockedUser}
          onUnlock={handleUnlock}
          onLogout={handleLockScreenLogout}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
