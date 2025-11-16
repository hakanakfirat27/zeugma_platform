// frontend/src/pages/ProjectDetailPage.jsx
// UPDATED VERSION - Now navigates to separate pages instead of using modals

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import api from '../utils/api';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import QualityScore from '../components/projects/QualityScore';
import Pagination from '../components/database/Pagination';
import {
  ArrowLeft, Plus, Check, X, Send, Clock,
  AlertCircle, CheckCircle, XCircle, RefreshCw, Edit2, Trash2,
  Building2, Info, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter
} from 'lucide-react';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, removeToast, success, error: showError } = useToast();
  
  const [selectedSites, setSelectedSites] = useState([]);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [deletingSite, setDeletingSite] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Pagination and Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Get user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'STAFF_ADMIN';

  // Debounce search input (wait 500ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/api/projects/${projectId}/`);
      return response.data;
    }
  });

  // Fetch sites in project WITH PAGINATION AND SORTING
  const { data: sitesData, isLoading: sitesLoading } = useQuery({
    queryKey: [
      'project-sites', 
      projectId, 
      currentPage, 
      pageSize, 
      sortField, 
      sortDirection,
      debouncedSearch,
      statusFilter
    ],
    queryFn: async () => {
      const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      
      // Build query parameters
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering
      };
      
      // Add search parameter
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      
      // Add status filter
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
      queryClient.invalidateQueries(['project-sites', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
      success('Site deleted successfully!');
      setDeletingSite(null);
    },
    onError: (error) => {
      showError(`Failed to delete site: ${error.response?.data?.detail || error.message}`);
      setDeletingSite(null);
    }
  });
  
  // Bulk action mutation
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
      queryClient.invalidateQueries(['project-sites', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
      setSelectedSites([]);
      setShowBulkActionModal(false);
      success(`Bulk action completed: ${data.results.success} successful`);
    },
    onError: (error) => {
      showError(`Bulk action failed: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Get sort icon for column header
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Handle page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedSites([]);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedSites([]);
  };

  const handleSelectSite = (siteId) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSites.length === sitesData?.results?.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(sitesData?.results?.map(site => site.site_id) || []);
    }
  };

  const handleDeleteClick = (site) => {
    setDeletingSite(site);
  };

  const handleDeleteConfirm = () => {
    if (deletingSite) {
      deleteSiteMutation.mutate(deletingSite.site_id);
    }
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

  // UPDATED: Navigate to view page instead of opening modal
  const handleViewSite = (site) => {
    navigate(`/projects/${projectId}/sites/${site.site_id}/view`);
  };

  // UPDATED: Navigate to edit page instead of opening modal
  const handleEditSite = (site) => {
    navigate(`/projects/${projectId}/sites/${site.site_id}/edit`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" />, text: 'Pending' },
      'UNDER_REVIEW': { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="w-3 h-3" />, text: 'Under Review' },
      'NEEDS_REVISION': { color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-3 h-3" />, text: 'Needs Revision' },
      'APPROVED': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Approved' },
      'REJECTED': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" />, text: 'Rejected' },
      'TRANSFERRED': { color: 'bg-purple-100 text-purple-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Transferred' },
    };
    const badge = badges[status] || badges['PENDING'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <DataCollectorLayout pageTitle="Loading...">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DataCollectorLayout>
    );
  }

  return (
    <DataCollectorLayout
      pageTitle={project?.project_name || 'Project Details'}
      pageSubtitleBottom={project?.description}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Projects
          </button>

          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex gap-4 py-5">
                <span className="text-sm text-indigo-600 font-bold">
                  Category: <span className="font-medium text-gray-500">{project.category_display}</span>
                </span>
                {project.target_region && (
                  <span className="text-sm text-indigo-600 font-bold">
                    Region: <span className="font-medium text-gray-500">{project.target_region}</span>
                  </span>
                )}
                {project.target_count && (
                  <span className="text-sm text-indigo-600 font-bold">
                    Target: <span className="font-medium text-gray-500">{project.target_count} sites</span>
                  </span>
                )}                
              </div>
            </div>
            <button
              onClick={() => navigate(`/projects/${projectId}/add-site`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Site
            </button>
          </div>

          {/* Project Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <StatBox title="Total Sites" value={project.total_sites || 0} color="blue" />
            <StatBox title="Pending" value={project.pending_sites || 0} color="yellow" />
            <StatBox title="Approved" value={project.approved_sites || 0} color="green" />
            <StatBox title="Needs Revision" value={project.needs_revision_sites || 0} color="orange" />
            <StatBox title="Completion" value={`${Math.round(project.completion_percentage || 0)}%`} color="purple" />
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search companies..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
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
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="NEEDS_REVISION">Needs Revision</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            )}
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
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {isAdmin && selectedSites.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedSites.length} site(s) selected
              </span>
              <button
                onClick={() => setSelectedSites([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => bulkActionMutation.mutate({ action: 'approve', note: '' })}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => setShowBulkActionModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                <Send className="w-4 h-4" />
                Send for Revision
              </button>
            </div>
          </div>
        )}

        {/* Sites Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedSites.length === sitesData?.results?.length && sitesData?.results?.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('company_name')}
                  >
                    <div className="flex items-center gap-2">
                      Company
                      {getSortIcon('company_name')}
                    </div>
                  </th>
                  
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center gap-2">
                      Country
                      {getSortIcon('country')}
                    </div>
                  </th>
                  
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('verification_status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('verification_status')}
                    </div>
                  </th>
                  
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('data_quality_score')}
                  >
                    <div className="flex items-center gap-2">
                      Quality Score
                      {getSortIcon('data_quality_score')}
                    </div>
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collected By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sitesLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : sitesData?.results?.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        {searchQuery || statusFilter !== 'ALL' ? (
                          <>
                            <Search className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p>No sites found matching your filters</p>
                            <button
                              onClick={handleClearFilters}
                              className="mt-2 text-blue-600 hover:text-blue-800"
                            >
                              Clear filters
                            </button>
                          </>
                        ) : (
                          <>
                            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sites yet</h3>
                            <p className="text-gray-600 mb-4">Add your first site to this project</p>
                            <button
                              onClick={() => navigate(`/projects/${projectId}/add-site`)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              <Plus className="w-5 h-5" />
                              Add Site
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  sitesData?.results?.map(site => (
                    <tr 
                      key={site.site_id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewSite(site)}
                      title="Click to view details"
                    >
                      {isAdmin && (
                        <td 
                          className="px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSites.includes(site.site_id)}
                            onChange={() => handleSelectSite(site.site_id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{site.company_name}</div>
                        <div className="text-sm text-gray-500">{site.website || 'No website'}</div>
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
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {site.collected_by_name || 'N/A'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewSite(site)}
                            className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                            title="View Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditSite(site)}
                            className="text-green-600 hover:text-green-800 p-1 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(site)}
                            className="text-red-600 hover:text-red-800 p-1 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sitesData && sitesData.count > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(sitesData.count / pageSize)}
              totalCount={sitesData.count}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showFirstLast={true}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal - Still using modal for safety */}
      {deletingSite && (
        <DeleteConfirmationModal
          isOpen={!!deletingSite}
          onClose={() => setDeletingSite(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Site"
          message="Are you sure you want to delete this site from the project?"
          itemName={deletingSite.company_name}
          isDeleting={deleteSiteMutation.isPending}
        />
      )}

      {/* Bulk Action Modal */}
      {showBulkActionModal && (
        <BulkActionModal
          selectedCount={selectedSites.length}
          onClose={() => setShowBulkActionModal(false)}
          onSubmit={(note) => bulkActionMutation.mutate({ action: 'needs_revision', note })}
        />
      )}
    </DataCollectorLayout>
  );
};

// StatBox Component
const StatBox = ({ title, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="text-sm opacity-75">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};

// Bulk Action Modal
const BulkActionModal = ({ selectedCount, onClose, onSubmit }) => {
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(note);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Send for Revision</h3>
          <p className="text-sm text-gray-600 mt-1">
            Adding revision note for {selectedCount} site(s)
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revision Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain what needs to be revised..."
            />
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Send for Revision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectDetailPage;