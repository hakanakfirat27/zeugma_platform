// frontend/src/pages/client/ClientReportViewPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Database, Search, X, Filter, Download, ArrowLeft, FileText,
  Globe, BarChart3, PieChart, TrendingUp, Calendar, AlertCircle,
  Users, Package, MapPin, Clock
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataTable from '../../components/database/DataTable';
import RecordDetailModal from '../../components/database/RecordDetailModal';
import Pagination from '../../components/database/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import FilterSidebar from '../../components/database/FilterSidebar';
import SavedSearchManager from '../../components/client/SavedSearchManager';
import { getSavedSearches } from '../../services/savedSearchService';
import ExportModal from '../../components/client/ExportModal';
import api from '../../utils/api';
import {
  useClientReportData,
  useClientReportStats,
  useClientReportCountries,
  useClientReportFilterOptions,
  useClientReportAccess
} from '../../hooks/useClientReports';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];

const ClientReportViewPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  // STATE DECLARATIONS
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [ordering, setOrdering] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [defaultSearchLoaded, setDefaultSearchLoaded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // REACT QUERY HOOKS
  const { data: reportAccess, isLoading: accessLoading } = useClientReportAccess(reportId);

  const queryFilters = useMemo(() => ({
    page: currentPage,
    page_size: pageSize,
    search: searchQuery,
    ordering: ordering,
    countries: countryFilters,
    categories: categoryFilters,
    ...filters
  }), [currentPage, pageSize, searchQuery, ordering, countryFilters, categoryFilters, filters]);

  const { data: reportData, isLoading: dataLoading } = useClientReportData(
    reportId,
    queryFilters
  );

  const statsFilters = useMemo(() => ({
    search: searchQuery,
    countries: countryFilters,
    categories: categoryFilters,
    ...filters
  }), [searchQuery, countryFilters, categoryFilters, filters]);

  const { data: stats, isLoading: statsLoading } = useClientReportStats(
    reportId,
    statsFilters
  );

  const { data: allCountries = [] } = useClientReportCountries(reportId);
  const { data: filterOptions = [] } = useClientReportFilterOptions(reportId);

  // Extract data from React Query responses
  const records = reportData?.results || [];
  const totalCount = reportData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const availableCategories = stats?.available_categories || [];

  // Format the expiry date
  const formattedExpiryDate = reportAccess?.end_date
    ? new Date(reportAccess.end_date).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })
    : 'N/A';

  // Calculate days remaining
  const daysRemaining = reportAccess?.end_date
    ? Math.ceil((new Date(reportAccess.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get top categories (top 3) - using stats.categories
  const topCategories = useMemo(() => {
    if (!stats?.categories || !Array.isArray(stats.categories)) return [];

    // Sort by count and take top 3
    return stats.categories
      .slice()
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 3);
  }, [stats]);

  // Get top countries (try multiple possible field names)
  const topCountries = useMemo(() => {
    if (!stats) return [];

    // Try different possible field names
    if (stats.top_countries && Array.isArray(stats.top_countries)) {
      return stats.top_countries.slice(0, 3);
    }

    if (stats.country_distribution && Array.isArray(stats.country_distribution)) {
      return stats.country_distribution.slice(0, 3);
    }

    if (stats.countries && Array.isArray(stats.countries)) {
      return stats.countries.slice(0, 3);
    }

    return [];
  }, [stats]);

  useEffect(() => {
    const loadDefaultSearch = async () => {
      // Only load once when component mounts
      if (defaultSearchLoaded || !reportId) return;

      try {
        const response = await getSavedSearches(reportId);
        const savedSearches = response.results || [];

        // Find the default search
        const defaultSearch = savedSearches.find(search => search.is_default);

        if (defaultSearch) {
          console.log('Loading default search:', defaultSearch.name);
          console.log('Default search filter params:', defaultSearch.filter_params);

          // IMPORTANT: Use the proper handleLoadSavedSearch function
          handleLoadSavedSearch(defaultSearch.filter_params);

          // Show a subtle notification (optional)
          console.log(`Default search "${defaultSearch.name}" loaded`);
        }

        setDefaultSearchLoaded(true);
      } catch (error) {
        console.error('Error loading default search:', error);
        setDefaultSearchLoaded(true);
      }
    };

    loadDefaultSearch();
  }, [reportId]); // Run when reportId changes

  // SECURITY: Copy & Screenshot Protection
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 's' || e.key === 'p')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'x' || e.key === 's' || e.key === 'p')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        return false;
      }
    };

    const disableSelection = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', disableSelection);
    document.addEventListener('copy', disableSelection);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', disableSelection);
      document.removeEventListener('copy', disableSelection);
    };
  }, []);

  // Verify access on mount
  useEffect(() => {
    if (!accessLoading && !reportAccess) {
      alert('You do not have access to this report');
      navigate('/client/reports');
    }
  }, [reportAccess, accessLoading, navigate]);

  // EXPORT FUNCTION
  const handleExport = () => {
    setShowExportModal(true);
  };

  /**
   * CRITICAL FIX: Handle loading saved searches with proper filter separation
   * This properly handles countries, categories, and other filters
   */
  const handleLoadSavedSearch = (filterParams) => {
    console.log('🔍 Loading saved search with params:', filterParams);

    // 1. Handle COUNTRIES (array)
    if (filterParams.countries) {
      if (Array.isArray(filterParams.countries)) {
        console.log('✅ Setting country filters:', filterParams.countries);
        setCountryFilters(filterParams.countries);
      } else {
        console.warn('⚠️ Countries is not an array:', filterParams.countries);
        setCountryFilters([]);
      }
    } else {
      setCountryFilters([]);
    }

    // 2. Handle CATEGORIES (array)
    if (filterParams.categories) {
      if (Array.isArray(filterParams.categories)) {
        console.log('✅ Setting category filters:', filterParams.categories);
        setCategoryFilters(filterParams.categories);
      } else {
        console.warn('⚠️ Categories is not an array:', filterParams.categories);
        setCategoryFilters([]);
      }
    } else {
      setCategoryFilters([]);
    }

    // 3. Handle SEARCH
    if (filterParams.search) {
      console.log('✅ Setting search query:', filterParams.search);
      setSearchQuery(filterParams.search);
    } else {
      setSearchQuery('');
    }

    // 4. Handle OTHER FILTERS (everything except countries, categories, search)
    const otherFilters = {};
    Object.keys(filterParams).forEach(key => {
      if (key !== 'countries' && key !== 'categories' && key !== 'search') {
        otherFilters[key] = filterParams[key];
      }
    });

    if (Object.keys(otherFilters).length > 0) {
      console.log('✅ Setting other filters:', otherFilters);
      setFilters(otherFilters);
    } else {
      setFilters({});
    }

    // 5. Reset pagination
    setCurrentPage(1);

    console.log('✅ Saved search loaded successfully!');
  };

  const toggleRecordSelection = (factoryId) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(factoryId)) {
      newSelection.delete(factoryId);
    } else {
      newSelection.add(factoryId);
    }
    setSelectedRecords(newSelection);
  };

  const selectAllRecords = (checked) => {
    if (checked) {
      const allIds = records.map(r => r.factory_id);
      setSelectedRecords(new Set(allIds));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
    }
  };

  const removeCountryFilter = (country) => {
    setCountryFilters(prev => prev.filter(c => c !== country));
    setCurrentPage(1);
  };

  const removeCategoryFilter = (category) => {
    setCategoryFilters(prev => prev.filter(c => c !== category));
    setCurrentPage(1);
  };

  const removeFilter = (key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({});
    setCountryFilters([]);
    setCategoryFilters([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const activeFiltersCount =
    countryFilters.length +
    categoryFilters.length +
    Object.keys(filters).filter(key => filters[key] !== undefined).length;

  if (accessLoading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout
      pageTitle={reportAccess?.report_title || 'Report View'}
      pageSubtitleBottom={reportAccess?.report_description || 'View and analyze report data'}
    >
      <div className="p-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Records Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <BarChart3 className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-blue-100 mb-1 font-medium">Total Records</p>
              <p className="text-3xl font-bold">{totalCount.toLocaleString()}</p>
              <p className="text-xs text-blue-100 mt-2">Companies in database</p>
            </div>
          </div>

          {/* Top Categories Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <TrendingUp className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-purple-100 mb-2 font-medium">Top Categories</p>
              {statsLoading ? (
                <p className="text-sm text-purple-100">Loading...</p>
              ) : topCategories.length > 0 ? (
                <div className="space-y-1">
                  {topCategories.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-purple-50 truncate">
                        {item.category || 'Unknown'}
                      </span>
                      <span className="text-purple-100 font-semibold ml-2">
                        {item.count || 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-purple-100">No data available</p>
              )}
            </div>
          </div>

          {/* Top Countries Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <Globe className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-green-100 mb-2 font-medium">Top Countries</p>
              {statsLoading ? (
                <p className="text-sm text-green-100">Loading...</p>
              ) : topCountries.length > 0 ? (
                <div className="space-y-1">
                  {topCountries.map((country, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-green-50 truncate">
                        {country.country || country.name || 'Unknown'}
                      </span>
                      <span className="text-green-100 font-semibold ml-2">
                        {country.count || country.value || 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-100">No data available</p>
              )}
            </div>
          </div>

          {/* Expiry Date Card */}
          <div className={`relative overflow-hidden rounded-2xl shadow-lg p-6 text-white ${
            daysRemaining <= 30 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                {daysRemaining <= 30 ? (
                  <AlertCircle className="w-8 h-8 text-white/30" />
                ) : (
                  <Clock className="w-8 h-8 text-white/30" />
                )}
              </div>
              <p className={`text-sm mb-1 font-medium ${daysRemaining <= 30 ? 'text-orange-100' : 'text-indigo-100'}`}>
                Expiry Date
              </p>
              <p className="text-xl font-bold mb-1">{formattedExpiryDate}</p>
              <p className={`text-xs mt-2 ${daysRemaining <= 30 ? 'text-orange-100' : 'text-indigo-100'}`}>
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
              </p>
            </div>
          </div>
        </div>

        {/* SAVED SEARCH MANAGER */}
        <div className="mb-6">
          <SavedSearchManager
            reportId={reportId}
            currentFilters={{
              search: searchQuery,
              countries: countryFilters,
              categories: categoryFilters,
              ...filters
            }}
            onLoadSearch={handleLoadSavedSearch}
          />
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-600" />
              Search & Filter Companies
            </h2>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search companies..."
                className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 shadow-sm relative"
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {countryFilters.map(country => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium border border-blue-200"
                  >
                    {country}
                    <button onClick={() => removeCountryFilter(country)} className="hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {categoryFilters.map(category => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium border border-purple-200"
                  >
                    {category}
                    <button onClick={() => removeCategoryFilter(category)} className="hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {Object.entries(filters).map(([key, value]) => {
                  if (value === undefined) return null;
                  const option = filterOptions.find(opt => opt.field === key);
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        value
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      {option?.label || key.replace(/_/g, ' ')}: {value ? 'Include' : 'Exclude'}
                      <button onClick={() => removeFilter(key)} className="hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RESULTS COUNT */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-green-900">
              {totalCount.toLocaleString()} companies found
            </span>
          </div>
        </div>

        {/* DATA TABLE */}
        {dataLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-100">
              <DataTable
                data={records}
                onRowClick={(record) => setSelectedRecord(record.factory_id)}
                isGuest={false}
                onSort={setOrdering}
                currentSort={ordering}
                selectedRecords={selectedRecords}
                onSelectRecord={toggleRecordSelection}
                onSelectAll={selectAllRecords}
              />
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page);
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showFirstLast={true}
            />
          </>
        )}
      </div>

      {/* FILTER DRAWER */}
      {showFilters && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowFilters(false)}
          />
          <FilterSidebar
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            filters={filters}
            filterOptions={filterOptions}
            countryFilters={countryFilters}
            onCountryFilterChange={setCountryFilters}
            allCountries={allCountries}
            categoryFilters={categoryFilters}
            onCategoryFilterChange={setCategoryFilters}
            availableCategories={availableCategories}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setCurrentPage(1);
            }}
            onReset={() => {
              setFilters({});
              setCountryFilters([]);
              setCategoryFilters([]);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      {/* DETAIL MODAL */}
      {selectedRecord && (
        <RecordDetailModal
          factoryId={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
        />
      )}

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportId={reportId}
        currentFilters={{
          search: searchQuery,
          countries: countryFilters,
          categories: categoryFilters,
          ...filters
        }}
      />
    </ClientDashboardLayout>
  );
};

export default ClientReportViewPage;