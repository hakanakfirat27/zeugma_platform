// frontend/src/pages/CustomReportsPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  Search, X, FileText, Users, Calendar, Plus, Edit, Trash2, Eye,
  Grid, List, ChevronDown, CheckCircle2, Database
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import Pagination from '../../components/database/Pagination';
import { ToastContainer } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import api from '../../utils/api';


// Status Badge Component
const StatusBadge = ({ isActive }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      isActive
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-gray-100 text-gray-800 border-gray-200'
    }`}>
      {isActive ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Active
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          Inactive
        </>
      )}
    </span>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subtext, gradient, iconColor }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 shadow-lg border border-white/20`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`w-14 h-14 ${iconColor} rounded-xl flex items-center justify-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
};

// Sortable Table Header Component
const SortableHeader = ({ label, field, currentSort, onSort }) => {
  const isActive = currentSort.field === field;
  const isDesc = currentSort.direction === 'desc';

  return (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronDown
            className={`w-3 h-3 -mb-1 transition-colors ${
              isActive && !isDesc ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
            style={{ transform: 'rotate(180deg)' }}
          />
          <ChevronDown
            className={`w-3 h-3 transition-colors ${
              isActive && isDesc ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
        </div>
      </div>
    </th>
  );
};


const CustomReportsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);      
  const { toasts, success, error: showError, removeToast } = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  useEffect(() => {
    fetchReports();
  }, [searchTerm, sortField, sortDirection, page, pageSize]);

  // Check for toast message from navigation
  useEffect(() => {
    if (location.state?.toastMessage) {
      const { toastMessage, toastType } = location.state;

      // Show toast with 7 second duration
      if (toastType === 'success') {
        success(toastMessage, 7000);
      } else if (toastType === 'error') {
        showError(toastMessage, 7000);
      }

      // Clear state so toast doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, success, showError]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize
      };

      if (searchTerm) params.search = searchTerm;
      if (sortField) {
        params.ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      }

      const response = await api.get('/api/custom-reports/', { params });

      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        setReports(response.data.results);
        setTotalCount(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
      } else {
        setReports(response.data);
        setTotalCount(response.data.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      showError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  const handleCreateReport = () => {
    navigate('/custom-reports/create');
  };

  const handleViewReport = (reportId) => {
    navigate(`/custom-reports/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    navigate(`/custom-reports/${reportId}/edit`);
  };

  const handleOpenDeleteModal = (report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/custom-reports/${reportToDelete.report_id}/`);
      setShowDeleteModal(false);
      setReportToDelete(null);
      fetchReports();
      success('Report deleted successfully!');
    } catch (error) {
      console.error('Error deleting report:', error);
      showError(error.response?.data?.error || 'Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate stats from reports data
  const stats = React.useMemo(() => {
    if (viewMode === 'list') {
      return {
        totalReports: totalCount,
        activeReports: reports.filter(r => r.is_active).length,
        totalRecords: reports.reduce((sum, r) => sum + (r.record_count || 0), 0),
        totalSubscribers: reports.reduce((sum, r) => sum + (r.subscription_count || 0), 0),
        showWarning: true
      };
    } else {
      return {
        totalReports: reports.length,
        activeReports: reports.filter(r => r.is_active).length,
        totalRecords: reports.reduce((sum, r) => sum + (r.record_count || 0), 0),
        totalSubscribers: reports.reduce((sum, r) => sum + (r.subscription_count || 0), 0),
        showWarning: false
      };
    }
  }, [reports, totalCount, viewMode]);

  if (loading && reports.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const pageSubtitle = (
    <p className="text-sm text-white-500">
      {isStaff
        ? 'Create and manage custom database reports'
        : 'Browse available custom reports'}
    </p>
  );

  return (
    <DashboardLayout
      pageTitle="Custom Reports"
      pageSubtitleBottom={pageSubtitle}
      breadcrumbs={breadcrumbs}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex-1 overflow-auto bg-white">
        {/* Stats Cards Section */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              icon={FileText}
              label="Total Reports"
              value={stats.totalReports.toLocaleString()}
              subtext={viewMode === 'list' && totalCount !== reports.length ? 'All reports' : null}
              gradient="from-blue-50 to-indigo-50"
              iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <StatsCard
              icon={CheckCircle2}
              label="Active Reports"
              value={stats.activeReports.toLocaleString()}
              subtext={stats.showWarning ? 'Current page' : 'Published and available'}
              gradient="from-green-50 to-emerald-50"
              iconColor="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            <StatsCard
              icon={Database}
              label="Total Records"
              value={stats.totalRecords.toLocaleString()}
              subtext={stats.showWarning ? 'Current page' : 'Across all reports'}
              gradient="from-purple-50 to-pink-50"
              iconColor="bg-gradient-to-br from-purple-500 to-pink-600"
            />
            <StatsCard
              icon={Users}
              label="Subscribers"
              value={stats.totalSubscribers.toLocaleString()}
              subtext={stats.showWarning ? 'Current page' : 'Total subscriptions'}
              gradient="from-orange-50 to-amber-50"
              iconColor="bg-gradient-to-br from-orange-500 to-amber-600"
            />
          </div>
        </div>
        <div className="px-6 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1); // Reset to first page when searching
                  }}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle Buttons */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium">List</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                    viewMode === 'card'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Card View"
                >
                  <Grid className="w-4 h-4" />
                  <span className="text-sm font-medium">Card</span>
                </button>
              </div>

              {/* Create Report Button */}
              {isStaff && (
                <button
                  onClick={handleCreateReport}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-md text-sm"
                >
                  <Plus className="w-5 h-5" />
                  Create New Report
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {reports.length === 0 && !loading ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-6">
                {isStaff ? 'Get started by creating a new report.' : 'Check back later for available reports.'}
              </p>
              {isStaff && (
                <button
                  onClick={handleCreateReport}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Report
                </button>
              )}
            </div>
          ) : (
            <>
              {/* List View - Table */}
              {viewMode === 'list' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <SortableHeader
                            label="Report Title"
                            field="title"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Status"
                            field="is_active"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Subscribers"
                            field="subscription_count"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Created"
                            field="created_at"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12">
                              <LoadingSpinner />
                            </td>
                          </tr>
                        ) : (
                          reports.map((report, index) => (
                            <tr
                              key={report.report_id}
                              className={`hover:bg-indigo-50 transition-colors cursor-pointer ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                              onClick={() => handleViewReport(report.report_id)}
                            >
                              {/* Title Column */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {report.title}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate max-w-xs">
                                      {report.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Status Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge isActive={report.is_active} />
                              </td>

                              {/* Subscribers Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {report.subscription_count.toLocaleString()}
                                  </span>
                                </div>
                              </td>

                              {/* Created Date Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    {new Date(report.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewReport(report.report_id);
                                    }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {isStaff && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditReport(report.report_id);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDeleteModal(report);
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {!loading && totalCount > 0 && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      totalCount={totalCount}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      showFirstLast={true}
                    />
                  )}
                </div>
              )}

              {/* Card View - Grid */}
              {viewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reports.map((report) => (
                    <div
                      key={report.report_id}
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden group"
                    >
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                              {report.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <StatusBadge isActive={report.is_active} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                          {report.description}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-gray-600">Records</span>
                            </div>
                            <p className="text-lg font-bold text-blue-900">
                              {report.record_count.toLocaleString()}
                            </p>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span className="text-xs text-gray-600">Subscribers</span>
                            </div>
                            <p className="text-lg font-bold text-purple-900">
                              {report.subscription_count.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b">
                          <Calendar className="w-3 h-3" />
                          <span>Created {new Date(report.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewReport(report.report_id)}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {isStaff && (
                            <>
                              <button
                                onClick={() => handleEditReport(report.report_id)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(report)}
                                className="px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition text-sm font-medium text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReportToDelete(null);
        }}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        message="Are you sure you want to delete this report? All associated subscriptions will also be affected."
        itemName={reportToDelete?.title}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

export default CustomReportsPage;
