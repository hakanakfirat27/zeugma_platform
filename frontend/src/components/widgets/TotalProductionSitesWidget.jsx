// frontend/src/components/widgets/TotalProductionSitesWidget.jsx
import { Factory } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalProductionSitesWidget = ({ stats }) => {
  const total = stats?.total_production_sites || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Production Sites</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Across all companies</p>
        </div>
        <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center">
          <Factory className="w-7 h-7 text-emerald-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalProductionSitesWidget;
