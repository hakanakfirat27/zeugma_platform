// frontend/src/pages/auth/ResetPasswordPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, Loader2, XCircle, Check, X } from 'lucide-react';
import api from '../../utils/api';

const ResetPasswordPage = () => {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);

  // Password policy state
  const [policy, setPolicy] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [strength, setStrength] = useState({ score: 0, label: 'None', color: 'gray' });

  // Validate token on component mount
  useEffect(() => {
    validateToken();
    fetchPasswordPolicy();
  }, [uidb64, token]);

  const validateToken = async () => {
    try {
      const response = await api.get(`/api/auth/validate-reset-token/${uidb64}/${token}/`);
      setIsValidToken(true);
      setEmail(response.data.email);
      setUsername(response.data.username);
    } catch (err) {
      setIsValidToken(false);
      setError(err.response?.data?.message || 'This password reset link is invalid or has expired.');
    } finally {
      setValidating(false);
    }
  };

  const fetchPasswordPolicy = async () => {
    try {
      const { data } = await api.get('/accounts/password-policy/');
      setPolicy(data.policy);
    } catch (err) {
      console.error('Failed to fetch password policy:', err);
      // Fallback to default policy
      setPolicy({
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special_chars: true
      });
    } finally {
      setPolicyLoading(false);
    }
  };

  // Generate rules based on policy
  const getRules = () => {
    if (!policy) return [];
    
    const rules = [];
    
    rules.push({
      id: 'length',
      label: `At least ${policy.min_length} characters`,
      test: (pwd) => pwd.length >= policy.min_length,
    });
    
    if (policy.require_uppercase) {
      rules.push({
        id: 'uppercase',
        label: 'One uppercase letter',
        test: (pwd) => /[A-Z]/.test(pwd),
      });
    }
    
    if (policy.require_lowercase) {
      rules.push({
        id: 'lowercase',
        label: 'One lowercase letter',
        test: (pwd) => /[a-z]/.test(pwd),
      });
    }
    
    if (policy.require_numbers) {
      rules.push({
        id: 'number',
        label: 'One number',
        test: (pwd) => /[0-9]/.test(pwd),
      });
    }
    
    if (policy.require_special_chars) {
      rules.push({
        id: 'special',
        label: 'One special character (!@#$%^&*...)',
        test: (pwd) => /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`"\\]/.test(pwd),
      });
    }
    
    return rules;
  };

  const rules = getRules();
  const allRulesPassed = rules.length > 0 && rules.every(rule => rule.test(password));

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, label: 'None', color: 'gray' });
      return;
    }

    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety scoring
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`"\\]/.test(password)) score += 15;
    
    // Determine label
    let label, color;
    if (score < 30) {
      label = 'Weak';
      color = 'red';
    } else if (score < 50) {
      label = 'Fair';
      color = 'orange';
    } else if (score < 70) {
      label = 'Good';
      color = 'yellow';
    } else if (score < 90) {
      label = 'Strong';
      color = 'green';
    } else {
      label = 'Very Strong';
      color = 'green';
    }
    
    setStrength({ score: Math.min(100, score), label, color });
  }, [password]);

  const getValidation = (rule) => {
    if (!touched || !password) return null;
    return rule.test(password);
  };

  // Get color classes for strength bar
  const getStrengthColorClass = () => {
    switch (strength.color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate against policy
    if (!allRulesPassed) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/api/auth/reset-password/${uidb64}/${token}/`, {
        password: password
      });

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password reset successfully! You can now log in with your new password.' }
        });
      }, 3000);

    } catch (err) {
      const errorData = err.response?.data;
      setError(errorData?.message || 'Failed to reset password. Please try again.');
      setValidationErrors(errorData?.errors || []);
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>

          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 text-center transition-colors"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/login"
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm text-center transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-semibold">{username}</span>!
            </p>
            <p className="text-sm text-gray-500 mt-2">Create a new password for {email}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
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
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTouched(true);
                  }}
                  onFocus={() => setTouched(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-12"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {touched && password && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Password strength:</span>
                    <span className={`font-medium ${
                      strength.color === 'red' ? 'text-red-600' :
                      strength.color === 'orange' ? 'text-orange-600' :
                      strength.color === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getStrengthColorClass()}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-12 ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-300 bg-red-50'
                      : confirmPassword && password === confirmPassword
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Password Requirements */}
            {!policyLoading && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Password requirements:</p>
                {rules.map((rule) => {
                  const isValid = getValidation(rule);
                  return (
                    <div
                      key={rule.id}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        isValid === null ? 'text-gray-600' :
                        isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isValid === null ? (
                        <X className="w-4 h-4 text-gray-400" />
                      ) : isValid ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className={isValid ? 'font-medium' : ''}>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Overall Status */}
            {touched && password && (
              <div className={`text-sm font-medium ${allRulesPassed ? 'text-green-600' : 'text-gray-600'}`}>
                {allRulesPassed ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Password meets all requirements
                  </div>
                ) : (
                  'Please meet all password requirements'
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword || !allRulesPassed}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Reset Password
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
