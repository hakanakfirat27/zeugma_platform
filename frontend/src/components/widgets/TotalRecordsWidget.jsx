import { Database } from 'lucide-react';

const TotalRecordsWidget = ({ stats }) => (
  <div className="card hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Total Records</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {stats?.total_records?.toLocaleString() || 0}
        </p>
        <p className="text-xs text-green-600 mt-1">
          +{stats?.recent_records || 0} this month
        </p>
      </div>
      <Database className="w-12 h-12 text-blue-600 opacity-75" />
    </div>
  </div>
);

export default TotalRecordsWidget;