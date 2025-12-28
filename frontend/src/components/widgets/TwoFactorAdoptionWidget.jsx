// frontend/src/components/widgets/TwoFactorAdoptionWidget.jsx
import { useState, useEffect } from 'react';
import { ShieldCheck, Shield, ShieldOff, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const TwoFactorAdoptionWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/2fa-adoption/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching 2FA data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAdoptionColor = (rate) => {
    if (rate >= 80) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (rate >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  };

  const colors = data ? getAdoptionColor(data.adoption_rate) : { bg: 'bg-gray-300', text: 'text-gray-600', light: 'bg-gray-50' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">2FA Adoption</h3>
            <p className="text-xs text-gray-500">Two-factor authentication status</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Rate Display */}
          <div className="text-center mb-4">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke={data?.adoption_rate >= 80 ? '#10B981' : data?.adoption_rate >= 50 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(data?.adoption_rate || 0) * 3.02} 302`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className={`text-2xl font-bold ${colors.text}`}>
                  <AnimatedCounter value={data?.adoption_rate || 0} duration={1000} decimals={1} />%
                </span>
              </div>
            </div>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-green-700">
                <AnimatedCounter value={data?.enabled_count || 0} duration={800} />
              </p>
              <p className="text-xs text-green-600">2FA Enabled</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <ShieldOff className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-700">
                <AnimatedCounter value={data?.disabled_count || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Not Enabled</p>
            </div>
          </div>

          {/* By Role Breakdown */}
          {data?.by_role && Object.keys(data.by_role).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">By Role</p>
              <div className="space-y-1.5">
                {Object.entries(data.by_role).map(([role, info]) => (
                  <div key={role} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{role.replace('_', ' ')}</span>
                    <span className={`font-medium ${info.rate >= 80 ? 'text-green-600' : info.rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {info.enabled}/{info.total} ({info.rate}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TwoFactorAdoptionWidget;
