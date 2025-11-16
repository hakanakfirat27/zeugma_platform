// frontend/src/pages/SuperdatabasePage.jsx
// MODIFIED: Merged header by removing secondary header and adding props to DashboardLayout

import { FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Download, Upload, Trash2, Edit, Plus, BarChart3, TrendingUp, Users, X, ArrowLeft } from 'lucide-react';
import { useRecords, useFilterOptions, useTechnicalFilterOptions } from '../hooks/useDatabase';
import { CATEGORIES } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import FilterSidebarWithGroups from '../components/database/FilterSidebarWithGroups';

const SuperdatabasePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // UPDATED: Multi-category selection with Set
  const [selectedCategories, setSelectedCategories] = useState(new Set(['ALL']));

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroups, setFilterGroups] = useState([]);
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]); // NEW: Category filters
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

        // Handle multiple categories
        if (categoryFilters.length > 0) {
          params.append('categories', categoryFilters.join(','));
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
  }, [categoryFilters]); // Dependency updated

  // Fetch other stats when filters change
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const params = new URLSearchParams();

        // Handle multiple categories
        if (categoryFilters.length > 0) {
          params.append('categories', categoryFilters.join(','));
        }

        if (searchQuery) {
          params.append('search', searchQuery);
        }
        if (countryFilters.length > 0) {
          params.append('countries', countryFilters.join(','));
        }

        // Add filter groups (now with technical filters)
        if (filterGroups.length > 0) {
          params.append('filter_groups', JSON.stringify(filterGroups));
        }

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
  }, [categoryFilters, searchQuery, filterGroups, countryFilters]);

  // Convert category filters to comma-separated string for API
  const categoriesParam = categoryFilters.length > 0
    ? categoryFilters.join(',')
    : 'ALL';

  const { data: recordsData, isLoading } = useRecords({
    categories: categoriesParam,  // CHANGED: category → categories
    search: searchQuery,
    page: currentPage,
    page_size: pageSize,
    ordering: ordering,
    countries: countryFilters.join(','),
    filter_groups: JSON.stringify(filterGroups),
  });

  // Get filter options for the selected categories
  const filterOptionsCategory = categoryFilters.length === 1
    ? categoryFilters[0]
    : 'ALL';

  const { data: filterOptions = [] } = useFilterOptions(filterOptionsCategory);

  // NEW: Fetch technical filter options
  const { data: technicalFilterOptions = [] } = useTechnicalFilterOptions(filterOptionsCategory);

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Include category filters and filter groups in count
  const groupFilterCount = filterGroups.reduce((sum, group) => {
    const booleanFilters = Object.keys(group.filters || {}).length;
    const techFilters = Object.keys(group.technicalFilters || {}).length;
    return sum + booleanFilters + techFilters;
  }, 0);
  const activeFiltersCount = groupFilterCount + countryFilters.length + categoryFilters.length;

  // Get available categories from CATEGORIES constant
  // Filter to show only categories that have records
  const availableCategories = CATEGORIES
    .filter(cat => cat.value !== 'ALL')
    .map(cat => cat.value);

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

  // UPDATED: Handle multiple categories and filter groups
  const handleCreateReport = () => {
    const filterCriteria = {};

    // FIXED: Add categories using categoryFilters instead of selectedCategories
    if (categoryFilters.length > 0) {
      filterCriteria.categories = categoryFilters.length === 1
        ? categoryFilters[0]
        : categoryFilters;
    }

    // Add country filters
    if (countryFilters.length > 0) {
      filterCriteria.country = countryFilters;
    }

    // Add filter groups - NEW FORMAT
    if (filterGroups.length > 0) {
      filterCriteria.filter_groups = filterGroups;
    }

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

        {/* Active Filters */}
          {(filterGroups.length > 0 || countryFilters.length > 0 || categoryFilters.length > 0) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                <button
                onClick={() => {
                  setFilterGroups([]);
                  setCountryFilters([]);
                  setCategoryFilters([]);
                  setSelectedCategories(new Set(['ALL']));
                  setCurrentPage(1);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Category Filter Chips - Purple with 📁 icon */}
              {categoryFilters.length > 0 && (
                <>
                  {categoryFilters.map(categoryValue => {
                    const cat = CATEGORIES.find(c => c.value === categoryValue);
                    return (
                      <span
                        key={categoryValue}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-sm font-medium"
                      >
                        📁 {cat?.label || categoryValue}
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
                </>
              )}

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

              {/* Country Filters - Keep existing purple styling */}
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

              {/* UPDATED: Active Results Summary Section - VERTICAL LAYOUT with Categories and Technical Filters */}
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

                        // 1. Build Category Section (NEW)
                        if (categoryFilters.length > 0) {
                          const categoryNames = categoryFilters
                            .map(val => {
                              const cat = CATEGORIES.find(c => c.value === val);
                              return cat?.label || val;
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

                        // 3. Build Material Filter Groups Section (OR within groups, AND between groups)
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
                                return `${label}: ${action}`;
                              });

                              // Within a group: OR logic
                              if (filters.length === 0) return '';
                              if (filters.length === 1) return `(${filters[0]})`;
                              return `(${filters.join(' <strong>or</strong> ')})`;
                            }).filter(Boolean);

                          if (groupDescriptions.length > 0) {
                            // Between groups: AND logic
                            const filterText = groupDescriptions.length === 1
                              ? groupDescriptions[0]
                              : groupDescriptions.join(' <strong>and</strong> ');
                            sections.push(
                              <div key="materialFilters" dangerouslySetInnerHTML={{ __html: `<strong>Material Filters:</strong> ${filterText}` }} />
                            );
                          }
                        }

                        // 4. Build Technical Filter Groups Section (NEW)
                        if (filterGroups.some(group => Object.keys(group.technicalFilters || {}).length > 0)) {
                          const groupDescriptions = filterGroups
                            .filter(group => Object.keys(group.technicalFilters || {}).length > 0)
                            .map((group) => {
                              const filters = Object.entries(group.technicalFilters || {})
                                .filter(([field, filterConfig]) => {
                                  // Only include non-empty filters
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

                                  // Format the filter display
                                  let displayValue = '';
                                  if (filterConfig.mode === 'equals') {
                                    displayValue = `= ${filterConfig.equals}`;
                                  } else {
                                    const min = filterConfig.min || '∞';
                                    const max = filterConfig.max || '∞';
                                    displayValue = `${min} - ${max}`;
                                  }

                                  return `${label}: ${displayValue}`;
                                });

                              // Within a group: OR logic
                              if (filters.length === 0) return '';
                              if (filters.length === 1) return `(${filters[0]})`;
                              return `(${filters.join(' <strong>or</strong> ')})`;
                            }).filter(Boolean);

                          if (groupDescriptions.length > 0) {
                            // Between groups: AND logic
                            const filterText = groupDescriptions.length === 1
                              ? groupDescriptions[0]
                              : groupDescriptions.join(' <strong>and</strong> ');
                            sections.push(
                              <div key="technicalFilters" dangerouslySetInnerHTML={{ __html: `<strong>Technical Filters:</strong> ${filterText}` }} />
                            );
                          }
                        }

                        // 5. Handle No Filters Case
                        if (sections.length === 1 && sections[0].key === 'categories') {
                          // Only category is showing "All Categories", check if there are any other filters
                          if (countryFilters.length === 0 && filterGroups.length === 0) {
                            return <em className="text-gray-500">No filters applied - showing all results</em>;
                          }
                        }

                        // 6. Return all sections (each on its own line)
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

      {/* UPDATED: Filter Sidebar with new props */}
      {showFilters && (
        <FilterSidebarWithGroups
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filterGroups={filterGroups}
          filterOptions={filterOptions}
          technicalFilterOptions={technicalFilterOptions} // NEW
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={stats.allCountries}
          categoryFilters={categoryFilters} // NEW
          onCategoryFilterChange={setCategoryFilters} // NEW
          availableCategories={availableCategories} // NEW
          onApply={(newGroups) => {
            setFilterGroups(newGroups);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilterGroups([]);
            setCountryFilters([]);
            setCategoryFilters([]); // NEW
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