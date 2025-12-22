import { useState, useEffect } from 'react';
import { Shield, Mail, Check, X, AlertCircle, Loader2, Clock, Copy, Download, Key, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const EmailTwoFactorSetupModal = ({ isOpen, onClose, onComplete, isRequired = false }) => {
  const [step, setStep] = useState(1); // 1: Info, 2: Verify Code, 3: Backup Codes
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(1);
      setCode('');
      setError('');
      setCodeSent(false);
      setResendTimer(0);
      setBackupCodes([]);
      setCopiedCodes(false);
      setSavedConfirmed(false);
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
        // Store backup codes from response
        if (response.data.backup_codes && response.data.backup_codes.length > 0) {
          setBackupCodes(response.data.backup_codes);
          setStep(3); // Go to backup codes step
        } else {
          // No backup codes, complete immediately
          onComplete();
          onClose();
        }
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

  const copyBackupCodes = async () => {
    try {
      const codesText = backupCodes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    const text = `Zeugma Platform - 2FA Backup Codes
========================================

Generated: ${new Date().toLocaleString()}
Email: ${userEmail}

Your backup codes (each can only be used once):

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

========================================
IMPORTANT:
- Store these codes in a safe place
- Each code can only be used ONCE
- Use these if you can't receive email verification
- Generate new codes if you run out
========================================`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeugma-2fa-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFinalComplete = () => {
    onComplete(backupCodes); // Pass backup codes to parent if needed
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 sticky top-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
                <p className="text-indigo-100 text-sm">
                  {step === 3 ? 'Save your backup codes' : isRequired ? 'Required for your account' : 'Add an extra layer of security'}
                </p>
              </div>
            </div>
            {!isRequired && step !== 3 && (
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Setup' },
              { num: 2, label: 'Verify' },
              { num: 3, label: 'Backup Codes' }
            ].map((s, index) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step > s.num 
                      ? 'bg-green-500 text-white' 
                      : step === s.num 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {index < 2 && (
                  <div className={`w-12 sm:w-20 h-0.5 mx-2 ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
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
                      <li>• You'll get backup codes for emergencies</li>
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
                      Verify
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  2FA Enabled Successfully!
                </h3>
                <p className="text-sm text-gray-600">
                  Save these backup codes in a safe place. You'll need them if you can't access your email.
                </p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Important!</p>
                    <p className="text-sm text-amber-700 mt-1">
                      These codes will only be shown <strong>once</strong>. Each code can only be used <strong>one time</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backup Codes Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900">Your Backup Codes</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyBackupCodes}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Copy all codes"
                    >
                      {copiedCodes ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={downloadBackupCodes}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Download as file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-center text-gray-800"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                {copiedCodes && (
                  <p className="text-xs text-green-600 text-center mt-3">
                    ✓ Codes copied to clipboard!
                  </p>
                )}
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={savedConfirmed}
                  onChange={(e) => setSavedConfirmed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  I have saved my backup codes in a safe place and understand that each code can only be used once.
                </span>
              </label>

              <button
                onClick={handleFinalComplete}
                disabled={!savedConfirmed}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTwoFactorSetupModal;
