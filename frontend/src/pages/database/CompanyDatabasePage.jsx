// frontend/src/pages/database/CompanyDatabasePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Building2, Search, Plus, ChevronDown, ChevronUp,
  Download, Trash2, BarChart3, TrendingUp, Users, SlidersHorizontal
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/database/Pagination';
import companyService from '../../services/companyService';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';

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
  COMPOUNDER: 'bg-indigo-100 text-indigo-800'
};

const CATEGORY_DISPLAY = {
  INJECTION: 'Injection',
  BLOW: 'Blow',
  ROTO: 'Roto',
  PE_FILM: 'PE Film',
  SHEET: 'Sheet',
  PIPE: 'Pipe',
  TUBE_HOSE: 'Tube & Hose',
  PROFILE: 'Profile',
  CABLE: 'Cable',
  COMPOUNDER: 'Compounder'
};

const STATUS_COLORS = {
  COMPLETE: 'bg-green-100 text-green-800',
  INCOMPLETE: 'bg-yellow-100 text-yellow-800',
  DELETED: 'bg-red-100 text-red-800'
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
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [ordering, setOrdering] = useState('-updated_at');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status')?.split(',') || ['COMPLETE', 'INCOMPLETE']
  );
  const [categoryFilters, setCategoryFilters] = useState(
    searchParams.get('category')?.split(',').filter(Boolean) || []
  );
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') || '');

  // Statistics
  const [stats, setStats] = useState(null);

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

      if (searchQuery) params.search = searchQuery;
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      if (categoryFilters.length > 0) params.category = categoryFilters.join(',');
      if (countryFilter) params.country = countryFilter;

      const response = await companyService.getCompanies(params);

      setCompanies(response.results || []);
      setTotalCount(response.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load companies');
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, categoryFilters, countryFilter, ordering]);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const data = await companyService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Effects
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter.length > 0 && statusFilter.length < 3) params.set('status', statusFilter.join(','));
    if (categoryFilters.length > 0) params.set('category', categoryFilters.join(','));
    if (countryFilter) params.set('country', countryFilter);
    setSearchParams(params);
  }, [searchQuery, statusFilter, categoryFilters, countryFilter, setSearchParams]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCompanies();
  };

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

  const toggleCategoryFilter = (category) => {
    setCategoryFilters(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
    setCurrentPage(1);
  };

  const toggleStatusFilter = (status) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      }
      return [...prev, status];
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter(['COMPLETE', 'INCOMPLETE']);
    setCategoryFilters([]);
    setCountryFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const activeFiltersCount = categoryFilters.length + (statusFilter.length < 3 ? 1 : 0) + (countryFilter ? 1 : 0);

  // Sort icon helper
  const SortIcon = ({ field }) => {
    if (ordering === field) return <ChevronUp className="w-4 h-4 text-indigo-600" />;
    if (ordering === `-${field}`) return <ChevronDown className="w-4 h-4 text-indigo-600" />;
    return <ChevronDown className="w-4 h-4 text-gray-300" />;
  };

  return (
    <DashboardLayout
      pageTitle="Company Database"
      pageSubtitleBottom="Manage companies and their production capabilities"
      breadcrumbs={breadcrumbs}
    >
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
            </div>
            <button
              onClick={() => navigate('/company-database/new')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
            >
              <Plus className="h-5 w-5" />
              Add Company
            </button>
          </div>

          {/* Statistics Cards */}
          {showStats && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Records</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.total_companies?.toLocaleString()}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-600 opacity-75" />
                </div>
              </div>              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Complete</div>
                  <div className="text-2xl font-bold text-green-600">{stats.by_status?.complete?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Incomplete</div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.by_status?.incomplete?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Multi-Category</div>
                  <div className="text-2xl font-bold text-purple-600">{stats.multi_category_companies?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex gap-4 items-center">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies by name, country, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </form>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition ${
                  showFilters 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className={`px-4 py-2.5 rounded-lg border transition ${
                  showStats
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['COMPLETE', 'INCOMPLETE', 'DELETED'].map(status => (
                        <button
                          key={status}
                          onClick={() => toggleStatusFilter(status)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            statusFilter.includes(status)
                              ? STATUS_COLORS[status]
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(CATEGORY_DISPLAY).map(category => (
                        <button
                          key={category}
                          onClick={() => toggleCategoryFilter(category)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            categoryFilters.includes(category)
                              ? CATEGORY_COLORS[category]
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {CATEGORY_DISPLAY[category]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Country Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      placeholder="Filter by country..."
                      value={countryFilter}
                      onChange={(e) => {
                        setCountryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                {totalCount.toLocaleString()} companies found
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

          {/* Data Table */}
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRecords.size === companies.length && companies.length > 0}
                          onChange={selectAllRecords}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('company_name')}
                      >
                        <div className="flex items-center gap-1">
                          Company Name
                          <SortIcon field="company_name" />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('country')}
                      >
                        <div className="flex items-center gap-1">
                          Country
                          <SortIcon field="country" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Categories
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[company.status] || 'bg-gray-100 text-gray-700'}`}>
                            {company.status_display || company.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 text-sm">
                          {new Date(company.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </DashboardLayout>
  );
};

export default CompanyDatabasePage;