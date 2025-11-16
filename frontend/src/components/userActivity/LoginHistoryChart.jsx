// frontend/src/components/userActivity/LoginHistoryChart.jsx

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import api from '../../utils/api';

const LoginHistoryChart = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d'); // '7d' or '30d'
  const [stats, setStats] = useState({
    total_logins: 0,
    active_users: 0,
    avg_per_day: 0
  });

  useEffect(() => {
    fetchLoginHistory();
  }, [timeRange]);

  const fetchLoginHistory = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/auth/activity/stats/');

      // Use the appropriate data based on timeRange
      const loginData = timeRange === '7d' ? data.login_trends_7d : data.login_trends_30d;

      // Format data for the chart
      const formattedData = loginData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        logins: item.count,
        fullDate: item.date
      }));

      setChartData(formattedData);

      // Calculate stats
      const totalLogins = timeRange === '7d' ? data.total_logins_7d : data.total_logins_30d;
      const days = timeRange === '7d' ? 7 : 30;
      setStats({
        total_logins: totalLogins,
        active_users: data.active_users_30d,
        avg_per_day: (totalLogins / days).toFixed(1)
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching login history:', err);
      setError('Failed to load login history');
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900">{payload[0].payload.date}</p>
          <p className="text-sm text-indigo-600 mt-1">
            <span className="font-medium">{payload[0].value}</span> logins
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Login Activity Trend</h3>
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Login Activity Trend</h3>
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="text-center py-8 text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Login Activity Trend</h3>
          <p className="text-sm text-gray-500 mt-1">Daily login patterns over time</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              timeRange === '7d'
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              timeRange === '30d'
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium">Total Logins</span>
          </div>
          <div className="text-2xl font-bold text-indigo-900">{stats.total_logins}</div>
          <div className="text-xs text-indigo-600 mt-1">
            Last {timeRange === '7d' ? '7' : '30'} days
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Avg. Per Day</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.avg_per_day}</div>
          <div className="text-xs text-green-600 mt-1">
            Daily average
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Active Users</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{stats.active_users}</div>
          <div className="text-xs text-purple-600 mt-1">
            Last 30 days
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No login activity data available for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12xpx' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="logins"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#colorLogins)"
              dot={{ fill: '#4f46e5', r: 4 }}
              activeDot={{ r: 6, fill: '#4f46e5' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default LoginHistoryChart;