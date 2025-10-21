// frontend/src/pages/SuperdatabasePage.jsx
// MODIFIED: Merged header by removing secondary header and adding props to DashboardLayout

import { FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Download, Upload, Trash2, Edit, Plus, BarChart3, TrendingUp, Users, X, ArrowLeft } from 'lucide-react';
import { useRecords, useFilterOptions } from '../hooks/useDatabase';
import { CATEGORIES } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import FilterSidebar from '../components/database/FilterSidebar';

const SuperdatabasePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // UPDATED: Multi-category selection with Set
  const [selectedCategories, setSelectedCategories] = useState(new Set(['ALL']));

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [ordering, setOrdering] = useState('');

  // Stats from backend endpoint
  const [stats, setStats] = useState({
    total: 0,
    countriesCount: 0,
    topCountries: [],
    allCountries: []
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch ALL countries ONCE when component mounts or category changes
  useEffect(() => {
    const fetchAllCountries = async () => {
      try {
        const params = new URLSearchParams();

        // UPDATED: Handle multiple categories
        if (selectedCategories.has('ALL')) {
          // Don't append any category
        } else {
          params.append('categories', Array.from(selectedCategories).join(','));
        }

        const response = await api.get(`/api/database-stats/?${params.toString()}`);

        setStats(prev => ({
          ...prev,
          allCountries: response.data.all_countries || []
        }));
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      }
    };

    fetchAllCountries();
  }, [selectedCategories]); // Dependency updated

  // Fetch other stats when filters change
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const params = new URLSearchParams();

        // UPDATED: Handle multiple categories
        if (selectedCategories.has('ALL')) {
          // Don't append any category
        } else {
          params.append('categories', Array.from(selectedCategories).join(','));
        }

        if (searchQuery) {
          params.append('search', searchQuery);
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

        const response = await api.get(`/api/database-stats/?${params.toString()}`);

        setStats(prev => ({
          ...prev, // Keep allCountries from previous state
          total: response.data.total_count,
          countriesCount: response.data.countries_count,
          topCountries: response.data.top_countries || []
        }));

      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [selectedCategories, searchQuery, filters, countryFilters]);

  // UPDATED: Convert Set to comma-separated string for API
  const categoriesParam = selectedCategories.has('ALL')
    ? 'ALL'
    : Array.from(selectedCategories).join(',');

  const { data: recordsData, isLoading } = useRecords({
    categories: categoriesParam,  // CHANGED: category → categories
    search: searchQuery,
    page: currentPage,
    page_size: pageSize,
    ordering: ordering,
    countries: countryFilters.join(','),
    ...filters,
  });

  // UPDATED: Use first selected category for filter options, or 'ALL' if multiple/none
  const filterOptionsCategory = selectedCategories.size === 1 && !selectedCategories.has('ALL')
    ? Array.from(selectedCategories)[0]
    : 'ALL';

  const { data: filterOptions = [] } = useFilterOptions(filterOptionsCategory);

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // UPDATED: Include category filters in count
  const categoryFilterCount = selectedCategories.has('ALL') ? 0 : selectedCategories.size;
  const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length + categoryFilterCount;

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

  // UPDATED: Handle multiple categories
  const handleCreateReport = () => {
    const filterCriteria = {};

    // Add categories (only if not "ALL")
    if (!selectedCategories.has('ALL') && selectedCategories.size > 0) {
      const categoriesArray = Array.from(selectedCategories);
      // If only one category, send as string for backward compatibility
      // If multiple categories, send as array
      filterCriteria.categories = categoriesArray.length === 1 ? categoriesArray[0] : categoriesArray;
    }

    // Add country filters
    if (countryFilters.length > 0) {
      filterCriteria.country = countryFilters;
    }

    // Add material/property filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === true || filters[key] === false) {
        filterCriteria[key] = filters[key];
      }
    });

    console.log('🚀 Navigating to Create Report with filters:', filterCriteria);
    console.log('📊 Total records:', totalCount);

    navigate('/custom-reports/create', {
      state: {
        filterCriteria: filterCriteria,
        recordCount: totalCount,
      }
    });
  };

  // --- NEW: Define the header subtitle ---
  const pageSubtitle = (
    <p className="text-sm text-white-700">Complete administrative control over all records</p>
  );

  return (
    // --- MODIFIED: Pass pageTitle and pageSubtitleBottom to DashboardLayout ---
    <DashboardLayout
      pageTitle="Superdatabase Management"
      pageSubtitleBottom={pageSubtitle}
    >
      {/* --- REMOVED: The secondary gradient header div --- */}

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm" // Added text style
              >
                <BarChart3 className="w-4 h-4" />
                {showStats ? 'Hide' : 'Show'} Stats
              </button>

              <button
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm" // Added text style
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Create Report Button */}
              {(activeFiltersCount > 0 || totalCount > 0) && (
                <button
                  onClick={handleCreateReport}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 shadow-md transition-all text-sm" // Added text style
                  title="Create custom report from current filters"
                >
                  <FileText className="w-4 h-4" />
                  Create Report from Filters
                  {totalCount > 0 && (
                    <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                      {totalCount} records
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => alert('Import coming soon')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm" // Added text style
              >
                <Upload className="w-4 h-4" />
                Import Data
              </button>

              <button
                onClick={() => alert('Add new record')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm" // Added text style
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

          {/* NEW: Multi-Select Category Filter with Checkboxes */}
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Select Categories</h3>
                <span className="text-xs text-gray-500">
                  {selectedCategories.has('ALL')
                    ? 'All categories selected'
                    : `${selectedCategories.size} selected`}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {/* "All Categories" Checkbox */}
                <label className="flex items-center gap-2 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedCategories.has('ALL')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories(new Set(['ALL']));
                      } else {
                        setSelectedCategories(new Set());
                      }
                      setCurrentPage(1);
                      setSelectedRecords(new Set());
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900">All Categories</span>
                </label>

                {/* Individual Category Checkboxes */}
                {CATEGORIES.filter(cat => cat.value !== 'ALL').map(category => (
                  <label
                    key={category.value}
                    className={`flex items-center gap-2 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border transition-colors ${
                      selectedCategories.has(category.value) && !selectedCategories.has('ALL')
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category.value)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedCategories);
                        newSelected.delete('ALL'); // Remove "ALL" when selecting specific categories

                        if (e.target.checked) {
                          newSelected.add(category.value);
                        } else {
                          newSelected.delete(category.value);
                        }

                        // If none selected, default to ALL
                        if (newSelected.size === 0) {
                          newSelected.add('ALL');
                        }

                        setSelectedCategories(newSelected);
                        setCurrentPage(1);
                        setSelectedRecords(new Set());
                      }}
                      disabled={selectedCategories.has('ALL')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                    />
                    <span className={`text-sm ${
                      selectedCategories.has('ALL') ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Live Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by company name, country, region..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Chips */}
          {(Object.keys(filters).length > 0 || countryFilters.length > 0 || (!selectedCategories.has('ALL') && selectedCategories.size > 0)) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                <button
                  onClick={() => {
                    setFilters({});
                    setCountryFilters([]);
                    setSelectedCategories(new Set(['ALL']));  // Reset categories
                    setCurrentPage(1);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* NEW: Category Filter Chips */}
                {!selectedCategories.has('ALL') && selectedCategories.size > 0 && (
                  <>
                    {Array.from(selectedCategories).map(categoryValue => {
                      const cat = CATEGORIES.find(c => c.value === categoryValue);
                      return (
                        <span
                          key={categoryValue}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-sm font-medium"
                        >
                          Category: {cat?.label || categoryValue}
                          <button
                            onClick={() => {
                              const newSelected = new Set(selectedCategories);
                              newSelected.delete(categoryValue);
                              setSelectedCategories(newSelected.size === 0 ? new Set(['ALL']) : newSelected);
                              setCurrentPage(1);
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}
                  </>
                )}

                {/* Boolean Filters */}
                {Object.entries(filters)
                  .filter(([_, value]) => value !== undefined)
                  .map(([key, value]) => {
                    const option = filterOptions.find(opt => opt.field === key);
                    return (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                          value === true
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {option?.label || key.replace(/_/g, ' ')}: {value ? 'Include' : 'Exclude'}
                        <button
                          onClick={() => {
                            const newFilters = { ...filters };
                            delete newFilters[key];
                            setFilters(newFilters);
                            setCurrentPage(1);
                          }}
                          className="hover:opacity-70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    );
                  })}

                {/* Country Filters */}
                {countryFilters.map(country => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-sm font-medium"
                  >
                    Country: {country}
                    <button
                      onClick={() => {
                        setCountryFilters(countryFilters.filter(c => c !== country));
                        setCurrentPage(1);
                      }}
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
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Export selected')}
                  className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Selected
                </button>
                <button
                  onClick={() => alert('Delete selected')}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
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

      {/* Filter Sidebar */}
      {showFilters && (
        <FilterSidebar
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          filterOptions={filterOptions}
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={stats.allCountries}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilters({});
            setCountryFilters([]);
            setCurrentPage(1);
          }}
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

export default SuperdatabasePage;