import { AlertTriangle, Clock } from 'lucide-react';

const SubscriptionExpiryWidget = ({ stats }) => {
  // Mock data - replace with real API data
  const expiringSubscriptions = [
    { client: 'Acme Corp', report: 'Market Analysis', daysLeft: 3, urgent: true },
    { client: 'TechStart Inc', report: 'Industry Report', daysLeft: 7, urgent: false },
    { client: 'GlobalTech', report: 'Competitor Analysis', daysLeft: 14, urgent: false },
    { client: 'Innovation Labs', report: 'Trend Report', daysLeft: 2, urgent: true },
  ];

  const urgentCount = expiringSubscriptions.filter(s => s.urgent).length;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Expiring Subscriptions</h3>
          <p className="text-sm text-gray-500">Requires attention</p>
        </div>
        <AlertTriangle className="w-6 h-6 text-orange-600" />
      </div>

      {urgentCount > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">
            🚨 {urgentCount} subscription{urgentCount > 1 ? 's' : ''} expiring in 3 days
          </p>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-auto">
        {expiringSubscriptions.map((sub, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${sub.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{sub.client}</p>
                <p className="text-sm text-gray-600">{sub.report}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${sub.urgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <Clock className="w-3 h-3" />
                {sub.daysLeft}d
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
        View All Subscriptions
      </button>
    </div>
  );
};

export default SubscriptionExpiryWidget;