// frontend/src/pages/ReportDetailPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/database/DataTable';
import RecordDetailModal from '../../components/database/RecordDetailModal';
import Pagination from '../../components/database/Pagination';
import FilterSidebarWithGroups from '../../components/database/FilterSidebarWithGroups';
import api from '../../utils/api';
import { CATEGORIES } from '../..//constants/categories';
import { useCustomReportDetail, useCustomReportRecords } from '../../hooks/useCustomReports';
import { useTechnicalFilterOptions } from '../../hooks/useDatabase';
import {
  ArrowLeft,
  FileText,
  Users,
  Calendar,
  Filter as FilterIcon,
  Download,
  Edit,
  Trash2,
  BarChart3,
  Globe,
  Layers,
  Search,
  X,
  SlidersHorizontal
} from 'lucide-react';

const ReportDetailPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [ordering, setOrdering] = useState('');

  // Filter options
  const [filterOptions, setFilterOptions] = useState([]);
  const [allCountries, setAllCountries] = useState([]);

  const availableCategories = CATEGORIES
    .filter(cat => cat.value !== 'ALL')
    .map(cat => cat.value);

  // Fetch report details using React Query
  const { data: report, isLoading: loading } = useCustomReportDetail(reportId);

  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname, {
    reportName: report?.title
  });  

  // Build query filters for React Query
  const queryFilters = useMemo(() => ({
    page: currentPage,
    page_size: pageSize,
    search: searchQuery,
    ordering: ordering,
    countries: countryFilters,
    categories: categoryFilters,
    filter_groups: filterGroups.length > 0 ? JSON.stringify(filterGroups) : undefined,
    ...filters
  }), [currentPage, pageSize, searchQuery, ordering, countryFilters, categoryFilters, filterGroups, filters]);

  // Fetch records using React Query
  const { data: recordsData, isLoading: recordsLoading } = useCustomReportRecords(reportId, queryFilters);

  // Extract data from React Query responses
  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch technical filter options based on report category
  const reportCategory = report?.filter_criteria?.category ||
                        report?.filter_criteria?.categories?.[0] ||
                        'ALL';

  const { data: technicalFilterOptions = [] } = useTechnicalFilterOptions(reportCategory);

  // Fetch filter options and countries when report is loaded
  useEffect(() => {
    if (report) {
      const category = report.filter_criteria?.category ||
                      report.filter_criteria?.categories?.[0] ||
                      'ALL';
      fetchFilterOptions(category);
      fetchAllCountries();
    }
  }, [report]);

  const fetchFilterOptions = async (category) => {
    try {
      const response = await api.get('/api/filter-options/', {
        params: { category: category || 'ALL' }
      });
      setFilterOptions(response.data || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchAllCountries = async () => {
    try {
      const response = await api.get('/api/database-stats/');
      setAllCountries(response.data.all_countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchAvailableCategories = async () => {
    try {
      const response = await api.get('/api/database-stats/');
      setAvailableCategories(response.data.available_categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleEditReport = () => {
    navigate(`/custom-reports/${reportId}/edit`);
  };

  const handleDeleteReport = async () => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/custom-reports/${reportId}/`);
      alert('Report deleted successfully');
      navigate('/custom-reports');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
      if (categoryFilters.length > 0) params.append('categories', categoryFilters.join(','));
      if (filterGroups.length > 0) params.append('filter_groups', JSON.stringify(filterGroups));

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key].toString());
        }
      });

      const response = await api.get(
        `/api/custom-reports/${reportId}/records/?${params.toString()}&format=xlsx`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
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

    const getFilterCriteriaSummary = () => {
      if (!report?.filter_criteria) return [];

      const criteria = report.filter_criteria;
      const items = [];

      // Categories
      if (criteria.categories) {
        if (Array.isArray(criteria.categories) && criteria.categories.length > 0) {
          const categoryLabels = criteria.categories.map(cat =>
            CATEGORIES.find(c => c.value === cat)?.label || cat
          );
          items.push({
            label: 'Categories',
            value: categoryLabels.join(', '),
            type: 'category'
          });
        } else if (typeof criteria.categories === 'string') {
          const catLabel = CATEGORIES.find(c => c.value === criteria.categories)?.label || criteria.categories;
          items.push({
            label: 'Category',
            value: catLabel,
            type: 'category'
          });
        }
      } else if (criteria.category) {
        const catLabel = CATEGORIES.find(c => c.value === criteria.category)?.label || criteria.category;
        items.push({
          label: 'Category',
          value: catLabel,
          type: 'category'
        });
      }

      // Countries (from report criteria)
      if (criteria.country && Array.isArray(criteria.country) && criteria.country.length > 0) {
        items.push({
          label: 'Countries',
          value: criteria.country.length <= 3
            ? criteria.country.join(', ')
            : `${criteria.country.slice(0, 3).join(', ')} +${criteria.country.length - 3} more`,
          type: 'country'
        });
      }

      // Filter Groups (from report criteria)
      if (criteria.filter_groups && Array.isArray(criteria.filter_groups)) {
        criteria.filter_groups.forEach((group, index) => {
          // Boolean Material Filters
          const groupFilters = Object.entries(group.filters || {}).map(([field, value]) => {
            const option = filterOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${label}: ${value ? 'Include' : 'Exclude'}`;
          });

          // Technical Filters
          const technicalFilters = Object.entries(group.technicalFilters || {}).map(([field, config]) => {
            const option = technicalFilterOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (config.mode === 'equals') {
              return `${label} = ${config.equals}`;
            } else if (config.mode === 'range') {
              const min = config.min !== '' && config.min !== undefined ? config.min : null;
              const max = config.max !== '' && config.max !== undefined ? config.max : null;

              if (min !== null && max !== null) {
                return `${label}: ${min} - ${max}`;
              } else if (min !== null) {
                return `${label} ≥ ${min}`;
              } else if (max !== null) {
                return `${label} ≤ ${max}`;
              }
            }
            return null;
          }).filter(Boolean);

          // Combine all filters in this group
          const allFilters = [...groupFilters, ...technicalFilters];

          if (allFilters.length > 0) {
            items.push({
              label: `Filter Group ${index + 1}`,
              value: allFilters.join(', '),
              isFilterGroup: true,
              type: 'filter_group'
            });
          }
        });
      }

      // Legacy Material filters (backward compatibility)
      Object.keys(criteria).forEach(key => {
        if (!['category', 'categories', 'country', 'filter_groups'].includes(key)) {
          if (typeof criteria[key] === 'boolean') {
            const option = filterOptions.find(opt => opt.field === key);
            const label = option?.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            items.push({
              label,
              value: criteria[key] ? 'Include' : 'Exclude',
              isBoolean: true,
              boolValue: criteria[key],
              type: 'material'
            });
          }
        }
      });

      return items;
    };

    // NEW: Get active filters applied by user (not from report criteria)
    const getUserAppliedFilters = () => {
      const items = [];

      // User-selected categories
      if (categoryFilters.length > 0) {
        const categoryLabels = categoryFilters.map(cat =>
          CATEGORIES.find(c => c.value === cat)?.label || cat
        );
        items.push({
          label: 'Categories (User)',
          value: categoryLabels.join(', '),
          type: 'user_category',
          isUserFilter: true
        });
      }

      // User-selected countries
      if (countryFilters.length > 0) {
        items.push({
          label: 'Countries (User)',
          value: countryFilters.length <= 3
            ? countryFilters.join(', ')
            : `${countryFilters.slice(0, 3).join(', ')} +${countryFilters.length - 3} more`,
          type: 'user_country',
          isUserFilter: true
        });
      }

      // User-applied filter groups
      if (filterGroups.length > 0) {
        filterGroups.forEach((group, index) => {
          // Boolean Material Filters
          const groupFilters = Object.entries(group.filters || {}).map(([field, value]) => {
            const option = filterOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${label}: ${value ? 'Include' : 'Exclude'}`;
          });

          // Technical Filters
          const technicalFilters = Object.entries(group.technicalFilters || {}).map(([field, config]) => {
            const option = technicalFilterOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (config.mode === 'equals') {
              return `${label} = ${config.equals}`;
            } else if (config.mode === 'range') {
              const min = config.min !== '' && config.min !== undefined ? config.min : null;
              const max = config.max !== '' && config.max !== undefined ? config.max : null;

              if (min !== null && max !== null) {
                return `${label}: ${min} - ${max}`;
              } else if (min !== null) {
                return `${label} ≥ ${min}`;
              } else if (max !== null) {
                return `${label} ≤ ${max}`;
              }
            }
            return null;
          }).filter(Boolean);

          // Combine all filters in this group
          const allFilters = [...groupFilters, ...technicalFilters];

          if (allFilters.length > 0) {
            items.push({
              label: `User Filter Group ${index + 1}`,
              value: allFilters.join(', '),
              isFilterGroup: true,
              isUserFilter: true,
              type: 'user_filter_group'
            });
          }
        });
      }

      return items;
    };

      // NEW: Handle applying filter groups
    const handleApplyFilterGroups = (newGroups) => {
      console.log('Applying filter groups:', newGroups);
      setFilterGroups(newGroups);
      setCurrentPage(1); // Reset to first page when filters change
      // Don't close the sidebar here - let the user close it manually
    };

      // NEW: Reset filter groups
    const handleResetFilterGroups = () => {
      console.log('Resetting filter groups');
      setFilterGroups([]);
      setCountryFilters([]);
      setCategoryFilters([]);
      setFilters({});
      setCurrentPage(1);
    };

  // Calculate active filters count including filter groups
  const groupFilterCount = filterGroups.reduce((sum, group) => {
    const booleanCount = Object.keys(group.filters || {}).length;
    const technicalCount = Object.entries(group.technicalFilters || {}).filter(([field, filter]) => {
      if (filter.mode === 'equals') {
        return filter.equals !== '' && filter.equals !== undefined;
      } else {
        return (filter.min !== '' && filter.min !== undefined) ||
               (filter.max !== '' && filter.max !== undefined);
      }
    }).length;
    return sum + booleanCount + technicalCount;
  }, 0);

  const activeFiltersCount =
    countryFilters.length +
    categoryFilters.length +
    groupFilterCount +
    Object.keys(filters).filter(key => filters[key] !== undefined).length;

  const filterCriteriaSummary = getFilterCriteriaSummary();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report not found</h3>
            <button
              onClick={() => navigate('/custom-reports')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Define page subtitle
  const pageSubtitle = (
    <p className="text-sm text-white-500 mt-1">{report.description}</p>
  );

  const pageHeaderActions = null;

  return (
    <DashboardLayout
      pageTitle={report.title}
      pageSubtitleBottom={pageSubtitle}
      headerActions={pageHeaderActions}
      breadcrumbs={breadcrumbs}
    >
      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{totalCount.toLocaleString()}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Subscribers</p>
                  <p className="text-2xl font-bold text-purple-900">{report.subscription_count || 0}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Status</p>
                  <p className="text-sm font-bold text-green-900 mt-1">
                    {report.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  report.is_active ? 'bg-green-600' : 'bg-gray-400'
                }`}>
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Created</p>
                  <p className="text-sm font-bold text-orange-900 mt-1">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600 opacity-75" />
              </div>
            </div>
          </div>

            {/* Filter Criteria - Show BOTH report criteria AND user-applied filters */}
            {(() => {
              const reportFilters = getFilterCriteriaSummary();
              const userFilters = getUserAppliedFilters();
              const allFilters = [...reportFilters, ...userFilters];

              return allFilters.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FilterIcon className="w-4 h-4 text-indigo-600" />
                      Active Filters
                    </h3>
                    {userFilters.length > 0 && (
                      <span className="text-xs text-indigo-600 font-medium">
                        {reportFilters.length} from report + {userFilters.length} user-applied
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allFilters.map((item, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          item.isUserFilter
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : item.isFilterGroup
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : item.isBoolean
                            ? item.boolValue
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {item.isUserFilter && (
                          <span className="text-orange-600">👤</span>
                        )}
                        <strong>{item.label}:</strong> {item.value}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            {/* Left side: Filter Button */}
            <button
              onClick={() => setShowFilters(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-white bg-purple-600 hover:bg-purple-700 flex items-center gap-2 "
            >
              <SlidersHorizontal className="w-4 h-4" />
              Additional Filters
              {activeFiltersCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Right side: Export/Edit/Delete Buttons */}
            <div className="flex items-center gap-3">
               <button
                 onClick={handleExport}
                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
               >
                 <Download className="w-4 h-4" />
                 Export Data
               </button>
               {isStaff && (
                 <>
                   <button
                     onClick={handleEditReport}
                     className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2 text-sm"
                   >
                     <Edit className="w-4 h-4" />
                     Edit
                   </button>
                   <button
                     onClick={handleDeleteReport}
                     className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                   >
                     <Trash2 className="w-4 h-4" />
                     Delete
                   </button>
                 </>
               )}
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
                placeholder="Search records..."
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

          {/* Results Count */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                {totalCount} records found
              </span>
            </div>
          </div>

          {/* Data Table */}
          {recordsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No records found</p>
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

      {/* Filter Sidebar with Groups */}
      {showFilters && (
<FilterSidebarWithGroups
  isOpen={showFilters}
  onClose={() => setShowFilters(false)}

  // Filter Groups
  filterGroups={filterGroups}

  // Filter Options
  filterOptions={filterOptions}
  technicalFilterOptions={technicalFilterOptions}

  // Countries - CORRECT PROP NAMES ✅
  countryFilters={countryFilters}
  onCountryFilterChange={setCountryFilters}
  allCountries={allCountries}

  // Categories - CORRECT PROP NAMES ✅
  categoryFilters={categoryFilters}
  onCategoryFilterChange={setCategoryFilters}
  availableCategories={availableCategories}

  // Actions
  onApply={(newGroups) => {
    handleApplyFilterGroups(newGroups);
  }}
  onReset={() => {
    handleResetFilterGroups();
    setShowFilters(false);
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
    </DashboardLayout>
  );
};

export default ReportDetailPage;