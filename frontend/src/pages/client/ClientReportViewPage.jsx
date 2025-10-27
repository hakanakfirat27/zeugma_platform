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

          // Apply the default search filters
          setFilters(defaultSearch.filter_params);

          // Load records with default filters
          await loadRecords(1, defaultSearch.filter_params);

          // Show a subtle notification (optional)
          // You can remove this if you don't want notification
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
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams({ report_id: reportId });

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (ordering) params.append('ordering', ordering);
      if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
      if (categoryFilters.length > 0) params.append('categories', categoryFilters.join(','));

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/client/report-export/?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportAccess?.report_title || 'report'}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
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

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length + categoryFilters.length;

  // CHART DATA
  const countryChartData = useMemo(() => {
    return (stats?.top_countries || []).slice(0, 8).map(item => ({
      name: item.name,
      value: item.count
    }));
  }, [stats?.top_countries]);

  const categoryChartData = useMemo(() => {
    return (stats?.categories || []).map(item => ({
      name: item.category,
      value: item.count
    }));
  }, [stats?.categories]);

  const handleLoadSavedSearch = (filterParams) => {
    // Apply the saved filters
    setFilters(filterParams);

    // Reload data with new filters
    loadRecords(1, filterParams);

    // You might also want to show a success message
    console.log('Loaded saved search with filters:', filterParams);
  };

  // LOADING STATE
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
    <ClientDashboardLayout>
      <div className="p-6 no-select">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/client/reports')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Reports
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {reportAccess?.report_title}
              </h1>
              <p className="text-gray-600">{reportAccess?.report_description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Expires</div>
              <div className="text-xl font-bold text-indigo-600">
                {formattedExpiryDate}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {statsLoading ? '...' : (stats?.total_count || 0).toLocaleString()}
            </div>
            <div className="text-blue-100 text-sm">Total Companies</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-8 h-8 opacity-80" />
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {statsLoading ? '...' : stats?.countries_count || 0}
            </div>
            <div className="text-purple-100 text-sm">Countries</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <PieChart className="w-8 h-8 opacity-80" />
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {reportAccess?.days_remaining || 0}
            </div>
            <div className="text-green-100 text-sm">Days Remaining</div>
          </div>
        </div>

        {/* Buttons - Filters, Visualization, and Export */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate(`/client/reports/${reportId}/visualization`)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <BarChart3 className="w-5 h-5" />
              Visualization
            </button>

            <button
              onClick={handleExport}
              disabled={exportLoading || records.length === 0}
              className="ml-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              {exportLoading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
        {/* ADD THIS: Saved Search Manager */}
        <div className="mb-6">
          <SavedSearchManager
            reportId={reportId}
            currentFilters={filters}
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
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
    </ClientDashboardLayout>
  );
};

export default ClientReportViewPage;