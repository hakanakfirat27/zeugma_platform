// frontend/src/pages/projects/ProjectManagementPage.jsx
// UPDATED VERSION - Simplified design matching admin page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import ProjectListView from '../../components/projects/ProjectListView';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import EditProjectModal from '../../components/projects/EditProjectModal';
import Pagination from '../../components/database/Pagination';
import { useToast } from '../../contexts/ToastContext';
import { 
  FolderOpen, Plus, Search, TrendingUp, 
  Clock, AlertCircle, RefreshCw, X,
  ArrowUpDown, ArrowUp, ArrowDown 
} from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

const ProjectManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  // Sorting state
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input (wait 500ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check if any filters are active
  const hasActiveFilters = debouncedSearch || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setCurrentPage(1);
  };

  // Fetch projects with pagination parameters
  const { data: projectsData, isLoading: projectsLoading, refetch } = useQuery({
    queryKey: [
      'projects', 
      statusFilter, 
      categoryFilter, 
      debouncedSearch, 
      currentPage,
      pageSize,
      sortField,
      sortDirection
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Filters
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (categoryFilter && categoryFilter !== 'ALL') {
        params.append('category', categoryFilter);
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      
      // Pagination parameters
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      // Sorting parameter
      const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      params.append('ordering', ordering);
      
      const response = await api.get(`/api/projects/?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true
  });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const response = await api.get('/api/projects/stats/overview/');
      return response.data;
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      await api.delete(`/api/projects/${projectId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['project-stats']);
      success('Project deleted successfully!');
      setDeletingProject(null);
    },
    onError: (error) => {
      showError(`Failed to delete project: ${error.response?.data?.detail || error.message}`);
      setDeletingProject(null);
    }
  });

  // Handlers
  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (projectId) => {
    const project = projectsData?.results?.find(p => p.project_id === projectId);
    if (project) {
      setEditingProject(project);
    }
  };

  const handleDeleteClick = (project) => {
    setDeletingProject(project);
  };

  const handleDeleteConfirm = () => {
    if (deletingProject?.project_id) {
      deleteProjectMutation.mutate(deletingProject.project_id);
    }
  };

  const handleAddSite = (projectId) => {
    navigate(`/projects/${projectId}/add-site`);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const projects = projectsData?.results || [];

  if (projectsLoading || statsLoading) {
    return (
      <DataCollectorLayout pageTitle="All Projects">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  return (
    <DataCollectorLayout
      pageTitle="All Projects"
      pageSubtitleBottom="Manage and track your data collection projects"
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_projects || 0}</p>
                  </div>
                  <FolderOpen className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active_projects || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending_review_sites || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Needs Revision</p>
                    <p className="text-2xl font-bold text-red-600">{stats.needs_revision_sites || 0}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>
          )}

          {/* Filters and Controls */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                className="p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Active Filters Tags */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                {/* Search Tag */}
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Search: "{debouncedSearch}"
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearch('');
                      }}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}

                {/* Status Tag */}
                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Status: {statusFilter}
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className="ml-1 hover:text-green-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}

                {/* Category Tag */}
                {categoryFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    Category: {CATEGORIES.find(c => c.value === categoryFilter)?.label || categoryFilter}
                    <button
                      onClick={() => setCategoryFilter('ALL')}
                      className="ml-1 hover:text-purple-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}

                {/* Clear All */}
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-600 hover:text-red-800 font-medium ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Projects Display - List View Only */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters ? 'Try adjusting your search filters' : 'Create your first data collection project to get started'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <>
            <ProjectListView
              projects={projects}
              onViewProject={handleViewProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteClick}
              onAddSite={handleAddSite}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              getSortIcon={getSortIcon}
              currentUserId={user?.id}
              isAdmin={false}
            />
            
            {/* Pagination */}
            {projectsData && projectsData.count > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(projectsData.count / pageSize)}
                  totalCount={projectsData.count}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  showFirstLast={true}
                />
              </div>
            )}
          </>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              queryClient.invalidateQueries(['projects']);
              queryClient.invalidateQueries(['project-stats']);
              success('Project created successfully!');
            }}
          />
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <EditProjectModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onSuccess={() => {
              setEditingProject(null);
              refetch();
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deletingProject && (
          <DeleteConfirmationModal
            isOpen={!!deletingProject}
            onClose={() => setDeletingProject(null)}
            onConfirm={handleDeleteConfirm}
            title="Delete Project"
            message="Are you sure you want to delete this project? This will also delete all associated sites."
            itemName={deletingProject.project_name}
            isDeleting={deleteProjectMutation.isPending}
          />
        )}
      </div>
    </DataCollectorLayout>
  );
};

export default ProjectManagementPage;
