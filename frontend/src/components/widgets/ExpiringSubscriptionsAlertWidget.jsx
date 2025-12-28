// frontend/src/components/widgets/ExpiringSubscriptionsAlertWidget.jsx
import { AlertTriangle, Calendar, User } from 'lucide-react';

const ExpiringSubscriptionsAlertWidget = ({ stats }) => {
  // Get from comprehensive stats or use expiring_7_days
  const expiring = stats?.expiring_7_days || 0;
  const subscriptionList = stats?.expiring_subscriptions || [];

  if (expiring === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Expiring Soon</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-gray-500 text-sm">No subscriptions expiring</p>
          <p className="text-gray-400 text-xs">in the next 7 days</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Expiring Soon</h3>
        </div>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
          {expiring} subscriptions
        </span>
      </div>

      {subscriptionList.length > 0 ? (
        <div className="space-y-3">
          {subscriptionList.slice(0, 4).map((sub, index) => (
            <div
              key={sub.subscription_id || index}
              className={`p-3 rounded-lg border ${
                sub.urgency === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : sub.urgency === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{sub.report_title}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                    <User className="w-3 h-3" />
                    <span>{sub.client_name}</span>
                  </div>
                </div>
                <div className={`text-xs font-medium ${
                  sub.days_remaining <= 3 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {sub.days_remaining} days
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-amber-600 font-medium">{expiring} subscription(s)</p>
          <p className="text-gray-500 text-sm">expiring within 7 days</p>
        </div>
      )}
    </div>
  );
};

export default ExpiringSubscriptionsAlertWidget;
