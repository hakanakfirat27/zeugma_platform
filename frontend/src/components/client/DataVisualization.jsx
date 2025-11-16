import { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Globe, PieChart as PieIcon, BarChart3 } from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

const DataVisualization = ({ stats, records }) => {
  // Process data for charts
  const countryData = useMemo(() => {
    return (stats.topCountries || []).slice(0, 10).map(item => ({
      name: item.name,
      value: item.count,
      percentage: ((item.count / stats.total) * 100).toFixed(1)
    }));
  }, [stats]);

  const categoryData = useMemo(() => {
    return (stats.categories || []).map(item => ({
      name: item.category,
      value: item.count
    }));
  }, [stats]);

  // Material distribution from records
  const materialData = useMemo(() => {
    if (!records || records.length === 0) return [];

    const materials = {
      'PVC': records.filter(r => r.pvc).length,
      'PP': records.filter(r => r.pp).length,
      'PE': records.filter(r => r.hdpe || r.ldpe || r.lldpe).length,
      'PET': records.filter(r => r.pet).length,
      'ABS': records.filter(r => r.abs).length,
      'Other': records.filter(r => !r.pvc && !r.pp && !r.hdpe && !r.ldpe && !r.lldpe && !r.pet && !r.abs).length
    };

    return Object.entries(materials)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / records.length) * 100).toFixed(1)
      }));
  }, [records]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium text-gray-900">{payload[0].value}</span>
          </p>
          {payload[0].payload.percentage && (
            <p className="text-sm text-gray-600">
              Share: <span className="font-medium text-gray-900">{payload[0].payload.percentage}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mb-8 no-select">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Data Insights</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Distribution Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Countries</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution Pie Chart */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Category Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Material Distribution */}
        {materialData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Material Types</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materialData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Countries List View */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Geographic Overview</h3>
          </div>
          <div className="space-y-3">
            {countryData.slice(0, 8).map((country, index) => (
              <div key={country.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{country.name}</span>
                    <span className="text-sm text-gray-600">{country.value} companies</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{country.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium mb-1">Avg per Country</p>
          <p className="text-2xl font-bold text-blue-900">
            {stats.countriesCount > 0 ? Math.round(stats.total / stats.countriesCount) : 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">Coverage</p>
          <p className="text-2xl font-bold text-green-900">{stats.countriesCount} countries</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <p className="text-xs text-purple-600 font-medium mb-1">Top Market</p>
          <p className="text-lg font-bold text-purple-900 truncate">
            {countryData[0]?.name || 'N/A'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <p className="text-xs text-orange-600 font-medium mb-1">Market Share</p>
          <p className="text-2xl font-bold text-orange-900">{countryData[0]?.percentage || 0}%</p>
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;