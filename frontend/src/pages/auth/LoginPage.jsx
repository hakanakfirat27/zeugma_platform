import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Check, X, Loader2, Building, Phone, LogIn, UserPlus } from 'lucide-react';
import EmailTwoFactorVerificationModal from '../../components/auth/EmailTwoFactorVerificationModal';
import EmailTwoFactorSetupModal from '../../components/auth/EmailTwoFactorSetupModal';
import api from '../../utils/api';

const LoginPage = ({ initialMode }) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [isAnimating, setIsAnimating] = useState(false);
  const toast = useToast();
  
  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  // Login validation state
  const [loginTouched, setLoginTouched] = useState({
    username: false,
    password: false,
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    company_name: '',
    password1: '',
    password2: '',
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Signup validation touched state
  const [signupTouched, setSignupTouched] = useState({
    username: false,
    email: false,
    first_name: false,
    last_name: false,
    phone_number: false,
    company_name: false,
    password1: false,
    password2: false,
  });

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

  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [requires2FASetup, setRequires2FASetup] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempEmail, setTempEmail] = useState('');

  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Password validation rules
  const passwordRequirements = {
    minLength: signupData.password1.length >= 8,
    hasUppercase: /[A-Z]/.test(signupData.password1),
    hasLowercase: /[a-z]/.test(signupData.password1),
    hasNumber: /\d/.test(signupData.password1),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = signupData.password1 && signupData.password2 && signupData.password1 === signupData.password2;

  // Validation helper functions
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone) => {
    // Allow various phone formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;
    return phone.length >= 7 && phoneRegex.test(phone);
  };

  // Get field error message
  const getFieldError = (fieldName, value) => {
    switch (fieldName) {
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        return null;
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!isValidEmail(value)) return 'Please enter a valid email address';
        return null;
      case 'first_name':
        if (!value.trim()) return 'First name is required';
        return null;
      case 'last_name':
        if (!value.trim()) return 'Last name is required';
        return null;
      case 'phone_number':
        if (!value.trim()) return 'Phone number is required';
        if (!isValidPhone(value)) return 'Please enter a valid phone number';
        return null;
      case 'company_name':
        if (!value.trim()) return 'Company name is required';
        return null;
      case 'password1':
        if (!value) return 'Password is required';
        if (!allRequirementsMet) return 'Password does not meet requirements';
        return null;
      case 'password2':
        if (!value) return 'Please confirm your password';
        if (value !== signupData.password1) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  // Check if field has error (for visual feedback)
  const hasFieldError = (fieldName) => {
    if (!signupTouched[fieldName]) return false;
    return getFieldError(fieldName, signupData[fieldName]) !== null;
  };

  // Track if logout toast was already shown
  const [logoutToastShown, setLogoutToastShown] = useState(false);

  useEffect(() => {
    // Handle logout success message - use sessionStorage flag for reliability
    const showLogoutToast = sessionStorage.getItem('showLogoutToast');
    
    if (showLogoutToast === 'true' && !logoutToastShown) {
      setLogoutToastShown(true);
      sessionStorage.removeItem('showLogoutToast');
      toast.success('You have been logged out successfully');
    }
    // Handle other info messages from location state
    else if (location.state?.message && !location.state?.logoutSuccess) {
      setInfoMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (user && !requires2FASetup) {
      redirectToDashboard(user);
    }
  }, [user, requires2FASetup]);

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
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        email: signupData.email
      });

      setUsernameValidation({
        isValid: response.data.available,
        message: response.data.message,
        isChecking: false,
        suggestions: response.data.suggestions || []
      });
    } catch (err) {
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
      setEmailValidation({ isValid: false, message: '', isChecking: false });
      return;
    }

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
      const response = await api.post('/accounts/check-email/', { email });
      setEmailValidation({
        isValid: response.data.available,
        message: response.data.message,
        isChecking: false
      });
    } catch (err) {
      setEmailValidation({
        isValid: false,
        message: 'Could not verify email availability',
        isChecking: false
      });
    }
  };

  // Debounced username check
  useEffect(() => {
    if (!signupData.username) return;
    if (checkTimers.username) clearTimeout(checkTimers.username);
    const timer = setTimeout(() => checkUsername(signupData.username), 500);
    setCheckTimers(prev => ({ ...prev, username: timer }));
    return () => { if (checkTimers.username) clearTimeout(checkTimers.username); };
  }, [signupData.username, signupData.first_name, signupData.last_name, signupData.email]);

  // Debounced email check
  useEffect(() => {
    if (!signupData.email) return;
    if (checkTimers.email) clearTimeout(checkTimers.email);
    const timer = setTimeout(() => checkEmail(signupData.email), 500);
    setCheckTimers(prev => ({ ...prev, email: timer }));
    return () => { if (checkTimers.email) clearTimeout(checkTimers.email); };
  }, [signupData.email]);

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLoginBlur = (e) => {
    const { name, value } = e.target;
    setLoginTouched(prev => ({ ...prev, [name]: true }));
    
    if (!value.trim()) {
      const fieldLabel = name === 'username' ? 'Username or Email' : 'Password';
      toast.warning(`${fieldLabel} is required`);
    }
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'username') {
      processedValue = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }
    if (name === 'email') {
      processedValue = value.toLowerCase().trim();
    }

    setSignupData({ ...signupData, [name]: processedValue });

    if (name === 'password1' && !passwordTouched) {
      setPasswordTouched(true);
    }
  };

  const handleSignupBlur = (e) => {
    const { name, value } = e.target;
    setSignupTouched(prev => ({ ...prev, [name]: true }));

    const error = getFieldError(name, value);
    if (error) {
      toast.warning(error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSignupData({ ...signupData, username: suggestion });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setInfoMessage('');

    // Validate all fields
    let hasErrors = false;
    if (!loginData.username.trim()) {
      toast.error('Username or Email is required');
      hasErrors = true;
    }
    if (!loginData.password) {
      toast.error('Password is required');
      hasErrors = true;
    }

    if (hasErrors) {
      setLoginTouched({ username: true, password: true });
      return;
    }

    setLoginLoading(true);

    try {
      const response = await api.post('/accounts/login/', {
        username: loginData.username,
        password: loginData.password,
        remember_me: rememberMe
      });

      if (response.data.requires_2fa) {
        setRequires2FA(true);
        setTempUsername(response.data.username);
        setTempEmail(response.data.email);
        setInfoMessage(response.data.message);
        setLoginLoading(false);
        return;
      }

      if (response.data.requires_2fa_setup) {
        setRequires2FASetup(true);
        await checkAuth();
        setLoginLoading(false);
        return;
      }

      if (response.data.user) {
        toast.success('You have successful!y logged in');
        await checkAuth();
        setLoginLoading(false);
      }
    } catch (err) {
      if (err.response?.data?.error?.includes('inactive') ||
          err.response?.data?.error?.includes('not verified')) {
        setLoginError('Your account is not yet verified. Please check your email for the verification link.');
        toast.error('Account not verified. Please check your email.');
      } else {
        const errorMsg = err.response?.data?.error || 'Invalid username or password';
        setLoginError(errorMsg);
        toast.error(errorMsg);
      }
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    // Mark all fields as touched
    const allTouched = Object.keys(signupTouched).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setSignupTouched(allTouched);

    // Validate all required fields
    const requiredFields = ['username', 'email', 'first_name', 'last_name', 'phone_number', 'company_name', 'password1', 'password2'];
    let hasErrors = false;
    let errorMessages = [];

    for (const field of requiredFields) {
      const error = getFieldError(field, signupData[field]);
      if (error) {
        hasErrors = true;
        errorMessages.push(error);
      }
    }

    // Additional validation checks
    if (!usernameValidation.isValid && signupData.username) {
      hasErrors = true;
      errorMessages.push(usernameValidation.message || 'Please choose a valid username');
    }
    if (!emailValidation.isValid && signupData.email) {
      hasErrors = true;
      if (!errorMessages.includes('Please enter a valid email address')) {
        errorMessages.push(emailValidation.message || 'Please enter a valid email address');
      }
    }

    if (hasErrors) {
      // Show first error as toast
      if (errorMessages.length > 0) {
        toast.error(errorMessages[0]);
      }
      setSignupError('Please fix the errors above before submitting');
      return;
    }

    setSignupLoading(true);

    try {
      await api.post('/accounts/signup-verify/', {
        username: signupData.username.toLowerCase().trim(),
        email: signupData.email.toLowerCase().trim(),
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        phone_number: signupData.phone_number,
        company_name: signupData.company_name,
        password: signupData.password1,
        role: 'GUEST',
      });
      toast.success('Account created! Please check your email to verify your account.');
      setSignupSuccess(true);
    } catch (err) {
      const errorMsg = err.response?.data?.username?.[0] ||
                       err.response?.data?.email?.[0] ||
                       err.response?.data?.message ||
                       'Registration failed. Please try again.';
      setSignupError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSignupLoading(false);
    }
  };

  const handle2FASuccess = async () => {
    setRequires2FA(false);
    await checkAuth();
  };

  const handle2FASetupComplete = async () => {
    setRequires2FASetup(false);
    await checkAuth();
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

  const toggleMode = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newMode = !isSignUp;
      setIsSignUp(newMode);
      setLoginError('');
      setSignupError('');
      setInfoMessage('');
      // Reset touched states
      setLoginTouched({ username: false, password: false });
      setSignupTouched({
        username: false,
        email: false,
        first_name: false,
        last_name: false,
        phone_number: false,
        company_name: false,
        password1: false,
        password2: false,
      });
      window.history.replaceState({}, '', newMode ? '/signup' : '/login');
      setTimeout(() => setIsAnimating(false), 50);
    }, 300);
  };

  // Helper component for required field label
  const RequiredLabel = ({ children }) => (
    <label className="block text-gray-700 text-xs font-medium mb-1">
      {children} <span className="text-red-500">*</span>
    </label>
  );

  // Success screen for signup
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <span className="text-indigo-600 font-medium">{signupData.email}</span>.
            Please click the link in the email to activate your account.
          </p>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-6">
            <p className="text-sm text-indigo-700">
              <strong>Didn't receive the email?</strong> Check your spam folder or wait a few minutes.
            </p>
          </div>
          <button
            onClick={() => {
              setSignupSuccess(false);
              setIsSignUp(false);
            }}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center px-4 py-8">
      {/* Main container */}
      <div className="relative w-full max-w-5xl">
        {/* Card container with shadow */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[650px]">
          
          {/* Forms Container */}
          <div className="flex h-[650px]">
            
            {/* Login Form - Left Side */}
            <div className={`w-1/2 p-10 flex flex-col justify-center transition-all duration-700 ${
              isSignUp ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
              <div className="max-w-sm mx-auto w-full">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                    <LogIn className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Welcome Back</h2>
                <p className="text-gray-500 mb-8 text-center">Sign in to your account</p>

                {infoMessage && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">{infoMessage}</p>
                  </div>
                )}

                {loginError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{loginError}</p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Username or Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="username"
                      type="text"
                      value={loginData.username}
                      onChange={handleLoginChange}
                      onBlur={handleLoginBlur}
                      className={`w-full bg-white border text-gray-800 py-3.5 px-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                        loginTouched.username && !loginData.username.trim() 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200'
                      }`}
                      placeholder="Enter your username or email"
                    />
                    {loginTouched.username && !loginData.username.trim() && (
                      <p className="mt-1 text-xs text-red-500">Username or Email is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={handleLoginChange}
                        onBlur={handleLoginBlur}
                        className={`w-full bg-white border text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                          loginTouched.password && !loginData.password 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-200'
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {loginTouched.password && !loginData.password && (
                      <p className="mt-1 text-xs text-red-500">Password is required</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-600 text-sm">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-blue-600 text-sm hover:text-blue-700 font-medium transition-colors">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                <p className="text-center text-gray-500 mt-6 lg:hidden">
                  Don't have an account?{' '}
                  <button onClick={toggleMode} className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    Sign up
                  </button>
                </p>
              </div>
            </div>

            {/* Signup Form - Right Side */}
            <div className={`w-1/2 p-8 flex flex-col justify-center transition-all duration-700 ${
              isSignUp ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              <div className="max-w-md mx-auto w-full">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                    <UserPlus className="w-7 h-7 text-blue-500" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">Create Guest Account</h2>
                <p className="text-gray-500 mb-5 text-center text-sm">Get limited access to our database</p>

                {signupError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{signupError}</p>
                  </div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-3">
                  {/* Row 1: Username & Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <RequiredLabel>Username</RequiredLabel>
                      <div className="relative">
                        <input
                          name="username"
                          type="text"
                          value={signupData.username}
                          onChange={handleSignupChange}
                          onBlur={handleSignupBlur}
                          className={`w-full bg-white border text-gray-800 py-2.5 px-3 pr-9 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                            hasFieldError('username') || (signupTouched.username && !usernameValidation.isValid && signupData.username)
                              ? 'border-red-300 bg-red-50' 
                              : signupTouched.username && usernameValidation.isValid 
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200'
                          }`}
                          placeholder="Choose a username"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {usernameValidation.isChecking && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                          {!usernameValidation.isChecking && signupData.username && usernameValidation.isValid && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {!usernameValidation.isChecking && signupData.username && usernameValidation.message && !usernameValidation.isValid && <X className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                      {usernameValidation.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {usernameValidation.suggestions.slice(0, 2).map((s, i) => (
                            <button key={i} type="button" onClick={() => handleSuggestionClick(s)} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <RequiredLabel>Email Address</RequiredLabel>
                      <div className="relative">
                        <input
                          name="email"
                          type="email"
                          value={signupData.email}
                          onChange={handleSignupChange}
                          onBlur={handleSignupBlur}
                          className={`w-full bg-white border text-gray-800 py-2.5 px-3 pr-9 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                            hasFieldError('email') || (signupTouched.email && !emailValidation.isValid && signupData.email)
                              ? 'border-red-300 bg-red-50' 
                              : signupTouched.email && emailValidation.isValid 
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200'
                          }`}
                          placeholder="your.email@example.com"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {emailValidation.isChecking && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                          {!emailValidation.isChecking && signupData.email && emailValidation.isValid && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {!emailValidation.isChecking && signupData.email && emailValidation.message && !emailValidation.isValid && <X className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: First Name, Last Name, Phone */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <RequiredLabel>First Name</RequiredLabel>
                      <input
                        name="first_name"
                        type="text"
                        value={signupData.first_name}
                        onChange={handleSignupChange}
                        onBlur={handleSignupBlur}
                        className={`w-full bg-white border text-gray-800 py-2.5 px-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                          hasFieldError('first_name')
                            ? 'border-red-300 bg-red-50' 
                            : signupTouched.first_name && signupData.first_name.trim()
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200'
                        }`}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <RequiredLabel>Last Name</RequiredLabel>
                      <input
                        name="last_name"
                        type="text"
                        value={signupData.last_name}
                        onChange={handleSignupChange}
                        onBlur={handleSignupBlur}
                        className={`w-full bg-white border text-gray-800 py-2.5 px-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                          hasFieldError('last_name')
                            ? 'border-red-300 bg-red-50' 
                            : signupTouched.last_name && signupData.last_name.trim()
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200'
                        }`}
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <RequiredLabel>Phone Number</RequiredLabel>
                      <input
                        name="phone_number"
                        type="tel"
                        value={signupData.phone_number}
                        onChange={handleSignupChange}
                        onBlur={handleSignupBlur}
                        className={`w-full bg-white border text-gray-800 py-2.5 px-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                          hasFieldError('phone_number')
                            ? 'border-red-300 bg-red-50' 
                            : signupTouched.phone_number && isValidPhone(signupData.phone_number)
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200'
                        }`}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>

                  {/* Row 3: Company Name - Full Width */}
                  <div>
                    <RequiredLabel>Company Name</RequiredLabel>
                    <input
                      name="company_name"
                      type="text"
                      value={signupData.company_name}
                      onChange={handleSignupChange}
                      onBlur={handleSignupBlur}
                      className={`w-full bg-white border text-gray-800 py-2.5 px-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                        hasFieldError('company_name')
                          ? 'border-red-300 bg-red-50' 
                          : signupTouched.company_name && signupData.company_name.trim()
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200'
                      }`}
                      placeholder="Your Company Inc."
                    />
                  </div>

                  {/* Row 4: Passwords */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <RequiredLabel>Password</RequiredLabel>
                      <div className="relative">
                        <input
                          name="password1"
                          type={showSignupPassword ? 'text' : 'password'}
                          value={signupData.password1}
                          onChange={handleSignupChange}
                          onBlur={handleSignupBlur}
                          className={`w-full bg-white border text-gray-800 py-2.5 px-3 pr-9 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                            hasFieldError('password1')
                              ? 'border-red-300 bg-red-50' 
                              : signupTouched.password1 && allRequirementsMet
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200'
                          }`}
                          placeholder="Enter your password"
                        />
                        <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <RequiredLabel>Confirm Password</RequiredLabel>
                      <div className="relative">
                        <input
                          name="password2"
                          type={showSignupConfirmPassword ? 'text' : 'password'}
                          value={signupData.password2}
                          onChange={handleSignupChange}
                          onBlur={handleSignupBlur}
                          className={`w-full bg-white border text-gray-800 py-2.5 px-3 pr-9 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 ${
                            hasFieldError('password2')
                              ? 'border-red-300 bg-red-50' 
                              : signupTouched.password2 && passwordsMatch
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200'
                          }`}
                          placeholder="Re-enter your password"
                        />
                        <button type="button" onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Requirements - Compact */}
                  {passwordTouched && signupData.password1 && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { met: passwordRequirements.minLength, text: '8+ characters' },
                          { met: passwordRequirements.hasUppercase, text: 'Uppercase' },
                          { met: passwordRequirements.hasLowercase, text: 'Lowercase' },
                          { met: passwordRequirements.hasNumber, text: 'Number' },
                        ].map((req, i) => (
                          <div key={i} className={`flex items-center gap-1 text-xs ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
                            {req.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>{req.text}</span>
                          </div>
                        ))}
                      </div>
                      {signupData.password2 && (
                        <div className={`mt-1.5 text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {signupLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                <p className="text-center text-gray-500 mt-4 text-sm lg:hidden">
                  Already have an account?{' '}
                  <button onClick={toggleMode} className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Sliding Overlay Panel - Positioned on top */}
          <div 
            className={`absolute top-0 h-full w-1/2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 transition-all duration-700 ease-in-out z-20 flex items-center justify-center ${
              isSignUp ? 'left-0 rounded-r-[150px]' : 'left-1/2 rounded-l-[150px]'
            }`}
          >
            <div className={`text-center px-12 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <h2 className="text-4xl font-bold text-white mb-4">
                {isSignUp ? 'Welcome Back!' : 'Hey There!'}
              </h2>
              <p className="text-white/90 mb-8 text-lg leading-relaxed">
                {isSignUp 
                  ? 'To keep connected with us please login with your personal info'
                  : 'Begin your amazing journey by creating an account with us today'}
              </p>
              <button
                onClick={toggleMode}
                className="px-10 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-indigo-600 transition-all duration-300 uppercase tracking-wider text-sm"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>

        </div>

        {/* Back to home link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* 2FA Modals */}
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

      <EmailTwoFactorSetupModal
        isOpen={requires2FASetup}
        onClose={() => {}}
        onComplete={handle2FASetupComplete}
        isRequired={true}
      />
    </div>
  );
};

export default LoginPage;
