import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import PasswordStrengthInput from '../../components/auth/PasswordStrengthInput';
import EmailTwoFactorSetupModal from '../../components/auth/EmailTwoFactorSetupModal';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const CreatePasswordPage = () => {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [password, setPassword] = useState('');
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // 2FA setup state
  const [requires2FASetup, setRequires2FASetup] = useState(false);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const { data } = await api.post(`/accounts/validate-password-token/${uidb64}/${token}/`);
      setValid(data.valid);
      setUser(data.user);
    } catch (err) {
      setValid(false);
      setError(err.response?.data?.message || 'Invalid or expired link');
    } finally {
      setValidating(false);
    }
  };

  // Validate password against backend policy
  const validatePassword = async () => {
    try {
      const { data } = await api.post('/accounts/validate-password/', {
        password: password,
        user_id: user?.id
      });
      return data;
    } catch (err) {
      console.error('Password validation error:', err);
      return { valid: false, errors: ['Failed to validate password'] };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    // First validate password against dynamic policy
    const validation = await validatePassword();
    
    if (!validation.valid) {
      setValidationErrors(validation.errors || []);
      setError(validation.errors?.[0] || 'Please meet all password requirements');
      return;
    }

    setSubmitting(true);

    try {
      // Create password - backend will also validate
      const createResponse = await api.post(`/accounts/create-password/${uidb64}/${token}/`, {
        password: password,
      });

      if (!createResponse.data.success) {
        setError(createResponse.data.message || 'Failed to create password');
        setValidationErrors(createResponse.data.errors || []);
        setSubmitting(false);
        return;
      }

      // Auto-login the user
      const loginResponse = await api.post('/accounts/login/', {
        username: user.username,
        password: password,
      });

      // Update auth context
      await checkAuth();

      // Check if 2FA setup is required
      if (loginResponse.data.requires_2fa_setup || loginResponse.data.user?.is_2fa_setup_required) {
        setRequires2FASetup(true);
        setSubmitting(false);
        return;
      }

      // Redirect to profile update page
      navigate('/update-profile', {
        state: {
          message: 'Password created successfully! Please complete your profile.',
          user: loginResponse.data.user
        }
      });

    } catch (err) {
      const errorData = err.response?.data;
      setError(errorData?.message || 'Failed to create password. Please try again.');
      setValidationErrors(errorData?.errors || []);
      setSubmitting(false);
    }
  };

  const handle2FASetupComplete = async () => {
    setRequires2FASetup(false);
    await checkAuth();

    // Get fresh user data
    const response = await api.get('/accounts/user/');

    // Redirect to profile update page
    navigate('/update-profile', {
      state: {
        message: 'Password and 2FA setup complete! Please complete your profile.',
        user: response.data
      }
    });
  };

  const redirectToDashboard = (userData) => {
    const userRole = userData.role;

    if (userRole === 'SUPERADMIN' || userRole === 'STAFF_ADMIN') {
      navigate('/staff-dashboard', { replace: true });
    } else if (userRole === 'CLIENT') {
      navigate('/client-dashboard', { replace: true });
    } else if (userRole === 'GUEST') {
      navigate('/guest-dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Your Password</h1>
            <p className="text-gray-600">
              Welcome, <span className="font-semibold">{user?.first_name || user?.username}</span>!
            </p>
            <p className="text-sm text-gray-500 mt-2">Create a strong password to secure your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">{error}</p>
              {/* Only show validation errors that are different from the main error */}
              {validationErrors.filter(err => err !== error).length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                  {validationErrors.filter(err => err !== error).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <PasswordStrengthInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              touched={true}
              userId={user?.id}
            />

            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* 2FA Setup Modal (Required) */}
    <EmailTwoFactorSetupModal
      isOpen={requires2FASetup}
      onClose={() => {}}
      onComplete={handle2FASetupComplete}
      isRequired={true}
    />
    </>
  );
};

export default CreatePasswordPage;
