import { useState, useEffect } from 'react';
import { Shield, Mail, Check, X, AlertCircle, Loader2, Clock } from 'lucide-react';
import api from '../../utils/api';

const EmailTwoFactorSetupModal = ({ isOpen, onClose, onComplete, isRequired = false }) => {
  const [step, setStep] = useState(1); // 1: Info, 2: Verify Code
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Get user email when modal opens
      getUserEmail();
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  if (!isOpen) return null;

  const getUserEmail = async () => {
    try {
      const response = await api.get('/accounts/user/');
      setUserEmail(response.data.email);
    } catch (err) {
      console.error('Failed to get user email:', err);
    }
  };

  const sendVerificationCode = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post('/accounts/2fa/enable/');

      if (response.data.success) {
        setCodeSent(true);
        setStep(2);
        setResendTimer(60); // 60 second cooldown
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/accounts/2fa/verify-enable/', { code });

      if (response.data.success) {
        onComplete();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setCode('');
    setError('');
    await sendVerificationCode();
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
                <p className="text-indigo-100 text-sm">
                  {isRequired ? 'Required for your account' : 'Add an extra layer of security'}
                </p>
              </div>
            </div>
            {!isRequired && (
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Email Verification
                </h3>
                <p className="text-sm text-gray-600">
                  We'll send a 6-digit verification code to your email address whenever you log in.
                </p>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex gap-3">
                  <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Your Email Address:</p>
                    <p className="text-sm text-indigo-700 mt-1 font-mono">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">How it works:</p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• You'll receive a code via email when logging in</li>
                      <li>• Each code is valid for 10 minutes</li>
                      <li>• Keep your email secure to protect your account</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={sendVerificationCode}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Verification Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit code to <strong>{userEmail}</strong>
                </p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">
                    Verification code sent! Check your email inbox.
                  </p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Code expires in 10 minutes
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={handleResendCode}
                  disabled={resendTimer > 0}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0
                    ? `Resend code in ${resendTimer}s`
                    : "Didn't receive the code? Resend"}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(1);
                    setCode('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Verify & Enable
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTwoFactorSetupModal;