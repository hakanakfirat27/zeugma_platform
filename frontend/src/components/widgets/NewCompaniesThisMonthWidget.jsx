// frontend/src/components/widgets/NewCompaniesThisMonthWidget.jsx
import { Building, TrendingUp } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const NewCompaniesThisMonthWidget = ({ stats }) => {
  const count = stats?.new_companies_this_month || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">New This Month</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={count} duration={1200} />
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600">Last 30 days</span>
          </div>
        </div>
        <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center">
          <Building className="w-7 h-7 text-emerald-600" />
        </div>
      </div>
    </div>
  );
};

export default NewCompaniesThisMonthWidget;
