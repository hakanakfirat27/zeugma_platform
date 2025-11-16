// frontend/src/components/widgets/SubscriptionRevenueWidget.jsx
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';

const SubscriptionRevenueWidget = ({ stats, config }) => {
  // Calculate revenue metrics from stats
  const monthlyRevenue = stats?.monthly_subscription_revenue || 0;
  const annualRevenue = stats?.annual_subscription_revenue || 0;
  const totalRevenue = monthlyRevenue + annualRevenue;

  const activeSubscriptions = stats?.active_subscriptions || 0;
  const averageRevenuePerUser = activeSubscriptions > 0
    ? (totalRevenue / activeSubscriptions).toFixed(2)
    : 0;

  // Mock growth data
  const monthOverMonthGrowth = stats?.revenue_growth_percentage || 0;
  const isPositiveGrowth = monthOverMonthGrowth >= 0;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Subscription Revenue</h3>
            <p className="text-xs text-gray-500">Total recurring revenue</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Revenue */}
        <div>
          <p className="text-4xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
          {monthOverMonthGrowth !== 0 && (
            <div className={`flex items-center gap-2 mt-2 ${
              isPositiveGrowth ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 ${!isPositiveGrowth && 'transform rotate-180'}`} />
              <span className="text-sm font-semibold">
                {isPositiveGrowth ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}% from last month
              </span>
            </div>
          )}
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">Monthly</p>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(monthlyRevenue)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">Annual</p>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(annualRevenue)}
            </p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Active Subscriptions</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {activeSubscriptions}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Avg Revenue/User</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(averageRevenuePerUser)}
            </span>
          </div>
        </div>

        {/* Revenue Progress Bar */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Revenue Split</span>
            <span>Monthly vs Annual</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-blue-600 transition-all"
                style={{
                  width: `${totalRevenue > 0 ? (monthlyRevenue / totalRevenue) * 100 : 0}%`
                }}
                title={`Monthly: ${formatCurrency(monthlyRevenue)}`}
              ></div>
              <div
                className="bg-purple-600 transition-all"
                style={{
                  width: `${totalRevenue > 0 ? (annualRevenue / totalRevenue) * 100 : 0}%`
                }}
                title={`Annual: ${formatCurrency(annualRevenue)}`}
              ></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Monthly: {totalRevenue > 0 ? ((monthlyRevenue / totalRevenue) * 100).toFixed(0) : 0}%</span>
            <span>Annual: {totalRevenue > 0 ? ((annualRevenue / totalRevenue) * 100).toFixed(0) : 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRevenueWidget;