import { TrendingUp, ArrowUp, Wallet, Users, TrendingDown, AlertCircle, Clock } from 'lucide-react';

export const GrowthRateWidget = ({ stats }) => {
  const currentMonth = 1245;
  const previousMonth = 1089;
  const growthRate = (((currentMonth - previousMonth) / previousMonth) * 100).toFixed(1);
  const isPositive = growthRate > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🎯 Growth Rate</h3>
          <p className="text-sm text-gray-500">Month-over-month</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
          <TrendingUp className="w-6 h-6 text-green-600" />
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{growthRate}%
          </span>
          <ArrowUp className={`w-6 h-6 text-green-600 ${!isPositive && 'rotate-180 text-red-600'}`} />
        </div>
        <p className="text-xs text-gray-500 mt-1">Growth this month</p>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Month</span>
          <span className="text-lg font-bold text-gray-900">{currentMonth.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Previous Month</span>
          <span className="text-lg font-semibold text-gray-500">{previousMonth.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-sm font-medium text-gray-700">Net Growth</span>
          <span className="text-lg font-bold text-green-600">+{currentMonth - previousMonth}</span>
        </div>
      </div>
    </div>
  );
};

export const CustomerLifetimeValueWidget = ({ stats }) => {
  const avgCLV = 4580;
  const totalCustomers = 342;
  const totalValue = avgCLV * totalCustomers;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">💼 Customer CLV</h3>
          <p className="text-sm text-gray-500">Lifetime Value</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
          <Wallet className="w-6 h-6 text-purple-600" />
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">
            ${(avgCLV / 1000).toFixed(1)}K
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Average per customer</p>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Total Customers</span>
          </div>
          <span className="text-lg font-bold text-gray-900">{totalCustomers}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <span className="text-sm font-medium text-purple-900">Total Portfolio Value</span>
          <span className="text-lg font-bold text-purple-900">
            ${(totalValue / 1000000).toFixed(2)}M
          </span>
        </div>
      </div>
    </div>
  );
};

export const ChurnRateWidget = ({ stats }) => {
  const churnRate = 2.8;
  const canceledSubscriptions = 12;
  const totalSubscriptions = 428;
  const previousChurn = 3.5;
  const improvement = (previousChurn - churnRate).toFixed(1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📉 Churn Rate</h3>
          <p className="text-sm text-gray-500">Subscription cancellations</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
          <TrendingDown className="w-6 h-6 text-red-600" />
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">{churnRate}%</span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm">
            <TrendingDown className="w-3 h-3" />
            <span className="font-medium">-{improvement}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">vs last month: {previousChurn}%</p>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Canceled This Month</span>
          <span className="text-lg font-bold text-red-600">{canceledSubscriptions}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Subscriptions</span>
          <span className="text-lg font-bold text-gray-900">{totalSubscriptions}</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 text-xs">
        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-gray-600">Industry average churn rate is 5-7%</p>
      </div>
    </div>
  );
};