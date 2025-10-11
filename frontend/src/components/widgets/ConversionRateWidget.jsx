import { Target, TrendingUp, Users, UserCheck } from 'lucide-react';

const ConversionRateWidget = ({ stats }) => {
  const guestCount = stats?.guest_users || 0;
  const convertedCount = stats?.converted_clients || 0;
  const conversionRate = guestCount > 0
    ? ((convertedCount / guestCount) * 100).toFixed(1)
    : 0;
  const previousRate = stats?.previous_conversion_rate || 0;
  const change = (conversionRate - previousRate).toFixed(1);
  const isPositive = change > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📊 Conversion Rate</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Guest → Client</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
          <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{conversionRate}%</span>
          {change !== '0.0' && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
              <span className="font-medium">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        {previousRate > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">vs last month: {previousRate}%</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Visitors</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total guests</p>
            </div>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{guestCount}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">Conversions</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">New clients</p>
            </div>
          </div>
          <span className="text-xl font-bold text-indigo-900 dark:text-indigo-300">{convertedCount}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Conversion Goal:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">30%</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(conversionRate / 30 * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ConversionRateWidget;