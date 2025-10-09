import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',  // Changed from 127.0.0.1 to localhost
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
    await axios.get('http://localhost:8000/accounts/csrf/', {  // Changed to localhost
      withCredentials: true,
    });
    console.log('CSRF token fetched');
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;