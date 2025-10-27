// frontend/src/pages/client/ClientReportViewPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Database, Search, X, Filter, Download, ArrowLeft,
  Globe, BarChart3, PieChart, TrendingUp, Calendar, AlertCircle
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
    ? new Date(reportAccess.end_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

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
      console.log('ℹ️ No country filters in saved search');
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
      console.log('ℹ️ No category filters in saved search');
      setCategoryFilters([]);
    }

    // 3. Handle OTHER FILTERS (boolean fields, etc.)
    const otherFilters = {};
    Object.keys(filterParams).forEach(key => {
      // Skip countries and categories as they're handled above
      if (key !== 'countries' && key !== 'categories') {
        otherFilters[key] = filterParams[key];
      }
    });

    console.log('✅ Setting other filters:', otherFilters);
    setFilters(otherFilters);

    // Reset to first page
    setCurrentPage(1);

    console.log('📊 Final filter state:', {
      countries: filterParams.countries || [],
      categories: filterParams.categories || [],
      otherFilters: otherFilters
    });
  };

  // FILTER HANDLERS
  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
    }
  };

  const removeFilter = (field) => {
    const newFilters = { ...filters };
    delete newFilters[field];
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const removeCountryFilter = (country) => {
    setCountryFilters(countryFilters.filter(c => c !== country));
    setCurrentPage(1);
  };

  const removeCategoryFilter = (category) => {
    setCategoryFilters(categoryFilters.filter(c => c !== category));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({});
    setCountryFilters([]);
    setCategoryFilters([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // SELECTION HANDLERS
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

  // Calculate active filters count
  const activeFiltersCount = countryFilters.length + categoryFilters.length + Object.keys(filters).length;

  if (accessLoading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </ClientDashboardLayout>
    );
  }

  if (!reportAccess) {
    return null;
  }

  return (
    <ClientDashboardLayout>
      <div className="p-6 max-w-screen-2xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/client/reports')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Reports</span>
          </button>

          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{reportAccess.report_title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Active Subscription
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-medium">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expires: {formattedExpiryDate}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/client/reports/${reportId}/visualization`)}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 shadow-lg"
              >
                <BarChart3 className="w-5 h-5" />
                Visualization
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={records.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Export to Excel
              </button>
            </div>
          </div>

          {/* Saved Search Manager */}
          <div className="mb-6">
            <SavedSearchManager
              reportId={reportId}
              currentFilters={{
                countries: countryFilters,
                categories: categoryFilters,
                ...filters
              }}
              onLoadSearch={handleLoadSavedSearch}
            />
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[300px]">
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