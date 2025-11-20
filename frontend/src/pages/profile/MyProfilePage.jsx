// frontend/src/pages/MyProfilePage.jsx
// MODIFIED: Uses the dynamic 'Layout' component instead of hardcoding ClientDashboardLayout

import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Building, Calendar, Shield, Edit, ArrowLeft
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';


const MyProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    }
    return user?.username?.[0].toUpperCase() || 'U';
  };

  const getUserRole = () => {
    if (!user?.role) return 'User';
    return user.role.replace('_', ' ').split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // --- This line correctly determines the layout based on role ---
  const getLayoutComponent = () => {
    if (user?.role === 'CLIENT') {
      return ClientDashboardLayout;
    } else if (user?.role === 'DATA_COLLECTOR') {
      return DataCollectorLayout;
    } else {
      return DashboardLayout; // For STAFF and other roles
    }
  };

  const Layout = getLayoutComponent();

  return (
    // --- MODIFIED: Use the dynamic 'Layout' component here ---
    <Layout pageTitle="My Profile">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-12">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl ring-4 ring-white">
                  {getUserInitials()}
                </div>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
              </div>

              {/* Name and Role */}
              <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
                <h1 className="text-3xl font-bold text-gray-900">
                  {user?.full_name || user?.username || 'User'}
                </h1>
                <p className="text-lg text-gray-600 mt-1">{getUserRole()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-600" />
              Contact Information
            </h2>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Email Address</p>
                  <p className="text-base text-gray-900 mt-1">{user?.email || 'Not provided'}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Phone className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Phone Number</p>
                  <p className="text-base text-gray-900 mt-1">
                    {user?.phone_number || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Company */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Building className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Company</p>
                  <p className="text-base text-gray-900 mt-1">
                    {user?.company_name || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              Account Information
            </h2>

            <div className="space-y-4">
              {/* Username */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-base text-gray-900 mt-1">{user?.username || 'Not available'}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="text-base text-gray-900 mt-1">{getUserRole()}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="text-base text-gray-900 mt-1">
                    {formatDate(user?.date_joined)}
                  </p>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Two-Factor Authentication</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user?.two_factor_enabled ? (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Enabled
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Disabled
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Update Profile CTA */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Keep Your Profile Up to Date
              </h3>
              <p className="text-sm text-gray-600">
                Update your contact information, change your password, or manage security settings.
              </p>
            </div>
            <button
              onClick={() => navigate('/profile-settings')}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md whitespace-nowrap"
            >
              <Edit className="w-5 h-5" />
              <span className="font-medium">Update Profile</span>
            </button>
          </div>
        </div>
      </div>
    {/* --- MODIFIED: Use the dynamic 'Layout' closing tag --- */}
    </Layout>
  );
};

export default MyProfilePage;