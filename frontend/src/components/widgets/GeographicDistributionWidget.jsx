// frontend/src/components/widgets/GeographicDistributionWidget.jsx
import { useState, useEffect } from 'react';
import { Globe, MapPin, Flag } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const GeographicDistributionWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/geographic-distribution/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching geographic data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCountryFlag = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Geographic Distribution</h3>
            <p className="text-xs text-gray-500">User locations by country</p>
          </div>
        </div>
        {data && (
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              <AnimatedCounter value={data.total_countries || 0} duration={800} />
            </p>
            <p className="text-xs text-gray-500">countries</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Countries */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data?.countries?.slice(0, 8).map((country, index) => {
              const maxCount = data.countries[0]?.count || 1;
              const percentage = (country.count / maxCount) * 100;
              
              return (
                <div key={country.code || index} className="flex items-center gap-3">
                  <span className="text-xl">{getCountryFlag(country.code)}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {country.name}
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        {country.count} ({country.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unknown/Other */}
          {data?.unknown_count > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Unknown Location
              </span>
              <span className="font-medium text-gray-700">{data.unknown_count}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GeographicDistributionWidget;
