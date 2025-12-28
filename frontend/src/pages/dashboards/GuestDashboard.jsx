import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Database, Search, SlidersHorizontal, BarChart3, TrendingUp, Users, X,
  Lock, Sparkles, ArrowRight, LogOut, Maximize, Minimize, CheckCircle, MinusCircle,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useRecords, useFilterOptions } from '../../hooks/useDatabase';
import api from '../../utils/api';
import CompanyFilterSidebar from '../../components/database/CompanyFilterSidebar';
import Pagination from '../../components/database/Pagination';

// Fields that should be blurred for guests
const BLURRED_FIELDS = [
  'company_name', 'address_1', 'address_2', 'address_3', 'address_4', 'region',
  'country', 'geographical_coverage', 'phone_number', 'company_email', 'website',
  'accreditation', 'parent_company', 'title_1', 'initials_1', 'surname_1',
  'position_1', 'title_2', 'initials_2', 'surname_2', 'position_2', 'title_3',
  'initials_3', 'surname_3', 'position_3', 'title_4', 'initials_4', 'surname_4',
  'position_4'
];

// Guest Data Table Component - Same as DataTable but with blurred fields
const GuestDataTable = ({ data, onRowClick, onSort, currentSort }) => {
  if (data.length === 0 || !data[0].display_fields) {
    return null;
  }

  const { display_fields, field_labels } = data[0];
  const baseFields = ['company_name', 'category'];
  const dynamicColumns = display_fields.filter(field => !baseFields.includes(field));

  const getSortState = (columnId) => {
    if (currentSort === columnId) return 'asc';
    if (currentSort === `-${columnId}`) return 'desc';
    return false;
  };

  const handleSort = (columnId) => {
    const currentState = getSortState(columnId);
    let newSort = '';
    if (currentState === false) {
      newSort = columnId;
    } else if (currentState === 'asc') {
      newSort = `-${columnId}`;
    } else {
      newSort = '';
    }
    onSort?.(newSort);
  };

  const renderCellValue = (record, field) => {
    const value = record[field];

    if (BLURRED_FIELDS.includes(field)) {
      // Show actual value but blurred
      const displayValue = value || 'N/A';
      return (
        <div className="relative inline-flex items-center gap-2">
          <Lock className="w-3 h-3 text-gray-400 relative z-10" />
          <span className="relative">
            <span className="blur-sm select-none text-gray-600">{displayValue}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"></span>
          </span>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return value
        ? <CheckCircle className="w-5 h-5 text-green-500" />
        : <MinusCircle className="w-5 h-5 text-red-500" />;
    }

    if (field === 'last_updated' && value) {
      return new Date(value).toLocaleDateString();
    }

    return value || '-';
  };

  const ChevronUp = () => <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
  const ChevronDown = () => <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  const ChevronsUpDown = () => <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;

  return (
    <div className="relative border rounded-lg overflow-auto" style={{ height: '70vh' }}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th
              className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
              style={{ minWidth: '300px' }}
              onClick={() => handleSort('company_name')}
            >
              <div className="flex items-center gap-2">
                Company Name
                {getSortState('company_name') === 'asc' ? <ChevronUp /> : getSortState('company_name') === 'desc' ? <ChevronDown /> : <ChevronsUpDown />}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              style={{ width: '180px' }}
              onClick={() => handleSort('category')}
            >
              <div className="flex items-center gap-2">
                Category
                {getSortState('category') === 'asc' ? <ChevronUp /> : getSortState('category') === 'desc' ? <ChevronDown /> : <ChevronsUpDown />}
              </div>
            </th>
            {dynamicColumns.map(field => (
              <th
                key={field}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                style={{ minWidth: '170px' }}
                onClick={() => handleSort(field)}
              >
                <div className="flex items-center gap-2">
                  {field_labels[field] || field.replace(/_/g, ' ')}
                  {getSortState(field) === 'asc' ? <ChevronUp /> : getSortState(field) === 'desc' ? <ChevronDown /> : <ChevronsUpDown />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((record, index) => (
            <tr
              key={record.factory_id}
              className={`transition-colors ${
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              } hover:bg-gray-100 cursor-pointer`}
              onClick={() => onRowClick(record)}
            >
              <td className={`sticky left-0 ${
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              } px-6 py-4 whitespace-nowrap z-10 border-r border-gray-200`}>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <div className="relative">
                    <span className="blur-sm select-none text-gray-600 font-medium">
                      {record.company_name || 'Company Name'}
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {record.get_category_display || record.category}
                </span>
              </td>
              {dynamicColumns.map(field => (
                <td
                  key={field}
                  className="px-6 py-4 whitespace-nowrap text-sm"
                >
                  {renderCellValue(record, field)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const GuestDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState(new Set(['ALL']));
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ordering, setOrdering] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

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
  }, [selectedCategories]);

  // Fetch other stats when filters change
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const params = new URLSearchParams();
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
        Object.keys(filters).forEach(key => {
          if (filters[key] === true) {
            params.append(key, 'true');
          } else if (filters[key] === false) {
            params.append(key, 'false');
          }
        });
        const response = await api.get(`/api/database-stats/?${params.toString()}`);
        setStats(prev => ({
          ...prev,
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

    const categoriesParam = selectedCategories.has('ALL')
      ? 'ALL'
      : Array.from(selectedCategories).join(',');

    const { data: recordsData, isLoading } = useRecords({
      categories: categoriesParam,
    search: searchQuery,
    page: currentPage,
    page_size: pageSize,
    ordering: ordering,
    countries: countryFilters.join(','),
    ...filters,
  });

    const filterOptionsCategory = selectedCategories.size === 1 && !selectedCategories.has('ALL')
      ? Array.from(selectedCategories)[0]
      : 'ALL';

    const { data: filterOptions = [] } = useFilterOptions(filterOptionsCategory);

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

    const categoryFilterCount = selectedCategories.has('ALL') ? 0 : selectedCategories.size;
    const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length + categoryFilterCount;

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    }
    return user?.username?.[0].toUpperCase() || 'G';
  };

  const sidebarWidth = isSidebarCollapsed && !isSidebarHovered ? 'w-20' : 'w-64';
  const showContent = !isSidebarCollapsed || isSidebarHovered;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Collapsible with Hover */}
      <aside
        className={`${sidebarWidth} flex flex-col shadow-2xl bg-gradient-to-b from-gray-800 to-gray-900 text-white transition-all duration-300 ease-in-out relative`}
        onMouseEnter={() => isSidebarCollapsed && setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {/* Collapse Toggle Button - New Design */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-4 top-20 z-50 group"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full group-hover:bg-indigo-500/40 transition-all"></div>

            {/* Main button */}
            <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-200">
              {/* Animated chevron */}
              <div className="transform transition-transform duration-300 group-hover:scale-125">
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-white" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Pulse ring on hover */}
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400 opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500"></div>
            </div>
          </div>
        </button>

        <div className="p-6 border-b border-gray-700">
          {!showContent ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-sm font-bold shadow-lg transition-all">
                {getUserInitials()}
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center text-center transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-lg font-bold shadow-lg ring-4 ring-orange-500/20 transition-all">
                  {getUserInitials()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{user?.full_name || user?.username || 'Guest'}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-1 justify-center">
                  <Lock className="w-3 h-3" />
                  Guest Access
                </p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 overflow-hidden">
          {showContent && (
            <p className={`px-3 text-xs font-semibold uppercase tracking-wider mb-3 text-gray-500 transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              Database
            </p>
          )}
          <div className="space-y-1">
            <div
              className={`w-full flex items-center ${!showContent ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700`}
              title={!showContent ? 'Superdatabase' : ''}
            >
              <Database className="w-5 h-5 flex-shrink-0" />
              {showContent && (
                <span className={`font-medium transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                  Superdatabase
                </span>
              )}
            </div>
          </div>

          {showContent && (
            <div className={`mt-6 p-4 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl transition-all duration-300 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <h4 className="font-bold text-sm">Upgrade Now</h4>
              </div>
              <p className="text-xs mb-3 text-white/90">
                Unlock contact details and export features
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full px-3 py-2 bg-white text-orange-600 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                View Plans
              </button>
            </div>
          )}

          {!showContent && (
            <div className="mt-6">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 transition-all flex items-center justify-center hover:scale-105"
                title="Upgrade Now"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={toggleFullscreen}
            className={`w-full flex items-center ${!showContent ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-gray-800 hover:text-white hover:scale-105`}
            title={!showContent ? (isFullscreen ? 'Exit Fullscreen' : 'Fullscreen') : ''}
          >
            {isFullscreen ? <Minimize className="w-5 h-5 flex-shrink-0" /> : <Maximize className="w-5 h-5 flex-shrink-0" />}
            {showContent && (
              <span className={`font-medium transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </span>
            )}
          </button>
          <button
            onClick={logout}
            className={`w-full flex items-center ${!showContent ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-red-600/10 hover:text-red-400 hover:scale-105`}
            title={!showContent ? 'Log Out' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {showContent && (
              <span className={`font-medium transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                Log Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content - Same as Superdatabase */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-8 h-8" />
                <h1 className="text-2xl font-bold">Superdatabase</h1>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  GUEST ACCESS
                </span>
              </div>
              <p className="text-indigo-100 text-sm">Browse all records • Contact details hidden</p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Upgrade for Contact Access
            </button>
          </div>
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
                      <p className="text-xs text-orange-600 font-medium">Access Level</p>
                      <p className="text-xl font-bold text-orange-900 flex items-center gap-1">
                        <Lock className="w-4 h-4" />
                        Guest
                      </p>
                    </div>
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

            {/* Multi-Select Category Filter with Checkboxes */}
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
                          newSelected.delete('ALL');

                          if (e.target.checked) {
                            newSelected.add(category.value);
                          } else {
                            newSelected.delete(category.value);
                          }

                          if (newSelected.size === 0) {
                            newSelected.add('ALL');
                          }

                          setSelectedCategories(newSelected);
                          setCurrentPage(1);
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

            {/* Search */}
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
                  placeholder="Search by company name, region..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters */}
            {(Object.keys(filters).length > 0 || countryFilters.length > 0) && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  <button
                    onClick={() => {
                      setFilters({});
                      setCountryFilters([]);
                      setSelectedCategories(new Set(['ALL']));
                      setCurrentPage(1);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
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

            {/* Data Table */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No results found</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden mb-4">
                  <GuestDataTable
                    data={records}
                    onRowClick={(record) => setSelectedRecord(record)}
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
      </main>

      {/* Filter Sidebar */}
      <CompanyFilterSidebar
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filterGroups={[]}
        filterOptions={filterOptions}
        technicalFilterOptions={[]}
        statusFilters={['COMPLETE']}
        onStatusFilterChange={() => {}}
        countryFilters={countryFilters}
        onCountryFilterChange={setCountryFilters}
        allCountries={stats.allCountries}
        categoryFilters={Array.from(selectedCategories).filter(c => c !== 'ALL')}
        onCategoryFilterChange={(cats) => {
          if (cats.length === 0) {
            setSelectedCategories(new Set(['ALL']));
          } else {
            setSelectedCategories(new Set(cats));
          }
          setCurrentPage(1);
        }}
        availableCategories={CATEGORIES.filter(c => c.value !== 'ALL').map(c => c.value)}
        onApply={(filterGroups) => {
          // Extract filters from first group
          const newFilters = filterGroups.length > 0 ? filterGroups[0].filters : {};
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        onReset={() => {
          setFilters({});
          setCountryFilters([]);
          setSelectedCategories(new Set(['ALL']));
          setCurrentPage(1);
        }}
      />

      {/* Record Detail Modal */}
      {selectedRecord && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedRecord(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6" />
                    <div>
                      <h2 className="text-xl font-bold">Limited Preview</h2>
                      <p className="text-sm text-indigo-100">Contact details hidden</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Guest Access:</strong> Contact information and company details are hidden. Upgrade to view full details.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Information</h3>
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Company Name</dt>
                      <dd className="text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div className="relative">
                          <span className="blur-sm select-none text-gray-600">
                            {selectedRecord.company_name || 'Company Name'}
                          </span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                        </div>
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Address</dt>
                      <dd className="text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div className="relative">
                          <span className="blur-sm select-none text-gray-600">
                            {selectedRecord.address_1 || 'Address Information'}
                          </span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                        </div>
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Phone</dt>
                      <dd className="text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div className="relative">
                          <span className="blur-sm select-none text-gray-600">
                            {selectedRecord.phone_number || '+XX XXX XXX XXXX'}
                          </span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                        </div>
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Email</dt>
                      <dd className="text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div className="relative">
                          <span className="blur-sm select-none text-gray-600">
                            {selectedRecord.company_email || 'contact@company.com'}
                          </span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                        </div>
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Website</dt>
                      <dd className="text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div className="relative">
                          <span className="blur-sm select-none text-gray-600">
                            {selectedRecord.website || 'www.company.com'}
                          </span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                        </div>
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Category</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedRecord.get_category_display || selectedRecord.category}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Last Updated</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedRecord.last_updated ? new Date(selectedRecord.last_updated).toLocaleDateString() : '-'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-pink-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Unlock Full Details</h3>
                  </div>
                  <p className="text-sm text-white/90 mb-4">
                    Get access to complete company information including:
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      Full contact details (phone, email, website)
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      Complete address information
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      Key personnel and contacts
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      Export capabilities
                    </li>
                  </ul>
                  <button
                    onClick={() => {
                      setSelectedRecord(null);
                      setShowUpgradeModal(true);
                    }}
                    className="w-full px-4 py-3 bg-white text-orange-600 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                  >
                    View Upgrade Options
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpgradeModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-pink-600 text-white p-6 rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Upgrade to Premium</h2>
                    <p className="text-sm text-white/90">Unlock unlimited access to our complete database</p>
                  </div>
                  <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">What You're Missing</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border-2 border-gray-200 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-5 h-5 text-gray-400" />
                        <h4 className="font-bold text-gray-900">Guest Access</h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">Current</span>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>Contact details hidden</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>Company addresses blurred</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>No export capability</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>No direct contact information</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>Limited access level</span>
                        </li>
                      </ul>
                    </div>

                    <div className="border-2 border-orange-500 rounded-xl p-6 bg-gradient-to-br from-orange-50 to-pink-50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16"></div>
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-5 h-5 text-orange-600" />
                          <h4 className="font-bold text-gray-900">Premium Access</h4>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">Recommended</span>
                        </div>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-2 text-sm text-gray-900 font-medium">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span>Full company contact details</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm text-gray-900 font-medium">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span>Complete address information</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm text-gray-900 font-medium">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span>Export to CSV/Excel</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm text-gray-900 font-medium">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span>Regular database updates</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm text-gray-900 font-medium">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span>Priority support</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Contact us to learn more about our premium subscription plans
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <a
                      href="mailto:sales@zeugma.com"
                      className="px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl font-bold hover:from-orange-600 hover:to-pink-700 transition-all shadow-lg flex items-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Contact Sales
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        /* CSS blur effect for privacy */
        .blur-sm {
          filter: blur(4px);
          -webkit-filter: blur(4px);
          user-select: none;
          pointer-events: none;
        }

        /* Prevent text selection on blurred content */
        .select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default GuestDashboard;