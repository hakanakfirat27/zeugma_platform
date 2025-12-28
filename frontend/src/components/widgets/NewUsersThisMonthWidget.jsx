// frontend/src/components/widgets/NewUsersThisMonthWidget.jsx
import { UserPlus } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const NewUsersThisMonthWidget = ({ stats }) => {
  const newUsers = stats?.new_users_this_month || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">New Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={newUsers} duration={1200} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
          <UserPlus className="w-7 h-7 text-green-600" />
        </div>
      </div>
    </div>
  );
};

export default NewUsersThisMonthWidget;
