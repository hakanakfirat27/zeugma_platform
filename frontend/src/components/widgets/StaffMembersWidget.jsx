import { Users } from 'lucide-react';

const StaffMembersWidget = ({ stats }) => (
  <div className="card">
    <div className="flex items-center gap-3 mb-2">
      <Users className="w-5 h-5 text-indigo-600" />
      <p className="text-sm font-medium text-gray-600">Staff Members</p>
    </div>
    <p className="text-2xl font-bold text-gray-900">
      {stats?.total_staff || 0}
    </p>
    <p className="text-xs text-gray-500 mt-1">Active staff accounts</p>
  </div>
);

export default StaffMembersWidget;