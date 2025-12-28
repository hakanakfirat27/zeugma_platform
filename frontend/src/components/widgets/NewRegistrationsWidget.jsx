// frontend/src/components/widgets/NewRegistrationsWidget.jsx
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UserPlus, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const NewRegistrationsWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/new-registrations/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching registration data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTrendIcon = () => {
    if (!data || data.growth_percent === 0) return null;
    return data.growth_percent > 0 ? TrendingUp : TrendingDown;
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">New Registrations</h3>
            <p className="text-xs text-gray-500">User signups trend</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                <AnimatedCounter value={data?.this_month || 0} duration={1000} />
              </p>
              <p className="text-xs text-gray-500">This month</p>
            </div>
            {TrendIcon && data?.growth_percent !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                data.growth_percent > 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(data.growth_percent)}%
              </div>
            )}
          </div>

          {/* Mini Chart */}
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.weekly_data || []}>
                <defs>
                  <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#regGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Last month: {data?.last_month || 0}</span>
            <span>Total: {data?.total || 0}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default NewRegistrationsWidget;
