import { Activity, UserPlus, FileText, Database, Settings as SettingsIcon } from 'lucide-react';

const RecentActivityFeedWidget = ({ stats }) => {
  const activities = [
    { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100', text: 'New user registered: john@example.com', time: '2 min ago' },
    { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', text: 'Report generated: Q4 Analysis', time: '15 min ago' },
    { icon: Database, color: 'text-purple-600', bg: 'bg-purple-100', text: 'Database updated: 45 new records', time: '1 hour ago' },
    { icon: SettingsIcon, color: 'text-orange-600', bg: 'bg-orange-100', text: 'System settings modified', time: '2 hours ago' },
    { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100', text: 'New client subscription activated', time: '3 hours ago' },
  ];

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-500">Last 24 hours</p>
        </div>
        <Activity className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="flex-1 space-y-4 overflow-auto">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`${activity.bg} p-2 rounded-lg`}>
                <Icon className={`w-4 h-4 ${activity.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.text}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mt-4 w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
        View Full Activity Log
      </button>
    </div>
  );
};

export default RecentActivityFeedWidget;