import { Calendar } from 'lucide-react';

const GuestUsersWidget = ({ stats }) => (
  <div className="card">
    <div className="flex items-center gap-3 mb-2">
      <Calendar className="w-5 h-5 text-indigo-600" />
      <p className="text-sm font-medium text-gray-600">Guest Users</p>
    </div>
    <p className="text-2xl font-bold text-gray-900">
      {stats?.total_guests || 0}
    </p>
    <p className="text-xs text-gray-500 mt-1">Guest accounts</p>
  </div>
);

export default GuestUsersWidget;