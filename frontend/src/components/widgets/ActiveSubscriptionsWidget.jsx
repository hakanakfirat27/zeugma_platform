// frontend/src/components/widgets/ActiveSubscriptionsWidget.jsx
import { CheckCircle } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const ActiveSubscriptionsWidget = ({ stats }) => {
  const active = stats?.active_subscriptions || 0;
  const total = stats?.total_subscriptions || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={active} duration={1200} />
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of <AnimatedCounter value={total} duration={800} /> total
          </p>
        </div>
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
      </div>
    </div>
  );
};

export default ActiveSubscriptionsWidget;
