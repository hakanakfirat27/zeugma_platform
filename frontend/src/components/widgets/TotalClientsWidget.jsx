import { Users } from 'lucide-react';

const TotalClientsWidget = ({ stats }) => (
  <div className="card hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Total Clients</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {stats?.total_clients || 0}
        </p>
        <p className="text-xs text-green-600 mt-1">
          +{stats?.new_users || 0} new users
        </p>
      </div>
      <Users className="w-12 h-12 text-green-600 opacity-75" />
    </div>
  </div>
);

export default TotalClientsWidget;