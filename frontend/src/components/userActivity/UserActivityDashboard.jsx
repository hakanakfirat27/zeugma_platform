// frontend/src/components/userActivity/UserActivityDashboard.jsx

import { useState } from 'react';
import { Activity, TrendingUp, Users } from 'lucide-react';
import MostActiveUsersWidget from './MostActiveUsersWidget';
import LoginHistoryChart from './LoginHistoryChart';
import UserLoginHistoryModal from './UserLoginHistoryModal';

const UserActivityDashboard = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowHistoryModal(true);
  };

  const handleCloseModal = () => {
    setShowHistoryModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">


      {/* Most Active Users */}
      <MostActiveUsersWidget onUserClick={handleUserClick} />

      {/* Login History Chart */}
      <LoginHistoryChart />

      {/* User Login History Modal */}
      {showHistoryModal && selectedUser && (
        <UserLoginHistoryModal
          user={selectedUser}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default UserActivityDashboard;