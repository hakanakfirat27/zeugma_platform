// frontend/src/components/widgets/TopCountriesWidget.jsx
import { Globe } from 'lucide-react';

const TopCountriesWidget = ({ stats }) => {
  const countries = stats?.top_countries || [];

  if (countries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Top Countries</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 text-sm">No country data available</p>
        </div>
      </div>
    );
  }

  const maxCount = countries[0]?.count || 1;

  // Flag emoji mapping
  const countryFlags = {
    'Germany': '🇩🇪', 'France': '🇫🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
    'Poland': '🇵🇱', 'Turkey': '🇹🇷', 'USA': '🇺🇸', 'United States': '🇺🇸',
    'China': '🇨🇳', 'India': '🇮🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
    'Canada': '🇨🇦', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺',
    'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Sweden': '🇸🇪', 'Denmark': '🇩🇰',
    'Finland': '🇫🇮', 'Norway': '🇳🇴', 'Portugal': '🇵🇹', 'Greece': '🇬🇷',
    'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
  };

  const getFlag = (country) => countryFlags[country] || '🏳️';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Top Countries</h3>
      </div>

      <div className="space-y-3">
        {countries.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="text-xl">{item.flag || getFlag(item.country)}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {item.country}
                </span>
                <span className="text-sm text-gray-600">
                  {item.count.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopCountriesWidget;
