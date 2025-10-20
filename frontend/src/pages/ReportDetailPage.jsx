// frontend/src/pages/ReportDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import FilterSidebar from '../components/database/FilterSidebar';
import api from '../utils/api';
import { CATEGORIES } from '../constants/categories';
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

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [ordering, setOrdering] = useState('');

  // Filter options
  const [filterOptions, setFilterOptions] = useState([]);
  const [allCountries, setAllCountries] = useState([]);

  // Fetch report details
  useEffect(() => {
    fetchReportDetails();
  }, [reportId]);

  // Fetch records when filters change
  useEffect(() => {
    if (report) {
      fetchRecords();
    }
  }, [report, currentPage, pageSize, searchQuery, filters, countryFilters, ordering]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/custom-reports/${reportId}/`);
      setReport(response.data);

      // Fetch filter options based on report's category
      const category = response.data.filter_criteria?.category ||
                      response.data.filter_criteria?.categories?.[0] ||
                      'ALL';
      fetchFilterOptions(category);
      fetchAllCountries();
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to load report');
      navigate('/custom-reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setRecordsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize
      });

      if (searchQuery) params.append('search', searchQuery);
      if (ordering) params.append('ordering', ordering);
      if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));

      // Add boolean filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key].toString());
        }
      });

      const response = await api.get(`/api/custom-reports/${reportId}/records/?${params.toString()}`);
      setRecords(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

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
    if (!report?.filter_criteria) return null;

    const criteria = report.filter_criteria;
    const items = [];

    // Categories
    if (criteria.categories) {
      if (Array.isArray(criteria.categories)) {
        const categoryLabels = criteria.categories.map(cat =>
          CATEGORIES.find(c => c.value === cat)?.label || cat
        );
        items.push({ label: 'Categories', value: categoryLabels.join(', ') });
      } else {
        const catLabel = CATEGORIES.find(c => c.value === criteria.categories)?.label || criteria.categories;
        items.push({ label: 'Category', value: catLabel });
      }
    } else if (criteria.category) {
      const catLabel = CATEGORIES.find(c => c.value === criteria.category)?.label || criteria.category;
      items.push({ label: 'Category', value: catLabel });
    }

    // Countries
    if (criteria.country && Array.isArray(criteria.country) && criteria.country.length > 0) {
      items.push({
        label: 'Countries',
        value: criteria.country.length <= 3
          ? criteria.country.join(', ')
          : `${criteria.country.slice(0, 3).join(', ')} +${criteria.country.length - 3} more`
      });
    }

    // Material filters
    Object.keys(criteria).forEach(key => {
      if (key !== 'category' && key !== 'categories' && key !== 'country') {
        const option = filterOptions.find(opt => opt.field === key);
        const label = option?.label || key.replace(/_/g, ' ');
        items.push({
          label,
          value: criteria[key] ? 'Include' : 'Exclude',
          isBoolean: true,
          boolValue: criteria[key]
        });
      }
    });

    return items;
  };

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key] !== undefined).length + countryFilters.length;
  const totalPages = Math.ceil(totalCount / pageSize);
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/custom-reports')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <p className="text-indigo-100 text-sm mt-1">{report.description}</p>
          </div>
          {isStaff && (
            <div className="flex gap-2">
              <button
                onClick={handleEditReport}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDeleteReport}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{report.record_count}</p>
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

          {/* Filter Criteria */}
          {filterCriteriaSummary && filterCriteriaSummary.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FilterIcon className="w-4 h-4 text-indigo-600" />
                Report Filter Criteria
              </h3>
              <div className="flex flex-wrap gap-2">
                {filterCriteriaSummary.map((item, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      item.isBoolean
                        ? item.boolValue
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}
                  >
                    <strong>{item.label}:</strong> {item.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Additional Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
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

      {/* Filter Sidebar */}
      {showFilters && (
        <FilterSidebar
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          filterOptions={filterOptions}
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={allCountries}
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

export default ReportDetailPage;