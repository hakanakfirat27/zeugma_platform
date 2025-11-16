// frontend/src/components/widgets/GeographicWidgets.jsx
// REPLACE YOUR ENTIRE FILE WITH THIS

import { Map, MapPin, Globe, Building, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ========== GeographicHeatmapWidget ==========
export const GeographicHeatmapWidget = ({ stats }) => {
  const regionData = [
    { region: 'Europe', records: 8234, intensity: 100 },
    { region: 'Asia', records: 6421, intensity: 78 },
    { region: 'N. America', records: 3892, intensity: 47 },
    { region: 'Middle East', records: 2145, intensity: 26 },
    { region: 'Africa', records: 1523, intensity: 18 },
    { region: 'S. America', records: 892, intensity: 11 },
    { region: 'Oceania', records: 342, intensity: 4 },
  ];

  const getColor = (intensity) => {
    if (intensity > 75) return '#ef4444';
    if (intensity > 50) return '#f97316';
    if (intensity > 25) return '#eab308';
    return '#10b981';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🗺️ Geographic Heatmap</h3>
          <p className="text-sm text-gray-500">Records by region</p>
        </div>
        <Map className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">23.4K</span>
          <span className="text-sm text-gray-600">total records</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Across 7 major regions</p>
      </div>

      <div className="flex-1 mb-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={regionData} layout="vertical">
            <XAxis type="number" fontSize={11} />
            <YAxis dataKey="region" type="category" width={80} fontSize={11} />
            <Tooltip />
            <Bar dataKey="records" radius={[0, 4, 4, 0]}>
              {regionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.intensity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-4 border-t space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            <span className="text-gray-600">Highest Concentration</span>
          </div>
          <span className="font-semibold text-gray-900">Europe</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CountryDistributionWidget ==========
export const CountryDistributionWidget = ({ stats }) => {
  const countries = [
    { name: 'Germany', code: 'DE', records: 3842, percentage: 18.5, flag: '🇩🇪' },
    { name: 'Italy', code: 'IT', records: 3234, percentage: 15.6, flag: '🇮🇹' },
    { name: 'France', code: 'FR', records: 2891, percentage: 13.9, flag: '🇫🇷' },
    { name: 'Turkey', code: 'TR', records: 2456, percentage: 11.8, flag: '🇹🇷' },
    { name: 'United Kingdom', code: 'GB', records: 2123, percentage: 10.2, flag: '🇬🇧' },
    { name: 'Spain', code: 'ES', records: 1892, percentage: 9.1, flag: '🇪🇸' },
    { name: 'Greece', code: 'GR', records: 1645, percentage: 7.9, flag: '🇬🇷' },
    { name: 'United States', code: 'US', records: 1423, percentage: 6.9, flag: '🇺🇸' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🌐 Country Distribution</h3>
          <p className="text-sm text-gray-500">Top countries</p>
        </div>
        <Globe className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">142</span>
          <span className="text-sm text-gray-600">countries</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">With active records</p>
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {countries.map((country, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm font-medium text-gray-700 truncate">{country.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-900">{country.records.toLocaleString()}</span>
                <span className="text-gray-500 w-12 text-right">{country.percentage}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${country.percentage * 5}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== RegionalPerformanceWidget ==========
export const RegionalPerformanceWidget = ({ stats }) => {
  const regions = [
    { name: 'Western Europe', records: 12450, growth: '+15%', users: 234, revenue: 45200, trend: 'up' },
    { name: 'Eastern Europe', records: 8230, growth: '+8%', users: 156, revenue: 28900, trend: 'up' },
    { name: 'Middle East', records: 6890, growth: '+22%', users: 89, revenue: 34500, trend: 'up' },
    { name: 'North America', records: 5420, growth: '-3%', users: 178, revenue: 52300, trend: 'down' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📍 Regional Performance</h3>
          <p className="text-sm text-gray-500">Metrics by region</p>
        </div>
        <MapPin className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="flex-1 space-y-4">
        {regions.map((region, idx) => (
          <div key={idx} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{region.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {(region.records / 1000).toFixed(1)}K
                  </span>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                    region.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {region.growth}
                  </span>
                </div>
              </div>
              <TrendingUp className={`w-5 h-5 ${
                region.trend === 'up' ? 'text-green-600' : 'text-red-600 rotate-180'
              }`} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-3 h-3" />
                <span>{region.users} users</span>
              </div>
              <div className="text-gray-600 text-right">
                ${(region.revenue / 1000).toFixed(1)}K revenue
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== CityBreakdownWidget ==========
export const CityBreakdownWidget = ({ stats }) => {
  const cities = [
    { name: 'Istanbul', country: 'Turkey', records: 2345, flag: '🇹🇷' },
    { name: 'Berlin', country: 'Germany', records: 1892, flag: '🇩🇪' },
    { name: 'Rome', country: 'Italy', records: 1645, flag: '🇮🇹' },
    { name: 'Paris', country: 'France', records: 1423, flag: '🇫🇷' },
    { name: 'Athens', country: 'Greece', records: 1256, flag: '🇬🇷' },
    { name: 'London', country: 'UK', records: 1134, flag: '🇬🇧' },
    { name: 'Madrid', country: 'Spain', records: 987, flag: '🇪🇸' },
    { name: 'Cairo', country: 'Egypt', records: 845, flag: '🇪🇬' },
  ];

  const totalRecords = cities.reduce((sum, city) => sum + city.records, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🏙️ City Breakdown</h3>
          <p className="text-sm text-gray-500">Top cities</p>
        </div>
        <Building className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{totalRecords.toLocaleString()}</span>
          <span className="text-sm text-gray-600">records</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Top 8 cities</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-2">
          {cities.map((city, idx) => {
            const percentage = (city.records / totalRecords * 100).toFixed(1);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-indigo-50 group-hover:bg-indigo-100 rounded-lg transition-colors">
                  <span className="text-sm font-bold text-indigo-600">#{idx + 1}</span>
                </div>
                <span className="text-2xl">{city.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{city.name}</p>
                  <p className="text-xs text-gray-500">{city.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{city.records.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};