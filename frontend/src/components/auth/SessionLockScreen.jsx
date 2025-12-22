// SessionLockScreen.jsx - Lock screen for timed-out sessions with "Remember Me"
import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, LogOut, AlertCircle } from 'lucide-react';
import api from '../../utils/api';

/**
 * SessionLockScreen Component
 * 
 * Shown when a session times out but "Remember Me" was checked.
 * User only needs to enter password to unlock (no username needed).
 * 
 * Props:
 * - user: Object containing user info (username, email, first_name, last_name, full_name)
 * - onUnlock: Callback when session is successfully unlocked
 * - onLogout: Callback when user chooses to logout instead
 */
const SessionLockScreen = ({ user, onUnlock, onLogout }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Auto-focus password field
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('unlock-password')?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/unlock-session/', {
        password: password
      });

      if (response.data.success) {
        setPassword('');
        setAttempts(0);
        onUnlock(response.data.user);
      }
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setError('Too many failed attempts. Please log in again.');
        // Force logout after too many attempts
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Invalid password. Please try again.');
      }
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout/');
    } catch (err) {
      console.error('Logout error:', err);
    }
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="relative w-full max-w-md mx-4">
        {/* Lock Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with lock icon */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Session Locked</h1>
            <p className="text-indigo-100 text-sm">Your session was locked due to inactivity</p>
          </div>

          {/* Unlock form */}
          <form onSubmit={handleUnlock} className="px-8 py-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="unlock-password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your password to unlock
              </label>
              <div className="relative">
                <input
                  id="unlock-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {attempts > 0 && attempts < 5 && (
                <p className="mt-2 text-xs text-gray-500">
                  {5 - attempts} attempts remaining
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Unlocking...
                </span>
              ) : (
                'Unlock Session'
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Logout option */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign in as different user
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Session locked for your security
        </p>
      </div>
    </div>
  );
};

export default SessionLockScreen;
