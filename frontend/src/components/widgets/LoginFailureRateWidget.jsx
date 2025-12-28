// frontend/src/components/widgets/LoginFailureRateWidget.jsx
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp, ShieldAlert } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const LoginFailureRateWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/login-failure-rate/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching login failure data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRateColor = (rate) => {
    if (rate <= 5) return { text: 'text-green-600', bg: 'bg-green-50', stroke: '#10B981' };
    if (rate <= 15) return { text: 'text-yellow-600', bg: 'bg-yellow-50', stroke: '#F59E0B' };
    return { text: 'text-red-600', bg: 'bg-red-50', stroke: '#EF4444' };
  };

  const colors = data ? getRateColor(data.failure_rate) : { text: 'text-gray-600', bg: 'bg-gray-50', stroke: '#9CA3AF' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Login Failure Rate</h3>
            <p className="text-xs text-gray-500">Failed vs successful logins</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <p className={`text-3xl font-bold ${colors.text}`}>
                <AnimatedCounter value={data?.failure_rate || 0} duration={1000} decimals={1} />%
              </p>
              <p className="text-xs text-gray-500 mt-1">Failure Rate</p>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="flex-1 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">
                  <AnimatedCounter value={data?.successful_logins || 0} duration={800} />
                </p>
                <p className="text-xs text-gray-500">Success</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">
                  <AnimatedCounter value={data?.failed_logins || 0} duration={800} />
                </p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          {data?.daily_data && data.daily_data.length > 0 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily_data}>
                  <defs>
                    <linearGradient id="failureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.stroke} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value}%`, 'Failure Rate']}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke={colors.stroke}
                    strokeWidth={2}
                    fill="url(#failureGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trend Indicator */}
          {data?.trend !== undefined && (
            <div className={`mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-2 ${
              data.trend < 0 ? 'text-green-600' : data.trend > 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {data.trend < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : data.trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : null}
              <span className="text-xs font-medium">
                {data.trend < 0 ? `${Math.abs(data.trend)}% decrease` : 
                 data.trend > 0 ? `${data.trend}% increase` : 'Stable'} vs last period
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LoginFailureRateWidget;
