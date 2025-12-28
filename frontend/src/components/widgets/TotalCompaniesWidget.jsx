// frontend/src/components/widgets/TotalCompaniesWidget.jsx
import { Building2, TrendingUp } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalCompaniesWidget = ({ stats }) => {
  const total = stats?.total_companies || 0;
  const newThisMonth = stats?.new_companies_this_month || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Companies</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          {newThisMonth > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">
                +<AnimatedCounter value={newThisMonth} duration={800} /> this month
              </span>
            </div>
          )}
        </div>
        <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center">
          <Building2 className="w-7 h-7 text-blue-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalCompaniesWidget;
