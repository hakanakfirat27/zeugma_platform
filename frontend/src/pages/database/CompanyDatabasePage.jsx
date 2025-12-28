// frontend/src/pages/database/CompanyDatabasePage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Building2, Search, Plus, ChevronDown, ChevronUp,
  Download, Trash2, BarChart3, TrendingUp, Users, SlidersHorizontal, X, Upload, FileText, Hash
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/database/Pagination';
import CompanyFilterSidebar from '../../components/database/CompanyFilterSidebar';
import ImportCompaniesModal from '../../components/database/ImportCompaniesModal';
import companyService from '../../services/companyService';
import { useFilterOptions, useTechnicalFilterOptions } from '../../hooks/useDatabase';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { CATEGORIES } from '../../constants/categories';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Category badge colors
const CATEGORY_COLORS = {
  INJECTION: 'bg-blue-100 text-blue-800',
  BLOW: 'bg-green-100 text-green-800',
  ROTO: 'bg-orange-100 text-orange-800',
  PE_FILM: 'bg-purple-100 text-purple-800',
  SHEET: 'bg-cyan-100 text-cyan-800',
  PIPE: 'bg-red-100 text-red-800',
  TUBE_HOSE: 'bg-amber-100 text-amber-800',
  PROFILE: 'bg-gray-100 text-gray-800',
  CABLE: 'bg-pink-100 text-pink-800',
  COMPOUNDER: 'bg-indigo-100 text-indigo-800',
  RECYCLER: 'bg-lime-100 text-lime-800'
};

const CATEGORY_DISPLAY = {
  INJECTION: 'Injection Moulders',
  BLOW: 'Blow Moulders',
  ROTO: 'Roto Moulders',
  PE_FILM: 'PE Film Extruders',
  SHEET: 'Sheet Extruders',
  PIPE: 'Pipe Extruders',
  TUBE_HOSE: 'Tube & Hose Extruders',
  PROFILE: 'Profile Extruders',
  CABLE: 'Cable Extruders',
  COMPOUNDER: 'Compounders',
  RECYCLER: 'Recyclers'
};

const STATUS_COLORS = {
  COMPLETE: 'bg-green-100 text-green-800 border-green-300',
  INCOMPLETE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  DELETED: 'bg-red-100 text-red-800 border-red-300',
  NONE: 'bg-gray-100 text-gray-800 border-gray-300'
};

const STATUS_DISPLAY = {
  COMPLETE: 'Complete',
  INCOMPLETE: 'Incomplete',
  DELETED: 'Deleted',
  NONE: 'None'
};

const CompanyDatabasePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [ordering, setOrdering] = useState('-updated_at');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filters - with debounced search
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);
  
  // Default to ALL statuses so all companies are shown
  const ALL_STATUSES = ['COMPLETE', 'INCOMPLETE', 'DELETED', 'NONE'];
  const [statusFilters, setStatusFilters] = useState(
    searchParams.get('status')?.split(',').filter(Boolean) || ALL_STATUSES
  );
  const [categoryFilters, setCategoryFilters] = useState(
    searchParams.get('category')?.split(',').filter(Boolean) || []
  );
  const [countryFilters, setCountryFilters] = useState(
    searchParams.get('country')?.split(',').filter(Boolean) || []
  );
  const [filterGroups, setFilterGroups] = useState([]);

  // Statistics - now filtered
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Available countries for filter (unfiltered - all countries)
  const [allCountries, setAllCountries] = useState([]);
  
  // Available categories with companies (unfiltered)
  const [categoriesWithCompanies, setCategoriesWithCompanies] = useState([]);

  // Get filter options for material/boolean filters
  const filterOptionsCategory = categoryFilters.length === 1 ? categoryFilters[0] : 'ALL';
  const { data: filterOptions = [] } = useFilterOptions(filterOptionsCategory);
  const { data: technicalFilterOptions = [] } = useTechnicalFilterOptions(filterOptionsCategory);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilters.length > 0) params.status = statusFilters.join(',');
      if (categoryFilters.length > 0) params.category = categoryFilters.join(',');
      if (countryFilters.length > 0) params.country = countryFilters.join(',');
      
      // Add filter groups (material and technical filters) - CRITICAL for filtering to work!
      if (filterGroups.length > 0) {
        params.filter_groups = JSON.stringify(filterGroups);
      }

      const response = await companyService.getCompanies(params);

      setCompanies(response.results || []);
      setTotalCount(response.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load companies');
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilters, categoryFilters, countryFilters, filterGroups, ordering]);

  // Fetch statistics with current filters applied
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = {};
      
      // Apply same filters as company list
      if (statusFilters.length > 0) params.status = statusFilters.join(',');
      if (categoryFilters.length > 0) params.category = categoryFilters.join(',');
      if (countryFilters.length > 0) params.country = countryFilters.join(',');
      if (debouncedSearch) params.search = debouncedSearch;
      
      // Add filter groups
      if (filterGroups.length > 0) {
        params.filter_groups = JSON.stringify(filterGroups);
      }
      
      const data = await companyService.getStats(params);
      setStats(data);
      
      // Extract unique countries from stats (unfiltered for sidebar)
      if (data.by_country && allCountries.length === 0) {
        const countries = data.by_country.map(c => c.country).filter(Boolean).sort();
        setAllCountries(countries);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [statusFilters, categoryFilters, countryFilters, debouncedSearch, filterGroups]);

  // Fetch all countries and categories once (unfiltered) for the sidebar
  const fetchUnfilteredData = async () => {
    try {
      const data = await companyService.getStats({});
      if (data.by_country) {
        const countries = data.by_country.map(c => c.country).filter(Boolean).sort();
        setAllCountries(countries);
      }
      if (data.by_category) {
        // Only include categories with at least 1 company
        const categories = data.by_category
          .filter(cat => cat.count > 0)
          .map(cat => cat.category);
        setCategoriesWithCompanies(categories);
      }
    } catch (err) {
      console.error('Error fetching unfiltered data:', err);
    }
  };

  // Effects
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch all countries and categories once on mount (unfiltered)
  useEffect(() => {
    fetchUnfilteredData();
  }, []);

  // Reset to page 1 when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilters.length > 0 && statusFilters.length < 3) params.set('status', statusFilters.join(','));
    if (categoryFilters.length > 0) params.set('category', categoryFilters.join(','));
    if (countryFilters.length > 0) params.set('country', countryFilters.join(','));
    setSearchParams(params);
  }, [debouncedSearch, statusFilters, categoryFilters, countryFilters, setSearchParams]);

  // Handlers
  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      setOrdering(field);
    }
  };

  const toggleRecordSelection = (companyId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    if (selectedRecords.size === companies.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(companies.map(c => c.company_id)));
    }
  };

  const handleStatusFilterChange = (newFilters) => {
    setStatusFilters(newFilters);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (newFilters) => {
    setCategoryFilters(newFilters);
    setCurrentPage(1);
  };

  const handleCountryFilterChange = (newFilters) => {
    setCountryFilters(newFilters);
    setCurrentPage(1);
  };

  const handleFilterGroupsApply = (groups) => {
    setFilterGroups(groups);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilters(ALL_STATUSES);  // Reset to default (all statuses)
    setCategoryFilters([]);
    setCountryFilters([]);
    setSearchInput('');
    setFilterGroups([]);
    setCurrentPage(1);
  };

  // Handle Create Report - Navigate to Company Reports page
  const handleCreateReport = () => {
    const filterCriteria = {};

    // Add status filters
    if (statusFilters.length > 0 && statusFilters.length < 3) {
      filterCriteria.status = statusFilters;
    }

    if (categoryFilters.length > 0) {
      filterCriteria.categories = categoryFilters.length === 1
        ? categoryFilters[0]
        : categoryFilters;
    }

    if (countryFilters.length > 0) {
      filterCriteria.country = countryFilters;
    }

    if (filterGroups.length > 0) {
      filterCriteria.filter_groups = filterGroups;
    }

    console.log('🚀 Navigating to Create Company Report with filters:', filterCriteria);
    console.log('📊 Total records:', totalCount);

    // Navigate to company-reports/create instead of custom-reports/create
    navigate('/company-reports/create', {
      state: {
        filterCriteria: filterCriteria,
        recordCount: totalCount,
      }
    });
  };

  // Handle Import Complete
  const handleImportComplete = (result) => {
    // Refresh data after import
    fetchCompanies();
    fetchStats();
    fetchUnfilteredData();
  };

  // Count active filters
  const groupFilterCount = filterGroups.reduce((sum, group) => {
    const booleanFilters = Object.keys(group.filters || {}).length;
    const techFilters = Object.keys(group.technicalFilters || {}).length;
    return sum + booleanFilters + techFilters;
  }, 0);

  // Check if status differs from default (all statuses selected)
  const isStatusNonDefault = statusFilters.length !== ALL_STATUSES.length;

  const activeFiltersCount = 
    categoryFilters.length + 
    countryFilters.length + 
    groupFilterCount +
    (isStatusNonDefault ? statusFilters.length : 0) +
    (debouncedSearch ? 1 : 0);

  // Check if any filters are active (for showing the Active Filters section)
  const hasActiveFilters = filterGroups.length > 0 || 
    countryFilters.length > 0 || 
    categoryFilters.length > 0 ||
    isStatusNonDefault ||
    debouncedSearch;

  // Available categories - only show categories that have at least 1 company (from unfiltered data)
  const availableCategories = useMemo(() => {
    if (categoriesWithCompanies.length > 0) {
      return categoriesWithCompanies;
    }
    // Fallback to all categories if not loaded yet
    return Object.keys(CATEGORY_DISPLAY);
  }, [categoriesWithCompanies]);

  // Get unique countries count from filtered stats
  const uniqueCountriesCount = stats?.countries_count || 0;

  // Get top countries from filtered stats
  const topCountries = stats?.by_country?.slice(0, 3) || [];

  // Sort icon helper
  const SortIcon = ({ field }) => {
    if (ordering === field) return <ChevronUp className="w-4 h-4 text-emerald-600" />;
    if (ordering === `-${field}`) return <ChevronDown className="w-4 h-4 text-emerald-600" />;
    return <ChevronDown className="w-4 h-4 text-gray-300" />;
  };

  return (
    <DashboardLayout
      pageTitle="Company Database"
      pageSubtitleBottom="Manage companies and their production capabilities"
      breadcrumbs={breadcrumbs}
    >
      <div className="flex-1 overflow-auto bg-white">
        <div className="px-6 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm"
              >
                <BarChart3 className="w-4 h-4" />
                {showStats ? 'Hide' : 'Show'} Stats
              </button>

              <button
                onClick={() => setShowFilterSidebar(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm"
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
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 shadow-md transition-all text-sm"
                  title="Create custom report from current filters"
                >
                  <FileText className="w-4 h-4" />
                  Create Report from Filters
                  {totalCount > 0 && (
                    <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                      {totalCount.toLocaleString()} records
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                Import Companies
              </button>

              <button
                onClick={() => navigate('/company-database/new')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Company
              </button>
            </div>
          </div>

          {/* Stats Dashboard - 7 columns */}
          {showStats && (
            <div className="grid grid-cols-7 gap-3 mb-6">
              {/* Total Records */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Records</p>
                    <p className="text-xl font-bold text-blue-900">
                      {statsLoading ? '...' : (stats?.total_companies?.toLocaleString() || 0)}
                    </p>
                  </div>
                  <BarChart3 className="w-6 h-6 text-blue-600 opacity-75" />
                </div>
              </div>

              {/* Countries */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Countries</p>
                    <p className="text-xl font-bold text-green-900">
                      {statsLoading ? '...' : uniqueCountriesCount}
                    </p>
                    <p className="text-xs text-green-600">Unique</p>
                  </div>
                  <Users className="w-6 h-6 text-green-600 opacity-75" />
                </div>
              </div>

              {/* Complete Sites */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Complete</p>
                    <p className="text-xl font-bold text-emerald-900">
                      {statsLoading ? '...' : (stats?.by_status?.complete?.toLocaleString() || 0)}
                    </p>
                    <p className="text-xs text-emerald-600">Sites</p>
                  </div>
                  <div className="w-6 h-6 text-emerald-600 opacity-75 flex items-center justify-center text-lg">✓</div>
                </div>
              </div>

              {/* Incomplete Sites */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Incomplete</p>
                    <p className="text-xl font-bold text-amber-900">
                      {statsLoading ? '...' : (stats?.by_status?.incomplete?.toLocaleString() || 0)}
                    </p>
                    <p className="text-xs text-amber-600">Sites</p>
                  </div>
                  <div className="w-6 h-6 text-amber-600 opacity-75 flex items-center justify-center text-lg">⏳</div>
                </div>
              </div>

              {/* Deleted Sites */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-medium">Deleted</p>
                    <p className="text-xl font-bold text-red-900">
                      {statsLoading ? '...' : (stats?.by_status?.deleted?.toLocaleString() || 0)}
                    </p>
                    <p className="text-xs text-red-600">Sites</p>
                  </div>
                  <div className="w-6 h-6 text-red-600 opacity-75 flex items-center justify-center text-lg">🗑</div>
                </div>
              </div>

              {/* Multi-Category Sites */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Multi-Category</p>
                    <p className="text-xl font-bold text-purple-900">
                      {statsLoading ? '...' : (stats?.multi_category_companies?.toLocaleString() || 0)}
                    </p>
                    <p className="text-xs text-purple-600">Sites</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-purple-600 opacity-75" />
                </div>
              </div>

              {/* Top Countries */}
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 border border-pink-200">
                <div>
                  <p className="text-xs text-pink-600 font-medium mb-1">Top Countries</p>
                  <div className="space-y-0.5">
                    {statsLoading ? (
                      <p className="text-xs text-pink-600">Loading...</p>
                    ) : (
                      topCountries.map((country) => (
                        <div key={country.country} className="flex items-center justify-between text-xs">
                          <span className="text-pink-900 truncate max-w-[80px]" title={country.country}>
                            {country.country}
                          </span>
                          <span className="text-pink-700 font-medium">{country.count}</span>
                        </div>
                      ))
                    )}
                    {!statsLoading && topCountries.length === 0 && (
                      <p className="text-xs text-pink-600">No data</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar with debounce */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by company name..."
                className="w-full pl-10 pr-10 py-3 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Section */}
          {hasActiveFilters && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Status Filter Chips */}
                {statusFilters.map(status => (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                      status === 'COMPLETE' ? 'bg-green-100 text-green-800 border-green-300' :
                      status === 'INCOMPLETE' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {STATUS_DISPLAY[status] || status}
                    <button
                      onClick={() => {
                        const newFilters = statusFilters.filter(s => s !== status);
                        if (newFilters.length > 0) {
                          setStatusFilters(newFilters);
                        }
                        setCurrentPage(1);
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}

                {/* Search chip */}
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-sm font-medium">
                    Search: "{debouncedSearch}"
                    <button
                      onClick={() => setSearchInput('')}
                      className="hover:opacity-70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}

                {/* Category Filter Chips - Purple with 📁 icon */}
                {categoryFilters.map(categoryValue => {
                  const cat = CATEGORIES.find(c => c.value === categoryValue);
                  return (
                    <span
                      key={categoryValue}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-sm font-medium"
                    >
                      📁 {cat?.label || CATEGORY_DISPLAY[categoryValue] || categoryValue}
                      <button
                        onClick={() => {
                          setCategoryFilters(categoryFilters.filter(c => c !== categoryValue));
                          setCurrentPage(1);
                        }}
                        className="hover:opacity-70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  );
                })}

                {/* Filter Group Chips - with Group Label */}
                {filterGroups.map((group, groupIndex) => (
                  <div key={group.id} className="inline-flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {group.name}:
                    </span>

                    {/* Boolean Filters - Green/Red */}
                    {Object.entries(group.filters || {}).map(([field, value]) => {
                      const option = filterOptions.find(opt => opt.field === field);
                      return (
                        <span
                          key={field}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                            value === true
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {option?.label || field.replace(/_/g, ' ')}: {value ? 'Include' : 'Exclude'}
                          <button
                            onClick={() => {
                              const newGroups = filterGroups.map((g, idx) => {
                                if (idx !== groupIndex) return g;
                                const newFilters = { ...g.filters };
                                delete newFilters[field];
                                return { ...g, filters: newFilters };
                              }).filter(g => Object.keys(g.filters || {}).length > 0 || Object.keys(g.technicalFilters || {}).length > 0);
                              setFilterGroups(newGroups);
                              setCurrentPage(1);
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}

                    {/* Technical Filters - Blue with 📊 icon */}
                    {Object.entries(group.technicalFilters || {}).map(([field, filterConfig]) => {
                      // Skip empty filters
                      if (filterConfig.mode === 'equals' && (!filterConfig.equals || filterConfig.equals === '')) {
                        return null;
                      }
                      if (filterConfig.mode === 'range' &&
                          (!filterConfig.min || filterConfig.min === '') &&
                          (!filterConfig.max || filterConfig.max === '')) {
                        return null;
                      }

                      const option = technicalFilterOptions.find(opt => opt.field === field);
                      const label = option?.label || field.replace(/_/g, ' ');

                      // Format the filter display
                      let displayValue = '';
                      if (filterConfig.mode === 'equals') {
                        displayValue = `= ${filterConfig.equals}`;
                      } else {
                        const min = filterConfig.min || '∞';
                        const max = filterConfig.max || '∞';
                        displayValue = `${min} - ${max}`;
                      }

                      return (
                        <span
                          key={field}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-sm font-medium"
                        >
                          📊 {label}: {displayValue}
                          <button
                            onClick={() => {
                              const newGroups = filterGroups.map((g, idx) => {
                                if (idx !== groupIndex) return g;
                                const newTechnicalFilters = { ...g.technicalFilters };
                                delete newTechnicalFilters[field];
                                return { ...g, technicalFilters: newTechnicalFilters };
                              }).filter(g => Object.keys(g.filters || {}).length > 0 || Object.keys(g.technicalFilters || {}).length > 0);
                              setFilterGroups(newGroups);
                              setCurrentPage(1);
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}

                {/* Country Filters - Purple styling */}
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

              {/* Active Results Summary Section */}
              <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-lg">📊</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <span>Active Results Summary</span>
                      <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-normal">
                        Live
                      </span>
                    </h4>

                    {/* VERTICAL LAYOUT - Each section on its own line */}
                    <div className="text-sm text-indigo-800 leading-relaxed space-y-1">
                      {(() => {
                        const sections = [];

                        // 0. Build Company Status Section
                        const statusNames = statusFilters.map(s => STATUS_DISPLAY[s] || s).join(', ');
                        sections.push(
                          <div key="status">
                            <strong>Company Status:</strong> {statusNames}
                          </div>
                        );

                        // 1. Build Category Section
                        if (categoryFilters.length > 0) {
                          const categoryNames = categoryFilters
                            .map(val => {
                              const cat = CATEGORIES.find(c => c.value === val);
                              return cat?.label || CATEGORY_DISPLAY[val] || val;
                            })
                            .join(', ');
                          sections.push(
                            <div key="categories">
                              <strong>Category:</strong> {categoryNames}
                            </div>
                          );
                        } else {
                          sections.push(
                            <div key="categories">
                              <strong>Category:</strong> All Categories
                            </div>
                          );
                        }

                        // 2. Build Country Section
                        if (countryFilters.length > 0) {
                          sections.push(
                            <div key="countries">
                              <strong>Country:</strong> {countryFilters.join(', ')}
                            </div>
                          );
                        }

                        // 3. Build Material Filter Groups Section
                        // OR logic WITHIN a group, AND logic BETWEEN groups
                        if (filterGroups.some(group => Object.keys(group.filters || {}).length > 0)) {
                          const groupDescriptions = filterGroups
                            .filter(group => Object.keys(group.filters || {}).length > 0)
                            .map((group) => {
                              const filters = Object.entries(group.filters || {}).map(([field, value]) => {
                                const option = filterOptions.find(opt => opt.field === field);
                                const label = option?.label || field.replace(/_/g, ' ');
                                const action = value
                                  ? '<span class="text-green-700 font-semibold">Include</span>'
                                  : '<span class="text-red-700 font-semibold">Exclude</span>';
                                return `(${label}: ${action})`;
                              });

                              if (filters.length === 0) return '';
                              if (filters.length === 1) return filters[0];
                              // OR logic within the same group
                              return filters.join(' <strong>or</strong> ');
                            }).filter(Boolean);

                          if (groupDescriptions.length > 0) {
                            // AND logic between different groups
                            const filterText = groupDescriptions.length === 1
                              ? groupDescriptions[0]
                              : groupDescriptions.join(' <strong>and</strong> ');
                            sections.push(
                              <div key="materialFilters" dangerouslySetInnerHTML={{ __html: `<strong>Material Filters:</strong> ${filterText}` }} />
                            );
                          }
                        }

                        // 4. Build Technical Filter Groups Section
                        // OR logic WITHIN a group, AND logic BETWEEN groups
                        if (filterGroups.some(group => Object.keys(group.technicalFilters || {}).length > 0)) {
                          const groupDescriptions = filterGroups
                            .filter(group => Object.keys(group.technicalFilters || {}).length > 0)
                            .map((group) => {
                              const filters = Object.entries(group.technicalFilters || {})
                                .filter(([field, filterConfig]) => {
                                  if (filterConfig.mode === 'equals') {
                                    return filterConfig.equals !== '' && filterConfig.equals !== undefined;
                                  } else {
                                    return (filterConfig.min !== '' && filterConfig.min !== undefined) ||
                                           (filterConfig.max !== '' && filterConfig.max !== undefined);
                                  }
                                })
                                .map(([field, filterConfig]) => {
                                  const option = technicalFilterOptions.find(opt => opt.field === field);
                                  const label = option?.label || field.replace(/_/g, ' ');

                                  let displayValue = '';
                                  if (filterConfig.mode === 'equals') {
                                    displayValue = `= ${filterConfig.equals}`;
                                  } else {
                                    const min = filterConfig.min || '∞';
                                    const max = filterConfig.max || '∞';
                                    displayValue = `${min} - ${max}`;
                                  }

                                  return `(${label}: ${displayValue})`;
                                });

                              if (filters.length === 0) return '';
                              if (filters.length === 1) return filters[0];
                              // OR logic within the same group
                              return filters.join(' <strong>or</strong> ');
                            }).filter(Boolean);

                          if (groupDescriptions.length > 0) {
                            // AND logic between different groups
                            const filterText = groupDescriptions.length === 1
                              ? groupDescriptions[0]
                              : groupDescriptions.join(' <strong>and</strong> ');
                            sections.push(
                              <div key="technicalFilters" dangerouslySetInnerHTML={{ __html: `<strong>Technical Filters:</strong> ${filterText}` }} />
                            );
                          }
                        }

                        return sections;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                {totalCount.toLocaleString()} companies has been found
              </span>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedRecords.size > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-6 py-3 flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-indigo-900">
                {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Data Table with scroll */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No companies found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                <div className="max-h-[500px] overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="w-12 px-4 py-3 bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedRecords.size === companies.length && companies.length > 0}
                            onChange={selectAllRecords}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                          onClick={() => handleSort('company_name')}
                        >
                          <div className="flex items-center gap-1">
                            Company Name
                            <SortIcon field="company_name" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                          onClick={() => handleSort('country')}
                        >
                          <div className="flex items-center gap-1">
                            Country
                            <SortIcon field="country" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                          onClick={() => handleSort('project_code')}
                        >
                          <div className="flex items-center gap-1">
                            Project
                            <SortIcon field="project_code" />
                          </div>
                        </th>                        
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                          Categories
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                          Status
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                          onClick={() => handleSort('updated_at')}
                        >
                          <div className="flex items-center gap-1">
                            Updated
                            <SortIcon field="updated_at" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {companies.map(company => (
                        <tr
                          key={company.company_id}
                          onClick={() => navigate(`/companies/${company.company_id}`)}
                          className="hover:bg-emerald-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRecords.has(company.company_id)}
                              onChange={() => toggleRecordSelection(company.company_id)}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900 text-sm">{company.company_name}</div>
                            <div className="text-xs text-gray-500 font-mono">{company.unique_key}</div>
                          </td>
                          <td className="px-4 py-4 text-gray-600 text-sm">{company.country || '-'}</td>
                          <td className="px-4 py-4">
                            {company.project_code ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <Hash className="w-3 h-3" />
                                {company.project_code}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>                          
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {company.all_categories?.slice(0, 3).map(cat => (
                                <span
                                  key={cat}
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700'}`}
                                >
                                  {CATEGORY_DISPLAY[cat] || cat}
                                </span>
                              ))}
                              {company.all_categories?.length > 3 && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  +{company.all_categories.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[company.status] || 'bg-gray-100 text-gray-700'}`}>
                              {STATUS_DISPLAY[company.status] || company.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(company.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
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
      <CompanyFilterSidebar
        isOpen={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
        filterGroups={filterGroups}
        filterOptions={filterOptions}
        technicalFilterOptions={technicalFilterOptions}
        statusFilters={statusFilters}
        onStatusFilterChange={handleStatusFilterChange}
        countryFilters={countryFilters}
        onCountryFilterChange={handleCountryFilterChange}
        allCountries={allCountries}
        categoryFilters={categoryFilters}
        onCategoryFilterChange={handleCategoryFilterChange}
        availableCategories={availableCategories}
        onApply={handleFilterGroupsApply}
        onReset={clearFilters}
      />

      {/* Import Companies Modal */}
      <ImportCompaniesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </DashboardLayout>
  );
};

export default CompanyDatabasePage;
