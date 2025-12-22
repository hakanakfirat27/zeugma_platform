// frontend/src/components/EmailTwoFactorVerificationModal.jsx
import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Mail, Loader2, Clock, RefreshCw, Key, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';

const EmailTwoFactorVerificationModal = ({
  isOpen,
  username,
  email,
  rememberMe = false,
  onSuccess,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Reset states when switching modes
  useEffect(() => {
    setCode('');
    setBackupCode('');
    setError('');
  }, [useBackupCode]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (useBackupCode) {
      // Verify with backup code
      const cleanCode = backupCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanCode.length !== 8) {
        setError('Please enter a valid backup code (8 characters)');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await api.post('/accounts/2fa/verify-backup-code/', {
          username,
          backup_code: cleanCode,
          remember_me: rememberMe
        });

        if (response.data.success) {
          onSuccess(response.data.user);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid backup code. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Verify with email code
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
          remember_me: rememberMe
        });

        if (response.data.success) {
          onSuccess(response.data.user);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid code. Please try again.');
      } finally {
        setLoading(false);
      }
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
        setResendTimer(60);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (useBackupCode && backupCode.length >= 8) {
        handleVerify();
      } else if (!useBackupCode && code.length === 6) {
        handleVerify();
      }
    }
  };

  const formatBackupCode = (value) => {
    // Remove non-alphanumeric and convert to uppercase
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Add dash after 4 characters
    if (clean.length > 4) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
    }
    return clean;
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
              {useBackupCode ? (
                <Key className="w-6 h-6 text-white" />
              ) : (
                <Shield className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {useBackupCode ? 'Use Backup Code' : 'Email Verification'}
              </h2>
              <p className="text-indigo-100 text-sm">
                {useBackupCode ? 'Enter one of your saved backup codes' : 'Enter the code sent to your email'}
              </p>
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

          {useBackupCode ? (
            // Backup Code Input
            <>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-3">
                  <Key className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Backup Code</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Enter one of the backup codes you saved when you enabled 2FA.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Code
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(formatBackupCode(e.target.value))}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Each backup code can only be used once
                </p>
              </div>

              <button
                onClick={() => setUseBackupCode(false)}
                className="w-full flex items-center justify-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Use email code instead
              </button>
            </>
          ) : (
            // Email Code Input
            <>
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

              <button
                onClick={() => setUseBackupCode(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Key className="w-4 h-4" />
                Can't access email? Use backup code
              </button>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || (useBackupCode ? backupCode.replace(/-/g, '').length !== 8 : code.length !== 6)}
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
