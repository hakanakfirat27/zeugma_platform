// frontend/src/pages/ReportViewPage.jsx
// MODIFIED: Merged header by removing secondary header and adding props to DashboardLayout

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, X, Edit, Users, Calendar, Globe,
  BarChart3, TrendingUp, Download, Eye, Filter
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterSidebar from '../components/database/FilterSidebar';
import { useCustomReportDetail, useCustomReportRecords } from '../hooks/useCustomReports';
import { useFilterOptions } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';

const ReportViewPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [ordering, setOrdering] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState(new Set());

  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  // REACT QUERY HOOKS
  const { data: report, isLoading: reportLoading } = useCustomReportDetail(reportId);

  const queryFilters = useMemo(() => ({
    page: currentPage,
    page_size: pageSize,
    search: searchQuery,
    ordering: ordering,
    countries: countryFilters,
    ...filters
  }), [currentPage, pageSize, searchQuery, ordering, countryFilters, filters]);

  const { data: recordsData, isLoading: recordsLoading } = useCustomReportRecords(
    reportId,
    queryFilters
  );

  // Get filter options for the report's category
  const reportCategory = report?.filter_criteria?.categories || report?.filter_criteria?.category || 'ALL';
  const { data: filterOptions = [] } = useFilterOptions(reportCategory);

  // Extract data
  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // HANDLERS
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
    setSearchQuery('');
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

  // LOADING STATE
  if (reportLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h2>
            <p className="text-gray-600 mb-4">The report you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/custom-reports')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- NEW: Define page subtitle ---
  const pageSubtitle = (
    <p className="text-sm text-white-500 mt-1">{report.description}</p> // Color for white header
  );


  return (
    // --- MODIFIED: Pass pageTitle and pageSubtitleBottom ---
    <DashboardLayout
      pageTitle={report.title}
      pageSubtitleBottom={pageSubtitle}
    >
      {/* --- REMOVED: The secondary gradient header div --- */}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {totalCount.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">Total Records</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900">
              {report.subscription_count || 0}
            </div>
            <div className="text-sm text-green-600">Active Subscriptions</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {report.is_active ? 'Active' : 'Inactive'}
            </div>
            <div className="text-sm text-purple-600">Report Status</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-900">
              {new Date(report.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm text-orange-600">Created</div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm" // Added text style
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

          {isStaff && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/custom-reports/${reportId}/edit`)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm" // Added text style
              >
                <Edit className="w-4 h-4" />
                Edit Report
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
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
              onKeyDown={handleSearchKeyDown}
              placeholder="Search companies..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              <button
                onClick={clearAllFilters}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {countryFilters.map(country => (
                <span
                  key={country}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-sm font-medium"
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
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        value === true
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
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

        {/* Results Count */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-900">
              {totalCount} records found
            </span>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedRecords.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-6 py-3 flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-indigo-900">
              {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => alert('Export feature coming soon')}
              className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Selected
            </button>
          </div>
        )}

        {/* Data Table */}
        {recordsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No records found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
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
              onPageChange={(page) => {
                console.log('Changing to page:', page);
                setCurrentPage(page);
              }}
              onPageSizeChange={(size) => {
                console.log('Changing page size to:', size);
                setPageSize(size);
                setCurrentPage(1);
              }}
              showFirstLast={true}
            />
          </>
        )}
      </div>

      {/* Filter Sidebar */}
      {showFilters && (
        <FilterSidebar
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          filterOptions={filterOptions}
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={[]} // You can fetch this if needed
          onApply={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilters({});
            setCountryFilters([]);
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
    </DashboardLayout>
  );
};

export default ReportViewPage;