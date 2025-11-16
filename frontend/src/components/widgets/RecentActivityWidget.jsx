import { Activity } from 'lucide-react';

const RecentActivityWidget = ({ stats }) => (
  <div className="card">
    <div className="flex items-center gap-3 mb-2">
      <Activity className="w-5 h-5 text-indigo-600" />
      <p className="text-sm font-medium text-gray-600">Recent Activity</p>
    </div>
    <p className="text-2xl font-bold text-gray-900">
      {stats?.recently_updated || 0}
    </p>
    <p className="text-xs text-gray-500 mt-1">Records updated (last 7 days)</p>
  </div>
);

export default RecentActivityWidget;