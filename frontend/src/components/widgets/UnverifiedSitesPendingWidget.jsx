// frontend/src/components/widgets/UnverifiedSitesPendingWidget.jsx
import { FileQuestion } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const UnverifiedSitesPendingWidget = ({ stats }) => {
  const pending = stats?.unverified_sites_pending || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Sites Pending</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={pending} duration={1200} />
          </p>
          <p className="text-xs text-amber-600 mt-1">Awaiting verification</p>
        </div>
        <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
          <FileQuestion className="w-7 h-7 text-amber-600" />
        </div>
      </div>
    </div>
  );
};

export default UnverifiedSitesPendingWidget;
