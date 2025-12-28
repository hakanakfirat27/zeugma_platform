// frontend/src/components/widgets/TotalUsersWidget.jsx
import { Users } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalUsersWidget = ({ stats }) => {
  const total = stats?.total_users || 0;
  const newThisMonth = stats?.new_users_this_month || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          {newThisMonth > 0 && (
            <p className="text-xs text-green-600 mt-1">
              +<AnimatedCounter value={newThisMonth} duration={800} /> this month
            </p>
          )}
        </div>
        <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center">
          <Users className="w-7 h-7 text-violet-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalUsersWidget;
