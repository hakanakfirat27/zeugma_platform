// frontend/src/pages/UserActivityPage.jsx
// Standalone page for User Activity with navigation back to User Management

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserActivityDashboard from '../../components/userActivity/UserActivityDashboard';

const UserActivityPage = () => {
  const navigate = useNavigate();

  const pageSubtitle = (
    <p className="text-sm text-white-500">Monitor user login activity and engagement metrics</p>
  );

  return (
    <DashboardLayout
        pageTitle="User Activity Dashboard"
        pageSubtitleBottom={pageSubtitle}
    >
      <div className="p-6">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/user-management')}
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            <ArrowLeft className="w-4 h-4 me-2" />
            User Management
          </button>
        </div>

        {/* Dashboard Content */}
        <UserActivityDashboard />
      </div>
    </DashboardLayout>
  );
};

export default UserActivityPage;