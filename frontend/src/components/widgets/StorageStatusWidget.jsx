// frontend/src/components/widgets/StorageStatusWidget.jsx
import { useState, useEffect } from 'react';
import { HardDrive, XCircle } from 'lucide-react';
import api from '../../utils/api';

const StorageStatusWidget = () => {
  const [status, setStatus] = useState({ healthy: true, message: 'Checking...', usage: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/system-health/');
        const storageStatus = response.data?.storage || { status: 'healthy' };
        const diskUsage = response.data?.disk_usage;
        setStatus({
          healthy: storageStatus.status === 'healthy',
          message: storageStatus.status === 'healthy' ? 'Media storage accessible' : 'Storage issues detected',
          usage: diskUsage ? `${diskUsage}% used` : null
        });
      } catch (error) {
        setStatus({ healthy: false, message: 'Unable to check status', usage: null });
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const isHealthy = status.healthy;

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${isHealthy ? 'border-gray-100' : 'border-red-100'} p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Storage</p>
          <p className={`text-lg font-bold mt-1 ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
            {loading ? 'Checking...' : (isHealthy ? 'Healthy' : 'Unhealthy')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {status.usage || status.message}
          </p>
        </div>
        <div className={`w-14 h-14 ${isHealthy ? 'bg-green-50' : 'bg-red-50'} rounded-xl flex items-center justify-center`}>
          {isHealthy ? (
            <HardDrive className="w-7 h-7 text-green-600" />
          ) : (
            <XCircle className="w-7 h-7 text-red-600" />
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageStatusWidget;
