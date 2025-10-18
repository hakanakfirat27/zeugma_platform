import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Building, Phone, CheckCircle, Loader2 } from 'lucide-react';
import EmailTwoFactorSetupModal from '../components/EmailTwoFactorSetupModal';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const ProfileUpdatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkAuth, user: authUser } = useAuth();

  const message = location.state?.message || '';
  const userData = location.state?.user || authUser || {};

  const [formData, setFormData] = useState({
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    phone_number: userData.phone_number || '',
    company_name: userData.company_name || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requires2FASetup, setRequires2FASetup] = useState(false);

  // Check if 2FA setup is required
  useEffect(() => {
    if (userData.is_2fa_setup_required || authUser?.is_2fa_setup_required) {
      setRequires2FASetup(true);
    }
  }, [userData, authUser]);

  const getDashboardPath = (role) => {
    if (role === 'SUPERADMIN' || role === 'STAFF_ADMIN') {
      return '/staff-dashboard';
    } else if (role === 'CLIENT') {
      return '/client-dashboard';
    } else if (role === 'GUEST') {
      return '/guest-dashboard';
    }
    return '/';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.patch('/accounts/user/', formData);
      await checkAuth();

      const updatedUser = response.data;

      // Check if 2FA setup is required
      if (updatedUser.is_2fa_setup_required) {
        setRequires2FASetup(true);
        setSubmitting(false);
        return;
      }

      // Redirect to dashboard
      const dashboardPath = getDashboardPath(updatedUser.role);
      navigate(dashboardPath, {
        state: { message: 'Profile updated successfully! Welcome to Zeugma Platform.' },
        replace: true
      });
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // If 2FA is required, show modal instead of redirecting
    const currentUser = authUser || userData;

    if (currentUser.is_2fa_setup_required) {
      setRequires2FASetup(true);
      return;
    }

    // Otherwise redirect to dashboard
    const dashboardPath = getDashboardPath(currentUser.role);
    navigate(dashboardPath, {
      state: { message: 'Welcome to Zeugma Platform!' },
      replace: true
    });
  };

  const handle2FASetupComplete = async () => {
    setRequires2FASetup(false);
    await checkAuth();

    // Get fresh user data
    const response = await api.get('/accounts/user/');
    const updatedUser = response.data;

    // Redirect to dashboard
    const dashboardPath = getDashboardPath(updatedUser.role);
    navigate(dashboardPath, {
      state: { message: 'Setup complete! Welcome to Zeugma Platform.' },
      replace: true
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            {message && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mt-3">
                {message}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-3">Add your contact information (optional)</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="Enter first name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="Company Inc."
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Complete Profile
                  </>
                )}
              </button>
            </div>
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

export default ProfileUpdatePage;