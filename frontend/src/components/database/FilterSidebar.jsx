import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

const FilterSidebar = ({
  isOpen,
  onClose,
  filters,
  filterOptions,
  countryFilters = [],
  onCountryFilterChange,
  allCountries = [],
  onApply,
  onReset
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  // Live filter based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return filterOptions;

    const query = searchQuery.toLowerCase();
    return filterOptions.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.field.toLowerCase().includes(query)
    );
  }, [filterOptions, searchQuery]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return allCountries;
    return allCountries.filter(country =>
      country.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [allCountries, countrySearch]);

  // Immediate filter change - applies instantly
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters };
    if (value === undefined) {
      delete newFilters[field];
    } else {
      newFilters[field] = value;
    }
    onApply(newFilters);
  };

  // Immediate country toggle - applies instantly
  const toggleCountry = (country) => {
    let newCountryFilters;
    if (countryFilters.includes(country)) {
      newCountryFilters = countryFilters.filter(c => c !== country);
    } else {
      newCountryFilters = [...countryFilters, country];
    }
    onCountryFilterChange(newCountryFilters);
  };

  const handleApplyFilters = () => {
    onClose();
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setCountrySearch('');
    onReset();
  };

  const activeFilterCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length;

  // Count active boolean filters only
  const activeBooleanFilterCount = Object.keys(filters).filter(key => filters[key] !== undefined).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header with purple background */}
        <div className="px-6 py-4 bg-indigo-600 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Refine your search result</h3>
              {activeFilterCount > 0 && (
                <p className="text-xs text-indigo-100 mt-0.5">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-indigo-700 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Country Filter Section FIRST */}
          {allCountries.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 text-sm">Countries</h4>
                {countryFilters.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {countryFilters.length}
                  </span>
                )}
              </div>

              {/* Country Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {countrySearch && (
                  <button
                    onClick={() => setCountrySearch('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Country List - Simple, always visible */}
              <div
                className="border border-gray-200 rounded-lg bg-gray-50 p-2 overflow-y-auto"
                style={{ height: '280px' }}
              >
                <div className="space-y-1">
                  {filteredCountries.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No countries found</p>
                  ) : (
                    filteredCountries.map(country => (
                      <label
                        key={country}
                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={countryFilters.includes(country)}
                          onChange={() => toggleCountry(country)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700">{country}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="border-b my-4"></div>
            </div>
          )}

          {/* Search Filters Section SECOND */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 text-sm">Search Filters</h4>
              {activeBooleanFilterCount > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {activeBooleanFilterCount}
                </span>
              )}
            </div>

            {/* Search Box */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search filters..."
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter List */}
            <div className="space-y-3">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No filters found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredOptions.map(option => (
                  <div key={option.field} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{option.label}</h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {option.count}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={option.field}
                          checked={filters[option.field] === undefined}
                          onChange={() => handleFilterChange(option.field, undefined)}
                          className="w-4 h-4 text-gray-400 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900">Any</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={option.field}
                          checked={filters[option.field] === true}
                          onChange={() => handleFilterChange(option.field, true)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-900 font-medium group-hover:text-indigo-600">Include</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={option.field}
                          checked={filters[option.field] === false}
                          onChange={() => handleFilterChange(option.field, false)}
                          className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-900 font-medium group-hover:text-red-600">Exclude</span>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer with Clear All and Apply Filters buttons */}
        <div className="border-t p-4 bg-gray-50 flex-shrink-0 flex items-center gap-3">
          <button
            onClick={handleClearAll}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-white font-medium transition-colors text-gray-700 text-sm"
          >
            Clear All Filters
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default FilterSidebar;