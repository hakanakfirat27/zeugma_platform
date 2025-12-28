// frontend/src/components/widgets/SubscriptionExpiryWidget.jsx
import { useState, useEffect } from 'react';
import { CalendarClock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const SubscriptionExpiryWidget = ({ stats }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringSubscriptions();
  }, []);

  const fetchExpiringSubscriptions = async () => {
    try {
      const response = await api.get('/api/dashboard/widgets/subscription-expiry/?days=30');
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Error fetching expiring subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const expiringSoon = stats?.expiring_soon || subscriptions.length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <CalendarClock className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Expiring Soon</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (subscriptions.length === 0 && expiringSoon === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <CalendarClock className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Expiring Soon</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-gray-500 text-sm">No subscriptions expiring</p>
          <p className="text-gray-400 text-xs">in the next 30 days</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Expiring Soon</h3>
        </div>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
          {expiringSoon} in 30 days
        </span>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto">
        {subscriptions.slice(0, 5).map((sub, index) => (
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
                  <span className="truncate">{sub.client_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {sub.days_remaining <= 7 && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  sub.days_remaining <= 7 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {sub.days_remaining}d
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subscriptions.length > 5 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">
            +{subscriptions.length - 5} more expiring
          </span>
        </div>
      )}
    </div>
  );
};

export default SubscriptionExpiryWidget;
