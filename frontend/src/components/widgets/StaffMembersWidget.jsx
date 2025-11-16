import { Users } from 'lucide-react';

const StaffMembersWidget = ({ stats }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Staff Members</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
          {stats?.staff_members || 0}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Active staff accounts
        </p>
      </div>
      <Users className="w-12 h-12 text-purple-600 opacity-75" />
    </div>
  </div>
);

export default StaffMembersWidget;