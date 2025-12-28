// frontend/src/components/widgets/SuccessfulLoginsWidget.jsx
import { useState, useEffect } from 'react';
import { LogIn, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const SuccessfulLoginsWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/successful-logins/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching successful logins:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <LogIn className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Successful Logins</h3>
            <p className="text-xs text-gray-500">Last 24 hours</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-3xl font-bold text-green-600">
              <AnimatedCounter value={data?.count_24h || 0} duration={1000} />
            </p>
            {data?.change_percent !== undefined && (
              <div className={`flex items-center gap-1 mt-1 ${
                data.change_percent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.change_percent >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {data.change_percent >= 0 ? '+' : ''}{data.change_percent}% vs yesterday
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-gray-700">
                <AnimatedCounter value={data?.count_7d || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Last 7 days</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-700">
                <AnimatedCounter value={data?.count_30d || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuccessfulLoginsWidget;
