import { FileText } from 'lucide-react';

const CustomReportsWidget = ({ stats }) => (
  <div className="card hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Custom Reports</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {stats?.total_reports || 0}
        </p>
      </div>
      <FileText className="w-12 h-12 text-purple-600 opacity-75" />
    </div>
  </div>
);

export default CustomReportsWidget;