import { Database } from 'lucide-react';

const TotalRecordsWidget = ({ stats }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
          {stats?.total_records?.toLocaleString() || 0}
        </p>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          +{stats?.recent_records || 0} this month
        </p>
      </div>
      <Database className="w-12 h-12 text-blue-600 opacity-75" />
    </div>
  </div>
);

export default TotalRecordsWidget;