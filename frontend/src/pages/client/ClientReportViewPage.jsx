// Updated ClientReportViewPage.jsx with Visualization Modal
// This moves stats/charts to a modal and reorganizes the layout

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Database, Search, X, Filter, Download, ArrowLeft,
  Globe, BarChart3, PieChart, TrendingUp, AlertCircle, Eye
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
import api from '../../utils/api';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];

const ClientReportViewPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  // All your existing state declarations
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [reportInfo, setReportInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [ordering, setOrdering] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState([]);

  // ⭐ NEW: Visualization Modal State
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);

  const [stats, setStats] = useState({
    total_count: 0,
    countries_count: 0,
    top_countries: [],
    all_countries: [],
    categories: []
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // All your existing useEffect hooks and functions
  // (Keep all your security protection, data loading, etc.)

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

  useEffect(() => {
    verifyAccess();
  }, [reportId]);

  useEffect(() => {
    const fetchAllCountries = async () => {
      if (!reportId) return;
      try {
        const response = await api.get(`/api/client/report-stats/?report_id=${reportId}`);
        setStats(prev => ({
          ...prev,
          all_countries: response.data.all_countries || []
        }));
      } catch (error) {
        console.error('Failed to fetch all countries:', error);
      }
    };
    fetchAllCountries();
  }, [reportId]);

  useEffect(() => {
    if (!reportInfo) return;
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const params = new URLSearchParams({ report_id: reportId });
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined) params.append(key, filters[key]);
        });
        const response = await api.get(`/api/client/report-stats/?${params.toString()}`);
        setStats(prev => ({
          ...prev,
          total_count: response.data.total_count,
          countries_count: response.data.countries_count,
          top_countries: response.data.top_countries || [],
          categories: response.data.categories || []
        }));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [reportInfo, searchQuery, filters, countryFilters]);

  useEffect(() => {
    if (reportInfo) {
      loadReportData();
      loadFilterOptions();
    }
  }, [reportInfo, currentPage, pageSize, searchQuery, filters, countryFilters, ordering]);

  const verifyAccess = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/client/subscriptions/');
      const subscription = response.data.find(sub => sub.report_id === reportId && sub.is_active);
      if (!subscription) {
        alert('You do not have access to this report');
        navigate('/client/reports');
        return;
      }
      setReportInfo(subscription);
    } catch (error) {
      console.error('Error verifying access:', error);
      navigate('/client/reports');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    if (!reportInfo) return;
    try {
      setDataLoading(true);
      const params = new URLSearchParams({
        report_id: reportId,
        page: currentPage,
        page_size: pageSize,
      });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (ordering) params.append('ordering', ordering);
      if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) params.append(key, filters[key]);
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

  const loadFilterOptions = async () => {
    if (!reportInfo) return;
    try {
      const params = new URLSearchParams({ report_id: reportId });
      const response = await api.get(`/api/client/filter-options/?${params.toString()}`);
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleExport = async () => {
    if (!reportInfo) return;
    try {
      setExportLoading(true);
      const params = new URLSearchParams({ report_id: reportId });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) params.append(key, filters[key]);
      });
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/client/report-export/?${params.toString()}`,
        { method: 'GET', credentials: 'include' }
      );
      if (!response.ok) {
        const text = await response.text();
        alert('Export failed: ' + text);
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportInfo.report_title.replace(/\s+/g, '_')}_export.csv`;
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

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length;
  const totalPages = Math.ceil(totalCount / pageSize);

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

  if (loading) {
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
            <span className="font-medium">Back to Reports</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{reportInfo?.report_title}</h2>
              <p className="text-gray-600">{reportInfo?.report_description}</p>
            </div>
            {reportInfo && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(reportInfo.end_date).toLocaleDateString()}
                  </p>
                </div>
                {reportInfo.days_remaining <= 30 && (
                  <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">{reportInfo.days_remaining} days left</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ⭐ NEW: Moved ACTION BAR to TOP */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* ⭐ NEW: Visualization Button */}
              <button
                onClick={() => setShowVisualizationModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-md"
              >
                <BarChart3 className="w-4 h-4" />
                Visualization
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={exportLoading || totalCount === 0}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* ⭐ MOVED: SEARCH BAR */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search companies... (Press Enter)"
              className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE FILTERS */}
        {(Object.keys(filters).length > 0 || countryFilters.length > 0) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Active filters:</p>
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {countryFilters.map(country => (
                <span
                  key={country}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-sm font-medium"
                >
                  Country: {country}
                  <button onClick={() => removeCountryFilter(country)} className="hover:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
              {Object.entries(filters)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => {
                  const option = filterOptions.find(opt => opt.field === key);
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                        value === true
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
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
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showFirstLast={true}
            />
          </>
        )}
      </div>

      {/* ⭐ NEW: VISUALIZATION MODAL */}
      {showVisualizationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Data Visualization</h2>
                  <p className="text-indigo-100 text-sm mt-1">{reportInfo?.report_title}</p>
                </div>
                <button
                  onClick={() => setShowVisualizationModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* STATS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center mb-3">
                      <Database className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-purple-100 mb-1 font-medium">Total Companies</p>
                    <p className="text-4xl font-bold">{(stats?.total_count || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center mb-3">
                      <Globe className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-blue-100 mb-1 font-medium">Countries</p>
                    <p className="text-4xl font-bold">{stats?.countries_count || 0}</p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center mb-3">
                      <PieChart className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-indigo-100 mb-1 font-medium">Categories</p>
                    <p className="text-4xl font-bold">{stats?.categories?.length || 0}</p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center mb-3">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-pink-100 mb-1 font-medium">Top Market</p>
                    <p className="text-2xl font-bold truncate">
                      {(stats?.top_countries || [])[0]?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-pink-100 mt-1">
                      {(stats?.top_countries || [])[0]?.count || 0} companies
                    </p>
                  </div>
                </div>
              </div>

              {/* CHARTS */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Country Chart */}
                {countryChartData.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Geographic Distribution</h3>
                        <p className="text-sm text-gray-500 mt-1">Top markets by company count</p>
                      </div>
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={countryChartData}>
                        <defs>
                          <linearGradient id="colorCountry" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Bar dataKey="value" fill="url(#colorCountry)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Category Chart */}
                {categoryChartData.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Category Breakdown</h3>
                        <p className="text-sm text-gray-500 mt-1">Distribution by industry sector</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <PieChart className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          labelLine={{ stroke: '#E5E7EB' }}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Close Button at Bottom */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowVisualizationModal(false)}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Close Visualization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER DRAWER - Keep your existing FilterDrawer */}
      {showFilters && (
        <FilterDrawer
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          setFilters={setFilters}
          countryFilters={countryFilters}
          setCountryFilters={setCountryFilters}
          filterOptions={filterOptions}
          allCountries={stats?.all_countries || []}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* RECORD DETAIL MODAL */}
      {selectedRecord && (
        <RecordDetailModal
          factoryId={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
        />
      )}

      {/* SECURITY STYLES */}
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

        @media print {
          body {
            display: none !important;
          }
        }

        .no-select::before {
          content: 'Confidential - ${reportInfo?.report_title || 'Report'} - ${new Date().toLocaleDateString()}';
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </ClientDashboardLayout>
  );
};

/* ============================================
   FILTER DRAWER COMPONENT - Keep your existing one
   ============================================ */
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
  const [searchFilter, setSearchFilter] = useState('');

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return allCountries;
    const searchLower = countrySearch.toLowerCase();
    return allCountries.filter(country =>
      country.toLowerCase().includes(searchLower)
    );
  }, [allCountries, countrySearch]);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return filterOptions;
    const query = searchFilter.toLowerCase();
    return filterOptions.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.field.toLowerCase().includes(query)
    );
  }, [filterOptions, searchFilter]);

  const toggleCountry = (country) => {
    if (countryFilters.includes(country)) {
      setCountryFilters(countryFilters.filter(c => c !== country));
    } else {
      setCountryFilters([...countryFilters, country]);
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters };
    if (value === undefined) {
      delete newFilters[field];
    } else {
      newFilters[field] = value;
    }
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({});
    setCountryFilters([]);
    setSearchFilter('');
    setCountrySearch('');
    setCurrentPage(1);
  };

  const activeBooleanFilterCount = Object.keys(filters).filter(key => filters[key] !== undefined).length;
  const totalActiveFilters = activeBooleanFilterCount + countryFilters.length;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-6 py-5 border-b bg-purple-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Refine your search result</h3>
              {totalActiveFilters > 0 && (
                <p className="text-xs text-purple-100 mt-0.5">
                  {totalActiveFilters} filter{totalActiveFilters !== 1 ? 's' : ''} active
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {allCountries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 text-sm">Countries</h4>
                {countryFilters.length > 0 && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {countryFilters.length} selected
                  </span>
                )}
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {countrySearch && (
                  <button
                    onClick={() => setCountrySearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {countrySearch && countryFilters.length > 0 && (
                <div className="mb-2 text-xs text-gray-600 bg-purple-50 px-3 py-2 rounded">
                  {countryFilters.length} countries selected: {countryFilters.join(', ')}
                </div>
              )}

              <div className="border border-gray-200 rounded-lg bg-gray-50 p-2 overflow-y-auto" style={{ height: '280px' }}>
                {filteredCountries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p className="text-sm">No countries match "{countrySearch}"</p>
                    <button onClick={() => setCountrySearch('')} className="text-xs text-purple-600 hover:text-purple-700 mt-2">
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredCountries.map(country => (
                      <label
                        key={country}
                        className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${
                          countryFilters.includes(country) ? 'bg-purple-100 hover:bg-purple-200' : 'hover:bg-purple-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={countryFilters.includes(country)}
                          onChange={() => toggleCountry(country)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                        />
                        <span className={`text-sm ${
                          countryFilters.includes(country) ? 'text-purple-900 font-medium' : 'text-gray-700'
                        }`}>
                          {country}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-b my-6"></div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 text-sm">Search Filters</h4>
              {activeBooleanFilterCount > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {activeBooleanFilterCount} active
                </span>
              )}
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search filters..."
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No filters match "{searchFilter}"</p>
                  {searchFilter && (
                    <button onClick={() => setSearchFilter('')} className="text-xs text-purple-600 hover:text-purple-700 mt-2">
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
                          className="w-4 h-4 text-gray-400 border-gray-300 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900">Any</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={option.field}
                          checked={filters[option.field] === true}
                          onChange={() => handleFilterChange(option.field, true)}
                          className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-900 font-medium group-hover:text-green-600">Include</span>
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

        <div className="border-t p-4 bg-white flex-shrink-0 flex items-center gap-3">
          <button
            onClick={clearAllFilters}
            className="flex-1 px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition-all"
          >
            Clear All Filters
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default ClientReportViewPage;