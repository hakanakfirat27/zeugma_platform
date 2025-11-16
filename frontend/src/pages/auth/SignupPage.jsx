import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle, Check, X, Loader2, Mail } from 'lucide-react';
import api from '../../utils/api';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    company_name: '',
    password1: '',
    password2: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Username validation state
  const [usernameValidation, setUsernameValidation] = useState({
    isValid: false,
    message: '',
    isChecking: false,
    suggestions: []
  });

  // Email validation state
  const [emailValidation, setEmailValidation] = useState({
    isValid: false,
    message: '',
    isChecking: false
  });

  const [checkTimers, setCheckTimers] = useState({
    username: null,
    email: null
  });

  const navigate = useNavigate();

  // Password validation rules
  const passwordRequirements = {
    minLength: formData.password1.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password1),
    hasLowercase: /[a-z]/.test(formData.password1),
    hasNumber: /\d/.test(formData.password1),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = formData.password1 && formData.password2 && formData.password1 === formData.password2;

  // Check username availability
  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameValidation({
        isValid: false,
        message: username.length > 0 ? 'Username must be at least 3 characters' : '',
        isChecking: false,
        suggestions: []
      });
      return;
    }

    setUsernameValidation(prev => ({ ...prev, isChecking: true }));

    try {
      const response = await api.post('/accounts/check-username/', {
        username: username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      });

      setUsernameValidation({
        isValid: response.data.available,
        message: response.data.message,
        isChecking: false,
        suggestions: response.data.suggestions || []
      });
    } catch (err) {
      console.error('Username check error:', err);
      setUsernameValidation({
        isValid: false,
        message: 'Could not verify username availability',
        isChecking: false,
        suggestions: []
      });
    }
  };

  // Check email availability
  const checkEmail = async (email) => {
    if (!email) {
      setEmailValidation({
        isValid: false,
        message: '',
        isChecking: false
      });
      return;
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({
        isValid: false,
        message: 'Please enter a valid email address',
        isChecking: false
      });
      return;
    }

    setEmailValidation(prev => ({ ...prev, isChecking: true }));

    try {
      const response = await api.post('/accounts/check-email/', {
        email: email
      });

      setEmailValidation({
        isValid: response.data.available,
        message: response.data.message,
        isChecking: false
      });
    } catch (err) {
      console.error('Email check error:', err);
      setEmailValidation({
        isValid: false,
        message: 'Could not verify email availability',
        isChecking: false
      });
    }
  };

  // Debounced username check
  useEffect(() => {
    if (!formData.username) return;

    if (checkTimers.username) clearTimeout(checkTimers.username);

    const timer = setTimeout(() => {
      checkUsername(formData.username);
    }, 500);

    setCheckTimers(prev => ({ ...prev, username: timer }));

    return () => {
      if (checkTimers.username) clearTimeout(checkTimers.username);
    };
  }, [formData.username, formData.first_name, formData.last_name, formData.email]);

  // Debounced email check
  useEffect(() => {
    if (!formData.email) return;

    if (checkTimers.email) clearTimeout(checkTimers.email);

    const timer = setTimeout(() => {
      checkEmail(formData.email);
    }, 500);

    setCheckTimers(prev => ({ ...prev, email: timer }));

    return () => {
      if (checkTimers.email) clearTimeout(checkTimers.email);
    };
  }, [formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Process username to lowercase and remove invalid characters
    if (name === 'username') {
      processedValue = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }

    // Process email to lowercase
    if (name === 'email') {
      processedValue = value.toLowerCase().trim();
    }

    setFormData({ ...formData, [name]: processedValue });

    if (name === 'password1' && !passwordTouched) {
      setPasswordTouched(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData({ ...formData, username: suggestion });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate username
    if (!usernameValidation.isValid) {
      setError('Please choose a valid username');
      return;
    }

    // Validate email
    if (!emailValidation.isValid) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    if (formData.password1 !== formData.password2) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/accounts/signup-verify/', {
        username: formData.username.toLowerCase().trim(),
        email: formData.email.toLowerCase().trim(),
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        company_name: formData.company_name,
        password: formData.password1,
        role: 'GUEST',
      });

      setSuccess(true);
    } catch (err) {
      const errorMsg = err.response?.data?.username?.[0] ||
                       err.response?.data?.email?.[0] ||
                       err.response?.data?.message ||
                       'Registration failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{formData.email}</strong>.
              Please click the link in the email to activate your account.
            </p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <p className="text-sm text-blue-800">
                <strong>Didn't receive the email?</strong> Check your spam folder or wait a few minutes.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full"> {/* Changed from max-w-md to max-w-4xl */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Guest Account</h2>
            <p className="text-gray-600">Get limited access to our database</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Username and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <div className="relative">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 transition-colors ${
                      formData.username
                        ? usernameValidation.isValid
                          ? 'border-green-300 focus:ring-green-500'
                          : usernameValidation.message && !usernameValidation.isChecking
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Choose a username"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameValidation.isChecking && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {!usernameValidation.isChecking && formData.username && usernameValidation.isValid && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {!usernameValidation.isChecking && formData.username && usernameValidation.message && !usernameValidation.isValid && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                {formData.username && usernameValidation.message && (
                  <p className={`text-xs mt-1 ${usernameValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {usernameValidation.message}
                  </p>
                )}
                {usernameValidation.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Try these:</p>
                    <div className="flex flex-wrap gap-2">
                      {usernameValidation.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 transition-colors ${
                      formData.email
                        ? emailValidation.isValid
                          ? 'border-green-300 focus:ring-green-500'
                          : emailValidation.message && !emailValidation.isChecking
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="your.email@example.com"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValidation.isChecking && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {!emailValidation.isChecking && formData.email && emailValidation.isValid && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {!emailValidation.isChecking && formData.email && emailValidation.message && !emailValidation.isValid && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                {formData.email && emailValidation.message && (
                  <p className={`text-xs mt-1 ${emailValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {emailValidation.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: First Name, Last Name, Phone */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Doe"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="+1 234 567 8900"
                  required
                />
              </div>
            </div>

            {/* Row 3: Company Name (Full Width) */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Your Company Inc."
                required
              />
            </div>

            {/* Row 4: Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password Field */}
              <div>
                <label htmlFor="password1" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  id="password1"
                  name="password1"
                  type="password"
                  value={formData.password1}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="password2"
                    name="password2"
                    type="password"
                    value={formData.password2}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 transition-colors ${
                      formData.password2
                        ? passwordsMatch
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Re-enter your password"
                    required
                  />
                  {formData.password2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {formData.password2 && !passwordsMatch && (
                  <p className="text-xs mt-1 text-red-600">Passwords do not match</p>
                )}
                {formData.password2 && passwordsMatch && (
                  <p className="text-xs mt-1 text-green-600">Passwords match</p>
                )}
              </div>
            </div>

            {/* Password Requirements (only shown when typing) */}
            {passwordTouched && formData.password1 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">Password requirements:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className={`flex items-center gap-2 text-xs ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-600'}`}>
                    {passwordRequirements.minLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-600'}`}>
                    {passwordRequirements.hasUppercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-600'}`}>
                    {passwordRequirements.hasLowercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-600'}`}>
                    {passwordRequirements.hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>One number</span>
                  </div>
                </div>

                {allRequirementsMet && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                      <Check className="w-4 h-4" />
                      <span>Password meets all requirements</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !usernameValidation.isValid || !emailValidation.isValid || !allRequirementsMet || !passwordsMatch}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Sign in
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
    </div>
  );
};

export default SignupPage;