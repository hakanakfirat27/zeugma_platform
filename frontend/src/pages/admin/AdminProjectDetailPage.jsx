// frontend/src/pages/admin/AdminProjectDetailPage.jsx

import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import api from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useToast } from '../../contexts/ToastContext';
import { ToastContainer } from '../../components/Toast';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import BulkImportModal from '../../components/modals/BulkImportModal';
import BulkExportModal from '../../components/modals/BulkExportModal';
import BulkActionModal from '../../components/modals/BulkActionModal';
import Pagination from '../../components/database/Pagination';
import QualityScore from '../../components/projects/QualityScore';
import {
  ArrowLeft, Plus, Search, Filter, Eye, Edit2, Trash2, Calendar,
  Building2, TrendingUp, Users, Clock, Target, AlertCircle,
  CheckCircle, XCircle, RefreshCw, Download, Upload, FileSpreadsheet,
  ArrowUpDown, ArrowUp, ArrowDown, Check, Send, X
} from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/categories';

const AdminProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, removeToast, success, error: showError } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSites, setSelectedSites] = useState([]);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch project details
  const { data: project, isLoading: isLoadingProject, refetch: refetchProject } = useQuery({
    queryKey: ['admin-project', projectId],
    queryFn: async () => {
      const response = await api.get(`/api/projects/${projectId}/`);
      return response.data;
    },
  });

  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname, {
    projectName: project?.project_name 
  });

  // Fetch project sites with pagination and sorting
  const { data: sitesData, isLoading: isLoadingSites, isFetching: isFetchingSites, refetch: refetchSites } = useQuery({
    queryKey: ['admin-project-sites', projectId, currentPage, pageSize, sortField, sortDirection, debouncedSearch, statusFilter],
    queryFn: async () => {
      const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering
      };

      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (statusFilter && statusFilter !== 'ALL') {
        params.verification_status = statusFilter;
      }

      const response = await api.get(`/api/projects/${projectId}/sites/`, { params });
      return response.data;
    },
    keepPreviousData: true
  });

  // Delete site mutation
  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId) => {
      await api.delete(`/api/projects/sites/${siteId}/delete/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-project-sites', projectId]);
      queryClient.invalidateQueries(['admin-project', projectId]);
      success('Site deleted successfully!');
      setShowDeleteModal(false);
      setSelectedSite(null);
    },
    onError: (error) => {
      showError(`Failed to delete site: ${error.response?.data?.detail || error.message}`);
    },
  });

  // ✅ UPDATED: Bulk action mutation with better error display
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, note }) => {
      const response = await api.post(
        `/api/projects/${projectId}/bulk-action/`,
        {
          site_ids: selectedSites,
          action: action,
          note: note
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin-project-sites', projectId]);
      queryClient.invalidateQueries(['admin-project', projectId]);
      setSelectedSites([]);
      setShowBulkActionModal(false);
      
      // Show detailed message with errors if any
      const { success: successCount, failed, errors } = data.results;
      
      if (failed > 0 && errors && errors.length > 0) {
        // Show warning with error details
        showError(`${failed} failed: ${errors.join(', ')}`);
        if (successCount > 0) {
          success(`${successCount} site(s) processed successfully`);
        }
      } else {
        success(`Bulk action completed: ${successCount} successful`);
      }
    },
    onError: (error) => {
      showError(`Bulk action failed: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Handlers
  const handleViewSite = (siteId) => {
    navigate(`/admin/projects/${projectId}/sites/${siteId}/view`);
  };

  const handleEditSite = (siteId) => {
    navigate(`/admin/projects/${projectId}/sites/${siteId}/edit`);
  };

  const handleDeleteSite = (site) => {
    setSelectedSite(site);
    setShowDeleteModal(true);
  };

  const handleAddSite = () => {
    navigate(`/admin/projects/${projectId}/add-site`);
  };

  // ✅ NEW: Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // ✅ NEW: Get sort icon for column header
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-indigo-600" />
      : <ArrowDown className="w-4 h-4 text-indigo-600" />;
  };

  // ✅ NEW: Pagination handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedSites([]);
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle status filter
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedSites([]);
  };

  // ✅ NEW: Bulk selection handlers
  const handleSelectSite = (siteId) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSites.length === sitesData?.results?.length && sitesData?.results?.length > 0) {
      setSelectedSites([]);
    } else {
      setSelectedSites(sitesData?.results?.map(site => site.site_id) || []);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: <Clock className="w-3 h-3" /> },
      UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Under Review', icon: <RefreshCw className="w-3 h-3" /> },
      NEEDS_REVISION: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Needs Revision', icon: <AlertCircle className="w-3 h-3" /> },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> },
      TRANSFERRED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Transferred', icon: <Send className="w-3 h-3" /> },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoadingProject) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      pageTitle={project?.project_name || 'Project Details'}
      pageSubtitleBottom={project?.description}
      breadcrumbs={breadcrumbs}
    >

      <div className="p-6 max-w-7xl mx-auto">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Header with Action Buttons */}
        <div className="mb-6">
          <div className="flex justify-between items-center gap-3 mb-4">
            <div></div>
            
            {/* Import/Export Buttons - Right aligned */}
            <div className="flex gap-3">
              {/* Import Button */}
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import Sites
              </button>
              
              {/* Export Button */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Sites
              </button>
            </div>
          </div>

          {/* Project Header Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            {/* Project Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="text-sm font-semibold text-gray-900">{project.category_display}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {project.created_by_info?.first_name} {project.created_by_info?.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Deadline</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(project.deadline)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Target</p>
                  <p className="text-sm font-semibold text-gray-900">{project.target_count} sites</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-semibold text-gray-900">
                  {project.total_sites} / {project.target_count} sites ({project.completion_percentage?.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(project.completion_percentage || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Project Statistics - StatBox Design */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
            <StatBox title="Pending" value={project.pending_sites || 0} color="yellow" />
            <StatBox title="Under Review" value={project.under_review_sites || 0} color="blue" />
            <StatBox title="Needs Revision" value={project.needs_revision_sites || 0} color="orange" />
            <StatBox title="Approved" value={project.approved_sites || 0} color="green" />
            <StatBox title="Rejected" value={project.rejected_sites || 0} color="red" />
            <StatBox title="Transferred" value={project.transferred_sites || 0} color="purple" />
          </div>
        </div>

        {/* Sites Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Sites in Project</h2>
              <button
                onClick={handleAddSite}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Site
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sites..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="NEEDS_REVISION">Needs Revision</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="TRANSFERRED">Transferred</option>
                </select>
              </div>

              <button
                onClick={() => {
                  refetchProject();
                  refetchSites();
                }}
                disabled={isFetchingSites}
                className="p-2 border border-gray-300 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isFetchingSites ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Active Filters Display */}
            {(searchQuery || statusFilter !== 'ALL') && (
              <div className="mt-3 flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Status: {statusFilter.replace('_', ' ')}
                    <button onClick={() => setStatusFilter('ALL')} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ✅ Bulk Actions Toolbar - Positioned above table like UnverifiedSitesPage */}
          {selectedSites.length > 0 && (
            <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-indigo-900">
                    {selectedSites.length} selected
                  </span>
                  <button
                    onClick={() => setShowBulkActionModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    disabled={bulkActionMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Bulk Actions
                  </button>
                </div>
                <button
                  onClick={() => setSelectedSites([])}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Sites Table */}
          <div className="overflow-x-auto">
            {isLoadingSites ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading sites...</p>
                </div>
              </div>
            ) : sitesData?.results?.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No sites found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'ALL' ? 'Try adjusting your filters' : 'Start by adding your first site'}
                </p>
                {!searchQuery && statusFilter === 'ALL' && (
                  <button
                    onClick={handleAddSite}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Site
                  </button>
                )}
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      {/* ✅ NEW: Checkbox column */}
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedSites.length === sitesData?.results?.length && sitesData?.results?.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      
                      {/* ✅ NEW: Sortable Company column */}
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('company_name')}
                      >
                        <div className="flex items-center gap-2">
                          Company
                          {getSortIcon('company_name')}
                        </div>
                      </th>
                      
                      {/* ✅ NEW: Sortable Country column */}
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('country')}
                      >
                        <div className="flex items-center gap-2">
                          Country
                          {getSortIcon('country')}
                        </div>
                      </th>
                      
                      {/* ✅ NEW: Sortable Status column */}
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('verification_status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('verification_status')}
                        </div>
                      </th>
                      
                      {/* ✅ NEW: Sortable Quality Score column */}
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('data_quality_score')}
                      >
                        <div className="flex items-center gap-2">
                          Quality Score
                          {getSortIcon('data_quality_score')}
                        </div>
                      </th>
                      
                      {/* ✅ NEW: Collected By column */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Collected By
                      </th>
                      
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sitesData?.results?.map(site => (
                      <tr 
                        key={site.site_id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewSite(site.site_id)}
                      >
                        {/* ✅ NEW: Checkbox cell */}
                        <td 
                          className="px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSites.includes(site.site_id)}
                            onChange={() => handleSelectSite(site.site_id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{site.company_name}</div>
                          {site.website && (
                            <div className="text-sm text-gray-500">{site.website}</div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {site.country}
                        </td>
                        
                        <td className="px-6 py-4">
                          {getStatusBadge(site.verification_status)}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="min-w-[180px]">
                            {site.data_quality_score ? (
                              <QualityScore score={site.data_quality_score} />
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </div>
                        </td>
                        
                        {/* ✅ NEW: Collected By cell */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {site.collected_by_name || 'N/A'}
                          </span>
                        </td>
                        
                        <td 
                          className="px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewSite(site.site_id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditSite(site.site_id)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSite(site)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ✅ NEW: Pagination */}
                {sitesData && sitesData.count > 0 && (
                  
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(sitesData.count / pageSize)}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      totalCount={sitesData.count}
                    />
                  
                )}
              </>
            )}
          </div>
        </div>

        {/* ✅ NEW: Import Modal */}
        {showImportModal && (
          <BulkImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            projectId={projectId}
            category={project?.category}
            onSuccess={() => {
              refetchSites();
              queryClient.invalidateQueries(['admin-project', projectId]);
            }}
          />
        )}

        {/* ✅ NEW: Export Modal */}
        {showExportModal && (
          <BulkExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            projectId={projectId}
            category={project?.category}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedSite && (
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedSite(null);
            }}
            onConfirm={() => deleteSiteMutation.mutate(selectedSite.site_id)}
            title="Delete Site"
            message="Are you sure you want to delete this site?"
            itemName={selectedSite.company_name}
            isDeleting={deleteSiteMutation.isPending}
          />
        )}

        {/* ✅ NEW: Comprehensive Bulk Action Modal */}
        <BulkActionModal
          isOpen={showBulkActionModal}
          onClose={() => setShowBulkActionModal(false)}
          onSubmit={(data) => bulkActionMutation.mutate(data)}
          selectedCount={selectedSites.length}
          isSubmitting={bulkActionMutation.isPending}
          selectedSites={sitesData?.results?.filter(site => selectedSites.includes(site.site_id)) || []}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminProjectDetailPage;

// StatBox Component
const StatBox = ({ title, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="text-sm opacity-75">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};