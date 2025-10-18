import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const VerifyEmailPage = () => {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      const response = await api.post(`/accounts/verify-email/${uidb64}/${token}/`);

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setUserInfo(response.data.user);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Your account has been verified! Please log in.' }
          });
        }, 3000);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  const handleResendEmail = async () => {
    if (!userInfo?.email) {
      setResendMessage('Unable to resend. Email not found.');
      return;
    }

    setResendLoading(true);
    setResendMessage('');

    try {
      const response = await api.post('/accounts/resend-verification/', {
        email: userInfo.email
      });

      if (response.data.success) {
        setResendMessage('Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Failed to resend email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
          <p className="text-gray-600">Please wait while we verify your email address...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-gray-600 mb-6">{message}</p>

          {userInfo && (
            <div className="p-4 bg-gray-50 rounded-lg mb-6 text-left">
              <p className="text-sm text-gray-700">
                <strong>Username:</strong> {userInfo.username}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {userInfo.email}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Go to Login
            </Link>
            <p className="text-sm text-gray-500">
              Redirecting automatically in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{message}</p>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-semibold text-yellow-900">Possible Reasons:</p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                  <li>The verification link has expired (valid for 24 hours)</li>
                  <li>The link has already been used</li>
                  <li>The account is already verified</li>
                </ul>
              </div>
            </div>
          </div>

          {resendMessage && (
            <div className={`mb-4 p-3 rounded-lg ${
              resendMessage.includes('sent')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{resendMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resendLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Resend Verification Email
                </>
              )}
            </button>

            <Link
              to="/login"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VerifyEmailPage;