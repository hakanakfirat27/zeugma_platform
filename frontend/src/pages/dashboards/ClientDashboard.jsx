import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Database, Calendar, TrendingUp, Users, Globe,
  BarChart3, PieChart, CheckCircle, AlertCircle,
  Filter, Search, X, RotateCcw, LineChart, Download
} from 'lucide-react';
import DataTable from '../../components/database/DataTable';
import RecordDetailModal from '../../components/database/RecordDetailModal';
import Pagination from '../../components/database/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const ClientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ALL STATE HOOKS AT THE TOP
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerms, setSearchTerms] = useState([]);
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [ordering, setOrdering] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    countriesCount: 0,
    topCountries: [],
    allCountries: [],
    categories: []
  });
  const [filterOptions, setFilterOptions] = useState([]);

  // Copy & Screenshot Protection
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(8px)';
      } else {
        document.body.style.filter = 'none';
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', disableSelection);
    document.addEventListener('copy', disableSelection);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', disableSelection);
      document.removeEventListener('copy', disableSelection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.filter = 'none';
    };
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      loadReportData();
      loadReportStats();
      loadFilterOptions();
    }
  }, [selectedReport, currentPage, pageSize, searchTerms, filters, countryFilters, ordering]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/client/subscriptions/');
      setSubscriptions(response.data);

      if (response.data.length > 0 && !selectedReport) {
        setSelectedReport(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    if (!selectedReport) return;

    try {
      setDataLoading(true);
      const params = new URLSearchParams({
        report_id: selectedReport.report_id,
        page: currentPage,
        page_size: pageSize,
      });

      if (searchTerms.length > 0) {
        params.append('search', searchTerms.join(' '));
      }
      if (ordering) {
        params.append('ordering', ordering);
      }
      if (countryFilters.length > 0) {
        params.append('countries', countryFilters.join(','));
      }

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/client/report-data/?${params.toString()}`);
      setRecords(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const loadReportStats = async () => {
    if (!selectedReport) return;

    try {
      const params = new URLSearchParams({
        report_id: selectedReport.report_id,
      });

      if (searchTerms.length > 0) {
        params.append('search', searchTerms.join(' '));
      }
      if (countryFilters.length > 0) {
        params.append('countries', countryFilters.join(','));
      }

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/client/report-stats/?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFilterOptions = async () => {
    if (!selectedReport) return;

    try {
      const params = new URLSearchParams({
        report_id: selectedReport.report_id,
      });

      const response = await api.get(`/api/client/filter-options/?${params.toString()}`);
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleExport = async () => {
    if (!selectedReport) return;

    try {
      setExportLoading(true);

      const params = new URLSearchParams({
        report_id: selectedReport.report_id,
      });

      if (searchTerms.length > 0) {
        params.append('search', searchTerms.join(' '));
      }
      if (countryFilters.length > 0) {
        params.append('countries', countryFilters.join(','));
      }

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/client/report-export/?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'text/csv',
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Export failed');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport.report_title.replace(/\s+/g, '_')}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Export completed successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

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

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No Active Subscriptions</h2>
            <p className="text-lg text-gray-600 mb-8">
              You don't have any active report subscriptions yet. Contact us to purchase access to our premium databases.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 no-select">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Reports</h1>
                <p className="text-xs text-gray-500">{user?.full_name || user?.username}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Subscriptions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map(sub => (
              <div
                key={sub.id}
                onClick={() => setSelectedReport(sub)}
                className={`bg-white rounded-2xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selectedReport?.id === sub.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  {selectedReport?.id === sub.id && (
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{sub.report_title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{sub.report_description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Expires: {new Date(sub.end_date).toLocaleDateString()}</span>
                </div>
                {sub.days_remaining <= 30 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{sub.days_remaining} days remaining</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedReport && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Companies</p>
                <p className="text-3xl font-bold text-gray-900">{(stats?.total || 0).toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Countries</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.countriesCount || 0}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Categories</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.categories?.length || 0}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600 mb-2">Top Countries</p>
                <div className="space-y-1">
                  {(stats?.topCountries || []).slice(0, 3).map((country, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate">{country.name}</span>
                      <span className="font-medium text-gray-900">{country.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowVisualization(!showVisualization)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                      showVisualization
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <LineChart className="w-4 h-4" />
                    {showVisualization ? 'Hide' : 'Show'} Insights
                  </button>

                  <button
                    onClick={() => setShowFilters(true)}
                    className="px-4 py-2 bg-gray-100 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={handleExport}
                  disabled={exportLoading || totalCount === 0}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {exportLoading ? 'Exporting...' : 'Export to CSV'}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search companies, countries, regions... (Press Enter)"
                  className="w-full pl-12 pr-24 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={handleAddSearchTerm}
                    disabled={!searchQuery.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {searchTerms.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex flex-wrap gap-2 flex-1">
                    {searchTerms.map((term) => (
                      <span
                        key={term}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-800 text-sm font-medium"
                      >
                        {term}
                        <button onClick={() => handleRemoveSearchTerm(term)} className="hover:opacity-70">
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={handleClearSearch}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-900">
                  {totalCount} companies found
                </span>
              </div>
            </div>

            {dataLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : records.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600">No results found</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                  <DataTable
                    data={records}
                    onRowClick={(record) => setSelectedRecord(record.factory_id)}
                    isGuest={false}
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
          </>
        )}
      </div>

      {showFilters && (
        <FilterDrawer
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          setFilters={setFilters}
          countryFilters={countryFilters}
          setCountryFilters={setCountryFilters}
          filterOptions={filterOptions}
          allCountries={stats?.allCountries || []}
          setCurrentPage={setCurrentPage}
        />
      )}

      {selectedRecord && (
        <RecordDetailModal
          factoryId={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
        />
      )}

      <style>{`
        .no-select {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .no-select * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .no-select {
          -webkit-touch-callout: none;
        }

        @media print {
          body {
            display: none !important;
          }
        }

        .no-select::before {
          content: 'Confidential - ${user?.username || 'Client'} - ${new Date().toLocaleDateString()}';
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 4rem;
          color: rgba(0, 0, 0, 0.03);
          pointer-events: none;
          z-index: 9999;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

const FilterDrawer = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  countryFilters,
  setCountryFilters,
  filterOptions,
  allCountries,
  setCurrentPage
}) => {
  const [countrySearch, setCountrySearch] = useState('');

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

  const clearAllFilters = () => {
    setFilters({});
    setCountryFilters([]);
    setCurrentPage(1);
  };

  return (
    <>
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <h4 className="font-semibold text-gray-900 mb-3">Country</h4>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {countryFilters.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {countryFilters.map(country => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded-lg text-xs"
                  >
                    {country}
                    <button onClick={() => toggleCountry(country)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredCountries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No countries found</p>
              ) : (
                filteredCountries.map(country => (
                  <label
                    key={country}
                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-purple-100 rounded-lg"
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

          {filterOptions.slice(0, 20).map(option => (
            <div key={option.field} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
};

export default ClientDashboard;