// frontend/src/components/widgets/ActivityAnalyticsWidgets.jsx
// REPLACE YOUR ENTIRE FILE WITH THIS

import { Eye, TrendingUp, Clock, Search, Share2, Smartphone, Monitor, Tablet, Globe, Hash } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ========== PageViewsAnalyticsWidget ==========
export const PageViewsAnalyticsWidget = ({ stats }) => {
  const pageData = [
    { page: 'Dashboard', views: 15420, change: '+12%' },
    { page: 'Superdatabase', views: 12350, change: '+8%' },
    { page: 'Reports', views: 8900, change: '-3%' },
    { page: 'Analytics', views: 6700, change: '+15%' },
    { page: 'Settings', views: 4200, change: '+5%' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">👁️ Page Views</h3>
          <p className="text-sm text-gray-500">Most visited pages</p>
        </div>
        <Eye className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">47.6K</span>
          <span className="text-sm text-green-600 font-medium">+8.3%</span>
        </div>
        <p className="text-xs text-gray-500">Total page views this month</p>
      </div>

      <div className="flex-1 mb-4">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={pageData}>
            <XAxis dataKey="page" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="views" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 pt-4 border-t">
        {pageData.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 truncate flex-1">{item.page}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{item.views.toLocaleString()}</span>
              <span className={`text-xs ${item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== SessionDurationWidget ==========
export const SessionDurationWidget = ({ stats }) => {
  const avgDuration = '8m 32s';
  const avgMinutes = 8.53;
  const previousAvg = 7.2;
  const change = ((avgMinutes - previousAvg) / previousAvg * 100).toFixed(1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">⏱️ Avg Session</h3>
          <p className="text-sm text-gray-500">User engagement time</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
          <Clock className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">{avgDuration}</span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm">
            <TrendingUp className="w-3 h-3" />
            <span className="font-medium">+{change}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Average duration</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Longest Session</span>
          <span className="text-lg font-bold text-gray-900">45m 12s</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Shortest Session</span>
          <span className="text-sm text-gray-600">1m 05s</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-sm font-medium text-gray-700">Total Sessions</span>
          <span className="text-lg font-bold text-indigo-600">12,458</span>
        </div>
      </div>
    </div>
  );
};

// ========== DeviceAnalyticsWidget ==========
export const DeviceAnalyticsWidget = ({ stats }) => {
  const devices = [
    { name: 'Desktop', count: 8542, percentage: 62, icon: Monitor, color: 'bg-blue-500' },
    { name: 'Mobile', count: 4123, percentage: 30, icon: Smartphone, color: 'bg-green-500' },
    { name: 'Tablet', count: 1098, percentage: 8, icon: Tablet, color: 'bg-purple-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📱 Device Analytics</h3>
          <p className="text-sm text-gray-500">Platform usage</p>
        </div>
        <Smartphone className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="space-y-4">
        {devices.map((device, idx) => {
          const Icon = device.icon;
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${device.color} bg-opacity-10 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${device.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.count.toLocaleString()} users</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900">{device.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${device.color} transition-all duration-500`}
                  style={{ width: `${device.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ========== SearchAnalyticsWidget ==========
export const SearchAnalyticsWidget = ({ stats }) => {
  const searches = [
    { term: 'Bronze artifacts', count: 1245, trend: '+15%' },
    { term: 'Pottery', count: 892, trend: '+8%' },
    { term: 'Roman coins', count: 756, trend: '-3%' },
    { term: 'Glass objects', count: 634, trend: '+22%' },
    { term: 'Jewelry', count: 521, trend: '+11%' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🔍 Search Analytics</h3>
          <p className="text-sm text-gray-500">Popular search terms</p>
        </div>
        <Search className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">4.2K</span>
          <span className="text-sm text-green-600 font-medium">+12%</span>
        </div>
        <p className="text-xs text-gray-500">Total searches this month</p>
      </div>

      <div className="flex-1 space-y-3">
        {searches.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-400 w-6">#{idx + 1}</span>
              <span className="text-sm text-gray-700 truncate">{item.term}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{item.count}</span>
              <span className={`text-xs ${item.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {item.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== TrafficSourcesWidget ==========
export const TrafficSourcesWidget = ({ stats }) => {
  const sources = [
    { name: 'Direct', value: 45, icon: Globe, color: '#6366f1' },
    { name: 'Search', value: 30, icon: Search, color: '#10b981' },
    { name: 'Social', value: 15, icon: Share2, color: '#f59e0b' },
    { name: 'Referral', value: 10, icon: Hash, color: '#ec4899' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🌍 Traffic Sources</h3>
          <p className="text-sm text-gray-500">Where users come from</p>
        </div>
        <Share2 className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={sources}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {sources.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {sources.map((source, idx) => {
          return (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: source.color }}
              />
              <span className="text-sm text-gray-700">{source.name}</span>
              <span className="text-sm font-bold text-gray-900 ml-auto">{source.value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};