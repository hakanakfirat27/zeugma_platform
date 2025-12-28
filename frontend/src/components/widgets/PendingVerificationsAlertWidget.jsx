// frontend/src/components/widgets/PendingVerificationsAlertWidget.jsx
import { CheckCircle, AlertCircle } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const PendingVerificationsAlertWidget = ({ stats }) => {
  const oldPending = stats?.old_pending_verifications || 0;

  if (oldPending === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Old Pending</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              <AnimatedCounter value={0} duration={800} />
            </p>
            <p className="text-xs text-green-600 mt-1">All sites reviewed ✓</p>
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Old Pending</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">
            <AnimatedCounter value={oldPending} duration={1200} />
          </p>
          <p className="text-xs text-amber-600 mt-1">Waiting 7+ days</p>
        </div>
        <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-amber-600" />
        </div>
      </div>
    </div>
  );
};

export default PendingVerificationsAlertWidget;
