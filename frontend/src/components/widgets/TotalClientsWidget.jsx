// frontend/src/components/widgets/TotalClientsWidget.jsx
import { UserCheck } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const TotalClientsWidget = ({ stats }) => {
  const total = stats?.total_clients || 0;
  const newClients = stats?.new_clients || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Clients</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            <AnimatedCounter value={total} duration={1200} />
          </p>
          <p className="text-xs text-green-600 mt-1">
            +<AnimatedCounter value={newClients} duration={800} /> new users
          </p>
        </div>
        <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
          <UserCheck className="w-7 h-7 text-green-600" />
        </div>
      </div>
    </div>
  );
};

export default TotalClientsWidget;
