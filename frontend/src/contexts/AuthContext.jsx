// frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in (on page load)
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const response = await api.get('/accounts/user/');
        if (isMounted) {
          console.log('User already authenticated:', response.data);
          setUser(response.data);
        }
      } catch (error) {
        if (isMounted) {
          // Handle 404 or 401 gracefully
          if (error.response?.status === 404) {
            console.log('User endpoint not found (404) - skipping auth check');
          } else if (error.response?.status === 401) {
            console.log('No authenticated user (401)');
          } else {
            console.log('Auth check error:', error.message);
          }
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once!

  const login = async (username, password) => {
    try {
      console.log('AuthContext: Attempting login...');
      const response = await api.post('/accounts/login/', {
        username,
        password
      });

      console.log('AuthContext: Full response:', response);
      console.log('AuthContext: Response data:', response.data);
      console.log('AuthContext: Response status:', response.status);

      // Extract user data from response
      const userData = response.data.user || response.data;
      console.log('AuthContext: Extracted user data:', userData);

      if (!userData) {
        console.error('AuthContext: No user data found in response!');
        throw new Error('No user data in response');
      }

      if (!userData.role) {
        console.error('AuthContext: User data missing role!', userData);
        throw new Error('User role missing in response');
      }

      // Save user to state
      setUser(userData);
      console.log('AuthContext: User saved to state:', userData);

      // Return user data so LoginPage can use it
      console.log('AuthContext: Returning user data');
      return userData;
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      console.error('AuthContext: Error response:', error.response?.data);
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
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await api.post('/accounts/signup/', {
        username,
        email,
        password,
      });

      const userData = response.data.user || response.data;
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    signup,
    loading,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};