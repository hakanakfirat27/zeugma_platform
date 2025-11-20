import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import EmailTwoFactorVerificationModal from '../../components/auth/EmailTwoFactorVerificationModal';
import EmailTwoFactorSetupModal from '../../components/auth/EmailTwoFactorSetupModal';
import api from '../../utils/api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [requires2FASetup, setRequires2FASetup] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempEmail, setTempEmail] = useState('');

  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setInfoMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Redirect authenticated users who aren't setting up 2FA
  useEffect(() => {
    if (user && !requires2FASetup) {
      redirectToDashboard(user);
    }
  }, [user, requires2FASetup]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await api.post('/accounts/login/', {
        username: formData.username,
        password: formData.password,
        remember_me: rememberMe
      });

      // Check if 2FA is required
      if (response.data.requires_2fa) {
        setRequires2FA(true);
        setTempUsername(response.data.username);
        setTempEmail(response.data.email);
        setInfoMessage(response.data.message); // Show "Code sent to email" message
        setLoading(false);
        return;
      }

      // Check if 2FA setup is required
      if (response.data.requires_2fa_setup) {
        setRequires2FASetup(true);
        await checkAuth(); // Update auth context
        setLoading(false);
        return;
      }

      // Regular login success
      if (response.data.user) {
        await checkAuth(); // Update auth context
        setLoading(false);
        // Redirect will happen via useEffect
      }
    } catch (err) {
      if (err.response?.data?.error?.includes('inactive') ||
          err.response?.data?.error?.includes('not verified')) {
        setError('Your account is not yet verified. Please check your email for the verification link.');
      } else {
        setError(err.response?.data?.error || 'Invalid username or password');
      }
      setLoading(false);
    }
  };

  const handle2FASuccess = async (userData) => {
    setRequires2FA(false);
    await checkAuth();
    // Redirect will happen via useEffect
  };

  const handle2FASetupComplete = async () => {
    setRequires2FASetup(false);
    await checkAuth();
    // Redirect will happen via useEffect
  };

  const redirectToDashboard = (userData) => {
    const userRole = userData.role;

    if (userRole === 'SUPERADMIN' || userRole === 'STAFF_ADMIN') {
      navigate('/staff-dashboard', { replace: true });
    } else if (userRole === 'CLIENT') {
      navigate('/client-dashboard', { replace: true });
    } else if (userRole === 'DATA_COLLECTOR') {
      navigate('/data-collector-dashboard', { replace: true });      
    } else if (userRole === 'GUEST') {
      navigate('/guest-dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {infoMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{infoMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                {error.includes('not verified') && (
                  <Link
                    to="/signup"
                    className="text-sm text-red-600 hover:text-red-700 font-medium mt-2 inline-block"
                  >
                    Resend verification email →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your username or email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Remember Me and Forgot Password on same line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Email 2FA Verification Modal */}
      <EmailTwoFactorVerificationModal
        isOpen={requires2FA}
        username={tempUsername}
        email={tempEmail}
        rememberMe={rememberMe}
        onSuccess={handle2FASuccess}
        onCancel={() => {
          setRequires2FA(false);
          setTempUsername('');
          setTempEmail('');
        }}
      />

      {/* Email 2FA Setup Modal (Required on first login) */}
      <EmailTwoFactorSetupModal
        isOpen={requires2FASetup}
        onClose={() => {}} // Can't close if required
        onComplete={handle2FASetupComplete}
        isRequired={true}
      />
    </div>
  );
};

export default LoginPage;