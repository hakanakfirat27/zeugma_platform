import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FilterPanel = ({ filters, onFilterChange, filterOptions, onClear }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    materials: true,
    markets: false,
    services: false,
  });

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Group filters by type
  const materialFilters = filterOptions.filter(f =>
    f.field.includes('pe') || f.field.includes('pvc') || f.field.includes('pp') ||
    f.field.includes('abs') || f.field.includes('pa') || f.field.includes('pet')
  );

  const marketFilters = filterOptions.filter(f =>
    f.field.includes('automotive') || f.field.includes('medical') ||
    f.field.includes('packaging') || f.field.includes('food')
  );

  const serviceFilters = filterOptions.filter(f =>
    f.field.includes('printing') || f.field.includes('welding') ||
    f.field.includes('tool') || f.field.includes('clean_room')
  );

  const activeFilterCount = Object.values(filters).filter(v => v === true).length;

  return (
    <div className="bg-white border-r overflow-y-auto h-full">
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <button
              onClick={onClear}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {filterOptions.length} available filters
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Materials Group */}
        {materialFilters.length > 0 && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleGroup('materials')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm">Materials</span>
              {expandedGroups.materials ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedGroups.materials && (
              <div className="p-3 pt-0 space-y-2 max-h-64 overflow-y-auto">
                {materialFilters.map(filter => (
                  <label key={filter.field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters[filter.field] || false}
                      onChange={(e) => onFilterChange(filter.field, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{filter.label}</span>
                    <span className="text-xs text-gray-500">{filter.count}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Markets Group */}
        {marketFilters.length > 0 && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleGroup('markets')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm">Markets</span>
              {expandedGroups.markets ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedGroups.markets && (
              <div className="p-3 pt-0 space-y-2 max-h-64 overflow-y-auto">
                {marketFilters.map(filter => (
                  <label key={filter.field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters[filter.field] || false}
                      onChange={(e) => onFilterChange(filter.field, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{filter.label}</span>
                    <span className="text-xs text-gray-500">{filter.count}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Services Group */}
        {serviceFilters.length > 0 && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleGroup('services')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm">Services</span>
              {expandedGroups.services ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedGroups.services && (
              <div className="p-3 pt-0 space-y-2 max-h-64 overflow-y-auto">
                {serviceFilters.map(filter => (
                  <label key={filter.field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters[filter.field] || false}
                      onChange={(e) => onFilterChange(filter.field, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{filter.label}</span>
                    <span className="text-xs text-gray-500">{filter.count}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other Filters */}
        {filterOptions.filter(f =>
          !materialFilters.includes(f) &&
          !marketFilters.includes(f) &&
          !serviceFilters.includes(f)
        ).map(filter => (
          <label key={filter.field} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={filters[filter.field] || false}
              onChange={(e) => onFilterChange(filter.field, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 flex-1">{filter.label}</span>
            <span className="text-xs text-gray-500">{filter.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;