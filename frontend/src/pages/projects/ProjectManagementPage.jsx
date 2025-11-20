// frontend/src/pages/ProjectManagementPage.jsx
// UPDATED VERSION - Added pagination like ProjectDetailPage

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import ProjectCardView from '../../components/projects/ProjectCardView';
import ProjectListView from '../../components/projects/ProjectListView';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import EditProjectModal from '../../components/projects/EditProjectModal';
import Pagination from '../../components/database/Pagination';  // NEW: Import Pagination component
import { useToast } from '../../contexts/ToastContext';
import { 
  FolderOpen, Plus, Search, TrendingUp, 
  Clock, CheckCircle, AlertCircle, LayoutGrid, List, X,
  ArrowUpDown, ArrowUp, ArrowDown 
} from 'lucide-react';

const ProjectManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError, info } = useToast();
  
  // Search states - separate immediate input from debounced search
  const [searchQuery, setSearchQuery] = useState(''); // What user types
  const [debouncedSearch, setDebouncedSearch] = useState(''); // What actually searches
  
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'
  const [deletingProject, setDeletingProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  // Sorting state
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // NEW: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input (wait 500ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // NEW: Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // UPDATED: Fetch projects with pagination parameters
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: [
      'projects', 
      statusFilter, 
      categoryFilter, 
      debouncedSearch, 
      currentPage,      // NEW: Include current page
      pageSize,         // NEW: Include page size
      sortField,        // NEW: Include sort field
      sortDirection     // NEW: Include sort direction
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Filters
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (debouncedSearch && debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      
      // NEW: Pagination parameters
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      // NEW: Sorting parameter (backend expects 'ordering' with format: 'field' or '-field')
      const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      params.append('ordering', ordering);
      
      const response = await api.get(`/api/projects/?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true  // NEW: Keep previous data while fetching new page
  });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const response = await api.get('/api/projects/stats/overview/');
      return response.data;
    }
  });

  // Delete project mutation with toast
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

  // Log any errors
  useEffect(() => {
    if (projectsError) {
      console.error('Projects error:', projectsError);
      showError('Failed to load projects');
    }
    if (statsError) {
      console.error('Stats error:', statsError);
      showError('Failed to load statistics');
    }
  }, [projectsError, statsError, showError]);

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (projectId) => {
    const project = projectsData?.results?.find(p => p.project_id === projectId);
    if (project) {
      setEditingProject(project);
    } else {
      console.error('Project not found:', projectId);
      showError('Project not found');
    }
  };

  const handleDeleteClick = (project) => {
    setDeletingProject(project);
  };

  const handleDeleteConfirm = () => {
    if (!deletingProject || !deletingProject.project_id) {
      showError('Invalid project selected for deletion');
      return;
    }

    deleteProjectMutation.mutate(deletingProject.project_id);
  };

  const handleAddSite = (projectId) => {
    navigate(`/projects/${projectId}/add-site`);
  };

  const handleCreateProjectSuccess = () => {
    setShowCreateModal(false);
    queryClient.invalidateQueries(['projects']);
    queryClient.invalidateQueries(['project-stats']);
    success('Project created successfully!');
  };

  const handleEditProjectSuccess = () => {
    setEditingProject(null);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1); // NEW: Reset to first page
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setCurrentPage(1); // NEW: Reset to first page
  };

  // UPDATED: Handle sorting - also reset to first page
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // NEW: Reset to first page when sorting
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

  // NEW: Handle page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top when page changes
  };

  // NEW: Handle page size changes
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // REMOVED: Sort projects function - now handled by backend
  // We no longer need client-side sorting since backend handles it
  
  // Get projects from API response (backend already sorted and paginated)
  const projects = projectsData?.results || [];

  if (projectsLoading || statsLoading) {
    return (
      <DataCollectorLayout pageTitle="All Projects">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DataCollectorLayout>
    );
  }

  if (projectsError || statsError) {
    return (
      <DataCollectorLayout pageTitle="All Projects">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold">Error Loading Projects</h3>
            <p className="text-red-600 text-sm mt-1">
              {projectsError?.message || statsError?.message || 'Failed to load data'}
            </p>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter || categoryFilter;

  return (
    <DataCollectorLayout
      pageTitle="All Projects"
      pageSubtitleBottom="Manage and track your data collection projects"
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">List</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm font-medium">Cards</span>
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Projects"
                value={stats.total_projects || 0}
                icon={<FolderOpen className="w-6 h-6" />}
                color="blue"
              />
              <StatCard
                title="Active Projects"
                value={stats.active_projects || 0}
                icon={<TrendingUp className="w-6 h-6" />}
                color="green"
              />
              <StatCard
                title="Pending Review"
                value={stats.pending_review_sites || 0}
                icon={<Clock className="w-6 h-6" />}
                color="yellow"
              />
              <StatCard
                title="Needs Revision"
                value={stats.needs_revision_sites || 0}
                icon={<AlertCircle className="w-6 h-6" />}
                color="red"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search with clear button */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // NEW: Reset to first page when filter changes
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1); // NEW: Reset to first page when filter changes
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="INJECTION">Injection Moulders</option>
              <option value="BLOW">Blow Moulders</option>
              <option value="ROTO">Roto Moulders</option>
              <option value="PE_FILM">PE Film Extruders</option>
              <option value="SHEET">Sheet Extruders</option>
              <option value="PIPE">Pipe Extruders</option>
              <option value="TUBE_HOSE">Tube & Hose Extruders</option>
              <option value="PROFILE">Profile Extruders</option>
              <option value="CABLE">Cable Extruders</option>
              <option value="COMPOUNDER">Compounders</option>
            </select>
          </div>

          {/* Active Search Indicator */}
          {debouncedSearch && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200">
                <Search className="w-4 h-4" />
                Search: "{debouncedSearch}"
                <button
                  onClick={handleClearSearch}
                  className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}

          {/* Clear All Filters Button */}
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleClearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Projects Display */}
        {!projects || projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Create your first data collection project to get started'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-2"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <>
            <ProjectCardView
              projects={projects}
              onViewProject={handleViewProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteClick}
              onAddSite={handleAddSite}
            />
            
            {/* NEW: Pagination for Card View */}
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
            />
            
            {/* NEW: Pagination for List View */}
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
            onSuccess={handleCreateProjectSuccess}
          />
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <EditProjectModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onSuccess={handleEditProjectSuccess}
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

// StatCard Component
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default ProjectManagementPage;