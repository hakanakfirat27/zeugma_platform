// frontend/src/components/widgets/PendingSubscriptionsWidget.jsx
import { Clock } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const PendingSubscriptionsWidget = ({ stats }) => {
  const pending = stats?.pending_subscriptions || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Pending</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={pending} duration={1200} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Awaiting activation</p>
        </div>
        <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
      </div>
    </div>
  );
};

export default PendingSubscriptionsWidget;
