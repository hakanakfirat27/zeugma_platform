// frontend/src/components/widgets/TotalProjectsWidget.jsx
import { Folders } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalProjectsWidget = ({ stats }) => {
  const total = stats?.total_projects || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Projects</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Data collection projects</p>
        </div>
        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
          <Folders className="w-7 h-7 text-slate-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalProjectsWidget;
