// frontend/src/components/widgets/FailedLoginsAlertWidget.jsx
import { ShieldAlert, Shield } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const FailedLoginsAlertWidget = ({ stats }) => {
  const failedLogins = stats?.failed_logins_24h || 0;

  if (failedLogins === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Failed Logins</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              <AnimatedCounter value={0} duration={800} />
            </p>
            <p className="text-xs text-green-600 mt-1">Last 24 hours ✓</p>
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Failed Logins</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            <AnimatedCounter value={failedLogins} duration={1200} />
          </p>
          <p className="text-xs text-red-600 mt-1">Last 24 hours</p>
        </div>
        <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-red-600" />
        </div>
      </div>
    </div>
  );
};

export default FailedLoginsAlertWidget;
