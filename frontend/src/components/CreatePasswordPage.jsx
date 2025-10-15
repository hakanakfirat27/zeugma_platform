import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import PasswordStrengthInput from '../components/PasswordStrengthInput';
import api from '../utils/api';

const CreatePasswordPage = () => {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const { data } = await api.post(`/api/auth/validate-password-token/${uidb64}/${token}/`);
      setValid(data.valid);
      setUser(data.user);
      console.log('User data from token:', data.user); // Debug
    } catch (err) {
      setValid(false);
      setError(err.response?.data?.message || 'Invalid or expired link');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password
    if (password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)) {
      setError('Please meet all password requirements');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create password
      await api.post(`/api/auth/create-password/${uidb64}/${token}/`, {
        password: password,
      });

      // Auto-login the user
      try {
        const loginResponse = await api.post('/accounts/login/', {
          username: user.username,
          password: password,
        });

        // Redirect to profile update page with full user data
        navigate('/update-profile', {
          state: {
            message: 'Password created successfully! Please complete your profile.',
            user: {
              ...user,
              ...loginResponse.data.user
            }
          }
        });
      } catch (loginErr) {
        // If auto-login fails, still redirect but user needs to login manually
        navigate('/login', {
          state: {
            message: 'Password created successfully! Please login to continue.',
            username: user.username
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating link...</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Your Password</h1>
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{user?.first_name || user?.username}</span>!
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Create a strong password to secure your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <PasswordStrengthInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={true}
          />

          <button
            type="submit"
            disabled={submitting || password.length < 8}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Create Password & Continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePasswordPage;