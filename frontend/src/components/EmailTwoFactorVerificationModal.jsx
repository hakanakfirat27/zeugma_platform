// frontend/src/components/EmailTwoFactorVerificationModal.jsx
import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Mail, Loader2, Clock, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const EmailTwoFactorVerificationModal = ({
  isOpen,
  username,
  email,
  rememberMe = false,  // NEW: Accept rememberMe prop
  onSuccess,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60); // Start with 60 second cooldown

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/accounts/2fa/verify-login/', {
        username,
        code: code.trim(),
        remember_me: rememberMe  // NEW: Pass remember_me to backend
      });

      if (response.data.success) {
        onSuccess(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    try {
      setLoading(true);
      setError('');
      setCode('');

      const response = await api.post('/accounts/2fa/send-code/', {
        username
      });

      if (response.data.success) {
        setResendTimer(60); // Reset cooldown
        setError(''); // Clear any previous errors
        // Show success message briefly
        const successMsg = error;
        setError('');
        setTimeout(() => {
          // Don't set error, just let user know
        }, 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'your email';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Email Verification</h2>
              <p className="text-indigo-100 text-sm">Enter the code sent to your email</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">Check your email</p>
                <p className="text-sm text-indigo-700 mt-1">
                  We've sent a 6-digit code to <strong>{maskedEmail}</strong>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Code expires in 10 minutes</span>
              </div>
              <button
                onClick={handleResendCode}
                disabled={resendTimer > 0 || loading}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              💡 <strong>Tip:</strong> If you don't see the email, check your spam/junk folder
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTwoFactorVerificationModal;