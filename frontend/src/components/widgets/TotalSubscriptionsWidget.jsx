// frontend/src/components/widgets/TotalSubscriptionsWidget.jsx
import { Layers } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalSubscriptionsWidget = ({ stats }) => {
  const total = stats?.total_subscriptions || 0;
  const active = stats?.active_subscriptions || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Subscriptions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          <p className="text-xs text-green-600 mt-1">
            <AnimatedCounter value={active} duration={800} /> active
          </p>
        </div>
        <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center">
          <Layers className="w-7 h-7 text-purple-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalSubscriptionsWidget;
