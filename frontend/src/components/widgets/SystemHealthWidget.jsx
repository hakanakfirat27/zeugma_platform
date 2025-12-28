// frontend/src/components/widgets/SystemHealthWidget.jsx
import { useState, useEffect } from 'react';
import { HeartPulse, Database, Zap, HardDrive, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import api from '../../utils/api';

const SystemHealthWidget = () => {
  const [health, setHealth] = useState({
    overall: 'loading',
    components: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/system-health/');
        setHealth(response.data);
      } catch (error) {
        setHealth({
          overall: 'error',
          components: [
            { name: 'System', status: 'error', message: 'Unable to fetch health status', icon: 'alert' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getComponentIcon = (icon) => {
    switch (icon) {
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'zap':
        return <Zap className="w-4 h-4" />;
      case 'hard-drive':
        return <HardDrive className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getOverallColor = () => {
    switch (health.overall) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'loading':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <HeartPulse className="w-5 h-5 text-pink-600" />
          <h3 className="font-semibold text-gray-900">System Health</h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getOverallColor()}`}>
          {loading ? 'Checking...' : health.overall}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {health.components?.length > 0 ? (
            health.components.map((component, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-500">
                    {getComponentIcon(component.icon)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{component.name}</p>
                    <p className="text-xs text-gray-500">{component.message}</p>
                  </div>
                </div>
                {getStatusIcon(component.status)}
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">All systems operational</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemHealthWidget;
