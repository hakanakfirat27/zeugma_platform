import { TrendingUp } from 'lucide-react';

const ActiveSubscriptionsWidget = ({ stats }) => (
  <div className="card hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {stats?.active_subscriptions || 0}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          of {stats?.total_subscriptions || 0} total
        </p>
      </div>
      <TrendingUp className="w-12 h-12 text-orange-600 opacity-75" />
    </div>
  </div>
);

export default ActiveSubscriptionsWidget;