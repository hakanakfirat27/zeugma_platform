import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

// Function to get CSRF token from cookies
const getCsrfToken = () => {
  const name = 'csrftoken';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Function to fetch CSRF token from backend
export const fetchCsrfToken = async () => {
  try {
    await axios.get('http://localhost:8000/accounts/csrf/', {
      withCredentials: true,
    });
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
  }
};

// Request interceptor to add CSRF token
api.interceptors.request.use(
  async (config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      let token = getCsrfToken();

      if (!token) {
        await fetchCsrfToken();
        token = getCsrfToken();
      }

      if (token) {
        config.headers['X-CSRFToken'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Track if we've had a valid session
let hasHadValidSession = false;

export const markSessionValid = () => {
  hasHadValidSession = true;
};

export const markSessionEnded = () => {
  hasHadValidSession = false;
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    
    if (isRedirecting) {
      return Promise.reject(error);
    }
    
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('/login') || 
                       currentPath.includes('/signup') ||
                       currentPath.includes('/create-password') ||
                       currentPath.includes('/verify-email');
    
    if (isAuthPage) {
      return Promise.reject(error);
    }
    
    // Handle 401 - Unauthorized
    if (status === 401) {
      // Don't redirect if session is locked - let AuthContext handle it
      if (data?.error === 'session_locked' && data?.locked) {
        return Promise.reject(error);
      }
      
      // Session expired or terminated
      isRedirecting = true;
      
      if (hasHadValidSession) {
        let logoutReason = 'session_expired';
        let logoutMessage = 'Your session has expired. Please log in again.';
        
        if (data?.error === 'session_terminated') {
          logoutReason = 'session_terminated';
          logoutMessage = 'You have been logged out because you signed in from another location.';
        }
        
        sessionStorage.setItem('logoutReason', logoutReason);
        sessionStorage.setItem('logoutMessage', logoutMessage);
      }
      
      hasHadValidSession = false;
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Handle 403 - Forbidden (could be terminated session OR permission error)
    if (status === 403 && hasHadValidSession) {
      try {
        const authCheck = await axios.get('http://localhost:8000/api/auth/session-status/', {
          withCredentials: true,
        });
        
        if (!authCheck.data.authenticated) {
          isRedirecting = true;
          hasHadValidSession = false;
          
          sessionStorage.setItem('logoutReason', 'session_terminated');
          sessionStorage.setItem('logoutMessage', 'You have been logged out. This may be because you signed in from another device.');
          
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        if (authCheck.data.status === 'locked') {
          return Promise.reject(error);
        }
        
      } catch (authError) {
        if (authError.response?.status === 401 || authError.response?.status === 403) {
          isRedirecting = true;
          hasHadValidSession = false;
          
          sessionStorage.setItem('logoutReason', 'session_terminated');
          sessionStorage.setItem('logoutMessage', 'You have been logged out. This may be because you signed in from another device.');
          
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
