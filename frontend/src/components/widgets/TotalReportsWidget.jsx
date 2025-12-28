// frontend/src/components/widgets/TotalReportsWidget.jsx
import { FileBarChart } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalReportsWidget = ({ stats }) => {
  const total = stats?.total_reports || stats?.custom_reports || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Reports</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Custom reports created</p>
        </div>
        <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center">
          <FileBarChart className="w-7 h-7 text-indigo-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalReportsWidget;
