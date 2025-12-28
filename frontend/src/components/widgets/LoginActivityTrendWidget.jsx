// frontend/src/components/widgets/LoginActivityTrendWidget.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, Users } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const LoginActivityTrendWidget = () => {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/dashboard/widgets/login-activity-trend/?days=${period}`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching login activity:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Login Activity Trend</h3>
          <p className="text-xs text-gray-500">Daily login patterns over time</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setPeriod('7')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === '7' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod('30')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === '30' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Total Logins</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={data?.total_logins || 0} duration={1000} />
              </p>
              <p className="text-xs text-gray-500">Last {period} days</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Avg. Per Day</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={data?.avg_per_day || 0} duration={1000} decimals={1} />
              </p>
              <p className="text-xs text-gray-500">Daily average</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Active Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={data?.active_users || 0} duration={1000} />
              </p>
              <p className="text-xs text-gray-500">Last {period} days</p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily_data || []}>
                <defs>
                  <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [value, 'Logins']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#loginGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default LoginActivityTrendWidget;
