import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Download, Upload, Trash2, Edit, Plus, BarChart3, TrendingUp, Users, X, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRecords, useFilterOptions } from '../hooks/useDatabase';
import { CATEGORIES } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const SuperdatabasePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('INJECTION');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerms, setSearchTerms] = useState([]);
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]); // NEW: Country filter
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [ordering, setOrdering] = useState('');

  // Stats from new backend endpoint
  const [stats, setStats] = useState({
    total: 0,
    countriesCount: 0,
    topCountries: [],
    allCountries: [] // For country filter dropdown
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const combinedSearch = searchTerms.join(' ');

  const { data: recordsData, isLoading } = useRecords({
    category: selectedCategory,
    search: combinedSearch,
    page: currentPage,
    page_size: pageSize,
    ordering: ordering,
    countries: countryFilters.join(','), // NEW: Pass country filters
    ...filters,
  });

  const { data: filterOptions = [] } = useFilterOptions(selectedCategory);

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // FIXED: Fetch stats from new backend endpoint
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const params = new URLSearchParams();

        if (selectedCategory && selectedCategory !== 'ALL') {
          params.append('category', selectedCategory);
        }
        if (combinedSearch) {
          params.append('search', combinedSearch);
        }
        if (countryFilters.length > 0) {
          params.append('countries', countryFilters.join(','));
        }

        // Add filters
        Object.keys(filters).forEach(key => {
          if (filters[key] === true) {
            params.append(key, 'true');
          } else if (filters[key] === false) {
            params.append(key, 'false');
          }
        });

        // NEW: Use efficient stats endpoint
        const response = await api.get(`/api/database-stats/?${params.toString()}`);

        setStats({
          total: response.data.total_count,
          countriesCount: response.data.countries_count,
          topCountries: response.data.top_countries || [],
          allCountries: response.data.all_countries || []
        });

      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [selectedCategory, combinedSearch, filters, countryFilters]);

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length;

  const activeFilterChips = useMemo(() => {
    const chips = [];

    // Regular filters
    Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .forEach(([key, value]) => {
        const option = filterOptions.find(opt => opt.field === key);
        chips.push({
          type: 'filter',
          key,
          label: option?.label || key.replace(/_/g, ' '),
          filterType: value === true ? 'Include' : 'Exclude'
        });
      });

    // Country filters
    countryFilters.forEach(country => {
      chips.push({
        type: 'country',
        key: country,
        label: country,
        filterType: 'Country'
      });
    });

    return chips;
  }, [filters, filterOptions, countryFilters]);

  const handleAddSearchTerm = () => {
    if (searchQuery.trim() && !searchTerms.includes(searchQuery.trim())) {
      setSearchTerms([...searchTerms, searchQuery.trim()]);
      setSearchQuery('');
      setCurrentPage(1);
    }
  };

  const handleRemoveSearchTerm = (term) => {
    setSearchTerms(searchTerms.filter(t => t !== term));
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerms([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddSearchTerm();
    }
  };

  const removeFilter = (chip) => {
    if (chip.type === 'filter') {
      const newFilters = { ...filters };
      delete newFilters[chip.key];
      setFilters(newFilters);
    } else if (chip.type === 'country') {
      setCountryFilters(countryFilters.filter(c => c !== chip.key));
    }
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({});
    setCountryFilters([]);
    setCurrentPage(1);
  };

  const toggleRecordSelection = (factoryId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(factoryId)) {
      newSelected.delete(factoryId);
    } else {
      newSelected.add(factoryId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.factory_id)));
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-indigo-600 text-white px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Superdatabase Management</h1>
        </div>
        <p className="text-indigo-100 text-sm ml-14">Complete administrative control over all records</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {showStats ? 'Hide' : 'Show'} Stats
              </button>

              <button
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => alert('Import coming soon')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </button>

              <button
                onClick={() => alert('Add new record')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Record
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          {showStats && (
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Records</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {statsLoading ? '...' : stats.total}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-600 opacity-75" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Countries</p>
                    <p className="text-2xl font-bold text-green-900">
                      {statsLoading ? '...' : stats.countriesCount}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Unique</p>
                  </div>
                  <Users className="w-8 h-8 text-green-600 opacity-75" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Categories</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {CATEGORIES.filter(c => c.value !== 'ALL').length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600 opacity-75" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600 font-medium">Selected</p>
                    <p className="text-2xl font-bold text-orange-900">{selectedRecords.size}</p>
                  </div>
                  <div className="w-8 h-8 text-orange-600 opacity-75 flex items-center justify-center text-xl">✓</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                <div>
                  <p className="text-xs text-pink-600 font-medium mb-2">Top Countries</p>
                  <div className="space-y-1">
                    {statsLoading ? (
                      <p className="text-xs text-pink-600">Loading...</p>
                    ) : (
                      stats.topCountries.slice(0, 3).map((country) => (
                        <div key={country.name} className="flex items-center justify-between text-xs">
                          <span className="text-pink-900 truncate max-w-[100px]" title={country.name}>
                            {country.name}
                          </span>
                          <span className="text-pink-700 font-medium">{country.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Tabs */}
          <div className="border-b mb-6">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setCurrentPage(1);
                  setSelectedRecords(new Set());
                }}
                className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.filter(c => c.value !== 'ALL').map(category => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setCurrentPage(1);
                    setSelectedRecords(new Set());
                  }}
                  className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    selectedCategory === category.value
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* FIXED: Simplified Search - No "Active search:" label */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by company name, country, region... (Press Enter to add)"
                className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Clear input"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <button
                  onClick={handleAddSearchTerm}
                  disabled={!searchQuery.trim()}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Search Tags - NO LABEL, just tags and reset */}
            {searchTerms.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex flex-wrap gap-2 flex-1">
                  {searchTerms.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-100 text-blue-800 border border-blue-300 text-sm font-medium"
                    >
                      {term}
                      <button
                        onClick={() => handleRemoveSearchTerm(term)}
                        className="hover:opacity-70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleClearSearch}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                  title="Clear all search terms"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Active Filters */}
          {activeFilterChips.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map(chip => (
                  <span
                    key={`${chip.type}-${chip.key}`}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium ${
                      chip.type === 'country' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                      chip.filterType === 'Include'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {chip.label}{chip.filterType !== 'Country' ? `: ${chip.filterType}` : ''}
                    <button
                      onClick={() => removeFilter(chip)}
                      className="hover:opacity-70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                {totalCount} companies has been found
              </span>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedRecords.size > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-6 py-3 flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-indigo-900">
                  {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedRecords(new Set())}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Export coming soon')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={() => alert('Bulk edit')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedRecords.size} records?`)) {
                      alert('Deleting...');
                      setSelectedRecords(new Set());
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Data Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No results found</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden mb-4">
                <DataTable
                  data={records}
                  onRowClick={(record) => setSelectedRecord(record.factory_id)}
                  isGuest={false}
                  selectedRecords={selectedRecords}
                  onSelectRecord={toggleRecordSelection}
                  onSelectAll={selectAllRecords}
                  onSort={setOrdering}
                  currentSort={ordering}
                />
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                showFirstLast={true}
              />
            </>
          )}
        </div>
      </div>

      {/* Filter Drawer with Country Filter */}
      {showFilters && (
        <FilterDrawer
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          setFilters={setFilters}
          countryFilters={countryFilters}
          setCountryFilters={setCountryFilters}
          filterOptions={filterOptions}
          allCountries={stats.allCountries}
          clearAllFilters={clearAllFilters}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          factoryId={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
        />
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </DashboardLayout>
  );
};

// NEW: Filter Drawer Component with Country Filter
const FilterDrawer = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  countryFilters,
  setCountryFilters,
  filterOptions,
  allCountries,
  clearAllFilters,
  setCurrentPage
}) => {
  const [countrySearch, setCountrySearch] = useState('');

  // Filter countries based on search
  const filteredCountries = allCountries.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const toggleCountry = (country) => {
    if (countryFilters.includes(country)) {
      setCountryFilters(countryFilters.filter(c => c !== country));
    } else {
      setCountryFilters([...countryFilters, country]);
    }
    setCurrentPage(1);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col animate-slide-in">
        <div className="px-6 py-4 border-b bg-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* NEW: Country Filter with Live Search */}
          <div className="border rounded-lg p-4 bg-purple-50">
            <h4 className="font-semibold text-gray-900 mb-3">Country</h4>

            {/* Live Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Selected Countries */}
            {countryFilters.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {countryFilters.map(country => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-xs"
                  >
                    {country}
                    <button onClick={() => toggleCountry(country)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Country List */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredCountries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No countries found</p>
              ) : (
                filteredCountries.map(country => (
                  <label
                    key={country}
                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-purple-100 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={countryFilters.includes(country)}
                      onChange={() => toggleCountry(country)}
                      className="rounded border-gray-300 text-purple-600"
                    />
                    <span className="text-sm text-gray-700">{country}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Regular Filters */}
          {filterOptions.map(option => (
            <div key={option.field} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{option.label}</h4>
                <span className="text-sm text-gray-500">{option.count}</span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={option.field}
                    checked={filters[option.field] === undefined}
                    onChange={() => {
                      const newFilters = { ...filters };
                      delete newFilters[option.field];
                      setFilters(newFilters);
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Any</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={option.field}
                    checked={filters[option.field] === true}
                    onChange={() => {
                      setFilters({ ...filters, [option.field]: true });
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-900">Include</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={option.field}
                    checked={filters[option.field] === false}
                    onChange={() => {
                      setFilters({ ...filters, [option.field]: false });
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-gray-900">Exclude</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 bg-gray-50 flex items-center gap-3">
          <button
            onClick={clearAllFilters}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default SuperdatabasePage;